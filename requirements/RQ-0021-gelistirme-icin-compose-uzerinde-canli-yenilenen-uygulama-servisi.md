---
id: RQ-0021
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-02T21:26:05.356Z"
branch: "factory/RQ-0021"
createdFromCommit: "f9176db219dfbaf85cea27699981d330ca83f25b"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/42"
githubPullRequestIid: 42
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/41"
githubIssueIid: 41
repositoryProvider: github
---
# RQ-0021 - Gelistirme icin compose uzerinde canli yenilenen uygulama servisi

`pnpm serve` iki tek seferlik adimdan olusuyor: `pnpm build && tsx
src/server/index.ts`. Derleme bir kez kosuyor, sunucu kaynagi baslangicta
okuyup surec boyunca onu calistiriyor. Kod degistiginde ne `dist/main.js`
yenileniyor ne de sunucu yeni kodu goruyor.

2026-09-02'de bu dort kez soruna yol acti: surum rozeti bos kaldi, panelde
`undefined` yazdi, takip listesi durum dagilimi gorunmedi, kapanan pozisyonlar
ekrani bos geldi. Dordunde de kod dogruydu, calisan surec eskiydi. Sonuncusunda
`/api/closed` uca 404 donuyordu cunku o rota surecin okudugu kodda yoktu.

Veritabani ve pgweb zaten `db/compose.yaml` uzerinde container olarak kosuyor;
uygulama tek basina host'ta. Uygulamayi da ayni compose'a almak hem bu sorunu
cozer hem de gelistirme ortamini dagitimdakiyle ayni Node imajina tasir.

## Istenen

`db/compose.yaml` icine, yalnizca gelistirmede calisan bir uygulama servisi
eklenir. Kaynak host'tan baglanir, container icinde izlenir ve degisiklikte
kendini yeniler.

## macOS'a ozgu iki tuzak

Bunlar cozulmezse servis calisiyor gorunur ama yenilenmez:

**`node_modules` baglanmaz.** Host'taki paketler macOS/arm64 icin derlenmis;
Linux container'da calismazlar. Baglama yalnizca kaynak dizinleriyle sinirli
tutulur, bagimliliklar imajin icinden gelir.

**Dosya olaylari poll edilir.** Podman burada `applehv` sanal makinesi icinde
kosuyor ve host'tan VM'e giden bind mount'larda `inotify` olaylari guvenilir
sekilde iletilmiyor; dosya kaydedilir, container fark etmez. Izleyici polling
moduna alinir.

## Kapsam disi

Dagitim akisi, uretim imaji, tarayicinin kendiliginden yenilenmesi (canli
reload ayri bir mekanizma gerektirir; sayfa elle yenilenir). `pnpm serve`
kaldirilmaz, container istemeyen kullanim icin yerinde kalir.

## Acceptance Criteria

- `db/compose.yaml` icinde gelistirme amacli bir uygulama servisi bulunur ve
  uygulama tarayicidan acilir.
- Servis, dagitimda kullanilan `server/Containerfile` ile ayni Node tabanini
  kullanir; ayri bir taban imaj tanimlanmaz.
- `src` altindaki bir sunucu dosyasi degistiginde sunucu kendini yeniden
  baslatir; elle mudahale gerekmez.
- `src/main.ts` degistiginde `dist/main.js` yeniden uretilir; sayfa
  yenilendiginde guncel kod gelir.
- `node_modules` host'tan baglanmaz; bagimliliklar imajdan gelir.
- Dosya izleme polling ile calisir, `inotify`ye guvenmez.
- Servis, veritabanina compose agi uzerinden baglanir ve parola komut satirina
  yazilmaz.
- Gelistirme servisi uretim akisini etkilemez: deploy hala
  `server/Containerfile` ile imaj kurar ve `pnpm serve` calismaya devam eder.
- Nasil baslatildigi `references/` altinda yazili olur.
- `pnpm typecheck` ve `pnpm test` gecer.
