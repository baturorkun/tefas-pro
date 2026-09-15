---
id: RQ-0072
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-15T21:23:57.786Z"
branch: "factory/RQ-0072"
createdFromCommit: "f1330271a54f587df5acc872628b84ff170ecde5"
completedRunId: "20260915213042-RQ-0072"
completedBy: "human"
completedAt: "2026-09-15T21:33:35.173Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/145"
githubPullRequestIid: 145
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/144"
githubIssueIid: 144
repositoryProvider: github
---
# RQ-0072 - Hisse kodları birleştirilsin, günlük hisse fiyatları yeni kaynaktan gelsin

RQ-0070 hisse kırılımını KAP'a taşıdı ve fvt'yi kaldırdı. Yayına aldıktan
sonra üretim verisi ölçüldü ve iki sorun çıktı.

**Aynı hisse iki kodla sayılıyor.** Bazı fon şablonları borsa sonekini
yazıyor (`AKBNK.E`), bazıları yazmıyor (`AKBNK`). KAP'tan toplanan 1327 ayrı
kodun 139'u sonekli ve bunların **120'sinin sadesi de ayrıca kayıtlı** — yani
120 menkul kıymet çift sayılıyor. Fon detay ekranı ve hisseye göre yapılan
her toplama bundan etkileniyor. Ayrıca 15 kod tamamen sayısal
("1.232.000", "13"); bunlar hisse değil, PDF'ten yanlış çıkarılmış satırlar.

**Hisse fiyatları donmuş.** `fact_stock_daily` fvt'den geliyordu; fvt
kalkınca yeni fiyat gelmiyor. Tablo 15 Eylül'e kadar dolu (47.664 satır) ama
ileriye gitmiyor. Fon detayındaki 1 haftalık ve 1 aylık getiri sütunları "en
son bilinen kapanış"a göre hesaplandığı için **boşalmıyor, donuyor**: ekran
güncel bir getiri gösteriyormuş gibi durur ama sayı geçmişte kalmıştır. Bu,
boş göstermekten daha yanıltıcı.

Yeni kaynak ölçüldü: BIST hisseleri için günlük kapanış TRY cinsinden
alınabiliyor ve fvt'nin verdiği değerlerle birebir örtüşüyor (AKBNK
10 Eylül 72,10 / 11 Eylül 72,70 — iki kaynakta da aynı).

## Acceptance Criteria

- Menkul kıymet kodları tek biçime getirilir: borsa soneki (`.E`, `.O`, `.K`)
  ayrılır ve aynı kıymet tek kodla tutulur. Geçmiş satırlar da birleştirilir,
  ağırlıklar çakışırsa en güncel dönem geçerli olur.
- Hisse olmayan kodlar (tamamı sayı olanlar) yazılmaz.
- Günlük hisse kapanışları yeni kaynaktan toplanır ve `fact_stock_daily`
  dolmaya devam eder.
- Toplama sunucuda zamanlanmış koşar ve 10:30'dan önce biter.
- Son kapanış bayatsa fon detayındaki getiri sütunları **boş gösterilir**;
  donmuş sayı güncelmiş gibi sunulmaz.
- Yeni kaynağın verdiği fiyatların geçmiş veriyle tutarlılığı test edilir.

## Kapsam dışı

- Yabancı hisselerin fiyatları: portföylerde var ama BIST dışı; ayrı bir iş.
- Altın, opsiyon ve varant gibi hisse olmayan kalemlerin fiyatlanması.
- Fon terimlerinin (stopaj, ücret, valör) otomatik güncellenmesi.
