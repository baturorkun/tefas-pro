#!/usr/bin/env bash
# FIFO satışın veritabanı tarafı. DATABASE_URL yoksa atlanır.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

MIG="${PROJECT_ROOT}/db/migrations/034_transaction_split.sql"
grep -q "split_from_id" "${MIG}" || fail "bölünme referansı tanımlı olmalı"
# Sıra alış tarihine göre olmalı; kimliğe göre sıralamak sonradan girilen eski
# bir alımı yanlış yere koyardı.
grep -q "sell_date IS NULL$" "${PROJECT_ROOT}/src/server/repository.ts" \
  || fail "yalnız açık kayıtlar satılabilmeli"
grep -q "ORDER BY trade_date, id" "${PROJECT_ROOT}/src/server/repository.ts" \
  || fail "sıra alış tarihine göre olmalı"
# Havuz fon VE banka bazında: Fiba'daki ve Nkolay'daki paylar ayrı.
grep -q "fund_code = \$2 AND platform = \$3" "${PROJECT_ROOT}/src/server/repository.ts" \
  || fail "sıra fon ve banka bazında olmalı"
printf 'PASS: FIFO sırası fon ve banka bazında, alış tarihine göre\n'

if [ -z "${DATABASE_URL:-}" ] || ! command -v psql >/dev/null 2>&1 \
   || ! psql "${DATABASE_URL}" -tAc 'SELECT 1' >/dev/null 2>&1; then
  printf 'SKIP: veritabanı yok\n'; exit 0
fi
q() { psql "${DATABASE_URL}" -tAqc "$1"; }

# Hiçbir fon+bankada, daha sonra alınmış bir kayıt satılmışken daha önce
# alınmış bir kayıt açık kalmamalı.
ihlal="$(q "SELECT count(*) FROM portfolio_transaction s
            JOIN portfolio_transaction a
              ON a.user_id = s.user_id AND a.fund_code = s.fund_code
             AND a.platform = s.platform AND a.trade_date < s.trade_date
            WHERE s.sell_date IS NOT NULL AND a.sell_date IS NULL")"
[ "${ihlal}" = "0" ] || fail "${ihlal} FIFO ihlali var: eski kayıt açıkken yenisi satılmış"
printf 'PASS: veride FIFO ihlali yok\n'

# Bölünen kayıtların iki parçası aynı alış tarihini ve bankayı taşımalı;
# taşımazsa alış fiyatları ayrışır ve maliyet bozulur.
sapan="$(q "SELECT count(*) FROM portfolio_transaction c
            JOIN portfolio_transaction p ON p.id = c.split_from_id
            WHERE c.trade_date <> p.trade_date OR c.platform <> p.platform
               OR c.fund_code <> p.fund_code OR c.user_id <> p.user_id")"
[ "${sapan}" = "0" ] || fail "${sapan} bölünmüş kayıt aslından farklı alış tarihi veya banka taşıyor"
printf 'PASS: bölünmüş kayıtlar alış tarihini ve bankayı koruyor\n'

# Bölünmüş parçaların birim maliyeti aynı olmalı.
fark="$(q "SELECT count(*) FROM analytics.position_slice a
           JOIN portfolio_transaction ct ON ct.id = a.transaction_id
           JOIN analytics.position_slice b ON b.transaction_id = ct.split_from_id
           JOIN portfolio_transaction pt ON pt.id = b.transaction_id
           WHERE abs(a.cost / ct.units - b.cost / pt.units) > 0.000001")"
[ "${fark}" = "0" ] || fail "${fark} bölünmüş kayıtta birim maliyet ayrışmış"
printf 'PASS: bölünmüş kayıtlarda birim maliyet aynı\n'

# Bölünme zinciri değil kök: bir parça tekrar bölünürse yeni parça ilk alıma
# bağlanmalı. Zincir olsaydı "bu satır kaç paylık alımdan geldi" sorusunun
# cevabı parçadan parçaya değişirdi.
grep -q "coalesce(split_from_id, id)" "${PROJECT_ROOT}/src/server/repository.ts" \
  || fail "yeni parça bölünen satıra değil köke bağlanmalı"
zincir="$(q "SELECT count(*) FROM portfolio_transaction c
             JOIN portfolio_transaction p ON p.id = c.split_from_id
             WHERE p.split_from_id IS NOT NULL")"
[ "${zincir}" = "0" ] || fail "${zincir} kayıt bölünme zinciri oluşturmuş"
printf 'PASS: bölünme grubu düz, zincir yok\n'

# Bölünen kaydın notu iki parçada da durmalı: not kayda ait, satılan adede
# değil. Artıkta kaybolsaydı kullanıcının yazdığı bilgi sessizce silinirdi.
grep -q "buy_order_date, note," "${PROJECT_ROOT}/src/server/repository.ts" \
  || fail "bölünen kaydın notu yeni parçaya taşınmalı"
notsuz="$(q "SELECT count(*) FROM portfolio_transaction c
             JOIN portfolio_transaction p ON p.id = c.split_from_id
             WHERE p.note IS NOT NULL AND c.note IS DISTINCT FROM p.note")"
[ "${notsuz}" = "0" ] || fail "${notsuz} bölünmüş parçada not kaybolmuş"
printf 'PASS: bölünen kaydın notu iki parçada da duruyor\n'
