---
id: RQ-0006
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-08-30T19:47:33.696Z"
branch: "factory/RQ-0006"
createdFromCommit: "1f97b11205f00ce8bfde186e3924fbf1e7daf874"
completedRunId: "20260830194839-RQ-0006"
completedBy: "batur"
completedAt: "2026-08-30T20:00:08.994Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/12"
githubPullRequestIid: 12
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/11"
githubIssueIid: 11
repositoryProvider: github
---
# RQ-0006 - Collector kurulum sırası ve ingest_run kayıt doğruluğu

Uzak sunucuya ilk kurulumda ortaya çıkan dört sorun. Hiçbiri veriyi bozmuyor
ama `ingest_run` tablosu izleme yüzeyi olacak ve şu an yanıltıyor.

## 1. Kurulum kaçınılmaz olarak bir hata bırakıyor

`collector/install.sh remote` sırayla image build ediyor, systemd unit'lerini
kuruyor ve bir doğrulama koşusu yapıyor. Ama takip listesi ilk kurulumda boş
olduğu için o koşu her zaman düşüyor:

```
#1  failed  0  Error: Takip listesi boş — önce pnpm db:seed
```

Sunucudaki ilk kurulumda tam olarak bu oldu. Kurulum aslında başarılı — image
ve timer yerinde — ama script sıfır dışı çıkıyor ve tabloda kalıcı bir `failed`
satırı bırakıyor.

Beklenen: takip listesi boşken kurulum doğrulama koşusunu atlar, ne yapılması
gerektiğini söyler ve başarıyla biter. Kurulumun kendisi doğrulanmaya devam
eder (image çalışıyor mu, veritabanına bağlanabiliyor mu).

## 2. Yapılandırma hatası ingest denemesi olarak kaydediliyor

Collector `ingest_run` satırını açıyor, *sonra* takip listesinin boş olduğunu
fark edip hata veriyor. Oysa bu bir toplama denemesi değil, eksik yapılandırma.

Beklenen: koşulacak fon olup olmadığı satır açılmadan önce kontrol edilir.
Tablo yalnız gerçek toplama denemelerini taşır.

## 3. `rows_upserted` satır değil, yazma işlemi sayıyor

Backfill 33.336 rapor etti ama veritabanında 23.739 satır var
(`fact_fund_daily` 23.577 + `fact_fund_allocation` 136 + snapshot 26). Fark,
aynı satırın birden fazla kez yazılmasından: bir gün önce `/volatility/`'den
getiri alıyor, sonra `/cashflow/`'dan akış alıyor — aynı `(fund_code,
trade_date)` satırına iki ayrı yazma, sayaçta iki.

Sayı yanlış değil ama "33 bin satır toplandı" diye okunuyor. Alan adı
`rows_upserted` ve izleme ekranında görünecek; ölçtüğü şeyle adı uyuşmalı.

Beklenen: sayaç yazma işlemi mi yoksa etkilenen satır mı saydığı belirsiz
kalmaz. İkisinden biri seçilir ve alan adı ile şema yorumu buna göre netleşir.

## 4. Getiri snapshot'ı değişmemiş satırı yeniden yazıyor

`fact_fund_daily` ve `fact_fund_allocation` upsert'lerinde "değeri değişmemişse
yazma" kuralı var; `fact_fund_yield_snapshot` upsert'inde yok. Aynı gün ikinci
kez koşulduğunda 26 satır gereksiz yere yeniden yazılıyor.

Ölçüm: run #3 (artımlı) `fact_fund_daily`'ye 0, `fact_fund_allocation`'a 0,
snapshot'a 26 satır yazdı. O 26'nın tamamı değişmemiş veriydi.

Beklenen: snapshot da diğerleriyle aynı kuralı izler.

## Kapsam

- `collector/install.sh`: takip listesi boşken doğrulama koşusunu atlar, ne
  yapılacağını söyler, başarıyla biter.
- `src/collector.ts`: fon listesi `ingest_run` satırı açılmadan önce alınır.
- `fact_fund_yield_snapshot` upsert'ine değişmemiş satırı atlama kuralı.
- `rows_upserted` sayacının anlamı netleştirilir.
- Sunucudaki geçmiş `failed` satırı silinmez; olmuş bir denemenin kaydıdır.

## Acceptance Criteria

- [ ] Takip listesi boşken `collector/install.sh local` sıfır kodla biter,
      doğrulama koşusunu atladığını ve önce seed gerektiğini söyler.
- [ ] Takip listesi boşken collector `ingest_run` tablosuna satır yazmaz.
- [ ] Takip listesi doluyken kurulum doğrulama koşusunu eskisi gibi yapar.
- [ ] Aynı gün arka arkaya iki koşuda ikincisi `fact_fund_yield_snapshot`'a
      satır yazmaz.
- [ ] Hiçbir veri değişmemişken koşulan bir run `rows_upserted = 0` raporlar.
- [ ] `rows_upserted` değeri, o run'da gerçekten değişen satır sayısıyla
      tutarlıdır ve aynı satırın birden çok yazılması sayacı şişirmez.
- [ ] Yapılandırılmış quality gate'ler (typecheck, test, build) geçer.

## Kapsam Dışı

- `ingest_run` için arayüz ekranı.
- Geçmiş run kayıtlarının temizlenmesi veya geriye dönük düzeltilmesi.
- Collector'ın toplama mantığında değişiklik; hangi endpoint'ten ne alındığı
  aynı kalır.
