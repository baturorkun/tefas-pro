---
id: RQ-0017
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-02T12:52:23.680Z"
branch: "factory/RQ-0017"
createdFromCommit: "70c07c4e93f5aeba5b26cb28c68c5e8e128c08d6"
completedRunId: "20260902175603-RQ-0017"
completedBy: "human"
completedAt: "2026-09-02T18:08:41.716Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/34"
githubPullRequestIid: 34
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/33"
githubIssueIid: 33
repositoryProvider: github
---
# RQ-0017 - Silme islemlerinde ne kaybedilecegini soyleyen onay

Iki ayri sorun ayni koke bagli: kullanicinin verisi ya sessizce kayboluyor ya
da yanlis gorunuyor.

## 1. Silme onay sormadan calisiyor

`src/main.ts` icinde iki silme dugmesi var ve ikisi de tiklanir tiklanmaz
istegi gonderiyor:

- fon hareketi silme (`DELETE /api/transactions/:id`)
- takip listesinden cikarma (`DELETE /api/watchlist/:code`)

2026-09-02'de ikisi de gerceklesti: HBU'nun 34.200 lotluk alim kaydi ve BON'un
takip kaydi tek tikla silindi. Veri yalnizca uzak kopyada durdugu icin
`db/sync.sh` ile geri alinabildi; local tek kopya olsaydi kalici kayipti.

Fon hareketi silmek ozellikle agir: bir alim kaydi gidince o pozisyonun
gecmisi, portfoy degeri ve performans grafigi topluca degisir.

## 2. Ileri tarihli satis bugunden kapali sayiliyor

`analytics.position_leg` acikligi soyle belirliyor:

```sql
p.sell_date IS NULL AS is_open
```

`sell_date` gerceklesme tarihidir; TEFAS'ta satis emri valor gunu sonra
fiyatlanir ve kullanici gerceklesme gununu giriyor. Dolayisiyla tarih ileride
olabilir. Bugun 2026-09-02 iken IJC (09-07), PIL (09-07) ve KHA'nin 08-14
alimi (09-04) portfoyden dustu; oysa pozisyonlar hala duruyor ve fiyat riski
devam ediyor.

Dogrusu: satis tarihi bugunden ileride olan pozisyon acik sayilir.

## Kapsam disi

**Valorun otomatik hesaplanmasi.** `dim_fund_terms.sell_valor_days` dolu (IJC 3,
PIL 3, KHA 2, DFI 2, TLY 2) ve kullanicinin elle hesapladigi tarihlerle birebir
ortusuyor, ama kod bu alani yalnizca takip listesinde "T+2" diye gosteriyor.
Emir tarihinden gerceklesme tarihini uretmek `sell_date`'in anlamini degistirir
ve mevcut 100 kaydin yeniden yorumlanmasini gerektirir; ayri bir requirement.

**Kullanici silme.** Zaten yok: yonetim ekraninda yalnizca `isActive` anahtari
var ve `updateUser` son admini pasife almayi engelliyor.

## Acceptance Criteria

- Fon hareketi silmeden once onay istenir; onay metni hangi kaydin silinecegini
  (fon, tarih, adet, banka) ve islemin geri alinamayacagini soyler.
- Takip listesinden cikarmadan once onay istenir.
- Onay reddedildiginde hicbir istek gonderilmez ve satir yerinde kalir.
- Acik pozisyonu olan bir kaydin onayi, silmenin portfoy degerini ve performans
  gecmisini degistirecegini ayrica belirtir ve silmek yerine satis tarihi
  girilebilecegini hatirlatir.
- Satis tarihi bugunden ileride olan pozisyon acik sayilir; IJC, PIL ve KHA'nin
  ilgili kaydi portfoyde gorunur.
- Satis tarihi bugun veya gecmis olan pozisyon kapali sayilmaya devam eder.
- Test, ileri tarihli satisi olan pozisyonun acik, gecmis tarihli satisi olanin
  kapali sayildigini dogrular.
- `pnpm typecheck` ve `pnpm test` gecer.
