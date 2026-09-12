#!/usr/bin/env bash
# Çıkılmış pozisyon güncel varlık sayılmamalı. Bozulunca ekran hata vermez:
# fonun sattığı hisse "fonda var" diye listelenir ve asistan da öyle söyler.
# Ölçüldü — BARMA "2 fonumda · 0,00 TL" diye duruyordu, oysa DOH %5,74'ten,
# THF %3,12'den çıkmıştı.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
R="${PROJECT_ROOT}/src/server/repository.ts"

# Hisse kırılımını okuyan iki yol var; ikisinde de aynı kural olmalı.
grep -q "h.weight_pct > 0" <<<"$(awk '/^export async function fundDetail/,/^}/' "${R}")" \
  || fail "fon detayı çıkılmış pozisyonu gösteriyor"
grep -q "h.weight_pct > 0" <<<"$(awk '/^export async function stockAllocation/,/^}/' "${R}")" \
  || fail "hisse listesi çıkılmış pozisyonu gösteriyor"
printf 'PASS: iki okuma yolu da sıfır ağırlığı dışarıda bırakıyor\n'

# Asistan kendi sorgusunu yazmıyor, aynı iki fonksiyonu tool olarak çağırıyor.
# Ayrı bir sorgu eklenirse kural orada tekrar unutulur.
grep -rn "fund_stock_holding" "${PROJECT_ROOT}/src/server/assistant.ts" \
  && fail "asistan hisse kırılımını kendi sorgusuyla okuyor"
grep -q "stockAllocation(pool, userId)" "${PROJECT_ROOT}/src/server/assistant.ts" \
  || fail "asistan hisse listesini ortak fonksiyondan almıyor"
printf 'PASS: asistan ortak okuma yollarını kullanıyor\n'

# Satır silinmiyor: "fon bundan çıktı" gerçek bilgi ve weight_change taşıyor.
grep -q "weight_pct > 0" "${PROJECT_ROOT}/src/collector.ts" \
  && fail "collector sıfır ağırlıklı satırı yazmayı bırakmış"
grep -q "h.weight_change" <<<"$(awk '/^export async function fundDetail/,/^}/' "${R}")" \
  || fail "çıkış bilgisi taşınmıyor"
printf 'PASS: çıkış satırı saklanıyor, yalnız güncel varlık sayılmıyor\n'
