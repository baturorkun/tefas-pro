# Manual Handoff

Run ID: `20260831192032-RQ-0010`

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
- requirements/RQ-0010-pozisyon-bazli-getiri-alis-tarihime-gore-kar-zarar.md
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
id: RQ-0010
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-08-31T19:03:59.321Z"
branch: "factory/RQ-0010"
createdFromCommit: "5a9c74c7783c51becf7b5e398a2264d3e943015d"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/20"
githubPullRequestIid: 20
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/19"
githubIssueIid: 19
repositoryProvider: github
---
# RQ-0010 - Pozisyon bazlı getiri: alış tarihime göre kâr/zarar

Paneldeki bütün grafikler fonun kendi getirisini gösteriyor: sabit pencerede,
herkes için aynı. Kullanıcının o fondan ne kazandığı hiçbir yerde yok. Alış
tarihi kullanıcıya özel ve fark büyük.

Ölçüldü:

| Fon | Alıştan bugüne | Fon 1 ay | Ne oluyor |
|---|---:|---:|---|
| AFT | **−%1,59** (74 gün) | +%10,40 | fon toparlamış, ben hâlâ zarardayım |
| PIL | **−%3,88** (76 gün) | +%7,82 | aynı durum |
| DOH | +%6,95 (5 gün) | +%32,28 | geç girdim, ralinin çoğunu kaçırdım |

AFT ve PIL bugün "en çok kazandıran" panelinde görünüyor. Kullanıcının cebi
ekside. Panel yanlış bir şey söylemiyor — yanlış soruyu cevaplıyor.

## Pencere kırpılmaz

Her pozisyon kendi alış tarihinden son veri gününe kadar ölçülür. Bar başına
pencere farklı: TLY 114 gün, DOH 5 gün.

Pencereyi 1 hafta / 1 ay ile kırpmak denendi ve reddedildi: 30 günden eski
pozisyonlarda sonuç fon grafiğiyle **birebir aynı** çıkıyor. AFT kırpılmış
halde +%10,40 ile yine kazandıran tarafta kalıyordu — yani körlük geri
geliyordu. Sinyali veren şey tam olarak pencerenin kırpılmaması.

Bunun bedeli: sıralama süreye duyarlı. Uzun tutulan fon daha iyi olduğu için
değil, daha uzun tutulduğu için başa geçer. Bu yüzden **her barda gün sayısı
zorunlu** — okuyucu sıralamayı süreyle birlikte okumalı.

## Hesap: yeni veri toplanmayacak

Pozisyon getirisi, alış tarihinden son veri gününe kadarki günlük getirilerin
bileşiğidir:

```
getiri = Π(1 + günlük_getiri/100) − 1     alış < gün ≤ bitiş
```

NAV geçmişine gerek yok — birim sadeleşir. Bu şart, çünkü `fact_fund_daily`de
30.643 satırın yalnız 36'sında `nav_per_share` dolu; tarihsel NAV hiç
toplanmamış. Günlük getiri ise 30.179 satırda var.

TL tutarları için alış NAV'ı gerekir; o da türetilir: **bugünkü NAV / çarpan**.
Alış fiyatı hiçbir yerde saklı değil — `portfolio_transaction` yalnız adet ve
tarih taşıyor.

### Türetme üç bağımsız yolla doğrulandı

1. **Bilinen sonuçla eşleşme.** PBR'nin 2026-04-14 alışı 2026-08-18 satışına
   kadar **+%47,43**. Bağımsız elle ölçümle birebir aynı.

2. **Yuvarlak tutar testi.** Türetilen maliyetlerin 94'ten **79'u**, yuvarlak
   bin liralık tutarlara bir adetlik fark içinde oturuyor (DFI 49.997 ₺,
   IVY 29.999 ₺, CPT 20.000 ₺). İnsan "20 bin lira al" der; tam adet kısıtı
   yüzünden birkaç lira sapar. Türetme yanlış olsa bu örüntü çıkmazdı.
   Oturmayan 15'in altısı PNU ve tutarları 403.444 ₺, 262.272 ₺ gibi — fon
   değiştirmenin izi, yuvarlak olmaması beklenir.

3. **Zincir bütünlüğü.** Hiçbir fonun getiri serisinde eksik iş günü yok. Bir
   gün eksik olsa bileşik çarpan ve türetilen alış fiyatı sessizce yanlış
   çıkardı.

94 işlemin 94'ü hesaplanabiliyor, veri boşluğu yok.

## Ağırlıklandırma para bazlı olmalı

Aynı fondan farklı tarihlerde alım yapılınca fon başına tek getiri gerekir.
Çarpanların adet ağırlıklı ortalaması **yanlış**: her adet farklı fiyattan
alınmıştır, ağırlık paradır.

```
DOĞRU:   Σadet / Σ(adet/çarpan) − 1
YANLIŞ:  Σ(adet × çarpan) / Σadet − 1
```

TLY'de %63,48 yerine %72,33 veriyor — dokuz puan.

## Takip listesi: "almış gibi" simülasyon

RQ-0009'daki toggle açıkken takip listesindeki fonlar da grafiğe girer.
Simüle alış tarihi `user_watchlist.added_at`: "izlemeye başladığım gün almış
olsaydım ne olurdu".

Bu barlar **içi boş** çizilir — RQ-0009'da kurulan kural: dolu bar sahiplik,
içi boş bar takip listesi. Simülasyon gerçek pozisyonla karıştırılmamalı.

Toggle yeni bir kontrol değil, RQ-0009'un kontrolüdür. Aynı seçim hem piyasa
grafiklerini hem pozisyon grafiklerini yönetir; iki ayrı toggle kullanıcıyı
"hangisi neyi açıyordu" sorusuna mahkûm ederdi.

### Bugün simülasyon anlamlı sonuç vermez

`added_at` değerleri gerçek "izlemeye başladım" tarihleri değil: 26'sı
`db/watchlist.txt` tohumundan (2026-08-30), 9'u işlem aktarımından
(2026-08-31). Yani bugün bütün simülasyonlar 1-2 günlük pencereyle çıkar.

Bu bir kusur değil, verinin yaşı. Panelden eklenen her yeni fon gerçek tarih
alacak ve simülasyon zamanla anlamlanacak. Gün sayısı sütunu bu yüzden burada
da zorunlu: 1 günlük bir simülasyon 114 günlük bir pozisyonun yanında
yanıltmasın.

Tamamen satılmış bir fon RQ-0008 gereği takip listesinde geri belirir; grafiğe
gerçek alış tarihiyle değil, `added_at` ile simüle edilerek girer. Gerçek
kazancı kaybolmasın diye gerçekleşmiş kâr özet şeridinde ayrıca durur.

## Özet şeridi

Grafiğin üstünde: maliyet, bugünkü değer, kâr ₺ ve %, kaç pozisyon kârda /
zararda, kapanmış pozisyonların gerçekleşmiş kârı.

Bugünkü değerler: maliyet 3.095.853 ₺, değer 3.507.700 ₺, kâr 411.847 ₺
(%13,30), 48 pozisyon kârda / 7 zararda.

## Kapsam

- `analytics.position_return` view'ı: kullanıcı ve fon başına para ağırlıklı
  getiri, tutulan gün, maliyet, bugünkü değer, kâr ₺.
- Takip listesi fonları için `added_at`ten simüle edilmiş aynı hesap.
- Kapanmış pozisyonlar için gerçekleşmiş kâr: aynı hesap, bitiş = satış tarihi.
- `dashboard()` özet ve pozisyon sıralamalarını döndürür; mevcut toggle
  parametresi bu bölümü de yönetir.
- Dashboard'da yeni bölüm: özet şeridi + "en çok kazandıran / en çok
  kaybettiren pozisyonlarım" iki paneli.

## Acceptance Criteria

- [ ] Her açık pozisyonun getirisi, alış tarihinden son veri gününe kadarki
      günlük getirilerin bileşiğidir; pencere kırpılmaz.
- [ ] Aynı fondan birden çok alım para ağırlıklı birleştirilir; adet ağırlıklı
      ortalama kullanılmaz.
- [ ] Her barda o fonun kaç gündür tutulduğu görünür.
- [ ] Toggle açıkken takip listesi fonları `added_at`ten alınmış gibi hesaplanır
      ve içi boş bar olarak çizilir; kapalıyken hiç görünmezler.
- [ ] Sıralama toggle kapatılınca yeniden hesaplanır, bar gizlenmez.
- [ ] Getiri günü olmayan pozisyon veya simülasyon %0 gibi gösterilmez; listeye
      girmez.
- [ ] Özet şeridi maliyet, bugünkü değer, kâr ₺ ve % gösterir; kapanmış
      pozisyonların gerçekleşmiş kârı ayrı görünür.
- [ ] Hesap kullanıcıya özeldir: iki kullanıcı aynı fonu farklı tarihlerde
      almışsa farklı getiri görür.
- [ ] Mevcut dört piyasa grafiği ve toggle davranışı değişmez.
- [ ] Yapılandırılmış quality gate'ler (typecheck, test, build) geçer.

## Bilinen Basitleştirmeler

Ölçüm hatası üretirler; kapsam dışı ama sessizce geçilmemeli.

- **Valör.** Emir günü ile fiyatın oluştuğu gün aynı sayılıyor.
  `dim_fund_terms` `buy_valor_days` / `sell_valor_days` taşıyor ama hesaba
  katılmıyor. Getiri bir iş günü kayabilir.
- **Stopaj.** Brüt getiri gösteriliyor. `tax_pct` var, uygulanmıyor.
- **Kısmi satış.** Bir işlem ya tamamen açık ya tamamen kapalı; adedin bir
  kısmının satılması modellenmiyor. Veri modelinin sınırı.

## Kapsam Dışı

- Fonun aynı takvim penceresindeki getirisiyle yan yana karşılaştırma.
- Tarihsel NAV toplanması.
- Zaman içindeki portföy değeri grafiği.


## Constraints

```json
{}
```
