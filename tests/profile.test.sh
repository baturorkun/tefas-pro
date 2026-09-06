#!/usr/bin/env bash
# Profil ve kullanıcı menüsünün kuralları kaynak üzerinden korunur: bunlar
# bozulduğunda görsel bir hata çıkmaz, sessizce yanlış davranır.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
R="${PROJECT_ROOT}/src/server/repository.ts"
I="${PROJECT_ROOT}/src/server/index.ts"
M="${PROJECT_ROOT}/src/main.ts"

# Kullanıcı adı araması her yerde küçük harfe göre. Benzersizlik
# lower(username) üzerindeki unique index'te; tam eşleşme arayan bir yer,
# adı büyük harfle yazılmış hesabı bulamıyor. Ölçüldü: adı "_Prof" yapılmış
# bir hesap `drop _prof` ile bulunamıyordu, oysa o adla giriş yapılabiliyor.
for f in "${R}" "${PROJECT_ROOT}/src/db/user.ts" "${PROJECT_ROOT}/src/db/seed.ts"; do
  grep -nE "FROM app_user WHERE username = \\\$" "${f}" \
    && fail "tam eşleşmeli kullanıcı adı araması: ${f}"
done
grep -q "lower(username) = lower(\$1)" "${R}" || fail "giriş küçük harfe göre aramıyor"
grep -q "lower(username) = lower(\$1)" "${PROJECT_ROOT}/src/db/user.ts" \
  || fail "CLI küçük harfe göre aramıyor"
printf 'PASS: kullanıcı adı araması her yerde aynı kurala uyuyor\n'

# Kendi profilini güncelleme admin uçlarından ayrı ve kimlik oturumdan.
grep -q "updateProfile(pool, user.id" "${I}" || fail "profil kimliği oturumdan gelmiyor"
awk '/export async function updateProfile/,/^}/' "${R}" \
  | grep -q "AND id <> \$2" || fail "kullanıcı adı çakışması kendini saymalı"
awk '/export async function updateProfile/,/^}/' "${R}" \
  | grep -qE "type|is_active" && fail "profil ucu yetki alanlarına yazıyor"
printf 'PASS: kullanıcı yalnız kendi adını ve görünen adını değiştirebiliyor\n'

# Sonradan parola değiştirmek mevcut parolayı ister. Açık bırakılmış bir
# oturumun başına geçen biri, parolayı bilmeden hesabı devralabilirdi.
awk '/export async function changeOwnPassword/,/^}/' "${R}" \
  | grep -q "verifyPassword" || fail "mevcut parola doğrulanmıyor"
grep -q "Mevcut parola yanlış" "${I}" || fail "yanlış parola kolu yok"
# Zorunlu değişiklik ucu, parolasını belirlemiş kullanıcıya kapalı olmalı:
# açık kalsaydı mevcut parola sorma kuralı oradan atlanırdı.
grep -q "if (!user.mustChangePassword)" "${I}" || fail "/api/password kapısı yok"
printf 'PASS: parola değiştirmek mevcut parolayı istiyor, atlatılamıyor\n'

# Parola değişince kullanıcının bütün oturumları düşer. Yalnız çerezi silmek
# yetmez: değiştirmenin sebebi çoğu zaman "başkası girmiş olabilir".
grep -q "revokeUserSessions(pool, user.id)" "${I}" || fail "oturumlar düşürülmüyor"
printf 'PASS: parola değişince bütün oturumlar kapanıyor\n'

# Admin bağlantıları sol menünün ana listesinde olmamalı.
grep -q "inUserMenu: true" "${M}" || fail "kullanıcı menüsü işareti yok"
grep -q "v.inUserMenu !== true" "${M}" || fail "ana liste menü öğelerini ayıklamıyor"
for v in users runs settings profile; do
  grep -qE "id: '${v}',.*inUserMenu: true" "${M}" || fail "${v} kullanıcı menüsünde değil"
done
printf 'PASS: admin bağlantıları ve profil kullanıcı menüsünde\n'

# Menü dışarı tıklamayla ve Esc ile kapanmalı; açık kalan bir menü ekranı
# kapatır.
grep -q "if (e.key === 'Escape') menuKapat" "${M}" || fail "Esc kapatmıyor"
grep -q "if (!foot.contains(e.target as Node)) menuKapat" "${M}" || fail "dışarı tıklama kapatmıyor"
grep -q "'aria-haspopup': 'menu'" "${M}" || fail "menü düğmesi erişilebilir değil"
printf 'PASS: menü Esc ve dışarı tıklamayla kapanıyor\n'

# Ad soyad zorunlu. Var olan kayıtlar username'den dolduruldu — uydurma
# değil, bugün ekranda zaten o yazıyordu.
C="${PROJECT_ROOT}/db/migrations/038_app_user_contact.sql"
grep -q "ALTER COLUMN full_name SET NOT NULL" "${C}" || fail "ad soyad zorunlu değil"
grep -q "UPDATE app_user SET full_name = username" "${C}" || fail "eski kayıtlar doldurulmuyor"
grep -q "app_user_full_name_not_blank" "${C}" || fail "boş ad soyad engellenmiyor"

# E-posta zorunlu ama YAZMA yollarında: doldurulacak bir kaynak yok ve
# "kullanici@local" gibi bir değer, olmayan bir adresi varmış gibi
# göstermek olurdu. Kolon NULL kabul ediyor, uçlar etmiyor.
grep -qE "ADD COLUMN email text( |;|$)" "${C}" || fail "email kolonu yok"
grep -q "ADD COLUMN email text NOT NULL" "${C}" && fail "uydurma adresle NOT NULL yapılmış"
grep -q "app_user_email_shape" "${C}" || fail "e-posta biçimi denetlenmiyor"
grep -q "CREATE UNIQUE INDEX app_user_email_key" "${C}" || fail "e-posta benzersiz değil"
grep -q "lower(email)" "${C}" || fail "e-posta benzersizliği küçük harfe göre değil"
for u in "reqString(body, 'fullName')" "reqString(body, 'email')"; do
  grep -qF "${u}" "${I}" || fail "uçta zorunlu değil: ${u}"
done
printf 'PASS: ad soyad zorunlu, e-posta yazma yollarında zorunlu ve benzersiz\n'

# Telegram isteğe bağlı ve baştaki @ saklanmıyor: kullanıcı bazen yazıyor
# bazen yazmıyor, iki farklı kayıt aynı hesabı gösterirdi.
grep -q "app_user_telegram_shape" "${C}" || fail "telegram biçimi denetlenmiyor"
grep -q "telegram text NOT NULL" "${C}" && fail "telegram zorunlu yapılmış"
grep -q "replace(/\^@+/, '')" "${PROJECT_ROOT}/src/user-fields.ts" \
  || fail "baştaki @ atılmıyor"
printf 'PASS: telegram isteğe bağlı, @ normalleştiriliyor\n'

# Kurallar tek yerde: profil ekranı, admin formu ve sunucu aynı modülü
# kullanmalı. Ayrı ayrı yazılsaydı arayüzün kabul ettiğini sunucu
# reddederdi — ya da tersi.
for f in "${R}" "${M}"; do
  grep -q "user-fields.js" "${f}" || fail "ortak kural modülü kullanılmıyor: ${f}"
done
grep -q "'/user-fields.js'" "${I}" || fail "kural modülü istemciye servis edilmiyor"
printf 'PASS: alan kuralları tek modülde, üç taraf da onu kullanıyor\n'

# Aynı alanlar admin kullanıcı formunda da olmalı.
for alan in "field('Ad Soyad', ufull)" "field('E-posta', uemail)" "field('Telegram', utelegram"; do
  grep -qF "${alan}" "${M}" || fail "admin formunda eksik: ${alan}"
done
printf 'PASS: alanlar admin kullanıcı formunda da var\n'

# Kimlik alanları kullanıcıyı döndüren HER yoldan geçmeli. Üç ayrı yer var
# ve üçü de elle yazılmış alan listesi taşıyor; biri unutulduğunda hata
# görünmüyor, alan sessizce boş geliyor. Ölçüldü: ad soyad eklendi, giriş
# yanıtına konmadı ve kenar çubuğu kullanıcı adını göstermeye devam etti.
awk '/export async function findSessionUser/,/^}/' "${R}" \
  | grep -q 'full_name AS "fullName"' || fail "oturum kullanıcısında kimlik alanları yok"
awk '/const USER_COLUMNS/,/;/' "${R}" | grep -q 'full_name AS "fullName"' \
  || fail "USER_COLUMNS kimlik alanlarını taşımıyor"
for alan in "fullName: found.fullName" "email: found.email" "telegram: found.telegram"; do
  grep -qF "${alan}" "${I}" || fail "giriş yanıtında eksik: ${alan}"
done
printf 'PASS: kimlik alanları giriş, oturum ve liste yollarının üçünde de var\n'
