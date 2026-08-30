/**
 * Veritabanı erişimi. SQL burada toplanır; HTTP katmanı sorgu yazmaz.
 */
import type pg from 'pg';

import { hashPassword, newSessionId } from './auth.js';

export interface AppUser {
  id: number;
  username: string;
  type: 'admin' | 'user';
  isActive: boolean;
  mustChangePassword: boolean;
}

interface UserRow extends AppUser {
  password_hash: string;
  password_salt: string;
}

const USER_COLUMNS = `id, username, type, is_active AS "isActive",
                      must_change_password AS "mustChangePassword"`;

export async function findUserByUsername(
  pool: pg.Pool,
  username: string,
): Promise<UserRow | null> {
  const r = await pool.query<UserRow>(
    `SELECT ${USER_COLUMNS}, password_hash, password_salt
     FROM app_user WHERE lower(username) = lower($1)`,
    [username],
  );
  return r.rows[0] ?? null;
}

export async function listUsers(pool: pg.Pool): Promise<AppUser[]> {
  const r = await pool.query<AppUser>(
    `SELECT ${USER_COLUMNS} FROM app_user ORDER BY lower(username)`,
  );
  return r.rows;
}

export async function createUser(
  pool: pg.Pool,
  input: { username: string; password: string; type: 'admin' | 'user'; mustChange?: boolean },
): Promise<AppUser> {
  const username = input.username.trim();
  if (username === '') throw new Error('Kullanıcı adı boş olamaz.');
  const { hash, salt } = await hashPassword(input.password);
  const r = await pool.query<AppUser>(
    `INSERT INTO app_user (username, password_hash, password_salt, type, must_change_password)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${USER_COLUMNS}`,
    [username, hash, salt, input.type, input.mustChange ?? false],
  );
  return r.rows[0]!;
}

/** Sistem yöneticisiz kalmasın: son admin'in tipi düşürülemez, pasife alınamaz. */
async function assertNotLastAdmin(pool: pg.Pool, userId: number): Promise<void> {
  const r = await pool.query<{ n: string }>(
    `SELECT count(*) AS n FROM app_user
     WHERE type = 'admin' AND is_active AND id <> $1`,
    [userId],
  );
  if (Number(r.rows[0]?.n ?? 0) === 0) {
    throw new Error('Son admin kullanıcısının tipi düşürülemez veya pasife alınamaz.');
  }
}

export async function updateUser(
  pool: pg.Pool,
  id: number,
  patch: { type?: 'admin' | 'user'; isActive?: boolean; password?: string },
): Promise<AppUser> {
  const current = await pool.query<{ type: string; is_active: boolean }>(
    'SELECT type, is_active FROM app_user WHERE id = $1',
    [id],
  );
  const row = current.rows[0];
  if (!row) throw new Error('Kullanıcı bulunamadı.');

  const losesAdmin = row.type === 'admin' && patch.type !== undefined && patch.type !== 'admin';
  const losesActive = row.is_active && patch.isActive === false && row.type === 'admin';
  if (losesAdmin || losesActive) await assertNotLastAdmin(pool, id);

  let hash: string | null = null;
  let salt: string | null = null;
  if (patch.password !== undefined) {
    const h = await hashPassword(patch.password);
    hash = h.hash;
    salt = h.salt;
  }
  const r = await pool.query<AppUser>(
    `UPDATE app_user SET
       type                 = COALESCE($2, type),
       is_active            = COALESCE($3, is_active),
       password_hash        = COALESCE($4, password_hash),
       password_salt        = COALESCE($5, password_salt),
       must_change_password = CASE WHEN $4 IS NULL THEN must_change_password ELSE false END,
       updated_at           = now()
     WHERE id = $1
     RETURNING ${USER_COLUMNS}`,
    [id, patch.type ?? null, patch.isActive ?? null, hash, salt],
  );
  // Parola değişti veya hesap kapandı: açık oturumlar geçersiz kılınır.
  if (hash !== null || patch.isActive === false) await revokeUserSessions(pool, id);
  return r.rows[0]!;
}

// ─── Oturum ─────────────────────────────────────────────────────────────────

export async function createSession(
  pool: pg.Pool,
  userId: number,
  ttlSeconds: number,
): Promise<string> {
  const id = newSessionId();
  await pool.query(
    `INSERT INTO app_session (id, user_id, expires_at)
     VALUES ($1, $2, now() + make_interval(secs => $3))`,
    [id, userId, ttlSeconds],
  );
  return id;
}

/** Süresi geçmiş, iptal edilmiş veya pasif kullanıcıya ait oturum kabul edilmez. */
export async function findSessionUser(pool: pg.Pool, sessionId: string): Promise<AppUser | null> {
  const r = await pool.query<AppUser>(
    `SELECT u.id, u.username, u.type, u.is_active AS "isActive",
            u.must_change_password AS "mustChangePassword"
     FROM app_session s JOIN app_user u ON u.id = s.user_id
     WHERE s.id = $1 AND s.revoked_at IS NULL AND s.expires_at > now() AND u.is_active`,
    [sessionId],
  );
  return r.rows[0] ?? null;
}

export async function revokeSession(pool: pg.Pool, sessionId: string): Promise<void> {
  await pool.query(
    'UPDATE app_session SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL',
    [sessionId],
  );
}

export async function revokeUserSessions(pool: pg.Pool, userId: number): Promise<void> {
  await pool.query(
    'UPDATE app_session SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId],
  );
}

// ─── Portföy ────────────────────────────────────────────────────────────────

export interface Transaction {
  id: number;
  fundCode: string;
  fundTitle: string | null;
  platform: string;
  tradeDate: string;
  units: string;
  sellDate: string | null;
  note: string | null;
}

const TX_COLUMNS = `t.id, t.fund_code AS "fundCode", f.title AS "fundTitle",
                    t.platform, to_char(t.trade_date, 'YYYY-MM-DD') AS "tradeDate",
                    t.units::text AS units,
                    to_char(t.sell_date, 'YYYY-MM-DD') AS "sellDate", t.note`;

export async function listTransactions(pool: pg.Pool, userId: number): Promise<Transaction[]> {
  const r = await pool.query<Transaction>(
    `SELECT ${TX_COLUMNS} FROM portfolio_transaction t
     LEFT JOIN dim_fund f USING (fund_code)
     WHERE t.user_id = $1
     ORDER BY t.trade_date DESC, t.id DESC`,
    [userId],
  );
  return r.rows;
}

export interface TransactionInput {
  fundCode: string;
  platform: string;
  tradeDate: string;
  units: number;
  sellDate: string | null;
  note: string | null;
}

export async function createTransaction(
  pool: pg.Pool,
  userId: number,
  input: TransactionInput,
): Promise<Transaction> {
  const r = await pool.query<{ id: number }>(
    `INSERT INTO portfolio_transaction (user_id, fund_code, platform, trade_date, units, sell_date, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      userId,
      input.fundCode,
      input.platform,
      input.tradeDate,
      input.units,
      input.sellDate,
      input.note,
    ],
  );
  return (await getTransaction(pool, userId, r.rows[0]!.id))!;
}

export async function getTransaction(
  pool: pg.Pool,
  userId: number,
  id: number,
): Promise<Transaction | null> {
  const r = await pool.query<Transaction>(
    `SELECT ${TX_COLUMNS} FROM portfolio_transaction t
     LEFT JOIN dim_fund f USING (fund_code)
     WHERE t.user_id = $1 AND t.id = $2`,
    [userId, id],
  );
  return r.rows[0] ?? null;
}

/**
 * Sahiplik WHERE'in içindedir: başka kullanıcının satırı hiç eşleşmez, yani
 * "önce oku sonra kontrol et" adımı atlanamaz ve yarış durumu oluşmaz.
 */
export async function updateTransaction(
  pool: pg.Pool,
  userId: number,
  id: number,
  input: TransactionInput,
): Promise<Transaction | null> {
  const r = await pool.query(
    `UPDATE portfolio_transaction SET
       fund_code = $3, platform = $4, trade_date = $5, units = $6,
       sell_date = $7, note = $8, updated_at = now()
     WHERE user_id = $1 AND id = $2`,
    [
      userId,
      id,
      input.fundCode,
      input.platform,
      input.tradeDate,
      input.units,
      input.sellDate,
      input.note,
    ],
  );
  if (r.rowCount === 0) return null;
  return getTransaction(pool, userId, id);
}

export async function deleteTransaction(
  pool: pg.Pool,
  userId: number,
  id: number,
): Promise<boolean> {
  const r = await pool.query('DELETE FROM portfolio_transaction WHERE user_id = $1 AND id = $2', [
    userId,
    id,
  ]);
  return (r.rowCount ?? 0) > 0;
}

/** Admin ekranı için takip listesi özeti. */
export async function watchlistOverview(pool: pg.Pool): Promise<unknown[]> {
  const r = await pool.query(
    // date sütunları to_char ile biçimlenir: pg sürücüsü date'i JS Date'e
    // çevirir ve JSON'a "2026-08-31T00:00:00.000Z" olarak serileşir.
    `SELECT fund_code AS "fundCode", status, title,
            to_char(nav_date, 'YYYY-MM-DD') AS "navDate",
            nav_per_share::text AS "navPerShare",
            round(daily_return_pct, 4)::text AS "dailyReturnPct",
            round(net_flow)::text AS "netFlow",
            tax_pct::text AS "taxPct", sell_valor_days AS "sellValorDays"
     FROM analytics.watchlist_latest ORDER BY fund_code`,
  );
  return r.rows;
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export interface RankEntry {
  fundCode: string;
  title: string | null;
  returnPct: string;
  /** Yalnız takip listesi sıralamasında dolu: pencerede kaç iş günü var. */
  days: number | null;
}

export interface DashboardData {
  metrics: {
    watchlist: number;
    openPositions: number;
    dataDate: string | null;
    lastRun: { id: number; status: string; finishedAt: string | null } | null;
  };
  watchlistRanks: Record<string, { top: RankEntry[]; bottom: RankEntry[] }>;
  universeRanks: Record<string, { top: RankEntry[]; bottom: RankEntry[] }>;
  universeDate: string | null;
}

const RANK_LIMIT = 10;

/**
 * Takip listesi sıralaması saklanan günlük seriden hesaplanır; sayfa açılışında
 * dış servise istek atılmaz. Evren sıralaması collector'ın günlük snapshot'ından
 * okunur.
 */
export async function dashboard(pool: pg.Pool, userId: number): Promise<DashboardData> {
  const [counts, lastRun, wl, uni, uniDate] = await Promise.all([
    pool.query<{ watchlist: string; open_positions: string; data_date: string | null }>(
      `SELECT (SELECT count(*) FROM watchlist) AS watchlist,
              (SELECT count(*) FROM portfolio_transaction
                WHERE user_id = $1 AND sell_date IS NULL) AS open_positions,
              (SELECT to_char(max(trade_date), 'YYYY-MM-DD') FROM fact_fund_daily
                WHERE daily_return_pct IS NOT NULL) AS data_date`,
      [userId],
    ),
    pool.query<{ id: number; status: string; finished_at: string | null }>(
      `SELECT id, status, to_char(finished_at AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI')
                AS finished_at
       FROM ingest_run ORDER BY id DESC LIMIT 1`,
    ),
    pool.query<{
      fund_code: string; title: string | null;
      return_1w: string | null; days_1w: string; return_1m: string | null; days_1m: string;
    }>(
      `SELECT fund_code, title, return_1w::text, days_1w::text, return_1m::text, days_1m::text
       FROM analytics.watchlist_returns`,
    ),
    pool.query<{
      window_key: string; direction: string; fund_code: string;
      title: string | null; return_pct: string;
    }>(
      `SELECT window_key, direction, fund_code, title, return_pct::text
       FROM fact_universe_yield_rank
       WHERE as_of_date = (SELECT max(as_of_date) FROM fact_universe_yield_rank)
       ORDER BY window_key, direction, rank`,
    ),
    pool.query<{ d: string | null }>(
      `SELECT to_char(max(as_of_date), 'YYYY-MM-DD') AS d FROM fact_universe_yield_rank`,
    ),
  ]);

  const byWindow = (win: '1w' | '1m'): { top: RankEntry[]; bottom: RankEntry[] } => {
    const rows = wl.rows
      .map((r) => ({
        fundCode: r.fund_code,
        title: r.title,
        returnPct: win === '1w' ? r.return_1w : r.return_1m,
        days: Number(win === '1w' ? r.days_1w : r.days_1m),
      }))
      .filter((r) => r.returnPct !== null)
      .map((r): RankEntry => ({ ...r, returnPct: r.returnPct as string }))
      .sort((a, b) => Number(b.returnPct) - Number(a.returnPct));
    // "En çok kaybettiren" yalnız gerçekten kaybettirenleri listeler. Alttan N
    // almak yanlış olurdu: takip listesi küçük ve çoğu fon artıdayken panel
    // pozitif değerlerle dolar, başlığı yalanlar.
    const losers = rows.filter((r) => Number(r.returnPct) < 0);
    return {
      top: rows.slice(0, RANK_LIMIT),
      bottom: losers.slice(-RANK_LIMIT).reverse(),
    };
  };

  const universe: Record<string, { top: RankEntry[]; bottom: RankEntry[] }> = {};
  for (const r of uni.rows) {
    const slot = (universe[r.window_key] ??= { top: [], bottom: [] });
    const list = r.direction === 'top' ? slot.top : slot.bottom;
    if (list.length < RANK_LIMIT) {
      list.push({ fundCode: r.fund_code, title: r.title, returnPct: r.return_pct, days: null });
    }
  }

  const c = counts.rows[0]!;
  const run = lastRun.rows[0];
  return {
    metrics: {
      watchlist: Number(c.watchlist),
      openPositions: Number(c.open_positions),
      dataDate: c.data_date,
      lastRun: run ? { id: run.id, status: run.status, finishedAt: run.finished_at } : null,
    },
    watchlistRanks: { '1w': byWindow('1w'), '1m': byWindow('1m') },
    universeRanks: universe,
    universeDate: uniDate.rows[0]?.d ?? null,
  };
}
