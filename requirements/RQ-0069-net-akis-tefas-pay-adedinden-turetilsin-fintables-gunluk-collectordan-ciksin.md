---
id: RQ-0069
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-15T13:58:40.581Z"
branch: "factory/RQ-0069"
createdFromCommit: "d7848dcd4bd054aee9862f9d7cc2be5912b21227"
completedRunId: "20260915175226-RQ-0069"
completedBy: "human"
completedAt: "2026-09-15T17:57:03.065Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/139"
githubPullRequestIid: 139
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/138"
githubIssueIid: 138
repositoryProvider: github
---
# RQ-0069 - Net akış TEFAS pay adedinden türetilsin, Fintables günlük collector'dan çıksın

Fintables 15 Eylül'de dört bağımsız ağdan (sunucu, iki ev IP'si, Anthropic
altyapısı) aynı anda 403 vermeye başladı ve geri gelmedi. RQ-0068 fiyat,
günlük getiri, yatırımcı sayısı ve büyüklüğü TEFAS'ın resmi API'sine taşıyarak
Getiri Günü'nü kurtardı. Geriye Fintables'a bağlı kalan tek günlük alan
**net akış** (`fact_fund_daily.net_flow`) kaldı.

Net akış ayrı bir veri değil, türetilebilir bir büyüklük: dolaşımdaki pay
adedindeki günlük değişim × o günkü pay fiyatı. TEFAS'ın `fonBilgiGetir` ucu
`payAdet`i zaten döndürüyor ve RQ-0068 bunu `shares_active` olarak yazıyor.

**Ölçüm.** Fintables'ın geçmişte yazdığı gerçek `net_flow` değerleriyle bu
formül 405 gözlem üzerinde karşılaştırıldı:

    korelasyon                     0.936
    yön tutarlılığı                %98.8
    medyan sapma                   %0.00
    1 gün aralıkta tam isabet      %94.9  (355 gözlem)
    3 gün aralıkta tam isabet      %100   (46 gözlem)

Vakaların %90'ından fazlasında sapma tam sıfır — Fintables bu rakamı zaten
aynı formülle üretiyormuş, bağımsız bir kaynak değilmiş. Kalan sapma
Fintables'ın kendi düzeltmelerinden ve yuvarlamadan geliyor, büyüklük olarak
anlamsız.

Bu RQ, net akışı TEFAS verisinden türetip Fintables'ı **günlük collector'ın
kritik yolundan tamamen çıkarır**. Fintables istemcisi ve ona bağlı
zamanlanmış koşum silinmez; varlık sınıfı dağılımı hâlâ oradan geliyor ve o
iş RQ-0070'e (KAP entegrasyonu) bırakıldı.

## Acceptance Criteria

- Net akış, `shares_active` günlük değişimi × `nav_per_share` formülüyle
  TEFAS verisinden türetilir ve `fact_fund_daily.net_flow` alanına yazılır.
- Türetme yalnız bir önceki iş gününe ait `shares_active` mevcutsa yapılır;
  eksikse `net_flow` NULL kalır, uydurma değer yazılmaz.
- Fintables'tan gelen `net_flow` değeri varsa üzerine yazılmaz — mevcut
  COALESCE upsert davranışı korunur, iki kaynak çakışmaz.
- `dist/collect-tefas.js` ile koşan zamanlanmış TEFAS toplaması, Fintables
  hiç çalışmasa dahi net akışı dolduruyor.
- Nakit Akışı ekranı ve ona bağlı sorgular, Fintables kaynaklı satır olmadan
  da veri gösteriyor.
- Türetilen değerin geçmiş Fintables verisiyle uyumu bir test ile korunuyor.

## Kapsam dışı

- Fintables istemcisinin veya `src/collector.ts`'in silinmesi — varlık sınıfı
  dağılımı hâlâ oradan geliyor.
- Varlık dağılımı, stopaj, valör ve ücret verilerinin kaynağının
  değiştirilmesi — bunlar RQ-0070'te KAP'a taşınacak.
- fvt'nin kaldırılması — o da RQ-0070 kapsamında.
- Geçmiş `net_flow` verisinin yeniden hesaplanması; mevcut veri olduğu gibi
  kalır.
