---
id: RQ-0039
status: draft
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

Fiyat alanları (`fiyat`, `fiyatCanli`, `degisim`, `oran`) alınmayacak: hisse
fiyatı takip etmiyoruz ve fonun getirisi zaten NAV'dan geliyor. Aldığımız veri
ne kadar dar olursa kaynağa bağımlılık o kadar az.

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

Yön değişimi: `eskiAgirlik` ve `fark` alanları fonların pozisyonu artırıp
azaltmadığını söylüyor. "Fonlar geçen ay ASELS'i azaltmış" bilgisi kâr değil
ama karar için değerli ve veri zaten yanıtta — ek maliyeti yok.

Sektör kırılımı da bedava geliyor: `sektorAdi` alanı yanıtta.

## Kâr dağıtımı bu RQ'da yok

"ASELS'ten ne kazandık" bu veriden çıkmıyor. Fonun kârını hisselere dağıtmak
için hissenin fiyat değişimi gerekiyor; bizde fon NAV'ı var, hisse fiyatı yok.
Hesaplanabilir hali `ağırlık × hissenin dönem getirisi × fon değeri` olurdu ve
bu bir yaklaşım kalırdı: ağırlıklar aylık, fon ay içinde alıp satıyor. Fon
ASELS'i ayın ortasında satmışsa biz hâlâ tutuyormuş gibi hesaplardık.

Aynı sebeple "üç gün üst üste %8 düşen hisse" alarmı da burada değil: günlük
hisse fiyatı gerekiyor. Ölçek de küçük değil — KHA tek başına 74 hisse
tutuyor, 39 fonda birleşik birkaç yüz hisse eder. Toplu bir fiyat ucu var mı
araştırılmalı. Ayrı RQ.

## Kapsam

Yalnız hisse tutan fonlar kalem düzeyinde veri veriyor. Para piyasası ve
tahvil fonlarında bu uç boş dönebilir; rapor kapsanmayan tutarı söylemeli —
RQ-0038'deki kuralın aynısı.

## Acceptance Criteria

- Fon başına hisse kırılımı toplanır ve saklanır: hisse kodu, şirket adı,
  sektör, ağırlık, önceki ay ağırlığı ve fark.
- Fiyat ve getiri alanları alınmaz.
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
- Sektör kırılımı da raporlanır; veri zaten geliyor.
- Fonların bir önceki aya göre pozisyonu artırıp azalttığı gösterilir.
- Hisse fiyatı toplanmaz ve kâr dağıtımı yapılmaz; ikisi de ayrı RQ.
- Fon çakışması gösterilir: aynı hisseyi taşıyan fonlar ve örtüşme oranı.
