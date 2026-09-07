#!/usr/bin/env bash
# Piyasa ekranının bölüm sekmeleri. Bozulunca ekran hata vermez: ya sekme
# değişiminde veri yeniden inip kaydırıcılar sıfırlanır, ya da sayfa eski
# üç ekranlık hâline döner.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
M="${PROJECT_ROOT}/src/main.ts"
MV="$(awk '/^async function marketView/,/^}/' "${M}")"

# Üç bölüm sekme; başlık olarak alt alta dizilmiyor.
grep -q "MARKET_SEKME = \['returns', 'flow', 'investor'\] as const" "${M}" \
  || fail "bölüm listesi yok"
grep -q "section-title.*Getiri" <<<"${MV}" && fail "bölümler hâlâ alt alta başlık"
grep -q "class: 'tabs section-tabs'" <<<"${MV}" || fail "sekme şeridi yok"

# Kaydırıcı şeridi sekmelerin ÜSTÜNDE. Altına düşerse sekme değiştirirken
# pencere seçici yer değiştirir ve ekranın amacı olan karşılaştırma bozulur.
blok="$(awk '/^  return \[/,/^  \];/' <<<"${MV}")"
serit="$(grep -n "pencere-serit" <<<"${blok}" | head -1 | cut -d: -f1)"
sekme="$(grep -n "^    sekmeler," <<<"${blok}" | head -1 | cut -d: -f1)"
[ -n "${serit}" ] && [ -n "${sekme}" ] && [ "${serit}" -lt "${sekme}" ] \
  || fail "kaydırıcı şeridi sekmelerden sonra geliyor"

# Sekme değiştirmek yeniden istek atmamalı: iki pencerenin yanıtı üç bölümü
# de taşıyor. reload() çağrısı aynı rakamı ikinci kez indirir ve kaydırıcı
# konumunu da sıfırlar.
SEC="$(awk '/const sec = \(id: MarketSekme\)/,/^  };/' <<<"${MV}" | grep -v '^ *//')"
grep -q "reload()" <<<"${SEC}" && fail "sekme değişimi veriyi yeniden çekiyor"
printf '%s\n' "${SEC}" \
  | grep -q "govde.replaceChildren(bolum(id))" || fail "sekme gövdeyi yerinde değiştirmiyor"
printf 'PASS: bölümler sekmede, sekme değişimi veriyi yeniden çekmiyor\n'

# Seçim sayfa yenilendiğinde korunur; varsayılan Getiri.
grep -q "MARKET_SEKME_KEY = 'tefas.market.section'" "${M}" || fail "seçim saklanmıyor"
awk '/function readMarketSekme/,/^}/' "${M}" | grep -q "return 'returns'" \
  || fail "varsayılan sekme Getiri değil"
printf 'PASS: seçili sekme saklanıyor, varsayılanı Getiri\n'
