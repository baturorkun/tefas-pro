-- Collector kümesinden kapalı pozisyonlar çıkıyor.
--
-- 015'te portföyün tamamı kümeye giriyordu. Gerekçe şuydu: kullanıcı fonu
-- takip listesinden çıkarsa ama açık pozisyonu duruyorsa verisi kesilmemeli.
-- Bu gerekçe yalnız AÇIK pozisyon için geçerli — kapalı pozisyon da kümede
-- olunca aylar önce çıkılmış ve takip listesinden de silinmiş bir fon
-- sonsuza kadar toplanıyordu.
--
-- Satılmış bir fonu izlemeye devam etmek isteyen onu takip listesinde tutar;
-- bu artık kullanıcının kararı, portföy geçmişinin yan etkisi değil.
--
-- Kapalı pozisyonun kâr/zarar hesabı bundan etkilenmez: satış tarihine kadarki
-- NAV zaten fact_fund_daily'de duruyor, silinmiyor.
CREATE OR REPLACE VIEW analytics.tracked_fund AS
SELECT fund_code FROM user_watchlist
UNION
SELECT fund_code FROM portfolio_transaction WHERE sell_date IS NULL;
