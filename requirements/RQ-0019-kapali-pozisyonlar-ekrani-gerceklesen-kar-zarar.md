---
id: RQ-0019
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-02T20:15:42.373Z"
branch: "factory/RQ-0019"
createdFromCommit: "0012e54044e63c8695567234ca7dab4ee3859665"
completedRunId: "20260902201659-RQ-0019"
completedBy: "human"
completedAt: "2026-09-02T20:47:02.797Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/38"
githubPullRequestIid: 38
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/37"
githubIssueIid: 37
repositoryProvider: github
---
# RQ-0019 - Kapali pozisyonlar ekrani: gerceklesen kar zarar

Uygulama yalnizca acik pozisyonlari gosteriyor. Satilan pozisyonlarin ne
kazandirdigi hicbir ekranda yok; kullanicinin bagimsiz raporunda ("Closed
Positions — Realized P&L") var ve karsiligi burada olmali.

## Veri hazir

2026-09-02'de olculdu; hesap kullanicinin raporuyla kurusu kurusuna ortusuyor:

| | Uygulama | Rapor |
|---|---:|---:|
| Kapali kayit | 40 | 40 |
| Alis degeri | 2.194.279 | 2.194.279 |
| Satis degeri | 2.229.764 | 2.229.764 |
| Gerceklesen K/Z | +35.484 | +35.484 |

Gereken her sey mevcut: `analytics.position_leg` kapali bacaklari veriyor, NAV
zincirleme mekanizmasi alis ve satis gunundeki fiyati uretiyor, banka bilgisi
`portfolio_transaction.platform` alaninda. Yeni tablo veya migration gerekmez;
kapali bacaklari degerleyen bir view yeterli.

## Kapanma tanimi

`sell_date` gerceklesme tarihidir, dolayisiyla o gun fiyat bellidir ve pozisyon
kapanmis sayilir. Kullanicinin raporu ise satis gununu hala acik gosteriyor
("positions sold on 2026-09-02 are still shown as open"), cunku emir tarihi
mantigiyla calisiyor.

Iki tanim da kendi icinde tutarli. Burada RQ-0017'de kurulan kural korunur:
satis tarihi bugun veya gecmisse pozisyon kapalidir. Ustteki karsilastirma bu
yuzden `end_date < current_date` filtresiyle alindi; filtresiz 42 kayit ve
+40.196 cikiyor, aradaki fark bugun satilan DFI ve TLY kayitlari.

## Istenen ekran

Kenar cubuguna yeni bir gorunum eklenir. Icerik, kullanicinin raporundaki
tabloyla ayni sutunlari tasir:

`Banka · Fon · Alis Tarihi · Satis Tarihi · Adet · Alis Degeri · Satis Degeri ·
K/Z · K/Z %`

Ustte ozet kutulari: gerceklesen toplam kar/zarar, kapali islem sayisi, kazanan
ve kaybeden islem sayisi.

Siralama satis tarihine gore yeniden eskiye: en son kapanan ustte.

## Kapsam disi

Vergi ve stopaj hesabi, kapanmis pozisyonun grafigi, tarih araligi filtresi,
disari aktarma. Acik pozisyonlarin gosterimi degismez.

## Acceptance Criteria

- Kenar cubugunda kapali pozisyonlari acan bir gorunum bulunur ve RQ-0018'de
  kurulan duzene uyar: ikonlu gezinme ogesi, buyuk harfle baslayan baslik.
- Tablo her kapali islem icin bir satir gosterir; sutunlar banka, fon, alis
  tarihi, satis tarihi, adet, alis degeri, satis degeri, kar/zarar ve yuzdesidir.
- Satirlar satis tarihine gore yeniden eskiye siralanir.
- Toplam satiri alis degeri, satis degeri ve kar/zarar toplamlarini verir.
- Ozet kutulari gerceklesen toplam kar/zarari, kapali islem sayisini ve
  kazanan/kaybeden islem sayisini gosterir; RQ-0018'deki kutu duzenini kullanir.
- Satis tarihi bugunden ileride olan pozisyon bu ekranda gorunmez; hala acik
  sayilir ve portfoyde durur.
- Kar ve zarar gorsel olarak ayrilir; mevcut `signed` bicimi kullanilir.
- Hic kapali pozisyon yoksa bos durum mesaji cikar, hata olusmaz.
- Toplam gerceklesen kar/zarar, ayni tarih icin kullanicinin bagimsiz raporuyla
  ortusur; test bu hesabi sabit bir veri kumesi uzerinde dogrular.
- Yeni bagimlilik eklenmez.
- `pnpm typecheck` ve `pnpm test` gecer.
