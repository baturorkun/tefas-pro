---
id: RQ-0068
status: draft
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-15T10:28:57.681Z"
branch: "factory/RQ-0068"
createdFromCommit: "4f8dc57e46db91fa05bea6dd454d30a2ef3af099"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/137"
githubPullRequestIid: 137
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/136"
githubIssueIid: 136
repositoryProvider: github
---
# RQ-0068 - TEFAS resmi API'si birincil fiyat kaynağı, sunucuda zamanlanmış

Fintables 15 Eylül'de dört bağımsız ağdan (sunucu, iki ev IP'si, Anthropic
altyapısı) aynı anda 403 vermeye başladı — IP'ye özel değil, kalıcı bir
durum. Ev IP'sinden manuel toplama geçici bir yama; kalıcı, otomatik bir
kaynak gerekiyor.

## Ölçüm: TEFAS'ın kendi API'si

`www.tefas.gov.tr`'nin web sayfaları (TarihselVeriler.aspx, /tr/fon-verileri,
FonAnaliz.aspx, /tr/fon-detayli-analiz) Akamai bot korumasına takılıyor — düz
istek de headless tarayıcı da JS-sensör kabuğundan öteye geçemiyor.

Ama `api/funds/*` altındaki uçlar bu korumaya HİÇ tabi değil:

    ev IP'si  · fonBilgiGetir      200, tam veri
    sunucu IP'si · fonBilgiGetir   200, tam veri  ← kritik fark

Fintables ve fvt'nin ikisi de veri merkezi IP'lerini engelliyordu; TEFAS'ın
kendi API'si engellemiyor. Bu, sunucuda zamanlanmış bir koşuma izin veriyor,
evden manuel toplamaya gerek kalmadan.

Kaynak kullanıcının kendi eski projesinden (github/tefas, main.py) alındı —
aylardır bu uçları kullanıyordu, ölçülerek doğrulandı.

    fonBilgiGetir(kod) → tek çağrıda: son fiyat, GÜNLÜK GETİRİ (hazır),
                          yatırımcı sayısı, fon büyüklüğü, pay adedi

## Mimari: TEFAS birincil, Fintables tamamlayıcı

TEFAS her gün, sunucuda, güvenilir şekilde çalışır: fiyat, günlük getiri,
yatırımcı sayısı, büyüklük, pay adedi. Bunlar Getiri Günü'nü ilerletmeye
yeter.

Fintables çalışıyorsa EK veri sağlar: net akış (cashflow), varlık sınıfı
dağılımı, stopaj/valör/ücret gibi durağan bilgiler. Artık kritik yolda değil
— başarısız olsa bile günlük getiri hesabı etkilenmez.

fvt değişmiyor: hisse kırılımı için evden devam ediyor, ayrı bir veri türü.

## Kök neden: korumasız ln() ile üretim çöktü

PHE bugün fiyatı sıfıra indi (muhtemelen tasfiye/askıya alma — iki bağımsız
TEFAS ucu aynı şeyi doğruladı). `analytics.position_return` ve
`position_slice` view'lerindeki bazı `ln(1 + d.daily_return_pct / 100)`
çağrıları `greatest(...,1e-9)` koruması TAŞIMIYORDU (bazı diğer view'ler
taşıyordu — tutarsızdı). Panel `/api/dashboard` "cannot take logarithm of
zero" ile 400 döndü, kapanmış PHE pozisyonu olan her kullanıcı için.

Bu tek seferlik bir olay değil: herhangi bir fon fiyatı sıfıra inerse (ya da
-%100 getiri kaydedilirse) aynı çökme tekrarlanır. Bütün `ln()` çağrıları
`greatest(...,1e-9)` ile korunmalı, sadece bazıları değil.

## Acceptance Criteria

- `src/sources/tefas.ts`: TEFAS API istemcisi, kalıcı kaynak olarak.
- Sunucuda zamanlanmış koşum TEFAS'tan fiyat/getiri/yatırımcı/büyüklük çeker;
  Fintables'a bağımlı değil.
- Fintables başarısız olursa günlük getiri hesabı yine de ilerler.
- `position_return`, `position_slice` ve varsa benzer view'lerdeki TÜM
  `ln()` çağrıları `greatest(...,1e-9)` korumalı.
- PHE/PBR gibi fiyatı sıfıra inen bir fon artık `/api/dashboard`'ı
  düşürmüyor — test bunu ölçerek doğruluyor.
- Testler ve gate'ler geçiyor.

## Kapsam dışı

- Fintables'ı tamamen kaldırmak; net akış ve varlık dağılımı için hâlâ
  kullanılıyor.
- fvt'nin toplama yöntemi; değişmiyor.
- TEFAS'ın dönemsel getiri (1 ay/3 ay/vs.) verisi; günlük getiri zincirinden
  zaten türetiliyor.
