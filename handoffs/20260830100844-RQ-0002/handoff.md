# Manual Handoff

Run ID: `20260830100844-RQ-0002`

Use this handoff in the manual implementation flow when you want an external implementer to complete the requirement without running the AI Factory agent pipeline.

## Instruction for Implementer

Read the requirement and constraints below, inspect the target project, implement the change directly in the workspace, and run the configured local checks. Do not call the AI Factory LLM pipeline for this task.

## Target Project

- Root: /Users/batur/Documents/Projects/bytecraft/agentic/tefas-pro
- Profile: vanilla-typescript
- Usual paths: public, src, tests, db, Dockerfile, nginx.conf, .dockerignore, .gitlab-ci.yml, .github/workflows, tsconfig.json, tsconfig.build.json (where the requirement work normally belongs; a handoff capture is not restricted to them)
- Build: (not configured)
- Typecheck: pnpm typecheck
- Lint: (not configured)
- Test: pnpm test
- Command timeout: 120000 ms

## Existing Files

- .dockerignore
- .github/workflows/ai-factory.yml
- .gitignore
- .gitlab-ci.yml
- AGENTS.md
- Dockerfile
- constraints/.gitkeep
- db/.secrets/pgpass
- db/.secrets/postgres-password
- db/compose.yaml
- db/install.sh
- docs/superpowers/plans/2026-08-29-tefas-pro-bootstrap.md
- docs/superpowers/specs/2026-08-29-tefas-pro-bootstrap-design.md
- factory.config.json
- nginx.conf
- package.json
- pnpm-lock.yaml
- public/index.html
- references/README.md
- requirements/.gitkeep
- requirements/RQ-0001-postgresql-ve-pgweb-podman-kurulum-altyapisi.md
- requirements/RQ-0002-fintables-toplu-fon-verisi-postgres-veri-modeli-ve-ingest.md
- src/main.ts
- src/styles.css
- templates/.gitkeep
- tests/db-install.test.sh
- tsconfig.build.json
- tsconfig.json

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
id: RQ-0002
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-08-30T08:52:45.107Z"
branch: "factory/RQ-0002"
createdFromCommit: "ca6fc58637a7f5bd7724dab1925ede272b18908f"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/4"
githubPullRequestIid: 4
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/3"
githubIssueIid: 3
repositoryProvider: github
---
# RQ-0002 - Fon takip listesi ve günlük veri toplama

İzlenen fonları bir takip listesinde tutmak ve yalnız o fonlar için günlük
veriyi toplamak. Portföy kayıtları (alım tarihi, adet, platform) bu
requirement'ta yer almaz; kullanıcı onları arayüz hazır olduğunda girecektir.

Tüm fon evreni (2823 fon) toplanmaz. Evren yalnızca iki yerde kullanılır: takip
listesine fon eklerken arama yapmak ve yeni fon taraması. İkisi de günde iki
istekle, geçmiş biriktirmeden karşılanır.

RQ-0001 şema migration'larını ve uygulama tablolarını kapsam dışı bırakmıştı;
bu requirement onu devralır ve projenin ilk veri katmanını kurar. Şu an projede
runtime dependency, migration runner, şema ve kaynak istemcisi yok.

## Neden takip listesi

fintables'ın **fon başına** endpoint'leri tek istekte tüm günlük geçmişi
döndürüyor — ölçüldü:

| Endpoint | Dönen | Süre |
|---|---|---|
| `/funds/{KOD}/volatility/` | 339 günlük getiri noktası (16 ay) | 142 ms |
| `/funds/{KOD}/cashflow/?start_date=&end_date=` | 122 günlük net akış noktası (6 ay) | 335 ms |

Yani bir fonun tüm geçmişi 2 istekte geliyor. 26 fonluk liste için günlük run
~106 istek / ~1,5 dakika. Aynı derinliği tüm evren için almak 5600 istek eder.

## Veri kaynağı

`api.fintables.com`, auth yok, Cloudflare koruması TLS parmak izi tabanlı:
düz `curl` 403 alır, Chrome TLS parmak izini taklit eden bir client (`impit`)
200 çeker. **Headless browser gerekmez.**

### Takip listesindeki her fon için (fon başına 4 istek)

| Endpoint | Alınan |
|---|---|
| `/funds/{KOD}/price/` | `price` (gerçek NAV), `prev_price`, `day`, `market_cap` |
| `/funds/{KOD}/volatility/` | `[{x: tarih, daily_return}]` — günlük getiri serisi |
| `/funds/{KOD}/cashflow/?start_date=&end_date=` | `[{time, value}]` — günlük net akış serisi |
| `/funds/{KOD}/info/` | `tax` (stopaj), `buy_valor`, `sell_valor`, `management_fee`, `risk`, `shares_active`, `investor_count`, `last_asset` (varlık dağılımı) |

### Evren ve tarama (günde 2 istek)

| Endpoint | Alınan |
|---|---|
| `/funds/` | 2823 fonun kodu, unvanı, tipi, yönetim şirketi — listeye fon eklerken |
| `/funds/yield/` | 2396 fonun `yield_1m…5y` değerleri — yeni fon taraması |

### Doğrulanan davranışlar

- **NAV türetilemez, kaynaktan alınmalıdır.** `end_aum / shares_active` para
  piyasası fonunda tutuyor ama hisse fonunda tutmuyor: AAL %0 sapma, GAL %0,3,
  THF %1,8. Kâr/zarar için `/funds/{KOD}/price/` kullanılır.
- **Stopaj fona göre değişir.** Ölçülen: AAL %17,5, GAL %17,5, THF %0. Net kâr
  fon bazında hesaplanmalıdır.
- **Yönetim ücreti fona göre değişir**: %1 ile %2,25 arası ölçüldü.
- **Valör fona göre değişir.** AAL 0/0, THF alış 1 / satış 2 gün. Satış valörü,
  bir çıkış kararının kaç gün sonra fiyatlandığını belirler.
- **Toplu `/funds/cashflow/` günlük pencerede güvenilmezdir**, fon başına olan
  doğrudur. Toplu olan AAL için -154.080.386 TL verirken fon başına endpoint
  -13.968.520 / -40.503.210 gibi günlük değerler veriyor ve bunlar AUM
  aritmetiğiyle %0,001 içinde uyuşuyor. Bu requirement fon başına olanı kullanır.
- `/funds/volatility/` kayan bir pencere döndürür (2025-04-22'den beri). Pencereden
  düşen geçmiş kaynakta kalmaz; saklanmazsa kalıcı olarak kaybedilir.

## Takip listesi başlangıç verisi

Başlangıçta, hâlâ pozisyon tutulan **26 fon** listeye alınır. Kodlar fintables
evreninde doğrulandı.

```text
AFS AFT CPT DFI DOH FJB GBZ GPG GUH ICH IJC IKP IVY KHA PIL PNU
PTO RBR TAU THF TLY TMG TP2 YAY YIT YZC
```

Tamamen kapanmış 10 fon (AOY, GNS, GZH, HRZ, IAE, PBR, PHE, PRY, VPS, YJH)
başlangıç listesine alınmaz.

Liste sabit değildir: fon eklenip çıkarılabilmeli, `status` alanı sahip olunan
ile yalnız izlenen fonu ayırt etmelidir.

## Veri modeli

```text
dim_fund(fund_code PK, title, fund_type, type, management_company_id, is_byf,
         first_seen_at, last_seen_at)          -- tüm evren, arama ve tarama için

dim_fund_terms(fund_code PK, tax_pct, management_fee_pct,
               buy_valor_days, sell_valor_days, risk, updated_at)

watchlist(fund_code PK, status, added_at, note)  -- status: owned | watching

fact_fund_daily(fund_code, trade_date,
                nav_per_share, daily_return_pct, net_flow,
                shares_active, investor_count, aum,
                source, ingest_run_id, updated_at,
                PRIMARY KEY (fund_code, trade_date))

fact_fund_allocation(fund_code, as_of_date, asset_class, weight_pct,
                     PRIMARY KEY (fund_code, as_of_date, asset_class))

fact_fund_yield_snapshot(fund_code, as_of_date,
                         yield_1m, yield_3m, yield_6m, yield_ytd,
                         yield_1y, yield_3y, yield_5y,
                         PRIMARY KEY (fund_code, as_of_date))

ingest_run(id, source, started_at, finished_at, status, rows_upserted, last_error)
```

- `fact_fund_daily` **yalnızca takip listesindeki** fonlar için doldurulur.
- `fact_fund_yield_snapshot` tüm evren için doldurulur; bir seri değil, gün gün
  biriken snapshot'tır ve `/funds/yield/` geçmiş vermediği için tarih ancak
  böyle birikir.
- Getiri ve kâr/zarar tabloya yazılmaz, `analytics` view'larında hesaplanır.

## Kapsam

- `package.json`: `pg` ve `impit` runtime dependency, test runner, `db:migrate`
  ve collector script'leri. Lockfile commit edilir.
- ORM yok. `db/migrations/NNN_*.sql` dosyalarını isim sırasıyla, her birini tek
  transaction içinde uygulayan, uygulananı atlayan minimal runner.
- fintables istemcisi: parse fonksiyonları network'ten bağımsız ve fixture ile
  test edilebilir; ağ katmanı tek sınıfta.
- Collector oneshot çalışır, her run bir `ingest_run` satırı bırakır, fon başına
  hata izole edilir, istekler sıralı ve throttle'lı atılır.
- Yazma idempotent olmalı: aynı run iki kez çalıştığında satır sayısı değişmez.
- Takip listesini besleyecek bir seed yolu bulunmalı; başlangıçtaki 36 fon
  bununla yüklenir.
- `factory.config.json` `allowedPaths` listesine `package.json` eklenir.
- `.env` içindeki `DATABASE_URL` RQ-0001'in kurduğu instance'ı göstermelidir.

## Acceptance Criteria

- [ ] Migration'lar `pnpm db:migrate` ile uygulanır; ikinci çalıştırma hiçbir
      migration uygulamaz ve hata vermez.
- [ ] Şema yukarıdaki tabloları içerir; `fact_fund_daily` primary key'i
      `(fund_code, trade_date)`'dir.
- [ ] fintables istemcisi `impit` ile 200 alır; headless browser bağımlılığı yoktur.
- [ ] Parse fonksiyonları kaydedilmiş fixture'larla test edilir; `null` değeri
      kabul eder, alan eksikliğinde hata verir.
- [ ] 26 fon takip listesine yüklenir; listeye fon eklenip çıkarılabilir ve
      collector listeyi kaynak alır.
- [ ] Collector yalnız takip listesindeki fonlara istek atar; evren dışındaki
      fonlar için `fact_fund_daily` satırı üretilmez.
- [ ] Takip listesindeki her fon için NAV, günlük getiri serisi, günlük net akış
      serisi, varlık dağılımı ve fon şartları (stopaj, valör, yönetim ücreti)
      yazılır.
- [ ] `/funds/yield/` snapshot'ı tüm evren için günde bir kez yazılır.
- [ ] Collector iki kez çalıştırıldığında `fact_fund_daily` satır sayısı değişmez.
- [ ] Her run `ingest_run`'a satır yazar; bir fonun hatası run'ı durdurmaz,
      `status` `partial` olur.
- [ ] Bir `analytics` view'ı takip listesindeki fonların son NAV'ını, son günlük
      getirisini ve son net akışını tek sorguda verir.
- [ ] Kaynak keşfi ve doğrulanan davranışlar örnek payload'larla `references/`
      altına kaydedilir.
- [ ] Yapılandırılmış quality gate'ler (typecheck, test, build) geçer.

## Kapsam Dışı

- Portföy kayıtları: alım/satım işlemleri, adet, platform, maliyet. Kullanıcı
  bunları arayüz hazır olduğunda girecek; tablo ve içe aktarma o requirement'ta.
- Kâr/zarar hesabı (stopaj ve ücret düşülmüş net getiri).
- Web arayüzü, portföy ekranı ve raporlama.
- Sinyal üretimi, eşik hesabı, uyarı ve öneri.
- Tüm fon evreni için günlük seri toplamak.
- TEFAS ve fvt kaynakları, kaynaklar arası çelişki çözümü.
- Collector'ın sunucuya deployment'ı ve zamanlanmış çalıştırılması.


## Constraints

```json
{}
```
