/**
 * TEFAS'ın kendi API'sinden zamanlanmış fiyat/getiri toplaması.
 *
 * Birincil kaynak — Fintables'a bağımlı değil. Sunucuda zamanlanmış koşar
 * (bkz. collector/install.sh); Fintables'ın veri merkezi IP'lerini
 * engellediği günlerde bile Getiri Günü ilerler. Ayrıntı için
 * src/sources/tefas.ts.
 *
 * Net akış da buradan çıkıyor: ayrı bir veri değil, pay adedi değişimi ×
 * fiyat — bkz. netAkis(). Varlık sınıfı dağılımı hâlâ eksik, o Fintables
 * çalışırsa gelir; COALESCE upsert sayesinde bu koşum onu silmez.
 *
 * Yavaş ve nazik: TEFAS'ın kendi API'si bugüne kadar hiç engellememişti,
 * öyle kalsın diye istekler arası bekleme var.
 */
import pg from 'pg';

import { fonBilgiGetir } from './sources/tefas.js';
import { SCHEDULED_SOURCE } from './ingest-source.js';
import {
  upsertDaily, successfulRunToday, missingFundsToday, todayIso, type DailyRow,
} from './collector.js';

/** Zamanlanmış koşumun kaynağı; tanımı ingest-source.ts'te. */
export const TEFAS_SOURCE = SCHEDULED_SOURCE;
const THROTTLE_MS = Number(process.env['TEFAS_THROTTLE_MS'] ?? '') || 1500;

function bekle(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
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

/** Her fon için `today`den önceki en son bilinen pay adedi. */
async function oncekiPayAdetleri(
  pool: pg.Pool,
  codes: readonly string[],
  today: string,
): Promise<Map<string, number>> {
  const r = await pool.query<{ fund_code: string; shares_active: string }>(
    `SELECT DISTINCT ON (fund_code) fund_code, shares_active
       FROM fact_fund_daily
      WHERE fund_code = ANY($1) AND trade_date < $2::date AND shares_active IS NOT NULL
      ORDER BY fund_code, trade_date DESC`,
    [[...codes], today],
  );
  return new Map(r.rows.map((x) => [x.fund_code, Number(x.shares_active)]));
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
    // Aynı kural collector.ts'deki gibi: "koştu mu" değil "bitti mi". TEFAS
    // tek istekte fiyat+getiri+yatırımcı+büyüklük verdiği için Fintables'taki
    // gibi artımlı pencere yok; eksik kalan fon varsa yeniden koşmak yeterli.
    if (!force) {
      const bitis = await successfulRunToday(pool, today, TEFAS_SOURCE);
      const eksik = bitis === null ? [] : await missingFundsToday(pool);
      if (bitis !== null && eksik.length === 0) {
        await pool.end();
        console.log(`Bugün ${bitis} itibarıyla toplandı, eksik fon yok — atlandı.`);
        return;
      }
      if (bitis !== null) {
        console.log(`Bugün ${bitis}'de toplandı ama ${String(eksik.length)} fon eksik `
          + `(${eksik.slice(0, 5).join(', ')}${eksik.length > 5 ? '…' : ''}) — yeniden koşuluyor.`);
      }
    }

    const secili = process.argv.slice(2).filter((a) => !a.startsWith('-'));
    const codes = secili.length > 0
      ? secili.map((c) => c.toUpperCase())
      : (await pool.query<{ fund_code: string }>(
          'SELECT fund_code FROM analytics.tracked_fund ORDER BY fund_code',
        )).rows.map((r) => r.fund_code);

    if (codes.length === 0) {
      console.log('Toplanacak fon yok.');
      return;
    }

    const runId = (await pool.query<{ id: number }>(
      `INSERT INTO ingest_run (source, status) VALUES ($1, 'running') RETURNING id`,
      [TEFAS_SOURCE],
    )).rows[0]!.id;

    console.log(`tefas toplaması: ${String(codes.length)} fon, gün ${today} (run ${String(runId)})`);

    const oncekiPay = await oncekiPayAdetleri(pool, codes, today);

    const rows: DailyRow[] = [];
    const errors: string[] = [];
    for (const kod of codes) {
      try {
        const g = await fonBilgiGetir(kod);
        if (g === null) {
          errors.push(`${kod}: sonuç yok`);
          console.log(`  ✗ ${kod}: sonuç yok`);
        } else {
          rows.push({
            fund_code: g.fundCode,
            trade_date: today,
            nav_per_share: g.navPerShare,
            daily_return_pct: g.dailyReturnPct ?? undefined,
            shares_active: g.sharesActive ?? undefined,
            net_flow: netAkis(
              g.sharesActive ?? undefined, oncekiPay.get(g.fundCode), g.navPerShare,
            ),
            investor_count: g.investorCount ?? undefined,
            aum: g.aum ?? undefined,
          });
          console.log(`  ✓ ${kod}`);
        }
      } catch (err) {
        errors.push(`${kod}: ${String(err)}`);
        console.log(`  ✗ ${kod}: ${String(err)}`);
      }
      await bekle(THROTTLE_MS);
    }

    const yazilan = await upsertDaily(pool, rows, runId, today);
    const durum = errors.length === 0 ? 'passed' : 'partial';
    await pool.query(
      `UPDATE ingest_run SET status = $2, finished_at = now(), rows_upserted = $3,
              funds_ok = $4, funds_failed = $5, last_error = $6 WHERE id = $1`,
      [runId, durum, yazilan, codes.length - errors.length, errors.length,
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
 * Tek fonun günlük verisi: fiyat, getiri, yatırımcı, büyüklük, net akış.
 *
 * Takip listesine yeni fon eklendiğinde çağrılır. Zamanlanmış koşumla aynı
 * veriyi aynı şekilde yazar — iki yol ayrışırsa fon nasıl eklendiğine göre
 * farklı veri oluşurdu.
 */
export async function tefasFonuTopla(
  pool: pg.Pool,
  kod: string,
  runId: number,
  today: string = todayIso(),
): Promise<number> {
  const g = await fonBilgiGetir(kod);
  if (g === null) return 0;
  const oncekiPay = await oncekiPayAdetleri(pool, [kod], today);
  const rows: DailyRow[] = [{
    fund_code: g.fundCode,
    trade_date: today,
    nav_per_share: g.navPerShare,
    daily_return_pct: g.dailyReturnPct ?? undefined,
    shares_active: g.sharesActive ?? undefined,
    net_flow: netAkis(g.sharesActive ?? undefined, oncekiPay.get(g.fundCode), g.navPerShare),
    investor_count: g.investorCount ?? undefined,
    aum: g.aum ?? undefined,
  }];
  return upsertDaily(pool, rows, runId, today);
}
