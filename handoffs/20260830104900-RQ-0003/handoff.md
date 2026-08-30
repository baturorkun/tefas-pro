# Manual Handoff

Run ID: `20260830104900-RQ-0003`

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
- db/migrations/001_collation.sql
- db/migrations/002_ingest.sql
- db/migrations/003_dimensions.sql
- db/migrations/004_watchlist.sql
- db/migrations/005_facts.sql
- db/migrations/006_analytics.sql
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
- src/collector.ts
- src/db/migrate.ts
- src/db/pool.ts
- src/db/seed.ts
- src/main.ts
- src/sources/fintables.ts
- src/styles.css
- templates/.gitkeep
- tests/collector.test.ts
- tests/db-install.test.sh
- tests/fintables.test.ts
- tests/fixtures/fintables-TLY-cashflow.json
- tests/fixtures/fintables-TLY-info.json
- tests/fixtures/fintables-TLY-price.json
- tests/fixtures/fintables-TLY-volatility.json
- tests/fixtures/fintables-funds-sample.json
- tests/fixtures/fintables-yield-sample.json
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
id: RQ-0003
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-08-30T10:33:54.035Z"
branch: "factory/RQ-0003"
createdFromCommit: "2e73efd1656dcb792d760c29715802d038ac03fd"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/6"
githubPullRequestIid: 6
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/5"
githubIssueIid: 5
repositoryProvider: github
---
# RQ-0003 - Collector oneshot container ve her gece çalışan sync

RQ-0002'nin collector'ını elle çalıştırmak yerine, her gece kendi kendine
çalışan bir oneshot container haline getirmek. Hem yerel macOS geliştirme
makinesinde hem de uzak Linux sunucuda aynı tanım üzerinden, Podman ile.

Oneshot demek: container başlar, veriyi toplar, çıkar. Ayakta duran bir servis
yoktur; zamanlamayı systemd timer yapar. Böylece çöken veya asılan bir run
sonraki gece temiz bir container'la yeniden dener.

## Neden ayrı bir image

Depodaki mevcut `Dockerfile` web uygulaması içindir (nginx, statik dosya
servisi). Collector'ın çalışma zamanı ihtiyacı bambaşka: Node, `pg` ve `impit`.
`impit` native bir modüldür ve prebuilt binary'si glibc'ye bağlıdır; alpine
(musl) tabanlı image'da çalışmayabilir. Bu yüzden ayrı bir `Containerfile` ve
Debian tabanlı bir Node image kullanılır.

## Ağ ve yapılandırma

Collector veritabanına container ağı üzerinden bağlanır. RQ-0001'in compose
tanımı `postgres` servis adını ve kendi ağını oluşturuyor; collector aynı ağa
katılıp `postgres:5432` adresini kullanır. Host portuna (`127.0.0.1:5434`)
bağlanmaz — o adres container içinden erişilebilir değildir.

`DATABASE_URL` parola taşır. Bir env dosyasında `0600` izinle tutulur, komut
satırına veya log'a yazılmaz, Git'e girmez.

## Zamanlama

systemd timer her gece tetikler. Gecelik çalışmanın iki gereği var:

- **Rastgele gecikme.** Sabit dakikada atılan istekler kaynak tarafında düzenli
  bir imza bırakır; timer'a `RandomizedDelaySec` verilir.
- **Kaçırılan run telafisi.** Sunucu kapalıyken geçen tetikleme `Persistent=true`
  ile açılışta yakalanır. Collector idempotent olduğu için tekrar çalışması
  zararsızdır.

Eşzamanlı iki run olmamalıdır: systemd `Type=oneshot` bunu zaten engeller, ama
elle tetikleme de aynı korumayı almalıdır.

## Kurulum

`collector/install.sh`, RQ-0001'deki `db/install.sh` ile aynı arayüzü izler:

```text
collector/install.sh local
collector/install.sh remote <user@host> [-p ssh-port] [-d remote-dir] [--no-timer]
collector/install.sh --help
```

- `local`: image'ı build eder, env dosyasını hazırlar, bir kez çalıştırıp
  doğrular. macOS'ta systemd yoktur; yerelde zamanlama kurulmaz, yalnız elle
  çalıştırma ve doğrulama yapılır.
- `remote`: image'ı sunucuda build eder (ya da yerelde build edip aktarır),
  service ve timer unit'lerini kurar, enable eder ve bir doğrulama koşusu yapar.
- `--no-timer`: unit kurmadan yalnız image ve env hazırlar.
- Her iki mod da tekrar çalıştırıldığında idempotent olmalı, veri volume'una
  dokunmamalı ve duplicate unit veya container bırakmamalıdır.

## Çalıştırma sonucunun görünürlüğü

- Collector zaten her run için `ingest_run` satırı yazıyor; container bunu
  değiştirmez.
- Container exit kodu run sonucunu yansıtmalıdır: hiç fon toplanamadıysa sıfır
  dışı, kısmi başarıda sıfır (bazı fonların kaynakta olmaması normaldir).
- systemd unit çıktısı journal'a düşmeli; parola hiçbir çıktıda görünmemelidir.

## Kural: yalnız takip listesi veritabanına yazılır

Toplu endpoint'ler bütün evreni döndürür (`/funds/` 2822, `/funds/yield/` 2395
satır). Bunların tamamı **yazılmaz**; yanıt alınır, takip listesinde olmayan
satırlar atılır.

RQ-0002 bu kuralı zaman serisi için uyguluyor ama katalog ve getiri snapshot'ı
için uygulamıyor: şu an `dim_fund` 2822, `fact_fund_yield_snapshot` 2395 satır
taşıyor. Burada düzeltilir — her ikisi de takip listesiyle sınırlanır.

Sonucu: takip listesine yeni fon eklerken kod/unvan araması veritabanından
değil, o an `/funds/` çağrılarak yapılır. Fon ekleme seyrek ve etkileşimli bir
işlem olduğu için canlı çağrı uygundur.

## Toplanacak aralıklar

İstenen: son 1 yıl aylık, son 6 ay günlük. Ölçüm sonrası bunun karşılığı:

| Veri | Saklanan aralık | Kaynak | İstek |
|---|---|---|---|
| Günlük getiri | Fonun tüm geçmişi | `/funds/{KOD}/volatility/` | 1 / fon |
| Günlük net akış | **12 ay** | `/funds/{KOD}/cashflow/` | 1 / fon |
| Güncel NAV | Bugün | `/funds/{KOD}/price/` | 1 / fon |
| Şartlar + varlık dağılımı | Bugün | `/funds/{KOD}/info/` | 1 / fon |
| Günlük AUM, pay adedi, yatırımcı | Son 6 ay | Toplu günlük pencere | +2 / gece |
| Aylık AUM, pay adedi, yatırımcı | 7–12 ay öncesi | Toplu aylık pencere | 6 x 2, tek sefer |
| **Aylık getiri ve aylık net akış** | 12 ay | **Türetilir**, çekilmez | 0 |

### Neden günlük akış 6 değil 12 ay

Olculdu: `/funds/{KOD}/cashflow/` 6 ay icin 122 nokta / 6 KB, **12 ay icin 250
nokta / 11 KB** donduruyor - **ayni tek istekle**. 12 ay saklamanin ek istek
maliyeti yok, sadece 5 KB.

Bunun karsiliginda aylik akis 12 ay boyunca gunlukten turetilebilir hale gelir.
Bu tercih edilir cunku **API'nin kendi aylik akis rakami guvenilmez**: 2026
Temmuz'unda turetilen ile API'nin aylik penceresi %1-10 ayrisiyor
(DFI 10.835.398.590 / 10.981.794.194, IVY -43.504.155 / -48.465.329,
THF 134.014.631 / 131.118.476). Guvenilir olan turetilendir; RQ-0002'de fon
basina gunluk serinin AUM aritmetigiyle %0,001 icinde ustustu, toplu
endpoint'in ise 5 kat saptigi olculmustu.

### Neden aylik getiri hic cekilmez

Aylik getiri gunluklerin bilesigidir ve **birebir tutuyor**. 2026 Temmuz,
`exp(sum(ln(1+r)))-1` ile API'nin aylik penceresi dort ondalikta ayni:

| Fon | Turetilen | API | Fark |
|---|---|---|---|
| DFI | %14,0042 | %14,0042 | 0 |
| IVY | %-4,3217 | %-4,3217 | 0 |
| THF | %-3,1153 | %-3,1153 | 0 |

Aylik degerler tabloya yazilmaz, `analytics` view'inda hesaplanir - projenin
"turetilmis deger tabloya yazilmaz" kuraliyla tutarli.

## Gecelik çalışmada ne yeniden çekilir, ne çekilmez

Ölçüldü (2026-08-30):

| Endpoint | Aralık daraltılabiliyor mu | Yanıt boyutu |
|---|---|---|
| `/funds/{KOD}/volatility/` | **Hayır** — `start_date`/`end_date` ve `start`/`end` yok sayılıyor | TLY için 1258 nokta / 97 KB, her çağrıda |
| `/funds/{KOD}/cashflow/` | **Evet** | 6 ay 122 nokta / 6 KB, 5 gün 4 nokta / 0 KB |

Sonuçlar:

- **Getiri geçmişi her run'da tam gelir; seçenek yok.** API daraltmayı kabul
  etmiyor. İstek sayısı zaten fon başına sabit olduğu için bu ağ tarafında ek
  maliyet üretmiyor.
- **Nakit akışı artımlı çekilir.** Varsayılan aralık, o fon için saklanmış son
  günden birkaç gün geriye (geç gelen revizyonu yakalamak için örtüşme) bugüne
  kadardır. `--backfill` bayrağı tam aralığı yeniden çeker.
- **Tam çekim tamamen israf değildir.** Kaynak geçmiş bir değeri revize ederse
  veya bir gün eksik kalmışsa, tam çekim bunu kendiliğinden düzeltir. Bu yüzden
  volatility tarafındaki zorunlu tam çekim bir kayıp değil, bir güvence olarak
  değerlendirilir.
- **İsraf veritabanı tarafındadır.** Şu an her gece 23.294 satır yeniden
  yazılıyor, oysa yenisi ~26. Upsert, değeri değişmemiş satıra yazmamalıdır
  (`DO UPDATE ... WHERE` ile ayırt edilir); aksi halde tablo ölü satır biriktirir.

## Yan düzeltme: run artifact'leri test olarak koşuyor

RQ-0002'nin gate raporunda görüldü: `handoff-finish` test dosyalarını
`runs/<runId>/artifacts/tests/` altına kopyalıyor ve vitest bu kopyaları da
topluyor. 25 test 50 olarak koşuyor. Her run bir kopya daha ekleyeceği için
sayı büyür ve eski, artık geçerli olmayan test kopyaları da koşulmaya devam
eder. vitest yapılandırmasında `runs/` ve `handoffs/` hariç tutulur.

## Kapsam

- `collector/Containerfile` — Debian tabanlı Node image, üretim bağımlılıkları,
  derlenmiş çıktı veya `tsx` ile çalışma; entrypoint collector'ı koşar.
- `collector/install.sh` — yukarıdaki arayüz, macOS Bash 3.2 ile uyumlu.
- systemd service ve timer unit'leri (uzak kurulumda üretilir).
- `collector/.env.example` — `DATABASE_URL` ve varsa run parametreleri.
- `.dockerignore`'a collector build'i için gerekli düzenleme.
- vitest yapılandırması: `runs/` ve `handoffs/` hariç tutulur.
- Collector'a artımlı nakit akışı çekimi ve `--backfill` bayrağı eklenir.
- Collector fon büyüklüğü, pay adedi ve yatırımcı sayısını toplu pencere
  endpoint'lerinden günlük olarak toplar; `--backfill` bunları 6 ay geriye doldurur.
- `dim_fund` ve `fact_fund_yield_snapshot` takip listesiyle sınırlanır; mevcut
  fazla satırlar temizlenir.
- Aylık toplamları günlük seriden hesaplayan bir `analytics` view'ı eklenir.
- Günlük net akış aralığı 6 aydan 12 aya çıkarılır (ek istek maliyeti yok).
- Upsert, değeri değişmemiş satırı yeniden yazmaz.
- `factory.config.json` `allowedPaths` listesine `collector` eklenir.

## Acceptance Criteria

- [ ] `collector/Containerfile` Debian tabanlı bir Node image kullanır ve
      `impit` container içinde çalışır (build sırasında değil, çalışma anında
      doğrulanır).
- [ ] Image oneshot çalışır: `podman run --rm` ile başlar, veriyi toplar,
      çıkar; ayakta kalan bir servis bırakmaz.
- [ ] Container veritabanına compose ağı üzerinden `postgres:5432` ile bağlanır.
- [ ] `DATABASE_URL` env dosyasından okunur; dosya `0600` izinlidir, Git'e
      girmez ve parola log'da, komut satırında veya systemd çıktısında görünmez.
- [ ] `collector/install.sh --help` local ve remote modlarını belgeler;
      `bash -n` başarılıdır ve macOS Bash 3.2 ile uyumsuz özellik kullanılmaz.
- [ ] `collector/install.sh local` image'ı build eder ve bir doğrulama koşusu
      yapar; koşu `ingest_run` tablosuna satır yazar.
- [ ] `collector/install.sh remote <user@host>` service ve timer kurar, enable
      eder ve `systemctl` durumunu doğrular; `--no-timer` unit kurmaz.
- [ ] Timer her gece tetikler, `RandomizedDelaySec` taşır ve `Persistent=true`
      ile kaçırılan çalışmayı telafi eder.
- [ ] Kurulum iki kez çalıştırıldığında aynı unit ve image güncellenir;
      duplicate container, unit veya timer oluşmaz.
- [ ] Container exit kodu hiç fon toplanamadığında sıfır dışıdır.
- [ ] Arka arkaya iki koşu `fact_fund_daily` satır sayısını değiştirmez.
- [ ] İkinci koşu, değeri değişmemiş satırları yeniden yazmaz; yazılan satır
      sayısı ilk koşununkinin çok altındadır ve bu `ingest_run.rows_upserted`
      üzerinden görülür.
- [ ] Nakit akışı varsayılan olarak saklanmış son günden itibaren çekilir;
      `--backfill` tam aralığı yeniden çeker ve aynı sonucu üretir.
- [ ] `fact_fund_daily.aum`, `shares_active` ve `investor_count` takip
      listesindeki fonlar için günlük dolar; `--backfill` sonrası son 6 ayın iş
      günlerinde bu üç alan dolu olur.
- [ ] Toplu pencere endpoint'lerinin `cumulative_cashflow` alanı hiçbir yere
      yazılmaz; net akış yalnız fon başına endpoint'ten gelir.
- [ ] Bir run sonrası `dim_fund` ve `fact_fund_yield_snapshot` yalnız takip
      listesindeki fonları içerir; evrenin geri kalanı veritabanına yazılmaz.
- [ ] Bir `analytics` view'ı aylık net akış, aylık getiri ve aylık büyüklük
      değişimini son 12 ay için günlük seriden hesaplar; aylık getiri API'nin
      aylık penceresiyle dört ondalıkta uyuşur.
- [ ] Günlük net akış 12 ay saklanır; günlük AUM, pay adedi ve yatırımcı sayısı
      son 6 ay, aylık karşılıkları 12 ay için doludur.
- [ ] vitest `runs/` ve `handoffs/` altındaki dosyaları toplamaz; test sayısı
      kaynak ağacındaki testlerle aynıdır.
- [ ] Yapılandırılmış quality gate'ler (typecheck, test, build) geçer.

## Kapsam Dışı

- Web arayüzü ve onun image'ı; mevcut `Dockerfile` değiştirilmez.
- Portföy kayıtları, kâr/zarar hesabı, sinyal ve uyarı.
- Takip listesine arayüzden fon ekleme.
- Uzak sunucuda veritabanı kurulumu (RQ-0001 kapsamında).
- Log toplama, metrik, alerting altyapısı; journal yeterlidir.
- CI'dan otomatik image yayınlama (registry push).


## Constraints

```json
{}
```
