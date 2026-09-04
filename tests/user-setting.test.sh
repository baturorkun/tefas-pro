#!/usr/bin/env bash
# Kullanıcı ayarları ve devralma. DATABASE_URL yoksa atlanır.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIG="${PROJECT_ROOT}/db/migrations/030_user_setting.sql"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

grep -q "CREATE TABLE user_setting" "${MIG}" || fail "kullanıcı ayarı tablosu tanımlı olmalı"
grep -q "PRIMARY KEY (user_id, key)" "${MIG}" || fail "anahtar kullanıcı ve anahtardan oluşmalı"
grep -q "ON DELETE CASCADE" "${MIG}" || fail "kullanıcı silinince ayarları da silinmeli"

# Ayar oturumdaki kullanıcıya bağlı olmalı: id dışarıdan alınırsa bir kullanıcı
# başkasının ayarını okuyabilir veya yazabilirdi.
grep -q "userBenchmark(pool, user.id)" "${PROJECT_ROOT}/src/server/index.ts" \
  || fail "tercih ucu oturumdaki kullanıcıyı kullanmalı"
grep -q "writeUserSetting(pool, user.id" "${PROJECT_ROOT}/src/server/index.ts" \
  || fail "tercih yazma oturumdaki kullanıcıyı kullanmalı"
printf 'PASS: kullanıcı ayarı tablosu ve oturum bağı doğru\n'

if [ -z "${DATABASE_URL:-}" ] || ! command -v psql >/dev/null 2>&1 \
   || ! psql "${DATABASE_URL}" -tAc 'SELECT 1' >/dev/null 2>&1; then
  printf 'SKIP: veritabanı yok\n'; exit 0
fi
q() { psql "${DATABASE_URL}" -tAqc "$1"; }

uid="$(q "INSERT INTO app_user (username, type, password_hash, password_salt, is_active)
          VALUES ('__test_pref', 'user', 'x', 'y', false) RETURNING id")"
cleanup() { q "DELETE FROM app_user WHERE id = ${uid}" >/dev/null; }
trap cleanup EXIT

# Satırı olmayan kullanıcı genel ayarı devralır.
kendi="$(q "SELECT count(*) FROM user_setting WHERE user_id = ${uid} AND key = 'benchmark'")"
[ "${kendi}" = "0" ] || fail "yeni kullanıcının kişisel ayarı olmamalı"
printf 'PASS: yeni kullanıcı genel ayarı devralıyor\n'

# Aynı anahtar iki kez yazılmaz, güncellenir.
q "INSERT INTO user_setting (user_id, key, value) VALUES (${uid}, 'benchmark', '\"AAA\"'::jsonb)" >/dev/null
q "INSERT INTO user_setting (user_id, key, value) VALUES (${uid}, 'benchmark', '\"BBB\"'::jsonb)
   ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value" >/dev/null
n="$(q "SELECT count(*) FROM user_setting WHERE user_id = ${uid} AND key = 'benchmark'")"
v="$(q "SELECT value #>> '{}' FROM user_setting WHERE user_id = ${uid} AND key = 'benchmark'")"
[ "${n}" = "1" ] && [ "${v}" = "BBB" ] || fail "aynı anahtar güncellenmeli, çoğalmamalı (${n}/${v})"
printf 'PASS: aynı anahtar çoğalmıyor, güncelleniyor\n'

# Kullanıcı silinince ayarları da gider; öksüz satır kalmamalı.
cleanup; trap - EXIT
kalan="$(q "SELECT count(*) FROM user_setting WHERE user_id = ${uid}")"
[ "${kalan}" = "0" ] || fail "kullanıcı silindi ama ${kalan} ayar satırı kaldı"
printf 'PASS: kullanıcı silinince ayarları da siliniyor\n'

oksuz="$(q "SELECT count(*) FROM user_setting s
            WHERE NOT EXISTS (SELECT 1 FROM app_user u WHERE u.id = s.user_id)")"
[ "${oksuz}" = "0" ] || fail "${oksuz} sahipsiz ayar satırı var"
printf 'PASS: sahipsiz ayar satırı yok\n'

# Benchmark fonu toplanan fonlara girmeli: girmezse fon toplanmayı bırakır ve
# karşılaştırma sütunu sessizce bayatlar.
genel="$(q "SELECT value #>> '{}' FROM app_setting WHERE key='benchmark'")"
[ -n "${genel}" ] || fail "genel benchmark ayarı yok"
listede="$(q "SELECT count(*) FROM analytics.tracked_fund WHERE fund_code = '${genel}'")"
[ "${listede}" = "1" ] || fail "genel benchmark ${genel} toplanan fonlarda yok"
printf 'PASS: genel benchmark toplanan fonlarda (%s)\n' "${genel}"

kacak="$(q "SELECT count(*) FROM user_setting u
            WHERE u.key = 'benchmark'
              AND EXISTS (SELECT 1 FROM dim_fund f WHERE f.fund_code = u.value #>> '{}')
              AND (u.value #>> '{}') NOT IN (SELECT fund_code FROM analytics.tracked_fund)")"
[ "${kacak}" = "0" ] || fail "${kacak} kullanıcı benchmark'ı toplanan fonlarda yok"
printf 'PASS: kullanıcı benchmark fonları toplanan fonlarda\n'

# Tanımsız kod collector'a sızmamalı: her koşumda hata verirdi.
sizinti="$(q "SELECT count(*) FROM analytics.tracked_fund t
              WHERE NOT EXISTS (SELECT 1 FROM dim_fund f WHERE f.fund_code = t.fund_code)")"
[ "${sizinti}" = "0" ] || fail "toplanan fonlarda tanımsız ${sizinti} kod var"
printf 'PASS: toplanan fonların hepsi tanımlı\n'
