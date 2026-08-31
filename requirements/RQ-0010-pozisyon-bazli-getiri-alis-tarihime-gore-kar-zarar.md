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

Paneldeki bütün grafikler fonun kendi getirisini gösteriyor: sabit pencerede
(1 hafta / 1 ay), herkes için aynı. Kullanıcının o fondan ne kazandığı hiçbir
yerde yok. Oysa alış tarihi kullanıcıya özel ve fark büyük.

Ölçüldü:

| Fon | Benim getirim | Fon 1 ay | Ne oluyor |
|---|---:|---:|---|
| AFT | **−%1,59** (74 gün) | +%10,40 | fon toparlamış, ben hâlâ zarardayım |
| PIL | **−%3,88** (76 gün) | +%7,82 | aynı durum |
| DOH | +%6,95 (5 gün) | +%32,28 | geç girdim, ralinin çoğunu kaçırdım |

AFT ve PIL bugün "en çok kazandıran" panelinde görünüyor. Kullanıcının cebi
ekside. Panel yanlış bir şey söylemiyor — yanlış soruyu cevaplıyor.

## Hesap: yeni veri toplanmayacak

Pozisyon getirisi, alış tarihinden bugüne günlük getirilerin bileşiğidir:

```
getiri = Π(1 + günlük_getiri/100) − 1     alış < gün ≤ bitiş
```

NAV geçmişine gerek yok — birim sadeleşir. Bu şart, çünkü `fact_fund_daily`'de
30.643 satırın yalnız 36'sında `nav_per_share` dolu; tarihsel NAV hiç
toplanmamış. Günlük getiri ise 30.179 satırda var.

Doğrulandı: PBR'nin 2026-04-14 alışı 2026-08-18 satışına kadar **+%47,43**.
Elle yapılan bağımsız ölçümle birebir aynı. 94 işlemin 94'ü hesaplanabiliyor,
veri boşluğu yok.

TL tutarları da türetilebilir: alış NAV'ı = bugünkü NAV / çarpan.

## Ağırlıklandırma para bazlı olmalı

Aynı fondan farklı tarihlerde alım yapılınca fon başına tek getiri gerekir.
Çarpanların adet ağırlıklı ortalaması **yanlış** sonuç verir: her adet farklı
fiyattan alınmıştır, ağırlık paradır.

```
DOĞRU:   Σadet / Σ(adet/çarpan) − 1
YANLIŞ:  Σ(adet × çarpan) / Σadet − 1
```

Fark küçük değil — TLY'de %63,48 yerine %72,33, dokuz puan.

## Nerede görünecek

Dashboard'a **Pozisyonlarım** bölümü. Mevcut dört piyasa grafiğine
dokunulmuyor; onlar "piyasada ne oluyor" sorusunun doğru cevabı.

**Özet şeridi:** maliyet, bugünkü değer, kâr ₺ ve %, kaç pozisyon kârda /
zararda. Kapanmış pozisyonların gerçekleşmiş kârı ayrı bir metrik olarak
burada durur — PBR'yi +%47 ile sattığı bilgisi kaybolmasın.

**Grafik:** açık pozisyonlar, fon başına, getiriye göre sıralı. Top-10
kesilmez — bu kullanıcının kendi portföyü, altı fonu gizlemek hiçbir soruyu
cevaplamaz. Kesme evreni görmek için gerekliydi, burada değil.

Her barda **tutulan gün sayısı**. Zorunlu: pencereler bar başına farklı, TLY
114 gün iken DOH 5 gün. Gün sayısı olmadan sıralama yanıltıcı olur — uzun
tutulan fon daha iyi olduğu için değil, daha uzun tutulduğu için başa geçer.

Sahiplik ayrımı (dolu / içi boş bar) burada yok: listenin tamamı zaten açık
pozisyon.

## Kapsam

- `analytics.position_return` view'ı: kullanıcı ve fon başına para ağırlıklı
  getiri, tutulan gün, maliyet, bugünkü değer, kâr ₺.
- Kapanmış pozisyonlar için gerçekleşmiş kâr: aynı hesap, bitiş = satış tarihi.
- `dashboard()` özet ve pozisyon sıralamasını döndürür.
- Dashboard'da yeni bölüm: özet şeridi + sıralı pozisyon grafiği.

## Acceptance Criteria

- [ ] Her açık pozisyon için getiri, alış tarihinden son veri gününe kadarki
      günlük getirilerin bileşiğidir.
- [ ] Aynı fondan birden çok alım para ağırlıklı birleştirilir; adet ağırlıklı
      ortalama kullanılmaz.
- [ ] Grafikte her barda o fonun kaç gündür tutulduğu görünür.
- [ ] Açık pozisyonların tamamı listelenir, top-10 kesilmez.
- [ ] Özet şeridi maliyet, bugünkü değer, kâr ₺ ve % gösterir; kapanmış
      pozisyonların gerçekleşmiş kârı ayrı görünür.
- [ ] Hesap kullanıcıya özeldir: iki kullanıcı aynı fonu farklı tarihlerde
      almışsa farklı getiri görür.
- [ ] Getirisi hesaplanamayan pozisyon (veri boşluğu) sıfır gibi gösterilmez,
      ayrı belirtilir.
- [ ] Mevcut dört piyasa grafiği ve toggle davranışı değişmez.
- [ ] Yapılandırılmış quality gate'ler (typecheck, test, build) geçer.

## Bilinen Basitleştirmeler

Ölçüm hatası üretirler; RQ'nun kapsamı dışında ama sessizce geçilmemeli.

- **Valör.** Emir günü ile fiyatın oluştuğu gün aynı sayılıyor. `dim_fund_terms`
  `buy_valor_days` / `sell_valor_days` taşıyor ama hesaba katılmıyor. Getiri
  bir iş günü kayabilir.
- **Stopaj.** Brüt getiri gösteriliyor. `tax_pct` var, uygulanmıyor.
- **Kısmi satış.** Bir işlem ya tamamen açık ya tamamen kapalı; adedin bir
  kısmının satılması modellenmiyor. Mevcut veri modelinin sınırı.

## Kapsam Dışı

- Fonun aynı takvim penceresindeki getirisiyle yan yana karşılaştırma
  (AFT/PIL tablosundaki "fark" sütunu). Değerli ama ayrı bir adım.
- Tarihsel NAV toplanması.
- Zaman içindeki portföy değeri grafiği.
