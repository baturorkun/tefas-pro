---
id: RQ-0044
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-07T10:59:29.552Z"
branch: "factory/RQ-0044"
createdFromCommit: "a1379be7a6f01cdedd1aef5fb4c1e60f1038ccb1"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/88"
githubPullRequestIid: 88
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/87"
githubIssueIid: 87
repositoryProvider: github
---
# RQ-0044 - Panel araç çubuğu, sessiz takip listesi ve ileri tarihli alımlar

Kullanımda çıkan üç ayrı eksik. Ortak yanları, üçünde de uygulamanın bir şeyi
yaptığını söyleyip göstermemesi ya da ilgili kontrolü ilgisiz yere koyması.

## 1. Panel'de aynı işi yapan iki kontrol ayrı yerlerde

Panel'in bugünkü sırası:

    ① Getiri Günü · Günlük Getiri · Portföy Değeri · Toplam Kazanç
    ② [toggle] Takip listem de gösterilsin
    ③ FONLARIM
    ④ Maliyet · Net sermaye · Gerçekleşmiş kâr · Açık kâr
    ⑤ SIRALAMA  Alımdan beri | Son 1 ay | Son 3 ay
    ⑥ En çok kazandıran / En çok kaybettiren

② ve ⑤ aynı iki paneli (⑥) yönetiyor ama aralarında bir başlık ve dört kutu
var. Üstelik ④'teki kutular toggle'dan ETKİLENMİYOR: `posSum` sorgusu yalnız
gerçek pozisyonlardan hesaplanıyor, takip listesi simülasyonlarını hiç
saymıyor. Yani toggle, etkilemediği kutuların üstünde duruyor ve etkilediği
panellerden uzakta.

Renk açıklaması (portföyümde / takip listemde) da aynı durumda: yalnız
grafiklerdeki barları anlatıyor.

Üçü tek şeritte toplanacak: sıralama sekmeleri solda, toggle ve açıklama
sağda, ikisi de grafiklerin hemen üstünde.

## 2. Takip listesine ekleme sessizce görünmüyor

Ölçüldü: açık pozisyonu olan bir fon takip listesine eklendiğinde uç **201**
dönüyor, satır `user_watchlist`'e gerçekten yazılıyor, ama liste onu
göstermiyor.

Sebep `analytics.watchlist_visible`: açık pozisyonu olan fonu gizliyor.

    WHERE NOT EXISTS (SELECT 1 FROM portfolio_transaction p
                      WHERE p.user_id = w.user_id AND p.fund_code = w.fund_code
                        AND (p.sell_date IS NULL OR p.sell_date > CURRENT_DATE))

Bu gizleme kasıtlı ve doğru: takip listesi "sahip olmadığım, izlediğim
fonlar" demek. Fon alınınca listeden düşüyor, satılınca geri geliyor — kayıt
duruyor, yalnız görünmüyor. Yani eklenen satır çöp değil.

Kusur sessizlik. Uygulama "tamam" deyip hiçbir şey olmamış gibi duruyor;
kullanıcı yanlış tıkladığını sanıp tekrar deniyor. Ekleme anında söylenmeli:
fon portföyde olduğu için listede görünmeyecek, satıldığında dönecek.

## 3. İleri tarihli alımlar portföyde hiç görünmüyor

Ölçüldü: 2026-09-08 tarihli sekiz alım eklendi. Fon Hareketleri'nde sekizi de
görünüyor ama Portföyüm ve Panel onları hiç saymıyor — yeni eklenen CKL fonu
listede yok ve panel maliyeti bu alımlar hariç hesaplanıyor.

Sebep kasıtlı bir kural değil, yan etki: `analytics.position_leg` değerlemeyi
`alım tarihi → son veri günü` aralığında yapıyor. Alım tarihi son veri
gününden sonraysa aralık boş kalıyor ve satır sessizce düşüyor.

Veri kaybı yok; fiyat verisi o güne ulaşınca kendiliğinden görünecekler. Ama
arada "ekledim, panelde yok" diye şaşırtıyor ve hiçbir yerde sebebi yazmıyor.

TEFAS'ta bugün verilen emir ertesi iş gününün fiyatından işlem gördüğü için
ileri tarihli alım normal bir durum, istisna değil.

## Acceptance Criteria

- Panel'de sıralama sekmeleri, takip listesi toggle'ı ve renk açıklaması tek
  bir şeritte, iki grafik panelinin hemen üstünde durur.
- Toggle, etkilemediği metrik kutularının üstünde durmaz.
- Açık pozisyonu olan bir fon takip listesine eklendiğinde kullanıcı, fonun
  neden listede görünmeyeceğini ve ne zaman döneceğini öğrenir.
- Takip listesinin gizleme kuralı değişmez; kayıt yine saklanır ve pozisyon
  kapanınca listeye döner.
- Son veri gününden sonraya tarihli alımlar kullanıcıya görünür kılınır;
  portföyde neden yer almadıkları söylenir.
- İleri tarihli alım değerleme hesaplarını bozmaz ve uydurma bir değer
  üretmez.
