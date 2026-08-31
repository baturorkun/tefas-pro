# Manual Handoff

Run ID: `20260831133916-RQ-0008`

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
id: RQ-0008
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-08-31T12:25:22.182Z"
branch: "factory/RQ-0008"
createdFromCommit: "fa32be56d03c413e1866a2097109f1cfd295da82"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/16"
githubPullRequestIid: 16
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/15"
githubIssueIid: 15
repositoryProvider: github
---
# RQ-0008 - Multitenant model: kullanıcı bazlı takip listesi ve portföy

Sistem çok kullanıcılı olacak. Şu an neyin kime ait olduğu net değil ve bir
tablo yanlış kapsamda duruyor.

## Bugünkü durum ve sorun

| Tablo | Kapsam | Doğru mu |
|---|---|---|
| `dim_fund`, `fact_fund_daily`, `dim_fund_terms`, … | global | ✓ piyasa verisi herkese ortak |
| `portfolio_transaction` | `user_id` var | ✓ |
| `app_session` | `user_id` var | ✓ |
| **`watchlist`** | **global, sahibi yok** | ✗ kimin listesi olduğu belirsiz |

Ölçüldü: `watchlist`, `dim_fund` ve işlem görmüş fonlar bugün aynı 36 fon. Takip
listesi bağımsız bir liste değil, portföyün yan ürünü — çünkü fon eklemenin tek
yolu işlem girmek. "Henüz almadığım ama izlediğim fon" kavramı şemada var
(`status='watching'`) ama eklenemiyor: 36 satırın hepsi `owned`.

## İki ayrı kavram, tek tabloda karışmış

`watchlist` bugün iki işi birden yapıyor ve ikisi de yanlış oluyor:

| Soru | Doğru kapsam |
|---|---|
| Ben neyi izliyorum? | **Kullanıcı başına** |
| Collector neyi toplasın? | **Türetilir** — elle tutulan bir liste değil |

Bu requirement ikisini ayırır.

## Takip listesi kullanıcıya ait olur

`watchlist` → `user_watchlist(user_id, fund_code, added_at)`.

- Her kullanıcı kendi listesini yönetir: ekler, çıkarır.
- Bir kullanıcının listesi başka kullanıcıyı etkilemez.
- Aynı fon birden çok kullanıcının listesinde olabilir; veri yine bir kez toplanır.

## Collector'ın kaynağı hesaplanır

Toplanacak fon kümesi bir tablo değil, bir sorgudur:

```
DISTINCT( tüm kullanıcıların takip listeleri
        ∪ tüm kullanıcıların AÇIK pozisyondaki fonları )
```

Bir fon kaç kullanıcıyı ilgilendirirse ilgilendirsin **bir kez** toplanır. Piyasa
verisi global kalır; THF'nin NAV'ını kullanıcı başına tekrar çekmek aynı veriyi
çoğaltmak olurdu ve RQ-0001'de ölçülen ban riski gerçek.

Portföyün de kümeye girmesi şart: bir kullanıcı fonu takip listesinden çıkarsa
ama pozisyonu duruyorsa verisi kesilmemelidir.

Bu gerekçe yalnız **açık** pozisyon için geçerli. Kapalı pozisyon da kümede
olsaydı, aylar önce çıkılmış ve takip listesinden de silinmiş bir fon sonsuza
kadar toplanırdı — kimse istemediği halde.

Satılmış bir fonu bir süre daha izlemek isteyen onu takip listesinde tutar.
Bu artık kullanıcının kararı, portföy geçmişinin yan etkisi değil. Kapalı
pozisyonun kâr/zarar hesabı da etkilenmez: satış tarihine kadarki NAV zaten
`fact_fund_daily`'de duruyor ve silinmiyor.

## Portföy kullanıcıya aittir

`portfolio_transaction` zaten `user_id` taşıyor ve kullanıcı yalnız kendi
işlemlerini görüyor (RQ-0004'te doğrulandı). Bu korunur.

`batur` adında bir kullanıcı oluşturulur ve mevcut 94 işlem ona taşınır. Bugün
işlemler `admin` üzerinde duruyor; `admin` yönetim hesabıdır, portföy taşımamalı.
Mevcut 36 takip satırı da `batur`'un listesi olur.

## Takip listesi = bende olmayan fonlar

"Portföyüm" ve "takip listem" ayrı iki soru: biri elimdekiler, diğeri aday
olarak izlediklerim. İkisi üst üste binerse liste bilgi taşımaz — nitekim
bindi: 36 takip satırının 26'sı zaten sahip olunan fonlardı.

Açık pozisyonu olan fon takip listesinde **görünmez**. Ama satırı silinmez;
`analytics.watchlist_visible` gösterirken süzer:

```sql
user_watchlist MINUS (o kullanıcının açık pozisyondaki fonları)
```

Silmek yerine süzmenin sebebi: fondan tamamen çıkıldığında listede
kendiliğinden geri belirsin. Silseydik kullanıcı her satıştan sonra fonu elle
geri eklemek zorunda kalırdı — oysa satış sonrası dönem tam da izlemek
istediği dönem. Satır korunduğu için notu ve eklenme tarihi de kaybolmuyor.

Listeden kalıcı çıkarmak isteyen `DELETE /api/watchlist/:code` kullanır.

Collector'ın kümesi bundan etkilenmez: gizlenen fonun zaten açık pozisyonu var,
o daldan toplanmayı sürdürür.

## Durum artık türetilir

`watchlist.status` alanı kaldırılır. Elle tutulduğu için zaten yanlış: 36 fonun
hepsi `owned` görünüyor, oysa 26'sında açık pozisyon var, 10'undan tamamen
çıkılmış.

Asıl sebep başka: **durum kullanıcıya göre değişir.** Aynı fon bir kullanıcı için
"sahibim", diğeri için "izliyorum" olabilir. Tek bir sütun bunu ifade edemez.

| Durum | Koşul |
|---|---|
| Çıktım | İşlemi var ama hepsi satılmış |
| İzliyorum | Hiç işlemi yok |

"Sahibim" diye bir durum yok: açık pozisyonu olan fon listede zaten
görünmüyor, portföy ekranının konusu.

## Kapsam

- `watchlist` → `user_watchlist(user_id, fund_code, added_at)`; `status` kaldırılır.
- `batur` kullanıcısı oluşturulur; 94 işlem ve 36 takip satırı ona taşınır.
- Collector'ın fon kümesi takip listeleri ile açık pozisyonların birleşiminden
  hesaplanır; her fon bir kez toplanır. Kapalı pozisyon kümeye girmez.
- Takip listesine fon ekleme ve çıkarma uçları; kullanıcı yalnız kendi listesini
  değiştirir.
- Takip listesi görünümü kullanıcının kendi listesini ve türetilmiş durumu
  gösterir; açık pozisyonu olan fonlar listeden süzülür.
- Portföye işlem girildiğinde fon o kullanıcının takip listesinde yoksa eklenir
  (mevcut davranış korunur).
- `pnpm db:seed <kullanıcı>` — tohum dosyası artık kime uygulanacağını bilmeli.
  Dosyadaki durum sütunu kaldırılır; kalmış bir durum sözcüğü sessizce yok
  sayılmaz, hata verir.
- `pnpm db:user` — panele girmeden kullanıcı açmak, parola sıfırlamak ve bir
  hesabın portföyünü/takip listesini başka hesaba devretmek için. `batur`
  devri bu komutla yapılır; uzak sunucuda da aynı komut koşar.

## Acceptance Criteria

- [ ] Migration'lar `pnpm db:migrate` ile uygulanır; ikinci çalıştırma hiçbir
      migration uygulamaz.
- [ ] `batur` kullanıcısı vardır, giriş yapabilir; 94 işlemin ve 36 takip
      satırının tamamı ona aittir, `admin`'de hiç işlem veya takip satırı kalmaz.
- [ ] Kullanıcı kendi takip listesine fon ekler ve çıkarır.
- [ ] Bir kullanıcının listesinden fon çıkarması başka kullanıcının listesini
      etkilemez.
- [ ] Bir kullanıcı başka kullanıcının takip listesini veya işlemlerini göremez,
      değiştiremez.
- [ ] Geçersiz fon kodu reddedilir; fon `dim_fund`'a fintables'tan doğrulanarak
      eklenir.
- [ ] Aynı fon aynı kullanıcı tarafından iki kez eklenirse hata vermez.
- [ ] Collector'ın topladığı fon kümesi takip listeleri ile açık pozisyonların
      birleşimidir; iki kullanıcı aynı fonu izlese de fon bir kez toplanır.
- [ ] Bir kullanıcı fonu takip listesinden çıkarsa ama açık pozisyonu varsa fon
      toplanmaya devam eder.
- [ ] Tamamen satılmış bir fon takip listesinden çıkınca toplanmayı bırakır;
      takip listesinde kaldığı sürece toplanmayı sürdürür.
- [ ] Fon durumu (çıktım / izliyorum) işlemlerden türetilir ve kullanıcıya göre
      değişir; tabloda `status` alanı yoktur.
- [ ] Takip listesindeki bir fondan alım yapılınca fon listeden kaybolur,
      `user_watchlist` satırı silinmez.
- [ ] O fondan tamamen çıkılınca fon listede kendiliğinden geri belirir; not ve
      eklenme tarihi korunur.
- [ ] Listeden kalıcı çıkarma yalnız kullanıcının açık isteğiyle olur.
- [ ] `pnpm db:seed` kullanıcı adı olmadan çalışmaz; olmayan kullanıcı reddedilir.
- [ ] `pnpm db:user transfer` kaynakta satır bırakmaz; devir tek transaction'dır.
- [ ] Yapılandırılmış quality gate'ler (typecheck, test, build) geçer.

## Kapsam Dışı

- Arayüzde "sadece kendi fonlarım" / "başkalarının fonları dahil" seçeneği;
  grafiklerin kapsamını değiştiren filtre sonraki bir requirement'ta ele alınır.
- Pozisyon bazlı getiri ve kâr/zarar hesabı.
- Kullanıcı davetleri, kayıt olma, parola sıfırlama.
- Kullanıcılar arası portföy paylaşımı veya görüntüleme.
- Takip listesi büyüdükçe collector süresini sınırlama veya arşivleme.


## Constraints

```json
{}
```
