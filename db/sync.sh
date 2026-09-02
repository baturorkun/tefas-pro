#!/usr/bin/env bash
# Uzak sunucudaki veritabanını local kopyaya çeker.
#
# Yön tek: remote'tan local'e. Ters yön bilinçli olarak yazılmadı — üretim
# veritabanına yanlışlıkla restore etme ihtimali, kodda o yolun hiç bulunmaması
# ile kapatılıyor.
#
# Collector yalnız uzak sunucuda koşar. Local'de koşturmak farkı kapatmaz:
# portfolio_transaction kullanıcının uygulamada girdiği veridir ve yalnızca
# orada oluşur; collector fon verisi toplar, işlemleri değil.
#
# macOS'un Bash 3.2'si hedeflenir: associative array, ${var,,} ve mapfile yok.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REMOTE_CONTAINER="tefas-pro-postgres"
REMOTE_DB="tefas"
REMOTE_DB_USER="tefas"
# Uzak sunucudaki açık oturumların local'de işi yok; app_user kopyalanır ki
# aynı parolayla giriş yapılabilsin.
EXCLUDED_TABLES="app_session"

usage() {
  cat <<'USAGE'
Usage:
  db/sync.sh from-remote <user@host> [-p ssh-port] [--yes]
  db/sync.sh --help

Uzak veritabanını local kopyaya çeker. Yalnız bu yön desteklenir.

Seçenekler:
  -p <port>   SSH portu (varsayılan: 22)
  --yes       Local veritabanının üzerine yazma onayını sorma

Local hedef DATABASE_URL ile belirlenir:
  source .env && db/sync.sh from-remote root@sunucu

Sync sonunda migration çalışır: uzak şema local'den geride olabilir ve düz bir
restore local'deki yeni view'ları düşürür.
USAGE
}

log() { printf '[sync] %s\n' "$*"; }
error() { printf '[error] %s\n' "$*" >&2; }

parse_args() {
  REMOTE_TARGET="${1:-}"
  shift || true
  REMOTE_PORT=22
  ASSUME_YES=0

  if [ -z "${REMOTE_TARGET}" ]; then
    error "from-remote <user@host> hedefi gerektirir."
    exit 2
  fi

  while [ "$#" -gt 0 ]; do
    case "$1" in
      -p) REMOTE_PORT="${2:-}"; shift 2 ;;
      --yes) ASSUME_YES=1; shift ;;
      *) error "Bilinmeyen seçenek: $1"; exit 2 ;;
    esac
  done

  # db/install.sh ve collector/install.sh ile aynı doğrulama.
  case "${REMOTE_TARGET}" in
    -*|*@|@*|*@@*|*[!A-Za-z0-9._@:-]*) error "Geçersiz SSH hedefi: ${REMOTE_TARGET}"; exit 2 ;;
    *@*) ;;
    *) error "SSH hedefi user@host biçiminde olmalıdır."; exit 2 ;;
  esac
  case "${REMOTE_PORT}" in
    ""|*[!0-9]*|0|0*) error "SSH portu 1-65535 arasında, başında sıfır olmayan bir sayı olmalıdır."; exit 2 ;;
  esac
  if [ "${REMOTE_PORT}" -gt 65535 ]; then
    error "SSH portu 1-65535 arasında olmalıdır."
    exit 2
  fi
}

remote_ssh() {
  ssh -p "${REMOTE_PORT}" -o BatchMode=yes -o ConnectTimeout=10 "${REMOTE_TARGET}" "$@"
}

require_local_target() {
  if [ -z "${DATABASE_URL:-}" ]; then
    error "DATABASE_URL tanımlı değil. Önce: source .env"
    exit 1
  fi
  if ! command -v psql >/dev/null 2>&1; then
    error "psql bulunamadı. PostgreSQL istemcisini kurun."
    exit 1
  fi
  if ! psql "${DATABASE_URL}" -tAc 'SELECT 1' >/dev/null 2>&1; then
    error "Local veritabanına bağlanılamadı. Önce: db/install.sh local"
    exit 1
  fi
}

require_remote_source() {
  log "Uzak sunucu doğrulanıyor: ${REMOTE_TARGET}:${REMOTE_PORT}"
  remote_ssh 'command -v podman >/dev/null 2>&1' || {
    error "Uzak sunucuda podman bulunamadı."
    exit 1
  }
  remote_ssh "podman container exists '${REMOTE_CONTAINER}'" || {
    error "Uzak sunucuda ${REMOTE_CONTAINER} container'ı yok."
    exit 1
  }
  remote_ssh "podman exec '${REMOTE_CONTAINER}' pg_dump --version >/dev/null 2>&1" || {
    error "Uzak container'da pg_dump çalıştırılamadı."
    exit 1
  }
}

confirm_overwrite() {
  [ "${ASSUME_YES}" -eq 1 ] && return 0
  local target
  target="$(psql "${DATABASE_URL}" -tAc 'SELECT current_database()' 2>/dev/null || echo '?')"
  printf 'Local "%s" veritabanının içeriği silinip uzak kopyayla değiştirilecek.\n' "${target}"
  printf 'Devam edilsin mi? [e/H] '
  local answer
  read -r answer || answer=""
  case "${answer}" in
    e|E|y|Y) return 0 ;;
    *) log "Vazgeçildi."; exit 0 ;;
  esac
}

run_sync() {
  local exclude_args=""
  for table in ${EXCLUDED_TABLES}; do
    exclude_args="${exclude_args} --exclude-table-data=public.${table}"
  done

  log "Dump alınıp local'e aktarılıyor (app_session içeriği hariç)."
  # Akış halinde aktarılır: ara dosya bırakılmaz. --clean --if-exists mevcut
  # şemayı düşürür, böylece uzakta silinmiş nesneler local'de kalmaz.
  #
  # sed, dump'ın başına ve sonuna konan \restrict / \unrestrict meta
  # komutlarını atar: uzak pg_dump ile local psql aynı sürüm ailesinden değil
  # (16.15 / 17.2) ve psql bunları "invalid command" diye reddediyor. Kalıp
  # satır başına sabitli, veri satırlarına dokunmaz.
  #
  # ON_ERROR_STOP=on bilinçli: hata yutulursa eksik restore "başarılı" görünür
  # ve bozuk veriyle çalışmaya devam edilir.
  set -o pipefail
  remote_ssh "podman exec '${REMOTE_CONTAINER}' pg_dump -U '${REMOTE_DB_USER}' -d '${REMOTE_DB}' \
      --clean --if-exists --no-owner --no-privileges ${exclude_args} | gzip -c" \
    | gzip -dc \
    | sed -e '/^\\restrict /d' -e '/^\\unrestrict /d' \
    | psql "${DATABASE_URL}" --quiet --set ON_ERROR_STOP=on >/dev/null || {
      error "Restore başarısız; local veritabanı yarım kalmış olabilir."
      exit 1
    }

  # Restore sonrası planlayıcı istatistikleri boştur; ANALYZE hem sorguları
  # hızlandırır hem de aşağıdaki satır sayılarını gerçek değerlere getirir.
  psql "${DATABASE_URL}" --quiet -c 'ANALYZE' >/dev/null
}

run_migrations() {
  # Uzak şema local'den geride olabilir; düz restore local'deki yeni view'ları
  # düşürür. 2026-09-02'de remote schema_migrations 22, local 23 idi.
  log "Migration'lar uygulanıyor."
  if ! (cd "${PROJECT_ROOT}" && pnpm db:migrate >/dev/null 2>&1); then
    error "Migration çalıştırılamadı; local şema uzak kopyada kalmış olabilir."
    error "Elle çalıştırın: pnpm db:migrate"
    exit 1
  fi
}

report() {
  log "Sonuç:"
  psql "${DATABASE_URL}" -tA -F ' ' -c "
    SELECT '  ' || relname || ': ' || n_live_tup
    FROM pg_stat_user_tables WHERE n_live_tup > 0 ORDER BY relname" 2>/dev/null || true
  psql "${DATABASE_URL}" -tAc "
    SELECT '  analytics.portfolio_daily: ' ||
           CASE WHEN to_regclass('analytics.portfolio_daily') IS NULL
                THEN 'YOK' ELSE 'var' END" 2>/dev/null || true
}

case "${1:-}" in
  from-remote) shift; parse_args "$@" ;;
  --help|-h|"") usage; exit 0 ;;
  *) error "Bilinmeyen komut: $1"; usage; exit 2 ;;
esac

require_local_target
require_remote_source
confirm_overwrite
run_sync
run_migrations
report
log "Bitti: ${REMOTE_TARGET} → local"
