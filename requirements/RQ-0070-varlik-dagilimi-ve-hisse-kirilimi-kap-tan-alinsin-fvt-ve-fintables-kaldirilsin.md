---
id: RQ-0070
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-15T18:07:35.385Z"
branch: "factory/RQ-0070"
createdFromCommit: "9689b59466a47f3cb7ba6cd0d25aa0e54d5a0a79"
completedRunId: "20260915184541-RQ-0070"
completedBy: "human"
completedAt: "2026-09-15T18:50:08.517Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/141"
githubPullRequestIid: 141
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/140"
githubIssueIid: 140
repositoryProvider: github
---
# RQ-0070 - Hisse kırılımı KAP'tan alınsın, fvt kaldırılsın

Fonların hisse kırılımı bugüne kadar fvt.com.tr'den geliyordu. fvt veri
merkezi IP'lerini engelliyor: sunucudan 39 fonun 39'u da 403 alıyor, bu
yüzden toplama sunucuda koşamıyor ve ev IP'sinden elle tetikleniyor.

Aynı veri KAP'ta var. Fonlar portföylerini yasa gereği KAP'a bildiriyor;
fvt de zaten o bildirimi okuyup paketliyormuş. Ölçüldü: 8 fonda fvt'nin
`fund_stock_holding` kayıtlarıyla KAP raporundan çıkarılan ağırlıklar
karşılaştırıldı — **214 eşleşen kalemin 214'ü tam isabet, maksimum sapma
0.000**.

KAP'ta kimlik doğrulaması ve IP engeli yok; sunucudan çalışıyor.

**Kapsam ölçüldü.** Takip edilen 72 fonun tamamı KAP'ta eşleşiyor. Rapor
PDF eki olarak geliyor ve şablon kurucuya göre değişiyor; parser üç ayrı
varyantı çözüyor:

    bozuk Türkçe kodlaması (DEĞERĠ)        EC2
    Arap rakamlı bölüm numarası (3- / III-) PIL RFM RYF CPT DFI
    bildirimde birden fazla ek             IAE IVY

    kalem parse edilen: 68/72

Kalan 4 fon (IDO, NLE, NSP, ST1) taranmış görüntü PDF'i gönderiyor, metin
içermiyor — OCR olmadan okunamaz, kapsam dışı.

**Bu değişiklik kapsamı düşürmüyor, artırıyor:** fvt bugün üretimde takip
edilen fonların 64'ünü kapsıyor, KAP 68'ini.

Bildirim sıklığı `period` alanında: `AB` aylık, `HB` haftalık. Yasa
değişikliğiyle fonlar haftalığa geçiyor — 13 fon çoktan geçmiş. İkisi de
desteklenir; koşum her gün çalışır, yeni bildirim yoksa bir şey yazmaz.

## Acceptance Criteria

- Hisse kırılımı KAP'ın Portföy Dağılım Raporu'ndan alınır ve
  `fund_stock_holding` tablosuna yazılır.
- `as_of_date`, fonun portföyünü açıkladığı dönemdir; ölçüm günü değildir.
- Aylık (`AB`) ve haftalık (`HB`) bildirim biçimlerinin ikisi de işlenir.
- Bir fonun raporu okunamazsa koşum düşmez; o fon atlanır, sebebi
  `ingest_run` kaydına yazılır. Kısmi başarı normaldir.
- Toplama sunucuda zamanlanmış koşar; ev IP'sine bağımlılık kalmaz.
- PDF'ten metin çıkarma container içinde çalışır.
- Parse fonksiyonları ağdan ve dosya sisteminden bağımsızdır, fixture ile
  test edilir. İki şablon ailesi de fixture'lanır.
- `src/sources/fvt.ts`, `src/collect-fvt.ts` ve `scripts/collect-fvt.sh`
  kaldırılır; fvt'ye başvuru kalmaz.

## Kapsam dışı

- **Varlık sınıfı dağılımı** — RQ-0071'e bırakıldı. KAP'ın etiketleri
  Fintables'ınkiyle birebir örtüşmüyor ve Dağılım ekranı sınıfları fonlar
  arasında topladığı için adlandırmanın tek biçime getirilmesi gerekiyor;
  geçmiş verinin dönüştürülmesi de o RQ'nun işi.
- **Hisse günlük fiyatları** (`fact_stock_daily`) — fvt kalkınca güncellenmez
  olacak. KAP hisse fiyatı yayımlamıyor; kaynak ayrıca aranacak. Fon detay
  ekranındaki hisse getirisi sütunları bu veriye dayanıyor ve boşalacak.
- Taranmış görüntü PDF'i gönderen fonlar için OCR.
- Sektör bilgisi: fvt veriyordu, KAP vermiyor.
