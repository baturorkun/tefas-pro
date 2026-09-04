---
id: RQ-0034
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-04T12:52:05.821Z"
branch: "factory/RQ-0034"
createdFromCommit: "11c69453be9e85d256046469d735fcc29c85d628"
completedRunId: "20260904125304-RQ-0034"
completedBy: "human"
completedAt: "2026-09-04T13:44:43.156Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/68"
githubPullRequestIid: 68
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/67"
githubIssueIid: 67
repositoryProvider: github
---
# RQ-0034 - Fon hareketlerinde fon ve banka filtresi

Fon Hareketleri 103 işlem listeliyor ve süzme yok. "Fiba'daki DFI işlemlerim"
gibi bir soruyu cevaplamak için listeyi gözle taramak gerekiyor; işlem sayısı
arttıkça bu imkânsızlaşacak.

## Seçim listesi, serbest metin değil

Filtre alanları açılır liste olur. Banka alanında RQ-0025'te aynı kararı
vermiştik: elle yazılan değer yanlış yazıldığında hata vermiyor, sessizce boş
sonuç veriyor ve kullanıcı listenin gerçekten boş olduğunu sanıyor.

Seçenekler kullanıcının kendi işlemlerinden gelir, sabit bir listeden değil:
ölçülen veride 37 fon ve 4 banka var. Hiç işlemi olmayan bir fonu filtrede
göstermenin anlamı yok.

Fon seçenekleri kodla birlikte adı taşır; üç harf tek başına hatırlatıcı değil.

## İkisi birlikte çalışır

Filtreler AND ile birleşir. Tek başına da kullanılabilirler.

## Neyi etkiler, neyi etkilemez

Filtre tabloyu, toplam satırını ve panel başlığındaki sayacı etkiler. Toplam
satırı filtreyi yok sayarsa yanıltıcı olur: bankaya göre süzüp portföyün
tamamının toplamını görmek yanlış okumaya yol açar.

Üstteki metrik kutuları etkilenmez. Onlar portföyün özeti, tablonun değil;
filtreye bağlanırlarsa "Açık Pozisyon" sayısı gizli bir duruma göre değişir ve
aynı kutu ekrandan ekrana farklı şey anlatır.

## Acceptance Criteria

- Fon Hareketleri ekranında fon koduna ve bankaya göre iki filtre vardır.
- Filtreler açılır listedir; seçenekler kullanıcının kendi işlemlerinden gelir.
- Fon seçeneği kodu ve fon adını birlikte gösterir.
- İki filtre aynı anda uygulanabilir; sonuç ikisini birden sağlayan işlemlerdir.
- Her filtrenin "tümü" seçeneği vardır ve başlangıç durumu budur.
- Tablo, toplam satırı ve kayıt sayacı filtrelenmiş kümeyi yansıtır.
- Sayaç filtre uygulandığında toplam kayıt sayısını da gösterir.
- Metrik kutuları filtreden etkilenmez.
- İşlem eklendikten, düzenlendikten veya silindikten sonra filtre korunur.
- Filtre sonucu boşsa tablo yerine anlaşılır bir metin çıkar; sessizce boş
  tablo gösterilmez.
