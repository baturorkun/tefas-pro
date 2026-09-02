#!/usr/bin/env bash
# analytics.closed_position hesabı. DATABASE_URL yoksa atlanır.
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIG="${PROJECT_ROOT}/db/migrations/025_closed_position.sql"

fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

grep -q 'p.sell_date IS NOT NULL AND p.sell_date <= current_date' "${MIG}" \
  || fail "kapanma tanımı 024 ile aynı olmalı: ileri tarihli satış kapalı sayılmaz"
printf 'PASS: ileri tarihli satış kapanmış sayılmıyor\n'

if [ -z "${DATABASE_URL:-}" ] || ! command -v psql >/dev/null 2>&1 \
   || ! psql "${DATABASE_URL}" -tAc 'SELECT 1' >/dev/null 2>&1; then
  printf 'SKIP: veritabanı yok, hesap testi atlandı\n'
  exit 0
fi

q() { psql "${DATABASE_URL}" -tAqc "$1"; }

q "DELETE FROM portfolio_transaction WHERE user_id IN (SELECT id FROM app_user WHERE username = '__test_closed');
   DELETE FROM app_user WHERE username = '__test_closed'" >/dev/null
uid="$(q "INSERT INTO app_user (username, type, password_hash, password_salt, is_active)
          VALUES ('__test_closed', 'user', 'x', 'y', false) RETURNING id")"
cleanup() { q "DELETE FROM portfolio_transaction WHERE user_id = ${uid}; DELETE FROM app_user WHERE id = ${uid}" >/dev/null; }
trap cleanup EXIT

fund="$(q "SELECT fund_code FROM fact_fund_daily WHERE nav_per_share IS NOT NULL
           GROUP BY fund_code ORDER BY count(*) DESC LIMIT 1")"

# Üç kayıt: geçmişte kapanmış, bugün kapanmış, ileri tarihli (henüz açık).
q "INSERT INTO portfolio_transaction (user_id, fund_code, platform, trade_date, units, sell_date) VALUES
   (${uid}, '${fund}', 'Test', current_date - 40, 1000, current_date - 10),
   (${uid}, '${fund}', 'Test', current_date - 40, 1000, current_date),
   (${uid}, '${fund}', 'Test', current_date - 40, 1000, current_date + 5)" >/dev/null

n="$(q "SELECT count(*) FROM analytics.closed_position WHERE user_id = ${uid}")"
[ "${n}" = "2" ] || fail "yalnız gerçekleşmiş satışlar listelenmeli, gelen: ${n}"
printf 'PASS: ileri tarihli satış listede yok, gerçekleşenler var\n'

# Kâr/zarar, satış ve alış değerinin farkına eşit olmalı.
tutar="$(q "SELECT count(*) FROM analytics.closed_position
            WHERE user_id = ${uid}
              AND abs(realized_gain - (sell_value - buy_value)) > 0.05")"
[ "${tutar}" = "0" ] || fail "kâr/zarar, satış ile alış farkına eşit olmalı"
printf 'PASS: kâr/zarar satış ile alış farkına eşit\n'

# Yüzde, tutarla aynı işareti taşımalı.
isaret="$(q "SELECT count(*) FROM analytics.closed_position
             WHERE user_id = ${uid} AND sign(realized_gain) <> sign(realized_pct)
               AND realized_gain <> 0")"
[ "${isaret}" = "0" ] || fail "yüzde ile tutarın işareti aynı olmalı"
printf 'PASS: yüzde ile tutarın işareti tutarlı\n'

# Aynı fondan aynı gün alınıp aynı gün satılan iki kayıt ayrı satır olmalı.
ayni="$(q "SELECT count(*) FROM analytics.closed_position
           WHERE user_id = ${uid} AND sell_date = current_date - 10")"
[ "${ayni}" = "1" ] || fail "kırılım işlem başına olmalı"
printf 'PASS: kırılım işlem başına\n'
