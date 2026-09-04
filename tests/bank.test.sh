#!/usr/bin/env bash
# Banka tanımları ve foreign key koruması. DATABASE_URL yoksa atlanır.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIG="${PROJECT_ROOT}/db/migrations/027_bank.sql"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

grep -q "CREATE TABLE bank" "${MIG}" || fail "banka tablosu tanımlı olmalı"
# Kural veritabanında durmalı: uygulama kodundaki bir kontrol db/sync.sh veya
# doğrudan psql gibi diğer yazma yollarında atlanırdı.
grep -q "ON DELETE RESTRICT" "${MIG}" || fail "kullanılan banka silinemez olmalı"
grep -q "ON UPDATE CASCADE" "${MIG}" || fail "yeniden adlandırma işlemleri taşımalı"
printf 'PASS: banka tablosu ve foreign key kuralları tanımlı\n'

if [ -z "${DATABASE_URL:-}" ] || ! command -v psql >/dev/null 2>&1 \
   || ! psql "${DATABASE_URL}" -tAc 'SELECT 1' >/dev/null 2>&1; then
  printf 'SKIP: veritabanı yok\n'; exit 0
fi
q() { psql "${DATABASE_URL}" -tAqc "$1"; }

# Migration mevcut işlemlerdeki bankaları taşımalı; sahipsiz satır kalmamalı.
oksuz="$(q "SELECT count(*) FROM portfolio_transaction t
            WHERE NOT EXISTS (SELECT 1 FROM bank b WHERE b.name = t.platform)")"
[ "${oksuz}" = "0" ] || fail "tanımsız bankaya bağlı ${oksuz} işlem var"
printf 'PASS: her işlemin bankası tanımlı\n'

# Kullanılan banka silinemez.
kullanilan="$(q "SELECT platform FROM portfolio_transaction LIMIT 1")"
if [ -n "${kullanilan}" ]; then
  if psql "${DATABASE_URL}" -tAqc \
      "BEGIN; DELETE FROM bank WHERE name = '${kullanilan}'; ROLLBACK;" >/dev/null 2>&1; then
    fail "kullanılan banka silinebildi: ${kullanilan}"
  fi
  printf 'PASS: kullanılan banka silinemiyor (%s)\n' "${kullanilan}"
fi

# Kullanılmayan banka silinebilir.
psql "${DATABASE_URL}" -tAqc \
  "INSERT INTO bank(name) VALUES ('__test__') ON CONFLICT DO NOTHING" >/dev/null
psql "${DATABASE_URL}" -tAqc "DELETE FROM bank WHERE name='__test__'" >/dev/null \
  || fail "kullanılmayan banka silinemedi"
printf 'PASS: kullanılmayan banka silinebiliyor\n'

# Var olmayan bankaya işlem yazılamaz.
fon="$(q "SELECT fund_code FROM portfolio_transaction LIMIT 1")"
kul="$(q "SELECT user_id FROM portfolio_transaction LIMIT 1")"
if [ -n "${fon}" ]; then
  if psql "${DATABASE_URL}" -tAqc "BEGIN;
      INSERT INTO portfolio_transaction (user_id, fund_code, units, trade_date, platform)
      VALUES (${kul}, '${fon}', 1, '2026-01-02', '__yok__'); ROLLBACK;" >/dev/null 2>&1; then
    fail "tanımsız bankaya işlem yazılabildi"
  fi
  printf 'PASS: tanımsız bankaya işlem yazılamıyor\n'
fi

# Sıralama Türkçe: veritabanının collation'ı Türkçe değil ve "tr-TR" bu
# sunucuda tanımlı değil, o yüzden SQL'de sıralanırsa "İş" ve "Vakıflar"
# listenin sonuna düşüyor. Sıra uygulamada kuruluyor.
grep -q "localeCompare(b.name, 'tr')" "${PROJECT_ROOT}/src/server/repository.ts" \
  || fail "banka listesi Türkçe sıralanmalı"
grep -q "ORDER BY count(t.id) DESC, b.name" "${PROJECT_ROOT}/src/server/repository.ts" \
  && fail "sıralama SQL'de kalmış; Türkçe harfler yanlış yere düşer"
printf 'PASS: banka listesi Türkçe sıralanıyor\n'
