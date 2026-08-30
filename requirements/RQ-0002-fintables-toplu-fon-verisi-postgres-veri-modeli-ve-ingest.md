---
id: RQ-0002
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-08-30T08:52:45.107Z"
branch: "factory/RQ-0002"
createdFromCommit: "ca6fc58637a7f5bd7724dab1925ede272b18908f"
completedRunId: "20260830100844-RQ-0002"
completedBy: "batur"
completedAt: "2026-08-30T10:32:43.491Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/4"
githubPullRequestIid: 4
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/3"
githubIssueIid: 3
repositoryProvider: github
---
# RQ-0002 - Fon takip listesi ve günlük veri toplama

İzlenen fonları bir takip listesinde tutmak ve yalnız o fonlar için günlük
veriyi toplamak. Portföy kayıtları (alım tarihi, adet, platform) bu
requirement'ta yer almaz; kullanıcı onları arayüz hazır olduğunda girecektir.

Tüm fon evreni (2823 fon) toplanmaz. Evren yalnızca iki yerde kullanılır: takip
listesine fon eklerken arama yapmak ve yeni fon taraması. İkisi de günde iki
istekle, geçmiş biriktirmeden karşılanır.

RQ-0001 şema migration'larını ve uygulama tablolarını kapsam dışı bırakmıştı;
bu requirement onu devralır ve projenin ilk veri katmanını kurar. Şu an projede
runtime dependency, migration runner, şema ve kaynak istemcisi yok.

## Neden takip listesi

fintables'ın **fon başına** endpoint'leri tek istekte tüm günlük geçmişi
döndürüyor — ölçüldü:

| Endpoint | Dönen | Süre |
|---|---|---|
| `/funds/{KOD}/volatility/` | 339 günlük getiri noktası (16 ay) | 142 ms |
| `/funds/{KOD}/cashflow/?start_date=&end_date=` | 122 günlük net akış noktası (6 ay) | 335 ms |

Yani bir fonun tüm geçmişi 2 istekte geliyor. 26 fonluk liste için günlük run
~106 istek / ~1,5 dakika. Aynı derinliği tüm evren için almak 5600 istek eder.

## Veri kaynağı

`api.fintables.com`, auth yok, Cloudflare koruması TLS parmak izi tabanlı:
düz `curl` 403 alır, Chrome TLS parmak izini taklit eden bir client (`impit`)
200 çeker. **Headless browser gerekmez.**

### Takip listesindeki her fon için (fon başına 4 istek)

| Endpoint | Alınan |
|---|---|
| `/funds/{KOD}/price/` | `price` (gerçek NAV), `prev_price`, `day`, `market_cap` |
| `/funds/{KOD}/volatility/` | `[{x: tarih, daily_return}]` — günlük getiri serisi |
| `/funds/{KOD}/cashflow/?start_date=&end_date=` | `[{time, value}]` — günlük net akış serisi |
| `/funds/{KOD}/info/` | `tax` (stopaj), `buy_valor`, `sell_valor`, `management_fee`, `risk`, `shares_active`, `investor_count`, `last_asset` (varlık dağılımı) |

### Evren ve tarama (günde 2 istek)

| Endpoint | Alınan |
|---|---|
| `/funds/` | 2823 fonun kodu, unvanı, tipi, yönetim şirketi — listeye fon eklerken |
| `/funds/yield/` | 2396 fonun `yield_1m…5y` değerleri — yeni fon taraması |

### Doğrulanan davranışlar

- **NAV türetilemez, kaynaktan alınmalıdır.** `end_aum / shares_active` para
  piyasası fonunda tutuyor ama hisse fonunda tutmuyor: AAL %0 sapma, GAL %0,3,
  THF %1,8. Kâr/zarar için `/funds/{KOD}/price/` kullanılır.
- **Stopaj fona göre değişir.** Ölçülen: AAL %17,5, GAL %17,5, THF %0. Net kâr
  fon bazında hesaplanmalıdır.
- **Yönetim ücreti fona göre değişir**: %1 ile %2,25 arası ölçüldü.
- **Valör fona göre değişir.** AAL 0/0, THF alış 1 / satış 2 gün. Satış valörü,
  bir çıkış kararının kaç gün sonra fiyatlandığını belirler.
- **Toplu `/funds/cashflow/` günlük pencerede güvenilmezdir**, fon başına olan
  doğrudur. Toplu olan AAL için -154.080.386 TL verirken fon başına endpoint
  -13.968.520 / -40.503.210 gibi günlük değerler veriyor ve bunlar AUM
  aritmetiğiyle %0,001 içinde uyuşuyor. Bu requirement fon başına olanı kullanır.
- `/funds/volatility/` kayan bir pencere döndürür (2025-04-22'den beri). Pencereden
  düşen geçmiş kaynakta kalmaz; saklanmazsa kalıcı olarak kaybedilir.

## Takip listesi başlangıç verisi

Başlangıçta, hâlâ pozisyon tutulan **26 fon** listeye alınır. Kodlar fintables
evreninde doğrulandı.

```text
AFS AFT CPT DFI DOH FJB GBZ GPG GUH ICH IJC IKP IVY KHA PIL PNU
PTO RBR TAU THF TLY TMG TP2 YAY YIT YZC
```

Tamamen kapanmış 10 fon (AOY, GNS, GZH, HRZ, IAE, PBR, PHE, PRY, VPS, YJH)
başlangıç listesine alınmaz.

Liste sabit değildir: fon eklenip çıkarılabilmeli, `status` alanı sahip olunan
ile yalnız izlenen fonu ayırt etmelidir.

## Veri modeli

```text
dim_fund(fund_code PK, title, fund_type, type, management_company_id, is_byf,
         first_seen_at, last_seen_at)          -- tüm evren, arama ve tarama için

dim_fund_terms(fund_code PK, tax_pct, management_fee_pct,
               buy_valor_days, sell_valor_days, risk, updated_at)

watchlist(fund_code PK, status, added_at, note)  -- status: owned | watching

fact_fund_daily(fund_code, trade_date,
                nav_per_share, daily_return_pct, net_flow,
                shares_active, investor_count, aum,
                source, ingest_run_id, updated_at,
                PRIMARY KEY (fund_code, trade_date))

fact_fund_allocation(fund_code, as_of_date, asset_class, weight_pct,
                     PRIMARY KEY (fund_code, as_of_date, asset_class))

fact_fund_yield_snapshot(fund_code, as_of_date,
                         yield_1m, yield_3m, yield_6m, yield_ytd,
                         yield_1y, yield_3y, yield_5y,
                         PRIMARY KEY (fund_code, as_of_date))

ingest_run(id, source, started_at, finished_at, status, rows_upserted, last_error)
```

- `fact_fund_daily` **yalnızca takip listesindeki** fonlar için doldurulur.
- `fact_fund_yield_snapshot` tüm evren için doldurulur; bir seri değil, gün gün
  biriken snapshot'tır ve `/funds/yield/` geçmiş vermediği için tarih ancak
  böyle birikir.
- Getiri ve kâr/zarar tabloya yazılmaz, `analytics` view'larında hesaplanır.

## Kapsam

- `package.json`: `pg` ve `impit` runtime dependency, test runner, `db:migrate`
  ve collector script'leri. Lockfile commit edilir.
- ORM yok. `db/migrations/NNN_*.sql` dosyalarını isim sırasıyla, her birini tek
  transaction içinde uygulayan, uygulananı atlayan minimal runner.
- fintables istemcisi: parse fonksiyonları network'ten bağımsız ve fixture ile
  test edilebilir; ağ katmanı tek sınıfta.
- Collector oneshot çalışır, her run bir `ingest_run` satırı bırakır, fon başına
  hata izole edilir, istekler sıralı ve throttle'lı atılır.
- Yazma idempotent olmalı: aynı run iki kez çalıştığında satır sayısı değişmez.
- Takip listesini besleyecek bir seed yolu bulunmalı; başlangıçtaki 36 fon
  bununla yüklenir.
- `factory.config.json` `allowedPaths` listesine `package.json` eklenir.
- `.env` içindeki `DATABASE_URL` RQ-0001'in kurduğu instance'ı göstermelidir.

## Acceptance Criteria

- [ ] Migration'lar `pnpm db:migrate` ile uygulanır; ikinci çalıştırma hiçbir
      migration uygulamaz ve hata vermez.
- [ ] Şema yukarıdaki tabloları içerir; `fact_fund_daily` primary key'i
      `(fund_code, trade_date)`'dir.
- [ ] fintables istemcisi `impit` ile 200 alır; headless browser bağımlılığı yoktur.
- [ ] Parse fonksiyonları kaydedilmiş fixture'larla test edilir; `null` değeri
      kabul eder, alan eksikliğinde hata verir.
- [ ] 26 fon takip listesine yüklenir; listeye fon eklenip çıkarılabilir ve
      collector listeyi kaynak alır.
- [ ] Collector yalnız takip listesindeki fonlara istek atar; evren dışındaki
      fonlar için `fact_fund_daily` satırı üretilmez.
- [ ] Takip listesindeki her fon için NAV, günlük getiri serisi, günlük net akış
      serisi, varlık dağılımı ve fon şartları (stopaj, valör, yönetim ücreti)
      yazılır.
- [ ] `/funds/yield/` snapshot'ı tüm evren için günde bir kez yazılır.
- [ ] Collector iki kez çalıştırıldığında `fact_fund_daily` satır sayısı değişmez.
- [ ] Her run `ingest_run`'a satır yazar; bir fonun hatası run'ı durdurmaz,
      `status` `partial` olur.
- [ ] Bir `analytics` view'ı takip listesindeki fonların son NAV'ını, son günlük
      getirisini ve son net akışını tek sorguda verir.
- [ ] Kaynak keşfi ve doğrulanan davranışlar örnek payload'larla `references/`
      altına kaydedilir.
- [ ] Yapılandırılmış quality gate'ler (typecheck, test, build) geçer.

## Kapsam Dışı

- Portföy kayıtları: alım/satım işlemleri, adet, platform, maliyet. Kullanıcı
  bunları arayüz hazır olduğunda girecek; tablo ve içe aktarma o requirement'ta.
- Kâr/zarar hesabı (stopaj ve ücret düşülmüş net getiri).
- Web arayüzü, portföy ekranı ve raporlama.
- Sinyal üretimi, eşik hesabı, uyarı ve öneri.
- Tüm fon evreni için günlük seri toplamak.
- TEFAS ve fvt kaynakları, kaynaklar arası çelişki çözümü.
- Collector'ın sunucuya deployment'ı ve zamanlanmış çalıştırılması.
