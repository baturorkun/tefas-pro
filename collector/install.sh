#!/usr/bin/env bash
# Collector oneshot container kurulumu.
#
# Yerelde image'ı kurup bir doğrulama koşusu yapar; uzak Linux sunucuda ayrıca
# systemd service ve timer kurarak gecelik çalışmayı devreye alır.
#
# macOS'un Bash 3.2'si hedeflenir: associative array, ${var,,} ve mapfile yok.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
ENV_EXAMPLE="${SCRIPT_DIR}/.env.example"
CONTAINERFILE="${SCRIPT_DIR}/Containerfile"
IMAGE="localhost/tefas-pro-collector:latest"
SERVICE_NAME="tefas-pro-collector"

usage() {
  cat <<'USAGE'
Usage:
  collector/install.sh local [ortak seçenekler]
  collector/install.sh remote <user@host> [-p ssh-port] [-d remote-dir] [--no-timer]
                              [ortak seçenekler]
  collector/install.sh --help

Ortak seçenekler:
  --network <ad>        Compose ağı (varsayılan: tefas-pro-db_default)
  --collector-args <s>  Collector argümanları, ör. "--backfill"
  --on-calendar <spec>  systemd OnCalendar (varsayılan: *-*-* 03:00:00)
  --random-delay <sn>   systemd RandomizedDelaySec (varsayılan: 1800)

Yerelde systemd yoktur; local modu image'ı kurar ve bir doğrulama koşusu yapar.
Gecelik zamanlama yalnız remote modda kurulur.

Remote varsayılanları:
  root kullanıcı:     /opt/tefas-pro/collector
  rootless kullanıcı: $HOME/.local/share/tefas-pro/collector
USAGE
}

log() { printf '[collector] %s\n' "$*"; }
error() { printf '[error] %s\n' "$*" >&2; }

require_podman() {
  if ! command -v podman >/dev/null 2>&1; then
    error "Podman bulunamadı. Önce Podman'ı kurup çalıştırın."
    exit 1
  fi
}

ensure_env_file() {
  if [ ! -f "${ENV_FILE}" ]; then
    if [ ! -f "${ENV_EXAMPLE}" ]; then
      error "Örnek yapılandırma yok: ${ENV_EXAMPLE}"
      exit 1
    fi
    cp "${ENV_EXAMPLE}" "${ENV_FILE}"
    chmod 600 "${ENV_FILE}"
    error "Yapılandırma oluşturuldu: ${ENV_FILE}"
    error "DATABASE_URL içindeki parolayı düzenleyip komutu tekrar çalıştırın."
    exit 1
  fi
  chmod 600 "${ENV_FILE}"
}

# Install-time ayarlar. Env dosyası podman'a --env-file gittiği için oraya
# konmaz: orada tırnak podman tarafından değerin parçası sayılır, tırnaksız
# boşluk ise bash source'unda komuta bölünür.
COLLECTOR_NETWORK="tefas-pro-db_default"
COLLECTOR_ARGS=""
COLLECTOR_ON_CALENDAR="*-*-* 03:00:00"
COLLECTOR_RANDOM_DELAY="1800"

# Env dosyası doğrulanır ama SOURCE EDİLMEZ: parolayı kabuk ortamına almaya
# gerek yok, podman dosyayı kendisi okuyor.
check_env_file() {
  if ! grep -q '^DATABASE_URL=' "${ENV_FILE}"; then
    error "DATABASE_URL satırı yok: ${ENV_FILE}"
    exit 1
  fi
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
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --network) COLLECTOR_NETWORK="${2:-}"; shift 2 ;;
      --collector-args) COLLECTOR_ARGS="${2:-}"; shift 2 ;;
      --on-calendar) COLLECTOR_ON_CALENDAR="${2:-}"; shift 2 ;;
      --random-delay) COLLECTOR_RANDOM_DELAY="${2:-}"; shift 2 ;;
      *) REMAINING_ARGS="${REMAINING_ARGS} $1"; shift ;;
    esac
  done
}

build_image() {
  log "Image build ediliyor: ${IMAGE}"
  podman build -f "${CONTAINERFILE}" -t "${IMAGE}" "${PROJECT_ROOT}" >/dev/null
  log "Image hazır."
}

require_network() {
  if ! podman network exists "${COLLECTOR_NETWORK}" 2>/dev/null; then
    error "Ağ bulunamadı: ${COLLECTOR_NETWORK}"
    error "Önce veritabanını kurun: db/install.sh local"
    exit 1
  fi
}

run_once() {
  log "Doğrulama koşusu başlıyor (oneshot)."
  # shellcheck disable=SC2086
  podman run --rm --name "${SERVICE_NAME}-run" \
    --network "${COLLECTOR_NETWORK}" \
    --env-file "${ENV_FILE}" \
    "${IMAGE}" ${COLLECTOR_ARGS}
  log "Koşu tamamlandı."
}

cmd_local() {
  REMAINING_ARGS=""
  parse_common_opts "$@"
  require_podman
  ensure_env_file
  check_env_file
  build_image
  require_network
  run_once
  log "Yerel kurulum tamam. Zamanlama yalnız remote modda kurulur."
}

# ─── Remote ─────────────────────────────────────────────────────────────────

REMOTE_TARGET=""
REMOTE_PORT="22"
REMOTE_DIR=""
INSTALL_TIMER="yes"

remote_ssh() { ssh -o BatchMode=yes -p "${REMOTE_PORT}" "${REMOTE_TARGET}" "$@"; }

parse_remote_args() {
  REMOTE_TARGET="${1:-}"
  shift || true
  if [ -z "${REMOTE_TARGET}" ]; then
    error "remote modu <user@host> hedefi gerektirir."
    exit 2
  fi
  while [ "$#" -gt 0 ]; do
    case "$1" in
      -p) REMOTE_PORT="${2:-}"; shift 2 ;;
      -d) REMOTE_DIR="${2:-}"; shift 2 ;;
      --no-timer) INSTALL_TIMER="no"; shift ;;
      *) error "Bilinmeyen seçenek: $1"; exit 2 ;;
    esac
  done
  case "${REMOTE_TARGET}" in
    -*|*@|@*|*[!A-Za-z0-9._@:-]*) error "Geçersiz SSH hedefi: ${REMOTE_TARGET}"; exit 2 ;;
    *@*) ;;
    *) error "SSH hedefi user@host biçiminde olmalıdır."; exit 2 ;;
  esac
  case "${REMOTE_PORT}" in
    ""|*[!0-9]*|0|0*) error "SSH portu 1-65535 arasında olmalıdır."; exit 2 ;;
  esac
  if [ "${REMOTE_PORT}" -gt 65535 ]; then
    error "SSH portu 1-65535 arasında olmalıdır."
    exit 2
  fi
}

cmd_remote() {
  REMAINING_ARGS=""
  parse_common_opts "$@"
  # shellcheck disable=SC2086
  parse_remote_args ${REMAINING_ARGS}
  ensure_env_file
  check_env_file

  log "SSH bağlantısı doğrulanıyor: ${REMOTE_TARGET}:${REMOTE_PORT}"
  remote_ssh 'command -v podman >/dev/null 2>&1' || {
    error "Uzak sunucuda podman bulunamadı."
    exit 1
  }

  REMOTE_USER="$(remote_ssh 'id -un')"
  if [ -z "${REMOTE_DIR}" ]; then
    if [ "${REMOTE_USER}" = "root" ]; then
      REMOTE_DIR="/opt/tefas-pro/collector"
    else
      REMOTE_DIR="$(remote_ssh 'echo $HOME')/.local/share/tefas-pro/collector"
    fi
  fi
  case "${REMOTE_DIR}" in
    /|/bin|/boot|/dev|/etc|/lib|/proc|/sbin|/sys|/usr|/var)
      error "Güvenli olmayan uzak dizin: ${REMOTE_DIR}"
      exit 1
      ;;
  esac

  log "Build context kopyalanıyor: ${REMOTE_DIR}"
  remote_ssh "mkdir -p '${REMOTE_DIR}'"
  COPYFILE_DISABLE=1 tar czf - -C "${PROJECT_ROOT}" \
    --exclude='._*' \
    package.json pnpm-lock.yaml tsconfig.json tsconfig.build.json \
    src db/migrations db/watchlist.txt collector/Containerfile \
    | remote_ssh "tar xzf - -C '${REMOTE_DIR}'"

  # Parola taşıyan dosya ayrı kopyalanır ve hemen kısıtlanır.
  remote_ssh "umask 077; cat > '${REMOTE_DIR}/.env'" < "${ENV_FILE}"
  remote_ssh "chmod 600 '${REMOTE_DIR}/.env'"

  log "Image uzak sunucuda build ediliyor."
  remote_ssh "cd '${REMOTE_DIR}' && podman build -f collector/Containerfile -t '${IMAGE}' . >/dev/null"

  if [ "${INSTALL_TIMER}" = "yes" ]; then
    install_units
  else
    log "--no-timer: systemd unit kurulmadı."
  fi

  log "Uzak doğrulama koşusu."
  remote_ssh "podman run --rm --network '${COLLECTOR_NETWORK}' --env-file '${REMOTE_DIR}/.env' '${IMAGE}' ${COLLECTOR_ARGS}"
  log "Uzak kurulum tamam: ${REMOTE_TARGET}:${REMOTE_DIR}"
}

install_units() {
  if [ "${REMOTE_USER}" = "root" ]; then
    UNIT_DIR="/etc/systemd/system"
    SYSTEMCTL="systemctl"
  else
    UNIT_DIR="\$HOME/.config/systemd/user"
    SYSTEMCTL="systemctl --user"
    remote_ssh "loginctl enable-linger '${REMOTE_USER}' >/dev/null 2>&1 || true"
  fi

  log "systemd service ve timer kuruluyor (${REMOTE_USER})."
  remote_ssh "mkdir -p ${UNIT_DIR} && cat > ${UNIT_DIR}/${SERVICE_NAME}.service" <<UNIT
[Unit]
Description=tefas-pro collector (oneshot ingest)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=${REMOTE_DIR}
ExecStart=/usr/bin/podman run --rm --network ${COLLECTOR_NETWORK} --env-file ${REMOTE_DIR}/.env ${IMAGE} ${COLLECTOR_ARGS}
TimeoutStartSec=3600
UNIT

  remote_ssh "cat > ${UNIT_DIR}/${SERVICE_NAME}.timer" <<UNIT
[Unit]
Description=tefas-pro collector her gece

[Timer]
OnCalendar=${COLLECTOR_ON_CALENDAR}
# Sabit dakikada atılan istekler kaynak tarafında düzenli bir imza bırakır.
RandomizedDelaySec=${COLLECTOR_RANDOM_DELAY}
# Sunucu kapalıyken kaçan tetikleme açılışta telafi edilir; collector idempotent
# olduğu için tekrar çalışması zararsızdır.
Persistent=true

[Install]
WantedBy=timers.target
UNIT

  remote_ssh "${SYSTEMCTL} daemon-reload && ${SYSTEMCTL} enable --now ${SERVICE_NAME}.timer"
  TIMER_STATE="$(remote_ssh "${SYSTEMCTL} is-enabled ${SERVICE_NAME}.timer" || true)"
  TIMER_ACTIVE="$(remote_ssh "${SYSTEMCTL} is-active ${SERVICE_NAME}.timer" || true)"
  if [ "${TIMER_STATE}" != "enabled" ] || [ "${TIMER_ACTIVE}" != "active" ]; then
    error "Timer beklenen durumda değil: enabled=${TIMER_STATE} active=${TIMER_ACTIVE}"
    exit 1
  fi
  log "Timer hazır: ${TIMER_STATE} ${TIMER_ACTIVE}, OnCalendar=${COLLECTOR_ON_CALENDAR}"
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
