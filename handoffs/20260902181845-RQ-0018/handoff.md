# Manual Handoff

Run ID: `20260902181845-RQ-0018`

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
- db/migrations/018_position_return.sql
- db/migrations/019_fund_flow.sql
- db/migrations/020_fund_investor.sql
- db/migrations/021_drop_future_rows.sql
- db/migrations/022_nav_carry_forward.sql
- db/migrations/023_portfolio_daily.sql
- db/migrations/024_forward_dated_sale.sql
- db/sync.sh
- db/watchlist.txt
- docs/superpowers/plans/2026-08-29-tefas-pro-bootstrap.md
- docs/superpowers/specs/2026-08-29-tefas-pro-bootstrap-design.md
- factory.config.json
- nginx.conf
- package.json
- pnpm-lock.yaml
- public/index.html
- references/README.md
- references/charts/README.md
- references/charts/portfolio-performance.png
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
- requirements/RQ-0010-pozisyon-bazli-getiri-alis-tarihime-gore-kar-zarar.md
- requirements/RQ-0011-fon-giris-cikis-grafikleri-1-hafta-ve-1-ay-net-akis.md
- requirements/RQ-0012-yatirimci-sayisi-artis-ve-azalis-grafikleri.md
- requirements/RQ-0013-ileri-tarihli-veri-alinmasin.md
- requirements/RQ-0014-portfoyum-ve-fon-hareketleri-ayri-listeler.md
- requirements/RQ-0015-portfoy-performans-grafigi-deger-cizgisi-ve-gunluk-getiri-barlari.md
- requirements/RQ-0016-remote-veritabanini-local-e-senkronlayan-db-sync-komutu.md
- requirements/RQ-0017-silme-islemlerinde-ne-kaybedilecegini-soyleyen-onay.md
- requirements/RQ-0018-arayuz-yenilemesi-popup-formlar-ikonlu-dugmeler-surum-rozeti-ve-logo.md
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
- tests/db-sync.test.sh
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
- tests/performance.test.ts
- tests/position-open.test.sh
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
id: RQ-0018
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-02T18:17:21.670Z"
branch: "factory/RQ-0018"
createdFromCommit: "aa4d38d7ad599cbc97f4c3b52e0b16b61e208917"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/36"
githubPullRequestIid: 36
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/35"
githubIssueIid: 35
repositoryProvider: github
---
# RQ-0018 - Arayuz yenilemesi: popup formlar, ikonlu dugmeler, surum rozeti ve logo

Arayuz su haliyle begenilmiyor. Referans, ayni gelistiricinin `netforgesh`
projesi (`agentic/netforgesh`, canli: `http://38.242.129.1:9000/`). Oradaki
tasarim dili benimsenecek; kodu degil, kararlari aliniyor — netforgesh React
ile yazilmis, tefas-pro satir ici DOM kurar ve kutuphane eklenmez.

## Istenenler

### 1. Formlar popup icinde acilir

Bugun `transactionForm` duzenlenen satirin yerine gomuluyor
(`tr.replaceWith(...)`), ekleme formu ise listenin ustunde duruyor. Form
listenin ustunde, altinda veya yaninda degil, ortada bir pencerede acilmali.
RQ-0017'de eklenen `confirmDelete` penceresi ayni deseni zaten kuruyor; form
penceresi onun yaninda ayni gorunume oturmali.

### 2. Dugmeler ikonlu olur, yazidan dugme olmaz

Satir eylemleri bugun `duzenle` ve `sil` yazili metin dugmeleri. Bunlarin
yerine ikon gelir. Ancak referanstaki ikonlar fazla kucuk ve ne oldugu
anlasilmiyor: burada ikon en az 16px cizim alani ve dokunulabilir bir kutu
icinde durur, yaninda ipucu metni (`title`) bulunur.

Yazinin kendisi tiklanabilir olmaz. Bir eylem varsa dugme gorunumundedir.

### 3. Baslik metinleri buyuk harfle baslar

Her gorunur baslik, etiket ve rozet buyuk harfle baslar:
`acik` → `Acik`, `duzenle` → `Duzenle`, `islem ekle` → `Islem Ekle`,
`acik pozisyondaki farkli fon` → `Acik Pozisyondaki Farkli Fon`.
Coklu kelimede her kelime buyuk harfle baslar.

### 4. Sag ustte tarih degil surum

Bugun sag ustte veri tarihi duruyor. Yerine surum rozeti gelir; referanstaki
bicim birebir alinir:

```
v0.18.1+000fffb+2026-08-31-22-52
```

- `0` — ana surum, sabit
- `18` — requirement numarasi
- `1` — o requirement icin kacinci kosu
- `000fffb` — derlenen commit'in kisa SHA'si
- `2026-08-31-22-52` — derleme zamani

Referans uygulamada bu `src/netforgesh/version.py` icinde: `BASE_VERSION`
sabit, `CURRENT_REQUIREMENT` ve `CURRENT_RUN_ORDINAL` her requirement'ta elle
guncellenir, commit ve zaman derleme sirasinda ortamdan gelir ve yoksa surum
sadece `v0.18.1` olarak gosterilir.

### 5. Sol altta cikis

Kenar cubugunun alti ayrilir ve cikis oraya alinir; bugun kullanici bilgisiyle
birlikte duruyor.

### 6. Kucuk kutularda ikon

Metrik kartlari ve liste satirlari, referanstaki gibi renkli bir ikon kutusuyla
baslar.

### 7. Baslik ve logo

Uygulama adi `TEFAS-Pro` olur. Logo yerine bugun kullanilan gecici isaret
degistirilir; olcegi bozulmayan, kenar cubugunda ve giris ekraninda ayni duran
bir SVG isaret cizilir.

## Kapsam disi

Grafiklerin gorunumu (RQ-0015'te ayarlandi), tablo siralamasi, yeni ekran veya
yeni veri alani. Bu requirement mevcut ekranlarin gorunumunu degistirir,
islevini degil.

## Acceptance Criteria

- Islem ekleme ve duzenleme formlari ortada acilan bir pencerede gorunur;
  liste satiri yerinde kalir ve form listenin disinda bir yere gomulmez.
- Form penceresi Escape ile ve zemine tiklayarak kapanir; kapatmak kaydetmez.
- Satir eylemleri ikon dugmesidir; her birinin `title` ipucu vardir ve ikon
  cizim alani en az 16px'tir.
- Arayuzde metin gorunumlu, dugme gorunumu olmayan tiklanabilir ogeler
  kalmamistir.
- Gorunur basliklar, etiketler ve rozetler buyuk harfle baslar; `Acik`,
  `Kapandi`, `Duzenle`, `Sil`, `Islem Ekle` bicimindedir.
- Sag ust kosede veri tarihi yerine surum rozeti durur ve bicimi
  `v<ana>.<rq>.<kosu>` seklindedir; commit ve derleme zamani ortamdan
  geldiginde `+` ile eklenir.
- Surum bilgisi sunucudan gelir; istemci kendi basina uydurmaz.
- Commit ve derleme zamani ortamda yoksa surum yalnizca `v0.18.1` gorunur ve
  hata olusmaz.
- Kenar cubugunun altinda, ayrilmis bir bolumde cikis dugmesi bulunur.
- Metrik kartlari ikon kutusuyla baslar.
- Uygulama adi arayuzde ve sayfa basliginda `TEFAS-Pro` olarak gecer.
- Logo satir ici SVG'dir; kenar cubugunda ve giris ekraninda bozulmadan
  olceklenir.
- Yeni bir on yuz bagimliligi eklenmemistir; `package.json` bagimliliklari
  degismeden gecer.
- Surum turetme birimi test edilir: requirement numarasi ve kosu sirasindan
  dogru surum uretilir, gecersiz requirement kimligi reddedilir.
- `pnpm typecheck` ve `pnpm test` gecer.


## Constraints

```json
{}
```
