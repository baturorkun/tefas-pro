---
id: RQ-0054
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-08T08:44:02.175Z"
branch: "factory/RQ-0054"
createdFromCommit: "efce6ce1189aefc59aca015a0bcfdd38ecfd6083"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/108"
githubPullRequestIid: 108
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/107"
githubIssueIid: 107
repositoryProvider: github
---
# RQ-0054 - Bekleyen alımlar Portföyüm ekranında görünüyor

Portföyüm ekranı ileri tarihli alımları göstermiyor. Fiyatı henüz
açıklanmadığı için hesaba katılamıyorlar — bu doğru — ama görünmemeleri
doğru değil: kullanıcı yaptığı alımı ekranda arıyor ve bulamıyor.

## Ölçüm

    veri günü                  2026-09-07
    bekleyen alım              8 işlem, hepsi 2026-09-08, hepsi Fiba
    fonlar                     CKL DFI DOH HBU RBR TAU THF YZC

    satırı olan fonlar         DOH HBU RBR TAU THF YZC   (6)
    hiç satırı olmayan         CKL DFI                   (2)

İki fon ekranda **hiç yok**. CKL yeni alınmış, DFI'nin eski bacakları
7 Eylül'de kapanmış; ikisinin de tek açık işlemi 8 Eylül tarihli, o yüzden
`position_return` onları hiç üretmiyor.

Diğer altısının satırı var ama adet, maliyet ve değer bekleyen alımı
saymıyor — ki doğrusu bu — ve satırda bunu söyleyen hiçbir şey yok.
Kullanıcı DOH'un adedine bakıp "ben daha fazla almıştım" diyor.

Panel'de bu bilgi zaten var, ekranın dibinde bir not olarak. Portföyüm'de yok.

## Tutar: satırda yok, pencerede tahmin

RQ-0044'ün kuralı satırlar ve toplamlar için aynen geçerli: ileri tarihli
alımın fiyatı açıklanmadığı için maliyeti hesaplanamaz, "0 TL" yazmak
olmayan bir rakamı varmış gibi göstermektir.

Ama "kaç para tutar" meşru bir soru ve cevabı yaklaşık olarak biliniyor.
Pencerede son bilinen birim fiyattan bir **tahmin** verilir; yanında `≈`
işareti, altında fiyatın günü ve "gerçek fiyat işlem gününde açıklanacak"
cümlesi durur. Uydurma ile etiketli tahmin arasındaki fark budur: rakamın
nereden geldiği aynı yerde yazıyor.

Aynı tahmin Fon Hareketleri'nde de görünür. Orada "Maliyet / Değer" hücresi
maliyet yokken tire gösteriyordu; artık üst satırda **tahmini** yazıyor, alt
satırda `≈` ile rakam.

Etiket "tahmini", "bugünlük" değil: ikincisi fiyatın gününü anlatıyor ve
"bugünkü değeri" diye okunabiliyor, oysa söylenmek istenen rakamın kendi
durumu. Pencerede de aynı kelime geçiyor, iki yer birbirini doğruluyor.

Tahmin arayüzde kurulur; sunucu yalnız birim fiyatı ve gününü taşır. Tahmin
hiçbir toplama girmez.

Fiyatı hiç olmayan fonda tahmin de yoktur — tire yazılır. Ölçüldü: CKL yeni
eklendiği için collector henüz fiyat toplamamış.

## Bekleyen satış ayrı bir şey

Bekleyen satış da gösterilir ama alımla aynı şey değil ve öyle
gösterilmemeli. Satışı bekleyen pozisyon hâlâ açık: adedi, maliyeti ve
değeri gerçek, yalnız çıkış ileri tarihli. Bekleyen alımda ise ortada
hesaplanabilir bir rakam yok.

    bekleyen satış   GBZ · 2026-09-10 · Nkolay · 56.017 adet (2 işlem)

İki kural da farklı: alım son **veri gününe** göre bekliyor (fiyat
açıklanmamış), satış **bugüne** göre (tarihi gelmemiş). Bu yüzden işaretleri
de ayrı: alım `+`, satış `−`.

## Üç yerde görünür

**Kutu.** Metrik şeridine beşinci kutu: kaç alım bekliyor ve hangi tarihten
itibaren. Yalnız bekleyen alım varken çizilir; sıfırken boş bir kutu
göstermek şeridi kalabalıklaştırır.

**Satır işareti.** Bekleyen işlemi olan satırın başında bir işaret durur;
üstüne gelince ya da tıklayınca hangi tarihte kaç adet beklediğini söyler.
Tıklama da gerekli: tooltip dokunmatik ekranda yok.

**Kendi satırı.** Yalnız bekleyen alımı olan fon da listede yer alır —
CKL ve DFI'nin görünmemesi asıl şikâyet. Bu satırlarda maliyet, değer ve
getiri hücreleri **boş** kalır; sıfır yazmak yanlış rakam yazmaktır.

**Fon detayı.** Aynı bilgi fon detayında da durur; kullanıcı detaya girmeden
de görebilmeli ama girince de kaybetmemeli.

## Acceptance Criteria

- Bekleyen işlem varken Portföyüm'de kaçının beklediğini söyleyen bir kutu
  görünür; yokken kutu çizilmez.
- Bekleyen alımı olan satır `+`, bekleyen satışı olan satır `−` işareti taşır.
- Bekleyen satış son veri gününe değil bugüne göre belirlenir.
- İşaretin üstüne gelmek ya da tıklamak hangi tarihte kaç adet beklediğini
  söyler.
- Yalnız bekleyen alımı olan fon da listede satır olarak görünür.
- O satırların maliyet, değer ve getiri hücreleri boştur; sıfır yazılmaz.
- Satırlarda ve toplamlarda bekleyen işlemin tutarı yazılmaz.
- Pencerede son bilinen fiyattan tahmini tutar verilir; yaklaşık olduğu
  işaretle, hangi günün fiyatından hesaplandığı yazıyla belirtilir.
- Fiyat verisi olmayan fonda tahmin üretilmez.
- Fon Hareketleri'nde maliyeti olmayan işlem satırı da aynı tahmini gösterir
  ve "tahmini" diye etiketlenir.
- Tahmin hiçbir toplam satırına girmez.
- Toplam maliyet, değer ve kâr rakamları değişmez: bekleyen alım hesaba
  girmez.
- Aynı bilgi fon detayında da görünür.
