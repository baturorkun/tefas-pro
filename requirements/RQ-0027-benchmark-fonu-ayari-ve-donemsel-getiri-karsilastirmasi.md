---
id: RQ-0027
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-03T22:18:46.535Z"
branch: "factory/RQ-0027"
createdFromCommit: "a364ebb563e3261670a64d5c63cafff138003ccf"
completedRunId: "20260903222024-RQ-0027"
completedBy: "human"
completedAt: "2026-09-03T22:50:43.312Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/54"
githubPullRequestIid: 54
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/53"
githubIssueIid: 53
repositoryProvider: github
---
# RQ-0027 - Benchmark fonu ayarı ve Dönemsel Getiri karşılaştırması

Portföyün getirisi tek başına "iyi mi kötü mü" sorusunu cevaplamıyor. Aylık
%2,26 kazanç, parayı bir para piyasası fonunda tutmak %2,80 getirecekken kötü
bir sonuç. Karşılaştırma noktası olmadan bu görünmüyor.

Benchmark fon kodu ayarlara eklenir; başlangıç değeri TP2 (TERA PORTFÖY PARA
PİYASASI (TL) FONU). Tatiller gibi `app_setting` içinde tutulur — banka
listesinin aksine buna hiçbir satır referans vermiyor, tek bir değer.

İlk uygulama Dönemsel Getiri ekranı: ay ve hafta satırlarının sonuna benchmark
getirisi ve fark (puan) sütunları eklenir.

Benchmark getirisi portföyün ölçülebildiği **aynı günler** üzerinden
zincirlenir. Para tutulmayan bir günün getirisi benchmark'a yazılmaz; yoksa
benchmark, paranın hiç girmediği bir dönemin kazancıyla öne geçmiş görünürdü.
Zincirlenmiş getiri para giriş çıkışına duyarsız olduğu için bu, benchmark
fonun o günlerdeki kendi getirisine eşit çıkar — karşılaştırmayı anlamlı kılan
da bu.

## Eksik veri günü portföyü çökmüş gösteriyor

`analytics.portfolio_daily` portföyü, o gün fiyatı olan fonlarla değerliyor.
Bir gün fonların yalnız bir kısmı toplanmışsa kalanlar sıfır sayılıyor ve
portföy çökmüş görünüyor: ölçülen veride 3 Eylül'de 39 fondan 2'si toplandığı
için değer 3.762.405'ten 37.566'ya düşmüş, Eylül ayı −%99 çıkmış.

Bu erişilebilir bir durum. RQ-0026 ile gelen tek fonluk toplama, sabahki tam
taramadan önce çalışırsa (gün içinde takip listesine fon eklendiğinde) o gün
için tek fonluk bir satır yazıyor ve panel portföyün çöktüğünü gösteriyor.

Eksik günler değerlenmez: o gün elde tutulan fonlardan birinin bile fiyatı
yoksa gün atlanır. Eksik fonu sıfır saymak yerine günü atlamak doğru, çünkü
portföyün o günkü değeri gerçekten bilinmiyor.

## Para gösterimi

Tutarlarda kuruş gösterilmez. `+214.128,23 ₺` gibi bir değerde virgülden
sonrası bilgi taşımıyor, sütunu okumayı zorlaştırıyor.

## Acceptance Criteria

- Ayarlar ekranında benchmark fon kodu düzenlenebilir; başlangıç değeri TP2.
- Tanımsız veya veri bulunmayan bir fon kodu reddedilir, sessizce kaydedilmez.
- Benchmark yalnız admin tarafından değiştirilir.
- Dönemsel Getiri'de her ay ve hafta satırı benchmark getirisini ve farkı
  (puan) gösterir.
- Benchmark getirisi portföyün ölçülebildiği günler üzerinden zincirlenir;
  portföyün verisi olmayan gün benchmark'a da sayılmaz.
- Benchmark fonun o dönemde verisi yoksa satır tire gösterir, sıfır değil.
- Bir ayın benchmark getirisi haftalarının bileşiğine eşittir.
- `analytics.portfolio_daily` eksik fiyatlı günü değerlemez: o gün elde
  tutulan fonlardan birinin fiyatı yoksa gün seriye girmez.
- Eksik gün atlandığında ondan sonraki günün getirisi son ölçülen güne göre
  hesaplanır; kazanç kaybolmaz.
- Panel, Dönemsel Getiri, Portföyüm ve Kapananlar eksik veri gününden
  etkilenmez; değerler tam günlerden gelir.
- Arayüzdeki TL tutarlarında kuruş gösterilmez.
