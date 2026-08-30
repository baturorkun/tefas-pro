#!/usr/bin/env bash
# scripts/resolve-deployment-target.sh davranış testi.
#
# Port şeması bir kere yanlış giderse yanlış slot'a deploy edilir veya başka bir
# projenin portu ezilir; bu yüzden eşleme testle sabitlenir.
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RESOLVE="${PROJECT_ROOT}/scripts/resolve-deployment-target.sh"

fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

expect() {
  branch="$1"; want="$2"
  got="$(bash "$RESOLVE" "$branch")" || fail "beklenmedik hata: $branch"
  [[ "$got" == "$want" ]] || fail "$branch → '$got', beklenen '$want'"
}

expect_reject() {
  branch="$1"
  if bash "$RESOLVE" "$branch" >/dev/null 2>&1; then
    fail "reddedilmeliydi: $branch"
  fi
}

expect main $'slot=main\nport=9100'
printf 'PASS: main taban porta düşer\n'

expect factory/RQ-0007 $'slot=rq-7\nport=9107'
expect rq-0001 $'slot=rq-1\nport=9101'
expect feature-RQ-0012-test $'slot=rq-12\nport=9112'
printf 'PASS: RQ branch"i taban + numara portuna düşer\n'

# 10# olmadan 0010 ve 0008 sekizlik sayı sayılır; 0008 sekizlikte geçersizdir.
expect rq-0010 $'slot=rq-10\nport=9110'
expect rq-0008 $'slot=rq-8\nport=9108'
printf 'PASS: baştaki sıfırlar sekizlik yorumlanmaz\n'

expect FACTORY/RQ-0003 $'slot=rq-3\nport=9103'
printf 'PASS: büyük/küçük harf duyarsız\n'

# 9000-9099 aynı sunucuda NetForgeSH"e ait; taban o aralığın dışında kalmalı.
port_main="$(bash "$RESOLVE" main | sed -n 's/^port=//p')"
(( port_main >= 9100 )) || fail "taban port NetForgeSH aralığına giriyor: $port_main"
printf 'PASS: taban port 9000-9099 aralığıyla çakışmıyor\n'

expect_reject feature/no-number
expect_reject ''
expect_reject rq-0
printf 'PASS: geçersiz branch adı reddedilir\n'
