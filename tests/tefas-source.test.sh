#!/usr/bin/env bash
# TEFAS birincil fiyat kaynağı: kalıcı, sunucudan da çalışan bir yedek.
#
# Fintables 15 Eylül'de dört bağımsız ağdan aynı anda 403 vermeye başladı.
# TEFAS'ın kendi API'si (api/funds/*) hiçbir IP'yi engellemiyor — hem ev hem
# sunucu IP'sinden ölçülerek doğrulandı. Bu test kalıcı kod parçalarının
# yerinde olduğunu, sunucu kurulumunun ikisini de kurduğunu, ve ln(0)
# çökmesinin kök nedeninin düzeltildiğini korur.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
TS="${PROJECT_ROOT}/src/sources/tefas.ts"
CT="${PROJECT_ROOT}/src/collect-tefas.ts"
IN="${PROJECT_ROOT}/collector/install.sh"
CF="${PROJECT_ROOT}/collector/Containerfile"
R="${PROJECT_ROOT}/src/server/repository.ts"
MIG="${PROJECT_ROOT}/db/migrations/046_ln_zero_guard.sql"

# ─── Kaynak istemcisi ───
[ -f "${TS}" ] || fail "src/sources/tefas.ts yok"
grep -qF "api/funds" "${TS}" || fail "TEFAS API tabanı yanlış"
grep -qF "export async function fonBilgiGetir" "${TS}" || fail "fonBilgiGetir eksik"
printf 'PASS: TEFAS kaynak istemcisi yerinde\n'

# ─── Zamanlanmış giriş noktası ───
[ -f "${CT}" ] || fail "src/collect-tefas.ts yok"
grep -qF "export const TEFAS_SOURCE" "${CT}" || fail "kaynak adı sabiti yok"
# İdempotency: collector.ts'deki aynı guard'lar, aynı day/source mantığı.
grep -qF "successfulRunToday(pool, today, TEFAS_SOURCE)" "${CT}" || fail "aynı gün ikinci kez calisabiliyor"
grep -qF "missingFundsToday(pool)" "${CT}" || fail "eksik fon kontrolü yok"
# Fintables'a bağımlı değil: import etmiyor, ayrı çalışıyor. (Açıklayıcı
# yorumlarda "Fintables" geçebilir; asıl kontrol import/çağrı satırında.)
grep -qE "from '\./sources/fintables" "${CT}" && fail "TEFAS koşumu fintables.ts import ediyor"
grep -qE "new FintablesClient" "${CT}" && fail "TEFAS koşumu FintablesClient kullanıyor"
printf 'PASS: zamanlanmış TEFAS koşumu idempotent ve Fintables''tan bağımsız\n'

# successfulRunToday artık kaynak parametreli: sabit SCHEDULED_SOURCE
# kullansaydı TEFAS'ın kendi koşum geçmişine bakamazdı.
grep -qF "source: string = SCHEDULED_SOURCE" "${PROJECT_ROOT}/src/collector.ts" \
  || fail "successfulRunToday kaynak parametresi almıyor"

# ─── Sunucu kurulumu: iki ayrı timer, aynı image ───
grep -qF "TEFAS_SERVICE_NAME=" "${IN}" || fail "TEFAS servis adı tanımsız"
grep -qF "install_one_unit \"\${TEFAS_SERVICE_NAME}\"" "${IN}" || fail "TEFAS timer kurulmuyor"
grep -qF "dist/collect-tefas.js" "${IN}" || fail "TEFAS entrypoint'i yanlış"
# TEFAS Fintables'tan ÖNCE çalışmalı: birincil kaynak önce yazar.
grep -qF 'TEFAS_ON_CALENDAR="Mon..Fri 10:00:00"' "${IN}" || fail "TEFAS zamanlaması Fintables'tan once degil"
# Aynı image, yeniden build yok — yalnız entrypoint değişiyor.
grep -qF -- "--entrypoint node \${IMAGE} dist/collect-tefas.js" "${IN}" \
  || fail "TEFAS ayrı image gerektiriyor; aynı image paylaşılmalı"
printf 'PASS: sunucuda iki ayrı timer, TEFAS önce, aynı image\n'

# ─── Kök neden: ln(0) koruması ───
[ -f "${MIG}" ] || fail "ln(0) guard migration'ı yok"
grep -c "ln(1 + " "${MIG}" > /dev/null 2>&1 || true
grep -qF "ln(greatest(1 + d.daily_return_pct / 100, 1e-9))" "${MIG}" || fail "migration korumayı eklemiyor"
# position_return ve position_slice ikisi de düzeltilmeli — biri unutulursa
# aynı çökme başka bir ekranda tekrarlanır.
grep -qF "CREATE OR REPLACE VIEW analytics.position_return" "${MIG}" || fail "position_return düzeltilmiyor"
grep -qF "CREATE OR REPLACE VIEW analytics.position_slice" "${MIG}" || fail "position_slice düzeltilmiyor"
# Hiçbir korumasız ln() kalmamalı, ne migration'da ne repository.ts'te.
grep -n "ln(1 + d\.daily_return_pct" "${MIG}" | grep -v "greatest" && fail "migration'da hala korumasız ln() var"
grep -n "ln(1 + d\.daily_return_pct" "${R}" | grep -v "greatest" && fail "repository.ts'te hala korumasız ln() var"
printf 'PASS: position_return ve position_slice ln(0) korumalı, korumasız çağrı kalmadı\n'

# ─── Toplu uc: gunde iki istek ───
# Onceki surum fon basina iki istek atiyordu (74 fon icin 148); tekrarlanan
# kosumlar bir IP'nin engellenmesine yol acti. Toplu uc tum fonlari tek
# yanitta veriyor: 8157 kayit = 2040 fon x 4 is gunu, tek istek (olculdu).
grep -q "fonGnlBlgSiraliGetir" "${TS}" || fail "toplu fon bilgisi ucu yok"
grep -q "dagilimSiraliGetirT" "${TS}" || fail "toplu dagilim ucu yok"
grep -q "topluFonBilgisi" "${CT}" || fail "collector toplu ucu kullanmiyor"
# Fon basina dongu geri gelmemeli.
if grep -q "await fonBilgiGetir(" "${CT}"; then fail "collector hala fon basina istek atiyor"; fi
if grep -q "sonFiyatTarihi" "${CT}"; then fail "tarih icin ayri istek atiliyor; toplu yanitta var"; fi
printf 'PASS: gunluk veri tek toplu istekle geliyor\n'

# Govdenin TAMAMI zorunlu: aramaMetni, sfonTurKod, dil, sFonTurKod eksikse
# sunucu NullPointerException donduruyor (olculdu, bes farkli govde denendi).
for alan in aramaMetni sfonTurKod sFonTurKod basSira bitSira; do
  grep -q "${alan}" "${TS}" || fail "toplu govdede ${alan} eksik; sunucu NPE verir"
done
printf 'PASS: toplu govde tam\n'

# ─── Tarih yanittan, kosum gunu varsayilmaz ───
# Fon bugunun fiyatini aciklamadiysa yanitta bugunun satiri olmaz ve gun
# ilerlemez. Kosum gununu yazmak uydurma bir gunluk getiri uretirdi.
grep -Fq "trade_date: g.tradeDate" "${CT}" || fail "satir kosum gunuyle yaziliyor"
if grep -Fq "trade_date: today" "${CT}"; then fail "hala kosum gunu varsayiliyor"; fi
printf 'PASS: fiyatin tarihi yanittan geliyor\n'

# ─── Getiri ve akis ayni yanit icindeki onceki gunden ───
# Pencere geriye acilir ki bir onceki is gunu yanitta olsun; hafta sonu ve
# tatil bosluklarini asacak kadar.
grep -q "PENCERE_GUN" "${CT}" || fail "geriye donuk pencere yok"
grep -q "export function gunlukGetiri" "${CT}" || fail "gunluk getiri turetilmiyor"
grep -q "export function netAkis" "${CT}" || fail "netAkis turetmesi yok"
grep -Fq "net_flow: netAkis(" "${CT}" || fail "satira net akis yazilmiyor"
printf 'PASS: getiri ve akis toplu yanittan turetiliyor\n'

# ─── Dagilim TEFAS'tan, kanonik adla ───
grep -q "kanonikDagilim" "${CT}" || fail "dagilim kanonik ada eslenmiyor"
grep -q "fact_fund_allocation" "${CT}" || fail "dagilim yazilmiyor"
printf 'PASS: dagilim toplu uctan kanonik adla yaziliyor\n'

# Havuz yalniz finally blogunda kapatilmali (bkz. RQ-0073).
for f in collect-tefas collect-kap collect-hisse; do
  n="$(grep -c "pool.end()" "${PROJECT_ROOT}/src/${f}.ts" || true)"
  [ "${n}" = "1" ] || fail "${f}.ts icinde ${n} adet pool.end() var, bir tane olmali"
done
printf 'PASS: havuz tek yerde kapatiliyor\n'

# ─── Tek fon: pencere en eski alistan, istek 28 gunluk parcalarla ───
# Uretimde yasandi: 15 Eylul tarihli alis, fon 16 Eylul'de eklendi, yalniz
# 16'nin fiyati geldi; portfoy gunlugu 15'i atti, alis parasi kazanc sanildi.
grep -q "min(trade_date)" "${CT}" || fail "tek fon penceresi en eski alistan baslamiyor"
grep -q "export function tarihParcalari" "${CT}" || fail "uzun aralik parcalanmiyor"
grep -q "AZAMI_ISTEK_GUN = 28" "${CT}" || fail "istek basina gun siniri 28 degil"
printf 'PASS: tek fon toplamasi en eski alisi kapsiyor\n'

# Sunucu "herhangi bir satir var" diye toplamayi atlamamali; alisi kapsayan
# fiyat var mi diye bakmali. Tek satir yeterli sayilinca eksik gunler hic
# dolmuyordu.
grep -q "min(trade_date) FROM portfolio_transaction" "${R}" \
  || fail "fundHasData en eski alisi kapsamaya bakmiyor"
printf 'PASS: sunucu eksik gunleri olan fonu atlamiyor\n'

# ─── Istek siniri: 429'da bekle, parcalari seyrek gonder ───
# Olculdu: art arda istekte toplu uc HTTP 429 dondurdu; kaynak dakikada 6
# istek sinirliyor. Eski tarihli alis icin parcali istek atan tek fon yolu
# uretimde ayni 429'u yerdi.
grep -q "status !== 429" "${TS}" || fail "429'da yeniden deneme yok"
grep -q "PARCA_ARASI_MS = 12_000" "${CT}" || fail "parcalar arasi bekleme sinirin altinda degil"
grep -q "await bekle(PARCA_ARASI_MS)" "${CT}" || fail "parca dongusu beklemiyor"
printf 'PASS: istek sinirina uyuluyor\n'
