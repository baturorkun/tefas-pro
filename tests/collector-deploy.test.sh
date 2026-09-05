#!/usr/bin/env bash
# Collector image'ının deploy pipeline'ında kurulduğunu korur.
#
# Bu test bir olaydan doğdu: collector yalnız elle kuruluyordu, RQ-0033 build'i
# bozdu, üç gün kimse fark etmedi ve sunucu eski image ile koştu. Belirti
# veriyle ilgili göründü (Collector Log'da boş "Fon" sütunu), sebep bir build
# hatasıydı ve hata hiçbir yere düşmüyordu.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
WF="${PROJECT_ROOT}/.github/workflows/deploy.yml"
CF="${PROJECT_ROOT}/collector/Containerfile"

# Build her deploy'da koşmalı: bozuk build workflow'u düşürsün.
grep -q "name: Build collector image" "${WF}" || fail "collector image build edilmeli"
grep -q "collector/Containerfile" "${WF}" || fail "collector Containerfile'ı kullanılmalı"
printf 'PASS: collector image her deploy''da kuruluyor\n'

# Sürüm numarası server image'ıyla aynı yoldan gelmeli.
grep -q 'APP_REQUIREMENT=${RQ}' "${WF}" || fail "collector sürüm numarası almalı"
grep -q "ARG APP_REQUIREMENT" "${CF}" || fail "Containerfile build arg'ı kabul etmeli"
printf 'PASS: sürüm numarası server image ile aynı kaynaktan\n'

# Asıl hatanın kendisi: scripts klasörü kopyalanmazsa pnpm build patlar.
grep -q "COPY scripts ./scripts" "${CF}" || fail "scripts klasörü kopyalanmalı"
grep -q "scripts src db/migrations" "${PROJECT_ROOT}/collector/install.sh" \
  || fail "install.sh build context'ine scripts göndermeli"
printf 'PASS: scripts klasörü hem image hem uzak kuruluma gidiyor\n'

# Timer yalnız main'de devralınmalı; branch dağıtımı üretimi ele geçirmemeli.
grep -q "steps.target.outputs.slot == 'main'" "${WF}" || fail "latest etiketi main'e sınırlı olmalı"
grep -q "tefas-pro-collector:latest" "${WF}" || fail "timer'ın etiketi yenilenmeli"
printf 'PASS: :latest yalnız main dağıtımında yenileniyor\n'

# systemd şablonu tek yerde kalmalı.
grep -qE "OnCalendar|\[Timer\]|systemctl enable" "${WF}" \
  && fail "workflow systemd unit'i yazmamalı; o install.sh'in işi"
grep -q "OnCalendar" "${PROJECT_ROOT}/collector/install.sh" || fail "timer şablonu install.sh'te olmalı"
printf 'PASS: systemd şablonu yalnız install.sh'"'"'te\n'

# Zamanlama varsayılanı sunucudaki gerçekle aynı olmalı, yoksa bir sonraki
# kurulum saati sessizce değiştirir.
grep -q 'COLLECTOR_ON_CALENDAR="Mon..Fri 10:30:00"' "${PROJECT_ROOT}/collector/install.sh" \
  || fail "varsayılan zamanlama hafta içi 10:30 olmalı"
printf 'PASS: zamanlama varsayılanı hafta içi 10:30\n'

# Temizlik: branch image'ı birikmemeli.
grep -q 'podman rmi -f "localhost/tefas-pro-collector:${slot}"' "${WF}" \
  || fail "slot temizliğinde collector image'ı da silinmeli"
printf 'PASS: slot temizliği collector image'"'"'ını da siliyor\n'
