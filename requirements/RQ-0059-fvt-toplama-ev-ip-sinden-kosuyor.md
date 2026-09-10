---
id: RQ-0059
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-09T08:23:51.551Z"
branch: "factory/RQ-0059"
createdFromCommit: "e98792ac1f6e980fb1fcc6b7c540137512d8517f"
completedRunId: "20260910080707-RQ-0059"
completedBy: "human"
completedAt: "2026-09-10T08:09:38.628Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/118"
githubPullRequestIid: 118
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/117"
githubIssueIid: 117
repositoryProvider: github
---
# RQ-0059 - fvt toplama ev IP sinden kosuyor

Hisse kırılımını fvt.com.tr'den topluyoruz ve sunucu her gün 71 fonda 403
alıyor. Koşum bu yüzden `partial` düşüyor ve Collector Log gerçek hataların
görülemeyeceği kadar dolu.

## Ölçüm

Engel istemcide değil, IP'de:

    sunucu · curl              · /api/funds/{KOD}/distribution   403 Cloudflare
    sunucu · impit             · aynı uç                         403
    sunucu · gerçek Chrome     · aynı uç                         403
    sunucu · Chrome + sekme    · sayfadan aynı uca istek         403
    sunucu · curl              · /api/app-token                  200
    ev     · curl + x-device-id · /api/funds/{KOD}/distribution   200, 82 kalem

Sunucudan `/api/app-token` ve `/api/settings/*` 200 dönüyor: engel bütün IP'ye
değil, veri uçlarına özel ve bilinçli. Sayfanın HTML'i 82 kalemin yalnız 5'ini
taşıyor (SEO amaçlı SSS bloğu), yani HTML parse etmek de veriyi vermiyor.
TEFAS kalem düzeyinde veri yayımlamıyor; alternatif kaynak yok.

Sonuç: bu toplama sunucudan koşamıyor. Ev makinesinden koşuyor ve uzak
veritabanına yazıyor.

## Aynı günü iki kez toplamak

Timer'dan önce elle koşturulan gün timer 10:30'da aynı veriyi bir daha
çekiyordu — bugün ölçüldü, 10:22'deki koşumdan sonra 10:31'de ikincisi girdi.

Kapı "koştu mu" ile değil "bitti mi" ile kapanıyor. Fonlar günü farklı
saatlerde yayımlıyor: bugün 10:36'da 67 fon 10 Eylül'ü vermişti, GUH, PNU,
PHE ve PRY vermemişti; üçü öğleden önce yayımladı. Başarılı koşumdan sonra
eksik fon kaldıysa yeniden koşmak işin kendisi.

## Panel iki yanlış söylüyordu

**"Henüz Koşmadı"** — koşum sürerken `finished_at` boş olduğu için kutu hiç
koşmamış gibi yazıyordu. Timer tam o sırada çalışıyordu.

**Getiri Günü** — evrenin en ileri gününü okuyordu ve bir tek fonun günü
vermesi yetiyordu. Portföy hesabı ise bir fonun fiyatı eksikse o günü hiç
üretmiyor. Kutu "10 Eylül" derken altındaki Günlük Getiri 9 Eylül'ün
rakamıydı. Gün artık kullanıcının ölçülebilir son günü.

Kural kullanıcı başına: tek bir fonun eksikliği herkesin gününü dondurmamalı.
TEFAS'a kapanan AAK bunu göstermişti, fiyatı bir daha hiç gelmiyor.

## Acceptance Criteria

- Zamanlanmış collector fvt uçlarına istek atmıyor; koşum `passed` bitiyor.
- Hisse kırılımı ev makinesinden toplanıyor ve uzak veritabanına yazıyor;
  yerel veritabanına yazması mümkün değil.
- Başarılı ve eksiksiz bir koşumdan sonra aynı gün ikinci koşum atlanıyor.
- Eksik fon kaldıysa koşum tekrarlanabiliyor; `--force` her hâlde zorluyor.
- Koşum sürerken panel "Henüz Koşmadı" demiyor.
- Getiri Günü ile Günlük Getiri aynı günü gösteriyor.
- Gün geride kaldığında kutu sebebini yazıyor.
