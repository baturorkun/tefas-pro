/**
 * Bir kullanıcının takip listesini besler.
 *
 *   pnpm db:seed <kullanıcı> [dosya]      (varsayılan dosya: db/watchlist.txt)
 *
 * Önce fon evrenini fintables'tan çekip dim_fund'a yazar — user_watchlist ona
 * foreign key ile bağlı. Sonra dosyadaki kodları o kullanıcının listesine
 * uygular. Idempotent: tekrar çalıştırmak satır sayısını değiştirmez.
 *
 * Kullanıcı adı zorunlu: takip listesi artık kullanıcıya ait, "sistemin
 * listesi" diye bir şey yok.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type pg from 'pg';

import { FintablesClient, type FundUniverseRow } from '../sources/fintables.js';
import { makePool } from './pool.js';

const DEFAULT_FILE = join(process.cwd(), 'db', 'watchlist.txt');

/**
 * Satır başına bir fon kodu; yorum ve boş satırlar atlanır.
 *
 * Eskiden satırda `owned|watching` de olabiliyordu. Durum artık saklanmıyor,
 * kullanıcının işlemlerinden türetiliyor — dosyada kalmış bir durum sözcüğü
 * sessizce yok sayılmak yerine hata verir, yoksa kullanıcı yazdığı şeyin
 * uygulandığını sanır.
 */
export function parseWatchlistFile(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length > 1) {
      throw new Error(
        `watchlist: satırda yalnız fon kodu olmalı, durum sütunu kaldırıldı (satır: ${trimmed})`,
      );
    }
    out.push(parts[0]!.toUpperCase());
  }
  return out;
}

/**
 * Fon evreninden YALNIZ verilen kodları dim_fund'a yazar.
 *
 * Toplu endpoint'ler 2822 fonluk evrenin tamamını döndürür; veritabanı takip
 * edilen fonlarla sınırlı tutulur. Takip listesine yeni fon eklenirken kod/unvan
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

/** Listedeki kodları kullanıcının listesine yazar. Evrende olmayan kod hata verir. */
export async function applyWatchlist(
  pool: pg.Pool,
  userId: number,
  codes: string[],
): Promise<number> {
  if (codes.length === 0) return 0;
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
    `INSERT INTO user_watchlist (user_id, fund_code)
     SELECT $2, unnest($1::text[])
     ON CONFLICT (user_id, fund_code) DO NOTHING`,
    [codes, userId],
  );
  return res.rowCount ?? 0;
}

async function main(): Promise<void> {
  const username = process.argv[2];
  if (username === undefined || username.startsWith('-')) {
    throw new Error('Kullanım: pnpm db:seed <kullanıcı> [dosya]');
  }
  const file = process.argv[3] ?? DEFAULT_FILE;
  const codes = parseWatchlistFile(readFileSync(file, 'utf-8'));
  const pool = makePool();
  const client = new FintablesClient();
  try {
    const user = await pool.query<{ id: number }>(
      'SELECT id FROM app_user WHERE username = $1',
      [username],
    );
    const userId = user.rows[0]?.id;
    if (userId === undefined) throw new Error(`Kullanıcı bulunamadı: ${username}`);
    const universe = await client.fundUniverse();
    const missing = codes.filter((c) => !universe.some((f) => f.code === c));
    if (missing.length > 0) {
      throw new Error(`watchlist: fon evreninde bulunamayan kod(lar): ${missing.join(', ')}`);
    }
    const dimRows = await upsertWatchedFunds(pool, universe, codes);
    console.log(`Fon evreni ${universe.length} fon döndü, takip edilen ${dimRows} tanesi yazıldı`);
    const watched = await applyWatchlist(pool, userId, codes);
    console.log(`${username} takip listesi: ${watched} yeni fon (${file})`);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err: unknown) => {
    // Yalnız mesaj: bunlar kullanıcı hatası (eksik argüman, bilinmeyen fon
    // kodu), stack trace onları asıl satırın içinde kaybediyordu.
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
