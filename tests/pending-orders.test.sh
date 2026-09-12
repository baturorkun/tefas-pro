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

# Sunucu tutar hesaplamıyor; yalnız son bilinen birim fiyatı taşıyor.
# Tahmin arayüzde kuruluyor ve "tahmini" olduğu söyleniyor.
grep -qE "(buy_value|cost|value)::" <<<"${PP}" && fail "sunucu bekleyen işlemin tutarını hesaplıyor"
grep -q "l.nav_per_share" <<<"${PP}" || fail "tahmin için birim fiyat taşınmıyor"
grep -q "nav_date" <<<"${PP}" || fail "fiyatın günü taşınmıyor"
printf 'PASS: sunucu tutar üretmiyor, yalnız fiyatı taşıyor\n'

# Tahmin yalnız pencerede ve etiketli. Fiyatın günü aynı yerde yazmalı:
# rakamın nereden geldiği görünmezse ölçülmüş bir tutar gibi okunur.
grep -Fq "'Tutar" "${M}" || fail "tutar sütunu yok"
grep -Fq 'x.tahmin ? `≈ ${x.deger}`' "${M}" || fail "tahmin yaklaşık işareti taşımıyor"
grep -Fq "birim fiyatıyla (" "${M}" || fail "tahminin hangi fiyattan geldiği yazmıyor"
# Fiyatı olmayan fonda tahmin üretilmez; sıfır yazmak yanlış rakam yazmaktır.
grep -q "b.navPerShare === null" <<<"${PV}" || fail "fiyatsız fonda tahmin uyduruluyor"
printf 'PASS: tahmin etiketli, fiyatın günüyle birlikte, fiyatsız fonda yok\n'

# Yalnız bekleyen alımı olan fon da listede satır olur; para hücreleri boş.
grep -q "const yalnizBekleyen" <<<"${PV}" || fail "yalnız bekleyen alımı olan fon listelenmiyor"
grep -q "class: 'pending-row'" <<<"${PV}" || fail "bekleyen satırın kendi sınıfı yok"
# Toplamlar rows üzerinden: bekleyen satır toplama girerse rakamlar bozulur.
grep -q "String(rows.length)" <<<"$(awk '/const foot = el/,/\]\);/' <<<"${PV}")" \
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
grep -q "pending-note" <<<"$(awk '/^async function openFundModal/,/^}/' "${M}")" \
  || fail "fon detayında bekleyen işlem notu yok"
# grep -F: desende tırnak ve eğik çizgi var, regex olarak yorumlanmasın.
grep -Fq "(await api('/api/portfolio/pending')) as BekleyenAlim" "${M}" \
  || fail "fon detayı ortak ucu kullanmıyor"
printf 'PASS: fon detayında da görünüyor, ortak uçtan\n'

# Fon Hareketleri'nde de aynı tahmin. Maliyet yoksa işlemin fiyatı henüz
# açıklanmamış demek; boş bırakmak yerine son bilinen fiyattan tahmin
# veriliyor ve üst satır "tahmini" diyor.
TV="$(awk '/^async function transactionsView/,/^}/' "${M}")"
grep -q "est-label" <<<"${TV}" || fail "işlem listesinde tahmin etiketi yok"
grep -q "t.latestNav === null" <<<"${TV}" || fail "fiyatsız işlemde tahmin uyduruluyor"
grep -Fq "latestNav\` AS" "${R}" || grep -q 'nav_per_share::text AS "latestNav"' "${R}" \
  || fail "işlem satırı son fiyatı taşımıyor"
# Tahmin toplama girmemeli: toplam yalnız maliyeti ölçülebilen satırlardan.
grep -q "gorunen.filter((t) => t.cost !== null)" <<<"${TV}" \
  || fail "tahmin toplam satırına karışıyor olabilir"
printf 'PASS: işlem listesinde tahmin etiketli ve toplama girmiyor\n'

# Bekleyen işlemde ikisinden biri biliniyor: ya adet ya tutar. Bilinen olduğu
# gibi yazılır, bilinmeyen son fiyattan tahmin edilir. Adet null iken
# "null x fiyat = 0" hesaplanıyor ve ekranda "= 0" duruyordu.
grep -Fq "if (b.units !== null) return { deger: num(b.units, 0), tahmin: false };" "${M}" \
  || fail "bilinen adet tahmin gibi gosteriliyor"
grep -Fq "if (b.orderAmount !== null) return { deger: num(b.orderAmount, 0), tahmin: false };" "${M}" \
  || fail "bilinen tutar tahmin gibi gosteriliyor"
# Fiyat yoksa tahmin de yok: tire yazilir, sifir degil.
grep -Fq "if (b.orderAmount === null || b.navPerShare === null) return null;" "${M}" \
  || fail "fiyatsiz kayitta adet uyduruluyor"
grep -Fq "if (b.units === null || b.navPerShare === null) return null;" "${M}" \
  || fail "fiyatsiz kayitta tutar uyduruluyor"
printf 'PASS: bilinen yazılıyor, bilinmeyen tahmin ediliyor, fiyatsızda tire\n'
