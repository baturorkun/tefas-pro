#!/usr/bin/env bash
# Tutarla girilmiş, adedi belli olmayan pasif alım.
#
# En pahalı hata burada sessiz olur: adedi olmayan bir kayıt maliyet
# zincirine sızarsa rakam ekranda hata vermeden bozulur. O yüzden filtre tek
# yerde — analytics.settled_transaction — ve hesap yapan her view onu okur.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
MIG="${PROJECT_ROOT}/db/migrations/041_pending_purchase.sql"
R="${PROJECT_ROOT}/src/server/repository.ts"
I="${PROJECT_ROOT}/src/server/index.ts"
M="${PROJECT_ROOT}/src/main.ts"

grep -q "CREATE OR REPLACE VIEW analytics.settled_transaction" "${MIG}" \
  || fail "süzülmüş kaynak view'ı yok"
grep -q "WHERE units IS NOT NULL" "${MIG}" || fail "pasif kayıt süzülmüyor"
for k in portfolio_transaction_units_or_amount portfolio_transaction_pending_not_sold \
         portfolio_transaction_amount_positive; do
  grep -q "${k}" "${MIG}" || fail "kısıt yok: ${k}"
done
printf 'PASS: pasif kayıt tek yerde süzülüyor, kısıtlar yerinde\n'

if [ -n "${DATABASE_URL:-}" ] && command -v psql >/dev/null 2>&1 \
   && psql "${DATABASE_URL}" -tAc 'SELECT 1' >/dev/null 2>&1; then
  q() { psql "${DATABASE_URL}" -tAqc "$1"; }
  # Aritmetik yapan view'lar süzülmüş kaynağı okumalı. tracked_fund ve
  # watchlist_visible bilerek dışarıda: pasif alım da fonun verisinin
  # toplanmasını gerektiriyor, yoksa fiyat hiç gelmez ve adet hiç belli olmaz.
  kacak="$(q "SELECT coalesce(string_agg(viewname, ', '), '') FROM pg_views
               WHERE schemaname='analytics' AND definition ~ 'FROM portfolio_transaction'
                 AND viewname NOT IN ('settled_transaction','tracked_fund','watchlist_visible')")"
  [ -z "${kacak}" ] || fail "ham tabloyu okuyan view: ${kacak}"
  # Pasif kayıt hiçbir hesaba girmemeli.
  sizinti="$(q "SELECT count(*) FROM analytics.settled_transaction WHERE units IS NULL")"
  [ "${sizinti}" = "0" ] || fail "${sizinti} pasif kayıt hesaba sızmış"
  printf 'PASS: hesap yapan her view süzülmüş kaynağı okuyor\n'
else
  printf 'SKIP: veritabanı yok\n'
fi

# Ya adet ya tutar; pasif kayıt satılamaz.
grep -q "Adet ya da tutar girilmeli" "${I}" || fail "boş kayıt reddedilmiyor"
grep -q "Adedi belli olmayan alım satılamaz" "${I}" || fail "pasif kayıt satılabiliyor"
grep -q "orderAmount" "${R}" || fail "tutar saklanmıyor"
printf 'PASS: adet ya da tutar zorunlu, pasif kayıt satılamıyor\n'

# Arayüz: aynı form, aynı liste. Ayrı bir "emir" ekranı yok.
grep -q "openOrderModal\|emirPaneli\|pending_order" "${M}" \
  && fail "ayrı emir ekranı geri gelmiş"
awk '/^async function transactionsView/,/^}/' "${M}" \
  | grep -q "t.sellDate === null && t.units !== null" \
  || fail "pasif kayıt açık pozisyon sayılıyor"
grep -q "'Adet bekleniyor'" "${M}" || fail "pasif satır tutarını göstermiyor"
grep -q "badge('Pasif', 'pending')" "${M}" || fail "pasif rozeti yok"
# Rozet tek başına yetmiyordu: satır diğerleriyle aynı görünüyor ve göz
# kaymıyordu. Kendi rengi var ve kâr/zarar şeridini almıyor — pasif kaydın
# bir sonucu yok.
grep -q "pasifSatir ? 'tx-pending'" "${M}" || fail "pasif satırın kendi rengi yok"
grep -q ".tx-pending td:first-child" "${PROJECT_ROOT}/src/styles.css" \
  || fail "pasif satırın şeridi yok"

# Kip seçici: iki alan birden açık kalınca hangisinin geçerli olduğu formda
# görünmüyordu. Tutar kipinde adet GÖNDERİLMEZ; eski bir değer sızarsa pasif
# kayıt sessizce aktifleşirdi.
grep -q "class: 'tabs mode-tabs'" "${M}" || fail "giriş türü seçici yok"
# Ayrım olgusal: adet belli mi değil mi. "Gerçek/geçici" kaydın gerçekliğini
# tartışıyor gibi okunuyordu — alım gerçek, eksik olan yalnız adet.
grep -q "'Adet belli'" "${M}" || fail "kip etiketi olguyu söylemiyor"
grep -q "'Adet belli değil'" "${M}" || fail "kip etiketi olguyu söylemiyor"
grep -q "const tutarKipi = !tutarAlani.hidden" "${M}" || fail "kip gönderime yansımıyor"
grep -q "units: tutarKipi ? null :" "${M}" || fail "tutar kipinde adet gönderiliyor"
grep -q "kipUygula(existing !== null && existing.units === null ? 'tutar' : 'adet')" "${M}" \
  || fail "düzenlemede kip kayıttan gelmiyor"
grep -q ".field\[hidden\] { display: none; }" "${PROJECT_ROOT}/src/styles.css" \
  || fail "gizlenen alan görünmeye devam ediyor"
printf 'PASS: tek form, tek liste; pasif satır işaretli ve pozisyon sayılmıyor\n'
