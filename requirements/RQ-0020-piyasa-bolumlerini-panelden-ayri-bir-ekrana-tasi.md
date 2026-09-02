---
id: RQ-0020
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-02T20:48:26.021Z"
branch: "factory/RQ-0020"
createdFromCommit: "64e6f1fbd7997c003d7aa4bbdea02f70d692cb70"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/40"
githubPullRequestIid: 40
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/39"
githubIssueIid: 39
repositoryProvider: github
---
# RQ-0020 - Piyasa bolumlerini panelden ayri bir ekrana tasi

Panel bugun iki farkli soruyu birden cevapliyor: "portfoyum ne durumda" ve
"piyasada ne oluyor". Ikincisi ekranin alt ucta kaliyor ve panel gereksiz
uzuyor.

Tasinacak uc bolum `dashboardView` icinde ard arda duruyor:

- **Piyasa** — takip edilen fonlarin 1 hafta ve 1 ay getiri siralamalari
- **Para akisi** — fonlara giren ve cikan tutar siralamalari
- **Yatirimci sayisi** — yatirimci sayisi artan ve azalan fonlar

Ucu de ayni veriden besleniyor: `/api/dashboard` yanitindaki `watchlistRanks`,
`flowRanks` ve `investorRanks`. Sunucu tarafinda degisiklik gerekmez.

Panelde kalacaklar: ozet kutulari, portfoy performans grafigi ve pozisyon
bolumu. Yani panel yalnizca kullanicinin kendi durumunu anlatir.

## Kapsam

Yalnizca yerlesim. Siralamalarin hesabi, gorunumu ve icerigi degismez;
bulunduklari ekran degisir.

`watchlistToggle` her iki ekranda da bulunur: panelde pozisyon bolumunu,
piyasa ekraninda siralamalari daraltir. Secim `localStorage` uzerinden
paylasildigi icin iki ekran ayni degeri okur ve birinde yapilan secim
digerinde de gecerlidir.

## Kapsam disi

Yeni siralama turu, yeni pencere veya sutun, siralama hesabinin degismesi.

## Acceptance Criteria

- Kenar cubugunda piyasa bilgilerini acan bir gorunum bulunur; RQ-0018'de
  kurulan duzene uyar (ikonlu gezinme ogesi, buyuk harfle baslayan baslik).
- Piyasa, para akisi ve yatirimci sayisi bolumleri bu ekranda gorunur.
- Panelde bu uc bolum artik gorunmez; ozet kutulari, performans grafigi ve
  pozisyon bolumu yerinde kalir.
- Siralamalarin icerigi ve sirasi tasinmadan onceki ile aynidir.
- Takip listesi anahtari her iki ekranda da calisir ve secim iki ekran
  arasinda paylasilir.
- Gezinme etiketi daraltilmis kenar cubugunda tek satira sigar.
- Veri alinamadiginda ekran hata kutusu gosterir, bos sayfa birakmaz.
- Sunucuda yeni uc eklenmemistir; mevcut `/api/dashboard` kullanilir.
- `pnpm typecheck` ve `pnpm test` gecer.
