---
id: RQ-0050
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-07T19:35:02.790Z"
branch: "factory/RQ-0050"
createdFromCommit: "3da00cf789c2ab4c4a4e0860cc43e7d0f4520869"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/100"
githubPullRequestIid: 100
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/99"
githubIssueIid: 99
repositoryProvider: github
---
# RQ-0050 - Hisseler ekranı yalnız sahip olunan fonlardan kuruluyor

Hisseler ekranı "hangi hisselerdeyim" sorusunu cevaplamalı ama takip
listesindeki fonların hisselerini de listeliyor. Sahip olunmayan hisseler
0 TL değerle listede duruyor.

## Ölçüm

    toplam hisse                              686
    değeri SIFIR (yalnız takip fonlarından)   207
    hem portföy hem takip fonunda             153

686 hissenin 207'si kullanıcının değil: AAGYO, ADBE, AEIS, AGESA gibi kodlar
yalnız takip listesindeki fonların içinden geliyor.

## İki ayrı kusur

**1. Liste kapsamı.** `stockAllocation` fonları `analytics.tracked_fund`
üzerinden alıyor; o da takip listesini, sistem listesini ve diğer
kullanıcıların fonlarını kapsıyor. Ekranın amacı kullanıcının maruziyeti,
o yüzden liste sahip olunan fonlardan kurulmalı.

Değer ve ağırlık hesabı zaten doğru: `position_slice`'tan geldiği için takip
fonları sıfır katkı veriyor. Sorun yalnız listeye girmeleri.

**2. Fon sayısı karışık.** "N fon" sütunu portföydeki ve takipteki fonları
topluyor. DSTKF'de 7 fon yazıyor ama bunun 4'ü portföyde, 3'ü takipte —
kullanıcı "yedi fonumda var" diye okuyor.

Veri hazır: `StockFundRow.owned` her fon için sahiplik bilgisini taşıyor.

## 3. Fon evreni kullanıcıdan bağımsız

İlk düzeltmeden sonra çıktı: `analytics.tracked_fund` bir kullanıcı sütunu
taşımıyor, çünkü collector'ın toplayacağı fonları anlatıyor — herkesin takip
listesi, benchmark'lar ve sistem fon listesi orada.

    tracked_fund (collector evreni)     42
    batur'un açık pozisyonları          25
    batur'un takip listesi              15
    ikisinde de olmayan                  2   AAK, CVL

"Takip listem de gösterilsin" anahtarı bu yüzden kullanıcının kendi listesini
değil, sistemin bütün fonlarını getiriyordu.

## 4. İleri tarihli satış kapalı sayılıyor

Sahiplik `sell_date IS NULL` ile ölçülüyordu. Açıklık kuralı `position_slice`
ve `position_leg`'de `sell_date IS NULL OR sell_date > current_date`.

GBZ'nin `sell_date IS NULL` satırı yok — iki işlemin de satış tarihi ileride —
ama **201.532 TL** açık değeri var. Dar kural onu takip listesine yazıyor,
varsayılan kapsam da ekrandan düşürüyordu.

## Çözüm

Sütun iki değer gösterecek: **4 portföyde · 3 takipte**. Takip tarafı bilgi
olarak kalıyor çünkü "izlediğim fon da bu hisseye giriyor" karar için
değerli — ama değere ve ağırlığa karışmıyor.

Takip fonlarının hisseleri bir anahtarla geri getirilebilecek, varsayılan
kapalı. Kalıcı olarak gizlemek yanlış olurdu: kullanıcı daha önce
"içinde THYAO olan fonları listele" sorusunda takip listesindeki fonların da
görünmesini istemişti. Anahtar Panel ve Piyasa'daki ile aynı desen.

## Acceptance Criteria

- Hisseler listesi varsayılan olarak yalnız sahip olunan fonlardan kurulur.
- Sahip olunmayan fonlardan gelen hisseler varsayılan görünümde listelenmez.
- Anahtar bütün ekranı belirler: kapalıyken fon kırılımı, sayımlar ve tarih
  aralığı da yalnız sahip olunan fonları anlatır.
- Kapsam sütunu anahtar açıkken portföydeki ve takipteki fonları ayrı
  gösterir; kapalıyken yalnız portföydekini yazar.
- Değer ve ağırlık hesabı değişmez; takip fonları katkı vermez.
- Bir anahtarla takip listesindeki fonların hisseleri de görünür.
- Anahtarın varsayılanı kapalı ve seçim sayfa yenilendiğinde korunur.
- Sektör görünümü aynı kapsamı kullanır.
- Kapsam kullanıcının kendi fonlarıyla sınırlıdır: başkasının takip listesi,
  benchmark ve sistem fonları hiçbir görünümde yer almaz.
- Takip sayısı kullanıcının kendi takip listesini sayar.
- İleri tarihli satışı olan fon açık sayılır; kapsam kuralı `position_slice`
  ile aynı açıklık tanımını kullanır.
