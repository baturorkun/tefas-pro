#!/usr/bin/env bash
# Fon hareketlerindeki para değerleri. DATABASE_URL yoksa atlanır.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="${PROJECT_ROOT}/src/server/repository.ts"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

# Aynı kaynak: Portföyüm, Dağılım ve Fon Hareketleri farklı rakam gösteremez.
# LEFT olmalı: getiri günü olmayan işlem dilim üretmez ama satır kalmalı,
# yoksa kullanıcı az önce girdiği kaydı listede bulamaz.
grep -q "LEFT JOIN analytics.position_slice s ON s.transaction_id = t.id" "${REPO}" \
  || fail "işlem listesi position_slice ile LEFT JOIN yapmalı"
printf 'PASS: işlem listesi dilim kaynağını kullanıyor\n'

if [ -z "${DATABASE_URL:-}" ] || ! command -v psql >/dev/null 2>&1 \
   || ! psql "${DATABASE_URL}" -tAc 'SELECT 1' >/dev/null 2>&1; then
  printf 'SKIP: veritabanı yok\n'; exit 0
fi
q() { psql "${DATABASE_URL}" -tAqc "$1"; }

uid="$(q "SELECT user_id FROM portfolio_transaction GROUP BY user_id ORDER BY count(*) DESC LIMIT 1")"
[ -n "${uid}" ] || { printf 'SKIP: portföyü olan kullanıcı yok\n'; exit 0; }

a="$(q "SELECT round(sum(value)) FROM analytics.position_slice WHERE user_id=${uid} AND is_open")"
b="$(q "SELECT round(sum(value)) FROM analytics.position_return
        WHERE user_id=${uid} AND is_open AND NOT simulated")"
[ "${a}" = "${b}" ] || fail "açık toplam Portföyüm ile tutmuyor: ${a} / ${b}"
printf 'PASS: açık işlem toplamı Portföyüm ile tutarlı (%s)\n' "${a}"

# Kapanmış satırda değer, satış anındaki değerdir: Kapananlar ile tutmalı.
c="$(q "SELECT round(sum(s.value - s.cost)) FROM analytics.position_slice s
        WHERE s.user_id=${uid} AND NOT s.is_open")"
d="$(q "SELECT round(sum(realized_gain)) FROM analytics.closed_position WHERE user_id=${uid}")"
[ "${c}" = "${d}" ] || fail "kapanmış K/Z Kapananlar ile tutmuyor: ${c} / ${d}"
printf 'PASS: kapanmış işlem K/Z Kapananlar ile tutarlı (%s)\n' "${c}"

# Birim fiyat hesabı sıfıra bölmemeli.
z="$(q "SELECT count(*) FROM portfolio_transaction WHERE user_id=${uid} AND units <= 0")"
[ "${z}" = "0" ] || fail "${z} işlemin adedi sıfır veya negatif"
printf 'PASS: birim fiyat hesabı sıfıra bölünmüyor\n'
