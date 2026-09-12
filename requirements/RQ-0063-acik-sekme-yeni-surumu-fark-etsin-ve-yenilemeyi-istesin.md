---
id: RQ-0063
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-12T10:14:30.072Z"
branch: "factory/RQ-0063"
createdFromCommit: "4ef86440bf315dac7d0220636aeb2bbd97a2f9de"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/127"
githubPullRequestIid: 127
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/126"
githubIssueIid: 126
repositoryProvider: github
---
# RQ-0063 - Açık sekme yeni sürümü fark etsin ve yenilemeyi istesin

Deploy'dan önce açılmış bir sekme yeni sürümü hiç görmüyor. Uygulama tek
sayfa: ekranlar arasında gezerken `app.js` bir daha çekilmiyor. RQ-0062
main'e girdikten sonra kullanıcı Portföyüm'de PDF düğmesini aradı, yoktu;
"yaptığımız bazı şeyler gelmedi" dedi. Sunucuda her şey yerindeydi.

## Ölçüm

    sunucu /api/runtime         v0.62
    sunucu /app.js              PDF düğmesi içinde, Cache-Control: no-cache, ETag var
    açık sekme                  eski app.js, sürüm rozeti "v0.62"

Rozet yanıltıyor: her ekran kurulumunda `/api/runtime`'ı **taze** çekip
sunucunun sürümünü yazıyor. Yani eski kodu çalıştıran sekme yeni sürüm
numarası gösteriyor. Kullanıcı rozete bakıp "güncelim" diyor, değil.

`no-cache` + ETag doğru ayar; sorun önbellek değil, sayfanın yeniden
yüklenmemesi. Tam yenileme (Cmd+Shift+R) çözüyor ama bunu kullanıcının
bilmesi ve hatırlaması beklenemez.

## Kural

Sayfa doğduğu sürümü hatırlar. İlk yüklemede `/api/runtime` bir kez okunur
ve saklanır; rozet **bunu** gösterir, sunucunun o anki sürümünü değil. Sonra
her ekran değişiminde ve sekme yeniden görünür olduğunda sürüm tekrar
sorulur; ayrışırsa ekranın üstünde bir şerit çıkar: "Yeni sürüm var (v0.63)
· Yenile".

Kendiliğinden yenileme YOK: yarım doldurulmuş bir işlem formunu silmek,
eski sürümde kalmaktan kötü. Düğme kullanıcının.

Şerit uygulamanın dışında durur (`index.html`), yükleme çubuğu gibi: ekran
yeniden çizilirken de yerinde kalmalı.

## Acceptance Criteria

- Sürüm rozeti sayfanın yüklendiği sürümü gösteriyor; sonraki deploy'da
  değişmiyor.
- Ekran değişiminde ve sekme görünür olduğunda sürüm sunucuyla karşılaştırılıyor.
- Ayrışınca şerit çıkıyor, yeni sürüm numarasını ve Yenile düğmesini taşıyor.
- Yenileme yalnız düğmeyle; kendiliğinden `location.reload()` yok.
- Şerit `#app` dışında; ekran yeniden kurulunca kaybolmuyor.
- Sürüm alınamazsa ne rozet ne şerit hata üretiyor.

## Aynı RQ'da: PDF'te kutu ızgarası

Basit bir arayüz düzeltmesi, ayrı RQ hak etmiyor. A4 dikey tarayıcıda
~794px genişlik sayılıyor ve ekranın dar-ekran kuralı (900px → 2 sütun)
yazdırmada da devreye giriyordu: dokuz kutu beş satır oluyor, son satır ilk
sayfaya sığmayıp ikinci sayfaya kayıyor ve bir kutu eksik görünüyordu.
Kağıtta sütun sayısı artık ekranla aynı: sekiz kutu 4+4, dokuz kutu 3+3+3.

- Yazdırmada kutu ızgarası ekranla aynı dizilimde; boş yer ve kayan kutu yok.

## Kapsam dışı

- Bundle'a derleme zamanında sürüm gömmek: derleme `tsc`, bundler yok ve
  sunucu sürümü zaten ilk yüklemede geliyor.
- Service worker.
