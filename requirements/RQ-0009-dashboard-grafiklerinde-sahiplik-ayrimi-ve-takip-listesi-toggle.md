---
id: RQ-0009
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-08-31T13:58:05.722Z"
branch: "factory/RQ-0009"
createdFromCommit: "35a51541d088ef43b60ae5eded22dcdba7093e8e"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/18"
githubPullRequestIid: 18
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/17"
githubIssueIid: 17
repositoryProvider: github
---
# RQ-0009 - Dashboard grafiklerinde sahiplik ayrımı ve takip listesi toggle

Dashboard'daki dört sıralama grafiği bugün doğru kapsamda ama eksik bilgi
veriyor: hangi barın senin fonun olduğu görünmüyor.

Ölçüldü — grafikler `analytics.fund_returns`'ten besleniyor ve collector'ın
topladığı 36 fonun tamamını kapsıyor. Bunların 26'sı açık pozisyon, 10'u takip
listesi. 1 aylık zirvede ilk altı sıra tesadüfen portföydeki fonlar; sıralamaya
bakan biri bunu bilemez.

Sıralamanın değeri karşılaştırmada: "fonum %12 yapmış, izlediğim %31 yapmış"
bir takas kararıdır. Ama karşılaştırmayı yapabilmek için hangisinin hangisi
olduğunu görmek gerekir.

## Barlar sahipliğe göre ayrışır

Her bar, o fonun kullanıcı için ne olduğunu gösterir:

| Görünüm | Anlam |
|---|---|
| Dolu bar | Açık pozisyonum var |
| İçi boş bar (kenarlıklı) | Takip listemde, pozisyonum yok |

Ayrım dolgu-boşluk ile yapılır, renkle değil. Renk zaten getirinin işareti — artı yeşil,
eksi kırmızı. Sahipliği de renge yüklersek iki bilgi tek kanalda çakışır ve
grafik okunmaz olur.

Ayrım kullanıcıya göredir: aynı fon bir kullanıcının portföyünde, diğerinin
takip listesinde olabilir. RQ-0008'de kurulan kural burada da geçerli —
saklanan bir sahiplik alanı yok, `portfolio_transaction`'dan türetilir.

## Toggle takip listesini çıkarır

Grafiğin üstünde tek bir kontrol: **Takip listem de gösterilsin**.

Varsayılan açık, yani bugünkü davranış korunur: collector'ın topladığı her fon
sıralamada. Kapatıldığında takip listesi fonları düşer ve yalnız açık
pozisyonlar kalır — "benim portföyümde ne oluyor" sorusu.

Toggle dört grafiğin **ortağıdır**, panel başına ayrı değil. Dört ayrı durum
tutmak hem kullanımı yorar hem tutarsız görüntü üretir: bir panelde takip
listesi varken diğerinde yokken sıralamalar karşılaştırılamaz.

Durum tarayıcıda saklanır (`localStorage`); sayfa yenilenince seçim korunur.
Sunucuya yazmaya değmez, kullanıcı başına bir tercih değil o an bakılan görünüm.

## Kapsam

- `analytics.fund_returns` sorgusuna kullanıcının sahiplik durumu eklenir;
  view kullanıcı bazlı süzülemez, süzme `dashboard()` sorgusunda yapılır.
- `RankEntry` bir `owned: boolean` alanı taşır.
- `barChart()` dolu ve içi boş bar çizer; efsane (legend) toggle'ın yanında.
  SVG deseni (pattern) denendi ve bırakıldı: desen dolgunun yerine geçtiği için
  barın artı/eksi rengini yiyordu.
- Dört grafiği yöneten tek toggle; varsayılan açık, `localStorage`'da saklanır.
- Toggle kapalıyken sıralama yalnız açık pozisyonlardan hesaplanır — grafikten
  bar gizlemek değil, listeyi baştan süzmek. Aksi halde top-10'da 3 fon kalırdı.

## Acceptance Criteria

- [ ] Dört grafikte de portföydeki fonlar ile takip listesindeki fonlar
      birbirinden ayırt edilebilir; ayrım dolgu-boşlukla yapılır, renk getiriyi
      göstermeye devam eder.
- [ ] Boş kalan kayıp grafiği "veri yok" demez; kaybettiren fon olmadığını
      söyler.
- [ ] Panelde ayrımın ne anlama geldiğini söyleyen bir efsane vardır.
- [ ] Varsayılan görünüm bugünkü kapsamı korur: collector'ın topladığı tüm
      fonlar sıralamada.
- [ ] Toggle kapatılınca dört grafik de yalnız açık pozisyonlardan hesaplanır
      ve sıralama yeniden yapılır (kalan fonlardan top/bottom 10).
- [ ] Toggle tek kontroldür ve dört grafiğe birlikte uygulanır.
- [ ] Seçim sayfa yenilendiğinde korunur.
- [ ] Sahiplik kullanıcıya göre hesaplanır; iki kullanıcı aynı fonu farklı
      görür.
- [ ] Kapalı pozisyon "sahibim" saymaz: tamamen çıkılmış fon takip listesi
      görünümünde çizilir.
- [ ] Pencere gün sayısı (`21g`) her barda görünmeye devam eder.
- [ ] Yapılandırılmış quality gate'ler (typecheck, test, build) geçer.

## Kapsam Dışı

- Pozisyon bazlı getiri ("aldığımdan beri ne kazandım"). Bu grafikler fonun
  kendi getirisini gösterir, senin alış fiyatına göre değil. Ayrı bir RQ.
- Takip listesine grafik üzerinden fon ekleme/çıkarma.
- Yeni pencere (3 ay, 1 yıl) veya yeni grafik türü.
