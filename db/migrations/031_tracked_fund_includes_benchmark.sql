-- Benchmark fonu toplanan fonlara girmiyordu.
--
-- tracked_fund yalnız takip listeleri ile açık pozisyonların birleşimiydi.
-- Benchmark fonu bunların ikisinde de olmak zorunda değil: TP2 şu an
-- toplanıyor ama yalnızca birinin takip listesinde olduğu için. O satır
-- silinseydi fon toplanmayı bırakır, karşılaştırma sütunu sessizce bayatlar
-- ve kimse fark etmezdi — hata vermez, yalnız yeni günlerde boş kalırdı.
--
-- Kullanıcı bazlı benchmark bunu büyütüyor: artık her kullanıcının ayrı bir
-- benchmark'ı olabilir ve hiçbirinin toplanacağı garanti değil.
--
-- Varsayılan benchmark ayara yazılır: yalnız kodda dururken view onu
-- göremiyordu, yani hiç kaydedilmemiş varsayılan da toplanmıyordu.
INSERT INTO app_setting (key, value) VALUES ('benchmark', '"TP2"'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE VIEW analytics.tracked_fund AS
SELECT fund_code FROM user_watchlist
UNION
SELECT fund_code FROM portfolio_transaction WHERE sell_date IS NULL
UNION
-- Genel ve kullanıcıya özel benchmark fonları. dim_fund kontrolü: ayar
-- tablolarında yabancı anahtar yok, tanımsız bir kod collector'ı her koşumda
-- hataya düşürürdü.
SELECT s.value #>> '{}' FROM app_setting s
 WHERE s.key = 'benchmark'
   AND EXISTS (SELECT 1 FROM dim_fund f WHERE f.fund_code = s.value #>> '{}')
UNION
SELECT u.value #>> '{}' FROM user_setting u
 WHERE u.key = 'benchmark'
   AND EXISTS (SELECT 1 FROM dim_fund f WHERE f.fund_code = u.value #>> '{}');

COMMENT ON VIEW analytics.tracked_fund IS
  'Collector''ın toplayacağı fonlar: takip listeleri, açık pozisyonlar ve benchmark fonları.';
