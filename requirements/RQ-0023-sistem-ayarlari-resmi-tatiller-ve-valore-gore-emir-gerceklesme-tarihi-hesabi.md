---
id: RQ-0023
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-03T11:42:06.299Z"
branch: "factory/RQ-0023"
createdFromCommit: "c677879eb0df05e48a74f2d5c73ba90b9485112e"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/46"
githubPullRequestIid: 46
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/45"
githubIssueIid: 45
repositoryProvider: github
---
# RQ-0023 - Sistem ayarlari, resmi tatiller ve valore gore emir-gerceklesme tarihi hesabi

Bugun islem formunda tek bir tarih var ve bu tarih gerceklesme gunudur.
Kullanici emir tarihinden valoru **elden hesaplayip** giriyor: IJC icin 09-07,
KHA icin 09-04 boyle bulundu. Sistem valoru zaten biliyor ama kullanmiyor.

## Istenen

### 1. Sistem ayarlari

Yoneticinin degistirebilecegi genel bir ayar alani. Ilk ayar Turkiye resmi
tatilleridir; tasarim ileride baska ayarlarin da eklenebilecegi sekilde
kurulur.

Yalnizca yonetici gorur ve degistirir.

### 2. Resmi tatiller

Tatil listesi ayar olarak tutulur ve iki bicim kabul eder:

- `AA-GG` — her yil tekrarlayan sabit tatil. 23 Nisan her yil 23 Nisandir;
  yil yazmak listeyi her sene elden gecirmeyi gerektirirdi.
- `YYYY-AA-GG` — yalniz o yila ait tatil. Dini bayramlar hicri takvimle kaydigi
  icin yil tasimak zorundadir.

Boylece yilda yalnizca iki bayramin tarihi guncellenir; sabitler bir kez
girilir.

Baslangic listesi: sabit olarak 01-01, 04-23, 05-01, 05-19, 07-15, 08-30,
10-29; 2026 bayramlari olarak 2026-03-20 ve 2026-05-27/28/29.

Yila ozel girisler veriden dogrulanabilir: fonlar yalnizca piyasanin acik
oldugu gunlerde fiyatlaniyor, dolayisiyla hafta ici olup fiyat verisi
bulunmayan gun tatildir.

Gecmis icin veri zaten yeterli; liste **gelecek tarihleri hesaplayabilmek**
icin gerekli, cunku emir verildigi anda ileriki gunlerin fiyat verisi
bulunmuyor.

### 3. Islem formunda iki tarih

Alis icin **emir tarihi** ve **alis tarihi** birlikte bulunur. Emir tarihi
zorunlu degildir.

- Emir tarihi girilirse, fonun alis valorune (`buy_valor_days`) gore alis
  tarihi hesaplanip forma yazilir.
- Alis tarihi dogrudan girilirse, ayni valorle geriye gidilerek emir tarihi
  hesaplanir.

Ikisi de veritabanina yazilir. Emir tarihi hesaplarda kullanilmaz; istatistik
olarak durur.

### 4. Satis icin ayni duzen

Formda satis icin ayri bir bolum bulunur: **satis emir tarihi** ve **satis
tarihi**. Hesap fonun satis valoruyle (`sell_valor_days`) ayni sekilde iki
yonlu calisir ve iki deger de veritabanina yazilir.

### 5. Is gunu hesabi

Valor is gunu olarak sayilir: hafta sonlari ve ayardaki tatiller atlanir.
Ornegin 2026-09-02 Carsamba verilen ve valoru 3 gun olan bir emir 09-07
Pazartesi gerceklesir; 09-05 ve 09-06 hafta sonudur.

Valor sifir olan fonlarda emir ve gerceklesme ayni gundur.

## Veri durumu

38 fonun tamaminda valor dolu: alis 0 veya 1 gun, satis 0 ile 3 gun arasi.
Yani hesap her fon icin yapilabilir.

`dim_calendar` tablosu var ama 24 gunluk ve yalnizca gecmisi kapsiyor; bu is
icin yeterli degil.

## Kapsam disi

Tatillerin disaridan otomatik cekilmesi, gecmis kayitlarin emir tarihinin
geriye donuk doldurulmasi, valor degerinin elle degistirilmesi.

## Acceptance Criteria

- Yalnizca yoneticinin erisebildigi bir ayar ekrani bulunur; yonetici olmayan
  kullanici ne ekrani ne de ucu kullanabilir.
- Resmi tatiller bu ekrandan gorulur ve degistirilir; degisiklik kaydedilir ve
  sonraki hesaplarda gecerli olur.
- Tatil listesi hem `AA-GG` hem `YYYY-AA-GG` bicimini kabul eder; gecersiz
  giris anlasilir bir hatayla reddedilir.
- `AA-GG` bicimindeki bir tatil her yil gecerlidir: listede yalnizca `04-23`
  yazsa bile 2027 ve 2030'da da tatil sayilir.
- `YYYY-AA-GG` bicimindeki bir tatil yalnizca kendi yilinda gecerlidir.
- Baslangic listesi yedi sabit tatili yilsiz, dort bayram gununu yilli tutar.
- Islem formunda alis icin emir tarihi ve alis tarihi ayri alanlardir; emir
  tarihi bos birakilabilir.
- Emir tarihi girildiginde alis tarihi fonun alis valorune gore hesaplanip
  forma yazilir.
- Alis tarihi girildiginde emir tarihi ayni valorle geriye hesaplanip forma
  yazilir.
- Satis icin de emir tarihi ve satis tarihi ayri alanlardir ve ayni iki yonlu
  hesap satis valoruyle calisir.
- Dort tarih de veritabaninda saklanir; emir tarihleri hesaplarda kullanilmaz.
- Hesap hafta sonlarini ve tatilleri atlar: 2026-09-02 Carsamba verilen ve
  valoru 3 olan emir 09-07 Pazartesi gerceklesir.
- Valoru sifir olan fonda emir ve gerceklesme tarihi aynidir.
- Bilinmeyen fon kodunda hesap yapilmaz ve form kullaniciyi engellemez; tarih
  elle girilebilir.
- Is gunu hesabi birim testlerle dogrulanir: hafta sonu atlama, tatil atlama,
  sifir valor, ileri ve geri yon.
- Mevcut kayitlar bozulmaz: emir tarihi olmayan kayitlar calismaya devam eder.
- `pnpm typecheck` ve `pnpm test` gecer.
