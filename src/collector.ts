/**
 * Takip listesi collector'ı. Oneshot çalışır.
 *
 *   pnpm collect [--funds AAA,BBB] [--backfill] [--skip-yield]
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

import { FintablesClient, isCarriedForwardWindow } from './sources/fintables.js';
import { makePool } from './db/pool.js';
import { upsertWatchedFunds } from './db/seed.js';

const THROTTLE_MS = 700;
/** Artımlı çekimde geriye örtüşme: geç gelen revizyonu yakalar. */
const OVERLAP_DAYS = 5;

interface Args {
  funds: string[] | undefined;
  backfill: boolean;
  skipYield: boolean;
  flowMonths: number;
  sizeMonths: number;
}

export function parseArgs(argv: string[]): Args {
  const args: Args = {
    funds: undefined,
    backfill: false,
    skipYield: false,
    flowMonths: 12,
    sizeMonths: 6,
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--funds') args.funds = argv[(i += 1)]?.split(',');
    else if (argv[i] === '--backfill') args.backfill = true;
    else if (argv[i] === '--skip-yield') args.skipYield = true;
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
export async function upsertDaily(pool: pg.Pool, rows: DailyRow[], runId: number): Promise<number> {
  if (rows.length === 0) return 0;
  const res = await pool.query(
    `INSERT INTO fact_fund_daily (fund_code, trade_date, nav_per_share, daily_return_pct,
                                  net_flow, shares_active, investor_count, aum, ingest_run_id)
     SELECT r.fund_code, r.trade_date, r.nav_per_share, r.daily_return_pct,
            r.net_flow, r.shares_active, r.investor_count, r.aum, $2
     FROM jsonb_to_recordset($1::jsonb) AS r(
       fund_code text, trade_date date, nav_per_share numeric, daily_return_pct numeric,
       net_flow numeric, shares_active numeric, investor_count integer, aum numeric)
     WHERE EXISTS (SELECT 1 FROM watchlist w WHERE w.fund_code = r.fund_code)
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

/** O fon için saklanmış son akış günü; artımlı çekimin başlangıcını belirler. */
async function lastFlowDate(pool: pg.Pool, code: string): Promise<string | null> {
  const r = await pool.query<{ d: string }>(
    `SELECT to_char(max(trade_date), 'YYYY-MM-DD') AS d
     FROM fact_fund_daily WHERE fund_code = $1 AND net_flow IS NOT NULL`,
    [code],
  );
  return r.rows[0]?.d ?? null;
}

async function ingestFund(
  pool: pg.Pool,
  client: FintablesClient,
  code: string,
  today: string,
  flowStart: string,
  runId: number,
): Promise<number> {
  let n = 0;

  const price = await client.price(code);
  n += await upsertDaily(
    pool,
    [{ fund_code: code, trade_date: price.date, nav_per_share: price.price }],
    runId,
  );
  await throttle();

  const returns = await client.volatility(code);
  n += await upsertDaily(
    pool,
    returns.map((r) => ({ fund_code: code, trade_date: r.date, daily_return_pct: r.returnPct })),
    runId,
  );
  await throttle();

  const flows = await client.cashflow(code, flowStart, today);
  n += await upsertDaily(
    pool,
    flows.map((f) => ({ fund_code: code, trade_date: f.date, net_flow: f.netFlow })),
    runId,
  );
  await throttle();

  const info = await client.info(code);
  await pool.query(
    `INSERT INTO dim_fund_terms (fund_code, tax_pct, management_fee_pct,
                                 buy_valor_days, sell_valor_days, risk, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (fund_code) DO UPDATE SET
       tax_pct = EXCLUDED.tax_pct, management_fee_pct = EXCLUDED.management_fee_pct,
       buy_valor_days = EXCLUDED.buy_valor_days, sell_valor_days = EXCLUDED.sell_valor_days,
       risk = EXCLUDED.risk, updated_at = now()`,
    [code, info.taxPct, info.managementFeePct, info.buyValorDays, info.sellValorDays, info.risk],
  );
  if (info.allocation.length > 0) {
    const res = await pool.query(
      `INSERT INTO fact_fund_allocation (fund_code, as_of_date, asset_class, weight_pct, ingest_run_id)
       SELECT $1, $2::date, r.asset_class, r.weight_pct, $4
       FROM jsonb_to_recordset($3::jsonb) AS r(asset_class text, weight_pct numeric)
       ON CONFLICT (fund_code, as_of_date, asset_class) DO UPDATE SET
         weight_pct = EXCLUDED.weight_pct, ingest_run_id = EXCLUDED.ingest_run_id,
         updated_at = now()
       WHERE fact_fund_allocation.weight_pct IS DISTINCT FROM EXCLUDED.weight_pct`,
      [
        code,
        price.date,
        JSON.stringify(
          info.allocation.map((a) => ({ asset_class: a.assetClass, weight_pct: a.weightPct })),
        ),
        runId,
      ],
    );
    n += res.rowCount ?? 0;
  }
  await throttle();
  return n;
}

/**
 * Bir pencerenin sonundaki büyüklük, pay adedi ve yatırımcı sayısını yazar.
 * İki toplu endpoint tüm evreni döndürür; watchlist filtresi upsertDaily'de.
 * Taşınmış (tatil) pencere yazılmaz ve takvime işlenir.
 */
async function ingestSizeWindow(
  pool: pg.Pool,
  client: FintablesClient,
  window: { start: string; end: string },
  runId: number,
  markCalendar: boolean,
): Promise<number> {
  const sizes = await client.windowSize(window.start, window.end);
  await throttle();
  if (markCalendar && isCarriedForwardWindow(sizes)) {
    await pool.query(
      `INSERT INTO dim_calendar (trade_date, is_business_day) VALUES ($1, false)
       ON CONFLICT (trade_date) DO UPDATE SET is_business_day = false`,
      [window.end],
    );
    return 0;
  }
  const investors = await client.windowInvestors(window.start, window.end);
  await throttle();
  const byCode = new Map(investors.map((i) => [i.code, i.endInvestorCount]));
  const rows: DailyRow[] = sizes.map((s) => ({
    fund_code: s.code,
    trade_date: window.end,
    ...(s.endAum !== null ? { aum: s.endAum } : {}),
    ...(s.endShareCount !== null ? { shares_active: s.endShareCount } : {}),
    ...(byCode.get(s.code) != null ? { investor_count: byCode.get(s.code) as number } : {}),
  }));
  const n = await upsertDaily(pool, rows, runId);
  if (markCalendar) {
    await pool.query(
      `INSERT INTO dim_calendar (trade_date, is_business_day) VALUES ($1, true)
       ON CONFLICT (trade_date) DO UPDATE SET is_business_day = true`,
      [window.end],
    );
  }
  return n;
}

async function ingestYieldSnapshot(
  pool: pg.Pool,
  client: FintablesClient,
  today: string,
  runId: number,
): Promise<number> {
  const rows = await client.yields();
  const res = await pool.query(
    `INSERT INTO fact_fund_yield_snapshot (fund_code, as_of_date, yield_1m, yield_3m,
                                           yield_6m, yield_ytd, yield_1y, yield_3y,
                                           yield_5y, ingest_run_id)
     SELECT r.fund_code, $2::date, r.yield_1m, r.yield_3m, r.yield_6m, r.yield_ytd,
            r.yield_1y, r.yield_3y, r.yield_5y, $3
     FROM jsonb_to_recordset($1::jsonb) AS r(
       fund_code text, yield_1m numeric, yield_3m numeric, yield_6m numeric,
       yield_ytd numeric, yield_1y numeric, yield_3y numeric, yield_5y numeric)
     WHERE EXISTS (SELECT 1 FROM watchlist w WHERE w.fund_code = r.fund_code)
     ON CONFLICT (fund_code, as_of_date) DO UPDATE SET
       yield_1m = EXCLUDED.yield_1m, yield_3m = EXCLUDED.yield_3m,
       yield_6m = EXCLUDED.yield_6m, yield_ytd = EXCLUDED.yield_ytd,
       yield_1y = EXCLUDED.yield_1y, yield_3y = EXCLUDED.yield_3y,
       yield_5y = EXCLUDED.yield_5y, ingest_run_id = EXCLUDED.ingest_run_id,
       updated_at = now()`,
    [
      JSON.stringify(
        rows.map((r) => ({
          fund_code: r.code,
          yield_1m: r.yield1m,
          yield_3m: r.yield3m,
          yield_6m: r.yield6m,
          yield_ytd: r.yieldYtd,
          yield_1y: r.yield1y,
          yield_3y: r.yield3y,
          yield_5y: r.yield5y,
        })),
      ),
      today,
      runId,
    ],
  );
  return res.rowCount ?? 0;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const today = todayIso();
  const pool = makePool();
  const client = new FintablesClient();

  const runId = (
    await pool.query<{ id: number }>(
      `INSERT INTO ingest_run (source, status) VALUES ('fintables-watchlist', 'running')
       RETURNING id`,
    )
  ).rows[0]!.id;

  let upserted = 0;
  let ok = 0;
  let failed = 0;

  try {
    const codes =
      args.funds ??
      (
        await pool.query<{ fund_code: string }>(
          'SELECT fund_code FROM watchlist ORDER BY fund_code',
        )
      ).rows.map((r) => r.fund_code);
    if (codes.length === 0) throw new Error('Takip listesi boş — önce pnpm db:seed');

    // Evren yanıtı tüm fonları taşır; yalnız takip listesindekiler yazılır.
    const universe = await client.fundUniverse();
    await upsertWatchedFunds(pool, universe, codes);
    await throttle();

    if (!args.skipYield) {
      upserted += await ingestYieldSnapshot(pool, client, today, runId);
      await throttle();
    }

    console.log(
      `Collector başladı: ${codes.length} fon, ${args.backfill ? 'backfill' : 'artımlı'} (run #${runId})`,
    );

    for (const code of codes) {
      try {
        const last = args.backfill ? null : await lastFlowDate(pool, code);
        const flowStart =
          last === null ? monthsBack(today, args.flowMonths) : addDays(last, -OVERLAP_DAYS);
        upserted += await ingestFund(pool, client, code, today, flowStart, runId);
        ok += 1;
        console.log(`  ✓ ${code}`);
      } catch (err) {
        failed += 1;
        console.error(`  ✗ ${code}: ${String(err).split('\n')[0]}`);
      }
    }

    // Fon büyüklüğü: fon başına endpoint yok, toplu pencereden gelir.
    const sizeWindows = args.backfill
      ? [
          ...monthlyWindows(monthsBack(today, args.sizeMonths), 12 - args.sizeMonths),
          ...dailyWindows(monthsBack(today, args.sizeMonths), today),
        ]
      : dailyWindows((await lastSizeDate(pool)) ?? monthsBack(today, args.sizeMonths), today);
    console.log(`Büyüklük pencereleri: ${sizeWindows.length}`);
    for (const w of sizeWindows) {
      try {
        upserted += await ingestSizeWindow(pool, client, w, runId, w.end > monthsBack(today, 1));
      } catch (err) {
        failed += 1;
        console.error(`  ✗ pencere ${w.start}→${w.end}: ${String(err).split('\n')[0]}`);
      }
    }

    await pool.query(
      `UPDATE ingest_run SET status = $2, finished_at = now(), rows_upserted = $3 WHERE id = $1`,
      [runId, failed === 0 ? 'passed' : 'partial', upserted],
    );
    console.log(`\nBitti: ${ok} fon, ${failed} hata, ${upserted} satır yazıldı (run #${runId}).`);
    if (ok === 0) process.exitCode = 1;
  } catch (err) {
    await pool.query(
      `UPDATE ingest_run SET status = 'failed', finished_at = now(), last_error = $2 WHERE id = $1`,
      [runId, String(err)],
    );
    throw err;
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  });
}
