---
id: RQ-0048
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-07T16:24:27.017Z"
branch: "factory/RQ-0048"
createdFromCommit: "d290a206a895bef8fc6c98c1b8ff8f4129575c62"
completedRunId: "20260907162511-RQ-0048"
completedBy: "Batur Orkun"
completedAt: "2026-09-07T16:45:00.401Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/96"
githubPullRequestIid: 96
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/95"
githubIssueIid: 95
repositoryProvider: github
---
# RQ-0048 - Performans grafiğine benchmark çizgisi ve fark

Panel'deki Portföy Performansı grafiği yalnız portföyün kendi seyrini
gösteriyor. Çizgi yukarı gidiyorsa "kazanıyorum" deniyor, ama asıl soru
cevapsız kalıyor: **piyasa da yükseldiyse bu iyi bir sonuç mu?**

## Karşılaştırma var ama grafikte yok

Benchmark altyapısı zaten kurulu:

- `app_setting['benchmark']` genel seçim (bugün TP2), `user_setting` ile
  kullanıcı kendi fonunu seçebiliyor.
- `periodReturns` benchmark'ın aynı günlerdeki getirisini zincirleyip
  `benchPct` ve `diff` üretiyor; Dönemsel Getiri ekranı bunu ay ve hafta
  bazında gösteriyor.

Eksik olan tek şey günlük seri: grafik bunu çizemiyor çünkü öyle bir uç yok.
Yani hesap yeni değil, yalnız gün çözünürlüğüne indirilmesi gerekiyor.

RQ-0047'de kurulan `analytics.fund_nav` bunu kolaylaştırıyor: herhangi bir
fonun günlük getirilerden zincirlenmiş pay fiyatını veriyor. Benchmark
serisi için gereken tam olarak buydu.

## Ne çizilecek

**Üst panele ikinci çizgi.** Portföy çizgisinin yanına benchmark: "aynı para,
aynı günlerde bu fonda dursaydı" eğrisi. İki çizgi aynı noktadan başlar,
aradaki açılma performans farkının kendisidir.

Benchmark serisi portföyün sermaye hareketleriyle aynı şekilde beslenmeli.
Portföy değeri zaten nakit akışından arındırılmış (`daily_gain = değer +
çıkış − önceki değer − giriş`); benchmark de aynı günlerde aynı tutarlar
konmuş gibi hesaplanmalı, yoksa iki çizgi farklı sorulara cevap verir ve
karşılaştırma anlamını yitirir.

**Fark, sayı olarak.** Panel başlığında bugün "Dönem Getirisi +%7,44" yazıyor;
yanına benchmark'ın aynı dönemdeki getirisi ve aradaki puan farkı gelecek.

## Kararlar

**Alt panelde bar başına işaret, ikinci bar seti değil.** Her barın kendi
üstünde, o günkü benchmark seviyesinde kısa yatay bir çizgi. Bar işaretin
üstündeyse o gün piyasa yenilmiş, altındaysa geride kalınmış — karşılaştırma
aynı sütunda okunuyor.

İkinci bar seti otuz günü altmış bara çıkarırdı. Birleşik çizgi de denendi ve
elendi: barların arasında zikzak yapıyor, hangi parçanın hangi güne ait olduğu
okunmuyordu.

**Benchmark fonun kendisi portföyde olabilir.** TP2 hem benchmark hem
kullanıcının pozisyonu; o dilim kendisiyle karşılaştırılıyor ve farkı sıfıra
çekiyor. Bu bir hata değil ama söylenmeli, yoksa fark olduğundan küçük
görünür ve sebebi anlaşılmaz.

**Veri yoksa çizgi çizilmez.** Benchmark fonun o günlerde fiyatı yoksa
eksik günü atlayıp çizgiyi uydurmak yerine karşılaştırma gösterilmez ve
sebebi yazılır.

## Acceptance Criteria

- Portföy Performansı grafiğinde benchmark ikinci bir çizgi olarak görünür.
- İki çizgi aynı noktadan başlar; benchmark serisi portföyle aynı sermaye
  hareketlerini varsayar.
- Dönem farkı sayı olarak yazar: portföy getirisi, benchmark getirisi ve
  aradaki puan farkı.
- Hangi fonun benchmark olduğu ekranda görünür.
- Benchmark fonu kullanıcının portföyünde de varsa bu durum belirtilir.
- Benchmark verisi eksikse çizgi çizilmez ve sebebi yazılır.
- Alt panelde her barın üstünde o günkü benchmark seviyesi işaretlenir;
  barların kendisi değişmez.
- Kullanıcının kendi benchmark seçimi varsa o kullanılır.

## Not

Bu iş önce RQ-0046 olarak açılmıştı ve yanlışlıkla iptal edildi: fon detayı
sekmeleri önceliklendirilirken "kapat" talimatı, kod yazılmamış olduğu için
"iptal et" diye yorumlandı. Tasarım metni korunup buraya taşındı; Issue #91
bu RQ'ya devredildi.
