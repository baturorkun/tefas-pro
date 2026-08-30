#!/usr/bin/env bash
# Branch adından deployment slot'unu ve portunu üretir.
#
#   main              → slot=main   port=9100
#   factory/RQ-0007   → slot=rq-7   port=9107
#
# Taban port burada tanımlıdır ve başka hiçbir yerde tekrarlanmaz. 9000-9099
# aralığı aynı sunucuda NetForgeSH'e ait (netforgesh-main 9000,
# netforgesh-rq-22 9022); 9100 tabanı o aralıkla çakışmaz.
set -euo pipefail

readonly PORT_BASE=9100

branch_name="${1:-}"
normalized_branch="$(printf '%s' "$branch_name" | tr '[:upper:]' '[:lower:]')"

if [[ "$normalized_branch" == "main" ]]; then
  printf 'slot=main\nport=%d\n' "$PORT_BASE"
  exit 0
fi

if [[ ! "$normalized_branch" =~ rq-([0-9]+) ]]; then
  echo "Branch main olmalı veya rq-<sayı> içermeli: $branch_name" >&2
  exit 2
fi

digits="${BASH_REMATCH[1]}"
# 10# olmadan başındaki sıfırlar sekizlik sayı sayılır: 0010 → hata, 0008 → hata.
request_number=$((10#$digits))
if (( request_number < 1 )); then
  echo "RQ numarası sıfırdan büyük olmalı" >&2
  exit 2
fi

port=$((PORT_BASE + request_number))
if (( port > 65535 )); then
  echo "RQ numarası geçerli TCP port aralığının dışına düşüyor: $request_number" >&2
  exit 2
fi

printf 'slot=rq-%d\nport=%d\n' "$request_number" "$port"
