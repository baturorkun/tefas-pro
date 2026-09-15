/**
 * Takip listesi collector'ı. Oneshot çalışır.
 *
 *   pnpm collect [--funds AAA,BBB] [--backfill] [--skip-yield]
 *                [--force]
 *                [--flow-months 12] [--size-months 6]
 *
 * Fon başına dört istek; her biri tek çağrıda tüm seriyi döndürdüğü için gün
 * başına döngü yoktur:
 *   /price/       → güncel NAV
 *   /volatility/  → günlük getiri serisi (fonun tüm geçmişi; API daraltmayı
 *                   yok sayıyor, tarih parametresi geçersiz)
 *   /cashflow/    → günlük net akış serisi (aralık daraltılabilir)
 *   /info/        → stopaj, valör, ücret, pay adedi, yatırımcı, dağılım
 *
 * Fon büyüklüğü için fon başına endpoint YOK; toplu pencere endpoint'leri
 * kullanılır ve bir istek tüm evreni verir (gece +2 istek).
 *
 * Evrenin tamamı yanıtta gelir ama yalnız takip listesindeki fonlar yazılır.
 */
import type pg from 'pg';

import { ONDEMAND_SOURCE } from './ingest-source.js';
import { fonListesi } from './sources/kap.js';
import { kapFonuTopla } from './collect-kap.js';
import { tefasFonuTopla } from './collect-tefas.js';
import { makePool } from './db/pool.js';
import { upsertWatchedFunds } from './db/seed.js';

/**
 * İstekler arası bekleme. Ortamdan ayarlanabilir: fvt toplaması ev IP'sinden
 * ve elle koşuyor, orada acele yok — aralığı açmak kaynağa da bize de daha
 * güvenli. Sunucudaki zamanlanmış koşum varsayılanla devam eder.
 */
const THROTTLE_MS = Number(process.env['COLLECT_THROTTLE_MS'] ?? '') || 700;
/** Artımlı çekimde geriye örtüşme: geç gelen revizyonu yakalar. */
const OVERLAP_DAYS = 5;

/**
 * `ingest_run.source` değerleri.
 *
 * Zamanlanmış tarama ile tek fonluk toplama ayrı tutulur: Panel'deki "Son
 * Toplama" kutusu en son kaydı gösteriyor, ayrım olmasaydı takip listesine
 * eklenen her fon gecelik taramanın yerine geçer ve kutu sistemin genel
 * durumu yerine tek bir fonun durumunu gösterirdi.
 */
export { SCHEDULED_SOURCE, ONDEMAND_SOURCE } from './ingest-source.js';
import { SCHEDULED_SOURCE } from './ingest-source.js';

interface Args {
  funds: string[] | undefined;
  backfill: boolean;
  skipYield: boolean;
  /** Hisse kırılımı ve fiyatları atla; ayrı kaynak, ayrı hata yüzeyi. */
  /** Bugün başarıyla toplandıysa yine de topla. */
  force: boolean;
  flowMonths: number;
  sizeMonths: number;
}

export function parseArgs(argv: string[]): Args {
  const args: Args = {
    funds: undefined,
    backfill: false,
    skipYield: false,
    force: false,
    flowMonths: 12,
    sizeMonths: 6,
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--funds') args.funds = argv[(i += 1)]?.split(',');
    else if (argv[i] === '--backfill') args.backfill = true;
    else if (argv[i] === '--skip-yield') args.skipYield = true;
    else if (argv[i] === '--force') args.force = true;
    else if (argv[i] === '--flow-months') args.flowMonths = Number(argv[(i += 1)]);
    else if (argv[i] === '--size-months') args.sizeMonths = Number(argv[(i += 1)]);
  }
  return args;
}

// ─── Tarih yardımcıları ─────────────────────────────────────────────────────
// Aritmetik UTC üzerinden yapılır ki DST günü kaydırmasın; "bugün" yerel
// takvimden okunur çünkü piyasa tarihleri yereldir.

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d) + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * `months` ay geriye gider. Hedef ayda o gün yoksa ayın son gününe kırpar:
 * 30 Ağustos'tan 6 ay geri 2 Mart değil 28 Şubat'tır.
 */
export function monthsBack(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const target = new Date(Date.UTC(y, m - 1 - months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

export function isWeekend(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day === 0 || day === 6;
}

/** Bir önceki hafta içi gün. Resmî tatil takvimden bilinemez, veriden anlaşılır. */
export function prevWeekday(iso: string): string {
  let d = addDays(iso, -1);
  while (isWeekend(d)) d = addDays(d, -1);
  return d;
}

/**
 * `start` (hariç) ile `end` (dahil) arasındaki hafta içi günler için
 * `(önceki hafta içi gün, D)` pencereleri. Cumartesi ve Pazar için istek
 * atılmadığı gibi pencere de üretilmez; Pazartesi penceresi `(Cuma, Pazartesi)`
 * olur ve her pencerenin başı bir öncekinin sonuna oturur.
 */
export function dailyWindows(start: string, end: string): { start: string; end: string }[] {
  const out: { start: string; end: string }[] = [];
  for (let d = end; d > start; d = addDays(d, -1)) {
    if (isWeekend(d)) continue;
    out.push({ start: prevWeekday(d), end: d });
  }
  return out.reverse();
}

/** `count` adet bitişik takvim ayı penceresi, en yenisi `end` tarihinde biter. */
export function monthlyWindows(end: string, count: number): { start: string; end: string }[] {
  const out: { start: string; end: string }[] = [];
  const monthEnd = (back: number): string => {
    const [y, m] = end.split('-').map(Number) as [number, number];
    return new Date(Date.UTC(y, m - back, 0)).toISOString().slice(0, 10);
  };
  for (let i = 0; i < count; i += 1) {
    out.push({ start: monthEnd(i + 1), end: i === 0 ? end : monthEnd(i) });
  }
  return out.reverse();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
function throttle(): Promise<void> {
  return sleep(THROTTLE_MS + Math.floor(Math.random() * 400));
}

// ─── Yazma ──────────────────────────────────────────────────────────────────

export interface DailyRow {
  fund_code: string;
  trade_date: string;
  nav_per_share?: number;
  daily_return_pct?: number;
  net_flow?: number;
  shares_active?: number;
  investor_count?: number;
  aum?: number;
}

/**
 * Gün grain'indeki alanlar farklı endpoint'lerden gelir ve aynı satıra yazılır.
 * Bir çağrı yalnız elindeki alanları taşır; geri kalanı NULL gelir ve COALESCE
 * ile mevcut değer korunur. Alan listesi SQL'e gömülü ve sabittir — sorgu metni
 * girdiye göre değişmez.
 *
 * DO UPDATE'in WHERE'i, değeri değişmemiş satırı yeniden yazmaz. Gecelik run
 * aynı geçmişi baştan gönderdiği için bu olmadan her gece on binlerce ölü satır
 * birikirdi; rowCount da böylece gerçekten yazılan satırı gösterir.
 *
 * COALESCE'in sonucu: bir alan dolduktan sonra NULL'a döndürülemez. Bu ingest
 * için doğru davranış, çünkü kaynaklar veri ekler, silmez.
 */
/**
 * Bugünden ileri tarihli satırları ayıklar.
 *
 * Kaynak, yarın gecerli olacak fiyati bu aksam yayimliyor. Yazilirsa
 * veritabaninda yarim bir gun en son gun olarak duruyor: 2026-08-31 aksami
 * 2026-09-01 icin 36 fonun 23'unun getirisi vardi, akis ve yatirimci sayisi
 * hic yoktu. View'lar "son veri gunu"nu max(trade_date) ile buldugu icin
 * pencereler o yarim gune kayiyordu.
 *
 * `today` cagirandan gelir; Europe/Istanbul takvim gunu olmali. Veritabani
 * Etc/UTC calisiyor, current_date gece yarisi ile 03:00 arasinda bir gun
 * geride kalir ve o saatte kosan collector mesru veriyi reddederdi.
 */
export function dropFutureRows(rows: DailyRow[], today: string): DailyRow[] {
  return rows.filter((r) => r.trade_date <= today);
}

/** Koşu boyunca süzülen ileri tarihli satır sayısı; sessizce atılmasın diye. */
let skippedFuture = 0;

export async function upsertDaily(
  pool: pg.Pool,
  rows: DailyRow[],
  runId: number,
  today?: string,
): Promise<number> {
  // Süzme burada, tek çoklu-satır ekleme noktasında: fiyat, getiri, akış ve
  // büyüklük kaynaklarının hepsi buradan geçiyor.
  const kept = today === undefined ? rows : dropFutureRows(rows, today);
  skippedFuture += rows.length - kept.length;
  rows = kept;
  if (rows.length === 0) return 0;
  const res = await pool.query(
    `INSERT INTO fact_fund_daily (fund_code, trade_date, nav_per_share, daily_return_pct,
                                  net_flow, shares_active, investor_count, aum, ingest_run_id)
     SELECT r.fund_code, r.trade_date, r.nav_per_share, r.daily_return_pct,
            r.net_flow, r.shares_active, r.investor_count, r.aum, $2
     FROM jsonb_to_recordset($1::jsonb) AS r(
       fund_code text, trade_date date, nav_per_share numeric, daily_return_pct numeric,
       net_flow numeric, shares_active numeric, investor_count integer, aum numeric)
     WHERE EXISTS (SELECT 1 FROM analytics.tracked_fund t WHERE t.fund_code = r.fund_code)
     ON CONFLICT (fund_code, trade_date) DO UPDATE SET
       nav_per_share    = COALESCE(EXCLUDED.nav_per_share, fact_fund_daily.nav_per_share),
       daily_return_pct = COALESCE(EXCLUDED.daily_return_pct, fact_fund_daily.daily_return_pct),
       net_flow         = COALESCE(EXCLUDED.net_flow, fact_fund_daily.net_flow),
       shares_active    = COALESCE(EXCLUDED.shares_active, fact_fund_daily.shares_active),
       investor_count   = COALESCE(EXCLUDED.investor_count, fact_fund_daily.investor_count),
       aum              = COALESCE(EXCLUDED.aum, fact_fund_daily.aum),
       ingest_run_id    = EXCLUDED.ingest_run_id,
       updated_at       = now()
     WHERE (fact_fund_daily.nav_per_share, fact_fund_daily.daily_return_pct,
            fact_fund_daily.net_flow, fact_fund_daily.shares_active,
            fact_fund_daily.investor_count, fact_fund_daily.aum)
        IS DISTINCT FROM
           (COALESCE(EXCLUDED.nav_per_share, fact_fund_daily.nav_per_share),
            COALESCE(EXCLUDED.daily_return_pct, fact_fund_daily.daily_return_pct),
            COALESCE(EXCLUDED.net_flow, fact_fund_daily.net_flow),
            COALESCE(EXCLUDED.shares_active, fact_fund_daily.shares_active),
            COALESCE(EXCLUDED.investor_count, fact_fund_daily.investor_count),
            COALESCE(EXCLUDED.aum, fact_fund_daily.aum))`,
    [JSON.stringify(rows), runId],
  );
  return res.rowCount ?? 0;
}

/**
 * Saklanmış son büyüklük günü. Artımlı büyüklük çekimi buradan devam eder;
 * "bir önceki iş gününden bugüne" demek yetmez, çünkü sunucu birkaç gün kapalı
 * kalırsa aradaki günler kalıcı olarak boş kalırdı.
 */
async function lastSizeDate(pool: pg.Pool): Promise<string | null> {
  const r = await pool.query<{ d: string }>(
    `SELECT to_char(max(trade_date), 'YYYY-MM-DD') AS d
     FROM fact_fund_daily WHERE aum IS NOT NULL`,
  );
  return r.rows[0]?.d ?? null;
}

/**
 * Dört kaynağın aynı güne ait alanlarını tek satırda birleştirir.
 *
 * Her kaynak ayrı upsert edilirse aynı (fund_code, trade_date) satırı birden çok
 * kez yazılır ve sayaç gerçek satır sayısını aşar: backfill 33.336 raporlarken
 * veritabanında 23.739 satır vardı. Önce burada birleştirilir, sonra tek sorguda
 * yazılır.
 */
export function mergeDailySources(
  code: string,
  nav: { date: string; price: number } | null,
  returns: { date: string; returnPct: number }[],
  flows: { date: string; netFlow: number }[],
): DailyRow[] {
  const rows = new Map<string, DailyRow>();
  const put = (date: string, patch: Partial<DailyRow>): void => {
    rows.set(date, { ...(rows.get(date) ?? { fund_code: code, trade_date: date }), ...patch });
  };
  if (nav !== null) put(nav.date, { nav_per_share: nav.price });
  for (const r of returns) put(r.date, { daily_return_pct: r.returnPct });
  for (const f of flows) put(f.date, { net_flow: f.netFlow });
  return [...rows.values()];
}

/** O fon için saklanmış son akış günü; artımlı çekimin başlangıcını belirler. */
async function lastFlowDate(pool: pg.Pool, code: string): Promise<string | null> {
  const r = await pool.query<{ d: string }>(
    `SELECT to_char(max(trade_date), 'YYYY-MM-DD') AS d
     FROM fact_fund_daily WHERE fund_code = $1 AND net_flow IS NOT NULL`,
    [code],
  );
  return r.rows[0]?.d ?? null;
}

/**
 * Tek fonun verisini toplar. Takip listesine fon eklenince sunucu bunu çağırır.
 *
 * Zamanlanmış taramadan farkı kapsam: evren sorgusu, getiri anlık görüntüsü ve
 * diğer fonlar atlanır. Fonun kendi geçmişi çekilir, bu da yeni bir fon için
 * on iki aylık para akışı ve altı aylık büyüklük demek — saniyeler sürer, bu
 * yüzden çağıran taraf beklememeli.
 *
 * Kendi ingest_run kaydını açar ve kapatır; hata durumunda kayıt `failed`
 * olarak kapanır ve hata yukarı verilir.
 */
export async function collectSingleFund(
  pool: pg.Pool,
  code: string,
): Promise<{ runId: number; upserted: number }> {
  const today = todayIso();
  const runId = (
    await pool.query<{ id: number }>(
      `INSERT INTO ingest_run (source, status) VALUES ($1, 'running') RETURNING id`,
      [ONDEMAND_SOURCE],
    )
  ).rows[0]!.id;

  try {
    // TEFAS günlük veriyi, KAP portföyü verir. Zamanlanmış koşumlarla aynı
    // fonksiyonlar çağrılır: iki yol ayrışırsa fon nasıl eklendiğine göre
    // farklı veri oluşurdu.
    let upserted = await tefasFonuTopla(pool, code, runId, today);
    const oid = (await fonListesi()).find((f) => f.fundCode === code)?.fundOid;
    if (oid !== undefined) {
      upserted += (await kapFonuTopla(pool, code, oid, runId)).yazilan;
    }
    await pool.query(
      `UPDATE ingest_run SET status = 'passed', finished_at = now(), rows_upserted = $2,
              funds_ok = 1 WHERE id = $1`,
      [runId, upserted],
    );
    return { runId, upserted };
  } catch (err) {
    await pool.query(
      `UPDATE ingest_run SET status = 'failed', finished_at = now(), last_error = $2,
              funds_failed = 1 WHERE id = $1`,
      [runId, String(err)],
    );
    throw err;
  }
}

/**
 * Bugün zamanlanmış toplama başarıyla bittiyse bitiş zamanını döndürür.
 *
 * Yalnız `passed` sayılır. `failed` ve `partial` koşumdan sonra veri eksik
 * demek; orada tekrar denemek işin kendisi.
 */
export async function successfulRunToday(
  pool: pg.Pool,
  today: string,
  source: string = SCHEDULED_SOURCE,
): Promise<string | null> {
  const r = await pool.query<{ bitis: string }>(
    `SELECT to_char(finished_at, 'HH24:MI') AS bitis
       FROM ingest_run
      WHERE source = $1 AND status = 'passed'
        AND started_at >= $2::date AND started_at < $2::date + 1
      ORDER BY started_at DESC LIMIT 1`,
    [source, today],
  );
  return r.rows[0]?.bitis ?? null;
}

/**
 * Son veri gününü alamamış takip edilen fonların kodları.
 *
 * "Son gün" evrenin en ilerideki günü: fonlar aynı günü farklı saatlerde
 * yayımlıyor, bu yüzden ilk fon bugünü verdiği anda geride kalanlar eksik
 * sayılır. Hafta sonu ve tatilde en ileri gün Cuma'dır ve herkeste vardır —
 * kural kendiliğinden susar.
 */
export async function missingFundsToday(pool: pg.Pool): Promise<string[]> {
  const r = await pool.query<{ fund_code: string }>(
    `WITH son AS (SELECT max(trade_date) AS d FROM fact_fund_daily
                   WHERE daily_return_pct IS NOT NULL)
     SELECT f.fund_code FROM analytics.tracked_fund f, son
      WHERE NOT EXISTS (SELECT 1 FROM fact_fund_daily d
                         WHERE d.fund_code = f.fund_code AND d.trade_date = son.d
                           AND d.daily_return_pct IS NOT NULL)
      ORDER BY f.fund_code`,
  );
  return r.rows.map((x) => x.fund_code);
}

