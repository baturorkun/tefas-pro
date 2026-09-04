---
id: RQ-0029
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-04T06:12:43.581Z"
branch: "factory/RQ-0029"
createdFromCommit: "1e2e19371c17ccda3f28f970a196b1c3b31df5ee"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/58"
githubPullRequestIid: 58
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/57"
githubIssueIid: 57
repositoryProvider: github
---
# RQ-0029 - Dağılım ekranı: portföyün banka ve kategori kırılımı

Portföyüm ekranı fon fon listeliyor: her satır bir fon. "Paramın nasıl
dağıldığı" ise başka bir soru ve hiçbir yerde cevabı yok.

Ölçülen veride bu ayrımın neden önemli olduğu görünüyor: on fonla hisse senedi
şemsiyesindesin ama para olarak orada yalnız %19 var; tek bir para piyasası
fonu neredeyse aynı ağırlıkta (%33). Fon sayısı ile para ağırlığı bu kadar
ayrışıyorsa, fon listesine bakarak dağılımı kestirmek mümkün değil.

Bu ekran aynı portföyü farklı boyutlara göre gruplar. İlk iki boyut banka ve
TEFAS kategorisi (şemsiye fon tipi); ikisinin verisi de bugün mevcut, yeni
toplama gerektirmiyor.

Adı "İstatistik" değil "Dağılım": istatistik ne olduğunu söylemiyor ve zamanla
her ekranın atıldığı bir çekmeceye dönerdi. Dağılım ekranın cevapladığı soruyu
doğrudan söylüyor.

## Ağırlık para üzerinden hesaplanır

Grup ağırlığı fon sayısına değil güncel değere göre ölçülür. Fon sayısı da
gösterilir ama ağırlık değildir: bir grupta on fon bulunması o gruba çok para
konduğu anlamına gelmiyor.

## Kapsam

Yalnız açık pozisyonlar. Kapanmış pozisyonlar bu ekranın konusu değil; onların
yeri Kapananlar ve orada zaten gerçekleşen kâr/zararla birlikte duruyor.

Tema kırılımı bu RQ'da yok. Eski projede tema fon adından anahtar kelimeyle
tahmin ediliyor; taşınacak bir kelime listesi var ve o ayrı bir karar.

## Acceptance Criteria

- Menüde Portföyüm'den sonra bir Dağılım ekranı vardır; herkese açıktır.
- Ekran açık pozisyonları bankaya ve TEFAS kategorisine göre gruplar.
- Her grup için fon sayısı, güncel değer, maliyet, kâr/zarar ve ağırlık
  gösterilir.
- Ağırlık güncel değer üzerinden hesaplanır, fon sayısı üzerinden değil.
- Grup ağırlıklarının toplamı %100'dür; hiçbir açık pozisyon dışarıda kalmaz.
- Gruplar ağırlığa göre büyükten küçüğe sıralanır.
- Kategorisi bilinmeyen fon kendi grubunda toplanır, sessizce düşmez.
- Açık pozisyon yoksa ekran boş durum metniyle açılır, hata vermez.
- Toplam satırı Portföyüm ekranındaki maliyet ve güncel değerle tutarlıdır.
- Kapanmış pozisyonlar dağılıma girmez.
