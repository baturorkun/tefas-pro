/**
 * TEFAS'ın kendi API'sinden acil fiyat/getiri toplaması.
 *
 * Ayrı bir giriş noktası: Fintables kapalıyken devreye giren geçici bir
 * yedek, zamanlanmış koşumun yerini almıyor. Ayrıntı için src/sources/tefas.ts.
 *
 * Yavaş ve nazik: TEFAS'ın kendi API'si bugüne kadar hiç engellememişti,
 * öyle kalsın diye istekler arası bekleme var ve varsayılan yüksek tutuldu.
 */
import pg from 'pg';

import { fonBilgiGetir } from './sources/tefas.js';
import { upsertDaily, todayIso, type DailyRow } from './collector.js';

const SOURCE = 'tefas-emergency';
const THROTTLE_MS = Number(process.env['TEFAS_THROTTLE_MS'] ?? '') || 2500;

function bekle(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  const url = process.env['DATABASE_URL'];
  if (url === undefined || url === '') {
    console.error('DATABASE_URL tanımlı değil.');
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: url });
  const today = todayIso();

  try {
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
      [SOURCE],
    )).rows[0]!.id;

    console.log(`tefas acil toplaması: ${String(codes.length)} fon, gün ${today} (run ${String(runId)})`);

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
            investor_count: g.investorCount ?? undefined,
            aum: g.aum ?? undefined,
          });
          console.log(`  ✓ ${kod}: ${String(g.navPerShare)}  getiri ${String(g.dailyReturnPct)}%`);
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

await main();
