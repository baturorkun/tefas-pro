#!/usr/bin/env bash
# Bekleme göstergesi ve sekme değişiminin pencereyi yeniden açmaması.
#
# İki sorun aynı boşluktan geliyordu: ekranda "bir şey oluyor" bilgisi yok.
# Fon penceresinde sekme değiştirmek pencereyi kapatıp yeniden açıyordu ve
# ekran göz kırpıyordu; uzun süren isteklerde ise ekran öylece duruyordu.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
M="${PROJECT_ROOT}/src/main.ts"
C="${PROJECT_ROOT}/src/styles.css"
H="${PROJECT_ROOT}/public/index.html"

# ─── Bekleme göstergesi ───
# Sayaç tek yerde, api() içinde: bütün istekler oradan geçiyor.
grep -qF "yuklemeBasladi();" "${M}" || fail "api() sayaci artirmiyor"
grep -qF "yuklemeBitti();" "${M}" || fail "api() sayaci dusurmuyor"
grep -qF "finally" <<<"$(awk '/^async function api\(/,/^}/' "${M}")" \
  || fail "sayac hata yolunda dusmuyor; cubuk sonsuza kadar acik kalir"
test "$(grep -c "yuklemeBasladi()" "${M}")" = "2" \
  || fail "sayac api() disinda da artiriliyor; tek yer olmali"
printf 'PASS: sayac tek yerde ve hata yolunda da dusuyor\n'

# Gecikmeli açılış: anında açılan çubuk 40 ms'lik istekte açılıp kapanır ve
# düzeltmeye çalıştığımız göz kırpmanın aynısını üretir.
grep -qF "const YUKLEME_GECIKME_MS = " "${M}" || fail "gecikme esigi yok"
grep -qF "yuklemeZamani = setTimeout(" "${M}" || fail "cubuk gecikmeli acilmiyor"
grep -qF "if (acikIstek > 0) yuklemeCubugu()?.classList.add('acik');" "${M}" \
  || fail "esik dolunca sayac yeniden kontrol edilmiyor"
grep -qF "clearTimeout(yuklemeZamani);" "${M}" || fail "erken biten istek zamanlayiciyi iptal etmiyor"
printf 'PASS: cubuk gecikmeli aciliyor, kisa istek iz birakmiyor\n'

# Çubuk uygulamanın DIŞINDA: ekran yeniden çizilirken de yerinde kalmalı.
grep -qF '<div id="yukleme"' "${H}" || fail "cubuk index.html de degil"
grep -qF "#yukleme.acik" "${C}" || fail "acik durumu stilsiz"
grep -qF "position: fixed" "${C}" || fail "cubuk yer kapliyor"
grep -qF "prefers-reduced-motion" "${C}" || fail "hareket azaltma tercihine uyulmuyor"
printf 'PASS: cubuk uygulama disinda, sabit ve yer kaplamiyor\n'

# ─── Sekme değişimi ───
# Pencere BİR kez açılıyor, sekme paneli yerinde değişiyor.
FM="$(mktemp)"
awk '/^async function openFundModal/,/^}/' "${M}" > "${FM}"
grep -qF "sekmeKutu.replaceChildren(panel(" "${FM}" \
  || fail "sekme paneli yerinde degismiyor"
grep -q "close();" "${FM}" && fail "sekme degisimi pencereyi kapatiyor"
grep -q "void openFundModal(kod)" "${FM}" && fail "sekme degisimi pencereyi yeniden aciyor"
test "$(grep -c "openModal(" "${FM}")" = "2" \
  || fail "fon penceresi bir hata bir basari yolundan fazla yerden acilmamali"
printf 'PASS: sekme degisimi pencereyi kapatip yeniden acmiyor\n'

# Günlük seri bir kez çekiliyor; sekmeler arasında gidip gelmek tekrar çekmiyor.
grep -qF "let gunlerSakla: FundDayRow[] | null = null;" "${FM}" \
  || fail "gunluk seri saklanmiyor"
grep -qF "if (gunlerSakla === null) {" "${FM}" || fail "gunluk seri her sekmede yeniden cekiliyor"
# Fon detayı sekme değişince yeniden çekilmiyor: detay isteği fonksiyonda tek.
test "$(grep -c 'api(`/api/funds/${encodeURIComponent(kod)}`)' "${FM}")" = "1" \
  || fail "fon detayi birden fazla yerden cekiliyor"
printf 'PASS: veri bir kez cekiliyor, sekme yalniz cizim degistiriyor\n'

# İlk sekme pencere açılmadan çiziliyor: boş açılıp dolmak da göz kırpmadır.
awk '/await sekmeCiz\(\);/{a=NR} /openModal\(d.fundCode/{b=NR} END{exit !(a && b && a<b)}' "${FM}" \
  || fail "pencere ilk sekme cizilmeden aciliyor"
# Aynı sekmeye tekrar basmak yeniden çizmemeli.
grep -qF "if (fonSekme === id) return;" "${FM}" || fail "ayni sekmeye basmak yeniden ciziyor"
rm -f "${FM}"
printf 'PASS: ilk sekme acilistan once cizili, ayni sekme yeniden cizilmiyor\n'
