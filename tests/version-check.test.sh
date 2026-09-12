#!/usr/bin/env bash
# Açık sekme yeni sürümü fark etsin.
#
# Uygulama tek sayfa: ekranlar arasında gezerken app.js bir daha çekilmiyor.
# RQ-0062 main'e girdi, açık sekmede PDF düğmesi yoktu ve rozet "v0.62"
# diyordu — çünkü rozet her ekranda sunucunun sürümünü taze çekiyordu, eski
# kodu çalıştıran sekme güncel görünüyordu.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
M="${PROJECT_ROOT}/src/main.ts"
H="${PROJECT_ROOT}/public/index.html"
C="${PROJECT_ROOT}/src/styles.css"

# Rozet YÜKLÜ sürümü yazar: ilk okuma saklanır, sonrakiler yalnız karşılaştırır.
grep -qF "let yukluSurum: string | null = null;" "${M}" || fail "yuklu surum saklanmiyor"
grep -qF "if (yukluSurum === null) { yukluSurum = simdiki; return; }" "${M}" || fail "ilk okuma saklanmiyor"
VB="$(awk '/^function versionBadge/,/^}/' "${M}")"
grep -qF "value.textContent = yukluSurum ?? '—';" <<<"${VB}" || fail "rozet sunucunun surumunu yaziyor, yuklu surumu degil"
grep -qF "rt.version ?? '—'" <<<"${VB}" && fail "rozet taze sunucu surumunu basiyor"
printf 'PASS: rozet sayfanin dogdugu surumu gosteriyor\n'

# Karşılaştırma iki yerde: her ekran kurulumunda (rozet üzerinden) ve sekme
# görünür olduğunda. Arka plandaki sekme deploy'u kaçırır.
grep -qF "await surumKontrol();" <<<"${VB}" || fail "ekran kurulumunda surum kontrol edilmiyor"
grep -qF "document.addEventListener('visibilitychange'" "${M}" || fail "sekme gorunur olunca bakilmiyor"
grep -qF "if (document.visibilityState === 'visible') void surumKontrol();" "${M}" \
  || fail "gorunurluk kontrolu surumu sormuyor"
printf 'PASS: her ekran degisiminde ve sekme one gelince sunucuya soruluyor\n'

# Ayrışınca şerit: yeni sürüm numarası ve Yenile düğmesi.
SK="$(awk '/^async function surumKontrol/,/^}/' "${M}")"
grep -qF "if (simdiki === yukluSurum) return;" <<<"${SK}" || fail "ayni surumde serit aciliyor"
grep -qF "Yeni sürüm var (\${simdiki})" <<<"${SK}" || fail "serit yeni surumu yazmiyor"
grep -qF "['Yenile']" <<<"${SK}" || fail "Yenile dugmesi yok"
grep -qF "serit.hidden = false;" <<<"${SK}" || fail "serit acilmiyor"
# Yenileme YALNIZ düğmeyle: yarım doldurulmuş formu silmek eski sürümde
# kalmaktan kötü.
test "$(grep -c "location.reload()" <<<"${SK}")" = "1" || fail "surumKontrol icinde reload sayisi 1 olmali"
grep -qF "yenile.addEventListener('click', () => { location.reload(); });" <<<"${SK}" \
  || fail "reload dugmeye bagli degil"
printf 'PASS: ayrisinca serit, yenileme yalniz dugmeyle\n'

# Şerit uygulamanın DIŞINDA: ekran yeniden kurulunca kaybolmamalı.
grep -qF '<div id="surum-uyari" role="status" hidden></div>' "${H}" || fail "serit index.html de degil"
awk '/id="surum-uyari"/{a=NR} /id="app"/{b=NR} END{exit !(a && b && a<b)}' "${H}" || fail "serit #app icinde/sonrasinda"
grep -qF "#surum-uyari[hidden] { display: none; }" "${C}" || fail "gizli serit gorunuyor"
grep -qF "@media print { #surum-uyari { display: none !important; } }" "${C}" || fail "serit kagida gidiyor"
printf 'PASS: serit uygulama disinda, kagida gitmiyor\n'

# Sürüm alınamazsa ne rozet ne şerit hata üretir.
grep -qF "if (simdiki === null) return;" <<<"${SK}" || fail "surum alinamayinca serit patlayabilir"
SS="$(awk '/^async function sunucuSurumu/,/^}/' "${M}")"
grep -qF "} catch {" <<<"${SS}" || fail "runtime hatasi yakalanmiyor"
printf 'PASS: surum alinamazsa sessiz\n'
