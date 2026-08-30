-- Aylık değerler tabloya yazılmaz, burada günlük seriden hesaplanır.
--
-- Doğrulandı (2026 Temmuz): bileşik günlük getiri, API'nin kendi aylık
-- penceresiyle dört ondalıkta aynı — DFI %14,0042, IVY %-4,3217, THF %-3,1153.
-- Aylık net akış ise iki kaynakta %1-10 ayrışıyor ve güvenilir olan buradaki:
-- fon başına günlük seri AUM aritmetiğiyle %0,001 içinde uyuşuyor, toplu
-- endpoint'in cumulative_cashflow alanı 5 kat sapıyor.
CREATE VIEW analytics.watchlist_monthly AS
SELECT
  d.fund_code,
  date_trunc('month', d.trade_date)::date AS month_start,
  (date_trunc('month', d.trade_date) + interval '1 month' - interval '1 day')::date AS month_end,
  sum(d.net_flow)                                        AS net_flow,
  count(d.net_flow)                                      AS flow_days,
  -- FILTER şart: greatest() NULL'ı yok sayar, greatest(NULL, 1e-9) = 1e-9
  -- döndürür. Getirisi olmayan satırlar (yalnız akış veya AUM taşıyanlar)
  -- toplama ln(1e-9) = -20.7 ekleyip sonucu -%100'e çakardı.
  -- greatest() ise tam kayıp bir günde (getiri <= -%100) ln'in tanımsız
  -- olmasını engeller; pratikte görülmez, view hata vermesin diye durur.
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
JOIN watchlist w USING (fund_code)
GROUP BY d.fund_code, date_trunc('month', d.trade_date);
