---
id: RQ-0055
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-08T11:01:41.268Z"
branch: "factory/RQ-0055"
createdFromCommit: "3ea59c02502957d3be2a401dd01c5614b862a4ff"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/110"
githubPullRequestIid: 110
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/109"
githubIssueIid: 109
repositoryProvider: github
---
# RQ-0055 - Tutarla verilen alım emri kayıt altına alınıyor

TEFAS'ta alım emri **tutarla** verilir: "şu fondan 50.000 TL". Kaç pay
alındığı ancak o günün fiyatı açıklanınca belli olur. Uygulama ise adet
istiyor — `portfolio_transaction.units` NOT NULL — yani emir verildiği anda
kaydedilemiyor. Kullanıcı ya bekliyor ya da unutuyor.

Bu bir eksiklik, hata değil: kayıt için gereken bilgi henüz yok. Ama emir
gerçek, para çıktı ve bir yere yazılmalı.

## Neden ayrı tablo

İlk akla gelen `units`'i nullable yapmak. Ölçüldü, riski büyük:

    units kullanan analytics view      6
    ayrıca FIFO maliyet hesabı         position_leg, position_slice, closed_position

NULL bir adet bu zincire sızarsa maliyet sessizce bozulur — ekranda hata
çıkmaz, yalnız rakam yanlış olur. Bu uygulamada en pahalı hata türü bu.

Daha da önemlisi kavramsal: **emir pozisyon değil.** Verilmiş ama
gerçekleşmemiş bir emrin adedi yok, maliyeti yok, getirisi yok. Onu
pozisyon tablosuna koymak "sonradan tamamlanacak eksik bir pozisyon" gibi
davranmayı gerektirir; ayrı tabloda tutmak ise ne olduğunu doğru söyler.

Ayrı tablo hiçbir analytics view'a girmez. Var olan tek bir hesap
değişmez — bu, değişikliğin en güçlü yanı.

## Emirden işleme geçiş

Fiyat açıklanınca adet hesaplanabilir: `tutar / birim fiyat`. Bu rakam
**otomatik yazılmaz**, öneri olarak gösterilir ve kullanıcı onaylar.

Sebebi ölçülebilir bir gerçek: banka masrafı, komisyon ve yuvarlama
yüzünden gerçek adet hesaplanandan farklı çıkabiliyor. Uydurulmuş bir adet
maliyet tabanına girerse bütün getiri zinciri yanlışlanır. Öneri gösterip
onay istemek, kullanıcının dekonttaki gerçek adedi yazmasına da izin verir.

Emir işleme dönüştüğünde emir kaydı silinir; iki yerde iki kayıt kalmaz.

## Nerede görünür

Fon Hareketleri'nde, listenin üstünde kendi bölümünde. Portföyüm'ün
"Bekleyen İşlem" kutusu bu emirleri de sayar — RQ-0054'te kurulan yer zaten
"henüz hesaba girmemiş şeyler" demek.

Emir satırı hiçbir toplama girmez.

## Acceptance Criteria

- Adet bilinmeden, tutarla alım emri kaydedilebilir.
- Emir kaydı fon, banka, emir tarihi ve tutar taşır; not isteğe bağlı.
- Emir hiçbir analytics view'ına girmez; mevcut hesaplar değişmez.
- Emir hiçbir toplam satırına ve metrik kutusuna tutar olarak eklenmez.
- Emirler Fon Hareketleri'nde kendi bölümünde listelenir.
- Fiyat açıklandığında adet önerisi gösterilir; otomatik yazılmaz.
- Kullanıcı öneriyi kabul edebilir ya da gerçek adedi elle yazabilir.
- Emir işleme dönüşünce emir kaydı silinir.
- Kullanıcı silinince emirleri de silinir.
- Emir silinebilir.
