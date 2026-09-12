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
grep -qF "'Kâr / Zarar'" <<<"${PV}" && fail "iki farkli rakam ayni sozcukle yaziliyor"
grep -qF "kapanan dahil" <<<"${PV}" || fail "toplamin kapananlari icerdigi yazmiyor"
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

# Altı kutu tek başına ikinci sıraya düşen kutu bırakmıyor.
grep -qF "'metric-grid metric-grid-6' : 'metric-grid metric-grid-7'" <<<"${PV}" || fail "izgara 6/7 degil"
grep -qF ".metric-grid-6 { grid-template-columns: repeat(3" "${C}" || fail "6 kutu 3+3 dizilmiyor"
printf 'PASS: kutu izgarasi yalniz kutu kalmayacak sekilde\n'
