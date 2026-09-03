-- Banka adı serbest metindi. Aynı banka "Nkolay", "nkolay", "NKolay" diye üç
-- ayrı platform gibi görünebiliyordu ve maliyet takibi platform bazında
-- yapıldığı için bu doğrudan yanlış rakam üretirdi.
--
-- Liste app_setting içinde JSON olarak tutulmuyor: tatillere hiçbir satır
-- referans vermiyor ama banka adına işlem satırları bakıyor. Foreign key
-- olunca "kullanılmayan banka silinebilir" kuralı veritabanının garantisi
-- oluyor; uygulama kodundaki bir kontrol db/sync.sh veya doğrudan psql gibi
-- diğer yazma yollarında atlanırdı.
CREATE TABLE bank (
  name       text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE bank IS
  'İşlem yapılan banka/platform tanımları. portfolio_transaction.platform buraya bağlıdır.';

-- Mevcut işlemlerdeki bankalar taşınır; hiçbir satır sahipsiz kalmamalı.
INSERT INTO bank (name)
SELECT DISTINCT platform FROM portfolio_transaction
ON CONFLICT DO NOTHING;

-- ON UPDATE CASCADE: bankanın adı değişince bütün işlem satırları atomik
-- güncellenir. Birincil anahtar integer id değil ad olduğu için rename'in
-- tek maliyeti bu; buna karşılık platform sütununu ve onu kullanan
-- analytics.closed_position view'ını, API yanıtlarını ve arayüzü hiç
-- değiştirmeden foreign key eklenebiliyor.
--
-- ON DELETE RESTRICT: kullanılan banka silinemez.
ALTER TABLE portfolio_transaction
  ADD CONSTRAINT portfolio_transaction_platform_fkey
  FOREIGN KEY (platform) REFERENCES bank (name)
  ON UPDATE CASCADE ON DELETE RESTRICT;
