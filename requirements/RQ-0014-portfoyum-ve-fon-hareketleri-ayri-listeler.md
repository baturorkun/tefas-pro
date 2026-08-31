---
id: RQ-0014
status: draft
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-08-31T21:04:08.823Z"
branch: "factory/RQ-0014"
createdFromCommit: "d7566aa5e7ced14749882ce425c11cb04fd91a49"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/28"
githubPullRequestIid: 28
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/27"
githubIssueIid: 27
repositoryProvider: github
---
# RQ-0014 - Portföyüm ve Fon Hareketleri ayrı listeler

Bugün tek bir tablo var: 94 işlem, açığı ve kapanmışı bir arada, "Durum"
rozetiyle ayrılmış. Bu tablo iki ayrı soruyu birden cevaplamaya çalışıyor ve
ikisini de iyi cevaplamıyor.

| Soru | Doğru granülerlik | Bugün |
|---|---|---|
| Neredeyim? Hangi fondayım, ne kazandırıyor? | fon başına, 26 satır | yok |
| Ne yaptım? Hangi alımı ne zaman, hangi fiyattan? | işlem başına, 94 satır | var |

Fon bazında toplam hiçbir yerde yok. TLY'nin yedi ayrı alımı var; "TLY'de ne
durumdayım" sorusunun cevabı için kullanıcının yedi satırı gözüyle toplaması
gerekiyor.

Referans, kullanıcının bugün elle ürettiği rapordaki ayrım: **Fund Summary**
(26 fon, yalnız açık) ve **Transaction Detail** (işlem dökümü).

## İki liste, iki menü girdisi

**Portföyüm** — fon başına, yalnız açık pozisyonlar. Salt okunur.
**Fon Hareketleri** — işlem başına, alış ve satış. Ekleme, düzenleme, silme
burada.

Düzenlemenin tek yerde durması önemli: bugünkü tablo hem gösteriyor hem
düzenletiyor. Fon özeti türetilmiş bir görünüm, düzenlenecek bir satırı yok.

Sol menü: `Panel · Portföyüm · Fon Hareketleri · Takip listem · Kullanıcılar`.

### Portföyüm sütunları

| Sütun | Kaynak |
|---|---|
| Fon, unvan | `dim_fund` |
| Günlük % | `fund_latest.daily_return_pct` |
| 1 ay %, 3 ay % | `fund_returns` |
| Gün | `position_return.days` — ilk alıştan bugüne |
| Adet | işlem adetleri toplamı |
| Maliyet, Değer, K/Z, K/Z % | `position_return` |

`fund_returns` bugün 3 aylık pencere üretmiyor; eklenecek.

## NAV taşıması bu RQ'nun parçası

Tablo TL gösterecekse rakamların doğru olması gerekiyor; bugün bazı günler
değil.

`analytics.fund_latest` fonun son **dolu** NAV'ını veriyor. Kaynak NAV'ı bazı
fonlar için geç yayımlıyor: 2026-08-31 akşamı 36 fonun 33'ünde NAV vardı,
TMG, TAU ve IKP 28 Ağustos'ta kalmıştı. O üç fonun toplam pozisyon değeri
123.212 TL ve panel onları üç gün eski fiyattan gösteriyordu.

Getiri serisi eksiksiz olduğu için NAV bugüne taşınabilir:

```
nav_bugün = son_dolu_nav × Π(1 + günlük_getiri/100)
```

Doğrulandı — üçü de kullanıcının bağımsız raporundaki fiyatla birebir:

| Fon | Kayıtlı (28 Ağu) | Taşınmış | Rapor |
|---|---:|---:|---:|
| TMG | 1,4516 | **1,4636** | 1,4636 |
| TAU | 0,6428 | **0,6509** | 0,6509 |
| IKP | 9,2380 | **9,2519** | 9,2519 |

Taşımadan önce toplam değer 3.514.452 TL, raporda 3.515.510 TL. Fark tam da
bu üç fondan geliyor.

## Türetme doğrulandı

Kullanıcının bağımsız raporuyla karşılaştırıldı:

| | Bizim | Rapor |
|---|---:|---:|
| Toplam maliyet | 3.094.832 | 3.095.853 |
| Getiri % | **13,56%** | **13,56%** |
| Gerçekleşmiş K/Z | **+32.995** | **+32.995** |

Alış fiyatları da dört ondalığa kadar aynı (TLY 4308,7099 ↔ 4308,7100;
DFI 3,3212 ↔ 3,3212). RQ-0010'daki "bugünkü NAV'dan geriye yürü" yaklaşımı
dışarıdan doğrulanmış oldu. Kalan TL farkı yukarıdaki NAV taşımasıyla kapanır.

## Kapsam

- `analytics.fund_latest` NAV'ı getiri serisiyle son veri gününe taşır; hangi
  günden taşındığı görünür kalır.
- `analytics.fund_returns` 3 aylık pencere ekler.
- `analytics.position_return` adet toplamını da verir.
- `/api/portfolio` ucu: fon başına açık pozisyon özeti.
- Portföyüm görünümü fon tablosunu gösterir, salt okunur.
- Mevcut işlem tablosu "Fon Hareketleri" adıyla ayrı görünüme taşınır;
  ekleme/düzenleme/silme orada kalır.
- Sol menü iki girdiye ayrılır.

## Acceptance Criteria

- [ ] Portföyüm fon başına tek satır gösterir; 26 açık pozisyonlu fon, 94 işlem
      değil.
- [ ] Kapanmış pozisyonlar Portföyüm'de görünmez.
- [ ] Portföyüm salt okunur; düzenleme kontrolü içermez.
- [ ] Fon Hareketleri bütün işlemleri (alış ve satış) listeler; ekleme,
      düzenleme ve silme burada çalışır.
- [ ] Sol menüde iki ayrı girdi vardır ve doğru görünümlere gider.
- [ ] NAV'ı bayat olan fon, getiri serisiyle son veri gününe taşınmış fiyattan
      gösterilir; taşımanın hangi günden yapıldığı görünür.
- [ ] Taşıma yalnız NAV eksikken devreye girer; NAV'ı güncel fonun değeri
      değişmez.
- [ ] Toplam satırı maliyet, değer ve K/Z toplamlarını verir.
- [ ] Hesaplar kullanıcıya özeldir; başka kullanıcının pozisyonu görünmez.
- [ ] Yapılandırılmış quality gate'ler (typecheck, test, build) geçer.

## Kapsam Dışı

Kullanıcı sırayla ilerlemek istedi; bunlar sonraki adımlar.

- Benchmark karşılaştırması (TP2 ile fark sütunları).
- Kapanmış pozisyonların gerçekleşmiş K/Z tablosu.
- Banka bazında toplamlar, kategori ve tema dağılımları.
- Portföy değeri zaman serisi grafiği.
- Aylık/haftalık P&L tablosu.
- Fon satırından o fonun alımlarına açılan drill-down.
- "Personal 30D" — alış tarih ve tutarlarına göre 30 güne normalize getiri.
