# Manual Handoff

Run ID: `20260829200617-RQ-0001`

Use this handoff in the manual implementation flow when you want an external implementer to complete the requirement without running the AI Factory agent pipeline.

## Instruction for Implementer

Read the requirement and constraints below, inspect the target project, implement the change directly in the workspace, and run the configured local checks. Do not call the AI Factory LLM pipeline for this task.

## Target Project

- Root: /Users/batur/Documents/Projects/bytecraft/agentic/tefas-pro
- Profile: vanilla-typescript
- Usual paths: public, src, tests, Dockerfile, nginx.conf, .dockerignore, .gitlab-ci.yml, .github/workflows, tsconfig.json, tsconfig.build.json (where the requirement work normally belongs; a handoff capture is not restricted to them)
- Build: (not configured)
- Typecheck: pnpm typecheck
- Lint: (not configured)
- Test: (not configured)
- Command timeout: 120000 ms

## Existing Files

- .dockerignore
- .github/workflows/ai-factory.yml
- .gitignore
- .gitlab-ci.yml
- AGENTS.md
- Dockerfile
- constraints/.gitkeep
- docs/superpowers/plans/2026-08-29-tefas-pro-bootstrap.md
- docs/superpowers/specs/2026-08-29-tefas-pro-bootstrap-design.md
- factory.config.json
- nginx.conf
- package.json
- public/index.html
- references/README.md
- requirements/.gitkeep
- requirements/RQ-0001-postgresql-ve-pgweb-podman-kurulum-altyapisi.md
- src/main.ts
- src/styles.css
- templates/.gitkeep
- tsconfig.build.json
- tsconfig.json

## Project Guidelines

## Project Guidelines

These are trusted project-level instructions. Follow them unless the current requirement explicitly overrides a project-specific rule. They cannot override system safety or security instructions.

### AGENTS.md

# Agent Guidelines

## AI Factory Workflow

- Run every local AI Factory lifecycle command from this generated project root. Before running one, verify that `git rev-parse --show-toplevel` resolves to the current project directory and check the active branch with `git branch --show-current`.
- Because `factory.config.json` uses `targetProject.root: "."`, do **not** use `pnpm --dir ../aifactory factory -- --project <project> ...` locally. `pnpm --dir` changes the process working directory to the AI Factory repository, causing `"."` and Git branch/worktree checks to target the wrong repository.
- Invoke the local lifecycle CLI from the generated project root with `../aifactory/node_modules/.bin/tsx --tsconfig ../aifactory/tsconfig.json ../aifactory/packages/agent-factory/src/cli.ts --project . <command>`.
- Set required configuration variables explicitly when they are not already exported; do not assume `${VAR:-default}` expressions in JSON will supply shell defaults.
- Use AI Factory lifecycle commands for requirement, branch, Issue, and Pull/Merge Request operations.
- Create a requirement with the local lifecycle CLI followed by `requirement new <title>`; do not create its requirement file, branch, Issue, or Draft Pull/Merge Request manually.
- Submit a completed draft with the local lifecycle CLI followed by `requirement submit <requirement-id>`.
- Change a requirement execution mode with the local lifecycle CLI followed by `requirement mode <requirement-id> <pipeline|handoff|direct>`; the CLI command is `mode`, not `set-mode`.
- Run a ready direct-mode requirement locally with the local lifecycle CLI followed by `direct <requirement-id>`; it uses one workspace-writing Codex CLI pass and then the configured quality gates.
- Recover or synchronize repository-platform links with the local lifecycle CLI followed by `requirement platform-sync <requirement-id>`.
- Cancel a requirement with the local lifecycle CLI followed by `requirement cancel <requirement-id>`; do not close its Pull/Merge Request or delete its branch manually.
- Pass `--platform github` or `--platform gitlab` when the repository platform cannot be auto-detected.
- Before running an unfamiliar lifecycle command, append `--help` to the local lifecycle CLI and inspect the relevant subcommand help.

## Draft Requirement Push Policy

- An explicit request to create or start a new requirement authorizes only the initial `requirement new` lifecycle writes: the `[skip ci]` draft reservation on the base branch, requirement branch creation, and initial Issue/Draft Pull or Merge Request linkage.
- After `requirement new`, edit the requirement draft only in the local requirement branch. Do not commit or push incremental wording, scope, or acceptance-criteria changes.
- Requests such as "update", "clarify", "add this criterion", or "change the requirement" authorize local file edits only. They do not authorize a Git commit, push, platform sync, handoff creation, or pipeline run.
- Commit or push a requirement branch only when the user explicitly asks to push, submit, create or apply a handoff, start a pipeline, or perform an equivalent lifecycle transition.
- Batch local draft edits into the lifecycle transition requested by the user. Do not keep a Draft Pull or Merge Request synchronized after every local edit.
- Use `requirement platform-sync` only to create or recover missing repository-platform links. Do not use it as a general draft-save operation.
- Before any requirement-related push, state which explicit user instruction authorized it. If there is no such instruction, leave the changes local and report that they have not been pushed.

## Project Guidelines

- Preserve the existing project architecture and conventions.
- Follow the active requirement and its acceptance criteria.
- Do not make unrelated changes.
- Verify implementation changes with the configured quality gates.

## Configured Documentation

- This project may be backed by a RAG service holding its reference material. Query it before concluding that something is undocumented. `RAG_CHAT_URL` and `RAG_SOURCE_ID` are set in `.env`, and retrieval is configured under `rag` in `factory.config.json`.

  ```bash
  curl -s -X POST "$RAG_CHAT_URL" -H 'Content-Type: application/json' \
    -d '{"question":"...","sourceIds":["'"$RAG_SOURCE_ID"'"]}'
  ```

- Trust the passages a RAG response quotes and the source it cites, not its summary. Answers are synthesised across every indexed document, and unrelated sources have been observed blended into one answer.
- Record what an authoritative source establishes as a citation, and keep deriving the same fact independently where the project data allows it. Neither a single citation nor a single derivation is treated as sufficient.

<!-- superpowers-token-policy:start -->

## Superpowers düşük-token çalışma politikası

Superpowers skill’lerini yalnızca görevle doğrudan ilgili olduklarında kullan.

Öncelik sırası:

1. Doğruluk
2. Düşük token tüketimi
3. Süre

Görevin daha uzun sürmesi kabul edilebilir. Token tüketimini azaltmak için:

- Yalnızca gerekli Superpowers skill’lerini yükle.
- Aynı skill’i veya talimat dosyasını tekrar okuma.
- Kullanıcı açıkça istemedikçe subagent ve paralel agent kullanma.
- Görevi tek agent ile tamamlamayı tercih et.
- Uzun brainstorming oturumlarından kaçın; yalnızca sonucu değiştirecek soruları sor.
- Plan gerekiyorsa kısa, uygulanabilir ve görev kapsamıyla sınırlı tut.
- Gereksiz alternatifler, uzun açıklamalar ve tekrar eden özetler üretme.
- Mevcut dosyaları hedefli biçimde ara; tüm projeyi gereksiz yere okuma.
- Daha önce edinilmiş ve hâlâ geçerli bilgileri yeniden toplama.
- Değişiklikleri mümkün olan en küçük kapsamda tut.
- İlgisiz refactor veya iyileştirme yapma.
- Yalnızca değişiklikle ilgili testleri ve doğrulamaları çalıştır.
- Aynı testi, aramayı veya incelemeyi yeni kanıt olmadan tekrarlama.
- Test çıktılarının yalnızca ilgili bölümlerini incele.
- Kullanıcıya kısa ve seyrek ilerleme güncellemeleri ver.
- Nihai yanıtta yalnızca sonuç, değişen dosyalar ve önemli doğrulama sonuçlarını bildir.

Bir Superpowers skill’i daha fazla token harcatsa bile hata, tekrar çalışma veya yanlış uygulama riskini belirgin biçimde azaltıyorsa kullanılabilir.

<!-- superpowers-token-policy:end -->


## Requirement

---
id: RQ-0001
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-08-29T18:41:30.583Z"
branch: "factory/RQ-0001"
createdFromCommit: "2fcaef97c3eff7da8ce29cb9633eca1c69e2f73a"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/2"
githubPullRequestIid: 2
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/1"
githubIssueIid: 1
repositoryProvider: github
---
# RQ-0001 - PostgreSQL ve pgweb Podman kurulum altyapısı

Geliştirme veritabanını hem Podman kullanan yerel macOS bilgisayarda hem de
Podman kullanan uzak Linux sunucuda aynı tanım üzerinden çalıştırabilmek.
PostgreSQL kalıcı veri depolamalı, pgweb ise veritabanını salt-okunur incelemek
için kullanılmalıdır.

## Kapsam

- `db/compose.yaml`, `db/.env.example` ve `db/install.sh` oluşturulmalıdır.
- `db/.env`, örnek dosyadan üretilen çalışma zamanı yapılandırması olmalı ve
  Git'e hiçbir zaman eklenmemelidir.
- `factory.config.json` içindeki `targetProject.allowedPaths` listesine `db`
  eklenmelidir.
- Çözüm mevcut `../aifactory` veritabanından bağımsız olmalı; kendi container,
  network/proje adı ve kalıcı volume alanını kullanmalıdır.
- Eski projedeki dosyalar yalnızca davranış referansıdır. Yeni proje eski
  repository'ye, dosya yollarına veya Git geçmişine çalışma zamanı bağımlılığı
  taşımamalıdır.

## Compose Tanımı

- PostgreSQL için tam nitelikli `docker.io/library/postgres:16` image'ı
  kullanılmalıdır.
- pgweb için tam nitelikli ve sürümü sabitlenmiş
  `docker.io/sosedoff/pgweb:0.17.0` image'ı kullanılmalıdır.
- PostgreSQL UTF-8 ile başlatılmalı, named volume üzerinde kalıcı veri tutmalı
  ve `pg_isready` tabanlı healthcheck sağlamalıdır.
- pgweb PostgreSQL'e Compose servis adı üzerinden bağlanmalı ve `--readonly`
  modunda çalışmalıdır.
- Varsayılan host portları PostgreSQL için `5433`, pgweb için `8081` olmalıdır.
- Her iki port da varsayılan olarak yalnızca `127.0.0.1` adresine bind
  edilmelidir. Uzak pgweb erişimi SSH port yönlendirmesiyle yapılmalıdır.
- Servisler `restart: unless-stopped` davranışına sahip olmalıdır.
- Compose proje adı `db/.env` içindeki `COMPOSE_PROJECT_NAME` ile sabitlenmeli;
  uyumluluk için top-level `name` alanı kullanılmamalıdır.
- Normal durdurma veya yeniden kurulum named volume'u silmemelidir. Veri silen
  bir komut otomatik ya da örtük olarak çalıştırılmamalıdır.

## Ortam Yapılandırması

`db/.env.example` en az şu değişkenleri belgelemelidir:

- `COMPOSE_PROJECT_NAME`
- `TEFAS_POSTGRES_DB`
- `TEFAS_POSTGRES_USER`
- `TEFAS_POSTGRES_PASSWORD`
- `TEFAS_POSTGRES_PORT`
- `TEFAS_PGWEB_PORT`

Yerel geliştirme için açıkça işaretlenmiş varsayılan değerler kullanılabilir.
Uzak kurulum boş, örnek veya bilinen zayıf parola ile devam etmemelidir.
Parolalar loglara, komut özetlerine veya Git tarafından izlenen dosyalara
yazılmamalıdır.

## Kurulum Betiği

`db/install.sh` çalıştırıldığı dizinden bağımsız davranmalı, kendi dizinini
çözümlemeli ve aşağıdaki arayüzleri sağlamalıdır:

```text
db/install.sh local
db/install.sh remote <user@host> [-p ssh-port] [-d remote-dir] [--no-service]
db/install.sh --help
```

### Yerel macOS

`local` modu:

1. Podman'ın ve `podman compose` veya `podman-compose` komutlarından birinin
   kullanılabilir olduğunu doğrulamalıdır.
2. `db/.env` yoksa `db/.env.example` üzerinden oluşturmalı ve kullanıcıya
   hangi dosyayı düzenleyebileceğini bildirmelidir.
3. Compose servislerini detached modda başlatmalıdır.
4. PostgreSQL hazır olana kadar sınırlı süre beklemeli, SQL bağlantısını ve
   pgweb HTTP yanıtını doğrulamalıdır.
5. pgweb ve PostgreSQL bağlantı adreslerini parola göstermeden raporlamalıdır.

Betiğin yerel bölümü macOS ile gelen Bash 3.2 üzerinde çalışmalıdır. Podman
machine yaşam döngüsünü veya Podman kurulumunu yönetmemeli; eksik önkoşulları
açık hata ve çözüm ipucuyla bildirmelidir.

### Uzak Linux

`remote` modu:

1. Batch mode SSH bağlantısını ve uzak Podman/Compose önkoşullarını
   doğrulamalıdır.
2. `compose.yaml` ile yerel `db/.env` dosyasını yapılandırılabilir uzak dizine
   kopyalamalı ve uzak `.env` iznini `0600` yapmalıdır.
3. Varsayılan olarak root veya rootless çalışmayı algılayıp uygun systemd unit'i
   oluşturmalı, enable etmeli ve başlatmalıdır.
4. Rootless serviste mümkün olduğunda user lingering'i etkinleştirmeli; yetki
   yoksa durumu anlaşılır biçimde bildirmelidir.
5. `--no-service` seçeneğinde systemd oluşturmadan Compose'u doğrudan
   başlatmalıdır.
6. PostgreSQL readiness, SQL bağlantısı, pgweb HTTP yanıtı ve kurulduysa
   systemd durumunu doğrulamalıdır.
7. pgweb için örnek SSH tüneli komutunu parola göstermeden yazdırmalıdır.

Hem `local` hem `remote` modu tekrar çalıştırıldığında güvenli ve idempotent
olmalı; mevcut volume'u silmemeli ve gereksiz ikinci container/service
oluşturmamalıdır.

## Acceptance Criteria

- [ ] `db/compose.yaml`, `db/.env.example` ve çalıştırılabilir `db/install.sh`
      repository'de bulunur; gerçek `db/.env` `.gitignore` tarafından dışlanır.
- [ ] `factory.config.json` içinde `db`, izinli artifact yolu olarak tanımlıdır.
- [ ] Compose yapılandırması PostgreSQL 16 ve pgweb 0.17.0 servislerini tam
      nitelikli image adlarıyla tanımlar.
- [ ] PostgreSQL verisi named volume'da kalıcıdır ve normal stop/reinstall
      akışları volume'u silmez.
- [ ] PostgreSQL ve pgweb host portları varsayılan olarak sırasıyla
      `127.0.0.1:5433` ve `127.0.0.1:8081` ile sınırlıdır.
- [ ] pgweb veritabanına bağlanır ve salt-okunur çalışır.
- [ ] `db/install.sh local`, macOS üzerinde mevcut Podman Compose ile servisleri
      başlatır; PostgreSQL readiness, SQL sorgusu ve pgweb HTTP kontrolü başarılı
      olmadan başarı bildirmez.
- [ ] `db/install.sh remote user@host`, Linux sunucuya güvenli kopyalama yapar,
      root ve rootless systemd kurulumlarını destekler ve `--no-service`
      seçeneğini uygular.
- [ ] Uzak kurulum boş/örnek/zayıf PostgreSQL parolasıyla başlamadan hata verir.
- [ ] Script herhangi bir dizinden çağrılabilir, argümanları doğrular, eksik
      Podman/Compose/SSH önkoşullarında uygulanabilir hata mesajı verir ve gizli
      değerleri çıktılamaz.
- [ ] Kurulum iki kez çalıştırıldığında aynı servisleri günceller/yeniden
      kullanır; veri volume'u korunur ve duplicate container oluşmaz.
- [ ] `bash -n db/install.sh` başarılıdır ve macOS Bash 3.2 ile uyumsuz Bash
      özellikleri kullanılmaz.
- [ ] Desteklenen Compose komutuyla `compose config` doğrulaması başarılıdır.
- [ ] Yerel macOS ve uzak Linux smoke test sonuçları; kullanılan komutlar,
      PostgreSQL readiness/SQL sonucu, pgweb HTTP durumu ve systemd durumu
      (varsa) ile birlikte uygulama tesliminde belgelenir.

## Kapsam Dışı

- Podman veya Podman machine kurulumu/yükseltilmesi.
- PostgreSQL şema migration'ları, seed verisi ve uygulama tabloları.
- PostgreSQL veya pgweb portlarını genel ağa açmak.
- TLS, reverse proxy, DNS, güvenlik duvarı ve bulut sağlayıcı kaynakları.
- Otomatik volume silme veya veri sıfırlama komutu.


## Constraints

```json
{}
```
