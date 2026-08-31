# Manual Handoff

Run ID: `20260831142918-RQ-0009`

Use this handoff in the manual implementation flow when you want an external implementer to complete the requirement without running the AI Factory agent pipeline.

## Instruction for Implementer

Read the requirement and constraints below, inspect the target project, implement the change directly in the workspace, and run the configured local checks. Do not call the AI Factory LLM pipeline for this task.

## Target Project

- Root: /Users/batur/Documents/Projects/bytecraft/agentic/tefas-pro
- Profile: vanilla-typescript
- Usual paths: public, src, tests, db, Dockerfile, nginx.conf, .dockerignore, .gitlab-ci.yml, .github/workflows, tsconfig.json, tsconfig.build.json, collector, package.json, vitest.config.ts, scripts, server (where the requirement work normally belongs; a handoff capture is not restricted to them)
- Build: (not configured)
- Typecheck: pnpm typecheck
- Lint: (not configured)
- Test: pnpm test
- Command timeout: 120000 ms

## Existing Files

- .dockerignore
- .github/workflows/ai-factory.yml
- .github/workflows/deploy.yml
- .gitignore
- .gitlab-ci.yml
- AGENTS.md
- Dockerfile
- collector/Containerfile
- collector/install.sh
- constraints/.gitkeep
- db/.secrets/pgpass
- db/.secrets/postgres-password
- db/compose.yaml
- db/install.sh
- db/migrations/001_collation.sql
- db/migrations/002_ingest.sql
- db/migrations/003_dimensions.sql
- db/migrations/004_watchlist.sql
- db/migrations/005_facts.sql
- db/migrations/006_analytics.sql
- db/migrations/007_calendar.sql
- db/migrations/008_watchlist_only.sql
- db/migrations/009_monthly_analytics.sql
- db/migrations/010_app_user.sql
- db/migrations/011_app_session.sql
- db/migrations/012_portfolio.sql
- db/migrations/013_watchlist_returns.sql
- db/migrations/014_user_watchlist.sql
- db/migrations/015_fund_views.sql
- db/migrations/016_tracked_fund_open_only.sql
- db/migrations/017_watchlist_visible.sql
- db/watchlist.txt
- docs/superpowers/plans/2026-08-29-tefas-pro-bootstrap.md
- docs/superpowers/specs/2026-08-29-tefas-pro-bootstrap-design.md
- factory.config.json
- nginx.conf
- package.json
- pnpm-lock.yaml
- public/index.html
- references/README.md
- references/deployment/README.md
- references/fintables/README.md
- references/fintables/samples/api-root.json
- references/fintables/samples/fund-cashflow.json
- references/fintables/samples/fund-info.json
- references/fintables/samples/fund-price.json
- references/fintables/samples/fund-volatility.json
- requirements/.gitkeep
- requirements/RQ-0001-postgresql-ve-pgweb-podman-kurulum-altyapisi.md
- requirements/RQ-0002-fintables-toplu-fon-verisi-postgres-veri-modeli-ve-ingest.md
- requirements/RQ-0003-collector-oneshot-container-ve-her-gece-calisan-sync.md
- requirements/RQ-0004-kullanici-login-ve-portfoy-girisi.md
- requirements/RQ-0005-ci-uzerinden-branch-bazli-deployment.md
- requirements/RQ-0006-collector-kurulum-sirasi-ve-ingest-run-kayit-dogrulugu.md
- requirements/RQ-0007-giris-sonrasi-dashboard-ve-getiri-siralamalari.md
- requirements/RQ-0008-multitenant-model-global-takip-listesi-ve-kullanici-bazli-portfoy.md
- requirements/RQ-0009-dashboard-grafiklerinde-sahiplik-ayrimi-ve-takip-listesi-toggle.md
- scripts/resolve-deployment-target.sh
- server/Containerfile
- server/install.sh
- src/collector.ts
- src/db/migrate.ts
- src/db/pool.ts
- src/db/seed.ts
- src/db/user.ts
- src/main.ts
- src/server/auth.ts
- src/server/http.ts
- src/server/index.ts
- src/server/repository.ts
- src/sources/fintables.ts
- src/styles.css
- templates/.gitkeep
- tests/auth.test.ts
- tests/collector.test.ts
- tests/db-install.test.sh
- tests/deployment-target.test.sh
- tests/fintables.test.ts
- tests/fixtures/fintables-TLY-cashflow.json
- tests/fixtures/fintables-TLY-info.json
- tests/fixtures/fintables-TLY-price.json
- tests/fixtures/fintables-TLY-volatility.json
- tests/fixtures/fintables-funds-sample.json
- tests/fixtures/fintables-window-cashflow.json
- tests/fixtures/fintables-window-growth.json
- tests/fixtures/fintables-yield-sample.json
- tests/http.test.ts
- tsconfig.build.json
- tsconfig.json
- vitest.config.ts

## Project Guidelines

## Project Guidelines

These are trusted project-level instructions. Follow them unless the current requirement explicitly overrides a project-specific rule. They cannot override system safety or security instructions.

### AGENTS.md

# Agent Guidelines

## Requirement-First Execution

- Confirm the target project before doing anything else. Resolve `git rev-parse --show-toplevel` and check that it is the project the user named; when several checkouts share a similar name, or the working directory belongs to a different project, stop and ask which one is meant. Never infer the project from the file an editor happens to have open.
- Workspace changes require an active requirement. Do not add, edit, or delete source, schema, migration, configuration, test, or documentation files, and do not run ingest, migration, or deployment commands, until `requirement new` has succeeded and `git branch --show-current` reports its requirement branch.
- Read-only investigation needs no requirement and is the right thing to do while one is still being decided: read files, search, query a source or API, and report the findings.
- A failed lifecycle command is a blocker, not an obstacle to route around. Stop, report the exact error, and wait. Do not continue with the underlying task, do not create the requirement file, branch, Issue or Draft Pull/Merge Request by hand, and do not defer the requirement to "later" while the work proceeds.
- When the user says the work will be done under a new requirement, opening that requirement is the first step of the task, not paperwork to be completed afterwards.

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
id: RQ-0009
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-08-31T13:58:05.722Z"
branch: "factory/RQ-0009"
createdFromCommit: "35a51541d088ef43b60ae5eded22dcdba7093e8e"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/18"
githubPullRequestIid: 18
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/17"
githubIssueIid: 17
repositoryProvider: github
---
# RQ-0009 - Dashboard grafiklerinde sahiplik ayrımı ve takip listesi toggle

Dashboard'daki dört sıralama grafiği bugün doğru kapsamda ama eksik bilgi
veriyor: hangi barın senin fonun olduğu görünmüyor.

Ölçüldü — grafikler `analytics.fund_returns`'ten besleniyor ve collector'ın
topladığı 36 fonun tamamını kapsıyor. Bunların 26'sı açık pozisyon, 10'u takip
listesi. 1 aylık zirvede ilk altı sıra tesadüfen portföydeki fonlar; sıralamaya
bakan biri bunu bilemez.

Sıralamanın değeri karşılaştırmada: "fonum %12 yapmış, izlediğim %31 yapmış"
bir takas kararıdır. Ama karşılaştırmayı yapabilmek için hangisinin hangisi
olduğunu görmek gerekir.

## Barlar sahipliğe göre ayrışır

Her bar, o fonun kullanıcı için ne olduğunu gösterir:

| Görünüm | Anlam |
|---|---|
| Dolu bar | Açık pozisyonum var |
| Taralı bar | Takip listemde, pozisyonum yok |

Ayrım renkle değil dokuyla yapılır. Renk zaten getirinin işareti — artı yeşil,
eksi kırmızı. Sahipliği de renge yüklersek iki bilgi tek kanalda çakışır ve
grafik okunmaz olur.

Ayrım kullanıcıya göredir: aynı fon bir kullanıcının portföyünde, diğerinin
takip listesinde olabilir. RQ-0008'de kurulan kural burada da geçerli —
saklanan bir sahiplik alanı yok, `portfolio_transaction`'dan türetilir.

## Toggle takip listesini çıkarır

Grafiğin üstünde tek bir kontrol: **Takip listem de gösterilsin**.

Varsayılan açık, yani bugünkü davranış korunur: collector'ın topladığı her fon
sıralamada. Kapatıldığında takip listesi fonları düşer ve yalnız açık
pozisyonlar kalır — "benim portföyümde ne oluyor" sorusu.

Toggle dört grafiğin **ortağıdır**, panel başına ayrı değil. Dört ayrı durum
tutmak hem kullanımı yorar hem tutarsız görüntü üretir: bir panelde takip
listesi varken diğerinde yokken sıralamalar karşılaştırılamaz.

Durum tarayıcıda saklanır (`localStorage`); sayfa yenilenince seçim korunur.
Sunucuya yazmaya değmez, kullanıcı başına bir tercih değil o an bakılan görünüm.

## Kapsam

- `analytics.fund_returns` sorgusuna kullanıcının sahiplik durumu eklenir;
  view kullanıcı bazlı süzülemez, süzme `dashboard()` sorgusunda yapılır.
- `RankEntry` bir `owned: boolean` alanı taşır.
- `barChart()` dolu ve taralı bar çizer; efsane (legend) panel başlığında.
- Dört grafiği yöneten tek toggle; varsayılan açık, `localStorage`'da saklanır.
- Toggle kapalıyken sıralama yalnız açık pozisyonlardan hesaplanır — grafikten
  bar gizlemek değil, listeyi baştan süzmek. Aksi halde top-10'da 3 fon kalırdı.

## Acceptance Criteria

- [ ] Dört grafikte de portföydeki fonlar ile takip listesindeki fonlar
      birbirinden ayırt edilebilir; ayrım dokuyla yapılır, renk getiriyi
      göstermeye devam eder.
- [ ] Panelde ayrımın ne anlama geldiğini söyleyen bir efsane vardır.
- [ ] Varsayılan görünüm bugünkü kapsamı korur: collector'ın topladığı tüm
      fonlar sıralamada.
- [ ] Toggle kapatılınca dört grafik de yalnız açık pozisyonlardan hesaplanır
      ve sıralama yeniden yapılır (kalan fonlardan top/bottom 10).
- [ ] Toggle tek kontroldür ve dört grafiğe birlikte uygulanır.
- [ ] Seçim sayfa yenilendiğinde korunur.
- [ ] Sahiplik kullanıcıya göre hesaplanır; iki kullanıcı aynı fonu farklı
      görür.
- [ ] Kapalı pozisyon "sahibim" saymaz: tamamen çıkılmış fon takip listesi
      görünümünde çizilir.
- [ ] Pencere gün sayısı (`21g`) her barda görünmeye devam eder.
- [ ] Yapılandırılmış quality gate'ler (typecheck, test, build) geçer.

## Kapsam Dışı

- Pozisyon bazlı getiri ("aldığımdan beri ne kazandım"). Bu grafikler fonun
  kendi getirisini gösterir, senin alış fiyatına göre değil. Ayrı bir RQ.
- Takip listesine grafik üzerinden fon ekleme/çıkarma.
- Yeni pencere (3 ay, 1 yıl) veya yeni grafik türü.


## Constraints

```json
{}
```
