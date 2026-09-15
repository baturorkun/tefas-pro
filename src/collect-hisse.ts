/**
 * Hisse günlük kapanışlarının toplanması.
 *
 * Yalnız portföylerde GERÇEKTEN tutulan hisseler çekilir: takip edilen
 * fonların son bildirdiği kırılımda ağırlığı sıfırdan büyük olanlar. Tüm
 * evreni çekmek gereksiz yük, çünkü ekranda yalnız bunlar görünüyor.
 *
 * Tahvil, altın, opsiyon gibi hisse olmayan kalemler elenir: onların
 * kodu BIST sembolü değil ve sorgulamak boşuna istek olur.
 */
import pg from 'pg';

import { HISSE_SOURCE } from './ingest-source.js';
import { gunlukKapanislar } from './sources/hisse-fiyat.js';

/** İstekler arası bekleme. */
const THROTTLE_MS = Number(process.env['HISSE_THROTTLE_MS'] ?? '') || 400;

const bekle = (ms: number): Promise<void> =>
  new Promise((c) => setTimeout(c, ms));

/**
 * BIST hisse kodu mu?
 *
 * BIST kodları 3-6 harf. Tahvil ISIN'leri (TRT181028T14) rakam içeriyor,
 * altın (AU995) ve opsiyon kodları da öyle — bunlar hisse değil.
 */
export function bistHissesiMi(kod: string): boolean {
  return /^[A-ZÇĞİÖŞÜ]{3,6}$/.test(kod);
}

/** Portföylerde tutulan hisse kodları. */
export async function tutulanHisseler(pool: pg.Pool): Promise<string[]> {
  const r = await pool.query<{ stock_code: string }>(
    `SELECT DISTINCT h.stock_code
       FROM fund_stock_holding h
       JOIN analytics.tracked_fund t ON t.fund_code = h.fund_code
      WHERE h.weight_pct > 0
        AND h.as_of_date = (
          SELECT max(as_of_date) FROM fund_stock_holding
           WHERE fund_code = h.fund_code)
      ORDER BY h.stock_code`,
  );
  return r.rows.map((x) => x.stock_code).filter(bistHissesiMi);
}

async function main(): Promise<void> {
  const url = process.env['DATABASE_URL'];
  if (url === undefined || url === '') {
    console.error('DATABASE_URL tanımlı değil.');
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: url });

  try {
    const secili = process.argv.slice(2).filter((a) => !a.startsWith('-'));
    const kodlar = secili.length > 0
      ? secili.map((c) => c.toUpperCase()).filter(bistHissesiMi)
      : await tutulanHisseler(pool);
    if (kodlar.length === 0) {
      console.log('Toplanacak hisse yok.');
      return;
    }

    const runId = (await pool.query<{ id: number }>(
      `INSERT INTO ingest_run (source, status) VALUES ($1, 'running') RETURNING id`,
      [HISSE_SOURCE],
    )).rows[0]!.id;
    console.log(`hisse fiyat toplaması: ${String(kodlar.length)} hisse (run ${String(runId)})`);

    const hatalar: string[] = [];
    let yazilan = 0;
    let atlanan = 0;
    for (const kod of kodlar) {
      try {
        const satirlar = await gunlukKapanislar(kod, 30);
        // Boş sonuç: kod BIST'te yok (fon katılma payı, yabancı hisse).
        // Hata değil, atlanır.
        if (satirlar.length === 0) { atlanan++; continue; }
        const r = await pool.query(
          `INSERT INTO fact_stock_daily (stock_code, trade_date, close, ingest_run_id)
           SELECT $1, x.trade_date::date, x.close, $3
             FROM jsonb_to_recordset($2::jsonb) AS x(trade_date text, close numeric)
           ON CONFLICT (stock_code, trade_date) DO UPDATE SET
             close = EXCLUDED.close, ingest_run_id = EXCLUDED.ingest_run_id
            WHERE fact_stock_daily.close IS DISTINCT FROM EXCLUDED.close`,
          [kod, JSON.stringify(satirlar.map((s) => ({
            trade_date: s.tradeDate, close: s.close,
          }))), runId],
        );
        yazilan += r.rowCount ?? 0;
      } catch (err) {
        hatalar.push(`${kod}: ${String(err).split('\n')[0] ?? ''}`);
      }
      await bekle(THROTTLE_MS);
    }

    // Kısmi başarı koşumu düşürmez: bir hissenin sembolü bulunamıyor diye
    // diğerlerinin fiyatı geçersiz olmuyor.
    const durum = hatalar.length === 0 ? 'passed' : 'partial';
    await pool.query(
      `UPDATE ingest_run SET status = $2, finished_at = now(), rows_upserted = $3,
              funds_ok = $4, funds_failed = $5, last_error = $6 WHERE id = $1`,
      [runId, durum, yazilan, kodlar.length - hatalar.length, hatalar.length,
        hatalar.length === 0 ? null : hatalar.join('\n')],
    );
    console.log(
      `\nBitti: ${String(yazilan)} satır, ${String(atlanan)} borsada yok, ` +
      `${String(hatalar.length)} hata`,
    );
  } finally {
    await pool.end();
  }
}

if (process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
