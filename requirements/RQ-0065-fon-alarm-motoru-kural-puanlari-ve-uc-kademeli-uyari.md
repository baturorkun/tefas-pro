---
id: RQ-0065
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-12T19:27:19.888Z"
branch: "factory/RQ-0065"
createdFromCommit: "282a53a8f4709edea3c259c3d9de47d579e373b9"
completedRunId: "20260912194622-RQ-0065"
completedBy: "human"
completedAt: "2026-09-12T21:40:09.943Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/131"
githubPullRequestIid: 131
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/130"
githubIssueIid: 130
repositoryProvider: github
---
# RQ-0065 - Fon alarm motoru: kural puanları ve üç kademeli uyarı

Bir fonun kötüye gitmeye başladığını birkaç gün içinde görmek istiyoruz. Şu
an hiçbir uyarı yok: PHE 2 Eylül'de çökmeye başladı, 11 Eylül'de %76
kaybetmişti ve bunu kimse fark etmedi.

Alarm **fona ait ve geneldir**. Kullanıcının pozisyon büyüklüğü hesaba
girmez; aynı fon herkes için aynı renktedir.

## Ne yapmıyor: tahmin

Ölçüldü. 2025-09 ile 2026-09 arası 4.641 gözlemde, 5 günlük sinyallerin
sonraki 5 günü haber verme gücü (piyasaya göre, ortanca):

    yalniz dusus (5g <= -%2)          591 gozlem   -0,16 puan   %52 geride
    yalniz cikis (buyuklugun %10'u)    99 gozlem   +0,50 puan   %43 geride
    ikisi birden                       58 gozlem   -0,14 puan   %55 geride
    hicbiri (taban)                  2625 gozlem   +0,10 puan   %48 geride

Hepsi yazı tura. Ortalamalarda görünen çarpıcı rakamlar (-3,14 ve -5,90)
yalnız PHE ve PBR'nin çöküşünden geliyordu; o ikisi çıkarılınca etki yok
oluyor.

Sonuç: bu motor kademeli zayıflamayı **tahmin edemez ve etmeye
çalışmayacak**. İşi felaketi erken **tespit** etmek. Felaket nadirdir ama
devasadır ve sinyali güçlüdür.

Hisse kırılımına bakarak tahmin yapmak ayrı bir iş; bu RQ yalnız fon
getirisi ve fon akışlarını kullanır.

## Nadir olmak bir gereklilik

Haftada bir sarı yanan sistem üçüncü haftada görmezden gelinir ve asıl
kırmızıyı kaçırır. Eşikler sistem aylarca sessiz kalacak şekilde seçilir.
Bugünkü ölçümle 72 fonda 3 kırmızı çıkıyor ve ikisi gerçekten çöküyor.

## Kıyas grubu: şemsiye türü

Fonun getirisi evrenin ortancasıyla değil **kendi şemsiye türüyle**
karşılaştırılır. `dim_fund.umbrella_type` bunu veriyor:

    Hisse Senedi Semsiye   32 fon
    Serbest Semsiye        13 fon
    Degisken Semsiye       12 fon
    digerleri              15 fon

Evren ortancası para piyasası fonlarının sakinliğiyle bastırılıyor ve her
hisse fonu piyasa düşüşünde haksız yere kötü görünüyordu. Grubunda en az
3 fon yoksa görece kural çalışmaz.

## Kurallar ve bugünkü ateşleme sayıları

Getiri ailesi, veri %99 dolu:

    3+ gun arka arkaya eksi                    4 fon
    5+ gun arka arkaya eksi                    2 fon
    5 gunde toplam <= -%2                      4 fon
    5 gunde toplam <= -%5                      2 fon
    grup ortancasindan >= 2 puan geride        7 fon
    20 gun zirvesinden >= %3 asagida           8 fon

Akış ailesi, `net_flow` %100 dolu, `investor_count` ve `aum` son günlerde
71/72 ama geçmişe doğru seyrek:

    5 gunde yatirimci >= %5 azalma             7 fon
    5 gunde net cikis >= buyuklugun %10'u     ~5 fon
    yatirimci sabit/artan AMA cikis >= %2      4 fon

Operasyon ailesi:

    3+ is gunudur fiyat gelmiyor               0 fon

Düşük eşikler kullanılamaz: çıkış %2'de fonların üçte biri, yatırımcı
azalması %2'de dörtte biri ateşliyor. Bunlar alarm değil gürültü.

## Puanlama

Her kural bir **aileye** ait ve bir puan taşır. Aile içinde yalnız en yüksek
kademe sayılır: "3 gün" ve "5 gün" birlikte puan verirse 5 güne ulaşan fon
iki kez cezalandırılır.

Her ailenin bir **tavanı** vardır. Getiri ailesinde dört kural var ve hepsi
aynı şeyi ölçüyor; tavan olmadan kural sayısı sessizce ağırlık belirler.
Ölçüldü: PHE dört getiri kuralını birden ateşleyip o aileden 100 puan
topluyor, akış ailesinden en fazla 65 gelebiliyor.

Toplam puan üç eşikle renge dönüşür: sarı, turuncu, kırmızı.

## Veri yetersizse alarm üretilmez

`investor_count` ve `aum` geçmişe doğru seyrek: son 30 günde %58, ağustos
başında 72 fonun 36'sı. Pencerenin iki ucunda veri yoksa kural ateşlemez ve
bunu "veri yok" olarak bildirir. Sessiz ateşlememe, iyi haber gibi
okunmamalı.

## Admin ekranı

Kurallar, puanlar, aile tavanları ve renk eşikleri ekrandan ayarlanır. Burası
AYAR ekranıdır; alarmların kendisi Alarmlar ekranında durur ve burada ikinci
kez listelenmez.

İki şey olmadan eşik seçmek tahmindir ve bu RQ'nun ölçümleri bunu gösterdi:

- **Canlı önizleme**: "bu ayarla şu an 8 sarı, 6 turuncu, 3 kırmızı".
- **Geriye dönük test**: "bu ayarla son 12 ayda 14 alarm üretilirdi;
  alarmdan sonraki 5 günde 9'u grubunun altında kaldı; en büyük yakalama
  PHE, 2 Eylül, sonraki 7 günde -%70".

## Gerekçe görünür

Bir fon kırmızıysa hangi kuralların hangi rakamlarla ateşlediği yazılır.
Gerekçesiz renk kara kutudur ve kimse güvenmez.

## Kullanıcı ekranı: üç liste

Alarmı GÖRMEK herkesin hakkı; kuralı DÜZENLEMEK admin işi. Ekran üç sekmeye
ayrılır, çünkü kullanıcı önce parası olan fonu görmeli:

    1. Portföyümdekiler   acik pozisyon
    2. Takiptekiler       takip listesi
    3. Diğerleri          yalniz alarm verenler

Sekme değişimi yeniden istek atmaz: tek yanıt üç grubu da taşıyor. Panel
başlığı ve özeti de sekmeyle değişir; yalnız gövdeyi değiştirmek, başlıkta
"Portföyümdekiler" yazarken altta takip listesini göstermek olurdu.

Kutular kendi paranın olduğu yeri ayrıcalıklı kılar: portföyde renkler ayrı
ayrı sayılır, takip ve diğerlerinde toplam yeter ve renk kırılımı alt satırda
durur. Veri günü kutusu yok; ekranda yer kaplıyordu.

Puan kullanıcıya göre değişmez; değişen yalnız sıralama. Aksi hâlde aynı fon
iki kişide iki renk olurdu. Bir fon hem portföyde hem takip listesindeyse
pozisyon grubu kazanır, iki kez görünmez.

Her sekmede yalnız alarm veren fonlar listelenir. Temiz fonları da yazmak
ekranı onlarca satır sessizlikle dolduruyor ve alarm veren satır aralarında
kayboluyordu; bu ekranın işi sorunları göstermek, envanter saymak değil.
Sekme özeti kaç fon içinde kaç alarm olduğunu söyler.

## Acceptance Criteria

- Kurallar veritabanında; aile, eşik, puan ve etkin/pasif alanları var.
- Aile içinde yalnız en yüksek kademe puan veriyor.
- Aile tavanı uygulanıyor.
- Görece kural şemsiye türü içinde karşılaştırıyor; grubu 3 fondan azsa
  çalışmıyor.
- Pencerenin ucunda veri yoksa kural ateşlemiyor ve "veri yok" diyor.
- Fon başına günlük puan ve ateşleyen kurallar için tablo ve kayıt fonksiyonu
  var; zamanlanmış koşum ayrı RQ.
- Admin ekranından kural, puan, tavan ve renk eşikleri düzenlenebiliyor.
- Admin ekranı o anki dağılımı gösteriyor.
- (ayrı RQ) Admin ekranı seçilen ayarın geçmişte kaç alarm üreteceğini gösteriyor.
- Ayar ekranında fon listesi yok; dağılım önizlemesi ve kural başına
  ateşleyen fon sayısı var.
- Alarm fona ait; kullanıcı pozisyonu PUANA girmiyor.
- Alarm ekranı admin olmayan kullanıcıya da açık; kural düzenleme uçları değil.
- Ekran üç sekmeye ayrılıyor: portföyümdekiler, takiptekiler, diğerleri.
- Sekme değişimi yeniden istek atmıyor; başlık ve özet sekmeyi takip ediyor.
- Kutular: portföyde kırmızı, turuncu, sarı ayrı; takip ve diğerlerinde
  toplam alarm ve alt satırda renk kırılımı.
- Bir fon yalnız bir sekmede görünüyor; pozisyon takibi eziyor.
- Her sekmede yalnız alarm veren fonlar listeleniyor.

## Bu RQ'da teslim edilen ve sonraya kalan

Teslim: şema (kural, aile, kademe, sonuç tabloları), tek SQL'de hesap,
kademe ve aile tavanı, şemsiye türü içinde görece kural, admin ayar ekranı
(cümle biçiminde kurallar, canlı dağılım, kural başına uyan fon), kullanıcı
ekranı (üç sekme, yalnız alarm verenler, gerekçe).

Sonraya kalan, ayrı RQ:

- Günlük koşum: `alarmKaydet` var ama collector çağırmıyor; ekranlar canlı
  hesaplıyor, "üç gündür kırmızı" henüz söylenemiyor.
- Geriye dönük test düğmesi: hesap 72 fon için ~3,5 s, yüzlerce günü tek
  seferde hesaplayan sürüm gerekiyor.
- Fon satırlarında renk işareti (Portföyüm, Takip Listem).

## Kapsam dışı

- Hisse kırılımına dayalı tahmin.
- Telegram veya e-posta bildirimi. Uygulama içinde kalır.
- Alarmın kullanıcı bazında kişiselleştirilmesi.
