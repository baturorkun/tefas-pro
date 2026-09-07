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
grep -q "\['fund', 'Fonlar'" <<<"${CV}" || fail "fon sekmesi yok"
grep -q "\['tx', 'İşlemler'" <<<"${CV}" || fail "işlem sekmesi yok"

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
grep -q "sort((a, b) => b.buy - a.buy)" <<<"${CV}" \
  || fail "fon listesi portföye giren tutara göre sıralı değil"

# Fon satırı işlem sekmesini o fonla açar: "7 işlem" yazan hücrenin cevabı
# orada ve elle filtre seçmeye gerek kalmıyor.
grep -q "class: 'row-link'" <<<"${CV}" || fail "fon satırı tıklanabilir değil"
awk '/tr.addEventListener/,/});/' <<<"${CV}" | grep -q "kapananFiltre.fundCode = f.fundCode" \
  || fail "fon satırı işlem filtresini kurmuyor"
awk '/tr.addEventListener/,/});/' <<<"${CV}" | grep -q "sec('tx')" \
  || fail "fon satırı işlem sekmesine geçmiyor"

# Filtre satırı Fon Hareketleri'ndeki desenle aynı; iki filtre AND ile birleşir.
grep -q "comboFilter({" <<<"${CV}" || fail "işlem listesinde filtre yok"
grep -q "kapananFiltre.platform === '' || r.platform === kapananFiltre.platform" <<<"${CV}" \
  || fail "banka filtresi uygulanmıyor"

# İşlem listesi alış tarihine göre. Satış sıralaması aynı fonun bacaklarını
# giriş sırasının tersine diziyordu.
awk '/FROM analytics.closed_position/,/\[userId\]/' "${PROJECT_ROOT}/src/server/repository.ts" \
  | grep -q "ORDER BY buy_date DESC" || fail "kapanan liste alış tarihine göre sıralı değil"
# Varsayılan sekme fon; 53 satırlık liste bir ekrana sığmıyor.
awk '/function readKapananSekme/,/^}/' "${M}" | grep -q "=== 'tx' ? 'tx' : 'fund'" \
  || fail "varsayılan sekme fon değil"
grep -q "KAPANAN_SEKME_KEY = 'tefas.closed.section'" "${M}" || fail "seçim saklanmıyor"
printf 'PASS: fon satırı işlem sekmesini süzüyor, sıralamalar ve varsayılan sekme yerinde\n'
