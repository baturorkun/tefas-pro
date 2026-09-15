-- Menkul kıymet kodları tek biçime getiriliyor.
--
-- Bazı fon şablonları borsa sonekini yazıyor (AKBNK.E), bazıları yazmıyor
-- (AKBNK). Ölçüldü: KAP'tan toplanan 1327 ayrı kodun 139'u sonekli ve
-- bunların 120'sinin sadesi de ayrıca kayıtlıydı — aynı menkul kıymet iki
-- kodla sayılıyordu. Fon detay ekranı ve hisseye göre yapılan her toplama
-- bundan etkileniyordu.
--
-- Ayrıca tamamı rakam olan kodlar temizleniyor: bunlar hisse değil, PDF'ten
-- yanlış çıkarılmış tablo satırları.

BEGIN;

-- Sonek ayrıldığında aynı (fon, tarih, kod) iki satıra düşebilir. Böyle bir
-- durumda ağırlıklar toplanmaz — aynı kıymet iki kez yazıldığı için ikisi de
-- aynı pozisyonu anlatıyor; en güncel yazılan kayıt geçerli sayılır.
WITH normalize AS (
  SELECT ctid,
         fund_code, as_of_date,
         split_part(stock_code, '.', 1) AS yeni_kod,
         stock_code,
         row_number() OVER (
           PARTITION BY fund_code, as_of_date, split_part(stock_code, '.', 1)
           ORDER BY updated_at DESC, stock_code
         ) AS sira
    FROM fund_stock_holding
   WHERE stock_code LIKE '%.%'
      OR EXISTS (
        SELECT 1 FROM fund_stock_holding b
         WHERE b.fund_code = fund_stock_holding.fund_code
           AND b.as_of_date = fund_stock_holding.as_of_date
           AND b.stock_code <> fund_stock_holding.stock_code
           AND split_part(b.stock_code, '.', 1) = split_part(fund_stock_holding.stock_code, '.', 1)
      )
)
DELETE FROM fund_stock_holding h
 USING normalize n
 WHERE h.ctid = n.ctid AND n.sira > 1;

UPDATE fund_stock_holding
   SET stock_code = split_part(stock_code, '.', 1), updated_at = now()
 WHERE stock_code LIKE '%.%'
   AND split_part(stock_code, '.', 1) <> '';

-- Hisse olmayan kodlar: icinde hic harf yok.
DELETE FROM fund_stock_holding WHERE stock_code !~ '[A-ZÇĞİÖŞÜa-zçğıöşü]';

-- Fiyat tablosunda da aynı ayrım olabilir.
DELETE FROM fact_stock_daily a
 USING fact_stock_daily b
 WHERE a.stock_code LIKE '%.%'
   AND b.stock_code = split_part(a.stock_code, '.', 1)
   AND b.trade_date = a.trade_date;

UPDATE fact_stock_daily
   SET stock_code = split_part(stock_code, '.', 1)
 WHERE stock_code LIKE '%.%'
   AND split_part(stock_code, '.', 1) <> '';

COMMIT;
