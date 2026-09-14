#!/usr/bin/env bash
# Nakit ekranında bölüm toplamları panel başlığında.
#
# "Bugün toplam ne gelecek" sorusu için satırları gözle toplamak gerekiyordu.
# Toplam tablonun ALTINA konsaydı uzun listede ekran dışında kalırdı: Gelmiş
# Para bölümü onlarca satır olabiliyor.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
M="${PROJECT_ROOT}/src/main.ts"
CV="$(awk '/^async function cashView/,/^}/' "${M}")"
[ -n "${CV}" ] || fail "cashView bulunamadi"

# Tek yardimci, uc bolum: ayri ayri yazilsaydi biri duzeltilip digerleri
# unutulurdu.
grep -qF "const basligaToplam = (" <<<"${CV}" || fail "ortak toplam yardimcisi yok"
test "$(grep -c "basligaToplam(" <<<"${CV}")" = "3" \
  || fail "uc bolum de ortak yardimciyi kullanmali"
grep -qF "basligaToplam(bugunku," <<<"${CV}" || fail "Bugun Gelen basliginda toplam yok"
grep -qF "basligaToplam(sonraki," <<<"${CV}" || fail "Sonraki Gunler basliginda toplam yok"
grep -qF "basligaToplam(gelmis," <<<"${CV}" || fail "Gelmis Para basliginda toplam yok"
printf 'PASS: uc bolumun de basliginda toplam, tek yardimcidan\n'

# Bos bolumde tutar yazilmaz, mevcut aciklama kalir.
grep -qF "if (grup.length === 0) return ek;" <<<"${CV}" || fail "bos bolumde tutar yaziliyor"
# Tahmini tutar isaretlenir: gerceklesmemis satisin tutari son fiyattan.
grep -qF "grup.some((g) => g.tahmin) ? ['≈ '] : []" <<<"${CV}" || fail "tahmin isareti toplamda yok"
printf 'PASS: bos bolum sessiz, tahmin isaretli\n'

# Toplam tablonun altinda tekrarlanmiyor.
grep -qE "total-row|TOPLAM" <<<"${CV}" && fail "tablo altinda toplam satiri var"
printf 'PASS: toplam yalniz baslikta\n'

# Baslikta sayi vurgulanir: meta satiri soluk gri ve tutar cumle icinde
# kayboluyordu. Yesil/kirmizi kullanilmaz — bu uygulamada onlar kâr ve zarar
# demek, gelen parayi yesil yazmak kazanc gibi okunurdu.
grep -qF "el('strong', { class: 'meta-num' }" <<<"${CV}" || fail "baslikta sayi vurgulanmiyor"
grep -qF "vurgu(money(String(t)))" <<<"${CV}" || fail "tutar vurgulanmiyor"
grep -qF "vurgu(String(gelmis.length))" <<<"${CV}" || fail "giris sayisi vurgulanmiyor"
# Sayi --text-strong olamaz: baslik da o renk ve ikisi yarisiyor.
# Sayi --text-strong olamaz: baslik da o renk ve ikisi yarisiyor.
grep -qF ".meta-num { color: var(--warn);" "${PROJECT_ROOT}/src/styles.css" || fail "vurgu stili yok"
grep -qF ".meta-num { color: var(--text-strong)" "${PROJECT_ROOT}/src/styles.css" \
  && fail "sayi baslikla ayni renkte"
grep -qE "\.meta-num[^}]*var\(--accent\)|\.meta-num[^}]*var\(--danger\)" "${PROJECT_ROOT}/src/styles.css" \
  && fail "kâr/zarar rengi kullanilmis; gelen para kazanc gibi okunur"
# panel() meta'sinin dugum alabilmesi bu vurgunun onkosulu.
grep -qF "meta: string | (Node | string)[]" "${M}" || fail "panel meta dugum kabul etmiyor"
printf 'PASS: baslikta sayilar vurgulu, kâr/zarar rengi kullanilmamis\n'

# Banka kirilimi: ayni gunun girisi iki bankaya bolunebiliyor ve genel toplam
# hangisine ne geldigini soylemiyordu. Tek bankada parantez gereksiz tekrar.
grep -qF "const bankalar = new Map<string, number>();" <<<"${CV}" || fail "banka kirilimi yok"
grep -qF "kirilim.length < 2" <<<"${CV}" || fail "tek bankada da parantez yaziliyor"
grep -qF "class: 'meta-kirilim'" <<<"${CV}" || fail "kirilim stilsiz"
grep -qF ".meta-kirilim { color: var(--muted);" "${PROJECT_ROOT}/src/styles.css" \
  || fail "kirilim stili yok"
printf 'PASS: birden fazla bankada kirilim parantez icinde\n'

# Meta alt satirda: toplam ve banka kirilimi basligin yaninda sikisiyordu.
# Varsayilan yan yana kaliyor — aciklama panelin kendisini anlatiyor ve uzaga
# dusunce hangi panele ait oldugu bakisla kurulmuyor.
grep -qF "metaAltSatir = false," "${M}" || fail "panel meta alt satir secenegi yok"
grep -qF "panel-heading-text\${metaAltSatir ? ' dikey' : ''}" "${M}" || fail "dikey sinifi uygulanmiyor"
grep -qF ".panel-heading-text.dikey { flex-direction: column;" "${PROJECT_ROOT}/src/styles.css" \
  || fail "dikey yerlesim stili yok"
test "$(grep -c '^      true,$' <<<"${CV}")" = "3" || fail "uc nakit paneli de dikey olmali"
printf 'PASS: nakit panellerinde meta alt satirda\n'
