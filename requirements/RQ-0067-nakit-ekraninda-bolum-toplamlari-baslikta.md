---
id: RQ-0067
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-14T12:29:05.308Z"
branch: "factory/RQ-0067"
createdFromCommit: "07e2a132f0f87d0d1913edb559fe47a28f7c9f14"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/135"
githubPullRequestIid: 135
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/134"
githubIssueIid: 134
repositoryProvider: github
---
# RQ-0067 - Nakit ekranında bölüm toplamları başlıkta

Nakit ekranı üç bölüme ayrılıyor — Bugün Gelen, Sonraki Günler, Gelmiş Para —
ama hiçbirinin toplamı yok. "Bugün toplam ne gelecek" sorusunu cevaplamak için
satırları gözle toplamak gerekiyor.

Üstteki kutular Bugün ve Sonraki Günler toplamlarını gösteriyor, ama Gelmiş
Para'nın toplamı hiçbir yerde yok ve kutular bölüm başlıklarından uzakta.

## Toplam başlıkta, tablonun altında değil

Tablonun altına konan bir toplam satırı uzun listede ekran dışında kalıyor:
Gelmiş Para bölümü onlarca satır olabiliyor ve toplamı görmek için ta aşağı
inmek gerekiyordu. Panel başlığındaki meta satırı zaten okunan yer.

## Tahmin işareti

Gerçekleşmemiş satışların tutarı son fiyattan hesaplanıyor. Böyle bir satır
toplama giriyorsa başlıkta `≈` işareti çıkar; kesin tutar gibi okunmamalı.
Satır bazında bu işaret zaten vardı, toplamda yoktu.

## Sayı okunur olmalı

Meta satırı soluk gri ve tutar cümlenin içinde kayboluyordu. Sayı uyarı
sarısıyla yazılıyor (`--warn`). Yeşil ve kırmızı kullanılmıyor: bu uygulamada
onlar kâr ve zarar demek ve gelen parayı yeşil yazmak kazanç gibi okunurdu.
`--text-strong` de olmuyor, başlık o renk ve ikisi yarışıyordu.

## Banka kırılımı

Bir günün girişi iki bankaya bölünebiliyor ve genel toplam hangisine ne
geldiğini söylemiyordu. Toplamın yanında parantez içinde banka bazında tutar,
büyükten küçüğe. Yalnız birden fazla banka varken; tekte parantez aynı sayıyı
ikinci kez yazmak olur ve banka zaten tablonun sütununda.

## Meta alt satırda

Toplam ve banka kırılımı birlikte başlığın yanına sığmıyor. `panel()` isteğe
bağlı bir seçenek alıyor ve yalnız bu üç panel kullanıyor. Varsayılan yan yana
kalıyor: açıklama panelin kendisini anlatıyor ve uzağa düşünce hangi panele
ait olduğu bakışla kurulmuyor.

## Acceptance Criteria

- Üç bölümün de başlığında o bölümün toplamı yazıyor.
- Toplam tablonun altında tekrarlanmıyor.
- Bölüm boşsa başlıkta tutar yazmıyor, mevcut açıklama kalıyor.
- Tahmini tutar içeren bölümün toplamı `≈` ile işaretleniyor.
- Toplam tek yerden hesaplanıyor; üç bölüm aynı yardımcıyı kullanıyor.
- Tutar ve adet sarıyla vurgulanıyor; kâr/zarar rengi ve başlık rengi değil.
- Birden fazla banka varsa toplamın yanında banka kırılımı görünüyor.
- Meta satırı başlığın altında; diğer paneller etkilenmiyor.

## Kapsam dışı

- Üstteki kutuların düzeni.
- Banka bazında kırılım; o zaten kutularda var.
