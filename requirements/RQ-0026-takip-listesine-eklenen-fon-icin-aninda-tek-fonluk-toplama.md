---
id: RQ-0026
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-03T21:00:08.491Z"
branch: "factory/RQ-0026"
createdFromCommit: "3036b55a867f42353c9c32a4ed9bd371c306b443"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/52"
githubPullRequestIid: 52
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/51"
githubIssueIid: 51
repositoryProvider: github
---
# RQ-0026 - Tek fonluk toplama tetiklemesi ve toplama koşumları ekranı

Takip listesine gün içinde eklenen fon, ertesi sabahki zamanlanmış koşuma kadar
boş duruyor: fiyatı yok, getirisi yok, listede tek satır olarak bekliyor.

Çözüm koşum sıklığını artırmak değil. Fon fiyatı günde bir kez değişiyor; sık
tam tarama 38 fonu boşuna tekrar çeker ve kaynakta düzenli bir istek imzası
bırakır. Yeni fon eklemek zamanlanmış bir iş değil, bir olay — kendi
tetiklemesini hak ediyor.

Collector zaten tek fonluk çalışmayı destekliyor (`--funds AAA`). Bu RQ o yolu
sunucudan çağırılabilir hale getirir: fon takip listesine eklenince yalnız o
fon için toplama başlar.

Toplama isteğin içinde beklenmez. Yeni bir fonun on iki aylık para akışı ve
altı aylık büyüklük geçmişi çekiliyor; bu saniyeler sürer ve "Ekle" düğmesini
o kadar bekletmek gerekmez. Ekleme anında yanıtlanır, toplama arkada koşar ve
takip listesinde fonun verisi henüz gelmediği görünür olur.

Zamanlanmış koşum ile bu koşumlar `ingest_run.source` ile ayrılır. Panel'deki
"Son Toplama" kutusu `ORDER BY id DESC LIMIT 1` ile en son kaydı gösteriyor;
ayrım yapılmazsa tek fonluk bir toplama gecelik taramanın yerine geçer ve
kutu sistemin genel durumu yerine tek bir fonun durumunu gösterirdi.

İkinci parça: toplama koşumları admin'e görünür olur.

`ingest_run` tablosu her koşumun kaynağını, başlangıç ve bitiş zamanını,
durumunu, yazdığı satır sayısını ve hata metnini tutuyor. Bunun yalnız bir
parçası ekrana çıkıyor — Panel'deki "Son Toplama" kutusu, o da son koşumun
id'si ve bitiş saati. Süre, satır sayısı ve hata metni hiçbir yerde
görünmüyor; oysa ölçülen veride üç başarısız koşum var ve sebepleri
(`relation "watchlist" does not exist`, boş takip listesi) yalnız tabloda
yazıyor. Koşum süreleri de 0 ile 515 saniye arasında geziyor.

Bu ekran RQ'nun ilk parçasıyla aynı yere bakıyor: tek fonluk koşumlar
zamanlanmış taramadan `source` ile ayrılınca, o ayrımın görülebildiği bir yer
gerekiyor.

Toplamanın başarısız olması eklemeyi geri almaz: fon listede kalır, verisi
zamanlanmış koşumda gelir. Ekleme kullanıcının kararı, toplama onun yan etkisi.

## Acceptance Criteria

- Takip listesine fon eklenince yalnız o fon için toplama tetiklenir; diğer
  fonlar yeniden çekilmez.
- Ekleme isteği toplamanın bitmesini beklemeden yanıtlanır.
- Takip listesinde verisi henüz gelmemiş fon bunu belli eder; boş değerler
  sessizce tire olarak görünmez.
- Aynı fon için eşzamanlı ikinci bir toplama başlatılmaz.
- Toplama başarısız olursa fon takip listesinde kalır ve hata kullanıcıya
  bildirilir; ekleme geri alınmaz.
- Tek fonluk koşumlar `ingest_run` içinde zamanlanmış koşumdan ayrı bir
  `source` ile kaydedilir.
- Panel'deki "Son Toplama" kutusu zamanlanmış koşumu gösterir; tek fonluk bir
  toplama onun yerine geçmez.
- Zaten verisi olan bir fon yeniden eklenirse gereksiz toplama yapılmaz.
- Portföye işlem eklemek toplama tetiklemez: bu RQ yalnız takip listesini
  kapsar.
- Admin menüsünde toplama koşumlarını listeleyen bir ekran vardır; en yeni
  koşum üstte durur.
- Her koşum için kaynak, başlangıç zamanı, süre, durum ve yazılan satır sayısı
  görünür.
- Başarısız koşumun hata metni ekranda okunabilir; yalnız veritabanında kalmaz.
- Ekran ve verisi yalnız admin'e açıktır; admin olmayan istek reddedilir.
- Hiç koşum yoksa ekran boş durum metniyle açılır, hata vermez.
