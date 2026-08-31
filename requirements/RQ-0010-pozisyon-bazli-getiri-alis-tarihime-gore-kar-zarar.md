---
id: RQ-0010
status: draft
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-08-31T19:03:59.321Z"
branch: "factory/RQ-0010"
createdFromCommit: "5a9c74c7783c51becf7b5e398a2264d3e943015d"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/20"
githubPullRequestIid: 20
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/19"
githubIssueIid: 19
repositoryProvider: github
---
# RQ-0010 - Pozisyon bazlı getiri: alış tarihime göre kâr/zarar

Paneldeki bütün grafikler fonun kendi getirisini gösteriyor: sabit pencerede,
herkes için aynı. Kullanıcının o fondan ne kazandığı hiçbir yerde yok. Alış
tarihi kullanıcıya özel ve fark büyük.

Ölçüldü:

| Fon | Alıştan bugüne | Fon 1 ay | Ne oluyor |
|---|---:|---:|---|
| AFT | **−%1,59** (74 gün) | +%10,40 | fon toparlamış, ben hâlâ zarardayım |
| PIL | **−%3,88** (76 gün) | +%7,82 | aynı durum |
| DOH | +%6,95 (5 gün) | +%32,28 | geç girdim, ralinin çoğunu kaçırdım |

AFT ve PIL bugün "en çok kazandıran" panelinde görünüyor. Kullanıcının cebi
ekside. Panel yanlış bir şey söylemiyor — yanlış soruyu cevaplıyor.

## Pencere kırpılmaz

Her pozisyon kendi alış tarihinden son veri gününe kadar ölçülür. Bar başına
pencere farklı: TLY 114 gün, DOH 5 gün.

Pencereyi 1 hafta / 1 ay ile kırpmak denendi ve reddedildi: 30 günden eski
pozisyonlarda sonuç fon grafiğiyle **birebir aynı** çıkıyor. AFT kırpılmış
halde +%10,40 ile yine kazandıran tarafta kalıyordu — yani körlük geri
geliyordu. Sinyali veren şey tam olarak pencerenin kırpılmaması.

Bunun bedeli: sıralama süreye duyarlı. Uzun tutulan fon daha iyi olduğu için
değil, daha uzun tutulduğu için başa geçer. Bu yüzden **her barda gün sayısı
zorunlu** — okuyucu sıralamayı süreyle birlikte okumalı.

## Hesap: yeni veri toplanmayacak

Pozisyon getirisi, alış tarihinden son veri gününe kadarki günlük getirilerin
bileşiğidir:

```
getiri = Π(1 + günlük_getiri/100) − 1     alış < gün ≤ bitiş
```

NAV geçmişine gerek yok — birim sadeleşir. Bu şart, çünkü `fact_fund_daily`de
30.643 satırın yalnız 36'sında `nav_per_share` dolu; tarihsel NAV hiç
toplanmamış. Günlük getiri ise 30.179 satırda var.

TL tutarları için alış NAV'ı gerekir; o da türetilir: **bugünkü NAV / çarpan**.
Alış fiyatı hiçbir yerde saklı değil — `portfolio_transaction` yalnız adet ve
tarih taşıyor.

### Türetme üç bağımsız yolla doğrulandı

1. **Bilinen sonuçla eşleşme.** PBR'nin 2026-04-14 alışı 2026-08-18 satışına
   kadar **+%47,43**. Bağımsız elle ölçümle birebir aynı.

2. **Yuvarlak tutar testi.** Türetilen maliyetlerin 94'ten **79'u**, yuvarlak
   bin liralık tutarlara bir adetlik fark içinde oturuyor (DFI 49.997 ₺,
   IVY 29.999 ₺, CPT 20.000 ₺). İnsan "20 bin lira al" der; tam adet kısıtı
   yüzünden birkaç lira sapar. Türetme yanlış olsa bu örüntü çıkmazdı.
   Oturmayan 15'in altısı PNU ve tutarları 403.444 ₺, 262.272 ₺ gibi — fon
   değiştirmenin izi, yuvarlak olmaması beklenir.

3. **Zincir bütünlüğü.** Hiçbir fonun getiri serisinde eksik iş günü yok. Bir
   gün eksik olsa bileşik çarpan ve türetilen alış fiyatı sessizce yanlış
   çıkardı.

94 işlemin 94'ü hesaplanabiliyor, veri boşluğu yok.

## Ağırlıklandırma para bazlı olmalı

Aynı fondan farklı tarihlerde alım yapılınca fon başına tek getiri gerekir.
Çarpanların adet ağırlıklı ortalaması **yanlış**: her adet farklı fiyattan
alınmıştır, ağırlık paradır.

```
DOĞRU:   Σadet / Σ(adet/çarpan) − 1
YANLIŞ:  Σ(adet × çarpan) / Σadet − 1
```

TLY'de %63,48 yerine %72,33 veriyor — dokuz puan.

## Takip listesi: "almış gibi" simülasyon

RQ-0009'daki toggle açıkken takip listesindeki fonlar da grafiğe girer.
Simüle alış tarihi `user_watchlist.added_at`: "izlemeye başladığım gün almış
olsaydım ne olurdu".

Bu barlar **içi boş** çizilir — RQ-0009'da kurulan kural: dolu bar sahiplik,
içi boş bar takip listesi. Simülasyon gerçek pozisyonla karıştırılmamalı.

Toggle yeni bir kontrol değil, RQ-0009'un kontrolüdür. Aynı seçim hem piyasa
grafiklerini hem pozisyon grafiklerini yönetir; iki ayrı toggle kullanıcıyı
"hangisi neyi açıyordu" sorusuna mahkûm ederdi.

### Bugün simülasyon anlamlı sonuç vermez

`added_at` değerleri gerçek "izlemeye başladım" tarihleri değil: 26'sı
`db/watchlist.txt` tohumundan (2026-08-30), 9'u işlem aktarımından
(2026-08-31). Yani bugün bütün simülasyonlar 1-2 günlük pencereyle çıkar.

Bu bir kusur değil, verinin yaşı. Panelden eklenen her yeni fon gerçek tarih
alacak ve simülasyon zamanla anlamlanacak. Gün sayısı sütunu bu yüzden burada
da zorunlu: 1 günlük bir simülasyon 114 günlük bir pozisyonun yanında
yanıltmasın.

Tamamen satılmış bir fon RQ-0008 gereği takip listesinde geri belirir; grafiğe
gerçek alış tarihiyle değil, `added_at` ile simüle edilerek girer. Gerçek
kazancı kaybolmasın diye gerçekleşmiş kâr özet şeridinde ayrıca durur.

## Özet şeridi

Grafiğin üstünde: maliyet, bugünkü değer, kâr ₺ ve %, kaç pozisyon kârda /
zararda, kapanmış pozisyonların gerçekleşmiş kârı.

Bugünkü değerler: maliyet 3.095.853 ₺, değer 3.507.700 ₺, kâr 411.847 ₺
(%13,30), 48 pozisyon kârda / 7 zararda.

## Kapsam

- `analytics.position_return` view'ı: kullanıcı ve fon başına para ağırlıklı
  getiri, tutulan gün, maliyet, bugünkü değer, kâr ₺.
- Takip listesi fonları için `added_at`ten simüle edilmiş aynı hesap.
- Kapanmış pozisyonlar için gerçekleşmiş kâr: aynı hesap, bitiş = satış tarihi.
- `dashboard()` özet ve pozisyon sıralamalarını döndürür; mevcut toggle
  parametresi bu bölümü de yönetir.
- Dashboard'da yeni bölüm: özet şeridi + "en çok kazandıran / en çok
  kaybettiren pozisyonlarım" iki paneli.

## Acceptance Criteria

- [ ] Her açık pozisyonun getirisi, alış tarihinden son veri gününe kadarki
      günlük getirilerin bileşiğidir; pencere kırpılmaz.
- [ ] Aynı fondan birden çok alım para ağırlıklı birleştirilir; adet ağırlıklı
      ortalama kullanılmaz.
- [ ] Her barda o fonun kaç gündür tutulduğu görünür.
- [ ] Toggle açıkken takip listesi fonları `added_at`ten alınmış gibi hesaplanır
      ve içi boş bar olarak çizilir; kapalıyken hiç görünmezler.
- [ ] Sıralama toggle kapatılınca yeniden hesaplanır, bar gizlenmez.
- [ ] Getiri günü olmayan pozisyon veya simülasyon %0 gibi gösterilmez; listeye
      girmez.
- [ ] Özet şeridi maliyet, bugünkü değer, kâr ₺ ve % gösterir; kapanmış
      pozisyonların gerçekleşmiş kârı ayrı görünür.
- [ ] Hesap kullanıcıya özeldir: iki kullanıcı aynı fonu farklı tarihlerde
      almışsa farklı getiri görür.
- [ ] Mevcut dört piyasa grafiği ve toggle davranışı değişmez.
- [ ] Yapılandırılmış quality gate'ler (typecheck, test, build) geçer.

## Bilinen Basitleştirmeler

Ölçüm hatası üretirler; kapsam dışı ama sessizce geçilmemeli.

- **Valör.** Emir günü ile fiyatın oluştuğu gün aynı sayılıyor.
  `dim_fund_terms` `buy_valor_days` / `sell_valor_days` taşıyor ama hesaba
  katılmıyor. Getiri bir iş günü kayabilir.
- **Stopaj.** Brüt getiri gösteriliyor. `tax_pct` var, uygulanmıyor.
- **Kısmi satış.** Bir işlem ya tamamen açık ya tamamen kapalı; adedin bir
  kısmının satılması modellenmiyor. Veri modelinin sınırı.

## Kapsam Dışı

- Fonun aynı takvim penceresindeki getirisiyle yan yana karşılaştırma.
- Tarihsel NAV toplanması.
- Zaman içindeki portföy değeri grafiği.
