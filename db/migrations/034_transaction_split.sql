-- Kısmi satışta alım kaydı ikiye bölünüyor: satılan adet satış tarihini alıyor,
-- kalan adet açık kalıyor. İki parça da aynı alış tarihini ve bankayı taşıdığı
-- için alış fiyatları da aynı; maliyet adetle doğru orantılı olduğundan toplam
-- bozulmuyor.
--
-- Alternatif, satıra "satılan adet" sütunu koyup tek satırı yarı açık yarı
-- kapalı tutmaktı. Bugün her hesap "bir satır = bir alım, ya açık ya kapalı"
-- varsayımına dayanıyor (position_slice, closed_position, position_leg,
-- portfolio_daily); yarı-açık satır hepsini yeniden yazmayı gerektirirdi.
--
-- split_from_id, bölmeyle oluşan yeni satırın hangi kayıttan geldiğini söyler.
-- Kullanıcının kendi yazmadığı bir satırın nereden çıktığı görünmeli.
ALTER TABLE portfolio_transaction
  ADD COLUMN split_from_id integer REFERENCES portfolio_transaction(id) ON DELETE SET NULL;

CREATE INDEX portfolio_transaction_split_idx ON portfolio_transaction (split_from_id)
  WHERE split_from_id IS NOT NULL;

COMMENT ON COLUMN portfolio_transaction.split_from_id IS
  'Kısmi satışta bölünen alım kaydının kimliği. Boşsa satır kullanıcının kendi girdiğidir.';
