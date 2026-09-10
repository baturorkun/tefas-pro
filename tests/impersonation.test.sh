#!/usr/bin/env bash
# Superuser'ın başka bir kullanıcıya geçişi.
#
# Buradaki tehlike yetki değil görünürlük. Geçiş sessiz olursa superuser
# başkasının hesabında kendi işlemini girer ve bunu fark etmesi için hiçbir
# işaret olmaz. O yüzden testler iki şeye bakıyor: yetki kararının GİRİŞ
# YAPAN kişiye bakması, ve geçişin ekranda her zaman görünmesi.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
MIG="${PROJECT_ROOT}/db/migrations/043_superuser_impersonation.sql"
R="${PROJECT_ROOT}/src/server/repository.ts"
I="${PROJECT_ROOT}/src/server/index.ts"
M="${PROJECT_ROOT}/src/main.ts"
C="${PROJECT_ROOT}/src/styles.css"

# ─── Şema ───
grep -qF "CHECK (type IN ('super', 'admin', 'user'))" "${MIG}" \
  || fail "üçüncü kullanıcı tipi tanımlanmamış"
grep -qF "ADD COLUMN acting_user_id" "${MIG}" || fail "geçiş alanı yok"
# Kendine geçiş, arayüzde "geçiştesin" deyip X'i işlevsiz bırakırdı.
grep -qF "app_session_acting_differs" "${MIG}" || fail "kendine geçiş engellenmemiş"
grep -qF "acting_user_id <> user_id" "${MIG}" || fail "kısıt kendine geçişi kapatmıyor"
printf 'PASS: sema ucuncu tipi ve gecis alanini tasiyor\n'

# user_id'nin anlamı değişmemeli: oturumun kime ait olduğu geçişten sonra da
# okunabilmeli, yoksa geri dönüşün de denetimin de dayanağı kalmaz.
grep -qF "SET acting_user_id = \$2 WHERE id = \$1" "${R}" || fail "gecis acting alanina yazmiyor"
grep -qF "SET acting_user_id = NULL WHERE id = \$1" "${R}" || fail "gecisi bitiren yol yok"
grep -q "UPDATE app_session SET user_id" "${R}" && fail "oturum sahibi degistiriliyor"
printf 'PASS: oturum sahibi korunuyor, gecis ayri alanda\n'

# ─── Sunucu ───
# Yetki kararı giriş yapana bakar. `user` üzerinden bakılsaydı sıradan bir
# kullanıcıya geçen superuser kendi kendini kilitlerdi: geçişi bitirme hakkı
# da hedefin yetkisine bağlanmış olurdu.
grep -qF "oturumSahibi.type !== 'super'" "${I}" || fail "gecis yetkisi giris yapana bakmiyor"
grep -qF "ctx.actor ?? ctx.user" "${I}" || fail "oturum sahibi turetilmiyor"
grep -qF "const user: AppUser | null = ctx?.user ?? null" "${I}" \
  || fail "veri uclari gecis hedefini kullanmiyor"

# Superuser'a geçiş, geçişi bitirme hakkını devretmek olurdu.
grep -qF "hedef.type === 'super'" "${I}" || fail "superuser'a gecis acik"
# Pasif hesaba geçiş, girişi kapatılmış birinin verisine açık kapı olurdu.
grep -qF "!hedef.isActive" "${I}" || fail "pasif hesaba gecis acik"

# Geçişi bitirmek her oturumun hakkı: yetkisi 'super' olmayan hedefe geçmiş
# bir oturum da X'e basabilmeli.
awk "/path === '\/api\/impersonate' && method === 'DELETE'/,/^      }/" "${I}" \
  | grep -qF "ctx.actor === null" || fail "gecisi bitirme yolu gecis hâlini kontrol etmiyor"
printf 'PASS: gecis uclari yetkiyi giris yapan uzerinden karariyor\n'

# Yönetim ekranları superuser'a da açık: geçiş yapacağı liste orada.
grep -qF "user.type !== 'admin' && user.type !== 'super'" "${I}" \
  || fail "superuser yonetim ekranlarini goremiyor"
printf 'PASS: superuser yonetim ekranlarini goruyor\n'

# Tek superuser hesabı, ad soyad düzeltilirken sessizce kaybolmamalı.
grep -qF "mevcut.type === 'super'" "${I}" || fail "superuser formdan dusurulebiliyor"
# Sunucu reddediyor ama istek oraya hiç gitmemeli: alanlar kilitli ve patch'e
# konmuyor, yoksa kullanıcı kaydete basıp anlamadığı bir hata alırdı.
grep -qF "const superKayit = existing !== null && existing.type === 'super'" "${M}" \
  || fail "form superuser kaydini ayirt etmiyor"
grep -qF "if (!superKayit) {" "${M}" || fail "patch superuser da tip gonderiyor"
grep -qF "utype.disabled = true" "${M}" || fail "tip alani kilitli degil"
grep -qF "uactive.disabled = true" "${M}" || fail "durum alani kilitli degil"
printf 'PASS: superuser kullanici formundan dusurulemiyor\n'

# /api/me geçişi söylemeli: arayüz şeridi buna bakarak kuruyor.
grep -qF "actor: ctx.actor === null" "${I}" || fail "/api/me gecisi bildirmiyor"
printf 'PASS: /api/me gecis bilgisini tasiyor\n'

# ─── Arayüz ───
grep -qF "impersonate-bar" "${M}" || fail "gecis seridi yok"
# Şerit üst şeritte, sürüm rozetinin solunda: sayfa kaydırılınca da görünür
# kalmalı. Kenar çubuğunun dibinde gözden kaçıyordu.
grep -qF "el('div', { class: 'header-right' }, [" "${M}" || fail "ust serit sag ucu yok"
grep -qF "...(gecisSeridi === null ? [] : [gecisSeridi])," "${M}" \
  || fail "serit ust seride konmamis"
grep -qF "olarak görüntülüyorsunuz" "${M}" || fail "serit hangi hesaba bakildigini yazmiyor"
grep -qF "impersonate-bar" "${C}" || fail "gecis seridi stilsiz"
grep -qF "impersonate-stop" "${M}" || fail "gecisi bitiren X yok"
grep -qF "'/api/impersonate', { method: 'DELETE' }" "${M}" || fail "X gecisi bitirmiyor"
printf 'PASS: ust seritte serit ve X var\n'

# Geçiş düğmesi yalnız superuser'da ve zincirlenmiyor.
grep -qF "me.type === 'super' && me.actor === null" "${M}" \
  || fail "gecis dugmesi herkese gorunuyor"
grep -qF "u.type !== 'super' && u.isActive" "${M}" || fail "hedef suzgeci eksik"
printf 'PASS: gecis dugmesi yalniz superuser da ve uygun hedeflerde\n'

# Rol adı tek yerden: üç ayrı yerde yazılınca biri 'super'ı unutuyordu.
grep -qF "function rolAdi(" "${M}" || fail "rol adi tek yerde degil"
test "$(grep -cF "'Superuser'" "${M}")" = "1" || fail "rol adi birden fazla yerde yaziliyor"
printf 'PASS: rol adi tek yerde\n'
