---
id: RQ-0022
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-02T22:19:22.375Z"
branch: "factory/RQ-0022"
createdFromCommit: "ed9d318dd6044eefb0a42987834c960d8eb26cc6"
completedRunId: "20260902222039-RQ-0022"
completedBy: "human"
completedAt: "2026-09-03T08:30:10.373Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/44"
githubPullRequestIid: 44
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/43"
githubIssueIid: 43
repositoryProvider: github
---
# RQ-0022 - Form alanlarinin gorunumunu referans arayuze yaklastir

RQ-0018 formlari pencereye tasidi ama alanlarin kendi gorunumune dokunmadi.
Referans arayuzle (`agentic/netforgesh`) yan yana konuldugunda fark belirgin:
bizim formlar sisman duruyor, ayni bilgi icin cok daha fazla yer kapliyor.

Uygulamadaki bes form da ayni `field()` yardimcisini ve ayni girdi stillerini
kullaniyor, dolayisiyla duzeltme hepsini birden etkiler: giris ekrani, parola
degistirme, islem ekleme/duzenleme, takip listesine ekleme, kullanici
ekleme/duzenleme.

## Tespit edilen sorunlar

**Bosluk iki kez sayiliyor.** `.field` uzerinde `margin-bottom: 1rem` var,
ustune izgaranin `gap` degeri biniyor. Referansta tek bir `gap` var.

**Etiketler fazla baskin.** Bizde `.76rem` ve normal agirlikta; referansta
kucuk ve soluk, one cikan alanin kendisi.

**Girdilerde sabit yukseklik yok.** Referans her girdiye sabit yukseklik
veriyor ve izgara hizali duruyor. Bizde `date` ve `number` girdileri tarayicinin
kendi suslerini (takvim ikonu, sayi oklari) tasidigi icin komsu alanlardan
farkli yukseklikte cikiyor.

**Yardimci metin yok.** Referansta alanin altinda ne beklendigini soyleyen bir
satir var. Bizim formda hic yok; ozellikle satis tarihinin bos birakilabilecegi
hicbir yerde yazmiyor.

**Vazgec dugmesi duz metin gibi duruyor.** Referansta iptal de cerceveli bir
dugme. RQ-0018'de "yazidan dugme olmaz" kurali konmustu; bu onun gozden kacan
ornegi.

## Kapsam

Yalnizca gorunum ve `field()` yardimcisi. Formlarin alanlari, dogrulamasi ve
kaydetme davranisi degismez.

## Kapsam disi

Yeni alan, yeni form, dogrulama kurallari, tarih secicinin kendi gorunumunun
degistirilmesi.

## Acceptance Criteria

- Alanlar arasindaki bosluk tek kaynaktan gelir; `.field` kendi alt boslugunu
  eklemez.
- Etiketler girdiden gorsel olarak geri planda durur: daha kucuk ve daha soluk.
- Metin, tarih, sayi ve secim girdileri ayni yukseklikte olur; yan yana
  duranlar hizalanir.
- `field()` istege bagli bir yardimci metin alir ve verildiginde alanin altinda
  gorunur.
- Satis tarihi alani, bos birakildiginda pozisyonun acik kalacagini soyleyen
  bir yardimci metin tasir.
- Pencere formlarindaki iptal dugmesi cerceveli bir dugmedir, duz metin degil.
- Bes formun tamami ayni gorunumu paylasir: giris, parola degistirme, islem,
  takip listesi, kullanici.
- Giris ekrani ve parola ekrani da bu stilden yararlanir; kendi ozel gorunumunu
  korumaz.
- Yeni bagimlilik eklenmez.
- `pnpm typecheck` ve `pnpm test` gecer.
