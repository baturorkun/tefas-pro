#!/usr/bin/env bash
# KAP hisse kirilimi toplamasinin yapisal guvenceleri.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }

K="${PROJECT_ROOT}/src/sources/kap.ts"
P="${PROJECT_ROOT}/src/sources/kap-parse.ts"
C="${PROJECT_ROOT}/src/collect-kap.ts"
CF="${PROJECT_ROOT}/collector/Containerfile"

# --- kaynak istemcisi ---
[ -f "${K}" ] || fail "KAP istemcisi yok"
grep -q "kap.org.tr" "${K}" || fail "KAP tabani yanlis"
# Konu kimligi sabit olmali: degisirse bambaska bildirimler cekilir.
grep -Fq "8aca490d502e34b801502e380044002b" "${K}" \
  || fail "Portfoy Dagilim Raporu konu kimligi yok"
printf 'PASS: KAP kaynak istemcisi yerinde\n'

# --- parse: sablon varyantlari ---
# Uc varyant olculerek bulundu; biri kaldirilirsa o fonlar sessizce kaybolur.
grep -q "harfleriDuzelt" "${P}" || fail "bozuk Turkce kodlamasi islenmiyor"
grep -qE '\(\?:III\|3\)' "${P}" || fail "Arap rakamli bolum numarasi islenmiyor"
grep -q "US_SAYI" "${P}" || fail "ABD sayi bicimi islenmiyor"
grep -q "TR_SAYI" "${P}" || fail "Turk sayi bicimi islenmiyor"
printf 'PASS: parse uc sablon varyantini da isliyor\n'

# --- gecici ag hatasi ---
# 72 fonluk kesintisiz kosumda sonlara dogru 16 fon "fetch failed" aldi;
# ayni fonlar tek tek denendiginde sorunsuz geldi. Yeniden deneme kalkarsa
# uzun kosumlarda fonlar sessizce eksik kalir.
grep -q "yenidenDene" "${K}" || fail "gecici ag hatasinda yeniden deneme yok"
printf 'PASS: gecici ag hatasi yeniden deneniyor\n'

# --- birden fazla ek ---
# IAE ve IVY raporu ikiye boluyor: portfoy tablosu ikinci ekte.
grep -q "for (const ek of ekler)" "${C}" || fail "yalniz ilk ek deneniyor"
printf 'PASS: bildirimin butun ekleri deneniyor\n'

# --- kismi basari ---
# Dort fon taranmis goruntu PDF'i gonderiyor; kosumun tamami dusmemeli.
grep -q "'partial'" "${C}" || fail "kismi basari durumu yok"
printf 'PASS: bir fonun raporu okunmazsa kosum dusmuyor\n'

# --- container ---
grep -q "poppler-utils" "${CF}" || fail "pdftotext container'da yok"
printf 'PASS: pdftotext container icinde\n'

# Sunucu image'inda da pdftotext olmali.
#
# Yeni fon eklendiginde tek fonluk toplama SUNUCU surecinde kosuyor ve KAP'in
# portfoy raporunu PDF'ten okuyor. Paket yalniz collector image'indaydi;
# uretimde "spawn pdftotext ENOENT" ile kosum bosuna failed oluyordu.
grep -q "poppler-utils" "${PROJECT_ROOT}/server/Containerfile" \
  || fail "sunucu image'inda pdftotext yok"
printf 'PASS: pdftotext sunucu image inda da var\n'

# KAP adimi en iyi caba: gunluk veri yazildiysa fon kullanilabilir.
grep -q "kapHatasi" "${PROJECT_ROOT}/src/collector.ts" \
  || fail "KAP hatasi tum kosumu dusuruyor"
printf 'PASS: KAP adimi basarisiz olsa da gunluk veri sayiliyor\n'
