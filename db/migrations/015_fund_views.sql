-- View'lar artık takip listesine değil fona bakar; kullanıcıya göre süzme
-- sorgularda yapılır. Sebep: bir view parametre alamaz, oysa "hangi fonlar
-- benim" sorusunun cevabı kullanıcıya göre değişir.

-- Collector'ın toplayacağı fon kümesi. Elle tutulan bir liste değil, tüm
-- kullanıcıların takip listeleri ile portföylerinin birleşimi.
--
-- Portföyün de kümeye girmesi şart: bir kullanıcı fonu takip listesinden
-- çıkarsa ama açık pozisyonu duruyorsa verisi kesilmemelidir.
CREATE VIEW analytics.tracked_fund AS
SELECT fund_code FROM user_watchlist
UNION
SELECT fund_code FROM portfolio_transaction;

-- Fon başına son değerler. Alanlar farklı endpoint'lerden geldiği için en son
-- doldukları gün farklı olabilir; her biri kendi son dolu gününden alınır ve o
-- günün tarihi ayrıca verilir, böylece bayat bir alan güncel görünmez.
CREATE VIEW analytics.fund_latest AS
SELECT
  f.fund_code,
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

-- 1 haftalık ve 1 aylık bileşik getiri. Yöntem RQ-0003'te doğrulandı: aylık
-- bileşik, API'nin kendi aylık penceresiyle dört ondalıkta aynı çıkıyor.
--
-- Pencere son veri gününe göre kayar, takvim gününe değil: hafta sonunda veya
-- tatilde "son 7 gün" boş kalmasın.
--
-- days_* zorunludur: yeni eklenmiş bir fon pencerede iki gün taşıyıp yanıltıcı
-- biçimde başa geçebilir, kaç iş günüyle hesaplandığı görünmelidir.
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
  count(*) FILTER (WHERE d.trade_date > (SELECT d FROM son) - 30)               AS days_1m
FROM fact_fund_daily d
LEFT JOIN dim_fund f USING (fund_code)
WHERE d.daily_return_pct IS NOT NULL
GROUP BY d.fund_code, f.title;

CREATE VIEW analytics.fund_allocation AS
SELECT a.fund_code, a.as_of_date, a.asset_class, a.weight_pct
FROM fact_fund_allocation a
WHERE a.as_of_date = (
  SELECT max(as_of_date) FROM fact_fund_allocation x WHERE x.fund_code = a.fund_code
);

-- Aylık değerler tabloya yazılmaz, günlük seriden hesaplanır. Doğrulandı:
-- bileşik günlük getiri API'nin aylık penceresiyle dört ondalıkta aynı
-- (THF 2026 Temmuz: -%3,1153).
--
-- FILTER şart: greatest() NULL'ı yok sayar, greatest(NULL, 1e-9) = 1e-9
-- döndürür. Getirisi olmayan satırlar toplama ln(1e-9) = -20.7 ekleyip sonucu
-- -%100'e çakardı.
CREATE VIEW analytics.fund_monthly AS
SELECT
  d.fund_code,
  date_trunc('month', d.trade_date)::date AS month_start,
  (date_trunc('month', d.trade_date) + interval '1 month' - interval '1 day')::date AS month_end,
  sum(d.net_flow)                                        AS net_flow,
  count(d.net_flow)                                      AS flow_days,
  round(
    (exp(sum(ln(greatest(1 + d.daily_return_pct / 100, 1e-9)))
         FILTER (WHERE d.daily_return_pct IS NOT NULL)) - 1) * 100,
    4
  )                                                      AS return_pct,
  count(d.daily_return_pct)                              AS return_days,
  (array_agg(d.aum ORDER BY d.trade_date)
     FILTER (WHERE d.aum IS NOT NULL))[1]                AS start_aum,
  (array_agg(d.aum ORDER BY d.trade_date DESC)
     FILTER (WHERE d.aum IS NOT NULL))[1]                AS end_aum,
  (array_agg(d.investor_count ORDER BY d.trade_date DESC)
     FILTER (WHERE d.investor_count IS NOT NULL))[1]     AS end_investor_count
FROM fact_fund_daily d
GROUP BY d.fund_code, date_trunc('month', d.trade_date);
