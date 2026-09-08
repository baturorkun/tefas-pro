#!/usr/bin/env bash
# İşlem formunun üç kuralı. Üçü de sessizce yanlış veri üretiyordu.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
R="${PROJECT_ROOT}/src/server/repository.ts"
I="${PROJECT_ROOT}/src/server/index.ts"
M="${PROJECT_ROOT}/src/main.ts"

# TX_COLUMNS fund_latest'e dayanıyor; onu kullanan HER sorgu join'i taşımalı.
# Taşımayınca kayıt yazılıyor ama yanıt sorgusu patlıyor: kullanıcı hata
# görüp tekrar gönderiyor ve mükerrer kayıt oluşuyor. Yaşandı.
if grep -q 'AS "latestNav"' "${R}"; then
  toplam="$(grep -c 'SELECT ${TX_COLUMNS}' "${R}")"
  joinli="$(grep -A 4 'SELECT ${TX_COLUMNS}' "${R}" | grep -c 'analytics.fund_latest l')"
  [ "${toplam}" = "${joinli}" ] \
    || fail "TX_COLUMNS kullanan ${toplam} sorgunun ${joinli} tanesinde fund_latest join'i var"
fi
printf 'PASS: TX_COLUMNS kullanan her sorgu gerekli join'"'"'i taşıyor\n'

# Mükerrer kayıt engellenmiyor, soruluyor: aynı gün aynı fondan iki eşit alım
# gerçekten oluyor (PHE 24 Nisan'da iki kez 7.087 adet).
grep -q "export async function duplicateTransaction" "${R}" || fail "mükerrer sayımı yok"
grep -q "confirmDuplicate" "${I}" || fail "onay bayrağı sunucuda okunmuyor"
grep -q "duplicate: true" "${I}" || fail "mükerrer durumu istemciye bildirilmiyor"
grep -q "confirmDuplicate: true" "${M}" || fail "istemci ısrar edemiyor"
# Kayıt yazıldıktan sonraki hata "kaydedilemedi" diye gösterilmemeli.
awk '/const kaydet = async/,/}, .Kaydedilemedi/' "${M}" | grep -q "try {" \
  || fail "kayıt sonrası hata kaydı başarısız gösterebilir"
printf 'PASS: mükerrer kayıt soruluyor, kayıt sonrası hata yanıltmıyor\n'

# Tarih biçimi sayfaya ait, tarayıcıya değil: type=date İngilizce tarayıcıda
# aa/gg/yyyy çiziyor ve 08-09 ile 09-08 karışıyor.
grep -q "type: 'date'" "${M}" && fail "hâlâ tarayıcı biçimli tarih alanı var"
grep -q "placeholder: 'gg-aa-yyyy'" "${M}" || fail "sabit biçimli tarih alanı yok"
awk '/^function tarihOku/,/^}/' "${M}" | grep -q "toISOString().slice(0, 10) !== iso" \
  || fail "olmayan gün (31-02) kabul ediliyor"
printf 'PASS: tarih biçimi sabit ve olmayan gün reddediliyor\n'

# Banka boş gelir; ilk seçenek kendiliğinden seçili gelince işlem yanlış
# bankaya yazılıyordu.
grep -q "'Banka seçin'" "${M}" || fail "boş banka seçeneği yok"
grep -q "banks\[0\]?.name" "${M}" && fail "ilk banka hâlâ kendiliğinden seçiliyor"
grep -q "SON_BANKA_KEY = 'tefas.tx.platform'" "${M}" || fail "son banka hatırlanmıyor"
printf 'PASS: banka boş geliyor, sonra en son kullanılan\n'
