#!/usr/bin/env bash
# Shell testlerinin kendi tuzakları.
#
# Bu test bir olaydan doğdu: RQ-0061 fon penceresini yeniden yapılandırdı,
# `pending-note` fonksiyonun sonundan ortasına taşındı ve
# `awk '/fn/,/^}/' | grep -q pat` yerelde geçerken CI'da düştü. Sebep kodda
# değil testteydi: `set -o pipefail` altında `grep -q` ilk eşleşmede çıkıyor,
# awk hâlâ yazıyorsa SIGPIPE alıp 141 dönüyor ve pipefail bunu hata sayıyor.
# macOS'ta awk çıktısı tek write'a sığıp grep kapanmadan bitiyor, Linux'ta
# bitmiyor — o yüzden yerelde görünmüyor. 8 testte 21 satır aynı mayındı.
#
# Doğrusu: grep -q pat <<<"$(awk ...)" — herestring awk'ı sonuna kadar
# okutuyor, SIGPIPE oluşmuyor.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
T="${PROJECT_ROOT}/tests"

# Tek satırda awk ... | grep -q
# Yorum satırları ve bu dosyanın kendisi taranmaz: kural burada anlatılıyor.
tara() { grep -n "$1" "${T}"/*.sh | grep -v "test-hygiene.test.sh" | grep -v ':[[:space:]]*#' || true; }
kotu="$(tara 'awk .*| *grep -q')"
# Satır başında | grep -q (çok satırlı pipeline)
kotu="${kotu}$(tara '^[[:space:]]*|[[:space:]]*grep -q')"
if [ -n "${kotu}" ]; then
  printf '%s\n' "${kotu}" >&2
  fail "pipefail altinda 'awk ... | grep -q' SIGPIPE ile dusuyor; <<<\"\$(awk ...)\" kullan"
fi
printf 'PASS: hicbir test awk ciktisini grep -q ile kesmiyor\n'

# pipefail her testte açık olmalı: yukarıdaki kural buna dayanıyor ve
# kapalı bir testte bozuk pipeline sessizce geçerdi.
for f in "${T}"/*.test.sh; do
  grep -q '^set -euo pipefail' "${f}" || fail "pipefail kapali: $(basename "${f}")"
done
printf 'PASS: her shell testi set -euo pipefail ile basliyor\n'
