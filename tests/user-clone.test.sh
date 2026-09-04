#!/usr/bin/env bash
# Kullanıcı kopyalama. DATABASE_URL yoksa kaynak kontrolleriyle yetinilir.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
SRC="${PROJECT_ROOT}/src/db/user.ts"

# Oturum kopyalanmamalı: oturum kişiye ait, kopyalanırsa yeni hesap kaynağın
# açık oturumunu devralırdı.
grep -q "app_session" "${SRC}" || fail "app_session'ın neden kopyalanmadığı yazılı olmalı"
grep -qE "INSERT INTO app_session" "${SRC}" && fail "oturum kopyalanmamalı"

# Kaynak korunmalı: transfer taşır, clone kopyalar.
grep -q "DELETE FROM user_watchlist" "${SRC}" || fail "transfer hâlâ taşımalı"
awk '/export async function clone/,/^}/' "${SRC}" | grep -qE "DELETE|UPDATE .* SET user_id" \
  && fail "clone kaynağa dokunmamalı"
printf 'PASS: clone kaynağı korur, oturum kopyalamaz\n'

# Var olan kullanıcının üzerine yazılmamalı.
grep -q "zaten var" "${SRC}" || fail "var olan hedef reddedilmeli"
printf 'PASS: var olan hedef reddediliyor\n'

# drop geri alınamaz: onaysız çalışmamalı ve son yöneticiyi silmemeli.
grep -q "bayraklar.includes('--yes')" "${SRC}" || fail "drop onay istemeli"
grep -q "son yönetici; silinemez" "${SRC}" || fail "son yönetici korunmalı"
# Sıra foreign key'e göre: işlemler kendi aralarında bağlı, referans önce
# boşaltılmalı yoksa bölünmüş parçayı silmek kardeşine takılır.
awk '/export async function drop/,/^}/' "${SRC}" \
  | grep -q "SET split_from_id = NULL" || fail "silmeden önce bölünme referansı boşaltılmalı"
printf 'PASS: drop onay istiyor, son yöneticiyi ve sırayı koruyor\n'

if [ -z "${DATABASE_URL:-}" ] || ! command -v psql >/dev/null 2>&1 \
   || ! psql "${DATABASE_URL}" -tAc 'SELECT 1' >/dev/null 2>&1; then
  printf 'SKIP: veritabanı yok\n'; exit 0
fi
q() { psql "${DATABASE_URL}" -tAqc "$1"; }

# Bölünmüş bir kaydın kopyası kendi hesabındaki satırı göstermeli. Eşleme
# yapılmasaydı kopya kaynağın satırını gösterirdi ve iki hesabın verisi
# birbirine karışırdı.
karisik="$(q "SELECT count(*) FROM portfolio_transaction c
              JOIN portfolio_transaction p ON p.id = c.split_from_id
              WHERE c.user_id <> p.user_id")"
[ "${karisik}" = "0" ] || fail "${karisik} bölünmüş kayıt başka hesabın satırını gösteriyor"
printf 'PASS: bölünme referansları hesap sınırını aşmıyor\n'
