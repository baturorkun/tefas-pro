---
id: RQ-0051
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-07T21:08:31.916Z"
branch: "factory/RQ-0051"
createdFromCommit: "ec71b11e1e3c5ef94af6799820583d7788fd5af5"
completedRunId: "20260907210941-RQ-0051"
completedBy: "human"
completedAt: "2026-09-07T21:20:56.805Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/102"
githubPullRequestIid: 102
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/101"
githubIssueIid: 101
repositoryProvider: github
---
# RQ-0051 - Piyasa ekranı sekmelere ayrılıyor

Piyasa ekranı üç bölümü alt alta diziyor: Getiri, Para Akışı, Yatırımcı
Sayısı. Her bölümde dört panel var, toplam on iki. Pencere kaydırıcıları
sayfanın en üstünde.

## Ölçüm

    sayfa yüksekliği        2764 px
    ekran                    900 px   → 3,1 ekran boyu kaydırma
    kaydırıcı şeridi         ilk 222 px içinde
    panel                    12  (3 bölüm × 4)

Kaydırıcı, sayfanın kaydırma menzilinin %92'sinde ekran dışında kalıyor.
Alttaki bir grafiği incelerken pencereyi değiştirmek için başa dönmek,
değiştirmek, sonra tekrar aşağı inmek gerekiyor.

## Sekme mi, yapışkan şerit mi

İlk akla gelen çözüm kaydırıcıyı `position: sticky` yapmak. Erişim sorununu
çözer ama uzunluğu çözmez: on iki panel ve üç ekranlık kaydırma yerinde
kalır, üstelik şerit her ekranda dikey alandan yer çalar.

Sekme ikisini birden çözüyor. Bir sekmede dört panel kalıyor, sayfa bir
ekrana yaklaşıyor ve kaydırıcı zaten görünür durumda oluyor — yapışkan
yapmaya gerek kalmadan.

Sekme deseni ekranda zaten var: Hisseler'de Hisse/Sektör, fon detayında
varlık türleri ve hisse sekmeleri aynı `tabs` bileşeniyle çiziliyor.

## Ne değişmiyor

Sol/sağ pencere ayrımı duruyor. Ekranın amacı iki pencereyi yan yana
karşılaştırmak; sekme bölümler arasında geçiş için, pencereler için değil.

`/api/market` ucu değişmiyor. Sekme değiştirmek yeni istek atmamalı: iki
pencerenin yanıtı zaten üç bölümü de taşıyor, veri elde.

## Acceptance Criteria

- Getiri, Para Akışı ve Yatırımcı Sayısı bölümleri sekmeye dönüşür; aynı
  anda yalnız biri görünür.
- Pencere kaydırıcıları sekmelerin üstünde kalır ve her sekmede görünür.
- Seçili sekme sayfa yenilendiğinde korunur; varsayılan Getiri.
- Sekme değiştirmek `/api/market`'e yeni istek atmaz.
- Sol ve sağ pencere ayrımı değişmez.
- Sekme deseni ekranın geri kalanıyla aynı bileşeni kullanır.
- Sayfa üç ekranlık olmaktan çıkar: 1500×900 ekranda kaydırma menzili 221
  px'e iner (önce 1864 px), yani kaydırıcıya ulaşmak tek hareket olur.
  1000 px ve üstü ekranlarda şerit dipteyken bile görünür kalır.

