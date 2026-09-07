---
id: RQ-0049
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-07T17:02:41.016Z"
branch: "factory/RQ-0049"
createdFromCommit: "6993f307d7f77401aac4caa531a56b9d9673fc44"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/98"
githubPullRequestIid: 98
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/97"
githubIssueIid: 97
repositoryProvider: github
---
# RQ-0049 - Piyasa: sol ve sağ pencereler kaydırıcıyla seçiliyor

Piyasa ekranında pencereler koda gömülü: sol sütun hep 1 hafta, sağ sütun hep
1 ay. Kullanıcı "son 3 günde kime para girdi" ya da "3 ayda kim kazandırdı"
diye bakamıyor.

## Bugünkü durum

On iki panel var, üç ölçü × iki yön × iki pencere:

    getiri     kazandıran (1 hafta) · kazandıran (1 ay)
               kaybettiren (1 hafta) · kaybettiren (1 ay)
    akış       giriş (1 hafta) · giriş (1 ay) · çıkış (1 hafta) · çıkış (1 ay)
    yatırımcı  artan (1 hafta) · artan (1 ay) · azalan (1 hafta) · azalan (1 ay)

Pencereler `analytics.fund_flow` ve `analytics.fund_investor` view'larında
`_1w` / `_1m` sütunları olarak sabit. Başka bir pencere sormanın yolu yok.

## Çözüm

Ekranın üstünde tek bir şerit, içinde İKİ kaydırıcı: biri **soldaki bütün
panelleri**, diğeri **sağdakilerin hepsini** yönetiyor. Sol/sağ ayrımı
korunuyor çünkü ekranın amacı iki pencereyi yan yana karşılaştırmak.

Panel sayısı ve düzeni değişmiyor; değişen yalnız hangi pencereye baktıkları.

### Referans gün temsil gücü olan gün olmalı

Ölçüldü: fonların referans günü `max(trade_date)` alınıyordu ve tek bir fon
diğerlerinden önce toplandığında kısa pencereler yalnız o fonu gösteriyordu.
CVL sisteme eklenince toplama tetiklendi, o fon tek başına 7 Eylül'e ilerledi
ve "1 gün" penceresi tek fon döndürdü.

Üretimde de olabilir: sabah koşumundan önce fon eklemek aynı durumu yaratır.
Referans gün, fonların ÇOĞUNUN veri taşıdığı en son gün olmalı.

### Duraklı kaydırıcı, düz aralık değil

Duraklar: **1 · 2 · 3 · 5 · 7 · 15 · 30 · 60 · 90 · 180 gün**

Düz 1-180 aralığı olsaydı kısa pencereler ezilirdi: 1-7 gün bandı çubuğun
%4'ü olur ve 3 günü seçmek imkânsızlaşırdı. Duraklar eşit genişlikte, sürükleme
değere yapışıyor. Etiket ikili: "30 gün · 1 ay".

Varsayılanlar **7 ve 30 gün**, yani ilk açılışta ekran bugünküyle aynı. Seçim
saklanıyor (localStorage, `onlyOwned` ile aynı desen).

İstek sürükleme BİTİNCE atılıyor. Her adımda atmak on istek demek olurdu.

## Veri

Üç ölçü de `fact_fund_daily`'den türüyor ve herhangi bir pencereye açılabilir.
Ama derinlikleri eşit değil, ölçüldü:

    getiri (daily_return_pct)   en eski 2021-08-31   6 ayı tam kapsayan 44/45 fon
    akış (net_flow)             en eski 2025-09-01   45/45
    yatırımcı (investor_count)  en eski 2025-09-30   36/45

Yatırımcı sayısında dokuz fon uzun pencerede eksik. Eksik günü atlayıp
hesaplamak farkı olduğundan küçük gösterir; pencerenin ilk MEVCUT günü
referans alınmalı ve veri hiç yoksa fon listeye girmemeli.

## Acceptance Criteria

- Piyasa ekranının üstünde iki kaydırıcı var: biri sol sütunun, diğeri sağ
  sütunun penceresini yönetir.
- Kaydırıcı duraklara oturur; ara değer seçilemez.
- Seçilen pencere gün ve tanıdık karşılığıyla yazar.
- Varsayılanlar 7 ve 30 gün; ilk açılışta ekran bugünkü davranışını korur.
- Seçim sayfa yenilendiğinde korunur.
- İstek sürükleme bitince atılır, her adımda değil.
- Üç ölçü de (getiri, akış, yatırımcı) seçilen pencereye göre hesaplanır.
- Veri penceresi doldurmayan fon listeye uydurma değerle girmez.
- Panel sayısı ve düzeni değişmez.
- Referans gün fonların çoğunun veri taşıdığı en son gündür; tek bir fonun
  erken toplanması kısa pencereleri boşaltmaz.
- Kaydırıcı üstünde duraklar yazılı ve tıklanabilir; sürüklemek zorunlu değil.
- Dashboard ucu artık piyasa sıralamalarını üretmez.
