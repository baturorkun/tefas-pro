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
# RQ-0055 - Tutarla verilen alım pasif kayıt olarak bekliyor

TEFAS'ta alım emri **tutarla** verilir: "şu fondan 50.000 TL". Kaç pay
alındığı ancak o günün fiyatı açıklanınca belli olur. Uygulama ise adet
istiyordu — `portfolio_transaction.units` NOT NULL — yani alım verildiği anda
kaydedilemiyor, kullanıcı ya bekliyor ya unutuyordu.

## Ayrı tablo denendi, bırakıldı

İlk uygulama emirleri ayrı bir tabloda tuttu: hiçbir analytics view'a
girmiyordu, mevcut tek bir hesap değişmiyordu, riski sıfırdı.

Kullanımda düştü: iki liste ve bir "işleme çevir" adımı kafa karıştırıyor.
Kayıt normal formdan girilmeli, normal listede durmalı, yalnız pasif
beklemeli. Doğru olan bu — kullanıcının kafasındaki model tek bir işlem
listesi.

## Risk nerede ve nasıl tek yere toplandı

`units` nullable olunca risk gerçek: bu sütun beş analytics view'ında
aritmetiğe giriyor ve NULL bir adet sızarsa rakam **ekranda hata vermeden**
bozulur. Bu uygulamada en pahalı hata türü bu.

Filtre bu yüzden her view'a ayrı ayrı yazılmadı, tek yerde toplandı:

    analytics.settled_transaction = adedi belli olan işlemler

Hesap yapan beş view artık kaynağını oradan alıyor: `position_leg`,
`position_slice`, `closed_position`, `portfolio_daily`, `fund_daily`.
Yeni bir view eklenirken "doğru kaynağı seç" tek bir karar oluyor.

`tracked_fund` ve `watchlist_visible` bilerek ham tabloyu okumaya devam
ediyor: pasif alım da o fonun verisinin toplanmasını gerektiriyor. Toplanmazsa
fiyat hiç gelmez ve adet hiç belli olmaz.

Veritabanı kısıtları da kuralı taşıyor: ya adet ya tutar dolu olacak, tutar
pozitif olacak, adedi olmayan kayıt satılamayacak.

## Kayıt kesinleşince

Fiyat açıklanınca kullanıcı satırı düzenleyip adedi yazıyor; kayıt aynı
kayıt, artık aktif. Yeni satır açılmıyor, eskisi silinmiyor. Tutar da
kalıyor — ne ödendiği bilgisi değerli.

Adet otomatik hesaplanmıyor. `tutar / fiyat` yakın bir sayı verir ama banka
masrafı ve yuvarlama yüzünden gerçek adet farklı çıkabiliyor; uydurulmuş bir
adet maliyet tabanına girerse bütün getiri zinciri yanlışlanır.

## Acceptance Criteria

- Adet bilinmeden, tutarla alım kaydedilebilir; aynı "Alış Ekle" formundan.
- Kayıt normal işlem listesinde, pasif olduğu belli olacak şekilde durur.
- Pasif kayıt hiçbir hesaba girmez: maliyet, değer, getiri, dağılım.
- Pasif kayıt açık pozisyon sayılmaz.
- Pasif kayıt satılamaz.
- Adet ya da tutardan biri zorunludur; ikisi de boş kayıt reddedilir.
- Adet girilince kayıt aynı kayıt olarak aktifleşir; yeni satır açılmaz.
- Adet otomatik hesaplanmaz.
- Pasif kaydın fonu takip edilen fon sayılır ve verisi toplanır.
- Hesap yapan her view süzülmüş kaynağı okur.
