# fintables API — keşif ve doğrulanan davranışlar

Durum: doğrulandı 2026-08-30. Örnek payload'lar `samples/` altında.
Kullanan kod: `src/sources/fintables.ts`, `src/collector.ts`.

## Erişim

`api.fintables.com`, auth yok. Cloudflare koruması **TLS parmak izi (JA3/JA4)**
tabanlı, cookie veya header tabanlı değil: tam Chrome header seti taşıyan `curl`
bile `cf-mitigated: challenge` ile 403 alır. Chrome'un TLS parmak izini taklit
eden bir client (`impit`) 200 çeker. **Headless browser gerekmez.**

`GET /` DRF route index'i döndürür (41 route: companies, sectors, dividends,
ipos, capital-increases, buybacks, warrants, viop-contracts…). `funds` bu
index'te listelenmez ama çalışır. Kayıt: `samples/api-root.json`.

## Kullanılan endpoint'ler

| Endpoint | Döndürdüğü | Ölçülen |
|---|---|---|
| `GET /funds/` | 2822 fonun kodu, unvanı, tipi, yönetim şirketi | tek istek |
| `GET /funds/{KOD}/price/` | `price`, `prev_price`, `day`, `market_cap` | tek istek |
| `GET /funds/{KOD}/volatility/` | Günlük getiri serisi | 339 nokta / 142 ms |
| `GET /funds/{KOD}/cashflow/?start_date=&end_date=` | Günlük net akış serisi | 122 nokta / 335 ms |
| `GET /funds/{KOD}/info/` | Stopaj, valör, ücret, pay adedi, yatırımcı, dağılım | tek istek |
| `GET /funds/yield/` | 2395 fonun `yield_1m…5y` değerleri | tek istek |
| `GET /funds/growth/?start=&end=` | Pencere sonu AUM + pay adedi, **tüm evren** | tek istek |
| `GET /funds/cashflow/?start=&end=` | Pencere sonu yatırımcı sayısı, tüm evren | tek istek |

## Neden fon başına, neden toplu değil

Toplu endpoint'ler (`/funds/growth/`, `/funds/cashflow/`) `start`/`end`
penceresi alır ve **bir satır bir güne değil bir aralığa aittir** — günlük seri
için gün başına bir istek gerekir. Fon başına endpoint'ler ise tek istekte tüm
seriyi döndürür. 26 fonluk takip listesi için fon başına yol 104 istek eder;
aynı derinliği toplu pencerelerle almak 130+ istek ve daha az veri demektir.

**Toplu `/funds/cashflow/` 1 günlük pencerede güvenilmez.** 2026-08-26→27
penceresinde AAL için -154.080.386 TL veriyor; aynı gün için AUM aritmetiği
(`end_aum - start_aum×(1+yield)`) -30.572.897, pay adedi aritmetiği
(`Δpay × birim fiyat`) -30.572.455 veriyor. İki bağımsız türetim %0,001 içinde
uyuşuyor, toplu endpoint ikisinden de 5 kat uzak. Günlük değerler pencere
değerine de toplanmıyor (AAL 1,97x, YLB 1,85x, GAL 1,10x — oran sabit değil).
**Fon başına `/funds/{KOD}/cashflow/` doğrudur:** AAL için 08-20 -13.968.520,90
/ 08-21 -40.503.210,68 / 08-24 +14.274.840,91 veriyor ve bunlar AUM
aritmetiğiyle birebir uyuşuyor.

## Doğrulanan davranışlar

- **NAV türetilemez.** `end_aum / shares_active` para piyasası fonunda tutuyor
  ama hisse fonunda tutmuyor: AAL %0 sapma, GAL %0,3, THF %1,8. Gerçek fiyat
  `/price/` endpoint'inden alınmalıdır.
- **Stopaj fona göre değişir.** Ölçülen: AAL %17,5, GAL %17,5, THF %0.
  `info.tax` **oran** döndürür (0.175), yüzdeye çevrilmelidir.
- **Yönetim ücreti fona göre değişir**: %1 ile %2,25 arası ölçüldü. Yüzde olarak
  gelir, orana çevrilmemelidir.
- **Valör fona göre değişir.** AAL 0/0, THF alış 1 / satış 2 gün, bazı fonlarda
  null. Satış valörü, bir çıkış kararının kaç gün sonra fiyatlandığını belirler.
- **`volatility.daily_return` orandır** (0.0181), yüzde değil.
- **Kaynağın gün etiketi yerel takvimin ilerisinde olabilir.** 2026-08-30'da
  `/price/` `day: 2026-08-31` döndürdü ve volatility serisi de 08-31'de bitti.
  Bu yüzden tarihler yerel saate göre KIRPILMAZ; kırpmak en yeni satırı düşürür.
- **`/funds/yield/` geçmiş vermez.** `start`/`end` verilse de `yield_1m…5y`
  değişmez, hep çağrı anı itibarıyladır; yalnız ek olarak dönen `yield_custom`
  pencereye göre hesaplanır. Tarih ancak her run'da snapshot alınarak birikir.
- **`volatility` kayan bir pencere döndürür.** Fona göre 1–5 yıl arası geçmiş
  geliyor; pencereden düşen veri kaynakta kalmaz, saklanmazsa kaybedilir.
- **`null` meşru bir değerdir**, alanın hiç gelmemesi şema kaymasıdır. Parser
  ikisini ayırt eder: null veriyi, eksik alan sözleşmeyi ilgilendirir.
- **`/fund-screener/` üyelik ister** (`403 {"non_field_errors":["Fintables'e üye
  değilsiniz."]}`). Kullanılan altı endpoint public'tir.

## Aralık daraltma: hangisi kabul ediyor

| Endpoint | Tarih parametresi | Ölçüm |
|---|---|---|
| `/funds/{KOD}/volatility/` | **Yok sayılıyor** | `start_date`/`end_date` de `start`/`end` de verilse TLY için hep 1258 nokta / 97 KB |
| `/funds/{KOD}/cashflow/` | **Çalışıyor** | 6 ay 122 nokta / 6 KB, **12 ay 250 nokta / 11 KB**, hepsi tek istek |

Getiri geçmişi daraltılamaz; her run'da tam gelir. İstek sayısı zaten fon başına
sabit olduğu için bu ek maliyet üretmez ve kaynak bir değeri revize ederse tam
çekim onu kendiliğinden düzeltir. Nakit akışı daraltılabildiği için artımlı
çekilir, ama saklanan aralık 12 aydır: 6 aya göre farkı 5 KB ve karşılığında
aylık akış günlükten türetilebilir hale gelir.

## Fon büyüklüğünün tek kaynağı toplu pencere

Fon başına büyüklük endpoint'i **yok**: `/funds/{KOD}/aum|size|growth|market-cap|
investors|shares|history|statistics/` hepsi 404. AUM, pay adedi ve yatırımcı
sayısının geçmişi yalnız toplu pencere endpoint'lerinden gelir. Bir istek tüm
evreni verdiği için gecelik maliyet +2 istektir.

Bu endpoint'lerin `cumulative_cashflow` alanı **kullanılmaz** (yukarıdaki
ölçüme bakınız); yalnız `end_aum`, `end_shares_active` ve `end_investor_count`
alınır.

## Aylık değerler türetilir, çekilmez

2026 Temmuz ölçümü, günlük seriden türetilen ile API'nin aylık penceresi:

| Fon | Getiri türetilen | Getiri API | Akış türetilen | Akış API |
|---|---|---|---|---|
| DFI | %14,0042 | %14,0042 | 10.835.398.590 | 10.981.794.194 |
| IVY | %-4,3217 | %-4,3217 | -43.504.155 | -48.465.329 |
| THF | %-3,1153 | %-3,1153 | 134.014.631 | 131.118.476 |

Aylık getiri dört ondalıkta birebir tutuyor. Aylık akışta iki kaynak %1-10
ayrışıyor ve güvenilir olan türetilendir — fon başına günlük seri AUM
aritmetiğiyle uyuşuyor, toplu endpoint'in akış alanı uyuşmuyor.

## Ban riski

26 fonluk takip listesi için tam run **~106 istek, ölçülen süre 1 dk 54 sn**
(sıralı, fon başına throttle + jitter). Rate-limit header'ı yok,
`cf-cache-status: DYNAMIC`. Paralel tarama yapılmamalıdır.
