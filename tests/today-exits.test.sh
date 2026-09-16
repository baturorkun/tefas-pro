#!/usr/bin/env bash
# Bugün çıkılan fonlar Portföyüm'de rozetli görünür. Açık pozisyon
# toplamlarına karışmaz. DATABASE_URL yoksa yapısal kontroller yine koşar.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }

R="${PROJECT_ROOT}/src/server/repository.ts"
I="${PROJECT_ROOT}/src/server/index.ts"
M="${PROJECT_ROOT}/src/main.ts"

# --- backend: bugun cikilanlar sorgusu ---
grep -q "export async function todayExits" "${R}" || fail "todayExits sorgusu yok"
# Yalniz bugun: sell_date = current_date.
grep -q "t.sell_date = current_date" "${R}" || fail "bugun disi cikislar da geliyor"
# Fiyat yoksa cikis degeri ve kazanc bos; uydurma sifir yazilmamali.
grep -q "d.nav_per_share IS NULL THEN NULL" "${R}" || fail "fiyat yokken deger uydurluyor"
printf 'PASS: bugun cikilanlar sorgusu dogru\n'

# --- uc ---
grep -q "'/api/portfolio/today-exits'" "${I}" || fail "today-exits ucu yok"
printf 'PASS: today-exits ucu tanimli\n'

# --- frontend: rozetli satir, TOPLAM'a katilmaz ---
grep -q "today-exits" "${M}" || fail "portfoy ekrani ucu cagirmiyor"
grep -q "exit-row" "${M}" || fail "cikis satiri isaretlenmiyor"
grep -q "Bugün çıkış" "${M}" || fail "bugun cikis rozeti yok"
# TOPLAM ve maliyet/deger toplamlari yalniz acik pozisyonlardan (rows) gelmeli;
# cikislar (cikislar dizisi) sum()'a girmemeli.
grep -q "rows.reduce" "${M}" || fail "toplamlar acik pozisyondan hesaplanmiyor"
if grep -q "cikislar.reduce" "${M}"; then fail "cikislar TOPLAM'a katiliyor"; fi
printf 'PASS: cikis satiri rozetli, toplamlara katilmiyor\n'

if [ -z "${DATABASE_URL:-}" ] || ! command -v psql >/dev/null 2>&1 \
   || ! psql "${DATABASE_URL}" -tAc 'SELECT 1' >/dev/null 2>&1; then
  printf 'SKIP: veritabanı yok\n'; exit 0
fi
q() { psql "${DATABASE_URL}" -tAqc "$1"; }

# Bugunku kazanc formulu: cikis degeri o gunun getirisini icerir, geri cikarilir.
# Deger * (g/100) / (1 + g/100). Sonuc, degerin g'siz halinden farki olmali.
sapik="$(q "SELECT count(*) FROM analytics.closed_position
             WHERE sell_date = current_date AND realized_gain IS NULL")"
[ "${sapik}" = "0" ] || fail "bugun kapanan pozisyonda realize kar bos: ${sapik}"
printf 'PASS: bugun kapananlarin verisi tutarli\n'
