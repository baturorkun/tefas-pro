/**
 * tefas-pro uygulama sunucusu.
 *
 *   pnpm serve
 *
 * Tek Node süreci hem JSON API'yi hem statik dosyaları servis eder. nginx
 * kullanılmaz: iki süreç yerine bir süreç, ve oturum çerezi API ile arayüzün
 * aynı origin'inden gelir.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type pg from 'pg';

import { FintablesClient } from '../sources/fintables.js';
import { makePool } from '../db/pool.js';
import {
  clearCookie,
  generatePassword,
  readCookie,
  sessionCookie,
  verifyPassword,
} from './auth.js';
import {
  asRecord,
  matchPath,
  optDate,
  optString,
  readJson,
  reqDate,
  reqNumber,
  reqString,
  sendJson,
} from './http.js';
import {
  createSession,
  createTransaction,
  createUser,
  deleteTransaction,
  findSessionUser,
  findUserByUsername,
  listTransactions,
  listUsers,
  revokeSession,
  updateTransaction,
  updateUser,
  watchlistOverview,
  type AppUser,
  type TransactionInput,
} from './repository.js';

const COOKIE_NAME = 'tefas_session';
const PORT = Number(process.env.PORT ?? 8282);
/**
 * Dinlenecek adres. Yerelde 127.0.0.1 doğrudur, ama CONTAINER İÇİNDE 127.0.0.1
 * yalnız container'ın kendisini kapsar ve servis dışarıdan erişilemez olur.
 * Container'da 0.0.0.0 verilir; host'a açılan yüzeyi podman'ın port yayını
 * sınırlar (127.0.0.1:PORT olarak yayınlanır).
 */
const HOST = process.env.HOST ?? '127.0.0.1';
const SESSION_TTL = Number(process.env.SESSION_TTL ?? 60 * 60 * 12);
const SECURE_COOKIE = process.env.SECURE_COOKIE === 'true';

/**
 * Statik dosyalar sabit bir eşlemeden servis edilir. İstekten gelen yol dosya
 * sistemine hiç dokunmaz, böylece yol aşımı (`../`) mümkün değildir.
 */
const STATIC: Record<string, { file: string; type: string }> = {
  '/': { file: 'public/index.html', type: 'text/html; charset=utf-8' },
  '/index.html': { file: 'public/index.html', type: 'text/html; charset=utf-8' },
  '/app.js': { file: 'dist/main.js', type: 'text/javascript; charset=utf-8' },
  '/styles.css': { file: 'src/styles.css', type: 'text/css; charset=utf-8' },
};

/**
 * İlk admin. Kullanıcı adı "admin" olması bir ayrıcalık taşımaz; yetkiyi type
 * belirler. Parola ADMIN_INITIAL_PASSWORD'den gelir; verilmemişse rastgele
 * üretilip bir kez log'a yazılır ve ilk girişte değiştirilmesi istenir —
 * koda gömülü sabit bir parola bırakılmaz.
 */
export async function ensureAdminUser(pool: pg.Pool): Promise<void> {
  const existing = await pool.query<{ n: string }>(
    "SELECT count(*) AS n FROM app_user WHERE type = 'admin'",
  );
  if (Number(existing.rows[0]?.n ?? 0) > 0) return;

  const fromEnv = process.env.ADMIN_INITIAL_PASSWORD;
  const password = fromEnv && fromEnv.length >= 8 ? fromEnv : generatePassword();
  await createUser(pool, {
    username: 'admin',
    password,
    type: 'admin',
    mustChange: !fromEnv,
  });
  if (fromEnv) {
    console.log('İlk admin kullanıcısı oluşturuldu (parola ADMIN_INITIAL_PASSWORD ile verildi).');
  } else {
    console.log(`İlk admin kullanıcısı oluşturuldu. Geçici parola: ${password}`);
    console.log('Bu parola bir daha gösterilmez; ilk girişte değiştirilmesi istenecek.');
  }
}

/**
 * Portföye girilen fon takip listesinde yoksa eklenir; böylece bir sonraki
 * collector koşusu o fonun verisini de toplamaya başlar. Kod fintables
 * evreninde yoksa istek reddedilir.
 */
async function ensureFundTracked(
  pool: pg.Pool,
  client: FintablesClient,
  fundCode: string,
): Promise<void> {
  const known = await pool.query('SELECT 1 FROM dim_fund WHERE fund_code = $1', [fundCode]);
  if ((known.rowCount ?? 0) > 0) {
    await pool.query(
      `INSERT INTO watchlist (fund_code, status) VALUES ($1, 'owned')
       ON CONFLICT (fund_code) DO NOTHING`,
      [fundCode],
    );
    return;
  }
  const universe = await client.fundUniverse();
  const fund = universe.find((f) => f.code === fundCode);
  if (!fund) throw new Error(`Fon kodu bulunamadı: ${fundCode}`);
  await pool.query(
    `INSERT INTO dim_fund (fund_code, title, fund_type, umbrella_type, management_company_id, is_byf)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (fund_code) DO NOTHING`,
    [fund.code, fund.title, fund.fundType, fund.umbrellaType, fund.managementCompanyId, fund.isByf],
  );
  await pool.query(
    `INSERT INTO watchlist (fund_code, status) VALUES ($1, 'owned')
     ON CONFLICT (fund_code) DO NOTHING`,
    [fundCode],
  );
}

function readTransactionInput(body: Record<string, unknown>): TransactionInput {
  const units = reqNumber(body, 'units');
  if (units <= 0) throw new Error('`units` sıfırdan büyük olmalıdır.');
  const tradeDate = reqDate(body, 'tradeDate');
  const sellDate = optDate(body, 'sellDate');
  if (sellDate !== null && sellDate < tradeDate) {
    throw new Error('Satış tarihi alış tarihinden önce olamaz.');
  }
  return {
    fundCode: reqString(body, 'fundCode').toUpperCase(),
    platform: reqString(body, 'platform'),
    tradeDate,
    units,
    sellDate,
    note: optString(body, 'note'),
  };
}

function serveStatic(res: ServerResponse, path: string): boolean {
  const entry = STATIC[path];
  if (!entry) return false;
  try {
    const body = readFileSync(join(process.cwd(), entry.file));
    res.writeHead(200, {
      'Content-Type': entry.type,
      'Content-Length': body.length,
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
  return true;
}

export function createApp(pool: pg.Pool, client: FintablesClient) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname;
    const method = req.method ?? 'GET';

    if (path === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok\n');
      return;
    }

    if (!path.startsWith('/api/')) {
      if (serveStatic(res, path)) return;
      res.writeHead(404).end('not found');
      return;
    }

    const sessionId = readCookie(req.headers.cookie, COOKIE_NAME);
    const user: AppUser | null = sessionId ? await findSessionUser(pool, sessionId) : null;

    try {
      // ─── Kimlik doğrulaması gerektirmeyen uçlar ───
      if (path === '/api/login' && method === 'POST') {
        const body = asRecord(await readJson(req));
        const username = reqString(body, 'username');
        const password = reqString(body, 'password');
        const found = await findUserByUsername(pool, username);
        const ok =
          found !== null &&
          found.isActive &&
          (await verifyPassword(password, {
            hash: found.password_hash,
            salt: found.password_salt,
          }));
        if (!found || !ok) {
          // Tek mesaj: kullanıcının var olup olmadığı sızdırılmaz.
          sendJson(res, 401, { error: 'Kullanıcı adı veya parola hatalı.' });
          return;
        }
        const sid = await createSession(pool, found.id, SESSION_TTL);
        sendJson(
          res,
          200,
          {
            id: found.id,
            username: found.username,
            type: found.type,
            mustChangePassword: found.mustChangePassword,
          },
          {
            'Set-Cookie': sessionCookie(COOKIE_NAME, sid, {
              secure: SECURE_COOKIE,
              maxAgeSeconds: SESSION_TTL,
            }),
          },
        );
        return;
      }

      if (path === '/api/me' && method === 'GET') {
        if (!user) {
          sendJson(res, 401, { error: 'Oturum yok.' });
          return;
        }
        sendJson(res, 200, user);
        return;
      }

      if (path === '/api/logout' && method === 'POST') {
        if (sessionId) await revokeSession(pool, sessionId);
        sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearCookie(COOKIE_NAME) });
        return;
      }

      // ─── Buradan sonrası oturum ister ───
      if (!user) {
        sendJson(res, 401, { error: 'Oturum gerekli.' });
        return;
      }

      if (path === '/api/password' && method === 'POST') {
        const body = asRecord(await readJson(req));
        await updateUser(pool, user.id, { password: reqString(body, 'password') });
        sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearCookie(COOKIE_NAME) });
        return;
      }

      if (path === '/api/transactions' && method === 'GET') {
        sendJson(res, 200, await listTransactions(pool, user.id));
        return;
      }

      if (path === '/api/transactions' && method === 'POST') {
        const input = readTransactionInput(asRecord(await readJson(req)));
        await ensureFundTracked(pool, client, input.fundCode);
        sendJson(res, 201, await createTransaction(pool, user.id, input));
        return;
      }

      const txId = matchPath('/api/transactions/:id', path);
      if (txId !== null) {
        const id = Number(txId);
        if (!Number.isInteger(id)) {
          sendJson(res, 400, { error: 'Geçersiz kimlik.' });
          return;
        }
        if (method === 'PUT') {
          const input = readTransactionInput(asRecord(await readJson(req)));
          await ensureFundTracked(pool, client, input.fundCode);
          const updated = await updateTransaction(pool, user.id, id, input);
          if (!updated) {
            sendJson(res, 404, { error: 'İşlem bulunamadı.' });
            return;
          }
          sendJson(res, 200, updated);
          return;
        }
        if (method === 'DELETE') {
          const done = await deleteTransaction(pool, user.id, id);
          sendJson(res, done ? 200 : 404, done ? { ok: true } : { error: 'İşlem bulunamadı.' });
          return;
        }
      }

      // ─── Admin uçları ───
      if (path.startsWith('/api/admin/')) {
        if (user.type !== 'admin') {
          sendJson(res, 403, { error: 'Bu işlem için admin yetkisi gerekir.' });
          return;
        }
        if (path === '/api/admin/watchlist' && method === 'GET') {
          sendJson(res, 200, await watchlistOverview(pool));
          return;
        }
        if (path === '/api/admin/users' && method === 'GET') {
          sendJson(res, 200, await listUsers(pool));
          return;
        }
        if (path === '/api/admin/users' && method === 'POST') {
          const body = asRecord(await readJson(req));
          const type = body['type'] === 'admin' ? 'admin' : 'user';
          sendJson(
            res,
            201,
            await createUser(pool, {
              username: reqString(body, 'username'),
              password: reqString(body, 'password'),
              type,
            }),
          );
          return;
        }
        const userId = matchPath('/api/admin/users/:id', path);
        if (userId !== null && method === 'PATCH') {
          const body = asRecord(await readJson(req));
          const patch: { type?: 'admin' | 'user'; isActive?: boolean; password?: string } = {};
          if (body['type'] !== undefined) patch.type = body['type'] === 'admin' ? 'admin' : 'user';
          if (body['isActive'] !== undefined) patch.isActive = body['isActive'] === true;
          if (body['password'] !== undefined) patch.password = reqString(body, 'password');
          sendJson(res, 200, await updateUser(pool, Number(userId), patch));
          return;
        }
      }

      sendJson(res, 404, { error: 'Bulunamadı.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Beklenmeyen hata.';
      sendJson(res, 400, { error: message });
    }
  };
}

async function main(): Promise<void> {
  const pool = makePool();
  await ensureAdminUser(pool);
  const server = createServer((req, res) => {
    void createApp(pool, new FintablesClient())(req, res);
  });
  server.listen(PORT, HOST, () => {
    console.log(`tefas-pro sunucusu hazır: http://${HOST}:${String(PORT)}`);
  });
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  });
}
