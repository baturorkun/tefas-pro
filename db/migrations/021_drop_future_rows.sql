-- İleri tarihli satırları temizler.
--
-- Kaynak, yarın geçerli olacak fiyatı bu akşam yayımlıyor; collector onu
-- olduğu gibi yazıyordu. 2026-08-31 akşamı veritabanında 2026-09-01 için
-- 36 fonun 23'ünün getirisi vardı, akış ve yatırımcı sayısı hiç yoktu.
--
-- Zararı, view'ların "son veri günü"nü max(trade_date) ile bulması: yarım bir
-- gün en son gün olunca fund_returns çıpası 2026-09-01'e (23 fon), fund_flow
-- ve fund_investor çıpası 2026-08-31'e (36 fon) düşüyordu. Aynı panelde farklı
-- pencereler.
--
-- Europe/Istanbul açıkça yazılıyor: veritabanı Etc/UTC çalışıyor, current_date
-- gece yarısı ile 03:00 arasında bir gün geride kalır ve o saatte koşan bir
-- temizlik meşru veriyi silerdi. Fon piyasası Türkiye'de.
DELETE FROM fact_fund_daily
WHERE trade_date > (now() AT TIME ZONE 'Europe/Istanbul')::date;
