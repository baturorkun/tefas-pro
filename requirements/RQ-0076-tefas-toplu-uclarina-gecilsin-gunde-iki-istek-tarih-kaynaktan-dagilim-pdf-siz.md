---
id: RQ-0076
status: draft
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-16T08:23:08.484Z"
branch: "factory/RQ-0076"
createdFromCommit: "87cf2037fff25f60b3e0f408ad216dfea2f5525f"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/153"
githubPullRequestIid: 153
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/152"
githubIssueIid: 152
repositoryProvider: github
---
# RQ-0076 - TEFAS toplu uçlarına geçilsin: günde iki istek, tarih kaynaktan, dağılım PDF'siz

Zamanlanmış TEFAS toplaması fon başına iki istek atıyor (`fonBilgiGetir` +
fiyat tarihi için `fonFiyatBilgiGetir`): 74 fon için günde 148 istek.
Geliştirme sırasında tekrarlanan koşumlar bir IP'nin engellenmesine yol açtı.
RQ-0075 tekrarları azalttı ama temel maliyet aynı kaldı.

TEFAS'ın fon-verileri sayfasının kullandığı iki toplu uç ölçüldü. İkisi de
tüm fonları tek istekte döndürüyor ve bot korumasına tabi değil:

    fonGnlBlgSiraliGetir   fiyat, pay adedi, yatırımcı, büyüklük — VE tarih
                           8157 kayıt = 2040 fon x 4 iş günü, tek istek
    dagilimSiraliGetirT    varlık sınıfı dağılımı, 54 sabit alan kodu, günlük
                           2002 fon, tek istek

**Sadakat ölçüldü.** 15 Eylül için 74 takip edilen fonda toplu veri ile
tekil uçtan yazılmış veri karşılaştırıldı:

    fiyat        74/74 aynı
    yatırımcı    74/74 aynı
    büyüklük     74/74 aynı
    pay adedi    70/74 aynı; 4 fark yuvarlamadan (toplu uç ondalık veriyor)

Toplu uç günlük getiri vermiyor; ardışık fiyatlardan türetildi ve TEFAS'ın
kendi `gunlukGetiri` değeriyle karşılaştırıldı: 224 gözlemin 220'si binde bir
içinde, maksimum sapma %0,17.

**Tarih sorunu kökten çözülüyor.** RQ-0073 fiyatın tarihini ikinci bir
istekle soruyordu; toplu yanıtta `tarih` alanı zaten var.

**Dağılım PDF'siz geliyor.** RQ-0071 varlık sınıfı dağılımını KAP'ın aylık PDF
raporundan parse ediyordu — kurucuya göre değişen şablonlar, bozuk kodlama,
etiket normalizasyonu. Toplu uç aynı veriyi günlük, JSON ve sabit alan
kodlarıyla veriyor. Şablon çeşitliliği ve etiket eşleme derdi ortadan kalkar.
KAP yalnız hisse kırılımı için kalır; TEFAS onu vermiyor.

Günlük istek sayısı 148'den 2'ye iner. Engellenme riski fiilen biter.

## Acceptance Criteria

- Günlük fon verisi tek `fonGnlBlgSiraliGetir` çağrısıyla toplanır; fon
  başına döngü ve `fonFiyatBilgiGetir` çağrısı kalkar.
- Satırın tarihi yanıttaki `tarih` alanından gelir; koşum günü varsayılmaz.
- Günlük getiri ardışık fiyatlardan türetilir.
- Net akış pay adedi değişiminden türetilmeye devam eder.
- Varlık sınıfı dağılımı `dagilimSiraliGetirT`'den günlük alınır ve alan
  kodları mevcut kanonik adlara (migration 047) eşlenir; Dağılım ekranı
  tek adlandırmada kalır.
- KAP toplaması artık dağılım yazmaz; yalnız hisse kırılımı.
- Takip listesine yeni fon eklendiğinde tek fon yolu aynı toplu ucu
  `fonKodu` süzgeciyle kullanır; iki yol ayrışmaz.
- Zamanlanmış koşum 10:30'dan önce biter (iki istek, saniyeler sürer).

## Kapsam dışı

- Fon terimleri (valör, stopaj, ücret, risk): toplu uçlarda yok. PSE ve BPZ
  için elle tamamlandı; kalıcı kaynak ayrı iş.
- Hisse kırılımı: KAP'ta kalır.
- Hisse günlük fiyatları: RQ-0072'deki kaynak değişmez.
