-- Sistem ayarları ve emir tarihleri.
--
-- Kullanıcı valörü elden hesaplayıp gerçekleşme tarihini giriyordu: IJC için
-- 09-07, KHA için 09-04 böyle bulundu. Sistem valörü zaten biliyor
-- (dim_fund_terms), eksik olan tek şey ileri tarihli iş günü hesabı için
-- gereken tatil listesiydi.
--
-- Geçmiş için tatil listesine gerek yok: fonlar yalnız piyasanın açık olduğu
-- günlerde fiyatlanıyor, dolayısıyla hafta içi olup verisi bulunmayan gün
-- tatildir. Ama emir verildiği anda ileriki günlerin verisi henüz yok; liste
-- bunun için gerekli.
CREATE TABLE IF NOT EXISTS app_setting (
  key         text PRIMARY KEY,
  value       jsonb       NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  integer     REFERENCES app_user(id)
);

COMMENT ON TABLE app_setting IS
  'Yöneticinin değiştirebildiği genel ayarlar. Değer JSON: her ayar kendi şeklini taşır.';

-- Resmî tatiller iki biçimde tutulur:
--
--   AA-GG       her yıl tekrarlayan sabit tatil
--   YYYY-AA-GG  yalnız o yıla ait tatil
--
-- Sabit tatilleri yıl yazarak tutmak listeyi her sene elden geçirmeyi
-- gerektirirdi: 23 Nisan her yıl 23 Nisan. Yıl yalnız hicrî takvimle kayan
-- dinî bayramlarda gerekli, dolayısıyla yılda yalnız iki giriş güncellenir.
--
-- 2026 bayram tarihleri fiyat verisinden doğrulandı: o günlerde hiçbir fon
-- fiyatlanmamış.
INSERT INTO app_setting (key, value) VALUES (
  'holidays',
  '["01-01","04-23","05-01","05-19","07-15","08-30","10-29",
    "2026-03-20","2026-05-27","2026-05-28","2026-05-29"]'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- Emir tarihleri. Hesaplarda kullanılmaz; değerleme hâlâ gerçekleşme
-- tarihinden yürür. İstatistik olarak durur ve formun iki yönlü hesabını
-- besler.
ALTER TABLE portfolio_transaction
  ADD COLUMN IF NOT EXISTS buy_order_date  date,
  ADD COLUMN IF NOT EXISTS sell_order_date date;

COMMENT ON COLUMN portfolio_transaction.buy_order_date IS
  'Alış emrinin verildiği gün. Değerleme trade_date üzerinden yürür; bu alan istatistiktir.';
COMMENT ON COLUMN portfolio_transaction.sell_order_date IS
  'Satış emrinin verildiği gün. Değerleme sell_date üzerinden yürür; bu alan istatistiktir.';

-- Satış emri yokken satış tarihi de olmamalı: emir verilmeden pozisyon
-- kapanmaz. Tersi serbest — eski kayıtlarda emir tarihi yok.
ALTER TABLE portfolio_transaction
  DROP CONSTRAINT IF EXISTS portfolio_transaction_sell_order_requires_sale;
ALTER TABLE portfolio_transaction
  ADD CONSTRAINT portfolio_transaction_sell_order_requires_sale
  CHECK (sell_order_date IS NULL OR sell_date IS NOT NULL);
