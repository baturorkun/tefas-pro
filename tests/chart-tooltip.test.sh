#!/usr/bin/env bash
# Yatay bar grafikte ipucu, üstüne gelinen satırın fonunu göstermeli.
#
# Bir olaydan doğdu: her <title> doğrudan kök <svg>'ye ekleniyordu. SVG'de
# kökün doğrudan çocuğu olan title BÜTÜN grafiğin ipucu sayılır, bu yüzden
# grafiğin neresine gelinirse gelinsin en üstteki fonun açıklaması çıkıyordu.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
M="${PROJECT_ROOT}/src/main.ts"
C="${PROJECT_ROOT}/src/styles.css"
BC="$(awk '/^function barChart/,/^}/' "${M}")"
[ -n "${BC}" ] || fail "barChart bulunamadi"

# Her satir kendi grubunda; title o grubun icinde.
grep -qF "const satir = svg('g', { class: 'bar-row' });" <<<"${BC}" || fail "satir grubu yok"
awk "/const satir = svg\('g'/{a=NR} /svg\('title'/{b=NR} END{exit !(a && b && a<b)}" <<<"${BC}" \
  || fail "title satir grubunun disinda"
# Title kok svg'ye eklenmemeli: o zaman butun grafigin ipucu olur.
awk '/root\.append\(/{a=NR} /svg\(.title./{b=NR} END{exit !(b < a || a == 0)}' <<<"${BC}" \
  || fail "title root'a ekleniyor"
grep -qF "root.append(satir);" <<<"${BC}" || fail "satir grubu koke eklenmiyor"
printf 'PASS: her satir kendi grubunda, ipucu o gruba ait\n'

# Vurus alani satirin tamamini kapliyor: kisa barlarda hedef birkac piksel kalmasin.
grep -qF "class: 'bar-hit'" <<<"${BC}" || fail "gorunmez vurus alani yok"
grep -qF "width: String(W), height: String(ROW)" <<<"${BC}" || fail "vurus alani satirin tamamini kaplamiyor"
# fill:none olay almaz, transparent alir.
grep -qF ".bar-hit { fill: transparent; }" "${C}" || fail "vurus alani fare olaylarini almaz"
printf 'PASS: satirin tamami ipucu hedefi\n'
