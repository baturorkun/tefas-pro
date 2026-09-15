---
id: RQ-0073
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-15T21:36:57.415Z"
branch: "factory/RQ-0073"
createdFromCommit: "7eab79c3974bc7782f4cd25b5b29b8b7bce04029"
completedRunId: "20260915215102-RQ-0073"
completedBy: "human"
completedAt: "2026-09-15T21:53:53.634Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/147"
githubPullRequestIid: 147
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/146"
githubIssueIid: 146
repositoryProvider: github
---
# RQ-0073 - Fiyatın tarihi TEFAS'tan alınsın, Getiri Günü kutusu değerlerin ne zaman geleceğini söylesin

İki sorun da Getiri Günü'nün doğruluğu ve okunurluğuyla ilgili.

**Fiyat yanlış güne yazılabiliyor.** Zamanlanmış koşum `fonBilgiGetir`'den
gelen fiyatı, koşumun yapıldığı günün tarihiyle yazıyor. Ama o uç fiyatın
HANGİ güne ait olduğunu söylemiyor; yalnız "son fiyat" veriyor. Bir fon
henüz fiyat açıklamamışsa TEFAS dünkü fiyatı döndürür ve biz onu bugünün
verisi diye kaydederiz. Sonuç: uydurma bir günlük getiri ve yanlış ilerlemiş
Getiri Günü.

Timer'lar 10:00'a alındığı için bu risk somut: fonların bir kısmı o saatte
henüz açıklamamış olabilir.

Ölçüldü — `fonFiyatBilgiGetir` ucu tarihli seri veriyor ve en son kaydı
`sonFiyat` ile birebir aynı:

    TLY  2026-09-14  9965.200719
    TLY  2026-09-15  10133.510887   <- sonFiyat ile ayni

Yani tarih öğrenilebiliyor. Çözüm saati tahmin etmek değil, tarihi kaynağın
söylediği gibi yazmak: fon açıklamamışsa o fonun günü ilerlemez, uydurma
satır oluşmaz. Koşum saatinden bağımsız olarak doğru olur.

**Kutu, değerlerin ne zaman geleceğini söylemiyor.** Gün ertesiye geçtiğinde,
toplama daha koşmadan, kutu dünkü koşumun "toplandı 10:04 · 74 fon"
yazısını gösteriyor. Kullanıcı bugünün verisinin gelip gelmeyeceğini
bilmiyor. Bu durumda değerlerin 10:30'a kadar geleceği yazılmalı.

## Acceptance Criteria

- Günlük satırın tarihi TEFAS'ın bildirdiği fiyat tarihidir; koşum günü
  varsayılmaz.
- Fon bugünün fiyatını açıklamamışsa bugüne satır yazılmaz; var olan gün
  tekrar yazılabilir ama gün ileri kaydırılmaz.
- Tek fonluk toplama da aynı kuralı uygular; iki yol ayrışmaz.
- Getiri Günü kutusu, veri günü geride VE bugün iş günüyken değerlerin
  10:30'a kadar geleceğini söyler.
- Bu uyarı hafta sonu gösterilmez: cumartesi veri günü cuma olur ve bu
  doğrudur, gelecek bir şey yoktur.
- Uyarı 10:30'dan sonra gösterilmez; o saatten sonra gün hâlâ gerideyse
  sebep mevcut mesajlarla anlatılır.

## Kapsam dışı

- Resmî tatillerin takvimi: borsa kapalıyken de hafta içi sayılır. Tatil
  günü kutu "gelecek" der ve gelmez; yanlış ama zararsız, ayrı bir iş.
- KAP ve hisse fiyat toplamalarının tarih davranışı: ikisi de kaynağın
  bildirdiği tarihi zaten kullanıyor.
