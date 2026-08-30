/**
 * Minimal migration runner. ORM yok: db/migrations/NNN_*.sql dosyalarını isim
 * sırasıyla, her birini tek transaction içinde uygular ve schema_migrations'a
 * kaydeder. Uygulanmış olanı atlar, yani tekrar çalıştırmak güvenlidir.
 *
 *   pnpm db:migrate
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type pg from 'pg';

import { makePool } from './pool.js';

const MIGRATIONS_DIR = join(process.cwd(), 'db', 'migrations');

export async function migrate(pool: pg.Pool, dir: string = MIGRATIONS_DIR): Promise<string[]> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);

  const appliedRows = await pool.query<{ filename: string }>(
    'SELECT filename FROM schema_migrations',
  );
  const applied = new Set(appliedRows.rows.map((r) => r.filename));

  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql') && !f.startsWith('.'))
    .sort();

  const newlyApplied: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(dir, file), 'utf-8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      newlyApplied.push(file);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Migration başarısız: ${file}\n${String(err)}`);
    } finally {
      client.release();
    }
  }
  return newlyApplied;
}

async function main(): Promise<void> {
  const pool = makePool();
  try {
    const applied = await migrate(pool);
    if (applied.length === 0) {
      console.log('Migration yok — şema güncel.');
    } else {
      console.log(`Uygulanan migration'lar:\n${applied.map((f) => `  ✓ ${f}`).join('\n')}`);
    }
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
