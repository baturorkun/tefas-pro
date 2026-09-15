#!/usr/bin/env bash
# Hisse gunluk kapanislari ve bayat veri davranisi.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }

S="${PROJECT_ROOT}/src/sources/hisse-fiyat.ts"
C="${PROJECT_ROOT}/src/collect-hisse.ts"
R="${PROJECT_ROOT}/src/server/repository.ts"
I="${PROJECT_ROOT}/collector/install.sh"

[ -f "${S}" ] || fail "hisse fiyat kaynagi yok"
grep -q "\.IS" "${S}" || fail "BIST sembol soneki yok"
# 404 hata degil: fon katilma paylari da harf koduna sahip ama borsada yok.
grep -q "status === 404" "${S}" || fail "404 yumusak gecilmiyor"
printf 'PASS: hisse fiyat kaynagi yerinde\n'

# Yalniz BIST hisseleri sorgulanmali; tahvil ISIN'i ve altin kodu hisse degil.
grep -q "bistHissesiMi" "${C}" || fail "hisse disi kodlar elenmiyor"
grep -q "weight_pct > 0" "${C}" || fail "cikilmis pozisyonlar da cekiliyor"
printf 'PASS: yalniz tutulan BIST hisseleri cekiliyor\n'

# Bayat kapanisla getiri gosterilmemeli: sutun boşalmiyor, donuyor ve
# guncelmis gibi gorunuyordu.
grep -q "s.trade_date > current_date - 7" "${R}" \
  || fail "bayat kapanisla getiri hala gosteriliyor"
printf 'PASS: bayat kapanisla getiri gosterilmiyor\n'

# Zamanlama 10:30 oncesi.
grep -Fq 'HISSE_ON_CALENDAR="Mon..Fri 10:20:00"' "${I}" || fail "hisse saati 10:30 oncesi degil"
grep -Fq "dist/collect-hisse.js" "${I}" || fail "hisse entrypointi yok"
printf 'PASS: hisse toplamasi 10:30 dan once\n'
