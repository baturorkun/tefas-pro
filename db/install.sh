#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/compose.yaml"
ENV_FILE="${SCRIPT_DIR}/.env"
ENV_EXAMPLE="${SCRIPT_DIR}/.env.example"
SECRETS_DIR="${SCRIPT_DIR}/.secrets"
PGPASS_FILE="${SECRETS_DIR}/pgpass"
POSTGRES_PASSWORD_FILE="${SECRETS_DIR}/postgres-password"
COMPOSE_DRIVER=""

usage() {
  cat <<'USAGE'
Usage:
  db/install.sh local
  db/install.sh remote <user@host> [-p ssh-port] [-d remote-dir] [--no-service]
  db/install.sh --help

Remote defaults:
  root user:     /opt/tefas-pro/db
  rootless user: $HOME/.local/share/tefas-pro/db
  pgweb access:  SSH tunnel printed after verification
USAGE
}

log() {
  printf '[install] %s\n' "$*"
}

error() {
  printf '[error] %s\n' "$*" >&2
}

require_file() {
  if [[ ! -f "$1" ]]; then
    error "Gerekli dosya bulunamadı: $1"
    exit 1
  fi
}

validate_host_port() {
  port_value="$1"
  port_label="$2"
  case "${port_value}" in
    ""|*[!0-9]*|0|0*)
      error "Geçersiz ${port_label} host portu: 1-65535 arasında, başında sıfır olmayan bir sayı olmalıdır."
      exit 1
      ;;
  esac
  if [[ "${#port_value}" -gt 5 || "${port_value}" -gt 65535 ]]; then
    error "Geçersiz ${port_label} host portu: 1-65535 arasında olmalıdır."
    exit 1
  fi
}

detect_compose() {
  if ! command -v podman >/dev/null 2>&1; then
    error "Podman bulunamadı. Önce Podman'ı kurup çalıştırın."
    exit 1
  fi
  if podman compose version >/dev/null 2>&1; then
    COMPOSE_DRIVER="podman"
  elif command -v podman-compose >/dev/null 2>&1; then
    COMPOSE_DRIVER="podman-compose"
  else
    error "Compose aracı bulunamadı: podman compose veya podman-compose gerekli."
    exit 1
  fi
}

compose() {
  if [[ "${COMPOSE_DRIVER}" == "podman" ]]; then
    podman compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" "$@"
  else
    podman-compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" "$@"
  fi
}

load_environment() {
  require_file "${ENV_FILE}"
  unset COMPOSE_PROJECT_NAME TEFAS_POSTGRES_DB TEFAS_POSTGRES_USER \
    TEFAS_POSTGRES_PASSWORD TEFAS_POSTGRES_PORT TEFAS_PGWEB_PORT || true
  while IFS= read -r env_line || [[ -n "${env_line}" ]]; do
    env_line="${env_line%$'\r'}"
    case "${env_line}" in
      ""|\#*) continue ;;
      *=*)
        env_key="${env_line%%=*}"
        env_value="${env_line#*=}"
        ;;
      *)
        error "Geçersiz db/.env satırı: ${env_line}"
        exit 1
        ;;
    esac
    case "${env_key}" in
      COMPOSE_PROJECT_NAME|TEFAS_POSTGRES_DB|TEFAS_POSTGRES_USER|TEFAS_POSTGRES_PASSWORD|TEFAS_POSTGRES_PORT|TEFAS_PGWEB_PORT)
        export "${env_key}=${env_value}"
        ;;
      *)
        error "Desteklenmeyen db/.env anahtarı: ${env_key}"
        exit 1
        ;;
    esac
  done < "${ENV_FILE}"
  PG_DB="${TEFAS_POSTGRES_DB:-tefas}"
  PG_USER="${TEFAS_POSTGRES_USER:-tefas}"
  PG_HOST_PORT="${TEFAS_POSTGRES_PORT:-5433}"
  PGWEB_HOST_PORT="${TEFAS_PGWEB_PORT:-8081}"
  validate_host_port "${PG_HOST_PORT}" "PostgreSQL"
  validate_host_port "${PGWEB_HOST_PORT}" "pgweb"
}

write_secret_files() {
  if [[ -L "${SECRETS_DIR}" ]]; then
    error "Secret dizini sembolik bağ olamaz: ${SECRETS_DIR}"
    exit 1
  fi
  mkdir -p "${SECRETS_DIR}"
  chmod 700 "${SECRETS_DIR}"
  printf '%s\n' "${TEFAS_POSTGRES_PASSWORD:-local-development-only}" > "${POSTGRES_PASSWORD_FILE}"
  chmod 600 "${POSTGRES_PASSWORD_FILE}"
  pgpass_password="${TEFAS_POSTGRES_PASSWORD:-local-development-only}"
  pgpass_password="${pgpass_password//\\/\\\\}"
  pgpass_password="${pgpass_password//:/\\:}"
  printf 'postgres:5432:%s:%s:%s\n' "${PG_DB}" "${PG_USER}" "${pgpass_password}" > "${PGPASS_FILE}"
  chmod 600 "${PGPASS_FILE}"
}

verify_services() {
  attempt=1
  while [[ "${attempt}" -le 30 ]]; do
    if podman exec tefas-pro-postgres pg_isready -U "${PG_USER}" -d "${PG_DB}" >/dev/null 2>&1; then
      break
    fi
    if [[ "${attempt}" -eq 30 ]]; then
      error "PostgreSQL 60 saniye içinde hazır olmadı."
      exit 1
    fi
    sleep 2
    attempt=$((attempt + 1))
  done
  podman exec tefas-pro-postgres psql -U "${PG_USER}" -d "${PG_DB}" -tAc 'SELECT version()' >/dev/null
  log "PostgreSQL hazır: 127.0.0.1:${PG_HOST_PORT}/${PG_DB}"

  pgweb_code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "http://127.0.0.1:${PGWEB_HOST_PORT}/")"
  case "${pgweb_code}" in
    2*|3*) log "pgweb hazır: http://127.0.0.1:${PGWEB_HOST_PORT}" ;;
    *) error "pgweb sağlık kontrolü başarısız: HTTP ${pgweb_code}"; exit 1 ;;
  esac
}

install_local() {
  require_file "${COMPOSE_FILE}"
  require_file "${ENV_EXAMPLE}"
  if [[ ! -f "${ENV_FILE}" ]]; then
    cp "${ENV_EXAMPLE}" "${ENV_FILE}"
    chmod 600 "${ENV_FILE}"
    log "${ENV_FILE}, .env.example üzerinden oluşturuldu."
  fi
  load_environment
  write_secret_files
  command -v curl >/dev/null 2>&1 || { error "curl bulunamadı; pgweb sağlık kontrolü için curl gereklidir."; exit 1; }
  detect_compose
  compose config >/dev/null
  compose up -d
  verify_services
  rm -f "${SCRIPT_DIR}/.pgpass" "${SCRIPT_DIR}/.postgres-password"
}

install_remote_service() {
  remote_uid="${REMOTE_UID}"
  service_name="tefas-pro-db.service"
  if [[ "${REMOTE_COMPOSE}" == "podman compose" ]]; then
    remote_podman="$(remote_ssh 'command -v podman')"
    remote_compose_exec="${remote_podman} compose"
  else
    remote_compose_exec="$(remote_ssh 'command -v podman-compose')"
  fi
  case "${remote_compose_exec}" in
    /*) ;;
    *) error "Uzak Compose executable yolu çözümlenemedi."; exit 1 ;;
  esac

  if [[ "${remote_uid}" == "0" ]]; then
    systemctl_cmd="systemctl"
    wanted_by="multi-user.target"
    unit_dir="/etc/systemd/system"
  else
    systemctl_cmd="systemctl --user"
    wanted_by="default.target"
    unit_dir="\$HOME/.config/systemd/user"
    if ! remote_ssh 'loginctl enable-linger "$(whoami)"' >/dev/null 2>&1; then
      log "Uyarı: user lingering etkinleştirilemedi; kullanıcı oturumu kapanınca servis durabilir."
    fi
    remote_ssh 'mkdir -p "$HOME/.config/systemd/user"'
  fi

  unit_tmp="$(mktemp)"
  printf '%s\n' \
    '[Unit]' \
    'Description=tefas-pro PostgreSQL and pgweb (Podman Compose)' \
    'After=network-online.target' \
    'Wants=network-online.target' \
    '' \
    '[Service]' \
    'Type=oneshot' \
    'RemainAfterExit=yes' \
    "WorkingDirectory=${REMOTE_DIR}" \
    "ExecStart=${remote_compose_exec} --env-file .env -f compose.yaml up -d" \
    "ExecStop=${remote_compose_exec} --env-file .env -f compose.yaml down" \
    'TimeoutStartSec=300' \
    '' \
    '[Install]' \
    "WantedBy=${wanted_by}" > "${unit_tmp}"

  remote_unit_tmp="/tmp/${service_name}.${remote_uid}"
  if ! remote_scp "${unit_tmp}" "${REMOTE_TARGET}:${remote_unit_tmp}"; then
    rm -f "${unit_tmp}"
    error "systemd unit uzak sunucuya kopyalanamadı."
    exit 1
  fi
  rm -f "${unit_tmp}"
  remote_ssh "mv '${remote_unit_tmp}' \"${unit_dir}/${service_name}\""
  remote_ssh "${systemctl_cmd} daemon-reload && ${systemctl_cmd} enable ${service_name} >/dev/null && ${systemctl_cmd} restart ${service_name}"

  systemd_enabled="$(remote_ssh "${systemctl_cmd} is-enabled ${service_name}")"
  systemd_active="$(remote_ssh "${systemctl_cmd} is-active ${service_name}")"
  if [[ "${systemd_enabled}" != "enabled" || "${systemd_active}" != "active" ]]; then
    error "systemd beklenen durumda değil: enabled=${systemd_enabled}, active=${systemd_active}"
    exit 1
  fi
  log "systemd hazır: ${systemd_enabled} ${systemd_active}"
}

install_remote() {
  if [[ "$#" -lt 1 ]]; then
    error "remote modu <user@host> hedefi gerektirir."
    exit 2
  fi
  REMOTE_TARGET="$1"
  shift
  REMOTE_PORT=22
  REMOTE_DIR=""
  INSTALL_SERVICE=1
  while [[ "$#" -gt 0 ]]; do
    case "$1" in
      -p)
        [[ "$#" -ge 2 ]] || { error "-p bir SSH portu gerektirir."; exit 2; }
        REMOTE_PORT="$2"
        shift 2
        ;;
      -d)
        [[ "$#" -ge 2 ]] || { error "-d bir uzak dizin gerektirir."; exit 2; }
        REMOTE_DIR="$2"
        shift 2
        ;;
      --no-service)
        INSTALL_SERVICE=0
        shift
        ;;
      *)
        error "Bilinmeyen remote argümanı: $1"
        exit 2
        ;;
    esac
  done

  case "${REMOTE_TARGET}" in
    -*|*@|@*|*@@*|*[!A-Za-z0-9._@:-]*) error "Geçersiz SSH hedefi: ${REMOTE_TARGET}"; exit 2 ;;
    *@*) ;;
    *) error "SSH hedefi user@host biçiminde olmalıdır."; exit 2 ;;
  esac
  case "${REMOTE_PORT}" in
    ""|*[!0-9]*|0|0*) error "SSH portu 1-65535 arasında, başında sıfır olmayan bir sayı olmalıdır."; exit 2 ;;
  esac
  if [[ "${REMOTE_PORT}" -gt 65535 ]]; then
    error "SSH portu 1-65535 arasında olmalıdır."
    exit 2
  fi
  load_environment
  case "${PG_USER}" in
    ""|*[!A-Za-z0-9_]*) error "Geçersiz PostgreSQL kullanıcı adı."; exit 1 ;;
  esac
  case "${PG_DB}" in
    ""|*[!A-Za-z0-9_]*) error "Geçersiz PostgreSQL veritabanı adı."; exit 1 ;;
  esac
  remote_password="${TEFAS_POSTGRES_PASSWORD:-}"
  case "${remote_password}" in
    *[!A-Za-z0-9._~-]*)
      error "Uzak kurulum parolası en az 16 karakter olmalı ve yalnızca A-Z, a-z, 0-9, nokta, alt çizgi, tilde veya tire içermelidir."
      exit 1
      ;;
  esac
  if [[ "${#remote_password}" -lt 16 ]]; then
    error "Uzak kurulum parolası en az 16 karakter olmalıdır."
    exit 1
  fi
  case "${remote_password}" in
    *[[:lower:]]*) ;;
    *) error "Uzak kurulum parolası zayıf: en az bir küçük harf gereklidir."; exit 1 ;;
  esac
  case "${remote_password}" in
    *[[:upper:]]*) ;;
    *) error "Uzak kurulum parolası zayıf: en az bir büyük harf gereklidir."; exit 1 ;;
  esac
  case "${remote_password}" in
    *[[:digit:]]*) ;;
    *) error "Uzak kurulum parolası zayıf: en az bir rakam gereklidir."; exit 1 ;;
  esac
  case "${remote_password}" in
    *[._~-]*) ;;
    *) error "Uzak kurulum parolası zayıf: nokta, alt çizgi, tilde veya tire karakterlerinden en az biri gereklidir."; exit 1 ;;
  esac
  normalized_password="$(printf '%s' "${remote_password}" | tr '[:upper:]' '[:lower:]')"
  case "${normalized_password}" in
    password*|postgres*|tefas*|change_me*|replace_me*|local-development-only)
      error "Uzak kurulum parolası bilinen veya tahmin edilebilir zayıf bir değer olamaz."
      exit 1
      ;;
  esac
  case "${TEFAS_POSTGRES_PASSWORD:-}" in
    ""|tefas|change_me|replace_me|local-development-only)
      error "Uzak kurulum için PostgreSQL parolası boş, örnek veya zayıf olamaz. db/.env dosyasını güncelleyin."
      exit 1
      ;;
  esac
  write_secret_files

  require_file "${COMPOSE_FILE}"
  command -v ssh >/dev/null 2>&1 || { error "ssh bulunamadı; uzak kurulum için OpenSSH istemcisi gereklidir."; exit 1; }
  command -v scp >/dev/null 2>&1 || { error "scp bulunamadı; uzak dosya aktarımı için OpenSSH scp gereklidir."; exit 1; }
  remote_ssh() {
    ssh -p "${REMOTE_PORT}" -o BatchMode=yes -o ConnectTimeout=10 "${REMOTE_TARGET}" "$@"
  }
  remote_scp() {
    scp -P "${REMOTE_PORT}" -o BatchMode=yes "$@"
  }

  log "SSH bağlantısı doğrulanıyor: ${REMOTE_TARGET}:${REMOTE_PORT}"
  remote_ssh true >/dev/null || { error "SSH bağlantısı kurulamadı."; exit 1; }
  remote_ssh 'command -v podman >/dev/null 2>&1' || { error "Uzak sunucuda Podman bulunamadı."; exit 1; }
  remote_ssh 'command -v curl >/dev/null 2>&1' || { error "Uzak sunucuda curl bulunamadı."; exit 1; }
  REMOTE_COMPOSE="$(remote_ssh 'if podman compose version >/dev/null 2>&1; then printf "podman compose"; elif command -v podman-compose >/dev/null 2>&1; then printf "podman-compose"; else printf "NONE"; fi')"
  if [[ "${REMOTE_COMPOSE}" == "NONE" || -z "${REMOTE_COMPOSE}" ]]; then
    error "Uzak sunucuda podman compose veya podman-compose bulunamadı."
    exit 1
  fi

  REMOTE_UID="$(remote_ssh 'id -u')"
  case "${REMOTE_UID}" in
    ""|*[!0-9]*) error "Uzak kullanıcı kimliği çözümlenemedi."; exit 1 ;;
  esac
  if [[ -z "${REMOTE_DIR}" ]]; then
    if [[ "${REMOTE_UID}" == "0" ]]; then
      REMOTE_DIR="/opt/tefas-pro/db"
    else
      REMOTE_HOME="$(remote_ssh 'printf "%s" "$HOME"')"
      REMOTE_DIR="${REMOTE_HOME}/.local/share/tefas-pro/db"
    fi
  fi
  case "${REMOTE_DIR}" in
    /*) ;;
    *) error "Uzak dizin mutlak bir yol olmalıdır."; exit 2 ;;
  esac
  case "${REMOTE_DIR}" in
    /|/bin|/bin/|/boot|/boot/|/dev|/dev/|/etc|/etc/|/home|/home/|/lib|/lib/|/lib64|/lib64/|/opt|/opt/|/proc|/proc/|/root|/root/|/run|/run/|/sbin|/sbin/|/srv|/srv/|/sys|/sys/|/tmp|/tmp/|/usr|/usr/|/var|/var/)
      error "Uzak dizin bir sistem kök dizini olamaz: ${REMOTE_DIR}"
      exit 2
      ;;
  esac
  case "${REMOTE_DIR}" in
    *[!A-Za-z0-9._/-]*) error "Uzak dizin yalnızca güvenli yol karakterleri içermelidir."; exit 2 ;;
  esac

  remote_ssh "mkdir -p '${REMOTE_DIR}'"
  remote_scp "${COMPOSE_FILE}" "${REMOTE_TARGET}:${REMOTE_DIR}/compose.yaml"
  remote_scp "${ENV_FILE}" "${REMOTE_TARGET}:${REMOTE_DIR}/.env"
  remote_ssh "if [ -L '${REMOTE_DIR}/.secrets' ]; then printf 'secret dizini sembolik bağ olamaz\\n' >&2; exit 1; fi; mkdir -p '${REMOTE_DIR}/.secrets' && chmod 700 '${REMOTE_DIR}/.secrets'"
  # Podman's :U bind option may map the live file to a subordinate UID on
  # rootless hosts. Stage as a user-owned sibling, then atomically rename it;
  # a failed transfer leaves the live secret intact.
  remote_scp "${PGPASS_FILE}" "${REMOTE_TARGET}:${REMOTE_DIR}/.secrets/pgpass.next"
  remote_ssh "chmod 600 '${REMOTE_DIR}/.secrets/pgpass.next' && mv -f '${REMOTE_DIR}/.secrets/pgpass.next' '${REMOTE_DIR}/.secrets/pgpass'"
  remote_scp "${POSTGRES_PASSWORD_FILE}" "${REMOTE_TARGET}:${REMOTE_DIR}/.secrets/postgres-password"
  remote_ssh "chmod 600 '${REMOTE_DIR}/.env' '${REMOTE_DIR}/.secrets/pgpass' '${REMOTE_DIR}/.secrets/postgres-password'"

  if [[ "${INSTALL_SERVICE}" -eq 0 ]]; then
    remote_ssh "cd '${REMOTE_DIR}' && ${REMOTE_COMPOSE} --env-file .env -f compose.yaml up -d"
  else
    install_remote_service
  fi

  remote_ssh "for i in \$(seq 1 30); do podman exec tefas-pro-postgres pg_isready -U '${PG_USER}' -d '${PG_DB}' >/dev/null 2>&1 && exit 0; sleep 2; done; exit 1" \
    || { error "Uzak PostgreSQL 60 saniye içinde hazır olmadı."; exit 1; }
  remote_ssh "podman exec tefas-pro-postgres psql -U '${PG_USER}' -d '${PG_DB}' -tAc 'SELECT version()'" >/dev/null
  log "Uzak PostgreSQL hazır: 127.0.0.1:${PG_HOST_PORT}/${PG_DB}"

  remote_pgweb_code="$(remote_ssh "curl -s -o /dev/null -w '%{http_code}' --max-time 8 http://127.0.0.1:${PGWEB_HOST_PORT}/")"
  case "${remote_pgweb_code}" in
    2*|3*) log "Uzak pgweb hazır: HTTP ${remote_pgweb_code}" ;;
    *) error "Uzak pgweb sağlık kontrolü başarısız: HTTP ${remote_pgweb_code}"; exit 1 ;;
  esac
  # Remove secret files left by releases before the protected .secrets layout,
  # but only after the new services have passed their live checks.
  remote_ssh "rm -f '${REMOTE_DIR}/.pgpass' '${REMOTE_DIR}/.postgres-password'"
  log "pgweb tüneli: ssh -p ${REMOTE_PORT} -L ${PGWEB_HOST_PORT}:127.0.0.1:${PGWEB_HOST_PORT} ${REMOTE_TARGET}"
}

case "${1:-}" in
  -h|--help)
    usage
    exit 0
    ;;
  local)
    [[ "$#" -eq 1 ]] || { error "local modu ek argüman kabul etmez."; exit 2; }
    install_local
    ;;
  remote)
    shift
    install_remote "$@"
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac
