-- Kullanıcı kimlik alanları: ad soyad zorunlu, e-posta zorunlu, Telegram
-- isteğe bağlı.
--
-- full_name NOT NULL yapılabiliyor çünkü doldurulacak bir kaynak var:
-- username. O da kullanıcının kendi seçtiği görünen ad ve bugün ekranda
-- zaten o yazıyor — yerine bir şey uydurulmuş olmuyor.
UPDATE app_user SET full_name = username WHERE full_name IS NULL OR btrim(full_name) = '';
ALTER TABLE app_user ALTER COLUMN full_name SET NOT NULL;
ALTER TABLE app_user ADD CONSTRAINT app_user_full_name_not_blank
  CHECK (btrim(full_name) <> '');

-- e-posta NULL kalabiliyor. Sebep: doldurulacak bir kaynak YOK ve
-- "kullanici@local" gibi bir değer yazmak, olmayan bir adresi varmış gibi
-- göstermek olurdu — sonradan oraya posta göndermeye kalkan bir kod için
-- sessiz bir tuzak. Onun yerine zorunluluk YAZMA yollarında: hesap açarken
-- ve profil/kullanıcı formu kaydedilirken isteniyor, dolayısıyla eli değen
-- her kayıt dolduruluyor. Eksik kalanlar Kullanıcılar ekranında işaretli.
ALTER TABLE app_user ADD COLUMN email text;
ALTER TABLE app_user ADD CONSTRAINT app_user_email_shape
  CHECK (email IS NULL OR email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

-- Aynı adres iki hesapta olmamalı; benzersizlik küçük harfe göre, tıpkı
-- username'de olduğu gibi. Kısmi index: NULL'lar birbiriyle çakışmıyor.
CREATE UNIQUE INDEX app_user_email_key ON app_user (lower(email))
  WHERE email IS NOT NULL;

-- Telegram kullanıcı adı. Başındaki @ saklanmıyor: kullanıcı bazen yazıyor
-- bazen yazmıyor ve iki farklı kayıt aynı hesabı gösterirdi.
ALTER TABLE app_user ADD COLUMN telegram text;
ALTER TABLE app_user ADD CONSTRAINT app_user_telegram_shape
  CHECK (telegram IS NULL OR telegram ~ '^[A-Za-z0-9_]{5,32}$');

COMMENT ON COLUMN app_user.full_name IS 'Görünen ad. Zorunlu.';
COMMENT ON COLUMN app_user.email IS
  'E-posta. Yazma yollarında zorunlu; alanın eklenmesinden önceki kayıtlarda '
  'boş olabilir — uydurma adres yazmamak için.';
COMMENT ON COLUMN app_user.telegram IS 'Telegram kullanıcı adı, @ olmadan. İsteğe bağlı.';
