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
cleanup() { q "DELETE FROM portfolio_transaction WHERE user_id = ${uid}; DELETE FROM app_user WHERE id = ${uid}" >/dev/null; }
trap cleanup EXIT

fund="$(q "SELECT fund_code FROM fact_fund_daily WHERE daily_return_pct IS NOT NULL
           GROUP BY fund_code ORDER BY count(*) DESC LIMIT 1")"
q "INSERT INTO portfolio_transaction (user_id, fund_code, platform, trade_date, units, sell_date) VALUES
   (${uid}, '${fund}', 'Test', current_date - 60, 100, current_date + 5),
   (${uid}, '${fund}', 'Test', current_date - 60, 100, current_date),
   (${uid}, '${fund}', 'Test', current_date - 60, 100, current_date - 5)" >/dev/null

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
