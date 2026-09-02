#!/usr/bin/env bash
# db/sync.sh davranış testleri. Gerçek veritabanı ya da SSH gerektirmez:
# doğrulama hataları bağlantı denemesinden önce döner.
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SYNC="${PROJECT_ROOT}/db/sync.sh"

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

# Hata yollarında betiğin çıkış kodunu ve mesajını birlikte yakalar.
run_expect_fail() {
  local desc="$1" pattern="$2"
  shift 2
  local out status
  set +e
  out="$(DATABASE_URL='' "${SYNC}" "$@" 2>&1)"
  status=$?
  set -e
  [ "${status}" -ne 0 ] || fail "${desc}: komut başarısız olmalıydı"
  [[ "${out}" == *"${pattern}"* ]] || fail "${desc}: beklenen mesaj yok — ${out}"
}

help_output="$("${SYNC}" --help)"
[[ "${help_output}" == *"db/sync.sh from-remote <user@host>"* ]] || fail "help remote yönü belgelemeli"
printf 'PASS: sync help from-remote kullanımını belgeliyor\n'

# Ters yön bilinçli olarak yok: üretim veritabanına restore yolu bulunmamalı.
[[ "${help_output}" != *"to-remote"* ]] || fail "help ters yönü önermemeli"
grep -q 'to-remote' "${SYNC}" && fail "betikte ters yön bulunmamalı"
grep -qE 'psql[^|]*\$\{?REMOTE' "${SYNC}" && fail "uzak veritabanına yazan çağrı bulunmamalı"
printf 'PASS: ters yön (local -> remote) hiç uygulanmamış\n'

run_expect_fail "hedefsiz çağrı" "hedefi gerektirir" from-remote
printf 'PASS: hedef verilmezse reddedilir\n'

run_expect_fail "user@host olmayan hedef" "user@host biçiminde olmalıdır" from-remote sunucu
printf 'PASS: user@host olmayan hedef reddedilir\n'

run_expect_fail "seçenek benzeri hedef" "Geçersiz SSH hedefi" from-remote -p22
printf 'PASS: seçenek benzeri hedef reddedilir\n'

run_expect_fail "boşluklu hedef" "Geçersiz SSH hedefi" from-remote 'root@sunucu; rm -rf /'
printf 'PASS: kabuk metakarakteri taşıyan hedef reddedilir\n'

run_expect_fail "sıfır port" "SSH portu" from-remote root@sunucu -p 0
run_expect_fail "aralık dışı port" "SSH portu" from-remote root@sunucu -p 70000
run_expect_fail "sayısal olmayan port" "SSH portu" from-remote root@sunucu -p abc
run_expect_fail "başında sıfır olan port" "SSH portu" from-remote root@sunucu -p 022
printf 'PASS: SSH portu 1-65535 aralığında doğrulanır\n'

run_expect_fail "bilinmeyen seçenek" "Bilinmeyen seçenek" from-remote root@sunucu --force
printf 'PASS: bilinmeyen seçenek reddedilir\n'

run_expect_fail "bilinmeyen komut" "Bilinmeyen komut" pull
printf 'PASS: bilinmeyen komut reddedilir\n'

# DATABASE_URL kontrolü hedef doğrulamasından sonra, SSH'tan önce gelir.
run_expect_fail "DATABASE_URL yok" "DATABASE_URL tanımlı değil" from-remote root@sunucu
printf 'PASS: DATABASE_URL tanımsızsa anlaşılır hata verir\n'

# app_session içeriği kopyalanmamalı, app_user kopyalanmalı.
grep -q 'EXCLUDED_TABLES="app_session"' "${SYNC}" || fail "app_session hariç tutulmalı"
grep -q 'exclude-table-data' "${SYNC}" || fail "hariç tutma pg_dump seçeneğiyle yapılmalı"
grep -q 'exclude-table-data=public.app_user' "${SYNC}" && fail "app_user hariç tutulmamalı"
printf 'PASS: app_session içeriği hariç, app_user dahil\n'

# Restore uzak şemayı getirir; local'deki yeni migration'lar sonradan uygulanmalı.
grep -q 'pnpm db:migrate' "${SYNC}" || fail "sync sonrası migration çalışmalı"
printf 'PASS: sync sonrası migration uygulanır\n'

grep -q 'ASSUME_YES' "${SYNC}" || fail "--yes onayı atlamalı"
printf 'PASS: --yes onay sorusunu atlar\n'

# Restore hatası yutulmamalı: eksik restore "başarılı" görünürse bozuk veriyle
# çalışmaya devam edilir.
grep -q 'ON_ERROR_STOP=on' "${SYNC}" || fail "restore hatada durmalı"
grep -q 'ON_ERROR_STOP=off' "${SYNC}" && fail "hata yutulmamalı"
printf 'PASS: restore hatası yutulmaz\n'

# Uzak pg_dump ile local psql farklı sürüm ailesinden olabilir (16.x / 17.x).
grep -q 'unrestrict' "${SYNC}" || fail "sürüm uyumsuzluğu meta komutları filtrelenmeli"
printf 'PASS: sürüm uyumsuzluğu meta komutları filtrelenir\n'

grep -q "ANALYZE" "${SYNC}" || fail "restore sonrası ANALYZE çalışmalı"
printf 'PASS: restore sonrası ANALYZE çalışır\n'
