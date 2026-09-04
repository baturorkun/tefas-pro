#!/usr/bin/env bash
# analytics.position_leg açıklık kuralı. Gerçek veritabanı gerektirir;
# DATABASE_URL yoksa test atlanır (CI'da veritabanı ayakta değil).
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIG="${PROJECT_ROOT}/db/migrations/024_forward_dated_sale.sql"

fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

# Kural kaynakta duruyor mu — veritabanı olmadan da doğrulanabilir.
grep -q 'p.sell_date IS NULL OR p.sell_date > current_date' "${MIG}" \
  || fail "açıklık ileri tarihli satışı hesaba katmalı"
printf 'PASS: açıklık kuralı ileri tarihli satışı kapsıyor\n'

grep -q 'p.sell_date > (SELECT d FROM son)' "${MIG}" \
  || fail "gerçekleşmemiş satışta değerleme son veri gününde durmalı"
printf 'PASS: gerçekleşmemiş satışta değerleme son veri gününde duruyor\n'

if [ -z "${DATABASE_URL:-}" ] || ! command -v psql >/dev/null 2>&1 \
   || ! psql "${DATABASE_URL}" -tAc 'SELECT 1' >/dev/null 2>&1; then
  printf 'SKIP: veritabanı yok, davranış testi atlandı\n'
  exit 0
fi

# -q: psql'in "INSERT 0 1" durum satırı çıktıya karışmasın.
q() { psql "${DATABASE_URL}" -tAqc "$1"; }

# Geçici kullanıcı ve üç pozisyon: ileri tarihli satış, bugünkü satış, geçmiş satış.
# Önceki yarım kalmış koşudan artık kalmış olabilir; test tekrar çalışabilmeli.
q "DELETE FROM portfolio_transaction WHERE user_id IN (SELECT id FROM app_user WHERE username = '__test_open');
   DELETE FROM app_user WHERE username = '__test_open'" >/dev/null

uid="$(q "INSERT INTO app_user (username, type, password_hash, password_salt, is_active)
          VALUES ('__test_open', 'user', 'x', 'y', false) RETURNING id")"
cleanup() { q "DELETE FROM portfolio_transaction WHERE user_id = ${uid}; DELETE FROM app_user WHERE id = ${uid};
            DELETE FROM bank WHERE name = '__test_bank'" >/dev/null; }
trap cleanup EXIT

# platform artık bank tablosuna bağlı; fixture kendi bankasını tanımlar.
q "INSERT INTO bank (name) VALUES ('__test_bank') ON CONFLICT DO NOTHING" >/dev/null

fund="$(q "SELECT fund_code FROM fact_fund_daily WHERE daily_return_pct IS NOT NULL
           GROUP BY fund_code ORDER BY count(*) DESC LIMIT 1")"
q "INSERT INTO portfolio_transaction (user_id, fund_code, platform, trade_date, units, sell_date) VALUES
   (${uid}, '${fund}', '__test_bank', current_date - 60, 100, current_date + 5),
   (${uid}, '${fund}', '__test_bank', current_date - 60, 100, current_date),
   (${uid}, '${fund}', '__test_bank', current_date - 60, 100, current_date - 5)" >/dev/null

acik="$(q "SELECT count(*) FROM analytics.position_leg
           WHERE user_id = ${uid} AND is_open AND NOT simulated")"
[ "${acik}" = "1" ] || fail "yalnız ileri tarihli satış açık sayılmalı, açık: ${acik}"
printf 'PASS: ileri tarihli satış açık, bugünkü ve geçmiş satış kapalı\n'

# Gerçekleşmemiş satışta değerleme ileri tarihe taşmamalı.
tasma="$(q "SELECT count(*) FROM analytics.position_leg
            WHERE user_id = ${uid} AND end_date > (SELECT max(trade_date) FROM fact_fund_daily
                                                   WHERE daily_return_pct IS NOT NULL)")"
[ "${tasma}" = "0" ] || fail "değerleme son veri gününü aşmamalı"
printf 'PASS: değerleme son veri gününü aşmıyor\n'

# Panel "açık pozisyon" kutusu fon sayısı göstermeli; işlem kaydı sayısı ayrı
# bir bilgi ve ikisi karıştığında 58 kayıt 58 fon sanılıyordu.
fon="$(q "SELECT count(*) FROM analytics.position_return
          WHERE user_id = ${uid} AND is_open AND NOT simulated")"
kayit="$(q "SELECT count(*) FROM portfolio_transaction
            WHERE user_id = ${uid} AND (sell_date IS NULL OR sell_date > current_date)")"
[ "${fon}" -le "${kayit}" ] || fail "fon sayısı kayıt sayısını aşamaz (${fon} > ${kayit})"
printf 'PASS: fon sayısı ile açık kayıt sayısı ayrı ölçülüyor\n'

# Açık pozisyonu olan fon takip listesinde de sayılmamalı: position_return'e
# hem gerçek hem simüle bacak girince fon "En çok kazandıran pozisyonlarım"
# grafiğinde iki kez görünüyordu. Ölçülen veride DFI böyleydi — beş lotunun
# satışı ileri tarihliydi, watchlist_visible onu "elimde yok" sayıyordu.
cift="$(q "SELECT count(*) FROM (
             SELECT fund_code FROM analytics.position_leg
             WHERE is_open GROUP BY user_id, fund_code
             HAVING count(*) FILTER (WHERE NOT simulated) > 0
                AND count(*) FILTER (WHERE simulated) > 0) x")"
[ "${cift}" = "0" ] || fail "${cift} fon hem gerçek hem simüle açık bacağa sahip"
printf 'PASS: açık pozisyonlu fon takip bacağı üretmiyor\n'

# Açıklık kuralı iki yerde iki ayrı tanım olmamalı.
grep -q "p.sell_date IS NULL OR p.sell_date > current_date" \
  "${PROJECT_ROOT}/db/migrations/033_watchlist_visible_forward_sale.sql" \
  || fail "takip listesi görünümü ileri tarihli satışı açık saymalı"
printf 'PASS: takip listesi açıklık kuralı position_leg ile aynı\n'

# Tamamen satılmış fon listede kalmalı: çıkmak kullanıcının kararı.
satilmis="$(q "SELECT count(*) FROM user_watchlist w
               WHERE EXISTS (SELECT 1 FROM portfolio_transaction p
                             WHERE p.user_id = w.user_id AND p.fund_code = w.fund_code)
                 AND NOT EXISTS (SELECT 1 FROM portfolio_transaction p
                                 WHERE p.user_id = w.user_id AND p.fund_code = w.fund_code
                                   AND (p.sell_date IS NULL OR p.sell_date > current_date))
                 AND NOT EXISTS (SELECT 1 FROM analytics.watchlist_visible v
                                 WHERE v.user_id = w.user_id AND v.fund_code = w.fund_code)")"
[ "${satilmis}" = "0" ] || fail "${satilmis} tamamen satılmış fon listeden düşmüş"
printf 'PASS: tamamen satılmış fon takip listesinde kalıyor\n'
