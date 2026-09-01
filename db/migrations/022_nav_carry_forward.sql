-- NAV'ı son veri gününe taşır ve fund_returns'e 3 aylık pencere ekler.
--
-- fund_latest fonun son DOLU NAV'ını veriyordu. Kaynak NAV'ı bazı fonlar için
-- geç yayımlıyor: 2026-08-31 akşamı 36 fonun 33'ünde NAV vardı, TMG, TAU ve
-- IKP 28 Ağustos'ta kalmıştı. O üç fonun toplam pozisyon değeri 123.212 TL ve
-- panel onları üç gün eski fiyattan gösteriyordu.
--
-- Getiri serisi eksiksiz olduğu için NAV taşınabilir:
--   nav_bugün = son_dolu_nav × Π(1 + günlük_getiri/100)
--
-- Doğrulandı — kullanıcının bağımsız raporundaki fiyatlarla birebir:
--   TMG 1,4516 → 1,4636   TAU 0,6428 → 0,6509   IKP 9,2380 → 9,2519
--
-- nav_date korunuyor: taşınmış bir fiyat, ölçülmüş fiyat gibi görünmemeli.
-- Arayüz hangi günden taşındığını gösterebilsin.
-- CASCADE kullanilmiyor: bagimlilari sessizce dusurup unutmak yerine hangi
-- view'in yeniden kurulacagi burada acikca yaziyor. Tek bagimli
-- position_return.
DROP VIEW IF EXISTS analytics.position_return;
DROP VIEW IF EXISTS analytics.fund_latest;

CREATE VIEW analytics.fund_latest AS
WITH son AS (
  SELECT max(trade_date) AS d FROM fact_fund_daily WHERE daily_return_pct IS NOT NULL
)
SELECT
  f.fund_code,
  f.title,
  f.fund_type,
  nav.trade_date       AS nav_date,
  -- Kayıtlı NAV, nav_date'ten son veri gününe kadarki getirilerle taşınır.
  -- NAV zaten güncelse çarpan 1 olur ve değer değişmez.
  nav.nav_per_share * coalesce((
    SELECT exp(sum(ln(1 + d.daily_return_pct / 100)))
    FROM fact_fund_daily d, son
    WHERE d.fund_code = f.fund_code AND d.daily_return_pct IS NOT NULL
      AND d.trade_date > nav.trade_date AND d.trade_date <= son.d
  ), 1)                AS nav_per_share,
  nav.nav_per_share    AS nav_recorded,
  (SELECT d FROM son)  AS as_of_date,
  ret.trade_date       AS return_date,
  ret.daily_return_pct,
  flow.trade_date      AS flow_date,
  flow.net_flow,
  snap.shares_active,
  snap.investor_count,
  t.tax_pct,
  t.management_fee_pct,
  t.buy_valor_days,
  t.sell_valor_days
FROM dim_fund f
LEFT JOIN dim_fund_terms t USING (fund_code)
LEFT JOIN LATERAL (
  SELECT trade_date, nav_per_share FROM fact_fund_daily d
  WHERE d.fund_code = f.fund_code AND d.nav_per_share IS NOT NULL
  ORDER BY trade_date DESC LIMIT 1
) nav ON true
LEFT JOIN LATERAL (
  SELECT trade_date, daily_return_pct FROM fact_fund_daily d
  WHERE d.fund_code = f.fund_code AND d.daily_return_pct IS NOT NULL
  ORDER BY trade_date DESC LIMIT 1
) ret ON true
LEFT JOIN LATERAL (
  SELECT trade_date, net_flow FROM fact_fund_daily d
  WHERE d.fund_code = f.fund_code AND d.net_flow IS NOT NULL
  ORDER BY trade_date DESC LIMIT 1
) flow ON true
LEFT JOIN LATERAL (
  SELECT shares_active, investor_count FROM fact_fund_daily d
  WHERE d.fund_code = f.fund_code AND d.shares_active IS NOT NULL
  ORDER BY trade_date DESC LIMIT 1
) snap ON true;

-- fund_returns'e 3 aylık pencere. Portföy tablosunda fonun kendi 1 ay ve 3 ay
-- getirisi, kullanıcının kendi getirisinin yanında referans olarak duruyor.
DROP VIEW IF EXISTS analytics.fund_returns;

CREATE VIEW analytics.fund_returns AS
WITH son AS (
  SELECT max(trade_date) AS d FROM fact_fund_daily WHERE daily_return_pct IS NOT NULL
)
SELECT
  d.fund_code,
  f.title,
  (SELECT d FROM son) AS as_of_date,
  round((exp(sum(ln(greatest(1 + d.daily_return_pct / 100, 1e-9)))
         FILTER (WHERE d.trade_date > (SELECT d FROM son) - 7)) - 1) * 100, 4)  AS return_1w,
  count(*) FILTER (WHERE d.trade_date > (SELECT d FROM son) - 7)                AS days_1w,
  round((exp(sum(ln(greatest(1 + d.daily_return_pct / 100, 1e-9)))
         FILTER (WHERE d.trade_date > (SELECT d FROM son) - 30)) - 1) * 100, 4) AS return_1m,
  count(*) FILTER (WHERE d.trade_date > (SELECT d FROM son) - 30)               AS days_1m,
  round((exp(sum(ln(greatest(1 + d.daily_return_pct / 100, 1e-9)))
         FILTER (WHERE d.trade_date > (SELECT d FROM son) - 91)) - 1) * 100, 4) AS return_3m,
  count(*) FILTER (WHERE d.trade_date > (SELECT d FROM son) - 91)               AS days_3m
FROM fact_fund_daily d
LEFT JOIN dim_fund f USING (fund_code)
WHERE d.daily_return_pct IS NOT NULL
GROUP BY d.fund_code, f.title;

-- position_return yeniden kurulur: fund_latest degisti, ayrica adet toplami
-- portfoy tablosunda gosterilecek.
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
