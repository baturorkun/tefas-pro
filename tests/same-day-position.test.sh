#!/usr/bin/env bash
# Aynı gün alınan pozisyon hesaba girmeli.
#
# Üç view de bacakları "days > 0" ile süzüyordu: alış gününden sonraki fiyat
# günü sayısı. Aynı gün alınan pozisyonda o sayı sıfır ve satır düşüyordu,
# oysa o günün fiyatı elimizde. Doğru cevap "bilinmiyor" değil, sıfır.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
MIG="${PROJECT_ROOT}/db/migrations/042_same_day_position.sql"

for v in position_return position_slice closed_position; do
  grep -q "VIEW analytics.${v} AS" "${MIG}" || fail "${v} yeniden tanımlanmamış"
done
# Boş çarpım nötr elemandır; NULL değil.
grep -Fq "coalesce(leg.m_start, 1)" "${MIG}" || fail "position_return boş çarpımı NULL bırakıyor"
grep -Fq "coalesce(c.m_start, 1)" "${MIG}"   || fail "position_slice boş çarpımı NULL bırakıyor"
grep -Fq "coalesce(leg.m_buy, 1)" "${MIG}"   || fail "closed_position boş çarpımı NULL bırakıyor"
# Eski kural kalmamalı.
# Yorumda gecmesi serbest; kural olarak kalmamali.
grep -v '^ *--' "${MIG}" | grep -q "days > 0" && fail "days > 0 kurali duruyor"
printf 'PASS: uc view de bos carpimi 1 sayiyor, gun sayisi kurali kalkti\n'

if [ -n "${DATABASE_URL:-}" ] && command -v psql >/dev/null 2>&1 \
   && psql "${DATABASE_URL}" -tAc 'SELECT 1' >/dev/null 2>&1; then
  q() { psql "${DATABASE_URL}" -tAqc "$1"; }
  # Ileri tarihli alim hala disarida: fiyati aciklanmamis bir islem icin
  # uydurulmus maliyet uretilmemeli.
  sizinti="$(q "SELECT count(*) FROM analytics.position_slice s
                 JOIN portfolio_transaction t ON t.id = s.transaction_id
                WHERE t.trade_date > (SELECT max(trade_date) FROM fact_fund_daily
                                       WHERE daily_return_pct IS NOT NULL)")"
  [ "${sizinti}" = "0" ] || fail "${sizinti} ileri tarihli alim hesaba girmis"
  # Ayni gun alinan bacakta K/Z sifir olmali.
  sapma="$(q "SELECT count(*) FROM analytics.position_slice s
               JOIN portfolio_transaction t ON t.id = s.transaction_id
              WHERE t.trade_date = (SELECT max(trade_date) FROM fact_fund_daily
                                     WHERE daily_return_pct IS NOT NULL)
                AND round(s.cost, 2) IS DISTINCT FROM round(s.value, 2)")"
  [ "${sapma}" = "0" ] || fail "${sapma} ayni gun bacaginda K/Z sifir degil"
  # Iki view ayni toplami vermeli; ayrisirlarsa ekranlar birbirini tutmaz.
  fark="$(q "SELECT count(*) FROM (
    SELECT user_id, round(sum(cost)) c, round(sum(value)) v
      FROM analytics.position_slice WHERE is_open GROUP BY user_id) a
    FULL JOIN (
    SELECT user_id, round(sum(cost)) c, round(sum(value)) v
      FROM analytics.position_return WHERE is_open AND NOT simulated GROUP BY user_id) b
    USING (user_id) WHERE a.c IS DISTINCT FROM b.c OR a.v IS DISTINCT FROM b.v")"
  [ "${fark}" = "0" ] || fail "position_slice ile position_return ayrismis (${fark} kullanici)"
  printf 'PASS: ileri tarihli disarida, ayni gun K/Z sifir, iki view tutuyor\n'
else
  printf 'SKIP: veritabani yok\n'
fi
