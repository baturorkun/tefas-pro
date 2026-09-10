# Manual Handoff

Run ID: `20260910134212-RQ-0060`

Use this handoff in the manual implementation flow when you want an external implementer to complete the requirement without running the AI Factory agent pipeline.

## Instruction for Implementer

Read the requirement and constraints below, inspect the target project, implement the change directly in the workspace, and run the configured local checks. Do not call the AI Factory LLM pipeline for this task.

## Target Project

- Root: /Users/batur/Documents/Projects/bytecraft/agentic/tefas-pro
- Profile: vanilla-typescript
- Usual paths: public, src, tests, db, .dockerignore, .github/workflows, tsconfig.json, tsconfig.build.json, collector, package.json, vitest.config.ts, scripts, server (where the requirement work normally belongs; a handoff capture is not restricted to them)
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
- AGENTS.md
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
- db/migrations/025_closed_position.sql
- db/migrations/026_settings_and_order_dates.sql
- db/migrations/027_bank.sql
- db/migrations/028_ingest_run_fund_counts.sql
- db/migrations/029_portfolio_daily_complete_days.sql
- db/migrations/030_user_setting.sql
- db/migrations/031_tracked_fund_includes_benchmark.sql
- db/migrations/032_position_slice.sql
- db/migrations/033_watchlist_visible_forward_sale.sql
- db/migrations/034_transaction_split.sql
- db/migrations/035_fund_stock_holding.sql
- db/migrations/036_assistant_conversation.sql
- db/migrations/037_app_user_full_name.sql
- db/migrations/038_app_user_contact.sql
- db/migrations/039_system_fund.sql
- db/migrations/040_fund_daily.sql
- db/migrations/041_pending_purchase.sql
- db/migrations/042_same_day_position.sql
- db/sync.sh
- db/watchlist.txt
- docs/superpowers/plans/2026-08-29-tefas-pro-bootstrap.md
- docs/superpowers/specs/2026-08-29-tefas-pro-bootstrap-design.md
- factory.config.json
- package.json
- pnpm-lock.yaml
- public/index.html
- references/README.md
- references/charts/README.md
- references/charts/portfolio-performance.png
- references/deployment/README.md
- references/development/README.md
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
- requirements/RQ-0019-kapali-pozisyonlar-ekrani-gerceklesen-kar-zarar.md
- requirements/RQ-0020-piyasa-bolumlerini-panelden-ayri-bir-ekrana-tasi.md
- requirements/RQ-0021-gelistirme-icin-compose-uzerinde-canli-yenilenen-uygulama-servisi.md
- requirements/RQ-0022-form-alanlarinin-gorunumunu-referans-arayuze-yaklastir.md
- requirements/RQ-0023-sistem-ayarlari-resmi-tatiller-ve-valore-gore-emir-gerceklesme-tarihi-hesabi.md
- requirements/RQ-0024-donemsel-getiri-ekrani-aylik-ve-haftalik-kar-zarar-tablosu.md
- requirements/RQ-0025-banka-yonetimi-islem-formunda-secim-listesi-ayarlarda-banka-tanimi.md
- requirements/RQ-0026-takip-listesine-eklenen-fon-icin-aninda-tek-fonluk-toplama.md
- requirements/RQ-0027-benchmark-fonu-ayari-ve-donemsel-getiri-karsilastirmasi.md
- requirements/RQ-0028-kullanici-ayarlari-ve-kullaniciya-ozel-benchmark-fonu.md
- requirements/RQ-0029-dagilim-ekrani-portfoyun-banka-ve-kategori-kirilimi.md
- requirements/RQ-0030-panelde-gunluk-getiri-ve-toplam-kazanc.md
- requirements/RQ-0031-fon-hareketlerinde-islem-basina-fiyat-tutar-ve-kar-zarar.md
- requirements/RQ-0032-ileri-tarihli-satista-fon-hem-portfoyde-hem-takip-listesinde-sayiliyor.md
- requirements/RQ-0033-surum-numarasi-elle-degil-requirements-klasorunden-turetilsin.md
- requirements/RQ-0034-fon-hareketlerinde-fon-ve-banka-filtresi.md
- requirements/RQ-0035-satista-fifo-uyarisi-fon-ve-banka-bazinda-en-eski-lot.md
- requirements/RQ-0036-fon-hareketlerine-kisa-not-alani.md
- requirements/RQ-0037-collector-image-deploy-pipeline-inda-kurulsun.md
- requirements/RQ-0038-fon-icerigi-varlik-turu-kirilimi.md
- requirements/RQ-0039-fon-hisse-kirilimi-ve-portfoy-geneli-hisse-agirligi.md
- requirements/RQ-0040-dogal-dille-soru-sorma-veri-destekli-ai-asistan.md
- requirements/RQ-0041-asistan-canli-akis-kalici-gecmis-ve-toplu-sayim.md
- requirements/RQ-0042-kullanici-menusu-admin-linkleri-alta-katlanir-profil-sayfasi.md
- requirements/RQ-0043-getiri-karsilastirmasi-sure-etkisi-ayristiriliyor.md
- requirements/RQ-0044-panel-arac-cubugu-sessiz-takip-listesi-ve-ileri-tarihli-alimlar.md
- requirements/RQ-0045-sistem-fon-listesi-toplama-kapsami-kullanicidan-bagimsiz.md
- requirements/RQ-0046-performans-grafigine-benchmark-cizgisi-ve-fark.md
- requirements/RQ-0047-fon-detayi-sekmeli-bolumler-ve-gunluk-getiri-listesi.md
- requirements/RQ-0048-performans-grafigine-benchmark-cizgisi-ve-fark.md
- requirements/RQ-0049-piyasa-sol-ve-sag-pencereler-kaydiriciyla-seciliyor.md
- requirements/RQ-0050-hisseler-ekrani-yalniz-sahip-olunan-fonlardan-kuruluyor.md
- requirements/RQ-0051-piyasa-ekrani-sekmelere-ayriliyor.md
- requirements/RQ-0052-cikilmis-pozisyonlar-guncel-varlik-sayilmiyor.md
- requirements/RQ-0053-kapananlar-ekraninda-fon-bazinda-ozet.md
- requirements/RQ-0054-bekleyen-alimlar-portfoyum-ekraninda-gorunuyor.md
- requirements/RQ-0055-tutarla-verilen-alim-emri-kayit-altina-aliniyor.md
- requirements/RQ-0056-islem-formunda-fon-serbest-metin-degil-listeden-secilir.md
- requirements/RQ-0057-ayni-gun-alinan-pozisyon-hesaba-giriyor.md
- requirements/RQ-0058-satis-parasinin-hangi-banka-ve-tarihte-gelecegi-takvimi.md
- requirements/RQ-0059-fvt-toplama-ev-ip-sinden-kosuyor.md
- requirements/RQ-0060-superuser-baska-bir-kullaniciya-gecis-yapabiliyor.md
- scripts/collect-fvt.sh
- scripts/dev-up.sh
- scripts/resolve-deployment-target.sh
- scripts/write-version.ts
- server/Containerfile
- server/install.sh
- src/assistant-labels.ts
- src/collect-fvt.ts
- src/collector.ts
- src/db/migrate.ts
- src/db/pool.ts
- src/db/seed.ts
- src/db/user.ts
- src/fifo.ts
- src/limits.ts
- src/main.ts
- src/server/assistant.ts
- src/server/auth.ts
- src/server/http.ts
- src/server/index.ts
- src/server/repository.ts
- src/settlement.ts
- src/sources/fintables.ts
- src/sources/fvt.ts
- src/sources/gemini.ts
- src/sse.ts
- src/styles.css
- src/user-fields.ts
- src/version.ts
- templates/.gitkeep
- tests/allocation.test.sh
- tests/allocation.test.ts
- tests/assistant.test.sh
- tests/assistant.test.ts
- tests/auth.test.ts
- tests/bank.test.sh
- tests/cash-calendar.test.sh
- tests/closed-fund-summary.test.sh
- tests/closed-position.test.sh
- tests/collector-deploy.test.sh
- tests/collector-log.test.sh
- tests/collector.test.ts
- tests/db-install.test.sh
- tests/db-sync.test.sh
- tests/deployment-target.test.sh
- tests/fifo.test.sh
- tests/fifo.test.ts
- tests/fintables.test.ts
- tests/fixtures/fintables-TLY-cashflow.json
- tests/fixtures/fintables-TLY-info.json
- tests/fixtures/fintables-TLY-price.json
- tests/fixtures/fintables-TLY-volatility.json
- tests/fixtures/fintables-funds-sample.json
- tests/fixtures/fintables-window-cashflow.json
- tests/fixtures/fintables-window-growth.json
- tests/fixtures/fintables-yield-sample.json
- tests/fixtures/fvt-KHA-distribution.json
- tests/fixtures/fvt-chart-data.json
- tests/fund-picker.test.sh
- tests/fvt.test.ts
- tests/headline.test.sh
- tests/holding-exit.test.sh
- tests/http.test.ts
- tests/market-tabs.test.sh
- tests/market-window.test.ts
- tests/pending-orders.test.sh
- tests/pending-purchase.test.sh
- tests/performance.test.ts
- tests/periods.test.ts
- tests/position-open.test.sh
- tests/profile.test.sh
- tests/same-day-position.test.sh
- tests/settings.test.sh
- tests/settlement.test.ts
- tests/sse.test.ts
- tests/stock-scope.test.sh
- tests/transaction-detail.test.sh
- tests/transaction-form.test.sh
- tests/ui-conventions.test.ts
- tests/user-clone.test.sh
- tests/user-fields.test.ts
- tests/user-setting.test.sh
- tests/version.test.ts
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
id: RQ-0060
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-10T11:05:34.259Z"
branch: "factory/RQ-0060"
createdFromCommit: "3b43ca9188d85daa5ec5d7c9b7fbceef7cded6cf"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/120"
githubPullRequestIid: 120
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/119"
githubIssueIid: 119
repositoryProvider: github
---
# RQ-0060 - Superuser başka bir kullanıcıya geçiş yapabiliyor

Bir kullanıcının bildirdiği sorunu görmenin tek yolu şu an onun parolasını
öğrenmek. Superuser, kullanıcı listesinden birini seçip o kullanıcı olarak
girmiş gibi uygulamayı görebilmeli.

## Bugünkü model

`app_user.type` iki değer alıyor: `admin` ve `user`. Superuser üçüncü bir
seviye — admin'in kullanıcı yönetebilmesi ayrı bir şey, başkasının verisini
görebilmesi ayrı bir şey ve ikisi aynı yetkide toplanmamalı.

Oturum `app_session` satırında tek bir `user_id` taşıyor. Geçiş bu satırın
üzerine kurulacak: kimin adına bakıldığı ile kimin baktığı ayrı ayrı
durmalı, çünkü geri dönüşün ve denetimin dayanağı budur.

## Kullanıcının gördüğü

Sol altta kullanıcı adı ve rolü yazan kutu var. Geçiş yapıldığında o kutu
durumu açıkça söylemeli: bakılan kullanıcının adı, yanında bunun bir geçiş
olduğunu belirten işaret ve bir **X**. X'e basınca oturum asıl superuser'a
dönüyor.

Gizli olmamalı. Superuser hangi kullanıcının verisine baktığını her ekranda
görmeli, yoksa yanlış hesapta işlem yapması an meselesi.

## Acceptance Criteria

- `app_user.type` üçüncü bir değer alıyor ve superuser ayrı bir seviye.
- Superuser kullanıcı listesini açıp bir kullanıcıya geçiş yapabiliyor.
- Geçiş sonrası uygulama o kullanıcıyla girilmiş gibi davranıyor: portföy,
  takip listesi, işlemler hep o kullanıcının.
- Sol alttaki kutu geçiş hâlini gösteriyor ve X ile asıl superuser'a dönüyor.
- Superuser olmayan hiçbir kullanıcı geçiş uçlarını çağıramıyor; sunucu
  reddediyor.
- Geçiş sırasında asıl superuser kimliği oturumda korunuyor.

## Kapsam dışı

- Kullanıcının parolasını görmek veya değiştirmek.
- Geçiş sırasında yapılan işlemlerin denetim kaydı. Ayrı bir iş.


## Constraints

```json
{}
```
