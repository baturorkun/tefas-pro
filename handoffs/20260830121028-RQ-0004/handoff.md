# Manual Handoff

Run ID: `20260830121028-RQ-0004`

Use this handoff in the manual implementation flow when you want an external implementer to complete the requirement without running the AI Factory agent pipeline.

## Instruction for Implementer

Read the requirement and constraints below, inspect the target project, implement the change directly in the workspace, and run the configured local checks. Do not call the AI Factory LLM pipeline for this task.

## Target Project

- Root: /Users/batur/Documents/Projects/bytecraft/agentic/tefas-pro
- Profile: vanilla-typescript
- Usual paths: public, src, tests, db, Dockerfile, nginx.conf, .dockerignore, .gitlab-ci.yml, .github/workflows, tsconfig.json, tsconfig.build.json, collector, package.json, vitest.config.ts (where the requirement work normally belongs; a handoff capture is not restricted to them)
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
- db/watchlist.txt
- docs/superpowers/plans/2026-08-29-tefas-pro-bootstrap.md
- docs/superpowers/specs/2026-08-29-tefas-pro-bootstrap-design.md
- factory.config.json
- nginx.conf
- package.json
- pnpm-lock.yaml
- public/index.html
- references/README.md
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
- server/Containerfile
- server/install.sh
- src/collector.ts
- src/db/migrate.ts
- src/db/pool.ts
- src/db/seed.ts
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
id: RQ-0004
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-08-30T11:33:22.029Z"
branch: "factory/RQ-0004"
createdFromCommit: "def22ef1fd72c22ab5ebab459bb3652834845719"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/8"
githubPullRequestIid: 8
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/7"
githubIssueIid: 7
repositoryProvider: github
---
# RQ-0004 - Kullanıcı, login ve portföy girişi

Projenin ilk kullanıcı arayüzü ve ilk kimlik doğrulaması. Bugüne kadar yalnız
veri toplandı; burada veriyi kullanan insan tarafı başlıyor.

İki menü olur: yönetim işleri için **admin menüsü**, herkese açık **portföy
menüsü**. Portföy menüsünde kullanıcı hangi fonu, kaç pay, ne zaman, hangi
bankadan aldığını girer; sattıysa satış tarihini yazar.

## Bu requirement neden büyük

Projede şu an HTTP sunucusu yok. `src/main.ts` tarayıcıda çalışan birkaç satır,
kök `Dockerfile` nginx ile statik dosya servis ediyor. Login bir sunucu ister:
parola doğrulama, oturum, yetki kontrolü. Yani burada hem sunucu katmanı, hem
kimlik doğrulama, hem de ilk ekranlar birlikte geliyor.

Bölünebilir: sunucu + kimlik doğrulama bir requirement, ekranlar bir sonraki.
Tek parça istenirse aşağıdaki kapsam geçerlidir.

## Sunucu

Tek bir Node HTTP sunucusu hem API'yi hem statik dosyaları servis eder. nginx
şimdilik devre dışı kalır; ileride önüne konabilir. Gerekçe: iki süreç yerine
bir süreç, ve oturum çerezinin aynı origin'den gelmesi.

Sunucu veritabanına RQ-0001'in kurduğu instance üzerinden bağlanır; collector
ile aynı `DATABASE_URL` biçimi kullanılır.

**Sunucu da container'da çalışır.** Collector'ınkiyle aynı desen: Debian tabanlı
Node image, compose ağına katılıp `postgres:5432`'ye bağlanır, parola
`--env-file` ile verilir. Collector'dan farkı oneshot değil uzun ömürlü
olmasıdır: ayakta kalır, port dinler, `restart: unless-stopped` ile yönetilir ve
healthcheck taşır. Yerel geliştirme için container'sız `pnpm serve` de çalışır.

## Kimlik doğrulama

- **Parola hash'i Node'un yerleşik `crypto.scrypt`'i ile üretilir.** Ek bağımlılık
  gerekmez; her kullanıcı için ayrı salt saklanır. Parola hiçbir yerde düz metin
  tutulmaz, log'a ve hata mesajına yazılmaz.
- **Oturum veritabanında tutulur.** Çerez yalnız oturum kimliğini taşır;
  `HttpOnly`, `SameSite=Lax`, üretimde `Secure`. Veritabanında tutulması oturumun
  iptal edilebilmesi içindir — parola değişince veya kullanıcı pasife alınınca
  açık oturumlar kapanır.
- Oturumun bir sona erme süresi olur ve süresi geçmiş oturum kabul edilmez.
- Başarısız giriş denemesi, kullanıcı adının var olup olmadığını sızdırmayan tek
  bir mesaj döndürür.

### Admin kullanıcısı

- Sistem ilk kez ayağa kalktığında `admin` adında, tipi `admin` olan bir
  kullanıcı otomatik oluşur.
- **Sabit varsayılan parola kullanılmaz.** Parola `ADMIN_INITIAL_PASSWORD`
  ortam değişkeninden alınır; verilmemişse rastgele üretilip sunucu log'una bir
  kez yazılır ve kullanıcı ilk girişte parolasını değiştirmeye zorlanır.
- Kullanıcı adı `admin` olması bir ayrıcalık taşımaz; yetkiyi belirleyen `type`
  alanıdır. Başka kullanıcılar da `admin` tipinde olabilir.
- Son admin'in tipi düşürülemez veya pasife alınamaz; sistem yönetici­siz kalmaz.

## Menüler

### Admin menüsü (yalnız `type = admin`)

- Takip listesini görüntüleme: fon kodu, unvan, durum, son NAV, son günlük
  getiri, son net akış.
- Kullanıcı listesi.
- Kullanıcı oluşturma ve düzenleme: kullanıcı adı, tip, aktif/pasif, parola
  belirleme.

### Portföy menüsü (tüm kullanıcılar)

Kullanıcı kendi işlemlerini girer, düzenler ve siler. Bir işlem şunları taşır:

| Alan | Açıklama |
|---|---|
| Fon kodu | Zorunlu |
| Alış tarihi | Zorunlu |
| Adet (pay) | Zorunlu. Kullanıcının verdiği listede bu alan **adet**tir, TL değil (TLY 67 adet × 9.145,58 TL doğrulandı) |
| Banka / platform | Zorunlu. Aynı fon farklı platformlarda ayrı tutulur: Fiba, Nkolay, Nkolay-B, YKB |
| Satış tarihi | Boş bırakılabilir; boşsa pozisyon açıktır |

Her kullanıcı yalnız kendi işlemlerini görür ve değiştirir. Admin başka bir
kullanıcının işlemlerini bu requirement'ta göremez.

### Girilen fon otomatik takip listesine alınır

Kullanıcının geçmişindeki fonların bir kısmı şu an takip listesinde yok
(tamamen kapanmış 10 fon: AOY, GNS, GZH, HRZ, IAE, PBR, PHE, PRY, VPS, YJH) ve
`dim_fund` yalnız 26 fon taşıyor. Portföye girilen fon otomatik olarak
`dim_fund` ve `watchlist`'e eklenir; böylece bir sonraki collector koşusu o
fonun verisini de toplamaya başlar. Fon kodu geçerliliği `/funds/` üzerinden
doğrulanır.

## Veri modeli

```text
app_user(id PK, username UNIQUE, password_hash, password_salt,
         type CHECK (type IN ('admin','user')), is_active,
         must_change_password, created_at, updated_at)

app_session(id PK, user_id FK, created_at, expires_at, revoked_at)

portfolio_transaction(id PK, user_id FK, fund_code FK -> dim_fund,
                      platform, trade_date, units,
                      sell_date NULL, note, created_at, updated_at)
```

- `units` ondalık taşır; bazı platformlar kesirli pay veriyor.
- `sell_date` NULL ise pozisyon açıktır.
- Kâr/zarar bu requirement'ta hesaplanmaz; alanlar hesabın sonraki requirement'ta
  yapılabilmesi için yeterlidir.

## Kapsam

- Node HTTP sunucusu: API uçları ve statik dosya servisi, `pnpm serve` script'i.
- `crypto.scrypt` ile parola hash'leme ve doğrulama.
- Oturum tablosu, çerez yönetimi, yetki kontrolü (admin uçları admin ister).
- Migration'lar: `app_user`, `app_session`, `portfolio_transaction`.
- İlk admin kullanıcısının otomatik oluşturulması.
- Login ekranı, admin menüsü ve portföy ekranı.
- Portföye girilen fonun `dim_fund` ve `watchlist`'e eklenmesi.
- `server/Containerfile`: Debian tabanlı Node image, uzun ömürlü servis,
  healthcheck. Compose ağına katılır; portu yalnız `127.0.0.1`'e bind edilir.
- `server/install.sh local|remote`, `collector/install.sh` ile aynı arayüz.
- `.env.example` güncellemesi: `ADMIN_INITIAL_PASSWORD`, `PORT`, `SESSION_TTL`.

## Acceptance Criteria

- [ ] Migration'lar `pnpm db:migrate` ile uygulanır; ikinci çalıştırma hiçbir
      migration uygulamaz.
- [ ] Sunucu ilk açılışta `admin` adlı, `type = admin` bir kullanıcı oluşturur;
      ikinci açılış ikinci bir admin oluşturmaz.
- [ ] Admin parolası sabit bir varsayılan değildir: `ADMIN_INITIAL_PASSWORD`
      verilmişse o kullanılır, verilmemişse rastgele üretilip bir kez log'a
      yazılır ve ilk girişte değiştirilmesi istenir.
- [ ] Parola veritabanında düz metin tutulmaz; aynı parolayı kullanan iki
      kullanıcının hash'i farklıdır (salt).
- [ ] Doğru parolayla giriş oturum çerezi verir; yanlış parola vermez ve hata
      mesajı kullanıcının var olup olmadığını sızdırmaz.
- [ ] Çerez `HttpOnly` ve `SameSite` taşır; oturum kimliği dışında veri taşımaz.
- [ ] Süresi geçmiş veya iptal edilmiş oturumla korumalı uca erişilemez.
- [ ] `type = user` olan kullanıcı admin uçlarına erişemez (403), menüde de
      görmez.
- [ ] Admin kullanıcı listeler, kullanıcı oluşturur ve düzenler; oluşturulan
      kullanıcı giriş yapabilir.
- [ ] Admin takip listesini son NAV, son günlük getiri ve son net akışla görür.
- [ ] Son admin'in tipi düşürülemez veya pasife alınamaz.
- [ ] Kullanıcı işlem ekler, düzenler, siler; satış tarihi boş bırakılan satır
      açık pozisyon olarak görünür.
- [ ] Bir kullanıcı başka kullanıcının işlemlerini göremez ve değiştiremez.
- [ ] Takip listesinde olmayan bir fon koduyla işlem girilince fon `dim_fund` ve
      `watchlist`'e eklenir; geçersiz kod reddedilir.
- [ ] Sunucu container içinde ayağa kalkar, compose ağından `postgres:5432`'ye
      bağlanır ve portu yalnız `127.0.0.1`'e bind edilir.
- [ ] Container yeniden başlatıldığında açık oturumlar geçerliliğini korur;
      oturum veritabanında tutulduğu için süreç yeniden başlaması oturum düşürmez.
- [ ] Yapılandırılmış quality gate'ler (typecheck, test, build) geçer.

## Kapsam Dışı

- Kâr/zarar hesabı, stopaj ve ücret düşülmüş net getiri, raporlama.
- Sinyal üretimi, uyarı ve öneri.
- Parola sıfırlama e-postası, çok faktörlü doğrulama, harici kimlik sağlayıcı.
- Admin'in başka kullanıcıların portföyünü görüntülemesi.
- CSV/TSV toplu işlem içe aktarma.
- Sunucunun uzak ortama deployment'ı ve TLS sonlandırma.


## Constraints

```json
{}
```
