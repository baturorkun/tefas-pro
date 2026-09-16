---
id: RQ-0074
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-16T07:34:47.089Z"
branch: "factory/RQ-0074"
createdFromCommit: "ab3d8dabd303d96b176c86e1d375275138bf9b28"
completedRunId: "20260916074128-RQ-0074"
completedBy: "human"
completedAt: "2026-09-16T07:43:49.814Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/149"
githubPullRequestIid: 149
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/148"
githubIssueIid: 148
repositoryProvider: github
---
# RQ-0074 - Yeni fon eklemede KAP adımı sunucuda çalışsın, koşum boşuna failed olmasın

Kullanıcı takip listesine PSE ve BPZ fonlarını ekledi. Günlük veri geldi —
fiyat, getiri, yatırımcı sayısı, büyüklük hepsi yazıldı — ama koşum `failed`
işaretlendi:

    Error: spawn pdftotext ENOENT

Sebep: `poppler-utils` yalnız collector image'ına eklenmişti. Yeni fon
eklendiğinde çalışan tek fonluk toplama ise **sunucu sürecinde** koşuyor ve
KAP'ın portföy raporunu PDF'ten okuyor. Sunucu image'ında paket yok.

İki ayrı kusur var ve ikisi de düzeltilmeli:

1. Sunucu image'ında `pdftotext` eksik.
2. KAP adımının hatası tüm koşumu düşürüyor. Oysa fon kullanılabilir
   durumdaydı: günlük verisi yazılmıştı. Ekranda ise fon eklenememiş gibi
   görünüyordu.

## Acceptance Criteria

- Sunucu image'ı `pdftotext` içerir; yeni fon eklendiğinde KAP adımı çalışır.
- KAP adımı başarısız olursa koşum `failed` değil `partial` kapanır ve sebep
  kaydedilir; günlük veri yazılmışsa fon kullanılabilir sayılır.
- Para piyasası fonu gibi hisse tutmayan fonlarda kırılımın boş olması hata
  değildir.

## Kapsam dışı

- **Fon terimleri** (valör, stopaj, yönetim ücreti, risk). Yeni eklenen
  fonlarda `dim_fund_terms` satırı hiç oluşmuyor; bu veri Fintables'tan
  geliyordu ve RQ-0071'de kaynak kaldırıldı. TEFAS'ın `fonBilgiGetir` ucunda
  bu alanlar yok (ölçüldü: yalnız fiyat, getiri, pay adedi, büyüklük,
  kategori, yatırımcı sayısı, pazar payı dönüyor). KAP'ın
  `exportSgbfAndYfbf` ucu 404 veriyor. Muhtemel yol KAP'ın İzahname
  bildirimini PDF'ten okumak; ayrı bir iş olarak ele alınacak.
