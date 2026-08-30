#!/usr/bin/env bash
# Uygulama sunucusu kurulumu.
#
# collector/install.sh ile aynı arayüz, ama collector oneshot'tır; bu uzun
# ömürlü bir servistir: ayakta kalır, port dinler, restart ile yönetilir.
#
# macOS'un Bash 3.2'si hedeflenir: associative array, ${var,,} ve mapfile yok.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
ENV_EXAMPLE="${SCRIPT_DIR}/.env.example"
CONTAINERFILE="${SCRIPT_DIR}/Containerfile"
IMAGE="localhost/tefas-pro-server:latest"
SERVICE_NAME="tefas-pro-server"

NETWORK="tefas-pro-db_default"
HOST_PORT="127.0.0.1:8282"

usage() {
  cat <<'USAGE'
Usage:
  server/install.sh local [ortak seçenekler]
  server/install.sh remote <user@host> [-p ssh-port] [-d remote-dir] [--no-service]
                           [ortak seçenekler]
  server/install.sh --help

Ortak seçenekler:
  --network <ad>   Compose ağı (varsayılan: tefas-pro-db_default)
  --port <bind>    Host bind adresi (varsayılan: 127.0.0.1:8282)

Port yalnız loopback'e yayınlanır. Dışarı açmak reverse proxy ve TLS işidir.
USAGE
}

log() { printf '[server] %s\n' "$*"; }
error() { printf '[error] %s\n' "$*" >&2; }

require_podman() {
  command -v podman >/dev/null 2>&1 || { error "Podman bulunamadı."; exit 1; }
}

ensure_env_file() {
  if [ ! -f "${ENV_FILE}" ]; then
    cp "${ENV_EXAMPLE}" "${ENV_FILE}"
    chmod 600 "${ENV_FILE}"
    error "Yapılandırma oluşturuldu: ${ENV_FILE}"
    error "DATABASE_URL içindeki parolayı düzenleyip komutu tekrar çalıştırın."
    exit 1
  fi
  chmod 600 "${ENV_FILE}"
}

# Env dosyası SOURCE EDİLMEZ: parolayı kabuk ortamına almaya gerek yok,
# podman dosyayı kendisi okuyor.
check_env_file() {
  grep -q '^DATABASE_URL=' "${ENV_FILE}" || { error "DATABASE_URL satırı yok."; exit 1; }
  if grep -q '^DATABASE_URL=.*PAROLA' "${ENV_FILE}"; then
    error "DATABASE_URL örnek parolayı taşıyor; gerçek değeri girin."
    exit 1
  fi
  if grep -q '^DATABASE_URL=.*@127\.0\.0\.1' "${ENV_FILE}"; then
    error "DATABASE_URL host portunu gösteriyor; container içinden erişilemez."
    error "Compose servis adını kullanın: @postgres:5432"
    exit 1
  fi
}

parse_common_opts() {
  REMAINING_ARGS=""
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --network) NETWORK="${2:-}"; shift 2 ;;
      --port) HOST_PORT="${2:-}"; shift 2 ;;
      *) REMAINING_ARGS="${REMAINING_ARGS} $1"; shift ;;
    esac
  done
}

build_image() {
  log "Image build ediliyor: ${IMAGE}"
  podman build -f "${CONTAINERFILE}" -t "${IMAGE}" "${PROJECT_ROOT}" >/dev/null
}

start_container() {
  # Aynı isimde container varsa yenilenir; ikinci bir kopya oluşmaz.
  podman rm -f "${SERVICE_NAME}" >/dev/null 2>&1 || true
  podman run -d --name "${SERVICE_NAME}" \
    --network "${NETWORK}" \
    --env-file "${ENV_FILE}" \
    --restart unless-stopped \
    -p "${HOST_PORT}:8282" \
    "${IMAGE}" >/dev/null
}

verify() {
  bind_host="$(printf '%s' "${HOST_PORT}" | cut -d: -f1)"
  bind_port="$(printf '%s' "${HOST_PORT}" | cut -d: -f2)"
  attempt=1
  while [ "${attempt}" -le 30 ]; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 \
      "http://${bind_host}:${bind_port}/healthz" || true)"
    if [ "${code}" = "200" ]; then
      log "Sunucu hazır: http://${HOST_PORT}"
      return 0
    fi
    sleep 2
    attempt=$((attempt + 1))
  done
  error "Sunucu 60 saniye içinde yanıt vermedi."
  podman logs --tail 20 "${SERVICE_NAME}" >&2 || true
  exit 1
}

cmd_local() {
  parse_common_opts "$@"
  require_podman
  ensure_env_file
  check_env_file
  podman network exists "${NETWORK}" 2>/dev/null || {
    error "Ağ bulunamadı: ${NETWORK}. Önce db/install.sh local."
    exit 1
  }
  build_image
  start_container
  verify
}

# ─── Remote ─────────────────────────────────────────────────────────────────

REMOTE_TARGET=""
REMOTE_PORT="22"
REMOTE_DIR=""
INSTALL_SERVICE="yes"

remote_ssh() { ssh -o BatchMode=yes -p "${REMOTE_PORT}" "${REMOTE_TARGET}" "$@"; }

cmd_remote() {
  parse_common_opts "$@"
  # shellcheck disable=SC2086
  set -- ${REMAINING_ARGS}
  REMOTE_TARGET="${1:-}"
  shift || true
  [ -n "${REMOTE_TARGET}" ] || { error "remote modu <user@host> gerektirir."; exit 2; }
  while [ "$#" -gt 0 ]; do
    case "$1" in
      -p) REMOTE_PORT="${2:-}"; shift 2 ;;
      -d) REMOTE_DIR="${2:-}"; shift 2 ;;
      --no-service) INSTALL_SERVICE="no"; shift ;;
      *) error "Bilinmeyen seçenek: $1"; exit 2 ;;
    esac
  done
  case "${REMOTE_TARGET}" in
    -*|*@|@*|*[!A-Za-z0-9._@:-]*) error "Geçersiz SSH hedefi."; exit 2 ;;
    *@*) ;;
    *) error "SSH hedefi user@host biçiminde olmalıdır."; exit 2 ;;
  esac
  case "${REMOTE_PORT}" in ""|*[!0-9]*|0|0*) error "Geçersiz SSH portu."; exit 2 ;; esac

  ensure_env_file
  check_env_file
  log "SSH doğrulanıyor: ${REMOTE_TARGET}:${REMOTE_PORT}"
  remote_ssh 'command -v podman >/dev/null 2>&1' || { error "Uzakta podman yok."; exit 1; }

  REMOTE_USER="$(remote_ssh 'id -un')"
  if [ -z "${REMOTE_DIR}" ]; then
    if [ "${REMOTE_USER}" = "root" ]; then
      REMOTE_DIR="/opt/tefas-pro/server"
    else
      REMOTE_DIR="$(remote_ssh 'echo $HOME')/.local/share/tefas-pro/server"
    fi
  fi
  case "${REMOTE_DIR}" in
    /|/bin|/boot|/dev|/etc|/lib|/proc|/sbin|/sys|/usr|/var)
      error "Güvenli olmayan uzak dizin: ${REMOTE_DIR}"; exit 1 ;;
  esac

  log "Build context kopyalanıyor: ${REMOTE_DIR}"
  remote_ssh "mkdir -p '${REMOTE_DIR}'"
  COPYFILE_DISABLE=1 tar czf - -C "${PROJECT_ROOT}" --exclude='._*' \
    package.json pnpm-lock.yaml tsconfig.json tsconfig.build.json \
    src public db/migrations server/Containerfile \
    | remote_ssh "tar xzf - -C '${REMOTE_DIR}'"
  remote_ssh "umask 077; cat > '${REMOTE_DIR}/.env'" < "${ENV_FILE}"
  remote_ssh "chmod 600 '${REMOTE_DIR}/.env'"

  log "Image uzakta build ediliyor."
  remote_ssh "cd '${REMOTE_DIR}' && podman build -f server/Containerfile -t '${IMAGE}' . >/dev/null"

  log "Container başlatılıyor."
  remote_ssh "podman rm -f '${SERVICE_NAME}' >/dev/null 2>&1 || true; podman run -d --name '${SERVICE_NAME}' --network '${NETWORK}' --env-file '${REMOTE_DIR}/.env' --restart unless-stopped -p '${HOST_PORT}:8282' '${IMAGE}' >/dev/null"

  if [ "${INSTALL_SERVICE}" = "yes" ]; then
    if [ "${REMOTE_USER}" = "root" ]; then UNIT_DIR="/etc/systemd/system"; SYSTEMCTL="systemctl";
    else UNIT_DIR="\$HOME/.config/systemd/user"; SYSTEMCTL="systemctl --user";
      remote_ssh "loginctl enable-linger '${REMOTE_USER}' >/dev/null 2>&1 || true"; fi
    remote_ssh "mkdir -p ${UNIT_DIR} && cat > ${UNIT_DIR}/${SERVICE_NAME}.service" <<UNIT
[Unit]
Description=tefas-pro uygulama sunucusu
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
Restart=always
RestartSec=5
WorkingDirectory=${REMOTE_DIR}
ExecStart=/usr/bin/podman start -a ${SERVICE_NAME}
ExecStop=/usr/bin/podman stop -t 10 ${SERVICE_NAME}

[Install]
WantedBy=multi-user.target
UNIT
    remote_ssh "${SYSTEMCTL} daemon-reload && ${SYSTEMCTL} enable ${SERVICE_NAME}.service"
    log "systemd service kuruldu ve enable edildi."
  else
    log "--no-service: systemd unit kurulmadı."
  fi

  bind_port="$(printf '%s' "${HOST_PORT}" | cut -d: -f2)"
  code="$(remote_ssh "curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:${bind_port}/healthz" || true)"
  [ "${code}" = "200" ] || { error "Uzak sunucu yanıt vermedi (HTTP ${code})."; exit 1; }
  log "Uzak sunucu hazır. Tünel: ssh -p ${REMOTE_PORT} -L ${bind_port}:127.0.0.1:${bind_port} ${REMOTE_TARGET}"
}

main() {
  case "${1:---help}" in
    local) shift; cmd_local "$@" ;;
    remote) shift; cmd_remote "$@" ;;
    --help|-h|help) usage ;;
    *) error "Bilinmeyen komut: $1"; usage >&2; exit 2 ;;
  esac
}

main "$@"
