-- Veritabanı takip listesiyle sınırlanır.
--
-- Toplu endpoint'ler evrenin tamamını döndürüyor (/funds/ 2822, /funds/yield/
-- 2395) ve RQ-0002 bunların hepsini yazıyordu. Zaman serisi zaten yalnız takip
-- listesi içindi; katalog ve getiri snapshot'ı da aynı sınıra çekilir.
--
-- Sonucu: takip listesine yeni fon eklerken kod/unvan araması bu tablodan
-- değil, o an /funds/ çağrılarak yapılır. Fon ekleme seyrek ve etkileşimli bir
-- işlem olduğu için canlı çağrı uygundur.
DELETE FROM fact_fund_yield_snapshot
WHERE fund_code NOT IN (SELECT fund_code FROM watchlist);

DELETE FROM fact_fund_allocation
WHERE fund_code NOT IN (SELECT fund_code FROM watchlist);

DELETE FROM fact_fund_daily
WHERE fund_code NOT IN (SELECT fund_code FROM watchlist);

DELETE FROM dim_fund_terms
WHERE fund_code NOT IN (SELECT fund_code FROM watchlist);

DELETE FROM dim_fund
WHERE fund_code NOT IN (SELECT fund_code FROM watchlist);
