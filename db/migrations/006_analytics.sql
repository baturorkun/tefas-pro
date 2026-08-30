CREATE SCHEMA IF NOT EXISTS analytics;

-- Takip listesinin tek sorguluk özeti: her fonun son NAV'ı, son günlük getirisi
-- ve son net akışı. Alanlar farklı endpoint'lerden geldiği için en son doldukları
-- gün farklı olabilir; her biri kendi son dolu gününden alınır ve o günün tarihi
-- ayrıca verilir, böylece bayat bir alan sessizce güncel görünmez.
CREATE VIEW analytics.watchlist_latest AS
SELECT
  w.fund_code,
  w.status,
  f.title,
  f.fund_type,
  nav.trade_date       AS nav_date,
  nav.nav_per_share,
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
FROM watchlist w
JOIN dim_fund f USING (fund_code)
LEFT JOIN dim_fund_terms t USING (fund_code)
LEFT JOIN LATERAL (
  SELECT trade_date, nav_per_share FROM fact_fund_daily d
  WHERE d.fund_code = w.fund_code AND d.nav_per_share IS NOT NULL
  ORDER BY trade_date DESC LIMIT 1
) nav ON true
LEFT JOIN LATERAL (
  SELECT trade_date, daily_return_pct FROM fact_fund_daily d
  WHERE d.fund_code = w.fund_code AND d.daily_return_pct IS NOT NULL
  ORDER BY trade_date DESC LIMIT 1
) ret ON true
LEFT JOIN LATERAL (
  SELECT trade_date, net_flow FROM fact_fund_daily d
  WHERE d.fund_code = w.fund_code AND d.net_flow IS NOT NULL
  ORDER BY trade_date DESC LIMIT 1
) flow ON true
LEFT JOIN LATERAL (
  SELECT shares_active, investor_count FROM fact_fund_daily d
  WHERE d.fund_code = w.fund_code AND d.shares_active IS NOT NULL
  ORDER BY trade_date DESC LIMIT 1
) snap ON true;

-- Takip listesinin günlük serisi, akış ve getiri yan yana. Çıkış dalgası
-- aramanın başlangıç noktası budur.
CREATE VIEW analytics.watchlist_daily AS
SELECT
  d.fund_code,
  w.status,
  d.trade_date,
  d.nav_per_share,
  d.daily_return_pct,
  d.net_flow,
  d.shares_active,
  d.investor_count
FROM fact_fund_daily d
JOIN watchlist w USING (fund_code);

-- Son dolu snapshot üzerinden varlık dağılımı.
CREATE VIEW analytics.watchlist_allocation AS
SELECT a.fund_code, a.as_of_date, a.asset_class, a.weight_pct
FROM fact_fund_allocation a
JOIN watchlist w USING (fund_code)
WHERE a.as_of_date = (
  SELECT max(as_of_date) FROM fact_fund_allocation x WHERE x.fund_code = a.fund_code
);
