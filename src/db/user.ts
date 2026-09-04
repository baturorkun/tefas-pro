/**
 * Kullanıcı yönetimi CLI'ı.
 *
 *   pnpm db:user add <kullanıcı> [--admin] [--password <parola>]
 *   pnpm db:user passwd <kullanıcı> [--password <parola>]
 *   pnpm db:user transfer <kaynak> <hedef>
 *   pnpm db:user clone <kaynak> <hedef> [--password <parola>]
 *   pnpm db:user drop <kullanıcı> --yes
 *
 * Panel üzerinden de kullanıcı açılabiliyor; bu CLI ilk kurulum ve devir için:
 * panele girmeden, uzak sunucuda tek komutla çalışsın diye.
 *
 * `clone` bir hesabın portföyünü, takip listesini ve tercihlerini yeni bir
 * hesaba kopyalar; kaynak hesap olduğu gibi kalır. Test için: gerçek bir
 * portföyün aynısını başkasına verip kendi verine dokundurmamak.
 *
 * `drop` bir hesabı verisiyle birlikte siler. `clone`'un karşılığı: test
 * hesabını elle temizlemek yedi ayrı SQL ifadesi gerektiriyordu ve sırayı
 * yanlış yapmak foreign key'e takılıyordu.
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

export interface CloneResult {
  userId: number;
  password: string | null;
  transactions: number;
  watchlist: number;
  settings: number;
}

/**
 * Bir hesabın verisini yeni bir hesaba kopyalar.
 *
 * `transfer`'den farkı kaynağın olduğu gibi kalması. Kullanım amacı test:
 * gerçek bir portföyün aynısını başka birine verip kendi verine
 * dokundurmamak.
 *
 * `app_session` kopyalanmaz — oturum kişiye ait, kopyalanırsa yeni hesap
 * kaynağın açık oturumunu devralırdı.
 *
 * Bölünmüş kayıtların birbirine referansı yeniden eşlenir: kopyalar yeni id
 * alıyor ve `split_from_id` eski id'yi gösteriyor. Eşleme yapılmasaydı kopya
 * ya kaynağın satırını gösterirdi — iki hesabın verisi birbirine karışırdı —
 * ya da foreign key'e takılırdı.
 */
export async function clone(
  pool: pg.Pool,
  fromUser: string,
  toUser: string,
  password: string | null,
): Promise<CloneResult> {
  if (fromUser === toUser) throw new Error('Kaynak ve hedef aynı kullanıcı.');
  const from = await userId(pool, fromUser);

  const varMi = await pool.query('SELECT 1 FROM app_user WHERE username = $1', [toUser]);
  if (varMi.rowCount) throw new Error(`${toUser} zaten var. Önce silin ya da başka ad seçin.`);

  // Kullanıcı kendi transaction'ının dışında açılır: createUser parolayı
  // hash'liyor ve kendi bağlantısını kullanıyor. Kopyalama sonrasında hata
  // çıkarsa hesap boş kalır — verisi yarım bir hesaptan iyidir.
  const uretilen = password ?? randomBytes(9).toString('base64url');
  const yeni = await createUser(pool, {
    username: toUser,
    password: uretilen,
    type: 'user',
    mustChange: false,
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // İki geçiş: önce satırlar, sonra referanslar. Tek geçişte yapılamaz
    // çünkü bir satır kendinden sonra eklenecek bir satıra bakabilir.
    const kaynak = await client.query<{ id: number }>(
      'SELECT id FROM portfolio_transaction WHERE user_id = $1 ORDER BY id',
      [from],
    );
    const esleme = new Map<number, number>();
    for (const satir of kaynak.rows) {
      const r = await client.query<{ id: number }>(
        `INSERT INTO portfolio_transaction
           (user_id, fund_code, platform, trade_date, units, sell_date, note,
            buy_order_date, sell_order_date)
         SELECT $2, fund_code, platform, trade_date, units, sell_date, note,
                buy_order_date, sell_order_date
         FROM portfolio_transaction WHERE id = $1
         RETURNING id`,
        [satir.id, yeni.id],
      );
      const yeniId = r.rows[0]?.id;
      if (yeniId === undefined) throw new Error(`İşlem ${String(satir.id)} kopyalanamadı.`);
      esleme.set(satir.id, yeniId);
    }
    for (const [eski, yeniId] of esleme) {
      const r = await client.query<{ split_from_id: number | null }>(
        'SELECT split_from_id FROM portfolio_transaction WHERE id = $1',
        [eski],
      );
      const kok = r.rows[0]?.split_from_id ?? null;
      if (kok === null) continue;
      const kokKopya = esleme.get(kok);
      if (kokKopya === undefined) {
        throw new Error(`İşlem ${String(eski)} kopyalanmayan ${String(kok)} kaydına bağlı.`);
      }
      await client.query('UPDATE portfolio_transaction SET split_from_id = $2 WHERE id = $1', [
        yeniId, kokKopya,
      ]);
    }

    const wl = await client.query(
      `INSERT INTO user_watchlist (user_id, fund_code, added_at, note)
       SELECT $2, fund_code, added_at, note FROM user_watchlist WHERE user_id = $1`,
      [from, yeni.id],
    );
    const st = await client.query(
      `INSERT INTO user_setting (user_id, key, value)
       SELECT $2, key, value FROM user_setting WHERE user_id = $1`,
      [from, yeni.id],
    );
    await client.query('COMMIT');
    return {
      userId: yeni.id,
      password: password === null ? uretilen : null,
      transactions: esleme.size,
      watchlist: wl.rowCount ?? 0,
      settings: st.rowCount ?? 0,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export interface DropResult {
  transactions: number;
  watchlist: number;
  settings: number;
  sessions: number;
}

/**
 * Bir hesabı verisiyle birlikte siler.
 *
 * Sıra foreign key'lere göre: önce hesaba bağlı satırlar, sonra hesap.
 * İşlemler kendi aralarında da bağlı (`split_from_id`), o yüzden silmeden
 * önce referans boşaltılıyor — aksi halde bölünmüş bir parçayı silmek
 * kardeşine takılırdı.
 *
 * Hepsi tek transaction: yarım silinmiş bir hesap, silinmemişten kötüdür.
 */
export async function drop(pool: pg.Pool, username: string): Promise<DropResult> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const id = await userId(client, username);

    // Son yönetici silinemez: paneli açacak kimse kalmazdı ve hesabı geri
    // getirmenin tek yolu sunucuda CLI çalıştırmak olurdu.
    const yonetici = await client.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM app_user WHERE type = 'admin' AND id <> $1",
      [id],
    );
    const bu = await client.query<{ type: string }>('SELECT type FROM app_user WHERE id = $1', [id]);
    if (bu.rows[0]?.type === 'admin' && (yonetici.rows[0]?.n ?? '0') === '0') {
      throw new Error(`${username} son yönetici; silinemez.`);
    }

    const ses = await client.query('DELETE FROM app_session WHERE user_id = $1', [id]);
    const st = await client.query('DELETE FROM user_setting WHERE user_id = $1', [id]);
    const wl = await client.query('DELETE FROM user_watchlist WHERE user_id = $1', [id]);
    await client.query(
      'UPDATE portfolio_transaction SET split_from_id = NULL WHERE user_id = $1',
      [id],
    );
    const tx = await client.query('DELETE FROM portfolio_transaction WHERE user_id = $1', [id]);
    await client.query('DELETE FROM app_user WHERE id = $1', [id]);
    await client.query('COMMIT');
    return {
      transactions: tx.rowCount ?? 0,
      watchlist: wl.rowCount ?? 0,
      settings: st.rowCount ?? 0,
      sessions: ses.rowCount ?? 0,
    };
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

export interface CloneArgs {
  from: string;
  to: string;
  password: string | null;
}

export function parseCloneArgs(argv: string[]): CloneArgs {
  const adlar: string[] = [];
  let password: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]!;
    if (a === '--password') {
      const v = argv[i + 1];
      if (v === undefined) throw new Error('--password bir değer bekler');
      password = v;
      i += 1;
    } else if (a.startsWith('-')) throw new Error(`Bilinmeyen seçenek: ${a}`);
    else adlar.push(a);
  }
  const [from, to] = adlar;
  if (from === undefined || to === undefined || adlar.length > 2) {
    throw new Error('Kullanım: pnpm db:user clone <kaynak> <hedef> [--password <parola>]');
  }
  return { from, to, password };
}

/**
 * Kullanım metninde gösterilecek çağrı biçimi.
 *
 * Üretim imajında tsx yok — migration'lar gibi bu da `node dist/db/user.js`
 * diye çalışıyor. Metin her zaman "pnpm db:user" deseydi sunucuda çalışmayan
 * bir satır okutur, hata da "komut bulunamadı" olurdu; asıl sorunla ilgisi
 * olmayan bir yere bakılırdı.
 */
function nasilCagrildi(): string {
  return process.argv[1]?.endsWith('.js') === true ? 'node dist/db/user.js' : 'pnpm db:user';
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  const nasil = nasilCagrildi();
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
    } else if (cmd === 'clone') {
      const args = parseCloneArgs(rest);
      const r = await clone(pool, args.from, args.to, args.password);
      console.log(
        `${args.from} → ${args.to} kopyalandı (id=${String(r.userId)}): `
        + `${String(r.transactions)} işlem, ${String(r.watchlist)} takip satırı, `
        + `${String(r.settings)} tercih`,
      );
      if (r.password !== null) {
        console.log(`Parola: ${r.password}`);
        console.log('Bu parola bir daha gösterilmez.');
      }
      console.log(`Kaynak hesap ${args.from} değişmedi.`);
    } else if (cmd === 'drop') {
      const [username, ...bayraklar] = rest;
      // --yes olmadan çalışmaz: geri alınamayan bir silme, yanlış yazılmış bir
      // kullanıcı adıyla tek Enter'a bakmamalı.
      if (username === undefined || !bayraklar.includes('--yes')) {
        throw new Error(`Kullanım: ${nasil} drop <kullanıcı> --yes`);
      }
      const r = await drop(pool, username);
      console.log(
        `${username} silindi: ${String(r.transactions)} işlem, `
        + `${String(r.watchlist)} takip satırı, ${String(r.settings)} tercih, `
        + `${String(r.sessions)} oturum`,
      );
    } else if (cmd === 'transfer') {
      const [from, to] = rest;
      if (from === undefined || to === undefined) {
        throw new Error(`Kullanım: ${nasil} transfer <kaynak> <hedef>`);
      }
      const r = await transfer(pool, from, to);
      console.log(`${from} → ${to}: ${String(r.transactions)} işlem, ${String(r.watchlist)} takip satırı`);
    } else {
      throw new Error(
        'Kullanım:\n' +
          `  ${nasil} add <kullanıcı> [--admin] [--password <parola>]\n` +
          `  ${nasil} passwd <kullanıcı> [--password <parola>]\n` +
          `  ${nasil} clone <kaynak> <hedef> [--password <parola>]\n` +
          `  ${nasil} drop <kullanıcı> --yes\n` +
          `  ${nasil} transfer <kaynak> <hedef>`,
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
