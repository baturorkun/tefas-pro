#!/usr/bin/env bash
# Fintables tamamen kaldirildi: kaynak erisilemez hale geldi ve her kosum
# "failed" bitiyordu. Geri gelmemesi icin koda basvuru kalmadigi dogrulanir.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }

[ -f "${PROJECT_ROOT}/src/sources/fintables.ts" ] && fail "fintables.ts hala duruyor"
if grep -rq "sources/fintables" "${PROJECT_ROOT}/src"; then fail "fintables import'u kalmis"; fi
if grep -rq "FintablesClient" "${PROJECT_ROOT}/src"; then fail "FintablesClient kalmis"; fi
printf 'PASS: fintables kaynak istemcisi koddan kalkti\n'

# Fon evreni KAP'tan gelmeli: yeni fon eklemenin tek dayanagi bu.
grep -q "fonEvreni" "${PROJECT_ROOT}/src/server/index.ts" || fail "sunucu fon evrenini KAP'tan almiyor"
grep -q "fonEvreni" "${PROJECT_ROOT}/src/db/seed.ts" || fail "seed fon evrenini KAP'tan almiyor"
printf 'PASS: fon evreni KAP tan geliyor\n'

# Tek fon yolu iki kaynagi da kullanmali; zamanlanmis kosumla ayni fonksiyonlar.
C="${PROJECT_ROOT}/src/collector.ts"
grep -q "tefasFonuTopla" "${C}" || fail "tek fon yolu TEFAS'i kullanmiyor"
grep -q "kapFonuTopla" "${C}" || fail "tek fon yolu KAP'i kullanmiyor"
printf 'PASS: tek fon eklemede TEFAS ve KAP kullaniliyor\n'

# Zamanlanmis birim artik TEFAS; eski Fintables birimi sunucudan temizlenmeli.
I="${PROJECT_ROOT}/collector/install.sh"
grep -q "eski_birim_kaldir" "${I}" || fail "eski Fintables birimi temizlenmiyor"
grep -Fq 'dist/collect-tefas.js' "${PROJECT_ROOT}/collector/Containerfile" \
  || fail "varsayilan entrypoint TEFAS degil"
printf 'PASS: eski birim temizleniyor, varsayilan kosum TEFAS\n'

# Varlik sinifi adlandirmasi tek bicim: Dagilim ekrani siniflari fonlar
# arasinda topluyor, iki ad ayni sinifi ikiye bolerdi.
grep -q "kanonikVarlikSinifi" "${PROJECT_ROOT}/src/collect-kap.ts" \
  || fail "varlik sinifi adlari normallestirilmiyor"
[ -f "${PROJECT_ROOT}/db/migrations/047_varlik_sinifi_adlari.sql" ] \
  || fail "gecmis etiketleri donusturen migration yok"
printf 'PASS: varlik sinifi adlandirmasi tek bicim\n'
