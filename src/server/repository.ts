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

// ─── Takip listesi ──────────────────────────────────────────────────────────

export interface WatchlistRow {
  fundCode: string;
  title: string | null;
  /** İşlemlerden türetilir; tabloda saklanmaz. Sahip olunan fon listede yok. */
  status: 'sold' | 'watch';
  addedAt: string;
  note: string | null;
  navDate: string | null;
  navPerShare: string | null;
  dailyReturnPct: string | null;
  netFlow: string | null;
  taxPct: string | null;
  sellValorDays: number | null;
}

/**
 * Kullanıcının kendi takip listesi: sahip OLMADIĞI fonlar.
 *
 * Açık pozisyonu olan fon listede görünmez (analytics.watchlist_visible);
 * elimdekiler "Portföyüm"ün, izlediklerim bu listenin konusu. Satır silinmediği
 * için fondan tamamen çıkıldığında listede kendiliğinden geri belirir.
 *
 * `status` sütun değil, o kullanıcının işlemlerinden türetiliyor: aynı fon biri
 * için "çıktım", diğeri için "izliyorum" olabilir. Saklanan tek bir sütun bunu
 * taşıyamaz — eski `watchlist.status` bu yüzden gerçekle uyuşmuyordu.
 */
export async function listWatchlist(pool: pg.Pool, userId: number): Promise<WatchlistRow[]> {
  const r = await pool.query(
    // date sütunları to_char ile biçimlenir: pg sürücüsü date'i JS Date'e
    // çevirir ve JSON'a "2026-08-31T00:00:00.000Z" olarak serileşir.
    `SELECT w.fund_code AS "fundCode", l.title,
            CASE WHEN count(t.id) > 0 THEN 'sold' ELSE 'watch' END AS status,
            to_char(w.added_at AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD') AS "addedAt",
            w.note,
            to_char(l.nav_date, 'YYYY-MM-DD') AS "navDate",
            l.nav_per_share::text AS "navPerShare",
            round(l.daily_return_pct, 4)::text AS "dailyReturnPct",
            round(l.net_flow)::text AS "netFlow",
            l.tax_pct::text AS "taxPct", l.sell_valor_days AS "sellValorDays"
     FROM analytics.watchlist_visible w
     JOIN analytics.fund_latest l USING (fund_code)
     LEFT JOIN portfolio_transaction t
            ON t.fund_code = w.fund_code AND t.user_id = w.user_id
     WHERE w.user_id = $1
     GROUP BY w.fund_code, w.added_at, w.note, l.title, l.nav_date, l.nav_per_share,
              l.daily_return_pct, l.net_flow, l.tax_pct, l.sell_valor_days
     ORDER BY w.fund_code`,
    [userId],
  );
  return r.rows as WatchlistRow[];
}

/**
 * Portföye işlem girildiğinde çağrılır: fon kullanıcının listesinde yoksa
 * eklenir. Notu ezmez — kullanıcının kendi yazdığı not, sonradan girilen bir
 * işlem yüzünden silinmemeli.
 */
export async function trackFundForUser(
  pool: pg.Pool,
  userId: number,
  fundCode: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO user_watchlist (user_id, fund_code) VALUES ($1, $2)
     ON CONFLICT (user_id, fund_code) DO NOTHING`,
    [userId, fundCode],
  );
}

/** Zaten varsa notu günceller; iki kez eklemek hata değil. */
export async function addToWatchlist(
  pool: pg.Pool,
  userId: number,
  fundCode: string,
  note: string | null,
): Promise<void> {
  await pool.query(
    `INSERT INTO user_watchlist (user_id, fund_code, note) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, fund_code) DO UPDATE SET note = EXCLUDED.note`,
    [userId, fundCode, note],
  );
}

/**
 * Yalnız kullanıcının kendi satırını siler. Fonun verisi silinmez: başka bir
 * kullanıcı takip ediyor ya da bu kullanıcının pozisyonu duruyor olabilir,
 * ikisinde de collector toplamayı sürdürür.
 */
export async function removeFromWatchlist(
  pool: pg.Pool,
  userId: number,
  fundCode: string,
): Promise<boolean> {
  const r = await pool.query('DELETE FROM user_watchlist WHERE user_id = $1 AND fund_code = $2', [
    userId,
    fundCode,
  ]);
  return (r.rowCount ?? 0) > 0;
}

// ─── Portföy özeti ──────────────────────────────────────────────────────────

export interface PortfolioRow {
  fundCode: string;
  title: string | null;
  dailyReturnPct: string | null;
  return1m: string | null;
  return3m: string | null;
  days: number;
  units: string;
  cost: string;
  value: string;
  gain: string;
  returnPct: string;
  /** NAV'ın kaydedildiği gün. Veri gününden eskiyse fiyat taşınmıştır. */
  navDate: string | null;
  asOfDate: string | null;
}

/**
 * Fon başına açık pozisyon özeti — "neredeyim" sorusunun cevabı.
 *
 * İşlem listesinden ayrı: orası "ne yaptım"ı anlatıyor ve düzenlenebilir.
 * Bu görünüm türetilmiş, düzenlenecek satırı yok.
 *
 * Kapanmış pozisyonlar burada yok; artık pozisyon değiller.
 */
export async function portfolioSummary(pool: pg.Pool, userId: number): Promise<PortfolioRow[]> {
  const r = await pool.query(
    `SELECT p.fund_code AS "fundCode", p.title,
            round(l.daily_return_pct, 4)::text AS "dailyReturnPct",
            r.return_1m::text AS "return1m",
            r.return_3m::text AS "return3m",
            p.days,
            p.units::text,
            p.cost::text, p.value::text, p.gain::text,
            p.return_pct::text AS "returnPct",
            to_char(l.nav_date, 'YYYY-MM-DD')   AS "navDate",
            to_char(l.as_of_date, 'YYYY-MM-DD') AS "asOfDate"
     FROM analytics.position_return p
     LEFT JOIN analytics.fund_latest l USING (fund_code)
     LEFT JOIN analytics.fund_returns r USING (fund_code)
     WHERE p.user_id = $1 AND p.is_open AND NOT p.simulated
     ORDER BY p.value DESC NULLS LAST`,
    [userId],
  );
  return r.rows as PortfolioRow[];
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export interface RankEntry {
  fundCode: string;
  title: string | null;
  returnPct: string;
  /** Pencerede kaç iş günü veri olduğu. */
  days: number | null;
  /** Bu kullanıcının o fonda açık pozisyonu var mı. Saklanmaz, türetilir. */
  owned: boolean;
  /** Yalnız pozisyon sıralamasında dolu: o fondaki kâr/zarar, TL. */
  gain?: string | null;
  /** Yalnız akış sıralamasında dolu: pencere net akışı, TL. */
  flow?: string | null;
  /** Yalnız yatırımcı sıralamasında dolu: pencere değişimi, kişi. */
  people?: string | null;
}

export interface PositionSummary {
  cost: string;
  value: string;
  gain: string;
  gainPct: string;
  /** Kapanmış pozisyonlardan gerçekleşmiş kâr. */
  realizedGain: string;
  winners: number;
  losers: number;
}

export interface DashboardData {
  metrics: {
    watchlist: number;
    trackedFunds: number;
    openPositions: number;
    dataDate: string | null;
    lastRun: { id: number; status: string; finishedAt: string | null } | null;
  };
  watchlistRanks: Record<string, { top: RankEntry[]; bottom: RankEntry[] }>;
  positions: {
    summary: PositionSummary | null;
    top: RankEntry[];
    bottom: RankEntry[];
  };
  /** Para akışı: `returnPct` oranı (%), `flow` TL tutarını taşır. */
  flowRanks: Record<string, { top: RankEntry[]; bottom: RankEntry[] }>;
  /** Yatırımcı sayısı: `returnPct` oranı (%), `people` kişi değişimini taşır. */
  investorRanks: Record<string, { top: RankEntry[]; bottom: RankEntry[] }>;
}

const RANK_LIMIT = 10;

/**
 * Sıralama saklanan günlük seriden hesaplanır; sayfa açılışında dış servise
 * istek atılmaz. Kapsam takip edilen fonlar: veri yalnız onlar için toplanır.
 */
export async function dashboard(
  pool: pg.Pool,
  userId: number,
  onlyOwned = false,
): Promise<DashboardData> {
  const [counts, lastRun, wl, pos, posSum, flow, inv] = await Promise.all([
    pool.query<{
      watchlist: string; tracked_funds: string; open_positions: string; data_date: string | null;
    }>(
      `SELECT (SELECT count(*) FROM analytics.watchlist_visible WHERE user_id = $1) AS watchlist,
              (SELECT count(*) FROM analytics.tracked_fund) AS tracked_funds,
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
      fund_code: string; title: string | null; owned: boolean;
      return_1w: string | null; days_1w: string; return_1m: string | null; days_1m: string;
    }>(
      // Sahiplik view'a konamaz: kullanıcıya göre değişir, view parametre
      // almaz. Sıralamanın kendisi kullanıcıdan bağımsız — fonun getirisi
      // herkes için aynı — bu yüzden yalnız `owned` sütunu kullanıcıya bağlı.
      //
      // `onlyOwned` grafiği süzmez, listeyi baştan daraltır: bar gizlemek
      // top-10'u üçe düşürür ve "en çok kazandıran 10" başlığını yalanlardı.
      `SELECT r.fund_code, r.title, r.return_1w::text, r.days_1w::text,
              r.return_1m::text, r.days_1m::text,
              EXISTS (SELECT 1 FROM portfolio_transaction p
                      WHERE p.user_id = $1 AND p.fund_code = r.fund_code
                        AND p.sell_date IS NULL) AS owned
       FROM analytics.fund_returns r
       WHERE NOT $2::boolean
          OR EXISTS (SELECT 1 FROM portfolio_transaction p
                     WHERE p.user_id = $1 AND p.fund_code = r.fund_code
                       AND p.sell_date IS NULL)`,
      [userId, onlyOwned],
    ),
    // Pozisyon sıralaması. Kapanmışlar listeye girmez — artık pozisyon
    // değiller; gerçekleşmiş kârları özet şeridinde duruyor.
    //
    // Simülasyonlar (takip listesi, added_at'ten alınmış gibi) yalnız toggle
    // açıkken. Kapalıyken satır hiç gelmez, sıralama yeniden hesaplanır.
    pool.query<{
      fund_code: string; title: string | null; simulated: boolean;
      days: string; return_pct: string; gain: string | null;
    }>(
      `SELECT fund_code, title, simulated, days::text, return_pct::text, gain::text
       FROM analytics.position_return
       WHERE user_id = $1 AND is_open AND (NOT simulated OR NOT $2::boolean)`,
      [userId, onlyOwned],
    ),
    // Özet yalnız gerçek pozisyonlardan; simülasyonun TL tutarı yok.
    pool.query<{
      cost: string | null; value: string | null; gain: string | null;
      gain_pct: string | null; realized: string | null;
      winners: string; losers: string;
    }>(
      `SELECT sum(cost)  FILTER (WHERE is_open)::text     AS cost,
              sum(value) FILTER (WHERE is_open)::text     AS value,
              sum(gain)  FILTER (WHERE is_open)::text     AS gain,
              round((sum(value) FILTER (WHERE is_open)
                     / nullif(sum(cost) FILTER (WHERE is_open), 0) - 1) * 100, 2)::text
                                                          AS gain_pct,
              sum(gain)  FILTER (WHERE NOT is_open)::text AS realized,
              count(*) FILTER (WHERE is_open AND return_pct > 0)::text AS winners,
              count(*) FILTER (WHERE is_open AND return_pct < 0)::text AS losers
       FROM analytics.position_return
       WHERE user_id = $1 AND NOT simulated`,
      [userId],
    ),
    // Para akışı. Sıralama oranla yapıldığı için pencere başı büyüklüğü
    // bilinmeyen fon listeye giremez — oranı yok, sıfır göstermek "akış
    // olmadı" demek olurdu.
    pool.query<{
      fund_code: string; title: string | null; owned: boolean;
      flow_1w: string | null; days_1w: string; pct_1w: string | null;
      flow_1m: string | null; days_1m: string; pct_1m: string | null;
    }>(
      `SELECT r.fund_code, r.title,
              r.flow_1w::text, r.days_1w::text, r.flow_pct_1w::text AS pct_1w,
              r.flow_1m::text, r.days_1m::text, r.flow_pct_1m::text AS pct_1m,
              EXISTS (SELECT 1 FROM portfolio_transaction p
                      WHERE p.user_id = $1 AND p.fund_code = r.fund_code
                        AND p.sell_date IS NULL) AS owned
       FROM analytics.fund_flow r
       WHERE NOT $2::boolean
          OR EXISTS (SELECT 1 FROM portfolio_transaction p
                     WHERE p.user_id = $1 AND p.fund_code = r.fund_code
                       AND p.sell_date IS NULL)`,
      [userId, onlyOwned],
    ),
    // Yatırımcı sayısı. fund_flow ile aynı kalıp: sıralama oranla, büyüklük
    // ham sayıyla anlatılır.
    pool.query<{
      fund_code: string; title: string | null; owned: boolean;
      change_1w: string | null; days_1w: string; pct_1w: string | null;
      change_1m: string | null; days_1m: string; pct_1m: string | null;
    }>(
      `SELECT r.fund_code, r.title,
              r.change_1w::text, r.days_1w::text, r.change_pct_1w::text AS pct_1w,
              r.change_1m::text, r.days_1m::text, r.change_pct_1m::text AS pct_1m,
              EXISTS (SELECT 1 FROM portfolio_transaction p
                      WHERE p.user_id = $1 AND p.fund_code = r.fund_code
                        AND p.sell_date IS NULL) AS owned
       FROM analytics.fund_investor r
       WHERE NOT $2::boolean
          OR EXISTS (SELECT 1 FROM portfolio_transaction p
                     WHERE p.user_id = $1 AND p.fund_code = r.fund_code
                       AND p.sell_date IS NULL)`,
      [userId, onlyOwned],
    ),
  ]);

  const byWindow = (win: '1w' | '1m'): { top: RankEntry[]; bottom: RankEntry[] } => {
    const rows = wl.rows
      .map((r) => ({
        fundCode: r.fund_code,
        title: r.title,
        owned: r.owned,
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

  const positionRows = pos.rows
    .map((r): RankEntry => ({
      fundCode: r.fund_code,
      title: r.title,
      returnPct: r.return_pct,
      days: Number(r.days),
      owned: !r.simulated,
      gain: r.gain,
    }))
    .sort((a, b) => Number(b.returnPct) - Number(a.returnPct));
  // Kayıp listesi gerçekten kaybettirenleri gösterir; alttan N almak
  // hepsi artıdayken paneli pozitif değerlerle doldurup başlığı yalanlardı.
  const positionLosers = positionRows.filter((r) => Number(r.returnPct) < 0);
  const ps = posSum.rows[0];

  const byFlow = (win: '1w' | '1m'): { top: RankEntry[]; bottom: RankEntry[] } => {
    const rows = flow.rows
      .map((r) => ({
        fundCode: r.fund_code,
        title: r.title,
        owned: r.owned,
        returnPct: win === '1w' ? r.pct_1w : r.pct_1m,
        flow: win === '1w' ? r.flow_1w : r.flow_1m,
        days: Number(win === '1w' ? r.days_1w : r.days_1m),
      }))
      .filter((r) => r.returnPct !== null)
      .map((r): RankEntry => ({ ...r, returnPct: r.returnPct as string }))
      .sort((a, b) => Number(b.returnPct) - Number(a.returnPct));
    const cikis = rows.filter((r) => Number(r.returnPct) < 0);
    const giris = rows.filter((r) => Number(r.returnPct) > 0);
    return { top: giris.slice(0, RANK_LIMIT), bottom: cikis.slice(-RANK_LIMIT).reverse() };
  };

  const byInvestor = (win: '1w' | '1m'): { top: RankEntry[]; bottom: RankEntry[] } => {
    const rows = inv.rows
      .map((r) => ({
        fundCode: r.fund_code,
        title: r.title,
        owned: r.owned,
        returnPct: win === '1w' ? r.pct_1w : r.pct_1m,
        people: win === '1w' ? r.change_1w : r.change_1m,
        days: Number(win === '1w' ? r.days_1w : r.days_1m),
      }))
      .filter((r) => r.returnPct !== null)
      .map((r): RankEntry => ({ ...r, returnPct: r.returnPct as string }))
      .sort((a, b) => Number(b.returnPct) - Number(a.returnPct));
    return {
      top: rows.filter((r) => Number(r.returnPct) > 0).slice(0, RANK_LIMIT),
      bottom: rows.filter((r) => Number(r.returnPct) < 0).slice(-RANK_LIMIT).reverse(),
    };
  };

  const c = counts.rows[0]!;
  const run = lastRun.rows[0];
  return {
    metrics: {
      watchlist: Number(c.watchlist),
      trackedFunds: Number(c.tracked_funds),
      openPositions: Number(c.open_positions),
      dataDate: c.data_date,
      lastRun: run ? { id: run.id, status: run.status, finishedAt: run.finished_at } : null,
    },
    watchlistRanks: { '1w': byWindow('1w'), '1m': byWindow('1m') },
    positions: {
      summary:
        ps?.cost == null
          ? null
          : {
              cost: ps.cost,
              value: ps.value ?? '0',
              gain: ps.gain ?? '0',
              gainPct: ps.gain_pct ?? '0',
              realizedGain: ps.realized ?? '0',
              winners: Number(ps.winners),
              losers: Number(ps.losers),
            },
      top: positionRows.slice(0, RANK_LIMIT),
      bottom: positionLosers.slice(-RANK_LIMIT).reverse(),
    },
    flowRanks: { '1w': byFlow('1w'), '1m': byFlow('1m') },
    investorRanks: { '1w': byInvestor('1w'), '1m': byInvestor('1m') },
  };
}
