-- ln(0) koruması: position_return ve position_slice.
--
-- Bir fonun fiyatı sıfıra inerse (tasfiye/askıya alma — 15 Eylül'de PHE'de
-- oldu) daily_return_pct = -100 olur ve zincirleme çarpımdaki
-- ln(1 + (-100)/100) = ln(0) matematiksel olarak tanımsız; PostgreSQL hata
-- verir. `closed_position` zaten `greatest(...,1e-9)` ile korunuyordu,
-- `position_return` ve `position_slice` korunmuyordu — tutarsızdı ve
-- korumasız iki view Panel'i (`/api/dashboard`) düşürdü, PHE'de kapanmış
-- pozisyonu olan her kullanıcı için.
--
-- Bu tek seferlik bir olay değil: herhangi bir fon aynı şekilde çökerse aynı
-- hata tekrarlanır. İçerik `closed_position`'daki tanımın aynısı, yalnız
-- `days > 0` yerine "alış/satış gününün veri gününü geçip geçmediği" ayrımı
-- (042'de eklendi) korunuyor.

-- position_return
CREATE OR REPLACE VIEW analytics.position_return AS
WITH son AS (
  SELECT max(trade_date) AS d FROM fact_fund_daily WHERE daily_return_pct IS NOT NULL
), leg AS (
  SELECT
    l.*,
    (SELECT exp(sum(ln(greatest(1 + d.daily_return_pct / 100, 1e-9))))
     FROM fact_fund_daily d
     WHERE d.fund_code = l.fund_code AND d.daily_return_pct IS NOT NULL
       AND d.trade_date > l.start_date)                      AS m_start,
    coalesce((SELECT exp(sum(ln(greatest(1 + d.daily_return_pct / 100, 1e-9))))
              FROM fact_fund_daily d
              WHERE d.fund_code = l.fund_code AND d.daily_return_pct IS NOT NULL
                AND d.trade_date > l.end_date), 1)           AS m_end,
    (SELECT count(*)
     FROM fact_fund_daily d
     WHERE d.fund_code = l.fund_code AND d.daily_return_pct IS NOT NULL
       AND d.trade_date > l.start_date AND d.trade_date <= l.end_date) AS days
  FROM analytics.position_leg l
), tl AS (
  SELECT leg.*,
         nav.nav_per_share / coalesce(leg.m_start, 1) AS nav_buy,
         nav.nav_per_share / leg.m_end   AS nav_end
  FROM leg
  LEFT JOIN analytics.fund_latest nav USING (fund_code)
  WHERE leg.start_date <= (SELECT max(trade_date) FROM fact_fund_daily
                            WHERE daily_return_pct IS NOT NULL)
)
SELECT
  tl.user_id,
  tl.fund_code,
  f.title,
  tl.is_open,
  tl.simulated,
  min(tl.start_date)                                         AS first_date,
  max(tl.days)                                               AS days,
  round((sum(tl.units * tl.nav_end) / sum(tl.units * tl.nav_buy) - 1) * 100, 4) AS return_pct,
  CASE WHEN tl.simulated THEN NULL ELSE sum(tl.units) END                       AS units,
  CASE WHEN tl.simulated THEN NULL ELSE round(sum(tl.units * tl.nav_buy), 2) END AS cost,
  CASE WHEN tl.simulated THEN NULL ELSE round(sum(tl.units * tl.nav_end), 2) END AS value,
  CASE WHEN tl.simulated THEN NULL
       ELSE round(sum(tl.units * (tl.nav_end - tl.nav_buy)), 2) END              AS gain
FROM tl
LEFT JOIN dim_fund f USING (fund_code)
GROUP BY tl.user_id, tl.fund_code, f.title, tl.is_open, tl.simulated;

-- position_slice
CREATE OR REPLACE VIEW analytics.position_slice AS
WITH son AS (
  SELECT max(trade_date) AS d FROM fact_fund_daily WHERE daily_return_pct IS NOT NULL
), leg AS (
  SELECT
    p.id, p.user_id, p.fund_code, p.platform, p.units,
    p.trade_date AS start_date,
    CASE
      WHEN p.sell_date IS NULL OR p.sell_date > (SELECT d FROM son) THEN (SELECT d FROM son)
      ELSE p.sell_date
    END AS end_date,
    (p.sell_date IS NULL OR p.sell_date > current_date) AS is_open
  FROM analytics.settled_transaction p
), carpan AS (
  SELECT
    leg.*,
    (SELECT exp(sum(ln(greatest(1 + d.daily_return_pct / 100, 1e-9))))
     FROM fact_fund_daily d
     WHERE d.fund_code = leg.fund_code AND d.daily_return_pct IS NOT NULL
       AND d.trade_date > leg.start_date)                    AS m_start,
    coalesce((SELECT exp(sum(ln(greatest(1 + d.daily_return_pct / 100, 1e-9))))
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
  round(c.units * nav.nav_per_share / coalesce(c.m_start, 1), 2) AS cost,
  round(c.units * nav.nav_per_share / c.m_end, 2)   AS value
FROM carpan c
JOIN analytics.fund_latest nav USING (fund_code)
LEFT JOIN dim_fund f ON f.fund_code = c.fund_code
WHERE c.start_date <= (SELECT d FROM son);
