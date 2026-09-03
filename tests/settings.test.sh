#!/usr/bin/env bash
# Ayar tablosu ve emir tarihi kolonları. DATABASE_URL yoksa atlanır.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIG="${PROJECT_ROOT}/db/migrations/026_settings_and_order_dates.sql"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

grep -q "CREATE TABLE IF NOT EXISTS app_setting" "${MIG}" || fail "ayar tablosu tanımlı olmalı"
grep -q "buy_order_date" "${MIG}" && grep -q "sell_order_date" "${MIG}" \
  || fail "emir tarihi kolonları tanımlı olmalı"
printf 'PASS: ayar tablosu ve emir tarihi kolonları tanımlı\n'

if [ -z "${DATABASE_URL:-}" ] || ! command -v psql >/dev/null 2>&1 \
   || ! psql "${DATABASE_URL}" -tAc 'SELECT 1' >/dev/null 2>&1; then
  printf 'SKIP: veritabanı yok\n'; exit 0
fi
q() { psql "${DATABASE_URL}" -tAqc "$1"; }

n="$(q "SELECT jsonb_array_length(value) FROM app_setting WHERE key='holidays'")"
[ "${n}" -ge 9 ] || fail "başlangıç tatil listesi eksik: ${n}"
printf 'PASS: başlangıç tatil listesi yüklü (%s gün)\n' "${n}"

# Sabit tatiller yıl taşımamalı: 23 Nisan her yıl 23 Nisan, yıl yazılırsa liste
# her sene elden geçirilmek zorunda kalır.
sabit="$(q "SELECT count(*) FROM (SELECT jsonb_array_elements_text(value) AS h
            FROM app_setting WHERE key='holidays') x WHERE length(h) = 5")"
[ "${sabit}" -ge 7 ] || fail "sabit tatiller AA-GG biçiminde olmalı, bulunan: ${sabit}"
printf 'PASS: sabit tatiller yılsız tutuluyor (%s gün)\n' "${sabit}"

# Listedeki geçmiş tatiller fiyat verisiyle tutarlı olmalı: o günlerde hiçbir
# fon fiyatlanmamış olmalı. Liste bozulursa hesap sessizce kayar.
# Yıla özel girişler (bayramlar) fiyat verisiyle tutarlı olmalı: o günlerde
# hiçbir fon fiyatlanmamış olmalı. Liste bozulursa hesap sessizce kayar.
bad="$(q "SELECT count(*) FROM (
  SELECT h::date AS d FROM (SELECT jsonb_array_elements_text(value) AS h
    FROM app_setting WHERE key='holidays') x WHERE length(h) > 5
) h WHERE h.d <= (SELECT max(trade_date) FROM fact_fund_daily WHERE daily_return_pct IS NOT NULL)
  AND EXISTS (SELECT 1 FROM fact_fund_daily f WHERE f.trade_date=h.d AND f.daily_return_pct IS NOT NULL)")"
[ "${bad}" = "0" ] || fail "listede fiyat verisi olan gün var: ${bad}"
printf 'PASS: yıla özel tatiller fiyat verisiyle tutarlı\n'

# Satış emri varken satış tarihi de olmalı.
uid="$(q "SELECT id FROM app_user ORDER BY id LIMIT 1")"
fund="$(q "SELECT fund_code FROM dim_fund LIMIT 1")"
set +e
out="$(psql "${DATABASE_URL}" -tAqc "INSERT INTO portfolio_transaction
  (user_id, fund_code, platform, trade_date, units, sell_order_date)
  VALUES (${uid}, '${fund}', '__test', current_date - 5, 1, current_date)" 2>&1)"
st=$?
set -e
[ "${st}" -ne 0 ] || { q "DELETE FROM portfolio_transaction WHERE platform='__test'" >/dev/null; fail "satış emri satış tarihi olmadan kabul edilmemeli"; }
printf 'PASS: satış emri satış tarihi olmadan reddediliyor\n'

# Benchmark ayarı: karşılaştırma noktası olmadan getiri "iyi mi kötü mü"
# sorusunu cevaplamıyor.
bench="$(q "SELECT value #>> '{}' FROM app_setting WHERE key='benchmark'")"
if [ -n "${bench}" ]; then
  veri="$(q "SELECT count(*) FROM fact_fund_daily
             WHERE fund_code='${bench}' AND daily_return_pct IS NOT NULL")"
  [ "${veri}" -gt 0 ] || fail "benchmark fonu ${bench} için getiri verisi yok"
  printf 'PASS: benchmark fonu %s kullanılabilir (%s gün)\n' "${bench}" "${veri}"
else
  printf 'NOT: benchmark henüz kaydedilmemiş, varsayılan kullanılıyor\n'
fi

# Eksik fiyatlı gün değerlenmemeli: o gün fiyatı olmayan fon sıfır sayılırsa
# portföy çökmüş görünüyor. Ölçülen veride 3 Eylül'de 39 fondan 2'si vardı ve
# değer 3.762.405'ten 37.566'ya düşmüştü.
eksik="$(q "WITH tam AS (
              SELECT p.trade_date,
                     (SELECT count(DISTINCT t.fund_code) FROM portfolio_transaction t
                      WHERE t.user_id = p.user_id AND t.trade_date <= p.trade_date
                        AND (t.sell_date IS NULL OR t.sell_date >= p.trade_date)) AS gereken,
                     (SELECT count(DISTINCT t.fund_code) FROM portfolio_transaction t
                      JOIN fact_fund_daily f ON f.fund_code = t.fund_code
                       AND f.trade_date = p.trade_date AND f.daily_return_pct IS NOT NULL
                      WHERE t.user_id = p.user_id AND t.trade_date <= p.trade_date
                        AND (t.sell_date IS NULL OR t.sell_date >= p.trade_date)) AS var
              FROM analytics.portfolio_daily p)
            SELECT count(*) FROM tam WHERE var < gereken")"
[ "${eksik}" = "0" ] || fail "${eksik} eksik fiyatlı gün seriye girmiş"
printf 'PASS: eksik fiyatlı günler seriye girmiyor\n'
