#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

# Geliştirme kısayolları: uzun compose komutu ezberlenmesin diye eklendi.
for s in '"dev"' '"dev:logs"' '"dev:stop"' '"dev:rebuild"' '"serve:watch"'; do
  grep -Fq "${s}:" "${PROJECT_ROOT}/package.json" || fail "package.json must expose ${s} script"
done
printf 'PASS: geliştirme ortamı pnpm kısayollarıyla yönetiliyor\n'

help_output="$("${PROJECT_ROOT}/db/install.sh" --help)"
[[ "${help_output}" == *"db/install.sh local"* ]] || fail "help must document local mode"
[[ "${help_output}" == *"db/install.sh remote <user@host>"* ]] || fail "help must document remote mode"

printf 'PASS: install help documents local and remote modes\n'

if command -v podman-compose >/dev/null 2>&1; then
  compose_output="$(podman-compose --env-file "${PROJECT_ROOT}/db/.env.example" -f "${PROJECT_ROOT}/db/compose.yaml" config)"
  [[ "${compose_output}" == *"docker.io/library/postgres:16"* ]] || fail "Compose must use PostgreSQL 16"
  [[ "${compose_output}" == *"docker.io/sosedoff/pgweb:0.17.0"* ]] || fail "Compose must pin pgweb 0.17.0"
  [[ "${compose_output}" == *"127.0.0.1:5433:5432"* ]] || fail "PostgreSQL must bind to loopback"
  [[ "${compose_output}" == *"127.0.0.1:8081:8081"* ]] || fail "pgweb must bind to loopback"
  [[ "${compose_output}" == *"--readonly"* ]] || fail "pgweb must be read-only"
  [[ "${compose_output}" == *"pg_isready"* ]] || fail "PostgreSQL healthcheck must use pg_isready"
  [[ "${compose_output}" == *"/var/lib/postgresql/data"* ]] || fail "PostgreSQL must use persistent storage"
  [[ "${compose_output}" == *"--passfile=/run/secrets/pgweb-pgpass"* ]] || fail "pgweb must read its password from a protected file"
  [[ "${compose_output}" != *"local-development-only"* ]] || fail "rendered Compose config must not expose the password in argv"
  grep -Fq './.secrets/postgres-password:/run/secrets/postgres-password:ro,Z' "${PROJECT_ROOT}/db/compose.yaml" || fail "PostgreSQL secret mount must come from the protected secret directory"
  grep -Fq './.secrets/pgpass:/run/secrets/pgweb-pgpass:ro,Z,U' "${PROJECT_ROOT}/db/compose.yaml" || fail "pgweb secret mount must come from the protected secret directory with SELinux and UID options"
  # Geliştirme servisi: kod değişikliğinin container'a yansıması bu üç ayara
  # bağlı; biri bozulursa servis çalışır görünür ama yenilenmez.
  [[ "${compose_output}" == *"CHOKIDAR_USEPOLLING"* ]] || fail "dev service must poll for file changes"
  [[ "${compose_output}" != *"node_modules:/app/node_modules"* ]] || fail "dev service must not mount host node_modules"
  [[ "${compose_output}" == *"/run/secrets/postgres-password"* ]] || fail "dev service must read its password from a protected file"

printf 'PASS: rendered Compose config enforces images, isolation, persistence, and secret handling\n'
fi

test_root="$(mktemp -d)"
trap 'rm -rf "${test_root}"' EXIT
mkdir -p "${test_root}/db" "${test_root}/bin"
cp "${PROJECT_ROOT}/db/install.sh" "${test_root}/db/install.sh"

cat > "${test_root}/db/.env.example" <<'ENV'
COMPOSE_PROJECT_NAME=tefas
TEFAS_POSTGRES_DB=tefas
TEFAS_POSTGRES_USER=tefas
TEFAS_POSTGRES_PASSWORD=local-development-only
TEFAS_POSTGRES_PORT=5433
TEFAS_PGWEB_PORT=8081
ENV

cat > "${test_root}/db/compose.yaml" <<'YAML'
services: {}
YAML

cat > "${test_root}/bin/podman" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
printf 'podman %s\n' "$*" >> "${MOCK_LOG}"
case "$*" in
  "compose version") exit 0 ;;
  *" config") exit 0 ;;
  *" up -d") exit 0 ;;
  "exec tefas-pro-postgres pg_isready"*) exit 0 ;;
  "exec tefas-pro-postgres psql"*) printf 'PostgreSQL 16 test\n'; exit 0 ;;
  "ps "*) exit 0 ;;
esac
exit 1
MOCK

cat > "${test_root}/bin/sleep" <<'MOCK'
#!/usr/bin/env bash
exit 0
MOCK

cat > "${test_root}/bin/curl" <<'MOCK'
#!/usr/bin/env bash
printf '200'
MOCK
chmod +x "${test_root}/db/install.sh" "${test_root}/bin/podman" "${test_root}/bin/curl" "${test_root}/bin/sleep"

mkdir -p "${test_root}/symlink-target"
ln -s "${test_root}/symlink-target" "${test_root}/db/.secrets"
set +e
symlink_secret_output="$(PATH="${test_root}/bin:/usr/bin:/bin" MOCK_LOG="${test_root}/calls.log" "${test_root}/db/install.sh" local 2>&1)"
symlink_secret_status=$?
set -e
[[ "${symlink_secret_status}" -ne 0 ]] || fail "local mode must reject a symlinked secret directory"
[[ "${symlink_secret_output}" == *"sembolik bağ"* ]] || fail "local symlink rejection must be explicit"
rm "${test_root}/db/.secrets"

printf 'PASS: local mode rejects a symlinked secret directory\n'

local_output="$(PATH="${test_root}/bin:/usr/bin:/bin" MOCK_LOG="${test_root}/calls.log" "${test_root}/db/install.sh" local)"
[[ -f "${test_root}/db/.env" ]] || fail "local mode must create db/.env"
cmp --silent "${test_root}/db/.env" "${test_root}/db/.env.example" || fail "local mode must seed db/.env from the example"
[[ -d "${test_root}/db/.secrets" ]] || fail "local mode must create a protected secret directory"
# GNU stat once denenir: BSD'nin -f'i macOS'ta dosya modunu verir ama Linux'ta
# "filesystem" anlamina gelir ve HATA VERMEDEN baska bir sey dondurur, bu yuzden
# || yedegi hic devreye girmez. GNU'nun -c'si ise macOS'ta gecersiz secenek olup
# duzgunce basarisiz olur.
secrets_mode="$(stat -c '%a' "${test_root}/db/.secrets" 2>/dev/null || stat -f '%Lp' "${test_root}/db/.secrets")"
[[ "${secrets_mode}" == "700" ]] || fail "secret directory must use mode 0700"
[[ -f "${test_root}/db/.secrets/pgpass" ]] || fail "local mode must create a pgweb password file"
pgpass_mode="$(stat -c '%a' "${test_root}/db/.secrets/pgpass" 2>/dev/null || stat -f '%Lp' "${test_root}/db/.secrets/pgpass")"
[[ "${pgpass_mode}" == "600" ]] || fail "pgweb password file must use mode 0600"
[[ -f "${test_root}/db/.secrets/postgres-password" ]] || fail "local mode must create a PostgreSQL password file"
postgres_password_mode="$(stat -c '%a' "${test_root}/db/.secrets/postgres-password" 2>/dev/null || stat -f '%Lp' "${test_root}/db/.secrets/postgres-password")"
[[ "${postgres_password_mode}" == "600" ]] || fail "PostgreSQL password file must use mode 0600"
[[ "${local_output}" == *"PostgreSQL hazır"* ]] || fail "local mode must report PostgreSQL readiness"
[[ "${local_output}" == *"pgweb hazır"* ]] || fail "local mode must report pgweb readiness"
[[ "${local_output}" != *"local-development-only"* ]] || fail "local mode must not print the password"

printf 'PASS: local mode creates environment and verifies services\n'

cat > "${test_root}/bin/podman" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
printf 'podman %s\n' "$*" >> "${MOCK_LOG}"
case "$*" in
  "compose version") exit 1 ;;
  "exec tefas-pro-postgres pg_isready"*) exit 0 ;;
  "exec tefas-pro-postgres psql"*) printf 'PostgreSQL 16 test\n'; exit 0 ;;
esac
exit 1
MOCK

cat > "${test_root}/bin/podman-compose" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
printf 'podman-compose %s\n' "$*" >> "${MOCK_LOG}"
exit 0
MOCK
chmod +x "${test_root}/bin/podman" "${test_root}/bin/podman-compose"

: > "${test_root}/calls.log"
fallback_output="$(PATH="${test_root}/bin:/usr/bin:/bin" MOCK_LOG="${test_root}/calls.log" "${test_root}/db/install.sh" local)"
[[ "${fallback_output}" == *"PostgreSQL hazır"* ]] || fail "podman-compose fallback must complete local verification"
grep -q '^podman-compose .*config' "${test_root}/calls.log" || fail "local mode must use podman-compose when podman compose is unavailable"

printf 'PASS: local mode supports podman-compose fallback\n'

set +e
option_target_output="$(PATH="${test_root}/bin:/usr/bin:/bin" MOCK_LOG="${test_root}/calls.log" "${test_root}/db/install.sh" remote -v 2>&1)"
option_target_status=$?
set -e
[[ "${option_target_status}" -ne 0 ]] || fail "remote mode must reject option-like SSH targets"
[[ "${option_target_output}" == *"SSH hedefi"* ]] || fail "option-like SSH target rejection must be explicit"

printf 'PASS: remote mode rejects option-like SSH targets\n'

set +e
weak_remote_output="$(PATH="${test_root}/bin:/usr/bin:/bin" MOCK_LOG="${test_root}/calls.log" "${test_root}/db/install.sh" remote deploy@example.test 2>&1)"
weak_remote_status=$?
set -e
[[ "${weak_remote_status}" -ne 0 ]] || fail "remote mode must reject the development password"
[[ "${weak_remote_output}" == *"zayıf"* ]] || fail "remote rejection must explain that the password is weak"

printf 'PASS: remote mode rejects the development password\n'

cat > "${test_root}/db/.env" <<'ENV'
COMPOSE_PROJECT_NAME=tefas
TEFAS_POSTGRES_DB=tefas
TEFAS_POSTGRES_USER=tefas
TEFAS_POSTGRES_PASSWORD="local-development-only"
TEFAS_POSTGRES_PORT=5433
TEFAS_PGWEB_PORT=8081
ENV

set +e
quoted_weak_output="$(PATH="${test_root}/bin:/usr/bin:/bin" MOCK_LOG="${test_root}/calls.log" "${test_root}/db/install.sh" remote deploy@example.test 2>&1)"
quoted_weak_status=$?
set -e
[[ "${quoted_weak_status}" -ne 0 ]] || fail "remote mode must reject quoted weak passwords"
[[ "${quoted_weak_output}" == *"parola"* ]] || fail "quoted weak password rejection must be explicit"

printf 'PASS: remote mode rejects quoted or non-canonical passwords\n'

for low_entropy_password in aaaaaaaaaaaaaaaa 1234567890123456 ----------------; do
  cat > "${test_root}/db/.env" <<ENV
COMPOSE_PROJECT_NAME=tefas
TEFAS_POSTGRES_DB=tefas
TEFAS_POSTGRES_USER=tefas
TEFAS_POSTGRES_PASSWORD=${low_entropy_password}
TEFAS_POSTGRES_PORT=5433
TEFAS_PGWEB_PORT=8081
ENV

  set +e
  low_entropy_output="$(PATH="${test_root}/bin:/usr/bin:/bin" MOCK_LOG="${test_root}/calls.log" "${test_root}/db/install.sh" remote deploy@example.test 2>&1)"
  low_entropy_status=$?
  set -e
  [[ "${low_entropy_status}" -ne 0 ]] || fail "remote mode must reject low-entropy password: ${low_entropy_password}"
  [[ "${low_entropy_output}" == *"zayıf"* ]] || fail "low-entropy password rejection must be explicit"
done

printf 'PASS: remote mode rejects low-entropy passwords\n'

cat > "${test_root}/db/.env" <<'ENV'
COMPOSE_PROJECT_NAME=tefas
TEFAS_POSTGRES_DB=tefas
TEFAS_POSTGRES_USER=tefas;touch-injected
TEFAS_POSTGRES_PASSWORD=Strong-Remote-Password-2026
TEFAS_POSTGRES_PORT=5433
TEFAS_PGWEB_PORT=8081
ENV

set +e
unsafe_remote_output="$(PATH="${test_root}/bin:/usr/bin:/bin" MOCK_LOG="${test_root}/calls.log" "${test_root}/db/install.sh" remote deploy@example.test 2>&1)"
unsafe_remote_status=$?
set -e
[[ "${unsafe_remote_status}" -ne 0 ]] || fail "remote mode must reject unsafe database identifiers"
[[ "${unsafe_remote_output}" == *"Geçersiz"* ]] || fail "unsafe identifier rejection must be explicit"

printf 'PASS: remote mode rejects unsafe database identifiers\n'

cat > "${test_root}/db/.env" <<'ENV'
COMPOSE_PROJECT_NAME=tefas
TEFAS_POSTGRES_DB=tefas
TEFAS_POSTGRES_USER=tefas
TEFAS_POSTGRES_PASSWORD=Strong-Remote-Password-2026
TEFAS_POSTGRES_PORT=5433
TEFAS_PGWEB_PORT=8081
ENV

cat > "${test_root}/bin/ssh" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
printf 'ssh %s\n' "$*" >> "${MOCK_LOG}"
case "$*" in
  *"if podman compose version"*) printf 'podman compose\n' ;;
  *"id -u"*) printf '1000\n' ;;
  *'$HOME'*) printf '/home/deploy\n' ;;
  *"psql -U"*) printf 'PostgreSQL 16 remote test\n' ;;
  *"curl -s -o /dev/null"*) printf '200' ;;
esac
exit 0
MOCK

cat > "${test_root}/bin/scp" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
printf 'scp %s\n' "$*" >> "${MOCK_LOG}"
exit 0
MOCK
chmod +x "${test_root}/bin/ssh" "${test_root}/bin/scp"

cat > "${test_root}/db/.env" <<'ENV'
COMPOSE_PROJECT_NAME=tefas
TEFAS_POSTGRES_DB=tefas
TEFAS_POSTGRES_USER=tefas
TEFAS_POSTGRES_PASSWORD=Strong-Remote-Password-2026
TEFAS_POSTGRES_PORT=70000
TEFAS_PGWEB_PORT=0
ENV

set +e
invalid_host_port_output="$(PATH="${test_root}/bin:/usr/bin:/bin" MOCK_LOG="${test_root}/calls.log" "${test_root}/db/install.sh" remote deploy@example.test --no-service 2>&1)"
invalid_host_port_status=$?
set -e
[[ "${invalid_host_port_status}" -ne 0 ]] || fail "remote mode must reject out-of-range service host ports"
[[ "${invalid_host_port_output}" == *"host portu"* ]] || fail "out-of-range service port rejection must be explicit"

printf 'PASS: remote mode validates service host port ranges\n'

cat > "${test_root}/db/.env" <<'ENV'
COMPOSE_PROJECT_NAME=tefas
TEFAS_POSTGRES_DB=tefas
TEFAS_POSTGRES_USER=tefas
TEFAS_POSTGRES_PASSWORD=Strong-Remote-Password-2026
TEFAS_POSTGRES_PORT=5433
TEFAS_PGWEB_PORT=8081
ENV

set +e
invalid_port_output="$(PATH="${test_root}/bin:/usr/bin:/bin" MOCK_LOG="${test_root}/calls.log" "${test_root}/db/install.sh" remote deploy@example.test -p 70000 --no-service 2>&1)"
invalid_port_status=$?
set -e
[[ "${invalid_port_status}" -ne 0 ]] || fail "remote mode must reject out-of-range SSH ports"
[[ "${invalid_port_output}" == *"SSH portu"* ]] || fail "out-of-range SSH port rejection must be explicit"

printf 'PASS: remote mode validates SSH port range\n'

set +e
unsafe_dir_output="$(PATH="${test_root}/bin:/usr/bin:/bin" MOCK_LOG="${test_root}/calls.log" "${test_root}/db/install.sh" remote deploy@example.test -d / --no-service 2>&1)"
unsafe_dir_status=$?
set -e
[[ "${unsafe_dir_status}" -ne 0 ]] || fail "remote mode must reject dangerous system directories"
[[ "${unsafe_dir_output}" == *"Uzak dizin"* ]] || fail "dangerous remote directory rejection must be explicit"

printf 'PASS: remote mode rejects dangerous system directories\n'

: > "${test_root}/calls.log"
remote_output="$(PATH="${test_root}/bin:/usr/bin:/bin" MOCK_LOG="${test_root}/calls.log" "${test_root}/db/install.sh" remote deploy@example.test -p 2222 -d /srv/tefas/db --no-service)"
[[ "${remote_output}" == *"ssh -p 2222 -L 8081:127.0.0.1:8081 deploy@example.test"* ]] || fail "remote mode must report the pgweb SSH tunnel"
[[ "${remote_output}" != *"Strong-Remote-Password-2026"* ]] || fail "remote mode must not print the password"
grep -q "scp .*compose.yaml.*deploy@example.test:/srv/tefas/db/compose.yaml" "${test_root}/calls.log" || fail "remote mode must copy compose.yaml"
grep -q "ssh .*podman compose.*up -d" "${test_root}/calls.log" || fail "--no-service must start Compose directly"

printf 'PASS: remote no-service mode copies, starts, verifies, and reports tunnel\n'

cat > "${test_root}/bin/ssh" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
printf 'ssh %s\n' "$*" >> "${MOCK_LOG}"
case "$*" in
  *"if podman compose version"*) printf 'podman compose\n' ;;
  *"command -v podman >/dev/null"*) ;;
  *"command -v podman"*) printf '/usr/bin/podman\n' ;;
  *"id -u"*) printf '1000\n' ;;
  *'$HOME'*) printf '/home/deploy\n' ;;
  *"psql -U"*) printf 'PostgreSQL 16 remote test\n' ;;
  *"curl -s -o /dev/null"*) printf '200' ;;
  *"systemctl --user is-enabled"*) printf 'enabled\n' ;;
  *"systemctl --user is-active"*) printf 'active\n' ;;
esac
exit 0
MOCK
chmod +x "${test_root}/bin/ssh"

: > "${test_root}/calls.log"
systemd_output="$(PATH="${test_root}/bin:/usr/bin:/bin" MOCK_LOG="${test_root}/calls.log" "${test_root}/db/install.sh" remote deploy@example.test)"
grep -q "ssh .*mkdir -p.*\.local/share/tefas-pro/db" "${test_root}/calls.log" || fail "rootless install must default to a user-writable remote directory"
if grep -q "ssh .*mkdir -p.*/opt/tefas-pro/db" "${test_root}/calls.log"; then
  fail "rootless install must not default to /opt"
fi
if grep -q "ssh .*chmod 700.*\.local/share/tefas-pro/db'" "${test_root}/calls.log"; then
  fail "remote install must not change permissions of a caller-selected directory"
fi
grep -q "ssh .*\.secrets.*chmod 700.*\.secrets" "${test_root}/calls.log" || fail "remote install must protect its dedicated secret directory"
if grep -q "ssh .*rm -f.*\.secrets/pgpass'" "${test_root}/calls.log"; then
  fail "rootless reinstall must not delete the live pgpass before replacement"
fi
pgpass_copy_line="$(grep -n "scp .*pgpass.*deploy@example.test:.*\.secrets/pgpass.next" "${test_root}/calls.log" | head -n 1 | cut -d: -f1)"
pgpass_swap_line="$(grep -n "ssh .*mv -f.*\.secrets/pgpass.next.*\.secrets/pgpass" "${test_root}/calls.log" | head -n 1 | cut -d: -f1)"
[[ -n "${pgpass_copy_line}" && -n "${pgpass_swap_line}" ]] || fail "rootless reinstall must stage and atomically replace the UID-shifted pgpass file"
[[ "${pgpass_copy_line}" -lt "${pgpass_swap_line}" ]] || fail "rootless reinstall must copy pgpass before atomic replacement"
grep -q "ssh .*loginctl enable-linger" "${test_root}/calls.log" || fail "rootless install must request lingering"
grep -q "ssh .*systemctl --user daemon-reload" "${test_root}/calls.log" || fail "rootless install must reload the user systemd manager"
grep -q "ssh .*systemctl --user enable tefas-pro-db.service" "${test_root}/calls.log" || fail "rootless install must enable the project-specific service"
[[ "${systemd_output}" == *"systemd hazır: enabled active"* ]] || fail "remote mode must verify systemd state"

printf 'PASS: remote mode installs and verifies a rootless systemd service\n'

cat > "${test_root}/bin/ssh" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
printf 'ssh %s\n' "$*" >> "${MOCK_LOG}"
case "$*" in
  *"if podman compose version"*) printf 'podman compose\n' ;;
  *"command -v podman >/dev/null"*) ;;
  *"command -v podman"*) printf '/usr/bin/podman\n' ;;
  *"id -u"*) printf '1000\n' ;;
  *'$HOME'*) printf '/home/deploy\n' ;;
  *"psql -U"*) printf 'PostgreSQL 16 remote test\n' ;;
  *"curl -s -o /dev/null"*) printf '200' ;;
  *"systemctl --user is-enabled"*) printf 'disabled\n' ;;
  *"systemctl --user is-active"*) printf 'active\n' ;;
esac
exit 0
MOCK
chmod +x "${test_root}/bin/ssh"

set +e
disabled_service_output="$(PATH="${test_root}/bin:/usr/bin:/bin" MOCK_LOG="${test_root}/calls.log" "${test_root}/db/install.sh" remote deploy@example.test 2>&1)"
disabled_service_status=$?
set -e
[[ "${disabled_service_status}" -ne 0 ]] || fail "remote mode must reject a disabled systemd service"
[[ "${disabled_service_output}" == *"systemd"* ]] || fail "systemd verification failure must be explicit"

printf 'PASS: remote mode rejects an unexpected systemd state\n'

cat > "${test_root}/bin/ssh" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
printf 'ssh %s\n' "$*" >> "${MOCK_LOG}"
case "$*" in
  *"if podman compose version"*) printf 'podman compose\n' ;;
  *"command -v podman >/dev/null"*) ;;
  *"command -v podman"*) printf '/usr/bin/podman\n' ;;
  *"id -u"*) printf '0\n' ;;
  *"psql -U"*) printf 'PostgreSQL 16 remote test\n' ;;
  *"curl -s -o /dev/null"*) printf '200' ;;
  *"systemctl is-enabled"*) printf 'enabled\n' ;;
  *"systemctl is-active"*) printf 'active\n' ;;
esac
exit 0
MOCK
chmod +x "${test_root}/bin/ssh"

: > "${test_root}/calls.log"
root_output="$(PATH="${test_root}/bin:/usr/bin:/bin" MOCK_LOG="${test_root}/calls.log" "${test_root}/db/install.sh" remote root@example.test)"
grep -q "ssh .*systemctl daemon-reload" "${test_root}/calls.log" || fail "root install must reload the system systemd manager"
grep -q "ssh .*systemctl enable tefas-pro-db.service" "${test_root}/calls.log" || fail "root install must enable the project-specific system service"
if grep -q "loginctl enable-linger" "${test_root}/calls.log"; then
  fail "root install must not configure user lingering"
fi
[[ "${root_output}" == *"systemd hazır: enabled active"* ]] || fail "root remote mode must verify systemd state"

printf 'PASS: remote mode installs and verifies a root systemd service\n'
