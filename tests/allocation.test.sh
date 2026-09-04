#!/usr/bin/env bash
# Dağılım ekranının veri tabanı tarafı. DATABASE_URL yoksa atlanır.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIG="${PROJECT_ROOT}/db/migrations/032_position_slice.sql"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

grep -q "CREATE VIEW analytics.position_slice" "${MIG}" || fail "dilim view'ı tanımlı olmalı"
# Aynı fon iki bankada tutulabiliyor; platform düşerse banka kırılımı çıkmaz.
grep -q "c.platform" "${MIG}" || fail "dilim banka bilgisini taşımalı"
grep -q "f.umbrella_type" "${MIG}" || fail "dilim kategori bilgisini taşımalı"
printf 'PASS: dilim view tanımı banka ve kategori taşıyor\n'

if [ -z "${DATABASE_URL:-}" ] || ! command -v psql >/dev/null 2>&1 \
   || ! psql "${DATABASE_URL}" -tAc 'SELECT 1' >/dev/null 2>&1; then
  printf 'SKIP: veritabanı yok\n'; exit 0
fi
q() { psql "${DATABASE_URL}" -tAqc "$1"; }

# Toplamlar Portföyüm ile tutmalı: iki ekran aynı portföyü anlatıyor, farklı
# rakam verirlerse hangisinin doğru olduğu anlaşılmaz.
fark="$(q "SELECT count(*) FROM (
  SELECT user_id,
         round(sum(cost))  AS c,
         round(sum(value)) AS v
  FROM analytics.position_slice WHERE is_open GROUP BY user_id) s
  FULL JOIN (
  SELECT user_id,
         round(sum(cost))  AS c,
         round(sum(value)) AS v
  FROM analytics.position_return WHERE is_open AND NOT simulated GROUP BY user_id) r
  USING (user_id)
  WHERE s.c IS DISTINCT FROM r.c OR s.v IS DISTINCT FROM r.v")"
[ "${fark}" = "0" ] || fail "dilim toplamı position_return ile tutmuyor (${fark} kullanıcı)"
printf 'PASS: dağılım toplamı Portföyüm ile tutarlı\n'

# Kapanmış pozisyon dağılıma girmemeli.
kapali="$(q "SELECT count(*) FROM analytics.position_slice s
             JOIN portfolio_transaction t ON t.id = s.transaction_id
             WHERE s.is_open AND t.sell_date IS NOT NULL AND t.sell_date <= current_date")"
[ "${kapali}" = "0" ] || fail "${kapali} kapanmış pozisyon açık sayılmış"
printf 'PASS: kapanmış pozisyon dağılımda yok\n'

# Her açık dilimin bankası tanımlı olmalı; kategori boş olabilir ama gruplama
# onu 'Bilinmiyor' altında toplar, sessizce düşmez.
banksiz="$(q "SELECT count(*) FROM analytics.position_slice
              WHERE is_open AND (platform IS NULL OR platform = '')")"
[ "${banksiz}" = "0" ] || fail "${banksiz} dilimin bankası yok"
printf 'PASS: her dilimin bankası tanımlı\n'
