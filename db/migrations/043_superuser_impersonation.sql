-- Superuser ve kullanıcı geçişi.
--
-- Geçiş oturumda taşınıyor, ayrı bir tabloda değil: "kim baktı" ile "kimin
-- adına bakıldı" aynı satırda durunca geri dönüş tek bir UPDATE oluyor ve
-- oturum kapanınca geçiş de kendiliğinden bitiyor.
--
-- `user_id` her zaman GİRİŞ YAPAN kişi. Geçiş `acting_user_id` ile
-- gösteriliyor; tersini yapıp user_id'yi değiştirmek oturumun kime ait
-- olduğunu kaybettirirdi.

-- Üçüncü seviye. Admin kullanıcı yönetiyor; superuser başkasının verisini
-- görebiliyor. İkisi aynı yetkide toplanmıyor.
ALTER TABLE app_user DROP CONSTRAINT app_user_type_check;
ALTER TABLE app_user ADD CONSTRAINT app_user_type_check
  CHECK (type IN ('super', 'admin', 'user'));

ALTER TABLE app_session
  ADD COLUMN acting_user_id integer REFERENCES app_user(id) ON DELETE CASCADE;

-- Kendine geçiş anlamsız: geçiş yokken alan NULL olmalı, yoksa arayüz
-- "geçiş hâlindesin" der ve X hiçbir şeyi değiştirmez.
ALTER TABLE app_session ADD CONSTRAINT app_session_acting_differs
  CHECK (acting_user_id IS NULL OR acting_user_id <> user_id);

-- Kurulum admin'i superuser olur. Yeni bir yetki vermiyor: admin zaten
-- herkesin parolasını değiştirip o hesaba girebiliyordu. Geçiş bunu
-- görünür ve geri alınabilir hale getiriyor, gizli bir yol açmıyor.
UPDATE app_user SET type = 'super', updated_at = now()
 WHERE lower(username) = 'admin' AND type = 'admin';
