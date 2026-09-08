#!/usr/bin/env bash
# Tutarla verilen alım emri. Bozulunca en pahalı sonuç sessiz olur: adedi
# olmayan bir kayıt maliyet zincirine sızarsa rakam ekranda hata vermeden
# bozulur.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
MIG="${PROJECT_ROOT}/db/migrations/041_pending_order.sql"
R="${PROJECT_ROOT}/src/server/repository.ts"
M="${PROJECT_ROOT}/src/main.ts"

# Emir ayrı tabloda. units'i nullable yapmak altı analytics view'ını ve FIFO
# maliyet zincirini etkilerdi; emir zaten pozisyon değil.
grep -q "CREATE TABLE IF NOT EXISTS pending_order" "${MIG}" || fail "emir tablosu yok"
grep -q "ON DELETE CASCADE" "${MIG}" || fail "kullanıcı silinince emirleri kalıyor"
grep -q "CHECK (amount > 0)" "${MIG}" || fail "tutar sıfır ya da eksi olabiliyor"
grep -rq "units .*numeric.*NULL" "${PROJECT_ROOT}/db/migrations/041_pending_order.sql" \
  && fail "emir portfolio_transaction'a dokunuyor"
printf 'PASS: emir ayrı tabloda, kullanıcıya bağlı ve tutarı pozitif\n'

# Hiçbir analytics view'ı emir tablosunu görmemeli.
if grep -rl "pending_order" "${PROJECT_ROOT}"/db/migrations/*.sql | grep -qv "041_pending_order.sql"; then
  fail "başka bir migration pending_order'a dokunuyor"
fi
grep -rn "pending_order" "${R}" | grep -qE "analytics\.|CREATE VIEW" \
  && fail "emir bir view'a giriyor"
printf 'PASS: emir hiçbir analytics view'"'"'ına girmiyor\n'

# Adet önerisi hesaplanıyor ama YAZILMIYOR: banka masrafı ve yuvarlama
# yüzünden gerçek adet farklı çıkabiliyor, uydurulmuş adet maliyet tabanını
# bozar. Emir formunda adet alanı da yok.
grep -q "nav_per_share::text AS \"navPerShare\"" "${R}" || fail "öneri için fiyat taşınmıyor"
awk '/^function openOrderModal/,/^}/' "${M}" | grep -q "units" \
  && fail "emir formunda adet alanı var"
awk '/^function emirPaneli/,/^}/' "${M}" | grep -q "'öneri'" || fail "adet öneri diye etiketlenmiyor"
awk '/^function emirPaneli/,/^}/' "${M}" | grep -q "openTransactionModal(null, reload, {" \
  || fail "emir işleme çevrilemiyor"
printf 'PASS: adet öneriliyor, otomatik yazılmıyor\n'

# Emir işleme dönüşünce emir kaydı silinir; iki yerde iki kayıt kalmamalı.
awk '/^function emirPaneli/,/^}/' "${M}" | grep -q "method: 'DELETE'" \
  || fail "çevirince emir silinmiyor"
grep -Fq "await kayitSonrasi();" "${M}" || fail "kayıt sonrası kanca çalışmıyor"
printf 'PASS: emir işleme dönüşünce siliniyor\n'
