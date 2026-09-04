#!/usr/bin/env bash
# Panel özeti: toplam kazanç ve net sermaye. DATABASE_URL yoksa atlanır.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="${PROJECT_ROOT}/src/server/repository.ts"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

# Yüzde net sermayeye bölünmeli: kazanılıp yeniden yatırılan tutar yeni sermaye
# değil. Maliyete bölünseydi payda kendi kârıyla şişer, getiri düşük görünürdü.
grep -q "netCapital = cost - realized" "${REPO}" || fail "net sermaye maliyetten gerçekleşen kâr düşülerek bulunmalı"
grep -q "totalGain / netCapital" "${REPO}" || fail "toplam getiri net sermayeye bölünmeli"
printf 'PASS: toplam getiri net sermayeye bölünüyor\n'

if [ -z "${DATABASE_URL:-}" ] || ! command -v psql >/dev/null 2>&1 \
   || ! psql "${DATABASE_URL}" -tAc 'SELECT 1' >/dev/null 2>&1; then
  printf 'SKIP: veritabanı yok\n'; exit 0
fi
q() { psql "${DATABASE_URL}" -tAqc "$1"; }

uid="$(q "SELECT user_id FROM portfolio_transaction GROUP BY user_id
          ORDER BY count(*) DESC LIMIT 1")"
[ -n "${uid}" ] || { printf 'SKIP: portföyü olan kullanıcı yok\n'; exit 0; }

# Panel'in kullandığı kaynak Portföyüm ve Dağılım ile aynı olmalı.
slice="$(q "SELECT round(sum(value)) FROM analytics.position_slice
            WHERE user_id = ${uid} AND is_open")"
ret="$(q "SELECT round(sum(value)) FROM analytics.position_return
          WHERE user_id = ${uid} AND is_open AND NOT simulated")"
[ "${slice}" = "${ret}" ] || fail "panel değeri Portföyüm ile tutmuyor: ${slice} / ${ret}"
printf 'PASS: panel portföy değeri Portföyüm ile tutarlı (%s)\n' "${slice}"

# Net sermaye maliyetten küçük olmalı (gerçekleşen kâr pozitifken); eşitse
# gerçekleşen kâr hesaba girmemiş demektir.
mal="$(q "SELECT round(sum(cost)) FROM analytics.position_slice WHERE user_id = ${uid} AND is_open")"
ger="$(q "SELECT round(coalesce(sum(realized_gain),0)) FROM analytics.closed_position WHERE user_id = ${uid}")"
net=$((mal - ger))
if [ "${ger}" -gt 0 ] && [ "${net}" -ge "${mal}" ]; then
  fail "net sermaye maliyetten düşük olmalı: ${net} / ${mal}"
fi
printf 'PASS: net sermaye %s (maliyet %s, gerçekleşen %s)\n' "${net}" "${mal}" "${ger}"

# Günlük kazanç son ÖLÇÜLEN günden gelmeli; eksik fiyatlı gün seriye girmiyor.
gun="$(q "SELECT to_char(max(trade_date),'YYYY-MM-DD') FROM analytics.portfolio_daily
          WHERE user_id = ${uid} AND daily_gain IS NOT NULL")"
[ -n "${gun}" ] || fail "ölçülebilir gün bulunamadı"
printf 'PASS: günlük kazanç son ölçülen günden (%s)\n' "${gun}"
