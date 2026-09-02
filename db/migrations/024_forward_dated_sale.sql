-- İleri tarihli satış bugünden kapalı sayılmasın.
--
-- sell_date gerçekleşme tarihidir: TEFAS'ta satış emri valör günü sonra
-- fiyatlanır ve kullanıcı gerçekleşeceği günü giriyor, dolayısıyla tarih
-- ileride olabilir. Eski tanım açıklığı yalnız `sell_date IS NULL` ile
-- belirlediği için, henüz gerçekleşmemiş satışı olan pozisyon bugünden
-- portföyden düşüyordu.
--
-- 2026-09-02'de ölçülen etki: IJC (09-07), PIL (09-07) ve KHA'nın 08-14 alımı
-- (09-04) portföyde görünmüyordu; üçü de hâlâ elde ve fiyat riski sürüyor.
--
-- Açıklık current_date ile belirlenir — soru "bu satış gerçekleşti mi", ve
-- cevabı takvim gününe bağlı. Değerleme ise fiyat verisinin bittiği günle
-- sınırlı: gerçekleşmemiş satışta pozisyon son veri gününe kadar değerlenir,
-- ileri bir güne kadar değil.
--
-- CASCADE kullanılmıyor: bağımlıyı sessizce düşürmek yerine hangi view'in
-- yeniden kurulacağı burada açıkça yazıyor. Tek bağımlı position_return.
DROP VIEW IF EXISTS analytics.position_return;
DROP VIEW IF EXISTS analytics.position_leg;

CREATE VIEW analytics.position_leg AS
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
FROM portfolio_transaction p
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

-- position_return değişmedi; position_leg düştüğü için yeniden kuruluyor.
CREATE VIEW analytics.position_return AS
WITH son AS (
  SELECT max(trade_date) AS d FROM fact_fund_daily WHERE daily_return_pct IS NOT NULL
), leg AS (
  SELECT
    l.*,
    (SELECT exp(sum(ln(1 + d.daily_return_pct / 100)))
     FROM fact_fund_daily d
     WHERE d.fund_code = l.fund_code AND d.daily_return_pct IS NOT NULL
       AND d.trade_date > l.start_date)                      AS m_start,
    coalesce((SELECT exp(sum(ln(1 + d.daily_return_pct / 100)))
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
         nav.nav_per_share / leg.m_start AS nav_buy,
         nav.nav_per_share / leg.m_end   AS nav_end
  FROM leg
  LEFT JOIN analytics.fund_latest nav USING (fund_code)
  WHERE leg.days > 0 AND leg.m_start IS NOT NULL
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
