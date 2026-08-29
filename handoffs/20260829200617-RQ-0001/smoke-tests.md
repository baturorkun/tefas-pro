# RQ-0001 Smoke Test Record

Date: 2026-08-29

## Local macOS — Passed

Environment:

- macOS `/bin/bash` 3.2.57
- Podman with the `podman-compose` provider
- Local-only overrides in ignored `db/.env`: PostgreSQL `5434`, pgweb `8082`
  because legacy project containers already occupy the repository defaults
  `5433` and `8081`

Commands and observed results:

```text
/bin/bash -n db/install.sh
pnpm test
pnpm typecheck
pnpm build
./db/install.sh local
./db/install.sh local
podman exec tefas-pro-postgres psql -U tefas -d tefas -tAc 'SELECT 1'
curl --max-time 8 http://127.0.0.1:8082/
```

- Repeated installer executions completed, including a recreation after adding
  SELinux relabelled (`ro,Z`) secret mounts and container-UID ownership (`U`)
  for pgweb's protected passfile.
- PostgreSQL reported healthy and `SELECT 1` returned `1`.
- pgweb returned HTTP 200.
- Published ports were `127.0.0.1:5434->5432` and
  `127.0.0.1:8082->8081`.
- Container inspection confirmed the password is absent from pgweb argv and
  both services' environment. pgweb uses `/run/secrets/pgweb-pgpass`, while
  PostgreSQL uses `/run/secrets/postgres-password`.
- The legacy project's containers and volume were not modified.

## Automated Remote Boundary Tests — Passed

`pnpm test` exercises the real installer with controlled SSH, SCP, Podman,
Compose, curl, and systemd boundaries. It covers:

- rootless `$HOME/.local/share/tefas-pro/db` installation;
- root `/opt/tefas-pro/db` installation;
- `--no-service` startup;
- system and user systemd unit enable/active verification;
- `podman-compose` fallback;
- weak, low-entropy, and non-canonical password and identifier rejection;
- option-like SSH target, SSH port, and service host-port range rejection;
- rendered Compose images, loopback ports, persistence, healthcheck,
  read-only pgweb, and secret-file configuration.

## Remote Linux (`netforgesh`) — Passed

Environment:

- Ubuntu Linux kernel `6.8.0-137-generic`, x86_64
- Rootful Podman with the `podman compose` provider
- Install directory `/opt/tefas-pro/db`
- PostgreSQL `127.0.0.1:5433`, pgweb `127.0.0.1:8081`

The user approved a clean replacement. The prior `tefas-postgres`,
`tefas-pgweb`, and dependent legacy collector container, the
`tefas_tefas_pgdata` volume, `tefas_default` network, and prior install
directory were removed. Unrelated Podman resources were left untouched.

Commands and observed results:

```text
./db/install.sh remote root@netforgesh
./db/install.sh remote root@netforgesh
systemctl is-enabled tefas-pro-db.service
systemctl is-active tefas-pro-db.service
podman exec tefas-pro-postgres psql -U tefas -d tefas -tAc 'SELECT 1'
curl --max-time 8 http://127.0.0.1:8081/
```

- Both installer executions completed successfully, demonstrating idempotent
  deployment without duplicate containers.
- systemd reported `enabled` and `active`.
- PostgreSQL reported healthy and `SELECT 1` returned `1`.
- pgweb returned HTTP 200.
- Exactly two project containers were present, with loopback-only published
  ports, and the only matching volume was `tefas-pro-db_tefas_pgdata`.
- `.env`, `.secrets/postgres-password`, and `.secrets/pgpass` were all mode
  `0600`; the dedicated `.secrets` directory was root-owned mode `0700`.
- Rootful Podman mapped `.secrets/pgpass` to host UID 1000 as expected, while a
  direct `setpriv --reuid=1000` read check failed because the protected parent
  directory is not traversable. Legacy root-level secret files were absent.
- Container inspection confirmed the password was absent from argv and both
  services' environment; password-file references were present instead.
- The first live attempt exposed that a mode-0600 root-owned bind mount is not
  readable by pgweb's non-root Linux user. Adding Podman's `U` ownership option
  fixed the root cause. Because `U` can map the host file to a subordinate UID
  on rootless hosts, the installer now uploads a user-owned
  `.secrets/pgpass.next`, applies mode `0600`, and atomically renames it over
  the live `.secrets/pgpass`.
  Controlled rootless tests enforce copy-before-replace ordering, and dangerous
  system-root install directories are rejected. The final live deployments and
  checks passed.
