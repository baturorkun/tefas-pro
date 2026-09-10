/**
 * fvt toplaması: hisse kırılımı ve hisse fiyatları.
 *
 * Ayrı bir giriş noktası çünkü ayrı bir yerden koşuyor. Ölçüldü:
 *
 *     ev IP'si     /api/funds/{KOD}/distribution   200, 82 kalem
 *     sunucu IP'si aynı uç                         403, Cloudflare
 *
 * Engel istemcide değil IP'de: sunucudan curl da, impit de, gerçek Chrome de
 * 403 alıyor — tarayıcıyla sayfayı açıp sekmeye tıklamak da aynı uca gidip
 * aynı yanıtı alıyor. Aynı sunucudan `/api/app-token` ve `/api/settings/*`
 * 200 dönüyor, yani engel veri uçlarına özel ve bilinçli.
 *
 * Zamanlanmış collector (`src/collector.ts`) sunucuda koşmaya devam eder ve
 * Fintables tarafını yapar; bu komut yalnız fvt'ye bağlı iki tabloyu doldurur.
 * `--skip-stocks` ile koşan sunucu tarafıyla çakışmaz.
 *
 * Veri aylık: `distribution` fonların ay sonu açıkladığı ağırlıklar. Günlük
 * koşmasına gerek yok.
 */
import pg from 'pg';

import { ingestStockHoldings } from './collector.js';
import { FvtClient } from './sources/fvt.js';

/** Zamanlanmış koşumdan ayrı etiket: Collector Log'da hangisi olduğu görünsün. */
const SOURCE = 'fvt-local';

async function main(): Promise<void> {
  const url = process.env['DATABASE_URL'];
  if (url === undefined || url === '') {
    console.error('DATABASE_URL tanımlı değil.');
    process.exit(1);
  }

  const secili = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const pool = new pg.Pool({ connectionString: url });

  try {
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
      [SOURCE],
    )).rows[0]!.id;

    console.log(`fvt toplaması: ${String(codes.length)} fon (run ${String(runId)})`);

    try {
      const s = await ingestStockHoldings(pool, new FvtClient(), codes, runId);
      // Kısmi başarı koşumu düşürmez: bir fonun içeriği yoksa — para piyasası
      // fonu hisse tutmuyor — diğerleri yazılmış olmalı.
      const durum = s.errors.length === 0 ? 'passed' : 'partial';
      await pool.query(
        `UPDATE ingest_run SET status = $2, finished_at = now(), rows_upserted = $3,
                funds_ok = $4, funds_failed = $5, last_error = $6 WHERE id = $1`,
        [runId, durum, s.upserted, codes.length - s.errors.length, s.errors.length,
          s.errors.length === 0 ? null : s.errors.join('\n')],
      );
      console.log(`\nBitti: ${String(s.upserted)} satır, ${String(s.errors.length)} hata`);
      if (s.errors.length > 0) process.exitCode = 1;
    } catch (err) {
      await pool.query(
        `UPDATE ingest_run SET status = 'failed', finished_at = now(), last_error = $2
          WHERE id = $1`,
        [runId, String(err)],
      );
      throw err;
    }
  } finally {
    await pool.end();
  }
}

await main();
