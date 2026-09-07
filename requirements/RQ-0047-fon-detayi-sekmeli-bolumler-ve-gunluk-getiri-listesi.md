---
id: RQ-0047
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-07T15:38:47.778Z"
branch: "factory/RQ-0047"
createdFromCommit: "c9214d1b6b0ace12df2d6106b96df768a2474335"
completedRunId: "20260907153946-RQ-0047"
completedBy: "Batur Orkun"
completedAt: "2026-09-07T16:04:42.458Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/94"
githubPullRequestIid: 94
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/93"
githubIssueIid: 93
repositoryProvider: github
---
# RQ-0047 - Fon detayı: sekmeli bölümler ve günlük getiri listesi

Fon detayı penceresi alt alta iki tablo taşıyor ve uzuyor. Bir de eksik bir
şey var: fonun gün gün ne yaptığı ve o günlerde kullanıcının kaç TL
kazandığı hiçbir yerde görünmüyor.

## 1. Pencere uzuyor

Bugünkü yapı: dört metrik kutusu, ardından **Varlık Türü** tablosu, ardından
**Hisseler / Sektör** paneli. Sonuncusu kendi içinde zaten sekmeli, diğeri
değil — yani ekranda iki farklı düzen kuralı var.

Üçü tek sekme şeridinde toplanacak:

    Günlük │ Varlık Türü │ Hisseler │ Sektör

Sekmeler VERİSİ OLANA göre çıkar. Para piyasası fonunda hisse kırılımı yok,
o sekme hiç görünmez; sektör hisselerden türediği için o da düşer. Boş bir
sekme açıp "veri yok" yazmak, sekmeyi tıklattırıp hiçbir şey göstermemek
demek.

## 2. Günlük getiri hiçbir yerde yok

Fon detayında "bu fon son bir ayda ne yaptı ve ben ondan ne kazandım"
sorusunun cevabı yok. Portföyüm tablosu tek bir 1 ay yüzdesi veriyor, o da
fonun kendi getirisi; Panel'deki günlük barlar ise portföyün tamamı için.

Yeni sekme gün gün listeleyecek:

    tarih        fonun günlük %      benim K/Z (TL)
    04.09              +0,90              +2.770
    03.09              +0,31                +954

**İki sütun iki farklı şey.** Yüzde fonun hareketi — kimin ne zaman aldığından
bağımsız, herkes için aynı. TL ise kullanıcının o günkü pozisyonundan geliyor.
Fonu dokuz gündür tutan biri için önceki günlerin TL sütunu boş kalır; yüzde
sütunu dolu olur. Bu ikisi karıştırılırsa kullanıcı kazanmadığı parayı
kazanmış sanır — aynı hata Panel'de yaşandı ve RQ-0043'te düzeltildi.

### TL sütunu nakit akışından arındırılmalı

O gün fona ekleme yapıldıysa değer artışının bir kısmı kazanç değil, yeni
paradır. `analytics.portfolio_daily` bunu portföy geneli için yapıyor
(`günlük kazanç = değer + çıkış − önceki değer − giriş`); aynı hesabın fon
bazında kurulması gerekiyor. Ham değer farkını yazmak, alım yapılan günü
dev bir kazanç gibi gösterirdi.

## Acceptance Criteria

- Fon detayındaki bölümler tek bir sekme şeridinde toplanır.
- Sekme yalnız verisi varsa görünür; boş sekme açılmaz.
- Yeni "Günlük" sekmesi son bir ayı gün gün listeler.
- Listede fonun günlük yüzdesi ile kullanıcının o günkü TL kâr/zararı ayrı
  sütunlarda durur ve hangisinin kime ait olduğu başlıktan anlaşılır.
- TL sütunu nakit akışından arındırılır; alım yapılan gün kazanç sayılmaz.
- Kullanıcının fonda olmadığı günlerde TL sütunu boş kalır, sıfır yazılmaz.
- Pozisyonu olmayan fonda yüzde sütunu yine gösterilir.
- Mevcut Hisseler/Sektör içeriği ve varlık türü tablosu değişmez.
