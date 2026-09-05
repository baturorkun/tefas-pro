---
id: RQ-0037
status: draft
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-05T08:23:20.430Z"
branch: "factory/RQ-0037"
createdFromCommit: "572a86c7226fbe0545b067a151a923dc2e79d496"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/74"
githubPullRequestIid: 74
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/73"
githubIssueIid: 73
repositoryProvider: github
---
# RQ-0037 - Collector image deploy pipeline'ında kurulsun

Collector image'ı `collector/install.sh` ile elle kuruluyor; deploy workflow'u
yalnız `tefas-pro-server` image'ını yeniliyor. Yani `src/collector.ts`'e yapılan
her değişiklik, biri sunucuda elle komut çalıştırana kadar üretime hiç
ulaşmıyor.

## Sessiz kalması asıl sorun

Bu 4 Eylül'de gerçekleşti. RQ-0033 `pnpm build`'e `scripts/write-version.ts`
çağrısı ekledi; collector Containerfile'ı `scripts` klasörünü kopyalamadığı için
build o günden itibaren patlıyordu:

    Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/scripts/write-version.ts'
    Error: building at STEP "RUN pnpm build"

Üç gün boyunca kimse fark etmedi. Sunucu eski image ile koşmayı sürdürdü, o
image RQ-0026'nın eklediği `funds_ok`/`funds_failed` alanlarını tanımıyordu ve
Collector Log'daki "Fon" sütunu boş kaldı. Belirti veriyle ilgili göründü, oysa
sebep bir build hatasıydı ve hata hiçbir yere düşmüyordu.

Build ve zamanlama düzeltmesi main'de yapıldı (572a86c). Bu RQ tekrarını
engellemekle ilgili: bozuk bir collector build'i CI'da düşmeli, üretimde
sessizce eski image bırakmamalı.

## Sunucu image'ının deseni hazır

Deploy workflow'u `tefas-pro-server` için gerekli her şeyi zaten yapıyor:
sürüm numarasını `requirements` klasöründen hesaplayıp `APP_REQUIREMENT` build
arg'ı olarak veriyor, image'ı slot etiketiyle kuruyor. Collector aynı desenle
kurulabilir; yeni bir mekanizma gerekmiyor.

## Slot ayrımı

Server image'ı slot başına etiketleniyor (`tefas-pro-server:<slot>`) çünkü
branch dağıtımları yan yana koşuyor. Collector oneshot ve systemd timer'ına
bağlı; timer yalnız `main` için anlamlı. Branch dağıtımlarında image kurulup
doğrulanmalı — build hatası orada yakalansın — ama timer'a yalnız `main`
dokunmalı, yoksa bir branch dağıtımı üretim zamanlamasını değiştirir.

## systemd'ye dokunmak

Timer ve service dosyaları `collector/install.sh` tarafından yazılıyor.
Workflow bunları yeniden üretmemeli; iki yerde duran systemd şablonu birbirinden
ayrışır. Workflow image'ı kurar, timer kurulumunu install.sh'in sorumluluğunda
bırakır — zamanlama değiştiğinde yine o çalıştırılır.

## Acceptance Criteria

- Deploy workflow'u her koşumda collector image'ını kurar; build hatası
  workflow'u düşürür.
- Collector build'i server image'ıyla aynı sürüm numarasını alır
  (`APP_REQUIREMENT`, `requirements` klasöründen).
- `main` dağıtımında sunucudaki `localhost/tefas-pro-collector:latest`
  yenilenir ve sonraki timer koşumu yeni image ile çalışır.
- Branch dağıtımlarında image kurulur ama systemd timer'a ve service'e
  dokunulmaz.
- Workflow systemd unit dosyası yazmaz; timer kurulumu `collector/install.sh`
  sorumluluğunda kalır.
- Slot temizliğinde branch'e ait collector image'ı da silinir; sunucuda
  etiketsiz image birikmez.
- Kurulum sonrası image'ın çalıştığı doğrulanır — en azından collector'ın
  başlayıp veritabanına bağlanabildiği görülür.
- `collector/install.sh` çalışmaya devam eder: sunucuya ilk kurulum ve
  zamanlama değişikliği hâlâ onunla yapılır.
