/**
 * Kullanıcı yönetimi CLI'ı.
 *
 *   pnpm db:user add <kullanıcı> [--admin] [--password <parola>]
 *   pnpm db:user passwd <kullanıcı> [--password <parola>]
 *   pnpm db:user transfer <kaynak> <hedef>
 *
 * Panel üzerinden de kullanıcı açılabiliyor; bu CLI ilk kurulum ve devir için:
 * panele girmeden, uzak sunucuda tek komutla çalışsın diye.
 *
 * `transfer` bir hesabın portföyünü ve takip listesini bir başkasına taşır.
 * Gerekçe: `admin` bir yönetim hesabı, portföy taşımamalı. Sistem tek
 * kullanıcılı başladığı için veriler orada birikti; devir tek seferlik.
 */
import { randomBytes } from 'node:crypto';

import type pg from 'pg';

import { createUser, updateUser } from '../server/repository.js';
import { makePool } from './pool.js';

export interface TransferResult {
  transactions: number;
  watchlist: number;
}

async function userId(db: pg.Pool | pg.PoolClient, username: string): Promise<number> {
  const r = await db.query<{ id: number }>('SELECT id FROM app_user WHERE username = $1', [
    username,
  ]);
  const id = r.rows[0]?.id;
  if (id === undefined) throw new Error(`Kullanıcı bulunamadı: ${username}`);
  return id;
}

/**
 * Kaynağın portföyünü ve takip listesini hedefe taşır. Tek transaction: yarım
 * kalmış bir devir, iki hesaba bölünmüş portföy demek olurdu.
 *
 * Hedefte zaten olan takip satırı atlanır ve kaynaktan yine de silinir; devir
 * sonrası kaynakta satır kalmaz.
 */
export async function transfer(
  pool: pg.Pool,
  fromUser: string,
  toUser: string,
): Promise<TransferResult> {
  if (fromUser === toUser) throw new Error('Kaynak ve hedef aynı kullanıcı.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const from = await userId(client, fromUser);
    const to = await userId(client, toUser);
    const tx = await client.query('UPDATE portfolio_transaction SET user_id = $2 WHERE user_id = $1', [
      from,
      to,
    ]);
    const wl = await client.query(
      `INSERT INTO user_watchlist (user_id, fund_code, added_at, note)
       SELECT $2, fund_code, added_at, note FROM user_watchlist WHERE user_id = $1
       ON CONFLICT (user_id, fund_code) DO NOTHING`,
      [from, to],
    );
    await client.query('DELETE FROM user_watchlist WHERE user_id = $1', [from]);
    await client.query('COMMIT');
    return { transactions: tx.rowCount ?? 0, watchlist: wl.rowCount ?? 0 };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export interface AddArgs {
  username: string;
  type: 'admin' | 'user';
  password: string | null;
}

/**
 * `add <kullanıcı> [--admin] [--password <parola>]`
 *
 * `--password` komut satırına yazıldığı için shell geçmişine düşer; elle
 * kullanımda verilmemesi ve üretilen parolanın kullanılması yeğdir. Seçenek
 * kurulum script'lerinden çağırmak için var.
 */
export function parseAddArgs(argv: string[]): AddArgs {
  let username: string | null = null;
  let type: 'admin' | 'user' = 'user';
  let password: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]!;
    if (a === '--admin') type = 'admin';
    else if (a === '--password') {
      const v = argv[i + 1];
      if (v === undefined) throw new Error('--password bir değer bekler');
      password = v;
      i += 1;
    } else if (a.startsWith('-')) throw new Error(`Bilinmeyen seçenek: ${a}`);
    else if (username === null) username = a;
    else throw new Error(`Fazladan argüman: ${a}`);
  }
  if (username === null) throw new Error('Kullanım: pnpm db:user add <kullanıcı> [--admin]');
  return { username, type, password };
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  const pool = makePool();
  try {
    if (cmd === 'add') {
      const args = parseAddArgs(rest);
      // Parola verilmezse üretilir, bir kez basılır ve ilk girişte
      // değiştirilmesi istenir.
      const password = args.password ?? randomBytes(9).toString('base64url');
      const user = await createUser(pool, {
        username: args.username,
        password,
        type: args.type,
        mustChange: args.password === null,
      });
      console.log(`Kullanıcı oluşturuldu: ${user.username} (${user.type}, id=${String(user.id)})`);
      if (args.password === null) {
        console.log(`Geçici parola: ${password}`);
        console.log('Bu parola bir daha gösterilmez; ilk girişte değiştirilmesi istenecek.');
      }
    } else if (cmd === 'passwd') {
      // Parolasını kimsenin bilmediği bir hesabı kurtarmak için: panele
      // girmeden, sunucuda tek komutla.
      const args = parseAddArgs(rest);
      const password = args.password ?? randomBytes(9).toString('base64url');
      await updateUser(pool, await userId(pool, args.username), { password });
      console.log(`${args.username} parolası değiştirildi.`);
      if (args.password === null) console.log(`Yeni parola: ${password}`);
    } else if (cmd === 'transfer') {
      const [from, to] = rest;
      if (from === undefined || to === undefined) {
        throw new Error('Kullanım: pnpm db:user transfer <kaynak> <hedef>');
      }
      const r = await transfer(pool, from, to);
      console.log(`${from} → ${to}: ${String(r.transactions)} işlem, ${String(r.watchlist)} takip satırı`);
    } else {
      throw new Error(
        'Kullanım:\n' +
          '  pnpm db:user add <kullanıcı> [--admin] [--password <parola>]\n' +
          '  pnpm db:user passwd <kullanıcı> [--password <parola>]\n' +
          '  pnpm db:user transfer <kaynak> <hedef>',
      );
    }
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
