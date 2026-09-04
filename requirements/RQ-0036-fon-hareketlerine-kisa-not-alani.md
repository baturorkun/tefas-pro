---
id: RQ-0036
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-04T20:55:25.731Z"
branch: "factory/RQ-0036"
createdFromCommit: "18662f96b1851ebb669c02bebfeee81342d405b1"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/72"
githubPullRequestIid: 72
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/71"
githubIssueIid: 71
repositoryProvider: github
---
# RQ-0036 - Fon hareketlerine kısa not alanı

Bir işlem kaydına neden girildiğini hatırlatan kısa bir not yazılabilsin.
"Temettü dönüşü", "yanlış banka, düzeltildi", "PDF'de 03.09 görünüyor" gibi.
İsteğe bağlı; boş bırakılan alan hiçbir yerde yer kaplamaz.

## Alan zaten var, yüzeyi yok

`portfolio_transaction.note` sütunu tanımlı, API hem oluşturmada hem
güncellemede `note` alanını okuyor (`parseTransaction`), repository insert ve
update ifadelerine yazıyor, `TX_COLUMNS` geri döndürüyor ve arayüzdeki
`Transaction` tipinde alan duruyor. Kısmi satışta bölünen kayıt bile notu yeni
parçaya taşıyor.

Eksik olan tek şey arayüz: form alanı göndermiyor, tablo göstermiyor. 105
işlem kaydının hiçbirinde not yok — çünkü yazmanın yolu yok. Bu yüzden iş
veritabanı veya API değişikliği değil.

## Neden tabloda ayrı sütun değil

Fon Hareketleri on bir sütunlu ve şu an bile dar: fon adı yazılmıyor, üzerine
gelince çıkıyor. On ikinci sütun eklemek satırı ya iki katına çıkarır ya da
notu okunmaz hale getirir; üstelik sütun 105 satırın 100'ünde boş durur.

Not fon kodunun altında, kayda ait ikincil bilgi olarak görünmeli — bölünme
işaretiyle aynı yerde. Uzun not kırpılır, tamamı ipucunda durur.

## Uzunluk sınırı

Kısa not: en fazla 200 karakter. Sınırsız bırakılırsa alan bir yere paragraf
yazma yeri olur ve tabloda taşar. Sınır hem arayüzde hem sunucuda uygulanır;
yalnız arayüzde olsaydı API'ye doğrudan istekle aşılabilirdi.

## Acceptance Criteria

- Alış formunda isteğe bağlı bir not alanı bulunur; boş bırakılabilir ve boş
  bırakıldığında kayıt `note` alanı boş olarak yazılır.
- Var olan bir kayıt düzenlenirken mevcut not forma gelir, değiştirilebilir ve
  boşaltılabilir.
- Notu olan kayıt listede belli olur; not fon kodunun altında görünür, ayrı
  sütun açılmaz.
- Tabloya sığmayan not kırpılır ve tamamı ipucu metninde durur.
- Not en fazla 200 karakter; sınır hem arayüzde hem sunucuda uygulanır ve
  aşıldığında istek reddedilir.
- Yalnız boşluktan oluşan not boş sayılır, tabloda işaret çıkarmaz.
- Kısmi satışta bölünen kaydın notu her iki parçada da durur.
- Mevcut 105 kayıt etkilenmez; not alanı boş kalır ve hiçbir ekran değişmez.
