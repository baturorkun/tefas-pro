#!/usr/bin/env bash
# Ekleme sonucu formun yanında görünür.
#
# Sistem Fonları ekranında durum düğümü tablodan SONRA duruyordu: 19 satırlık
# listede "AAK zaten listede" ekranın dışında kalıyor, kullanıcı tıklamasının
# işleyip işlemediğini göremiyordu. Aynı desen Bankalar panelinde de vardı.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
M="${PROJECT_ROOT}/src/main.ts"
C="${PROJECT_ROOT}/src/styles.css"

for fn in systemFundPanel bankPanel; do
  P="$(awk "/^function ${fn}\\(/,/^}/" "${M}")"
  [ -n "${P}" ] || fail "${fn} bulunamadi"
  # Durum ekleme alanının hemen altında, tablodan önce.
  grep -qF "durum.node," <<<"${P}" || fail "${fn}: durum satiri panelde degil"
  awk '/settings-add/{a=NR} /durum\.node,/{b=NR} /table\(\[/{c=NR} END{exit !(a && b && c && a<b && b<c)}' \
    <<<"${P}" || fail "${fn}: durum satiri ekleme alani ile tablo arasinda degil"
  # Tablodan sonra durum düğümü kalmamalı.
  grep -qE "^      status,$" <<<"${P}" && fail "${fn}: tablodan sonra hâlâ durum dugumu var"
  # Eski, renksiz yazım yolu kalmamalı.
  grep -qF "status.textContent" <<<"${P}" && fail "${fn}: dogrudan status.textContent kullaniyor"
  # Hata kırmızı: tür verilmeden yazılırsa hata bilgi gibi okunur.
  grep -qF "'hata');" <<<"${P}" || fail "${fn}: hata turu verilmiyor"
  # Başarı reload'ın ötesine taşınıyor.
  grep -qF "durum.sonra(" <<<"${P}" || fail "${fn}: basari mesaji reload sonrasi kayboluyor"
done
printf 'PASS: iki panelde de durum satiri formun yaninda, tablodan once\n'

D="$(awk '/^function durumSatiri/,/^}/' "${M}")"
[ -n "${D}" ] || fail "durumSatiri yardimcisi yok"
grep -qF "tur === 'hata' ? ' status-error'" <<<"${D}" || fail "hata rengi yok"
grep -qF "tur === 'uyari' ? ' status-warn'" <<<"${D}" || fail "uyari rengi yok"
grep -qF "node.hidden = metin === '';" <<<"${D}" || fail "bos durumda satir yer kapliyor"
printf 'PASS: renk turden geliyor, bos satir yer kaplamiyor\n'

# Mesaj bir kez gösterilir: modül düzeyinde bekler, okunduğunda silinir.
grep -qF "let bekleyenDurum: { metin: string; tur: DurumTuru } | null = null;" "${M}" \
  || fail "reload sonrasi mesaj saklanmiyor"
grep -qF "bekleyenDurum = null;" <<<"${D}" || fail "mesaj okunduktan sonra silinmiyor"
awk '/if \(bekleyenDurum !== null\)/{a=NR} /bekleyenDurum = null;/{b=NR} END{exit !(a && b && a<b)}' \
  <<<"${D}" || fail "mesaj once silinip sonra yazilmis"
printf 'PASS: mesaj reloadu asiyor ve bir kez gosteriliyor\n'

grep -qF ".panel-status[hidden] { display: none; }" "${C}" || fail "gizli durum satiri gorunuyor"
printf 'PASS: durum satiri stilli\n'

# Gun ertesiye gectiginde kutu degerlerin ne zaman gelecegini soylemeli.
# Onceden dunku kosumun "toplandi" yazisi duruyordu ve bugunun verisinin
# gelip gelmeyecegi belli olmuyordu.
grep -q "degerlerBekleniyor" "${M}" || fail "degerlerin ne zaman gelecegi yazilmiyor"
grep -Fq "10:30" "${M}" || fail "saat yazilmiyor"
# Hafta sonu gosterilmemeli: cumartesi veri gunu cuma olur, bu dogrudur.
grep -q "gun === 0 || gun === 6" "${M}" || fail "hafta sonu ayrilmamis"
printf 'PASS: gun gerideyken degerlerin gelecegi saat yaziliyor\n'
