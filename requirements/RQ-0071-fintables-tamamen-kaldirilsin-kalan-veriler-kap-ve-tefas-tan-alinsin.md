---
id: RQ-0071
status: draft
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-15T20:11:58.843Z"
branch: "factory/RQ-0071"
createdFromCommit: "64bdd41d301b4cc40e5141733cbab58dd0435892"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/143"
githubPullRequestIid: 143
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/142"
githubIssueIid: 142
repositoryProvider: github
---
# RQ-0071 - Fintables tamamen kaldırılsın, kalan veriler KAP ve TEFAS'tan alınsın

Fintables 15 Eylül'de dört bağımsız ağdan aynı anda 403 vermeye başladı ve
geri gelmedi. RQ-0068, RQ-0069 ve RQ-0070 günlük veriyi TEFAS'a, hisse
kırılımını KAP'a taşıdı. Geriye Fintables'a bağlı üç veri kaldı ve **üçü de
zaten güncellenmiyor** — production'da 14 Eylül'de donmuş durumdalar:

    Varlik dagilimi      14 Eylul   (TEFAS/KAP tarafi 15 Eylul)
    Donemsel getiriler   14 Eylul
    Fon terimleri        14 Eylul

Kod hâlâ Fintables'ı çağırıyor, her çağrı 403 alıyor ve zamanlanmış koşum her
gün "failed" bitiyor. Bu RQ Fintables'ı koddan tamamen çıkarır.

**Tek fon yolu da dahil.** Takip listesine yeni bir fon eklendiğinde iki ayrı
Fintables çağrısı yapılıyor: fonun adı evrenden çekiliyor
(`ensureFundKnown`), sonra verisi tek fonluk koşumla toplanıyor
(`collectSingleFund` → `ingestFund`). İkisi de 403 aldığı için **şu an yeni
fon eklemek kırık.** Bu yol TEFAS ve KAP'a taşınır.

## Acceptance Criteria

- `src/sources/fintables.ts` silinir; `FintablesClient`'a başvuru kalmaz.
- Fon evreni KAP'tan gelir. Ölçüldü: KAP `fund/criteria` ucu 2146 fon
  döndürüyor ve takip edilen fonların tamamı eşleşiyor.
- Varlık sınıfı dağılımı KAP'ın Portföy Dağılım Raporu'ndan alınır.
- Varlık sınıfı adlandırması tek biçime getirilir. Dağılım ekranı sınıfları
  fonlar arasında topladığı için iki farklı adlandırma aynı sınıfı ikiye
  böler; geçmiş satırlar da yeni adlandırmaya dönüştürülür.
- Dönemsel getiriler toplanmaz. Ölçüldü: `fact_fund_yield_snapshot` hiçbir
  ekran, sorgu veya view tarafından okunmuyor — yalnız yazılıyordu. Yeniden
  üretmek yerine toplanması durdurulur; tablo ve geçmiş veri korunur.
- Takip listesine yeni fon eklendiğinde fonun adı KAP'tan bulunur, verisi
  TEFAS ve KAP'tan toplanır. Ekleme akışı uçtan uca çalışır.
- Zamanlanmış Fintables koşumu kaldırılır; sunucuda kalan systemd birimi de
  kurulum sırasında temizlenir. Collector Log'da her gün "failed" satırı
  oluşmaz.
- Panel'deki "Son Toplama" kutusu zamanlanmış TEFAS koşumunu gösterir.
- `dim_fund_terms` (stopaj, yönetim ücreti, valör, risk) mevcut değerleriyle
  korunur; silinmez, sıfırlanmaz.

## Kapsam dışı

- **Fon terimlerinin otomatik güncellenmesi.** Yılda bir değişen statik
  bilgi; stopaj zaten fon bazlı değil, vergi mevzuatına göre fon türüne göre
  belirleniyor. Valör ve ücretler KAP'ta İzahname konusundan alınabilir
  (konu kodu `8aca490d502dd03b01502deb982000e2`) ama ayrı bir iş.
- **Hisse günlük fiyatları** (`fact_stock_daily`) — fvt ile birlikte kaynağı
  gitti, yerine kaynak aranacak. Fon detayındaki hisse getirisi sütunları bu
  RQ'da da boş kalır.
- Taranmış görüntü PDF'i gönderen fonlar için OCR.
