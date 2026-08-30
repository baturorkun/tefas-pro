/**
 * Takip listesini besler.
 *
 *   pnpm db:seed [dosya]        (varsayılan: db/watchlist.txt)
 *
 * Önce fon evrenini fintables'tan çekip dim_fund'a yazar — watchlist ona
 * foreign key ile bağlı. Sonra dosyadaki kodları watchlist'e uygular.
 * Idempotent: tekrar çalıştırmak satır sayısını değiştirmez.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type pg from 'pg';

import { FintablesClient, type FundUniverseRow } from '../sources/fintables.js';
import { makePool } from './pool.js';

const DEFAULT_FILE = join(process.cwd(), 'db', 'watchlist.txt');

export interface WatchlistEntry {
  code: string;
  status: 'owned' | 'watching';
}

/** `KOD [owned|watching]` satırlarını okur; yorum ve boş satırları atlar. */
export function parseWatchlistFile(text: string): WatchlistEntry[] {
  const out: WatchlistEntry[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const [code, status] = trimmed.split(/\s+/);
    if (code === undefined) continue;
    if (status !== undefined && status !== 'owned' && status !== 'watching') {
      throw new Error(`watchlist: geçersiz durum "${status}" (satır: ${trimmed})`);
    }
    out.push({ code: code.toUpperCase(), status: status ?? 'watching' });
  }
  return out;
}

/**
 * Fon evreninden YALNIZ verilen kodları dim_fund'a yazar.
 *
 * Toplu endpoint'ler 2822 fonluk evrenin tamamını döndürür; veritabanı takip
 * listesiyle sınırlı tutulur. Takip listesine yeni fon eklenirken kod/unvan
 * araması bu tablodan değil, o an `/funds/` çağrılarak yapılır.
 */
export async function upsertWatchedFunds(
  pool: pg.Pool,
  funds: FundUniverseRow[],
  codes: string[],
): Promise<number> {
  const wanted = new Set(codes.map((c) => c.toUpperCase()));
  const payload = funds
    .filter((f) => wanted.has(f.code))
    .map((f) => ({
      fund_code: f.code,
      title: f.title,
      fund_type: f.fundType,
      umbrella_type: f.umbrellaType,
      management_company_id: f.managementCompanyId,
      is_byf: f.isByf,
    }));
  if (payload.length === 0) return 0;
  const res = await pool.query(
    `INSERT INTO dim_fund (fund_code, title, fund_type, umbrella_type,
                           management_company_id, is_byf, last_seen_at)
     SELECT r.fund_code, r.title, r.fund_type, r.umbrella_type,
            r.management_company_id, r.is_byf, now()
     FROM jsonb_to_recordset($1::jsonb) AS r(
       fund_code text, title text, fund_type text, umbrella_type text,
       management_company_id text, is_byf boolean)
     ON CONFLICT (fund_code) DO UPDATE SET
       title                 = EXCLUDED.title,
       fund_type             = EXCLUDED.fund_type,
       umbrella_type         = EXCLUDED.umbrella_type,
       management_company_id = EXCLUDED.management_company_id,
       is_byf                = EXCLUDED.is_byf,
       last_seen_at          = now()`,
    [JSON.stringify(payload)],
  );
  return res.rowCount ?? 0;
}

/** Listedeki kodları watchlist'e yazar. Evrende olmayan kod hata verir. */
export async function applyWatchlist(pool: pg.Pool, entries: WatchlistEntry[]): Promise<number> {
  if (entries.length === 0) return 0;
  const codes = entries.map((e) => e.code);
  const known = await pool.query<{ fund_code: string }>(
    'SELECT fund_code FROM dim_fund WHERE fund_code = ANY($1::text[])',
    [codes],
  );
  const knownSet = new Set(known.rows.map((r) => r.fund_code));
  const missing = codes.filter((c) => !knownSet.has(c));
  if (missing.length > 0) {
    throw new Error(`watchlist: fon evreninde bulunamayan kod(lar): ${missing.join(', ')}`);
  }
  const res = await pool.query(
    `INSERT INTO watchlist (fund_code, status)
     SELECT r.fund_code, r.status
     FROM jsonb_to_recordset($1::jsonb) AS r(fund_code text, status text)
     ON CONFLICT (fund_code) DO UPDATE SET status = EXCLUDED.status`,
    [JSON.stringify(entries.map((e) => ({ fund_code: e.code, status: e.status })))],
  );
  return res.rowCount ?? 0;
}

async function main(): Promise<void> {
  const file = process.argv[2] ?? DEFAULT_FILE;
  const entries = parseWatchlistFile(readFileSync(file, 'utf-8'));
  const pool = makePool();
  const client = new FintablesClient();
  try {
    const universe = await client.fundUniverse();
    const codes = entries.map((e) => e.code);
    const missing = codes.filter((c) => !universe.some((f) => f.code === c));
    if (missing.length > 0) {
      throw new Error(`watchlist: fon evreninde bulunamayan kod(lar): ${missing.join(', ')}`);
    }
    const dimRows = await upsertWatchedFunds(pool, universe, codes);
    console.log(`Fon evreni ${universe.length} fon döndü, takip edilen ${dimRows} tanesi yazıldı`);
    const watched = await applyWatchlist(pool, entries);
    console.log(`Takip listesi: ${watched} fon (${file})`);
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
