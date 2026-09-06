-- Kullanıcının görünen adı.
--
-- Zorunlu değil: kimliği taşıyan alan `username` ve o zaten var. Ad soyad
-- yalnız arayüzde "kim" sorusuna insanca cevap veriyor. NOT NULL yapılsaydı
-- var olan hesaplara uydurma bir değer yazmak gerekirdi.
--
-- Ayrı bir "profil" tablosu açılmadı: tek bir isteğe bağlı alan için ikinci
-- tablo, her okumada bir JOIN ve "satırı yoksa" kolu demek olurdu.
ALTER TABLE app_user ADD COLUMN full_name text;

COMMENT ON COLUMN app_user.full_name IS
  'Görünen ad. İsteğe bağlı; kimlik username üzerinden taşınır.';
