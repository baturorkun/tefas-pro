/**
 * Veritabanı erişimi. SQL burada toplanır; HTTP katmanı sorgu yazmaz.
 */
import type pg from 'pg';

import { SCHEDULED_SOURCE } from '../collector.js';

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
                    to_char(t.sell_date, 'YYYY-MM-DD') AS "sellDate", t.note,
                    to_char(t.buy_order_date, 'YYYY-MM-DD')  AS "buyOrderDate",
                    to_char(t.sell_order_date, 'YYYY-MM-DD') AS "sellOrderDate"`;

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
  /** Emrin verildiği günler. Değerlemede kullanılmaz; istatistik. */
  buyOrderDate: string | null;
  sellOrderDate: string | null;
}

export async function createTransaction(
  pool: pg.Pool,
  userId: number,
  input: TransactionInput,
): Promise<Transaction> {
  const r = await pool.query<{ id: number }>(
    `INSERT INTO portfolio_transaction
       (user_id, fund_code, platform, trade_date, units, sell_date, note,
        buy_order_date, sell_order_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [
      userId,
      input.fundCode,
      input.platform,
      input.tradeDate,
      input.units,
      input.sellDate,
      input.note,
      input.buyOrderDate,
      input.sellOrderDate,
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
       sell_date = $7, note = $8,
       buy_order_date = $9, sell_order_date = $10, updated_at = now()
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
      input.buyOrderDate,
      input.sellOrderDate,
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
    // fund_latest LEFT JOIN: yeni eklenen fonun henüz fiyat verisi yok.
    // Inner join'de böyle bir fon listede hiç görünmüyordu — kullanıcı fonu
    // ekliyor, liste değişmiyordu. Artık satır çıkar, verisi olmadığı belli
    // olur ve toplama bitince kendiliğinden dolar.
    //
    // Başlık dim_fund'dan yedekleniyor: fon eklenirken oraya yazılıyor,
    // fiyat verisi ise ilk toplamadan sonra geliyor.
    `SELECT w.fund_code AS "fundCode", coalesce(l.title, d.title) AS title,
            CASE WHEN count(t.id) > 0 THEN 'sold' ELSE 'watch' END AS status,
            to_char(w.added_at AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD') AS "addedAt",
            w.note,
            to_char(l.nav_date, 'YYYY-MM-DD') AS "navDate",
            l.nav_per_share::text AS "navPerShare",
            round(l.daily_return_pct, 4)::text AS "dailyReturnPct",
            round(l.net_flow)::text AS "netFlow",
            l.tax_pct::text AS "taxPct", l.sell_valor_days AS "sellValorDays"
     FROM analytics.watchlist_visible w
     LEFT JOIN analytics.fund_latest l USING (fund_code)
     LEFT JOIN dim_fund d ON d.fund_code = w.fund_code
     LEFT JOIN portfolio_transaction t
            ON t.fund_code = w.fund_code AND t.user_id = w.user_id
     WHERE w.user_id = $1
     GROUP BY w.fund_code, w.added_at, w.note, l.title, d.title, l.nav_date, l.nav_per_share,
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
    /** Açık pozisyonu olan fon sayısı — portföy ekranındaki satır sayısı. */
    openPositions: number;
    /** O fonları oluşturan açık alım kaydı sayısı. */
    openLots: number;
    /** Takip listesinde alıp sattığım fon sayısı; kalanı hâlâ izlediklerim. */
    watchlistSold: number;
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
      watchlist: string; tracked_funds: string; open_positions: string;
      open_lots: string; watchlist_sold: string; data_date: string | null;
    }>(
      `SELECT (SELECT count(*) FROM analytics.watchlist_visible WHERE user_id = $1) AS watchlist,
              (SELECT count(*) FROM analytics.tracked_fund) AS tracked_funds,
              -- Takip listesinin durum dağılımı. "38 fon toplanıyor" o kutuda
              -- bağlamsız kalıyordu; toplanan fon sayısı collector'ın kapsamı.
              -- Durum tanımı takip ekranıyla aynı: fonda işlem varsa "çıktım".
              (SELECT count(*) FROM analytics.watchlist_visible w
                WHERE w.user_id = $1
                  AND EXISTS (SELECT 1 FROM portfolio_transaction t
                              WHERE t.fund_code = w.fund_code AND t.user_id = w.user_id)
              ) AS watchlist_sold,
              (SELECT count(*) FROM analytics.position_return
                WHERE user_id = $1 AND is_open AND NOT simulated) AS open_positions,
              -- Açıklık kuralı position_leg ile aynı olmalı: ileri tarihli
              -- satışı olan kayıt hâlâ elde sayılır.
              (SELECT count(*) FROM portfolio_transaction
                WHERE user_id = $1
                  AND (sell_date IS NULL OR sell_date > current_date)) AS open_lots,
              (SELECT to_char(max(trade_date), 'YYYY-MM-DD') FROM fact_fund_daily
                WHERE daily_return_pct IS NOT NULL) AS data_date`,
      [userId],
    ),
    pool.query<{ id: number; status: string; finished_at: string | null }>(
      `SELECT id, status, to_char(finished_at AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI')
                AS finished_at
       FROM ingest_run WHERE source = $1 ORDER BY id DESC LIMIT 1`,
      [SCHEDULED_SOURCE],
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
      openLots: Number(c.open_lots),
      watchlistSold: Number(c.watchlist_sold),
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

// ── Portföy performans serisi ────────────────────────────────────────────────

export interface PerformancePoint {
  /** İş günü, YYYY-MM-DD. */
  date: string;
  /** Sermaye hareketinden arındırılmış portföy değeri — grafiğin çizgisi. */
  value: string;
  /** O günün organik getirisi (%) — grafiğin barı. İlk günde null. */
  dailyPct: string | null;
}

export interface PerformanceSeries {
  points: PerformancePoint[];
  /** Pencere boyunca toplam organik getiri (%). */
  totalPct: string | null;
}

const PERFORMANCE_DEFAULT_DAYS = 30;
const PERFORMANCE_MAX_DAYS = 365;

/** `analytics.portfolio_daily` satırı: ham değer ve arındırılmış günlük kazanç. */
export interface PortfolioDailyRow {
  date: string;
  value: string;
  dailyGain: string | null;
  prevValue: string | null;
}

/**
 * Ham günlük satırlardan grafiğin serisini kurar.
 *
 * Çizgi pencerenin ilk günkü değerinden başlar ve her gün yalnız organik kazanç
 * eklenir; sermaye girişi/çıkışı seriye girmez. Ham değer çizilseydi para
 * yatırılan gün çizgi dikey fırlardı — ölçülen veride 3 Ağustos ham hesapta
 * %8,59 kazanç gibi duruyor, oysa organik getirisi %0,33; aradaki fark o gün
 * yatırılan 262.272 TL.
 *
 * Hesap SQL yerine burada: pencere fonksiyonuyla yazıldığında doğrulanması
 * çalışan bir veritabanı gerektiriyordu, saf fonksiyon olarak test edilebilir.
 */
export function buildPerformanceSeries(rows: PortfolioDailyRow[]): PerformanceSeries {
  if (rows.length === 0) return { points: [], totalPct: null };

  const first = rows[0];
  if (!first) return { points: [], totalPct: null };

  let adjusted = Number(first.value);
  const points: PerformancePoint[] = rows.map((row, i) => {
    // Pencerenin ilk günü referans noktasıdır: kendi kazancı pencereden önceki
    // güne aittir, seriye eklenmez ve barı çizilmez.
    if (i > 0) adjusted += Number(row.dailyGain ?? 0);
    const prev = Number(row.prevValue ?? 0);
    const gain = Number(row.dailyGain ?? 0);
    return {
      date: row.date,
      value: adjusted.toFixed(2),
      dailyPct: i === 0 || prev === 0 ? null : ((gain / prev) * 100).toFixed(4),
    };
  });

  const start = Number(points[0]?.value ?? 0);
  const end = Number(points[points.length - 1]?.value ?? 0);
  return {
    points,
    totalPct: start === 0 ? null : (((end - start) / start) * 100).toFixed(4),
  };
}

/**
 * Portföyün son `days` iş günündeki performansı.
 *
 * Fiyat geçmişi ölçülmüş halde yok: kaynak fon başına yalnız güncel fiyatı
 * veriyor. `analytics.portfolio_daily` fiyatı getiri serisinden zincirleyerek
 * türetir; bkz. db/migrations/023_portfolio_daily.sql.
 */
export async function portfolioPerformance(
  pool: pg.Pool,
  userId: number,
  days: number = PERFORMANCE_DEFAULT_DAYS,
): Promise<PerformanceSeries> {
  const limit = Math.min(Math.max(Math.trunc(days) || PERFORMANCE_DEFAULT_DAYS, 2), PERFORMANCE_MAX_DAYS);
  const r = await pool.query<{
    d: string; value: string; daily_gain: string | null; prev_value: string | null;
  }>(
    `SELECT to_char(trade_date, 'YYYY-MM-DD') AS d, value, daily_gain, prev_value
     FROM (
       SELECT trade_date, value, daily_gain, prev_value
       FROM analytics.portfolio_daily
       WHERE user_id = $1
       ORDER BY trade_date DESC
       LIMIT $2
     ) son
     ORDER BY trade_date`,
    [userId, limit],
  );

  return buildPerformanceSeries(
    r.rows.map((row) => ({
      date: row.d,
      value: row.value,
      dailyGain: row.daily_gain,
      prevValue: row.prev_value,
    })),
  );
}

// ── Dönemsel getiri (aylık / haftalık) ───────────────────────────────────────

/** Ayın en fazla kaç hafta satırına bölüneceği. */
const MAX_WEEKS_PER_MONTH = 4;
/** Bir hafta bloğunun işlem günü sayısı. */
const WEEK_LENGTH = 5;

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export interface PeriodRow {
  label: string;
  /** Benchmark fonun aynı günlerdeki getirisi (%). Verisi yoksa null. */
  benchPct: string | null;
  /** Portföy ile benchmark arasındaki fark, puan. */
  diff: string | null;
  startDate: string;
  endDate: string;
  /** Dönemin işlem günü sayısı. */
  days: number;
  /** Sermaye hareketinden arındırılmış TL kazanç. */
  gain: string;
  /** Günlük getirilerin bileşiği (%). Ölçülemiyorsa null. */
  pct: string | null;
}

export interface MonthlyPeriod extends PeriodRow {
  /** YYYY-AA. */
  month: string;
  weeks: PeriodRow[];
}

/**
 * Bir gün kümesini tek döneme indirger.
 *
 * Kazanç günlük kazançların toplamı, getiri günlük getirilerin bileşiğidir.
 * Yüzdeleri toplamak yanlış olurdu: her günün getirisi kendi açılış değerine
 * göre ölçülür, paydalar farklıdır.
 *
 * Bu tanımın yan etkisi işe yarıyor — bir ayın kazancı haftalarının tam
 * toplamına, getirisi de haftalarının tam bileşiğine eşit çıkar; ay ayrı bir
 * formülle hesaplanmadığı için ikisi arasında tutarsızlık oluşamaz.
 */
function measure(
  label: string,
  days: readonly PortfolioDailyRow[],
  bench: ReadonlyMap<string, number>,
): PeriodRow {
  let gain = 0;
  let factor = 1;
  let measured = false;
  // Benchmark portföyün ölçülebildiği AYNI günler üzerinden zincirlenir.
  // Para tutulmayan günün getirisi benchmark'a yazılsaydı, benchmark paranın
  // hiç girmediği bir dönemin kazancıyla öne geçmiş görünürdü.
  let benchFactor = 1;
  let benchMeasured = false;
  for (const day of days) {
    const g = Number(day.dailyGain ?? 0);
    if (Number.isFinite(g)) gain += g;
    const prev = Number(day.prevValue ?? 0);
    // Açılış değeri sıfır olan gün bileşiğe girmez: portföy o sabah boşken
    // getiri tanımsızdır, sıfıra bölmek sonsuz getiri üretirdi.
    if (day.dailyGain !== null && prev > 0) {
      factor *= 1 + g / prev;
      measured = true;
      const b = bench.get(day.date);
      if (b !== undefined) {
        benchFactor *= 1 + b / 100;
        benchMeasured = true;
      }
    }
  }
  const pct = measured ? (factor - 1) * 100 : null;
  const benchPct = benchMeasured ? (benchFactor - 1) * 100 : null;
  const first = days[0];
  const last = days[days.length - 1];
  return {
    label,
    startDate: first?.date ?? '',
    endDate: last?.date ?? '',
    days: days.length,
    gain: gain.toFixed(2),
    pct: pct === null ? null : pct.toFixed(4),
    benchPct: benchPct === null ? null : benchPct.toFixed(4),
    diff: pct === null || benchPct === null ? null : (pct - benchPct).toFixed(4),
  };
}

/**
 * Ayın işlem günlerini hafta bloklarına ayırır.
 *
 * Bloklar ayın ilk işlem gününden ileri doğru beşerli gider; en fazla dört
 * blok olur ve artan günler SON bloğa eklenir. Artanı başa koymak, tek bir
 * işlem gününü "ayın ilk haftası" diye gösterip gerçek ilk haftayı iki satıra
 * bölüyordu.
 */
function weekBlocks<T>(days: readonly T[]): T[][] {
  const blocks: T[][] = [];
  let cut = 0;
  while (cut < days.length) {
    const isLast = blocks.length === MAX_WEEKS_PER_MONTH - 1;
    const tail = isLast ? days.length : Math.min(days.length, cut + WEEK_LENGTH);
    blocks.push(days.slice(cut, tail));
    cut = tail;
  }
  return blocks;
}

/**
 * Günlük satırlardan ay ve hafta dönemlerini kurar.
 *
 * Aylar en yeniden en eskiye döner, ayın haftaları kendi içinde artan sırada
 * kalır: ay içinde zaman ileri akar, aylar arasında geriye. Tablo böyle
 * okununca "bu ay ne oldu" en üstte durur.
 *
 * Portföyün tamamen kapalı olduğu aylar hiç satır üretmez; `portfolio_daily`
 * o günler için satır vermez ve boş bir ay göstermenin anlamı yok.
 *
 * Hesap SQL yerine burada: saf fonksiyon olarak çalışan veritabanı olmadan
 * test edilebiliyor, `buildPerformanceSeries` de aynı sebeple burada.
 */
export function buildPeriodReturns(
  rows: readonly PortfolioDailyRow[],
  benchDaily: ReadonlyMap<string, number> = new Map(),
): MonthlyPeriod[] {
  const byMonth = new Map<string, PortfolioDailyRow[]>();
  for (const row of [...rows].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = row.date.slice(0, 7);
    const bucket = byMonth.get(key);
    if (bucket === undefined) byMonth.set(key, [row]);
    else bucket.push(row);
  }

  const months: MonthlyPeriod[] = [];
  for (const [month, days] of byMonth) {
    const year = month.slice(0, 4);
    const name = MONTH_NAMES[Number(month.slice(5, 7)) - 1] ?? month;
    months.push({
      ...measure(`${name} ${year}`, days, benchDaily),
      month,
      weeks: weekBlocks(days).map((block, i) =>
        measure(`${String(i + 1)}. Hafta`, block, benchDaily)),
    });
  }
  return months.sort((a, b) => b.month.localeCompare(a.month));
}

/** Kullanıcının ay ve hafta bazında dönemsel getirisi. */
export async function periodReturns(pool: pg.Pool, userId: number): Promise<MonthlyPeriod[]> {
  const r = await pool.query<{
    d: string; value: string; daily_gain: string | null; prev_value: string | null;
  }>(
    `SELECT to_char(trade_date, 'YYYY-MM-DD') AS d, value, daily_gain, prev_value
     FROM analytics.portfolio_daily
     WHERE user_id = $1
     ORDER BY trade_date`,
    [userId],
  );
  const { code } = await userBenchmark(pool, userId);
  const b = await pool.query<{ d: string; pct: string }>(
    `SELECT to_char(trade_date, 'YYYY-MM-DD') AS d, daily_return_pct::text AS pct
     FROM fact_fund_daily
     WHERE fund_code = $1 AND daily_return_pct IS NOT NULL`,
    [code],
  );

  return buildPeriodReturns(
    r.rows.map((row) => ({
      date: row.d,
      value: row.value,
      dailyGain: row.daily_gain,
      prevValue: row.prev_value,
    })),
    new Map(b.rows.map((row) => [row.d, Number(row.pct)])),
  );
}

// ── Kapanmış pozisyonlar ─────────────────────────────────────────────────────

export interface ClosedPositionRow {
  fundCode: string;
  title: string | null;
  platform: string;
  buyDate: string;
  sellDate: string;
  heldDays: number;
  units: string;
  buyValue: string;
  sellValue: string;
  realizedGain: string;
  realizedPct: string;
}

/**
 * Kapanmış pozisyonlar, en son satılan üstte.
 *
 * Satır kırılımı işlem başınadır: aynı fondan farklı tarihlerde alınıp ayrı
 * satılan pozisyonlar ayrı sonuç üretir ve hangi alımın ne kazandırdığı
 * görünmelidir.
 */
export async function closedPositions(
  pool: pg.Pool,
  userId: number,
): Promise<ClosedPositionRow[]> {
  const r = await pool.query(
    `SELECT fund_code AS "fundCode", title, platform,
            to_char(buy_date,  'YYYY-MM-DD') AS "buyDate",
            to_char(sell_date, 'YYYY-MM-DD') AS "sellDate",
            held_days AS "heldDays",
            units::text, buy_value::text AS "buyValue",
            sell_value::text AS "sellValue",
            realized_gain::text AS "realizedGain",
            realized_pct::text AS "realizedPct"
     FROM analytics.closed_position
     WHERE user_id = $1
     ORDER BY sell_date DESC, realized_gain DESC`,
    [userId],
  );
  return r.rows as ClosedPositionRow[];
}

// ── Sistem ayarları ──────────────────────────────────────────────────────────

/** Tatil listesi bulunamazsa hesap hafta sonlarıyla yetinir; ekran çökmez. */
const DEFAULT_HOLIDAYS: string[] = [];

// ── Collector koşumları ──────────────────────────────────────────────────────

export interface IngestRunRow {
  id: number;
  source: string;
  startedAt: string;
  finishedAt: string | null;
  /** Saniye cinsinden süre; koşum sürüyorsa null. */
  seconds: number | null;
  status: string;
  rowsUpserted: number;
  /** Başarıyla toplanan fon sayısı. */
  fundsOk: number;
  /** Hata alan fon sayısı. */
  fundsFailed: number;
  lastError: string | null;
}

/**
 * Collector koşum geçmişi, en yeni üstte.
 *
 * Hata metni de taşınır: şimdiye kadar yalnız veritabanında duruyordu, oysa
 * başarısız koşumun sebebi ("relation watchlist does not exist", boş takip
 * listesi) tam da bakılması gereken şey.
 */
export async function ingestRuns(pool: pg.Pool, limit = 100): Promise<IngestRunRow[]> {
  const r = await pool.query<{
    id: number; source: string; started_at: string; finished_at: string | null;
    seconds: number | null; status: string; rows_upserted: number;
    funds_ok: number; funds_failed: number; last_error: string | null;
  }>(
    `SELECT id, source,
            to_char(started_at  AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI') AS started_at,
            to_char(finished_at AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI') AS finished_at,
            extract(epoch FROM (finished_at - started_at))::int AS seconds,
            status, rows_upserted, funds_ok, funds_failed, last_error
     FROM ingest_run ORDER BY id DESC LIMIT $1`,
    [Math.min(Math.max(Math.trunc(limit) || 100, 1), 500)],
  );
  return r.rows.map((x) => ({
    id: x.id, source: x.source, startedAt: x.started_at, finishedAt: x.finished_at,
    seconds: x.seconds, status: x.status, rowsUpserted: x.rows_upserted,
    fundsOk: x.funds_ok, fundsFailed: x.funds_failed, lastError: x.last_error,
  }));
}

/** Fonun ölçülmüş getiri verisi var mı? Yoksa toplama tetiklenir. */
export async function fundHasData(pool: pg.Pool, fundCode: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM fact_fund_daily
     WHERE fund_code = $1 AND daily_return_pct IS NOT NULL LIMIT 1`,
    [fundCode],
  );
  return (r.rowCount ?? 0) > 0;
}

// ── Bankalar ─────────────────────────────────────────────────────────────────

export interface BankRow {
  name: string;
  /** Bu bankayı kullanan işlem sayısı. Sıfırsa banka silinebilir. */
  usage: number;
}

/** Adın kabul edilebilir hali. Boş veya yalnız boşluktan oluşan ad reddedilir. */
export function normalizeBankName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.trim();
  if (name === '' || name.length > 60) return null;
  return name;
}

/** Bankalar, her birinin kaç işlemde kullanıldığıyla birlikte. */
export async function listBanks(pool: pg.Pool): Promise<BankRow[]> {
  const r = await pool.query<{ name: string; usage: string }>(
    `SELECT b.name, count(t.id)::text AS usage
     FROM bank b
     LEFT JOIN portfolio_transaction t ON t.platform = b.name
     GROUP BY b.name
     ORDER BY count(t.id) DESC, b.name`,
  );
  return r.rows.map((row) => ({ name: row.name, usage: Number(row.usage) }));
}

/** Yeni banka. Aynı ad ikinci kez eklenmez; sessizce yutulmaz, false döner. */
export async function addBank(pool: pg.Pool, name: string): Promise<boolean> {
  const r = await pool.query(
    'INSERT INTO bank (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
    [name],
  );
  return (r.rowCount ?? 0) > 0;
}

/**
 * Banka siler.
 *
 * Kullanımdaki banka silinmez. Kaç işlemin engellediği sayılıp döndürülür ki
 * uyarı "silinemez" demekle kalmayıp sebebini söyleyebilsin.
 *
 * Sayım ile silme arasına başka bir yazma girse bile veri bozulmaz: asıl
 * güvence veritabanındaki ON DELETE RESTRICT, buradaki sayım yalnız mesaj
 * içindir.
 */
export async function deleteBank(
  pool: pg.Pool,
  name: string,
): Promise<{ deleted: boolean; usage: number; missing?: true }> {
  const exists = await pool.query('SELECT 1 FROM bank WHERE name = $1', [name]);
  if (exists.rowCount === 0) return { deleted: false, usage: 0, missing: true };

  const used = await pool.query<{ n: string }>(
    'SELECT count(*)::text AS n FROM portfolio_transaction WHERE platform = $1',
    [name],
  );
  const usage = Number(used.rows[0]?.n ?? 0);
  if (usage > 0) return { deleted: false, usage };

  await pool.query('DELETE FROM bank WHERE name = $1', [name]);
  return { deleted: true, usage: 0 };
}

export async function readSetting<T>(pool: pg.Pool, key: string, fallback: T): Promise<T> {
  const r = await pool.query<{ value: T }>('SELECT value FROM app_setting WHERE key = $1', [key]);
  return r.rows[0]?.value ?? fallback;
}

export async function writeSetting(
  pool: pg.Pool,
  key: string,
  value: unknown,
  userId: number,
): Promise<void> {
  await pool.query(
    `INSERT INTO app_setting (key, value, updated_by) VALUES ($1, $2::jsonb, $3)
     ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [key, JSON.stringify(value), userId],
  );
}

/** Karşılaştırma fonu. Portföyün getirisi tek başına iyi mi kötü mü demiyor. */
const DEFAULT_BENCHMARK = 'TP2';

/** Genel benchmark: kendi seçimi olmayan kullanıcıların devraldığı değer. */
export async function benchmarkCode(pool: pg.Pool): Promise<string> {
  return readSetting<string>(pool, 'benchmark', DEFAULT_BENCHMARK);
}

/**
 * Kullanıcı ayarı. Satır yoksa null döner; çağıran genel ayara düşer.
 *
 * Değer kayıt anında kopyalanmaz. Kopyalansaydı admin genel ayarı
 * değiştirdiğinde hiç tercih belirtmemiş kullanıcılar eski değerde donar ve
 * bunu fark etmezlerdi.
 */
export async function readUserSetting<T>(
  pool: pg.Pool,
  userId: number,
  key: string,
): Promise<T | null> {
  const r = await pool.query<{ value: T }>(
    'SELECT value FROM user_setting WHERE user_id = $1 AND key = $2',
    [userId, key],
  );
  return r.rows[0]?.value ?? null;
}

export async function writeUserSetting(
  pool: pg.Pool,
  userId: number,
  key: string,
  value: unknown,
): Promise<void> {
  await pool.query(
    `INSERT INTO user_setting (user_id, key, value) VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (user_id, key) DO UPDATE
       SET value = EXCLUDED.value, updated_at = now()`,
    [userId, key, JSON.stringify(value)],
  );
}

/** Tercihi siler: kullanıcı genel ayara geri döner. */
export async function clearUserSetting(
  pool: pg.Pool,
  userId: number,
  key: string,
): Promise<void> {
  await pool.query('DELETE FROM user_setting WHERE user_id = $1 AND key = $2', [userId, key]);
}

/**
 * Kullanıcının kıyaslama fonu ve bunun nereden geldiği.
 *
 * Ekran devralınan değer ile kişisel seçimi ayırt edebilsin diye kaynak da
 * döner: "TP2" yazan iki kullanıcıdan biri onu seçmiş, diğeri devralmış
 * olabilir ve genel ayar değişince yalnız ikincisi etkilenir.
 */
export async function userBenchmark(
  pool: pg.Pool,
  userId: number,
): Promise<{ code: string; personal: boolean; inherited: string; hasData: boolean }> {
  const inherited = await benchmarkCode(pool);
  const own = await readUserSetting<string>(pool, userId, 'benchmark');
  const code = own ?? inherited;
  // Verinin gelip gelmediği ekrana taşınır: yeni seçilen fonun toplaması
  // saniyeler sürüyor ve o sırada karşılaştırma sütunu boş kalıyor. Sebebini
  // söylemezsek bozuk görünür.
  return { code, personal: own !== null, inherited, hasData: await fundHasData(pool, code) };
}

export async function holidays(pool: pg.Pool): Promise<string[]> {
  return readSetting<string[]>(pool, 'holidays', DEFAULT_HOLIDAYS);
}

/**
 * Fonun valör günleri. Bilinmeyen fonda null döner: form hesabı atlar ve
 * kullanıcı tarihi elle girer, akış engellenmez.
 */
export async function fundValor(
  pool: pg.Pool,
  fundCode: string,
): Promise<{ buy: number; sell: number } | null> {
  const r = await pool.query<{ buy_valor_days: number | null; sell_valor_days: number | null }>(
    'SELECT buy_valor_days, sell_valor_days FROM dim_fund_terms WHERE fund_code = $1',
    [fundCode.toUpperCase()],
  );
  const row = r.rows[0];
  if (!row) return null;
  return { buy: row.buy_valor_days ?? 0, sell: row.sell_valor_days ?? 0 };
}
