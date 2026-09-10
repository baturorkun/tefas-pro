#!/usr/bin/env bash
# fvt toplamasını EV IP'sinden koşturur, sonucu uzak veritabanına yazar.
#
# Neden burada: fvt'nin veri uçları sunucunun IP'sine kapalı (403, Cloudflare)
# ama ev IP'sinden açık (200). Ölçüm src/collect-fvt.ts başında.
#
# Uzak postgres dışarı açık değil; host'ta 127.0.0.1:5434'te duruyor. SSH
# tunnel onu yerelde bir porta bağlıyor, komut bittiğinde tunnel kapanıyor.
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SSH_HOST="${FVT_SSH_HOST:-netforgesh}"
REMOTE_PG_PORT="${FVT_REMOTE_PG_PORT:-5434}"
LOCAL_PORT="${FVT_LOCAL_PORT:-15432}"
THROTTLE_MS="${FVT_THROTTLE_MS:-3000}"

usage() {
  cat <<'USAGE'
Kullanım:
  scripts/collect-fvt.sh [FON ...]

Fon verilmezse analytics.tracked_fund'daki bütün fonlar toplanır.

Ortam:
  FVT_SSH_HOST        uzak sunucu (varsayılan: netforgesh)
  FVT_REMOTE_PG_PORT  host'taki postgres portu (varsayılan: 5434)
  FVT_LOCAL_PORT      tunnel'ın yerel portu (varsayılan: 15432)
  FVT_THROTTLE_MS     istekler arası bekleme, ms (varsayılan: 3000)
  DATABASE_URL        yalnız kullanıcı/parola/db adı için okunur; host ve port
                      tunnel'a çevrilir
USAGE
}

[ "${1:-}" = "--help" ] && { usage; exit 0; }

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[hata] DATABASE_URL tanımlı değil (.env source edilmeli)" >&2
  exit 2
fi

# Yerel DATABASE_URL'in kimlik bilgisi kullanılır ama hedef tunnel olur:
# yanlışlıkla yerel veritabanına yazmayı imkânsız kılıyor.
TUNNEL_URL="$(
  DATABASE_URL="${DATABASE_URL}" LOCAL_PORT="${LOCAL_PORT}" python3 - <<'PY'
import os
from urllib.parse import urlsplit, urlunsplit
u = urlsplit(os.environ['DATABASE_URL'])
netloc = u.netloc.rsplit('@', 1)
cred = netloc[0] + '@' if len(netloc) == 2 else ''
print(urlunsplit((u.scheme, f"{cred}127.0.0.1:{os.environ['LOCAL_PORT']}", u.path, u.query, u.fragment)))
PY
)"

echo "[fvt] tunnel: ${SSH_HOST}:${REMOTE_PG_PORT} → 127.0.0.1:${LOCAL_PORT}"
ssh -f -N -o ExitOnForwardFailure=yes \
    -L "${LOCAL_PORT}:127.0.0.1:${REMOTE_PG_PORT}" "${SSH_HOST}"
TUNNEL_PID="$(pgrep -f "ssh -f -N .* -L ${LOCAL_PORT}:127.0.0.1:${REMOTE_PG_PORT}" | head -1 || true)"
# shellcheck disable=SC2064
trap "[ -n '${TUNNEL_PID}' ] && kill '${TUNNEL_PID}' 2>/dev/null || true" EXIT

cd "${PROJECT_ROOT}"
# Aralık geniş: elle koşan bir toplama, acelesi yok. 71 fon ~4 dakika sürer.
echo "[fvt] istekler arası ~${THROTTLE_MS} ms"
DATABASE_URL="${TUNNEL_URL}" COLLECT_THROTTLE_MS="${THROTTLE_MS}" \
  node --import tsx src/collect-fvt.ts "$@"
