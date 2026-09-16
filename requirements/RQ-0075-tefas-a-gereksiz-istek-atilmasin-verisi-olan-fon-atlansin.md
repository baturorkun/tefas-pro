---
id: RQ-0075
status: draft
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-16T07:48:23.423Z"
branch: "factory/RQ-0075"
createdFromCommit: "9422adc20cd796adf984c9aed081b52196d2fe57"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/151"
githubPullRequestIid: 151
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/150"
githubIssueIid: 150
repositoryProvider: github
---
# RQ-0075 - TEFAS'a gereksiz istek atılmasın, verisi olan fon atlansın

Geliştirme sırasında tekrarlanan tam koşumlar TEFAS'ın bir IP'yi engellemesine
yol açtı. Kaynak bizim için kritik — fiyat, getiri, yatırımcı sayısı ve
büyüklüğün tamamı oradan geliyor — ve yormamak engellenmemekten daha önemli.

İki kusur yükü gereksiz büyütüyordu:

**Aynı veri tekrar tekrar çekiliyordu.** Koşum gün içinde yeniden
tetiklendiğinde (elle çalıştırma, eksik fon için yeniden koşma) bugünkü satırı
zaten olan fonlar için de istek atılıyordu.

**Bekleme fon başına iki isteğe göre ayarlanmamıştı.** RQ-0073 fiyatın
tarihini sormak için ikinci bir istek ekledi; bekleme 1,5 saniyede kalınca
fiili tempo iki katına çıktı.

Zamanlanmış koşumun bütçesi bozulmuyor: 74 fon, fon başına iki istek ve üç
saniye bekleme ile yaklaşık 7,5 dakika sürer; 10:00'da başlayıp 10:30 sınırının
çok öncesinde biter.

## Acceptance Criteria

- Bugünkü fiyatı veritabanında olan fon için TEFAS'a istek atılmaz.
- Atlanan fon sayısı koşum çıktısında görünür.
- İstekler arası varsayılan bekleme, fon başına iki istek olduğu gözetilerek
  belirlenir.
- Zamanlanmış koşum 10:30'dan önce biter.

## Kapsam dışı

- KAP ve hisse toplamaları: ikisi de zaten kayıtlı dönemi/günü atlıyor ve
  farklı kaynaklara gidiyor.
- Engellenen IP'nin açılması: bizim elimizde değil, süreyle kalkar.
