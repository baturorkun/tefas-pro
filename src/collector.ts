/**
 * Takip listesi collector'ı. Oneshot çalışır.
 *
 *   pnpm collect [--months 6] [--funds AAA,BBB] [--skip-yield]
 *
 * Takip listesindeki her fon için dört istek atar; her biri tek çağrıda tüm
 * seriyi döndürdüğü için gün başına döngü yoktur:
 *   /price/       → o günün gerçek NAV'ı
 *   /volatility/  → günlük getiri serisi (~16 ay)
 *   /cashflow/    → günlük net akış serisi (istenen aralık)
 *   /info/        → stopaj, valör, yönetim ücreti, pay adedi, yatırımcı, dağılım
 *
 * Ayrıca tüm evren için günde bir /funds/yield/ snapshot'ı alınır; o endpoint
 * geçmiş vermediği için tarih ancak böyle birikir.
 *
 * Dayanıklılık: fon başına try/catch (biri patlarsa run durmaz), sıralı istek,
 * throttle + jitter, her run bir ingest_run satırı bırakır.
 */
import type pg from 'pg';

import { FintablesClient } from './sources/fintables.js';
import { makePool } from './db/pool.js';
import { upsertUniverse } from './db/seed.js';

const THROTTLE_MS = 700;

interface Args {
  months: number;
  funds: string[] | undefined;
  skipYield: boolean;
}

export function parseArgs(argv: string[]): Args {
  const args: Args = { months: 6, funds: undefined, skipYield: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--months') args.months = Number(argv[(i += 1)]);
    else if (argv[i] === '--funds') args.funds = argv[(i += 1)]?.split(',');
    else if (argv[i] === '--skip-yield') args.skipYield = true;
  }
  return args;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Yerel takvim günü; piyasa tarihleri yereldir, UTC kayması istenmez. */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * `months` ay geriye gider. Hedef ayda o gün yoksa ayın son gününe kırpar:
 * 30 Ağustos'tan 6 ay geri 2 Mart değil 28 Şubat'tır. Aritmetik UTC üzerinden
 * yapılır ki DST günü kaydırmasın.
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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
function throttle(): Promise<void> {
  return sleep(THROTTLE_MS + Math.floor(Math.random() * 400));
}

/** Gün grain'indeki alanlar farklı endpoint'lerden gelir; hepsi aynı satıra
 *  yazılır ve yalnız kendi sütununu günceller. */
type DailyField = 'nav_per_share' | 'daily_return_pct' | 'net_flow' | 'shares_active' | 'investor_count';

interface DailyRow {
  fund_code: string;
  trade_date: string;
  nav_per_share?: number;
  daily_return_pct?: number;
  net_flow?: number;
  shares_active?: number;
  investor_count?: number;
}

export async function upsertDaily(
  pool: pg.Pool,
  rows: DailyRow[],
  fields: DailyField[],
  runId: number,
): Promise<number> {
  if (rows.length === 0) return 0;
  const cols = fields.join(', ');
  const sel = fields.map((f) => `r.${f}`).join(', ');
  const decl = fields
    .map((f) => `${f} ${f === 'investor_count' ? 'integer' : 'numeric'}`)
    .join(', ');
  const set = fields.map((f) => `${f} = EXCLUDED.${f}`).join(', ');
  const res = await pool.query(
    `INSERT INTO fact_fund_daily (fund_code, trade_date, ${cols}, ingest_run_id)
     SELECT r.fund_code, r.trade_date, ${sel}, $2
     FROM jsonb_to_recordset($1::jsonb) AS r(fund_code text, trade_date date, ${decl})
     ON CONFLICT (fund_code, trade_date) DO UPDATE SET
       ${set}, ingest_run_id = EXCLUDED.ingest_run_id, updated_at = now()`,
    [JSON.stringify(rows), runId],
  );
  return res.rowCount ?? 0;
}

/** Bir fonu topla: NAV, getiri serisi, akış serisi, şartlar, dağılım. */
async function ingestFund(
  pool: pg.Pool,
  client: FintablesClient,
  code: string,
  startDate: string,
  today: string,
  runId: number,
): Promise<number> {
  let n = 0;

  const price = await client.price(code);
  n += await upsertDaily(
    pool,
    [{ fund_code: code, trade_date: price.date, nav_per_share: price.price }],
    ['nav_per_share'],
    runId,
  );
  await throttle();

  const returns = await client.volatility(code);
  n += await upsertDaily(
    pool,
    returns.map((r) => ({ fund_code: code, trade_date: r.date, daily_return_pct: r.returnPct })),
    ['daily_return_pct'],
    runId,
  );
  await throttle();

  const flows = await client.cashflow(code, startDate, today);
  n += await upsertDaily(
    pool,
    flows.map((f) => ({ fund_code: code, trade_date: f.date, net_flow: f.netFlow })),
    ['net_flow'],
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
  if (info.sharesActive !== null || info.investorCount !== null) {
    n += await upsertDaily(
      pool,
      [
        {
          fund_code: code,
          trade_date: price.date,
          shares_active: info.sharesActive ?? undefined,
          investor_count: info.investorCount ?? undefined,
        },
      ],
      ['shares_active', 'investor_count'],
      runId,
    );
  }
  if (info.allocation.length > 0) {
    const res = await pool.query(
      `INSERT INTO fact_fund_allocation (fund_code, as_of_date, asset_class, weight_pct, ingest_run_id)
       SELECT $1, $2::date, r.asset_class, r.weight_pct, $4
       FROM jsonb_to_recordset($3::jsonb) AS r(asset_class text, weight_pct numeric)
       ON CONFLICT (fund_code, as_of_date, asset_class) DO UPDATE SET
         weight_pct = EXCLUDED.weight_pct, ingest_run_id = EXCLUDED.ingest_run_id,
         updated_at = now()`,
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

async function ingestYieldSnapshot(
  pool: pg.Pool,
  client: FintablesClient,
  today: string,
  runId: number,
): Promise<number> {
  const rows = await client.yields();
  const payload = rows.map((r) => ({
    fund_code: r.code,
    yield_1m: r.yield1m,
    yield_3m: r.yield3m,
    yield_6m: r.yield6m,
    yield_ytd: r.yieldYtd,
    yield_1y: r.yield1y,
    yield_3y: r.yield3y,
    yield_5y: r.yield5y,
  }));
  const res = await pool.query(
    `INSERT INTO fact_fund_yield_snapshot (fund_code, as_of_date, yield_1m, yield_3m,
                                           yield_6m, yield_ytd, yield_1y, yield_3y,
                                           yield_5y, ingest_run_id)
     SELECT r.fund_code, $2::date, r.yield_1m, r.yield_3m, r.yield_6m, r.yield_ytd,
            r.yield_1y, r.yield_3y, r.yield_5y, $3
     FROM jsonb_to_recordset($1::jsonb) AS r(
       fund_code text, yield_1m numeric, yield_3m numeric, yield_6m numeric,
       yield_ytd numeric, yield_1y numeric, yield_3y numeric, yield_5y numeric)
     WHERE EXISTS (SELECT 1 FROM dim_fund d WHERE d.fund_code = r.fund_code)
     ON CONFLICT (fund_code, as_of_date) DO UPDATE SET
       yield_1m = EXCLUDED.yield_1m, yield_3m = EXCLUDED.yield_3m,
       yield_6m = EXCLUDED.yield_6m, yield_ytd = EXCLUDED.yield_ytd,
       yield_1y = EXCLUDED.yield_1y, yield_3y = EXCLUDED.yield_3y,
       yield_5y = EXCLUDED.yield_5y, ingest_run_id = EXCLUDED.ingest_run_id,
       updated_at = now()`,
    [JSON.stringify(payload), today, runId],
  );
  return res.rowCount ?? 0;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const today = todayIso();
  const startDate = monthsBack(today, args.months);
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
    const universe = await client.fundUniverse();
    await upsertUniverse(pool, universe);
    await throttle();

    if (!args.skipYield) {
      upserted += await ingestYieldSnapshot(pool, client, today, runId);
      await throttle();
    }

    const codes =
      args.funds ??
      (
        await pool.query<{ fund_code: string }>(
          'SELECT fund_code FROM watchlist ORDER BY fund_code',
        )
      ).rows.map((r) => r.fund_code);

    if (codes.length === 0) throw new Error('Takip listesi boş — önce pnpm db:seed');
    console.log(`Collector başladı: ${codes.length} fon, ${startDate} → ${today} (run #${runId})`);

    for (const code of codes) {
      try {
        upserted += await ingestFund(pool, client, code, startDate, today, runId);
        ok += 1;
        console.log(`  ✓ ${code}`);
      } catch (err) {
        failed += 1;
        console.error(`  ✗ ${code}: ${String(err).split('\n')[0]}`);
      }
    }

    await pool.query(
      `UPDATE ingest_run SET status = $2, finished_at = now(), rows_upserted = $3 WHERE id = $1`,
      [runId, failed === 0 ? 'passed' : 'partial', upserted],
    );
    console.log(`\nBitti: ${ok} fon, ${failed} hata, ${upserted} satır (run #${runId}).`);
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
