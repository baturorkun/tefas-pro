---
id: RQ-0016
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-02T09:28:00.910Z"
branch: "factory/RQ-0016"
createdFromCommit: "d20784e8913f2c867628fae75c8137157e263ace"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/32"
githubPullRequestIid: 32
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/31"
githubIssueIid: 31
repositoryProvider: github
---
# RQ-0016 - Remote veritabanini local'e senkronlayan db sync komutu

Uzak sunucudaki veritabani gercek veriyi tutuyor; local kopya ondan geri
kaliyor. 2026-09-02 olcumu:

| Tablo | Remote | Local |
|---|---:|---:|
| `fact_fund_daily` | 30.936 | 30.643 |
| `fact_fund_allocation` | 602 | 343 |
| `dim_fund` | 37 | 36 |
| `portfolio_transaction` | 94 | 94, ama son islem 08-27 |

Local'de collector calistirmak bu farki kapatmaz. Collector fon verisi toplar;
`portfolio_transaction` kullanicinin uygulamada girdigi veridir ve yalnizca
uzak sunucuda olusur. Local'de collector kossaydi fon fiyatlari guncellenir,
portfoy 08-27'de donmus kalirdi. Ayrica ayni veriyi iki yerden cekmek kaynaga
iki kat istek demektir ve iki veritabani zamanla ayrisir.

Is bolumu: **collector yalniz uzak sunucuda kosar, local oradan kopyalanir.**

## Istenen komut

`db/sync.sh`, mevcut `db/install.sh` ve `collector/install.sh` deseniyle
tutarli:

```
db/sync.sh from-remote <user@host> [-p ssh-port] [--yes]
db/sync.sh --help
```

Akis: ssh ile uzak sunucuda `podman exec ... pg_dump`, cikti akis halinde
local `psql`'e verilir. Veritabani 12 MB; ara dosya birakilmaz.

## Kararlar

**Yon tek: remote'tan local'e.** Ters yon hic yazilmaz. Uretim veritabanina
yanlislikla restore etme ihtimali, kodda o yolun bulunmamasiyla kapatilir.

**`app_session` kopyalanmaz.** Uzak sunucudaki acik oturumlarin local'de isi
yok. `app_user` kopyalanir; local'de ayni parolayla giris yapilabilmeli.

**Local'in uzerine yazilir, ama once onay sorulur.** Local'de kaybolacak test
verisi olabilir. `--yes` bu soruyu atlar.

**Sync sonrasi migration calistirilir.** Kritik nokta: uzak sunucunun semasi
local'den geride olabilir. Su an remote `schema_migrations` 22, local 23 —
`023_portfolio_daily` henuz deploy edilmedi. Duz bir restore local'deki view'i
dusurur ve performans grafigi calismaz hale gelir. Script restore sonunda
migration uygular, boylece local sema en az remote kadar guncel kalir.

**Sonuc dogrulanir.** Sync bitince tablo satir sayilari yazdirilir; sessiz
basarisizlik olmaz.

## Kapsam disi

Ters yon senkron, kismi/tablo bazli senkron, zamanlanmis otomatik senkron,
uzak veritabanina yazan her tur islem.

## Acceptance Criteria

- `db/sync.sh from-remote <user@host>` uzak veritabanini local'e kopyalar ve
  bitiminde tablo satir sayilarini yazdirir.
- `app_session` icerigi kopyalanmaz; `app_user` kopyalanir.
- Komut yalnizca remote'tan local'e calisir; ters yonu ifade eden bir kullanim
  yoktur.
- Onay istenir; `--yes` verildiginde istenmez.
- SSH hedefi `user@host` bicimini zorunlu tutar ve gecersiz hedefi reddeder;
  `collector/install.sh` ile ayni dogrulama.
- SSH portu 1-65535 araliginda dogrulanir.
- Sync sonrasi migration calisir ve local sema remote'tan geri kalmaz;
  `analytics.portfolio_daily` sync sonrasi mevcuttur.
- Uzak sunucuda pg_dump veya container yoksa komut anlasilir hata verir.
- Local `DATABASE_URL` tanimli degilse komut anlasilir hata verir.
- Test, kabuk betigini gercek bir veritabani olmadan dogrular:
  `tests/db-install.test.sh` deseninde, hedef ve port dogrulamasi ile
  ters yonun bulunmadigi kontrol edilir.
- Restore hatasi yutulmaz: psql `ON_ERROR_STOP=on` ile calisir ve hata
  durumunda komut sifirdan farkli kodla biter.
- Uzak `pg_dump` ile local `psql` farkli surum ailesinden oldugunda restore
  bozulmaz; dump'a konan meta komutlar filtrelenir.
- Restore sonrasi `ANALYZE` calisir, boylece yazdirilan satir sayilari tahmin
  degil gercek degerdir.
- `pnpm typecheck` ve `pnpm test` gecer.
