---
id: RQ-0039
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-05T10:25:46.637Z"
branch: "factory/RQ-0039"
createdFromCommit: "248d7aafbf7371348890ab6b460f619f8baf823a"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/78"
githubPullRequestIid: 78
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/77"
githubIssueIid: 77
repositoryProvider: github
---
# RQ-0039 - Fon hisse kırılımı ve portföy geneli hisse ağırlığı

Fonların hangi hisseleri tuttuğu bilinmiyor. Asıl soru tek fon değil toplam:
beş ayrı fon aldın diye çeşitlendirdiğini sanıyorsun ama beşi de aynı hisseyi
tutuyorsa aslında tek hisseye yüklenmişsin. Bu ancak fonların içi açılıp
toplanınca görünüyor.

RQ-0038 varlık **türü** kırılımını getirdi ("paranın %36,4'ü hisse"). Bu RQ bir
kat daha aşağı iniyor: o hissenin hangi hisseler olduğu.

## Kaynak: fvt.com.tr, araştırıldı ve doğrulandı

TEFAS kalem düzeyinde veri yayımlamıyor. Fintables'ın `info` ucunda da yok —
yalnız varlık sınıfı var, RQ-0038 onu kullanıyor.

fvt.com.tr'de var ve düzgün bir JSON API'si mevcut:

    GET https://fvt.com.tr/api/funds/{KOD}/distribution
    Başlık: x-device-id: <rastgele 16 hex>

Token veya oturum gerekmiyor; `x-device-id` tek özel başlık. `/api/app-token`
diye bir uç var ama bu çağrı için gerekmiyor — doğrulandı.

KHA için ölçülen yanıt: 74 kalem, her biri `hisseKodu`, `agirlik`, `sirketAdi`,
`sektorAdi`, `eskiAgirlik`, `fark`. `meta.aciklamaTarihi` ve `oncekiAy/oncekiYil`
alanları var.

`distribution` yanıtındaki fiyat alanları (`fiyat`, `oran`, `degisim`) hep
`0.00` dönüyor — ölçüldü, token'lı çağrıda da boş. Site bu kolonu ayrı bir
uçtan dolduruyor.

## Hisse fiyatı: ikinci uç, aynı API

    GET https://fvt.com.tr/api/stocks/chart-data?symbols=ASELS,AKBNK&range=1M

Günlük kapanışları tarihleriyle veriyor. Ölçülen:

    ASELS   6 Ağustos 353,75 → 3 Eylül 388,25  = %+9,75  (21 gün)
    AKBNK   6 Ağustos  67,40 → 3 Eylül  71,85  = %+6,60

Uç **istek başına 10 sembolle sınırlı**: 60 sembol gönderildi, 10 döndü.
Portföydeki fonlarda birleşik birkaç yüz farklı hisse var, yani onlu gruplar
hâlinde ~30 istek — collector'ın bugün 39 fon için attığından az.

Bu uç olmadan hisse kırılımı yarım kalıyor: "ASELS %6,1 ağırlığın var" deyip
ASELS'in ne yaptığını söyleyememek, kullanıcıyı siteye geri gönderir.

## Veri aylık, günlük değil

Bu tasarımı belirleyen kısıt. `meta` alanı Ağustos portföyünün 2 Eylül'de
açıklandığını söylüyor. Ölçülen fark:

    fvt   KHA hisse ağırlıkları toplamı   %90,50   (Ağustos sonu)
    biz   KHA "Hisse Senedi" sınıfı       %81,43   (4 Eylül, günlük)

Dokuz puanlık fark hata değil, zaman farkı — fon bir ay içinde hisse oranını
düşürmüş. Sonuç: hisse listesi bir aya kadar eski olabilir ve rapor bunu
söylemek zorunda. "Şu an THYAO'dasın" demek yanlış olur; "Ağustos sonunda
THYAO'daydın" doğru.

## Ölçeklenmez

RQ-0038'deki kuralın aynısı. Ay sonu ağırlıklarını bugünkü hisse sınıfı
oranına oturtmak sayıyı tutarlı gösterirdi ama uydurulmuş bir kesinlik olurdu.
Ham ağırlık kullanılır, fark ekranda söylenir.

## Ne raporlanır

Toplu ağırlık: her hisse için TL karşılığı, portföydeki payı ve kaç fon
üzerinden geldiği. "THYAO 214.300 ₺ · %8,4 · 6 fon" — RQ-0038'deki varlık türü
tablosunun bir kat aşağısı, aynı biçim.

Fon çakışması: iki fonun portföyü büyük ölçüde aynıysa iki yönetim ücreti
ödenip tek pozisyon taşınıyor demektir. Bu, hisse listesine bakarak
görülmeyen ama listeden hesaplanabilen bir bilgi ve doğrudan aksiyon üretiyor.

## Hisseden fona arama

Asıl kullanım şu: bir hisse hareketleniyor, o hisseyi taşıyan fonu artırmak
ya da azaltmak istiyorsun. Bu, toplanan verinin ters indeksi — hisse kodundan
fonlara.

    ASELS →  THF  %6,1  portföyümde 307.930 ₺
             KHA  %4,6  portföyümde 118.400 ₺
             DFI  %3,2  takip listemde, pozisyon yok

Fiyat verisi gerektirmiyor: hissenin hareketini kullanıcı piyasadan biliyor,
uygulamanın cevapladığı soru "o hisse hangi fonlarımda, ne ağırlıkta".

Takip listesindeki ama pozisyon açılmamış fonlar da listelenir — "hangi fonu
alayım" sorusunun cevabı orada olabilir.

Kapsam takip edilen fonlarla sınırlı. "Bu hisseyi en çok tutan fon hangisi"
diye tüm evrene sormak fon başına bir istek demek ve evren binlerce fon;
o ayrı bir iş. "Hangi fonumu artırayım" sorusu zaten kendi fonları arasından
cevaplanıyor.

## Yön değişimi

`eskiAgirlik` ve `fark` fonların pozisyonu artırıp azaltmadığını söylüyor.
"Fonlar geçen ay ASELS'i azaltmış" bilgisi kâr değil ama karar için değerli ve
veri zaten yanıtta — ek maliyeti yok.

Sektör kırılımı da bedava geliyor: `sektorAdi` alanı yanıtta.

## Kâr dağıtımı bu RQ'da yok

"ASELS'ten ne kazandık" bu veriden çıkmıyor. Fonun kârını hisselere dağıtmak
için hissenin fiyat değişimi gerekiyor; bizde fon NAV'ı var, hisse fiyatı yok.
Hesaplanabilir hali `ağırlık × hissenin dönem getirisi × fon değeri` olurdu ve
bu bir yaklaşım kalırdı: ağırlıklar aylık, fon ay içinde alıp satıyor. Fon
ASELS'i ayın ortasında satmışsa biz hâlâ tutuyormuş gibi hesaplardık.

Alarm kuralları da burada değil. Günlük fiyat bu RQ ile toplanacağı için veri
hazır olacak; eksik olan kuralın kendisi. "Üç gün üst üste %8 düştü" iyi bir
başlangıç ama tanımı netleştirmek gerekiyor: hissenin kendi düşüşü mü, yoksa
kullanıcının o hisseye maruziyetinin kaybı mı? %8 düşen ama portföyde %0,3
ağırlıklı bir hisse için alarm gürültüdür. Ayrı RQ.

## İki yeni sayfa, mevcut ekranlara dokunulmadan

Portföyüm ve Dağılım olduğu gibi kalıyor. RQ-0038'in Portföyüm'e koyduğu
açılır satır da duruyor — küçük ve işini görüyor. Bu RQ yalnız ekliyor.

**Fon sayfası.** Uygulamada bugün fon detay sayfası yok: fon kodu beş ekranda
geçiyor ama hiçbirinde açılamıyor. Fonun kendi hisselerinin doğal yeri burası.

    THF · TERA PORTFÖY HİSSE SENEDİ FONU
    Hisse Senedi %88,23 · Yatırım Fonları %7,88 · Vadeli Nakit %3,87
    ──────────────────────────────────────────────────────────────
    Hisse  Şirket      Sektör    Ağırlık  Önceki Ay  Fark    1A
    ASELS  Aselsan     Savunma    %6,10     %5,40    +0,70  +9,8%
    ...74 kalem

Fon kodunun geçtiği yerlerden buraya gelinir. Portföyüm'ün açılır satırına da
bir bağlantı eklenir; oradaki varlık türleri kalır, hisse listesi buraya gider
— 74 kalem açılır satırda okunmaz ve her fon satırında tekrarlanırdı.

**Hisseler sayfası.** Farklı bir soru: tek fon değil, portföyün tamamı.

    HİSSELER                          Ağustos sonu ağırlıklarıyla · aylık
    [Hisse] [Sektör]                            ara: [ASELS       ]

    Hisse  Şirket        Sektör     Değer      Ağırlık  Fon   1A
    ASELS  Aselsan       Savunma   214.300 ₺   %5,7  ▓▓▓  4  +9,8%
    THYAO  Türk Hava Y.  Ulaştırma 187.400 ₺   %5,0  ▓▓   6  −2,1%
    TOPLAM 287 hisse               2.140.900 ₺  %56,8

Satır açılınca hisseden fona geçilir:

    ASELS ▼
       THF  %6,1  307.930 ₺  portföyümde
       KHA  %4,6  118.400 ₺  portföyümde
       DFI  %3,2       —     takip listemde, pozisyon yok

Kullanım şu: bir hisse hareketlendi, hangi fonu artıracağını buradan
buluyorsun. Pozisyonu olmayan takip listesi fonları da görünüyor çünkü cevap
orada olabilir.

Hisse ⇄ Sektör geçişi aynı tabloda bir düğme: aynı veri, iki gruplama.

Çakışma ayrı panel:

    THF ⇄ KHA   18 ortak hisse   %34 örtüşme   ikisi de portföyünde

Toplam ağırlığın %100 olmaması normaldir ve söylenmelidir: portföyün gerisi
tahvil, repo, mevduat — hisse zaten değil.

## Kapsam

Yalnız hisse tutan fonlar kalem düzeyinde veri veriyor. Para piyasası ve
tahvil fonlarında bu uç boş dönebilir; rapor kapsanmayan tutarı söylemeli —
RQ-0038'deki kuralın aynısı.

## Acceptance Criteria

- Fon başına hisse kırılımı toplanır ve saklanır: hisse kodu, şirket adı,
  sektör, ağırlık, önceki ay ağırlığı ve fark.
- Hisse günlük kapanışları toplanır ve saklanır; getiri fiyattan hesaplanır,
  kaynağın hazır getiri alanına bağlanılmaz.
- Fiyat istekleri onarlı gruplar hâlinde atılır; uç istek başına 10 sembol
  döndürüyor.
- Fiyatı bulunamayan hisse hata sayılmaz; ağırlığı yine gösterilir.
- Açıklama tarihi kayıtla birlikte saklanır; hangi aya ait olduğu kaybolmaz.
- Toplama collector'a bağlanır; ayrı bir elle çalıştırma gerektirmez.
- İstekler `x-device-id` başlığıyla ve mevcut throttle kuralıyla atılır; fon
  başına tek istek.
- Kalem düzeyinde veri vermeyen fon hata sayılmaz; koşum bu yüzden düşmez.
- Portföy geneli hisse ağırlığı raporlanır: hisse başına TL, portföydeki pay
  ve kaç fondan geldiği.
- Ağırlıkların hangi tarihe ait olduğu raporda yazılır ve aylık olduğu
  belirtilir.
- Ağırlıklar bugünkü hisse sınıfı oranına ölçeklenmez; fark söylenir.
- Kalem verisi olmayan fonların tutarı kapsam dışı olarak yazılır, sessizce
  düşmez.
- Sektör kırılımı aynı tabloda bir geçişle gösterilir; ayrı panel açılmaz.
- Hisse toplamının portföyün tamamı olmadığı ekranda belirtilir.
- Fon sayfası eklenir: fonun varlık dağılımı ve hisse listesi orada durur.
- Fon koduna tıklanan yerlerden fon sayfasına gidilir.
- Mevcut ekranlar bozulmaz: Portföyüm ve Dağılım olduğu gibi çalışmaya devam
  eder, RQ-0038'in açılır satırı kalır; oraya yalnız fon sayfası bağlantısı
  eklenir.
- Fonların bir önceki aya göre pozisyonu artırıp azalttığı gösterilir.
- Hisse kodundan fonlara arama yapılabilir: o hisseyi taşıyan fonlar,
  ağırlıkları ve kullanıcının o fondaki pozisyonu listelenir.
- Hisse başına getiri gösterilir; hangi dönemin getirisi olduğu yazılır.
- Aramada takip listesindeki pozisyonsuz fonlar da görünür; "hangi fonu
  alayım" sorusunun cevabı orada olabilir.
- Aramanın takip edilen fonlarla sınırlı olduğu belirtilir.
- Hisse fiyatı toplanmaz ve kâr dağıtımı yapılmaz; ikisi de ayrı RQ.
- Fon çakışması gösterilir: aynı hisseyi taşıyan fonlar ve örtüşme oranı.
