---
id: RQ-0015
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-01T21:11:11.045Z"
branch: "factory/RQ-0015"
createdFromCommit: "624f706e61b6c2d51633d6209c9ca7170781a2f0"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/30"
githubPullRequestIid: 30
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/29"
githubIssueIid: 29
repositoryProvider: github
---
# RQ-0015 - Portfoy performans grafigi: deger cizgisi ve gunluk getiri barlari

Dashboard bugun yalnizca yatay bar grafikler gosteriyor: her satir bir fon,
kategorik, zaman ekseni yok. Portfoyun zaman icinde nasil hareket ettigi
gorunmuyor. Bu gereksinim, referans olarak alinan onceki projedeki
`Portfolio Performance` grafiginin tefas-pro'ya tasinmasini kapsar.

Referans gorsel ve uretimi: `references/charts/portfolio-performance.png` ve
`references/charts/README.md`.

## Istenen grafik

Ortak tarih eksenini paylasan iki panel, tek bir SVG icinde:

- **Ust panel — portfoy degeri cizgisi.** Cizgi altinda hafif alan dolgusu.
  Panel yuksekligi alt panelin iki kati.
- **Alt panel — gunluk getiri barlari.** Dikey bar; pozitif ve negatif farkli
  renkte, sifir cizgisi belirgin.

Iki panel ayni x eksenini paylasir ve ayni gun sutunlari hizali durur.
Varsayilan pencere son 30 is gunu.

## Cash-flow adjustment

Grafigin tek kritik noktasi budur ve referans uygulamada da boyle cozulmustur.

Cizgi **ham portfoy degeri degildir**. Para yatirma ve cekme, portfoy degerinde
piyasa hareketiyle ilgisi olmayan sicramalar yaratir; ham deger cizildiginde
100.000 TL yatirilan gun grafik dikey firlar ve o gunun gercek performansi
gorunmez hale gelir.

Bunun yerine seri su sekilde kurulur: ilk gunun portfoy degerinden baslanir,
sonraki her gun icin yalnizca **organik gunluk kazanc** eklenir; yeni sermaye
girisi ve cikisi seriye dahil edilmez.

Ayni duzeltme gunluk getiri yuzdesi icin de gecerlidir: yuzde, sermaye
hareketinden arindirilmis kazanc uzerinden hesaplanir.

## Veri mevcudiyeti ve on kosul

Eski projedeki gibi bir portfoy snapshot dosyasina (`history.tsv`) gerek yok:
portfoy degeri, o gun acik olan pozisyonlarin o gunku birim fiyatla carpimindan
her zaman yeniden hesaplanabilir. Ancak bunun icin **fon birim fiyat gecmisi**
gerekiyor ve bugun o gecmis yok.

Uretim veritabaninda 2026-09-01 itibariyla olculen durum:

| Alan | Dolu satir | Kapsam |
|---|---:|---|
| `daily_return_pct` | 30.415 | 2021-08-31 → 2026-09-01 |
| `net_flow` | 9.067 | kismi |
| `aum`, `investor_count`, `shares_active` | 4.948 | kismi |
| `nav_per_share` | **75** | yalnizca 2026-08-28 → 2026-09-01 |

Sebep `src/collector.ts` icindeki `mergeDailySources`: kaynak fon basina tek bir
guncel fiyat donuyor (`nav: {date, price}`), fiyat serisi donmuyor. `--backfill`
yalnizca getiri ve akis icin geriye gidiyor. Dolayisiyla birim fiyat ancak
collector her gun kostukca birikiyor ve 28 Agustos'ta baslamis.

**Bu haliyle 30 gunluk grafik cizilemez.** Iki gunluk fiyat gecmisi vardir.

### Cozum: fiyati gunluk getiriden zincirleyerek turetmek

Gunluk getiri yuzdesi bes yillik mevcut oldugundan, olculen fiyattan geriye
dogru zincirleme yapilabilir:

```
nav(t) = nav_olculen x exp( toplam ln(1 + getiri/100) )   olcum gununden t'ye
```

Yontem TLY fonunda dogrulandi: 2026-08-31 icin kayitli fiyat 9145.580810,
zincirle turetilen 9145.580850 — sekiz hane tutuyor.

Turetilen fiyat **tabloya yazilmaz**, view'da hesaplanir. Bu, projenin zaten
kurdugu desendir: `022_nav_carry_forward` ayni zinciri ileri yonde
`analytics.fund_latest` icinde kuruyor ve gerekcesini soyle yaziyor —
"nav_date korunuyor: tasinmis bir fiyat, olculmus fiyat gibi gorunmemeli."
Ayni kural burada da gecerlidir. Boylece olculen bir deger geldiginde zincir
kendini ona gore yeniden kurar ve tabloda turetilmis veri birikmez.

## Kapsam

- Gunluk portfoy degeri serisini ureten sorgu veya view. Bugun boyle bir sey
  yok: `portfolio_transaction` pozisyonlari, `analytics.position_return`
  pozisyon bazli getiriyi tutuyor, ancak gun bazinda portfoy degeri serisi
  bulunmuyor.
- Seriyi donen server endpoint'i.
- Grafigi cizen istemci kodu.

Kapsam disi: grafigin PDF veya PNG olarak disari aktarilmasi, 30 gun disinda
pencere secimi, fon bazinda kirilim.

## Teknik sinirlar

- Grafik kutuphanesi eklenmez. Mevcut `barChart` gibi satir ici SVG uretilir;
  `src/main.ts` icindeki `svg()` yardimcisi ve `SVG_NS` kullanilir.
- Renkler ve stiller `src/styles.css` icinde sinif olarak tanimlanir, SVG
  ozniteligine gomulmez; mevcut `bar-pos` / `bar-neg` adlandirma duzenine uyulur.
- Gun sayisi az oldugunda (2 gunden kisa seri) grafik cizilmez, panel bos
  durum mesaji gosterir.

## Acceptance Criteria

- Dashboard'da ortak tarih eksenli iki panelli bir grafik gorunur: ustte
  portfoy degeri cizgisi ve alan dolgusu, altta gunluk getiri barlari.
- Ust panel alt panelin iki kati yuksekliktedir ve iki panelin gun sutunlari
  hizalidir.
- Pozitif ve negatif gunler farkli renktedir; sifir cizgisi barlarin arasindan
  gecer.
- Portfoy degeri serisi cash-flow-adjusted'dir: test, seri ortasinda sermaye
  girisi olan bir portfoyde cizginin sicramadigini ve yalnizca organik kazanci
  yansittigini dogrular.
- Gunluk getiri yuzdesi de sermaye hareketinden arindirilmistir; ayni test
  girisi olan gunde yuzdenin sermaye girisiyle sismedigini dogrular.
- Tarih etiketleri kalabalik degildir: 30 gunluk pencerede en fazla sekiz
  etiket gosterilir.
- Iki gunden kisa seride grafik yerine bos durum mesaji cikar, hata olusmaz.
- Yeni bir grafik kutuphanesi bagimliligi eklenmemistir; `package.json`
  degismeden gecer.
- Gunluk kazanc icin snapshot tablosu eklenmemistir; seri mevcut
  `fact_fund_daily` ve `portfolio_transaction` verisinden turetilir.
- Gunluk fiyat, olculen fiyattan zincirlenerek view icinde turetilir; tabloya
  turetilmis fiyat yazilmaz ve `022_nav_carry_forward`'in koydugu kural korunur.
- Zincirleme dogrulugu olculen veri uzerinde dogrulanir ve sonuc migration
  yorumuna kaydedilir; `022_nav_carry_forward` ayni seyi yapiyor.
- `pnpm typecheck` ve `pnpm test` gecer.
