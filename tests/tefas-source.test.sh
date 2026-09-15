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
