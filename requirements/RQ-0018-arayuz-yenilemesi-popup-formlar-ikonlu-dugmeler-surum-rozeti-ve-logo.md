---
id: RQ-0018
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-02T18:17:21.670Z"
branch: "factory/RQ-0018"
createdFromCommit: "aa4d38d7ad599cbc97f4c3b52e0b16b61e208917"
completedRunId: "20260902181845-RQ-0018"
completedBy: "human"
completedAt: "2026-09-02T20:01:12.367Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/36"
githubPullRequestIid: 36
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/35"
githubIssueIid: 35
repositoryProvider: github
---
# RQ-0018 - Arayuz yenilemesi: popup formlar, ikonlu dugmeler, surum rozeti ve logo

Arayuz su haliyle begenilmiyor. Referans, ayni gelistiricinin `netforgesh`
projesi (`agentic/netforgesh`, canli: `http://38.242.129.1:9000/`). Oradaki
tasarim dili benimsenecek; kodu degil, kararlari aliniyor — netforgesh React
ile yazilmis, tefas-pro satir ici DOM kurar ve kutuphane eklenmez.

## Istenenler

### 1. Formlar popup icinde acilir

Bugun `transactionForm` duzenlenen satirin yerine gomuluyor
(`tr.replaceWith(...)`), ekleme formu ise listenin ustunde duruyor. Form
listenin ustunde, altinda veya yaninda degil, ortada bir pencerede acilmali.
RQ-0017'de eklenen `confirmDelete` penceresi ayni deseni zaten kuruyor; form
penceresi onun yaninda ayni gorunume oturmali.

### 2. Dugmeler ikonlu olur, yazidan dugme olmaz

Satir eylemleri bugun `duzenle` ve `sil` yazili metin dugmeleri. Bunlarin
yerine ikon gelir. Ancak referanstaki ikonlar fazla kucuk ve ne oldugu
anlasilmiyor: burada ikon en az 16px cizim alani ve dokunulabilir bir kutu
icinde durur, yaninda ipucu metni (`title`) bulunur.

Yazinin kendisi tiklanabilir olmaz. Bir eylem varsa dugme gorunumundedir.

### 3. Baslik metinleri buyuk harfle baslar

Her gorunur baslik, etiket ve rozet buyuk harfle baslar:
`acik` → `Acik`, `duzenle` → `Duzenle`, `islem ekle` → `Islem Ekle`,
`acik pozisyondaki farkli fon` → `Acik Pozisyondaki Farkli Fon`.
Coklu kelimede her kelime buyuk harfle baslar.

### 4. Sag ustte tarih degil surum

Bugun sag ustte veri tarihi duruyor. Yerine surum rozeti gelir; referanstaki
bicim birebir alinir:

```
v0.18.1+000fffb+2026-08-31-22-52
```

- `0` — ana surum, sabit
- `18` — requirement numarasi
- `1` — o requirement icin kacinci kosu
- `000fffb` — derlenen commit'in kisa SHA'si
- `2026-08-31-22-52` — derleme zamani

Referans uygulamada bu `src/netforgesh/version.py` icinde: `BASE_VERSION`
sabit, `CURRENT_REQUIREMENT` ve `CURRENT_RUN_ORDINAL` her requirement'ta elle
guncellenir, commit ve zaman derleme sirasinda ortamdan gelir ve yoksa surum
sadece `v0.18.1` olarak gosterilir.

### 5. Sol altta cikis

Kenar cubugunun alti ayrilir ve cikis oraya alinir; bugun kullanici bilgisiyle
birlikte duruyor.

### 6. Kucuk kutularda ikon

Metrik kartlari ve liste satirlari, referanstaki gibi renkli bir ikon kutusuyla
baslar.

### 7. Baslik ve logo

Uygulama adi `TEFAS-Pro` olur. Logo yerine bugun kullanilan gecici isaret
degistirilir; olcegi bozulmayan, kenar cubugunda ve giris ekraninda ayni duran
bir SVG isaret cizilir.

## Kapsam disi

Grafiklerin gorunumu (RQ-0015'te ayarlandi), tablo siralamasi, yeni ekran veya
yeni veri alani. Bu requirement mevcut ekranlarin gorunumunu degistirir,
islevini degil.

## Acceptance Criteria

- Islem ekleme ve duzenleme formlari ortada acilan bir pencerede gorunur;
  liste satiri yerinde kalir ve form listenin disinda bir yere gomulmez.
- Form penceresi Escape ile ve zemine tiklayarak kapanir; kapatmak kaydetmez.
- Satir eylemleri ikon dugmesidir; her birinin `title` ipucu vardir ve ikon
  cizim alani en az 16px'tir.
- Arayuzde metin gorunumlu, dugme gorunumu olmayan tiklanabilir ogeler
  kalmamistir.
- Gorunur basliklar, etiketler ve rozetler buyuk harfle baslar; `Acik`,
  `Kapandi`, `Duzenle`, `Sil`, `Islem Ekle` bicimindedir.
- Sag ust kosede veri tarihi yerine surum rozeti durur ve bicimi
  `v<ana>.<rq>.<kosu>` seklindedir; commit ve derleme zamani ortamdan
  geldiginde `+` ile eklenir.
- Surum bilgisi sunucudan gelir; istemci kendi basina uydurmaz.
- Commit ve derleme zamani ortamda yoksa surum yalnizca `v0.18.1` gorunur ve
  hata olusmaz.
- Kenar cubugunun altinda, ayrilmis bir bolumde cikis dugmesi bulunur.
- Metrik kartlari ikon kutusuyla baslar.
- Uygulama adi arayuzde ve sayfa basliginda `TEFAS-Pro` olarak gecer.
- Logo satir ici SVG'dir; kenar cubugunda ve giris ekraninda bozulmadan
  olceklenir.
- Yeni bir on yuz bagimliligi eklenmemistir; `package.json` bagimliliklari
  degismeden gecer.
- Surum turetme birimi test edilir: requirement numarasi ve kosu sirasindan
  dogru surum uretilir, gecersiz requirement kimligi reddedilir.
- `pnpm typecheck` ve `pnpm test` gecer.
