/**
 * TEFAS'ın toplu uçlarından zamanlanmış günlük toplama.
 *
 * Birincil kaynak. Sunucuda zamanlanmış koşar (bkz. collector/install.sh).
 *
 * Günde İKİ istek: `fonGnlBlgSiraliGetir` tüm fonların fiyat/pay/yatırımcı/
 * büyüklüğünü, `dagilimSiraliGetirT` varlık sınıfı dağılımını tek yanıtta
 * veriyor. Önceki sürüm fon başına iki istek atıyordu (74 fon için 148);
 * tekrarlanan koşumlar bir IP'nin engellenmesine yol açmıştı.
 *
 * Tarih yanıttan gelir, koşum günü varsayılmaz: fon bugünün fiyatını
 * açıklamadıysa yanıtta bugünün satırı olmaz ve gün ilerlemez. Aralık birkaç
 * gün geriye alınır ki günlük getiri ve net akış aynı yanıt içindeki bir
 * önceki günden türetilebilsin; COALESCE upsert sayesinde eski günlere
 * yeniden yazmak zararsız.
 *
 * Günlük getiri ardışık fiyatlardan türetilir — toplu uç vermiyor. Ölçüldü:
 * TEFAS'ın kendi gunlukGetiri değeriyle 224 gözlemin 220'si binde bir içinde.
 */
import pg from 'pg';

import { SCHEDULED_SOURCE } from './ingest-source.js';
import { topluDagilim, topluFonBilgisi, type TefasTopluGun } from './sources/tefas.js';
import { kanonikDagilim } from './sources/tefas-dagilim.js';
import {
  upsertDaily, successfulRunToday, missingFundsToday, todayIso, type DailyRow,
} from './collector.js';

/** Zamanlanmış koşumun kaynağı; tanımı ingest-source.ts'te. */
export const TEFAS_SOURCE = SCHEDULED_SOURCE;

/** İki toplu istek arasındaki bekleme. */
const THROTTLE_MS = Number(process.env['TEFAS_THROTTLE_MS'] ?? '') || 3000;

/**
 * Geriye kaç gün istenir. Hafta sonu ve tatil boşluklarını aşacak kadar:
 * bir önceki iş günü yanıtta olmalı ki getiri ve akış türetilebilsin.
 */
const PENCERE_GUN = 8;

function bekle(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function gunEkle(iso: string, gun: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + gun);
  return d.toISOString().slice(0, 10);
}

/**
 * Net akış: dolaşımdaki pay adedindeki değişim × o günkü pay fiyatı.
 *
 * Fintables'ın `net_flow` serisi bağımsız bir veri değil, bu formülün
 * sonucuymuş — 405 gözlemde ölçüldü: korelasyon 0.936, yön tutarlılığı %98.8,
 * medyan sapma %0.00, vakaların %90'ından fazlasında tam sıfır sapma.
 *
 * Önceki pay adedi bilinmiyorsa değer üretilmez; eksik veriyi uydurmaktansa
 * NULL bırakmak doğru.
 */
export function netAkis(
  simdikiPay: number | undefined,
  oncekiPay: number | null | undefined,
  fiyat: number,
): number | undefined {
  if (simdikiPay === undefined || oncekiPay === null || oncekiPay === undefined) {
    return undefined;
  }
  return (simdikiPay - oncekiPay) * fiyat;
}

/** Günlük getiri yüzdesi; önceki fiyat yoksa ya da sıfırsa üretilmez. */
export function gunlukGetiri(bugun: number, dun: number | undefined): number | undefined {
  if (dun === undefined || dun <= 0) return undefined;
  return (bugun / dun - 1) * 100;
}

/**
 * Toplu yanıtı günlük satırlara çevirir. Getiri ve akış, aynı fonun yanıt
 * içindeki bir önceki gününden türetilir; pencerenin ilk günü için önceki
 * gün yoktur, o alanlar boş kalır ve upsert var olan değeri korur.
 */
export function topluSatirlar(gunler: readonly TefasTopluGun[]): DailyRow[] {
  const fona = new Map<string, TefasTopluGun[]>();
  for (const g of gunler) fona.set(g.fundCode, [...(fona.get(g.fundCode) ?? []), g]);
  const rows: DailyRow[] = [];
  for (const seri of fona.values()) {
    seri.sort((a, b) => (a.tradeDate < b.tradeDate ? -1 : 1));
    for (let i = 0; i < seri.length; i++) {
      const g = seri[i]!;
      const onceki = i > 0 ? seri[i - 1] : undefined;
      rows.push({
        fund_code: g.fundCode,
        trade_date: g.tradeDate,
        nav_per_share: g.navPerShare,
        daily_return_pct: gunlukGetiri(g.navPerShare, onceki?.navPerShare),
        shares_active: g.sharesActive ?? undefined,
        net_flow: netAkis(g.sharesActive ?? undefined, onceki?.sharesActive, g.navPerShare),
        investor_count: g.investorCount ?? undefined,
        aum: g.aum ?? undefined,
      });
    }
  }
  return rows;
}

/** Dağılımı kanonik adlarla `fact_fund_allocation`'a yazar. */
async function dagilimYaz(
  pool: pg.Pool,
  dagilim: readonly { fundCode: string; tradeDate: string; yuzdeler: Record<string, number> }[],
  codes: ReadonlySet<string>,
  runId: number,
): Promise<number> {
  const satirlar: { fund_code: string; as_of_date: string; asset_class: string; weight_pct: number }[] = [];
  for (const d of dagilim) {
    if (!codes.has(d.fundCode)) continue;
    for (const [ad, yuzde] of kanonikDagilim(d.yuzdeler)) {
      satirlar.push({ fund_code: d.fundCode, as_of_date: d.tradeDate, asset_class: ad, weight_pct: yuzde });
    }
  }
  if (satirlar.length === 0) return 0;
  const r = await pool.query(
    `INSERT INTO fact_fund_allocation (fund_code, as_of_date, asset_class, weight_pct, ingest_run_id)
     SELECT x.fund_code, x.as_of_date::date, x.asset_class, x.weight_pct, $2
       FROM jsonb_to_recordset($1::jsonb)
            AS x(fund_code text, as_of_date text, asset_class text, weight_pct numeric)
     ON CONFLICT (fund_code, as_of_date, asset_class) DO UPDATE SET
       weight_pct = EXCLUDED.weight_pct, ingest_run_id = EXCLUDED.ingest_run_id, updated_at = now()
      WHERE fact_fund_allocation.weight_pct IS DISTINCT FROM EXCLUDED.weight_pct`,
    [JSON.stringify(satirlar), runId],
  );
  return r.rowCount ?? 0;
}

async function main(): Promise<void> {
  const url = process.env['DATABASE_URL'];
  if (url === undefined || url === '') {
    console.error('DATABASE_URL tanımlı değil.');
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: url });
  const today = todayIso();
  const force = process.argv.includes('--force');

  try {
    // "Koştu mu" değil "bitti mi": başarılı koşum varsa ve eksik fon yoksa
    // tekrar sorulmaz. Toplu uçta bir istek ucuz ama gereksiz istek gereksiz.
    if (!force) {
      const bitis = await successfulRunToday(pool, today, TEFAS_SOURCE);
      const eksik = bitis === null ? [] : await missingFundsToday(pool);
      if (bitis !== null && eksik.length === 0) {
        // Havuzu burada kapatma: `finally` kapatıyor; ikinci çağrı koşumu
        // "Called end on pool more than once" ile düşürüyordu.
        console.log(`Bugün ${bitis} itibarıyla toplandı, eksik fon yok — atlandı.`);
        return;
      }
    }

    const secili = process.argv.slice(2).filter((a) => !a.startsWith('-'));
    const codes = new Set(secili.length > 0
      ? secili.map((c) => c.toUpperCase())
      : (await pool.query<{ fund_code: string }>(
          'SELECT fund_code FROM analytics.tracked_fund ORDER BY fund_code',
        )).rows.map((r) => r.fund_code));
    if (codes.size === 0) {
      console.log('Toplanacak fon yok.');
      return;
    }

    const runId = (await pool.query<{ id: number }>(
      `INSERT INTO ingest_run (source, status) VALUES ($1, 'running') RETURNING id`,
      [TEFAS_SOURCE],
    )).rows[0]!.id;
    const bas = gunEkle(today, -PENCERE_GUN);
    console.log(`tefas toplu toplama: ${String(codes.size)} fon, ${bas}..${today} (run ${String(runId)})`);

    const errors: string[] = [];
    let yazilan = 0;
    let bugunGelen = 0;

    try {
      const hepsi = await topluFonBilgisi(bas, today);
      const bizim = hepsi.filter((g) => codes.has(g.fundCode));
      const rows = topluSatirlar(bizim);
      bugunGelen = new Set(bizim.filter((g) => g.tradeDate === today).map((g) => g.fundCode)).size;
      const gelmeyen = [...codes].filter((c) => !bizim.some((g) => g.fundCode === c));
      if (gelmeyen.length > 0) errors.push(`yanıtta yok: ${gelmeyen.join(', ')}`);
      yazilan += await upsertDaily(pool, rows, runId, today);
      console.log(`  günlük: ${String(rows.length)} satır, bugün fiyatı gelen ${String(bugunGelen)}/${String(codes.size)} fon`);
    } catch (err) {
      errors.push(`fon bilgisi: ${String(err)}`);
      console.log(`  ✗ fon bilgisi: ${String(err)}`);
    }

    await bekle(THROTTLE_MS);

    try {
      const dagilim = await topluDagilim(bas, today);
      const n = await dagilimYaz(pool, dagilim, codes, runId);
      yazilan += n;
      console.log(`  dağılım: ${String(n)} satır`);
    } catch (err) {
      // Dağılım en iyi çaba: fiyat yazıldıysa Getiri Günü ilerler.
      errors.push(`dağılım: ${String(err)}`);
      console.log(`  ✗ dağılım: ${String(err)}`);
    }

    const durum = errors.length === 0 ? 'passed' : 'partial';
    await pool.query(
      `UPDATE ingest_run SET status = $2, finished_at = now(), rows_upserted = $3,
              funds_ok = $4, funds_failed = $5, last_error = $6 WHERE id = $1`,
      [runId, durum, yazilan, bugunGelen, codes.size - bugunGelen,
        errors.length === 0 ? null : errors.join('\n')],
    );
    console.log(`\nBitti: ${String(yazilan)} satır yazıldı, ${String(errors.length)} hata`);
    if (errors.length > 0) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  await main();
}

/**
 * Tek fonun günlük verisi — takip listesine yeni fon eklendiğinde.
 *
 * Aynı toplu uç, `fonKodu` süzgeciyle: tek istek, tarih yanıttan. Zamanlanmış
 * koşumla aynı dönüşümden geçer; iki yol ayrışırsa fon nasıl eklendiğine
 * göre farklı veri oluşurdu.
 */
export async function tefasFonuTopla(
  pool: pg.Pool,
  kod: string,
  runId: number,
  today: string = todayIso(),
): Promise<number> {
  const gunler = await topluFonBilgisi(gunEkle(today, -PENCERE_GUN), today, kod);
  const rows = topluSatirlar(gunler.filter((g) => g.fundCode === kod));
  if (rows.length === 0) return 0;
  return upsertDaily(pool, rows, runId, today);
}
