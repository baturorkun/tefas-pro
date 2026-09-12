#!/usr/bin/env bash
# Portföyüm'de günlük getiri, toplam kazanç ve PDF çıktısı.
#
# Tehlike rakamın yanlış olması değil, İKİ rakam olması: Panel toplam kazancı
# portfolioHeadline ile hesaplıyordu, Portföyüm kendi satırlarını toplayıp
# yalnız açık kazancı buluyordu ve ikisi de "kâr" diye yazıyordu. Bu test
# ikisinin aynı kaynaktan geldiğini ve ekranda farklı adlarla durduğunu korur.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
M="${PROJECT_ROOT}/src/main.ts"
I="${PROJECT_ROOT}/src/server/index.ts"
C="${PROJECT_ROOT}/src/styles.css"
PV="$(awk '/^async function portfolioView/,/^}/' "${M}")"

# ─── Aynı rakam, aynı kaynak ───
grep -qF "path === '/api/portfolio/headline' && method === 'GET'" "${I}" || fail "headline ucu yok"
grep -q "await portfolioHeadline(pool, user.id)" <<<"$(awk "/api\/portfolio\/headline/,/return;/" "${I}")" \
  || fail "headline ucu Panel'in fonksiyonunu cagirmiyor"
grep -qF "api('/api/portfolio/headline')" <<<"${PV}" || fail "Portföyüm headline ucunu okumuyor"
# Rakamlar olduğu gibi geçiyor; ekranda yeniden hesap yok.
grep -qF "money(h.totalGain)" <<<"${PV}" || fail "toplam kazanc sunucudan gelmiyor"
grep -qF "money(h.dayGain)" <<<"${PV}" || fail "gunluk getiri sunucudan gelmiyor"
# Yerel değişkene yeniden hesap yok: "const totalGain = ..." gibi bir satır,
# sunucudan gelen rakamın yanında ikinci bir rakam demek.
grep -qE "(const|let) +(totalGain|dayGain|realizedGain|dayPct|totalPct) *=" <<<"${PV}" \
  && fail "Portföyüm kazanci yeniden hesapliyor"
printf 'PASS: gunluk getiri ve toplam kazanc Panel ile ayni fonksiyondan\n'

# ─── Etiketler ayrışıyor ───
grep -qF "'Günlük Getiri'" <<<"${PV}" || fail "Günlük Getiri kutusu yok"
grep -qF "'Toplam Kazanç'" <<<"${PV}" || fail "Toplam Kazanç kutusu yok"
grep -qF "'Açık Kâr / Zarar'" <<<"${PV}" || fail "acik kazanc 'Açık' diye adlandirilmamis"
# Zarardakiler ana sayı, kârdakiler alt satır: bakılması gereken zarardakiler.
grep -qF "metric('Zararda', String(rows.length - winners), \`\${String(winners)} Kârda\`" <<<"${PV}" \
  || fail "Zararda kutusu ters"
grep -qF "metric('Kârda'" <<<"${PV}" && fail "eski Kârda kutusu duruyor"
grep -qF "'Kâr / Zarar'" <<<"${PV}" && fail "iki farkli rakam ayni sozcukle yaziliyor"
# Üçlü yan yana: Açık + Gerçekleşen = Toplam. Toplam'ın alt satırı yüzdenin
# paydasını söylüyor.
grep -qF "'Gerçekleşen Kazanç'" <<<"${PV}" || fail "gerceklesen kazanc kutusu yok"
grep -qF "money(h.realizedGain)" <<<"${PV}" || fail "gerceklesen kazanc sunucudan gelmiyor"
grep -qF "net sermaye \${money(h.netCapital)}" <<<"${PV}" || fail "toplam yuzdesinin paydasi yazmiyor"
# Gün yazılır: hafta sonu bakan kullanıcı hangi günü gördüğünü bilmeli.
grep -qF "gunAd(h.dayDate)" <<<"${PV}" || fail "gunluk getirinin gunu yazilmiyor"
printf 'PASS: acik kazanc ile toplam kazanc farkli adlarla, gunuyle\n'

# ─── PDF ───
grep -qF "window.print()" <<<"${PV}" || fail "PDF dugmesi yazdirmayi acmiyor"
grep -qF "'PDF'" <<<"${PV}" || fail "PDF dugmesi yok"
grep -qF "print-only print-head" <<<"${PV}" || fail "cikti basligi yok"
grep -qF "me.fullName" <<<"${PV}" || fail "ciktida kimin portfoyu oldugu yazmiyor"
grep -qF "await portfolioView(me)" "${M}" || fail "portfolioView kullaniciyi almiyor"
printf 'PASS: PDF dugmesi tarayici yazdirmasini aciyor, baslikta kullanici ve gun var\n'

# Yazdırma görünümü: gezinme ve düğmeler yok, zemin açık, tablo kesilmiyor.
PR="$(awk '/^@media print/,/^}/' "${C}")"
[ -n "${PR}" ] || fail "@media print yok"
for k in ".sidebar" ".content-header" "#yukleme" ".impersonate-bar" ".btn-ghost"; do
  grep -qF "${k}" <<<"${PR}" || fail "yazdirmada gizlenmiyor: ${k}"
done
grep -qF -- "--bg: #fff" <<<"${PR}" || fail "kagida karanlik tema gidiyor"
grep -qF "break-inside: avoid" <<<"${PR}" || fail "satirlar sayfa sonunda kesilebilir"
grep -qF "thead { display: table-header-group; }" <<<"${PR}" || fail "tablo basligi her sayfada tekrarlanmiyor"
grep -qF ".print-only { display: none; }" "${C}" || fail "cikti basligi ekranda gorunuyor"
printf 'PASS: yazdirma gorunumu gezinmesiz, acik zeminli, tablo sayfaya sigiyor\n'

# Sekiz kutu dört+dört, dokuz kutu üç+üç+üç: tek başına kalan kutu yok.
grep -qF "'metric-grid metric-grid-8' : 'metric-grid metric-grid-9'" <<<"${PV}" || fail "izgara 8/9 degil"
grep -qF ".metric-grid-8 { grid-template-columns: repeat(4" "${C}" || fail "8 kutu 4'lu dizilmiyor"
grep -qF ".metric-grid-9 { grid-template-columns: repeat(3" "${C}" || fail "9 kutu 3'lu dizilmiyor"
printf 'PASS: kutu izgarasi yalniz kutu kalmayacak sekilde\n'

# ─── Ağırlıklı süre ───
# Sunucuda lot lot: satırdaki Süre en eski lotun günü, onu fon maliyetiyle
# ağırlıklandırmak sonradan eklenen lotları görmezdi.
R="${PROJECT_ROOT}/src/server/repository.ts"
HL="$(awk '/^export async function portfolioHeadline/,/^}/' "${R}")"
grep -qF "sum(days * units * nav_buy) / sum(units * nav_buy)" <<<"${HL}" || fail "agirlikli gun maliyetle agirlikli degil"
grep -qF "FROM analytics.position_leg l" <<<"${HL}" || fail "agirlikli gun lot bazinda degil"
grep -qF "NOT l.simulated" <<<"${HL}" || fail "simule lotlar agirliga giriyor"
grep -qF "min(start_date)" <<<"${HL}" || fail "ilk alis gunu yok"
# Kutu ve tablo ayağı aynı alanı okuyor; ekranda ikinci bir hesap yok.
grep -qF "el('td', { class: 'num' }, [h.weightedDays === null" <<<"${PV}" || fail "ayak satiri weightedDays okumuyor"
grep -qF "h.weightedDays === null ? '—' : \`\${String(h.weightedDays)}g\`" <<<"${PV}" || fail "kutu weightedDays okumuyor"
grep -qF "'Ağırlıklı Süre'" <<<"${PV}" || fail "Agirlikli Sure kutusu yok"
# Yıl her zaman: tek başına duran tarihte bu yıl atlanınca hangi yıl olduğu
# bilinmiyordu ("ilk alım 18 Mart").
grep -qF "ilk alım \${gunAd(h.firstBuyDate, true)}" <<<"${PV}" || fail "ilk alis gunu yilsiz yaziliyor"
grep -qF "function gunAd(iso: string | null, yilHep = false)" "${M}" || fail "gunAd yili zorlayamiyor"
grep -qE "days *\* *cost|reduce\(.*days" <<<"${PV}" && fail "ekran agirlikli gunu kendi hesapliyor"
printf 'PASS: agirlikli sure sunucuda lot bazinda, kutu ve ayak ayni alani okuyor\n'

# Yazdırmada bölünmezlik panelde değil: tablo paneli tek parça sayılınca ilk
# sayfanın kalanına sığmıyor ve bütünüyle ikinci sayfaya atılıyordu.
grep -qF ".metric-card { break-inside: avoid; }" <<<"${PR}" || fail "kart bolunebiliyor"
grep -qE "\.metric-card, \.panel \{[^}]*break-inside" <<<"${PR}" \
  && fail "panel bolunmez sayiliyor; tablo ikinci sayfaya atilir"
printf 'PASS: yazdirmada panel bolunebilir, kutular yalniz kalmiyor\n'
