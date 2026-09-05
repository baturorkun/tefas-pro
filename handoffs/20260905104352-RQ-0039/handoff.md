# Manual Handoff

Run ID: `20260905104352-RQ-0039`

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
- scripts/resolve-deployment-target.sh
- scripts/write-version.ts
- server/Containerfile
- server/install.sh
- src/collector.ts
- src/db/migrate.ts
- src/db/pool.ts
- src/db/seed.ts
- src/db/user.ts
- src/fifo.ts
- src/limits.ts
- src/main.ts
- src/server/auth.ts
- src/server/http.ts
- src/server/index.ts
- src/server/repository.ts
- src/settlement.ts
- src/sources/fintables.ts
- src/styles.css
- src/version.ts
- templates/.gitkeep
- tests/allocation.test.sh
- tests/allocation.test.ts
- tests/auth.test.ts
- tests/bank.test.sh
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
- tests/headline.test.sh
- tests/http.test.ts
- tests/performance.test.ts
- tests/periods.test.ts
- tests/position-open.test.sh
- tests/settings.test.sh
- tests/settlement.test.ts
- tests/transaction-detail.test.sh
- tests/ui-conventions.test.ts
- tests/user-clone.test.sh
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
id: RQ-0039
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-05T10:25:46.637Z"
branch: "factory/RQ-0039"
createdFromCommit: "248d7aafbf7371348890ab6b460f619f8baf823a"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/78"
githubPullRequestIid: 78
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/77"
githubIssueIid: 77
repositoryProvider: github
---
# RQ-0039 - Fon hisse kırılımı ve portföy geneli hisse ağırlığı

Fonların hangi hisseleri tuttuğu bilinmiyor. Asıl soru tek fon değil toplam:
beş ayrı fon aldın diye çeşitlendirdiğini sanıyorsun ama beşi de aynı hisseyi
tutuyorsa aslında tek hisseye yüklenmişsin. Bu ancak fonların içi açılıp
toplanınca görünüyor.

RQ-0038 varlık **türü** kırılımını getirdi ("paranın %36,4'ü hisse"). Bu RQ bir
kat daha aşağı iniyor: o hissenin hangi hisseler olduğu.

## Kaynak: fvt.com.tr, araştırıldı ve doğrulandı

TEFAS kalem düzeyinde veri yayımlamıyor. Fintables'ın `info` ucunda da yok —
yalnız varlık sınıfı var, RQ-0038 onu kullanıyor.

fvt.com.tr'de var ve düzgün bir JSON API'si mevcut:

    GET https://fvt.com.tr/api/funds/{KOD}/distribution
    Başlık: x-device-id: <rastgele 16 hex>

Token veya oturum gerekmiyor; `x-device-id` tek özel başlık. `/api/app-token`
diye bir uç var ama bu çağrı için gerekmiyor — doğrulandı.

KHA için ölçülen yanıt: 74 kalem, her biri `hisseKodu`, `agirlik`, `sirketAdi`,
`sektorAdi`, `eskiAgirlik`, `fark`. `meta.aciklamaTarihi` ve `oncekiAy/oncekiYil`
alanları var.

`distribution` yanıtındaki fiyat alanları (`fiyat`, `oran`, `degisim`) hep
`0.00` dönüyor — ölçüldü, token'lı çağrıda da boş. Site bu kolonu ayrı bir
uçtan dolduruyor.

## Hisse fiyatı: ikinci uç, aynı API

    GET https://fvt.com.tr/api/stocks/chart-data?symbols=ASELS,AKBNK&range=1M

Günlük kapanışları tarihleriyle veriyor. Ölçülen:

    ASELS   6 Ağustos 353,75 → 3 Eylül 388,25  = %+9,75  (21 gün)
    AKBNK   6 Ağustos  67,40 → 3 Eylül  71,85  = %+6,60

Uç **istek başına 10 sembolle sınırlı**: 60 sembol gönderildi, 10 döndü.
Portföydeki fonlarda birleşik birkaç yüz farklı hisse var, yani onlu gruplar
hâlinde ~30 istek — collector'ın bugün 39 fon için attığından az.

Bu uç olmadan hisse kırılımı yarım kalıyor: "ASELS %6,1 ağırlığın var" deyip
ASELS'in ne yaptığını söyleyememek, kullanıcıyı siteye geri gönderir.

## Veri aylık, günlük değil

Bu tasarımı belirleyen kısıt. `meta` alanı Ağustos portföyünün 2 Eylül'de
açıklandığını söylüyor. Ölçülen fark:

    fvt   KHA hisse ağırlıkları toplamı   %90,50   (Ağustos sonu)
    biz   KHA "Hisse Senedi" sınıfı       %81,43   (4 Eylül, günlük)

Dokuz puanlık fark hata değil, zaman farkı — fon bir ay içinde hisse oranını
düşürmüş. Sonuç: hisse listesi bir aya kadar eski olabilir ve rapor bunu
söylemek zorunda. "Şu an THYAO'dasın" demek yanlış olur; "Ağustos sonunda
THYAO'daydın" doğru.

## Ölçeklenmez

RQ-0038'deki kuralın aynısı. Ay sonu ağırlıklarını bugünkü hisse sınıfı
oranına oturtmak sayıyı tutarlı gösterirdi ama uydurulmuş bir kesinlik olurdu.
Ham ağırlık kullanılır, fark ekranda söylenir.

## Ne raporlanır

Toplu ağırlık: her hisse için TL karşılığı, portföydeki payı ve kaç fon
üzerinden geldiği. "THYAO 214.300 ₺ · %8,4 · 6 fon" — RQ-0038'deki varlık türü
tablosunun bir kat aşağısı, aynı biçim.

Fon çakışması: iki fonun portföyü büyük ölçüde aynıysa iki yönetim ücreti
ödenip tek pozisyon taşınıyor demektir. Bu, hisse listesine bakarak
görülmeyen ama listeden hesaplanabilen bir bilgi ve doğrudan aksiyon üretiyor.

## Hisseden fona arama

Asıl kullanım şu: bir hisse hareketleniyor, o hisseyi taşıyan fonu artırmak
ya da azaltmak istiyorsun. Bu, toplanan verinin ters indeksi — hisse kodundan
fonlara.

    ASELS →  THF  %6,1  portföyümde 307.930 ₺
             KHA  %4,6  portföyümde 118.400 ₺
             DFI  %3,2  takip listemde, pozisyon yok

Fiyat verisi gerektirmiyor: hissenin hareketini kullanıcı piyasadan biliyor,
uygulamanın cevapladığı soru "o hisse hangi fonlarımda, ne ağırlıkta".

Takip listesindeki ama pozisyon açılmamış fonlar da listelenir — "hangi fonu
alayım" sorusunun cevabı orada olabilir.

Kapsam takip edilen fonlarla sınırlı. "Bu hisseyi en çok tutan fon hangisi"
diye tüm evrene sormak fon başına bir istek demek ve evren binlerce fon;
o ayrı bir iş. "Hangi fonumu artırayım" sorusu zaten kendi fonları arasından
cevaplanıyor.

## Yön değişimi

`eskiAgirlik` ve `fark` fonların pozisyonu artırıp azaltmadığını söylüyor.
"Fonlar geçen ay ASELS'i azaltmış" bilgisi kâr değil ama karar için değerli ve
veri zaten yanıtta — ek maliyeti yok.

Sektör kırılımı da bedava geliyor: `sektorAdi` alanı yanıtta.

## Kâr dağıtımı bu RQ'da yok

"ASELS'ten ne kazandık" bu veriden çıkmıyor. Fonun kârını hisselere dağıtmak
için hissenin fiyat değişimi gerekiyor; bizde fon NAV'ı var, hisse fiyatı yok.
Hesaplanabilir hali `ağırlık × hissenin dönem getirisi × fon değeri` olurdu ve
bu bir yaklaşım kalırdı: ağırlıklar aylık, fon ay içinde alıp satıyor. Fon
ASELS'i ayın ortasında satmışsa biz hâlâ tutuyormuş gibi hesaplardık.

Alarm kuralları da burada değil. Günlük fiyat bu RQ ile toplanacağı için veri
hazır olacak; eksik olan kuralın kendisi. "Üç gün üst üste %8 düştü" iyi bir
başlangıç ama tanımı netleştirmek gerekiyor: hissenin kendi düşüşü mü, yoksa
kullanıcının o hisseye maruziyetinin kaybı mı? %8 düşen ama portföyde %0,3
ağırlıklı bir hisse için alarm gürültüdür. Ayrı RQ.

## İki yeni sayfa, mevcut ekranlara dokunulmadan

Portföyüm ve Dağılım olduğu gibi kalıyor. RQ-0038'in Portföyüm'e koyduğu
açılır satır da duruyor — küçük ve işini görüyor. Bu RQ yalnız ekliyor.

**Fon sayfası.** Uygulamada bugün fon detay sayfası yok: fon kodu beş ekranda
geçiyor ama hiçbirinde açılamıyor. Fonun kendi hisselerinin doğal yeri burası.

    THF · TERA PORTFÖY HİSSE SENEDİ FONU
    Hisse Senedi %88,23 · Yatırım Fonları %7,88 · Vadeli Nakit %3,87
    ──────────────────────────────────────────────────────────────
    Hisse  Şirket      Sektör    Ağırlık  Önceki Ay  Fark    1A
    ASELS  Aselsan     Savunma    %6,10     %5,40    +0,70  +9,8%
    ...74 kalem

Fon kodunun geçtiği yerlerden buraya gelinir. Portföyüm'ün açılır satırına da
bir bağlantı eklenir; oradaki varlık türleri kalır, hisse listesi buraya gider
— 74 kalem açılır satırda okunmaz ve her fon satırında tekrarlanırdı.

**Hisseler sayfası.** Farklı bir soru: tek fon değil, portföyün tamamı.

    HİSSELER                          Ağustos sonu ağırlıklarıyla · aylık
    [Hisse] [Sektör]                            ara: [ASELS       ]

    Hisse  Şirket        Sektör     Değer      Ağırlık  Fon   1A
    ASELS  Aselsan       Savunma   214.300 ₺   %5,7  ▓▓▓  4  +9,8%
    THYAO  Türk Hava Y.  Ulaştırma 187.400 ₺   %5,0  ▓▓   6  −2,1%
    TOPLAM 287 hisse               2.140.900 ₺  %56,8

Satır açılınca hisseden fona geçilir:

    ASELS ▼
       THF  %6,1  307.930 ₺  portföyümde
       KHA  %4,6  118.400 ₺  portföyümde
       DFI  %3,2       —     takip listemde, pozisyon yok

Kullanım şu: bir hisse hareketlendi, hangi fonu artıracağını buradan
buluyorsun. Pozisyonu olmayan takip listesi fonları da görünüyor çünkü cevap
orada olabilir.

Hisse ⇄ Sektör geçişi aynı tabloda bir düğme: aynı veri, iki gruplama.

Çakışma ayrı panel:

    THF ⇄ KHA   18 ortak hisse   %34 örtüşme   ikisi de portföyünde

Toplam ağırlığın %100 olmaması normaldir ve söylenmelidir: portföyün gerisi
tahvil, repo, mevduat — hisse zaten değil.

## Kapsam

Yalnız hisse tutan fonlar kalem düzeyinde veri veriyor. Para piyasası ve
tahvil fonlarında bu uç boş dönebilir; rapor kapsanmayan tutarı söylemeli —
RQ-0038'deki kuralın aynısı.

## Acceptance Criteria

- Fon başına hisse kırılımı toplanır ve saklanır: hisse kodu, şirket adı,
  sektör, ağırlık, önceki ay ağırlığı ve fark.
- Hisse günlük kapanışları toplanır ve saklanır; getiri fiyattan hesaplanır,
  kaynağın hazır getiri alanına bağlanılmaz.
- Fiyat istekleri onarlı gruplar hâlinde atılır; uç istek başına 10 sembol
  döndürüyor.
- Fiyatı bulunamayan hisse hata sayılmaz; ağırlığı yine gösterilir.
- Açıklama tarihi kayıtla birlikte saklanır; hangi aya ait olduğu kaybolmaz.
- Toplama collector'a bağlanır; ayrı bir elle çalıştırma gerektirmez.
- İstekler `x-device-id` başlığıyla ve mevcut throttle kuralıyla atılır; fon
  başına tek istek.
- Kalem düzeyinde veri vermeyen fon hata sayılmaz; koşum bu yüzden düşmez.
- Portföy geneli hisse ağırlığı raporlanır: hisse başına TL, portföydeki pay
  ve kaç fondan geldiği.
- Ağırlıkların hangi tarihe ait olduğu raporda yazılır ve aylık olduğu
  belirtilir.
- Ağırlıklar bugünkü hisse sınıfı oranına ölçeklenmez; fark söylenir.
- Kalem verisi olmayan fonların tutarı kapsam dışı olarak yazılır, sessizce
  düşmez.
- Sektör kırılımı aynı tabloda bir geçişle gösterilir; ayrı panel açılmaz.
- Hisse toplamının portföyün tamamı olmadığı ekranda belirtilir.
- Fon sayfası eklenir: fonun varlık dağılımı ve hisse listesi orada durur.
- Fon koduna tıklanan yerlerden fon sayfasına gidilir.
- Mevcut ekranlar bozulmaz: Portföyüm ve Dağılım olduğu gibi çalışmaya devam
  eder, RQ-0038'in açılır satırı kalır; oraya yalnız fon sayfası bağlantısı
  eklenir.
- Fonların bir önceki aya göre pozisyonu artırıp azalttığı gösterilir.
- Hisse kodundan fonlara arama yapılabilir: o hisseyi taşıyan fonlar,
  ağırlıkları ve kullanıcının o fondaki pozisyonu listelenir.
- Hisse başına getiri gösterilir; hangi dönemin getirisi olduğu yazılır.
- Aramada takip listesindeki pozisyonsuz fonlar da görünür; "hangi fonu
  alayım" sorusunun cevabı orada olabilir.
- Aramanın takip edilen fonlarla sınırlı olduğu belirtilir.
- Hisse fiyatı toplanmaz ve kâr dağıtımı yapılmaz; ikisi de ayrı RQ.
- Fon çakışması gösterilir: aynı hisseyi taşıyan fonlar ve örtüşme oranı.


## Constraints

```json
{}
```
