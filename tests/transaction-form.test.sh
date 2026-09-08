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
# type=date yalnız gizli seçici olarak kalabilir; ekranda biçimi tarayıcı
# çizen bir alan olmamalı.
grep -q "type: 'date'" "${M}" && ! grep -q "class: 'date-hidden'" "${M}" \
  && fail "hâlâ tarayıcı biçimli tarih alanı var"
grep -q "gizli.showPicker()" "${M}" || fail "takvim seçici yok"
grep -q "placeholder: 'gg-aa-yyyy'" "${M}" || fail "sabit biçimli tarih alanı yok"
awk '/^function tarihOku/,/^}/' "${M}" | grep -q "toISOString().slice(0, 10) !== iso" \
  || fail "olmayan gün (31-02) kabul ediliyor"
# Doğrulama gönderimden hemen önce de koşmalı: kullanıcı yarım tarih yazıp
# doğrudan Kaydet'e basabiliyor ve alan hiç blur almıyor.
grep -q "if (!tarihDogrula(t))" "${M}" || fail "gönderimden önce tarih doğrulanmıyor"
grep -c "t.reportValidity()" "${M}" | grep -qE "^[2-9]" \
  || fail "iki formdan birinde tarih uyarısı gösterilmiyor"
printf 'PASS: tarih biçimi sabit ve olmayan gün reddediliyor\n'

# Banka boş gelir; ilk seçenek kendiliğinden seçili gelince işlem yanlış
# bankaya yazılıyordu.
grep -q "'Banka seçin'" "${M}" || fail "boş banka seçeneği yok"
grep -q "banks\[0\]?.name" "${M}" && fail "ilk banka hâlâ kendiliğinden seçiliyor"
grep -q "SON_BANKA_KEY = 'tefas.tx.platform'" "${M}" || fail "son banka hatırlanmıyor"
printf 'PASS: banka boş geliyor, sonra en son kullanılan\n'

# Valör hesabı fon kodu ile tarih hangi sırayla girilirse girilsin koşmalı.
# Valör fon koduyla birlikte geliyor; tarih ondan önce girilmişse hesap hiç
# koşmuyordu ve alan boş kalıyordu. Sıra kullanıcının işi değil.
grep -Fq "valorTamamla();" "${M}" || fail "valör hesabı fon geldikten sonra tamamlanmıyor"
# Yalnız BOŞ alanı doldurmalı: kullanıcının elle girdiği tarihi ezmek,
# girdiğini sessizce değiştirmek olurdu.
grep -Fq "if (iso === '' || sonuc.value.trim() !== '') continue;" "${M}" \
  || fail "elle girilmiş tarih üzerine yazılıyor"
# Valör fon başına: alış çoğunlukla T+1 ama para piyasası fonlarında T+0
# (PNU, PRY, TP2). Sabit +1 tam da en büyük pozisyonlarda yanlış olurdu.
grep -Fq "valor?.buy ?? null" "${M}" || fail "alış valörü fondan gelmiyor"
grep -Fq "valor?.sell ?? null" "${M}" || fail "satış valörü fondan gelmiyor"
printf 'PASS: valör hesabı sıradan bağımsız, elle gireni ezmiyor, fon başına\n'

