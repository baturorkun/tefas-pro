-- Takip listesinin 1 haftalık ve 1 aylık bileşik getirisi.
--
-- Getiri tabloya yazılmaz, burada günlük seriden hesaplanır. Yöntem RQ-0003'te
-- doğrulandı: bileşik günlük getiri, API'nin kendi aylık penceresiyle dört
-- ondalıkta aynı çıkıyor (THF 2026 Temmuz: -%3,1153).
--
-- Pencere son veri gününe göre kayar, takvim gününe değil: hafta sonunda veya
-- tatilde "son 7 gün" boş kalmasın.
--
-- days_* alanı zorunludur: yeni eklenmiş bir fon pencerede iki gün taşıyıp
-- yanıltıcı biçimde başa geçebilir, kaç iş günüyle hesaplandığı görünmelidir.
CREATE VIEW analytics.watchlist_returns AS
WITH son AS (
  SELECT max(trade_date) AS d FROM fact_fund_daily WHERE daily_return_pct IS NOT NULL
)
SELECT
  d.fund_code,
  f.title,
  w.status,
  (SELECT d FROM son) AS as_of_date,
  round((exp(sum(ln(greatest(1 + d.daily_return_pct / 100, 1e-9)))
         FILTER (WHERE d.trade_date > (SELECT d FROM son) - 7)) - 1) * 100, 4)  AS return_1w,
  count(*) FILTER (WHERE d.trade_date > (SELECT d FROM son) - 7)                AS days_1w,
  round((exp(sum(ln(greatest(1 + d.daily_return_pct / 100, 1e-9)))
         FILTER (WHERE d.trade_date > (SELECT d FROM son) - 30)) - 1) * 100, 4) AS return_1m,
  count(*) FILTER (WHERE d.trade_date > (SELECT d FROM son) - 30)               AS days_1m
FROM fact_fund_daily d
JOIN watchlist w USING (fund_code)
LEFT JOIN dim_fund f USING (fund_code)
WHERE d.daily_return_pct IS NOT NULL
GROUP BY d.fund_code, f.title, w.status;
