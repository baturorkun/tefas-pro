-- Açık pozisyonu olan fon takip listesinde de sayılıyordu.
--
-- watchlist_visible açıklığı `sell_date IS NULL` diye ölçüyordu. RQ-0024'te
-- analytics.position_leg ileri tarihli satışı da açık saymaya başladı
-- (`sell_date IS NULL OR sell_date > current_date`) ama bu view eski tanımda
-- kaldı; iki tanım ayrıştı.
--
-- Sonuç: satış emri verilmiş ama gerçekleşmemiş bir fon "artık elimde yok"
-- sayılıyor ve position_return'e hem gerçek bacağı hem takip listesi bacağı
-- giriyordu. Panel'deki "En çok kazandıran pozisyonlarım" grafiğinde DFI iki
-- kez görünüyordu: altı açık bacağın beşi gerçek, biri simüle.
--
-- Hata ancak ileri tarihli satış varken ortaya çıkıyor, bu yüzden sessizce
-- duruyordu.
CREATE OR REPLACE VIEW analytics.watchlist_visible AS
SELECT w.user_id, w.fund_code, w.added_at, w.note
FROM user_watchlist w
WHERE NOT EXISTS (
  SELECT 1 FROM portfolio_transaction p
  WHERE p.user_id = w.user_id
    AND p.fund_code = w.fund_code
    -- position_leg ile aynı ifade. Tamamen satılmış fon listede kalmaya devam
    -- eder: listeden çıkmak kullanıcının kararı, portföy geçmişinin yan etkisi
    -- değil.
    AND (p.sell_date IS NULL OR p.sell_date > current_date)
);

COMMENT ON VIEW analytics.watchlist_visible IS
  'Takip listesinden açık pozisyonu olan fonlar düşülmüş hali. Açıklık kuralı position_leg ile aynıdır: ileri tarihli satış hâlâ açıktır.';
