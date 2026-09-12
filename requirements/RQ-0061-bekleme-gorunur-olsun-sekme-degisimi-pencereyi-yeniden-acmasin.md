---
id: RQ-0061
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-12T05:11:54.594Z"
branch: "factory/RQ-0061"
createdFromCommit: "67821d09945a9fc26f9d67cfc86dc68575d7b4e1"
completedRunId: "20260912051241-RQ-0061"
completedBy: "human"
completedAt: "2026-09-12T05:54:09.354Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/122"
githubPullRequestIid: 122
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/121"
githubIssueIid: 121
repositoryProvider: github
---
# RQ-0061 - Bekleme görünür olsun, sekme değişimi pencereyi yeniden açmasın

Uygulamada hiçbir yerde "bekleniyor" işareti yok. İstek uzun sürdüğünde ekran
öylece duruyor ve kullanıcı tıklamasının işleyip işlemediğini bilmiyor.

Aynı boşluğun en görünür hâli fon penceresindeki sekmeler: sekmeye basınca
pencere kapanıp yeniden açılıyor, göz kırpar gibi.

## Sekme neden pencereyi kapatıyor

Sekme düğmesi pencereyi kapatıp `openFundModal`'ı baştan çağırıyor:

    b.addEventListener('click', () => {
      fonSekme = id;
      close();
      void openFundModal(kod);
    });

Yani sekme değişimi fon detayının TAMAMINI yeniden çekiyor — oysa değişen
yalnız hangi tablonun çizileceği. Veri zaten elde. Tek gerçek ek istek
Günlük sekmesinin 30 günlük serisi ve o da yalnız o sekme seçiliyken
gerekiyor.

Pencere ayakta kalmalı ve yalnız gövdesi değişmeli.

## Bekleme göstergesi nereye

Bütün ağ istekleri tek bir `api()` fonksiyonundan geçiyor. Sayaç orada
tutulursa gösterge her ekranı ayrı ayrı düzenlemeden çalışır.

Gösterge gecikmeli açılmalı. Hızlı isteklerde anında açılıp kapanan bir çubuk,
düzeltmeye çalıştığımız göz kırpmanın aynısını üretir.

## Acceptance Criteria

- Fon penceresinde sekme değiştirmek pencereyi kapatıp yeniden açmıyor;
  yalnız gövde değişiyor.
- Sekme değişimi fon detayını yeniden çekmiyor; Günlük serisi yalnız o sekme
  seçildiğinde ve bir kez isteniyor.
- Süren her istek ekranda görünür bir işaret bırakıyor.
- Kısa süren istekler gösterge açıp kapatmıyor; gösterge gecikmeli açılıyor.
- Gösterge tek yerde, `api()` üzerinden; ekranlar ayrıca düzenlenmiyor.

## Kapsam dışı

- Ekran bazlı iskelet (skeleton) yerleşimler.
- İstek iptali.
