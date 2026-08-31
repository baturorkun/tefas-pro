-- Takip listesi = bende OLMAYAN fonlar.
--
-- 014'ten sonra iki liste tamamen üst üste bindi: 36 takip satırının 26'sı
-- zaten sahip olunan fonlardı. "Portföyüm" ve "takip listem" ayrı iki soru
-- olmalı — biri elimdekiler, diğeri aday olarak izlediklerim.
--
-- Satır silinmiyor, gösterilirken süzülüyor. Sebep: bir fondan tamamen
-- çıkıldığında takip listesinde kendiliğinden geri belirsin. Silseydik
-- kullanıcı her satıştan sonra fonu elle geri eklemek zorunda kalırdı, oysa
-- satıştan sonraki dönem tam da izlemek istediği dönem.
--
-- Alınan fonun satırı da korunduğu için notu ve eklenme tarihi kaybolmuyor.
CREATE VIEW analytics.watchlist_visible AS
SELECT w.user_id, w.fund_code, w.added_at, w.note
FROM user_watchlist w
WHERE NOT EXISTS (
  SELECT 1 FROM portfolio_transaction p
  WHERE p.user_id = w.user_id
    AND p.fund_code = w.fund_code
    AND p.sell_date IS NULL
);
