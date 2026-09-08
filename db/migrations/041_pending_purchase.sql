-- Tutarla verilen, adedi henüz belli olmayan alım: pasif işlem.
--
-- TEFAS'ta emir tutarla veriliyor; kaç pay alındığı fiyat açıklanınca belli
-- oluyor. units NOT NULL olduğu için bu kayıt hiç girilemiyordu.
--
-- Ayrı tablo denendi ve bırakıldı: iki liste ve bir "çevirme" adımı kafa
-- karıştırıyor. Kayıt normal listede, normal formdan girilir; adet gelene
-- kadar pasif bekler ve hiçbir hesaba katılmaz.
--
-- Riski taşıyan yer units'in nullable olması: bu sütun beş analytics
-- view'ında aritmetiğe giriyor ve NULL bir adet sızarsa rakam ekranda hata
-- vermeden bozulur. O yüzden filtre tek yerde toplanıyor —
-- analytics.settled_transaction — ve view'lar kaynağı oradan alıyor.
-- Böylece yeni bir view eklenirken doğru kaynağı seçmek tek karar oluyor.
ALTER TABLE portfolio_transaction
  ALTER COLUMN units DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS order_amount numeric(24, 2);

-- Ya adet ya tutar: ikisi de boş bir kayıt hiçbir şey anlatmıyor.
ALTER TABLE portfolio_transaction
  DROP CONSTRAINT IF EXISTS portfolio_transaction_units_or_amount;
ALTER TABLE portfolio_transaction
  ADD CONSTRAINT portfolio_transaction_units_or_amount
  CHECK (units IS NOT NULL OR order_amount IS NOT NULL);

-- Adedi olmayan bir pozisyon satılamaz.
ALTER TABLE portfolio_transaction
  DROP CONSTRAINT IF EXISTS portfolio_transaction_pending_not_sold;
ALTER TABLE portfolio_transaction
  ADD CONSTRAINT portfolio_transaction_pending_not_sold
  CHECK (units IS NOT NULL OR sell_date IS NULL);

ALTER TABLE portfolio_transaction
  DROP CONSTRAINT IF EXISTS portfolio_transaction_amount_positive;
ALTER TABLE portfolio_transaction
  ADD CONSTRAINT portfolio_transaction_amount_positive
  CHECK (order_amount IS NULL OR order_amount > 0);

-- Hesaba giren işlemler. Pasif kayıt buradan geçmez.
CREATE OR REPLACE VIEW analytics.settled_transaction AS
  SELECT * FROM portfolio_transaction WHERE units IS NOT NULL;

COMMENT ON VIEW analytics.settled_transaction IS
  'Adedi belli olan işlemler. Bütün hesaplar bunu okur; pasif (tutarla girilmiş) kayıtlar dışarıda kalır.';

-- position_leg
CREATE OR REPLACE VIEW analytics.position_leg AS
WITH son AS (
  SELECT max(trade_date) AS d FROM fact_fund_daily WHERE daily_return_pct IS NOT NULL
)
SELECT
  p.user_id,
  p.fund_code,
  p.units,
  p.trade_date AS start_date,
  -- Gerçekleşmemiş satışta değerleme son veri gününde durur.
  CASE
    WHEN p.sell_date IS NULL OR p.sell_date > (SELECT d FROM son)
      THEN (SELECT d FROM son)
    ELSE p.sell_date
  END AS end_date,
  (p.sell_date IS NULL OR p.sell_date > current_date) AS is_open,
  false AS simulated
FROM analytics.settled_transaction p
UNION ALL
-- Takip listesi "almış gibi": izlemeye başladığım gün alsaydım ne olurdu.
-- watchlist_visible kullanılır, user_watchlist değil — açık pozisyonu olan fon
-- zaten gerçek bacağıyla listede, iki kez sayılmamalı.
SELECT
  w.user_id,
  w.fund_code,
  1 AS units,
  (w.added_at AT TIME ZONE 'Europe/Istanbul')::date AS start_date,
  (SELECT d FROM son),
  true AS is_open,
  true AS simulated
FROM analytics.watchlist_visible w;

-- closed_position
CREATE OR REPLACE VIEW analytics.closed_position AS
WITH leg AS (
  SELECT
    p.user_id,
    p.fund_code,
    p.platform,
    p.units,
    p.trade_date AS buy_date,
    p.sell_date  AS sell_date,
    -- Alım gününden bugüne ve satış gününden bugüne bileşik getiri çarpanları.
    -- Bugünkü fiyatı bunlara bölmek o günkü fiyatı verir.
    (SELECT exp(sum(ln(greatest(1 + d.daily_return_pct / 100, 1e-9))))
     FROM fact_fund_daily d
     WHERE d.fund_code = p.fund_code AND d.daily_return_pct IS NOT NULL
       AND d.trade_date > p.trade_date)                       AS m_buy,
    coalesce((SELECT exp(sum(ln(greatest(1 + d.daily_return_pct / 100, 1e-9))))
              FROM fact_fund_daily d
              WHERE d.fund_code = p.fund_code AND d.daily_return_pct IS NOT NULL
                AND d.trade_date > p.sell_date), 1)           AS m_sell,
    (SELECT count(*)
     FROM fact_fund_daily d
     WHERE d.fund_code = p.fund_code AND d.daily_return_pct IS NOT NULL
       AND d.trade_date > p.trade_date AND d.trade_date <= p.sell_date) AS held_days
  FROM analytics.settled_transaction p
  WHERE p.sell_date IS NOT NULL AND p.sell_date <= current_date
)
SELECT
  leg.user_id,
  leg.fund_code,
  f.title,
  leg.platform,
  leg.buy_date,
  leg.sell_date,
  leg.held_days,
  leg.units,
  round(leg.units * nav.nav_per_share / leg.m_buy, 2)  AS buy_value,
  round(leg.units * nav.nav_per_share / leg.m_sell, 2) AS sell_value,
  round(leg.units * (nav.nav_per_share / leg.m_sell - nav.nav_per_share / leg.m_buy), 2)
    AS realized_gain,
  round((leg.m_buy / leg.m_sell - 1) * 100, 4) AS realized_pct
FROM leg
JOIN analytics.fund_latest nav USING (fund_code)
LEFT JOIN dim_fund f USING (fund_code)
-- m_buy yoksa alım gününden sonra hiç fiyat günü yok: değerlenemez.
WHERE leg.m_buy IS NOT NULL;

-- portfolio_daily
CREATE OR REPLACE VIEW analytics.portfolio_daily AS
WITH nav AS (
  -- Fon başına günlük fiyat: ölçülen son fiyattan zincirlenir.
  SELECT
    d.fund_code,
    d.trade_date,
    b.nav_per_share * exp(
      sum(ln(greatest(1 + d.daily_return_pct / 100, 1e-9)))
        OVER (PARTITION BY d.fund_code ORDER BY d.trade_date)
      - b.cum_at_base
    ) AS nav
  FROM fact_fund_daily d
  JOIN LATERAL (
    -- Zincirin dayandığı ölçülmüş fiyat ve o güne kadarki kümülatif çarpan.
    SELECT n.nav_per_share,
           (SELECT coalesce(sum(ln(greatest(1 + x.daily_return_pct / 100, 1e-9))), 0)
            FROM fact_fund_daily x
            WHERE x.fund_code = n.fund_code AND x.daily_return_pct IS NOT NULL
              AND x.trade_date <= n.trade_date) AS cum_at_base
    FROM fact_fund_daily n
    WHERE n.fund_code = d.fund_code AND n.nav_per_share IS NOT NULL
    ORDER BY n.trade_date DESC LIMIT 1
  ) b ON true
  WHERE d.daily_return_pct IS NOT NULL
),
gun AS (SELECT DISTINCT trade_date FROM nav),
-- Her bacak, açık olduğu her gün için bir satır üretir. LEFT JOIN: fiyatı
-- olmayan gün de satır olarak çıkar ki eksikliği sayılabilsin.
bacak AS (
  SELECT
    t.user_id, g.trade_date, t.units, t.trade_date AS alis, t.sell_date, n.nav
  FROM analytics.settled_transaction t
  JOIN gun g
    ON g.trade_date >= t.trade_date
   AND (t.sell_date IS NULL OR g.trade_date <= t.sell_date)
  LEFT JOIN nav n ON n.fund_code = t.fund_code AND n.trade_date = g.trade_date
),
gunluk AS (
  SELECT
    user_id,
    trade_date,
    -- O gün açık olan pozisyonların değeri.
    sum(units * nav) FILTER (
      WHERE alis <= trade_date AND (sell_date IS NULL OR sell_date > trade_date)
    ) AS value,
    -- O gün açılan pozisyonlar: yeni sermaye, kazanç değil.
    coalesce(sum(units * nav) FILTER (WHERE alis = trade_date), 0) AS inflow,
    -- O gün kapanan pozisyonlar: değerden düşer ama kayıp değil.
    coalesce(sum(units * nav) FILTER (WHERE sell_date = trade_date), 0) AS outflow
  FROM bacak
  GROUP BY user_id, trade_date
  -- Fiyatı eksik bacağı olan gün hiç değerlenmez.
  HAVING count(*) FILTER (WHERE nav IS NULL) = 0
)
SELECT
  user_id,
  trade_date,
  value,
  inflow,
  outflow,
  -- Organik kazanç: değer farkından o günün sermaye hareketi çıkarılır.
  -- Para yatırılan gün fark büyük çıkar; inflow düşülmezse yatırılan para
  -- kazanç sayılır ve grafik o günü yüzde sekiz kazanç gibi gösterir.
  value + outflow - lag(value) OVER (PARTITION BY user_id ORDER BY trade_date) - inflow
    AS daily_gain,
  lag(value) OVER (PARTITION BY user_id ORDER BY trade_date) AS prev_value
FROM gunluk
WHERE value IS NOT NULL;

-- position_slice
CREATE OR REPLACE VIEW analytics.position_slice AS
WITH son AS (
  SELECT max(trade_date) AS d FROM fact_fund_daily WHERE daily_return_pct IS NOT NULL
), leg AS (
  SELECT
    p.id, p.user_id, p.fund_code, p.platform, p.units,
    p.trade_date AS start_date,
    -- Gerçekleşmemiş satışta değerleme son veri gününde durur.
    CASE
      WHEN p.sell_date IS NULL OR p.sell_date > (SELECT d FROM son) THEN (SELECT d FROM son)
      ELSE p.sell_date
    END AS end_date,
    (p.sell_date IS NULL OR p.sell_date > current_date) AS is_open
  FROM analytics.settled_transaction p
), carpan AS (
  SELECT
    leg.*,
    (SELECT exp(sum(ln(1 + d.daily_return_pct / 100)))
     FROM fact_fund_daily d
     WHERE d.fund_code = leg.fund_code AND d.daily_return_pct IS NOT NULL
       AND d.trade_date > leg.start_date)                    AS m_start,
    coalesce((SELECT exp(sum(ln(1 + d.daily_return_pct / 100)))
              FROM fact_fund_daily d
              WHERE d.fund_code = leg.fund_code AND d.daily_return_pct IS NOT NULL
                AND d.trade_date > leg.end_date), 1)         AS m_end,
    (SELECT count(*)
     FROM fact_fund_daily d
     WHERE d.fund_code = leg.fund_code AND d.daily_return_pct IS NOT NULL
       AND d.trade_date > leg.start_date AND d.trade_date <= leg.end_date) AS days
  FROM leg
)
SELECT
  c.user_id,
  c.id AS transaction_id,
  c.fund_code,
  f.title,
  c.platform,
  f.umbrella_type,
  c.is_open,
  c.units,
  round(c.units * nav.nav_per_share / c.m_start, 2) AS cost,
  round(c.units * nav.nav_per_share / c.m_end, 2)   AS value
FROM carpan c
JOIN analytics.fund_latest nav USING (fund_code)
LEFT JOIN dim_fund f ON f.fund_code = c.fund_code
-- Getiri günü olmayan bacak dışarıda: aynı gün alınmış, henüz ölçülemiyor.
-- position_return da aynı satırları dışarıda bırakıyor, iki ekran tutarlı kalır.
WHERE c.days > 0 AND c.m_start IS NOT NULL;

-- fund_daily
CREATE OR REPLACE VIEW analytics.fund_daily AS
  WITH gun AS (SELECT DISTINCT trade_date FROM analytics.fund_nav),
  bacak AS (
    SELECT t.user_id, t.fund_code, g.trade_date, t.units,
           t.trade_date AS alis, t.sell_date, n.nav
      FROM analytics.settled_transaction t
      JOIN gun g ON g.trade_date >= t.trade_date
                AND (t.sell_date IS NULL OR g.trade_date <= t.sell_date)
      LEFT JOIN analytics.fund_nav n
             ON n.fund_code = t.fund_code AND n.trade_date = g.trade_date),
  gunluk AS (
    SELECT user_id, fund_code, trade_date,
           sum(units * nav) FILTER (
             WHERE alis <= trade_date AND (sell_date IS NULL OR sell_date > trade_date)) AS value,
           coalesce(sum(units * nav) FILTER (WHERE alis = trade_date), 0) AS inflow,
           coalesce(sum(units * nav) FILTER (WHERE sell_date = trade_date), 0) AS outflow
      FROM bacak
     GROUP BY user_id, fund_code, trade_date
    HAVING count(*) FILTER (WHERE nav IS NULL) = 0)
  SELECT user_id, fund_code, trade_date, value, inflow, outflow,
         value + outflow
           - lag(value) OVER (PARTITION BY user_id, fund_code ORDER BY trade_date)
           - inflow AS daily_gain,
         lag(value) OVER (PARTITION BY user_id, fund_code ORDER BY trade_date) AS prev_value
    FROM gunluk
   WHERE value IS NOT NULL;