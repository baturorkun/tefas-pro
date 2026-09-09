#!/usr/bin/env bash
# Satis parasinin banka ve tarih takvimi.
#
# Bakiye YOK ve bu bilincli: uygulama bankaya disaridan yatirilan parayi
# gormuyor, yalniz fon alim satimini biliyor. Sifirdan net akis "eksi bakiye"
# gibi okunurdu.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
R="${PROJECT_ROOT}/src/server/repository.ts"
I="${PROJECT_ROOT}/src/server/index.ts"
M="${PROJECT_ROOT}/src/main.ts"

grep -Fq "export async function cashCalendar" "${R}" || fail "takvim fonksiyonu yok"
grep -Fq "if (path === '/api/cash' && method === 'GET')" "${I}" || fail "uc bagli degil"

# Para gunu = satis tarihi. Valor IKINCI KEZ eklenmemeli: uygulamanin
# modelinde satis tarihi zaten emir tarihine valor eklenerek bulunuyor ve
# islem formu da oyle hesapliyor. Olculdu — 03 Eylul'de verilen DFI emri
# 07 Eylul'de sonuclandi, valor bir kez daha eklenince takvim 09 Eylul
# diyordu.
CC="$(awk '/^export async function cashCalendar/,/^}/' "${R}")"
grep -Fq "settlementFromOrder" <<<"${CC}" && fail "valor ikinci kez ekleniyor"
grep -Fq "date: x.sell_date," <<<"${CC}" || fail "para gunu satis tarihi degil"
printf 'PASS: para gunu satis tarihi, valor ikinci kez eklenmiyor\n'

# Bugun kullanicinin saatine gore: toISOString UTC veriyor ve Turkiye'de
# 00:00-03:00 arasi bir onceki gunu "bugun" saniyordu.
grep -Fq "function bugunISO()" "${M}" || fail "yerel gun yardimcisi yok"
grep -Fq "new Date().toISOString().slice(0, 10)" "${M}" \
  && fail "gun hala UTC'ye gore hesaplaniyor"
printf 'PASS: bugun kullanicinin saatine gore\n'

# Gerceklesmemis satisin tutari tahmin; fiyati olmayan fonda uretilmez.
grep -Fq "true AS estimated" "${R}" || fail "tahmin isaretlenmiyor"
grep -Fq "CASE WHEN l.nav_per_share IS NULL THEN NULL" "${R}" \
  || fail "fiyatsiz fonda tutar uyduruluyor"
grep -Fq "g.tahmin ? '≈ ' : ''" "${M}" || fail "tahmin ekranda isaretlenmiyor"
printf 'PASS: gerceklesmemis satis tahmin diye isaretleniyor\n'

# Bakiye gosterilmemeli.
CV="$(awk '/^async function cashView/,/^}/' "${M}")"
grep -Fiq "bakiye" <<<"${CV}" && grep -Fviq "Bakiye YOK" <<<"${CV}" \
  && fail "ekranda bakiye hesabi var"
# Ayni gun ayni bankaya gelenler toplanmali, kaynak gorunmeli.
grep -Fq 'const k = `${r.date}·${r.platform}`;' <<<"${CV}" || fail "gun ve banka bazinda toplanmiyor"
grep -Fq "kaynakMetni" <<<"${CV}" || fail "kaynak gosterilmiyor"
printf 'PASS: bakiye yok, gun+banka toplaniyor, kaynak gorunuyor\n'
