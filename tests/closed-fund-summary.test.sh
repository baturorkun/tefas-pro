#!/usr/bin/env bash
# Kapananlar ekranının fon kırılımı. Bozulunca ekran hata vermez: ya fon
# toplamı işlem toplamından sapar, ya da sekme değişimi veriyi yeniden çeker.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
M="${PROJECT_ROOT}/src/main.ts"
CV="$(awk '/^async function closedView/,/^}/' "${M}")"

# İki kırılım tek yanıttan. Ölçüldü — 53 işlem 19 fona dağılıyor ve tablo
# satış tarihine göre sıralı olduğu için bir fonun bacakları yan yana bile
# değil; VPS'in -126.585 TL'si yedi satıra bölünmüştü.
grep -q "class: 'tabs'" <<<"${CV}" || fail "sekme yok"
grep -q "\['fund', 'Fon'" <<<"${CV}" || fail "fon sekmesi yok"
grep -q "\['tx', 'İşlem'" <<<"${CV}" || fail "işlem sekmesi yok"

SEC="$(awk '/const sec = \(id: KapananSekme\)/,/^  };/' <<<"${CV}" | grep -v '^ *//')"
grep -q "api(" <<<"${SEC}" && fail "sekme değişimi veriyi yeniden çekiyor"
printf 'PASS: iki kırılım tek yanıttan, sekme değişimi istek atmıyor\n'

# Fon toplamı işlem toplamıyla aynı değişkenlerden gelmeli. Ayrı hesaplanırsa
# iki tablo farklı rakam gösterir ve hangisinin doğru olduğu anlaşılmaz.
awk '/const fonFoot = /,/\]\);/' <<<"${CV}" | grep -q "num(String(buy))" \
  || fail "fon toplamı işlem toplamından ayrı hesaplanıyor"
awk '/const fonFoot = /,/\]\);/' <<<"${CV}" | grep -q "signed(String(gain)" \
  || fail "fon K/Z toplamı işlem toplamından ayrı hesaplanıyor"
printf 'PASS: fon toplamı işlem toplamıyla aynı kaynaktan\n'

# K/Z'ye göre azalan: yukarıdan aşağı okuyunca önce kazandıran görünür.
grep -q "sort((a, b) => (b.sell - b.buy) - (a.sell - a.buy))" <<<"${CV}" \
  || fail "fon listesi K/Z'ye göre sıralı değil"
# Varsayılan sekme fon; 53 satırlık liste bir ekrana sığmıyor.
awk '/function readKapananSekme/,/^}/' "${M}" | grep -q "=== 'tx' ? 'tx' : 'fund'" \
  || fail "varsayılan sekme fon değil"
grep -q "KAPANAN_SEKME_KEY = 'tefas.closed.section'" "${M}" || fail "seçim saklanmıyor"
printf 'PASS: fon listesi K/Z sıralı, varsayılan sekme fon ve seçim saklanıyor\n'
