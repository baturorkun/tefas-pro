#!/usr/bin/env bash
# Bekleyen alım ve satışların görünürlüğü. Bozulunca ekran hata vermez:
# kullanıcı yaptığı işlemi ekranda arar ve bulamaz. Ölçüldü — CKL ve DFI'nin
# tek açık işlemi ileri tarihliydi ve Portföyüm'de satırları hiç yoktu.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
R="${PROJECT_ROOT}/src/server/repository.ts"
M="${PROJECT_ROOT}/src/main.ts"
PP="$(awk '/^export async function pendingPurchases/,/^}/' "${R}")"
PV="$(awk '/^async function portfolioView/,/^}/' "${M}")"

# Alım son VERİ gününe, satış BUGÜNE göre bekliyor. İkisi farklı: fiyatı
# açıklanmamış alım ile tarihi gelmemiş satış aynı şey değil.
grep -q "t.trade_date > son.d" <<<"${PP}" || fail "bekleyen alım veri gününe göre değil"
grep -q "t.sell_date > current_date" <<<"${PP}" || fail "bekleyen satış bugüne göre değil"
printf 'PASS: bekleyen alım ve satış ayrı kurallarla bulunuyor\n'

# Tutar hiçbir yerde yazılmaz: fiyat açıklanmadığı için maliyet de değer de
# hesaplanamıyor, sıfır yazmak yanlış rakam yazmaktır.
grep -qE "(buy_value|cost|value)" <<<"${PP}" && fail "bekleyen işlemde tutar hesaplanıyor"
printf 'PASS: bekleyen işlemin tutarı hesaplanmıyor\n'

# Yalnız bekleyen alımı olan fon da listede satır olur; para hücreleri boş.
grep -q "const yalnizBekleyen" <<<"${PV}" || fail "yalnız bekleyen alımı olan fon listelenmiyor"
grep -q "class: 'pending-row'" <<<"${PV}" || fail "bekleyen satırın kendi sınıfı yok"
# Toplamlar rows üzerinden: bekleyen satır toplama girerse rakamlar bozulur.
awk '/const foot = el/,/\]\);/' <<<"${PV}" | grep -q "String(rows.length)" \
  || fail "toplam satırı bekleyenleri de sayıyor olabilir"
printf 'PASS: bekleyen alım satır oluyor ama toplamlara girmiyor\n'

# İşaretler ayrı: alım "+", satış "−".
grep -q "tur === 'alim' ? '+' : '−'" <<<"${PV}" || fail "alım/satış işareti ayrışmıyor"
grep -q "bekleyenIsaret(bek, 'alim')" <<<"${PV}" || fail "alım işareti satıra konmuyor"
grep -q "bekleyenIsaret(bekSat, 'satis')" <<<"${PV}" || fail "satış işareti satıra konmuyor"
# Tıklama da açmalı: tooltip dokunmatikte yok.
grep -q "btn.addEventListener('click'" <<<"${PV}" || fail "işaret tıklamayla açılmıyor"
printf 'PASS: iki işaret ayrı, imleçle de tıklamayla da açılıyor\n'

# Aynı bilgi fon detayında da var ve orada da ayrı bir uç yok.
awk '/^async function openFundModal/,/^}/' "${M}" | grep -q "pending-note" \
  || fail "fon detayında bekleyen işlem notu yok"
awk '/^async function openFundModal/,/^}/' "${M}" | grep -q "api('/api/portfolio/pending')" \
  || fail "fon detayı ortak ucu kullanmıyor"
printf 'PASS: fon detayında da görünüyor, ortak uçtan\n'
