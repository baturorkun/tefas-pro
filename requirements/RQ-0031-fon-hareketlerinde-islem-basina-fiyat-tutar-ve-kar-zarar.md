---
id: RQ-0031
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-04T09:09:45.537Z"
branch: "factory/RQ-0031"
createdFromCommit: "a1a643c8cacd0071f7a82d861e08eb72c8fa3ea3"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/62"
githubPullRequestIid: 62
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/61"
githubIssueIid: 61
repositoryProvider: github
---
# RQ-0031 - Fon hareketlerinde işlem başına fiyat, tutar ve kâr/zarar

Fon Hareketleri ekranında hiç para yok: `Fon · Adet · Alış · Banka · Satış ·
Durum`. Hangi lottan ne kazanıldığı, hangi fiyattan alındığı, o lotun bugün ne
ettiği görünmüyor. Kullanıcı "bu alımım iyi miydi" sorusunu ekranda
cevaplayamıyor; portföy toplamları var ama kırılımı yok.

Hesap zaten yapılıyor. `analytics.position_slice` her işlem için maliyeti ve
güncel değeri veriyor; alış fiyatı maliyet bölü adet, bugünkü fiyat değer bölü
adet. Kapanmış satırlarda da çalışıyor — orada "değer" satış anındaki tutar
oluyor, yani gerçekleşen kâr/zarar.

Değerler PDF raporuyla doğrulandı: TLY'nin 12 Mart lotu 4308,7100 alış /
9440,8338 bugün / 103.409 maliyet / 226.580 değer / +123.171 kâr / +%119,11 —
son haneye kadar aynı. Yapılacak iş hesap değil, gösterim.

## Sütun sayısı

Ham hâlinde on bir sütun çıkıyor ve tablo kalabalıklaşıyor. Alış fiyatı ile
bugünkü fiyat aynı hücrede alt alta durur; ikisi aynı büyüklüğün iki ucu ve
yan yana okunduklarında zaten karşılaştırılıyorlar.

## Kapsam

Yalnız Fon Hareketleri ekranı. Kapananlar ekranı gerçekleşen kâr/zararı zaten
kendi kapsamında gösteriyor; orası değişmiyor.

## Acceptance Criteria

- Fon Hareketleri her işlem için alış fiyatını, güncel fiyatı, alış tutarını,
  güncel değeri, kâr/zararı ve kâr/zarar yüzdesini gösterir.
- Kapanmış işlemde güncel değer yerine satış anındaki değer görünür ve
  kâr/zarar gerçekleşmiş kâr/zarardır.
- Değerler Portföyüm, Dağılım ve Kapananlar ekranlarındaki karşılıklarıyla
  tutarlıdır; hepsi aynı kaynağı kullanır.
- Getiri günü olmayan işlem (aynı gün alınmış, henüz ölçülemiyor) satır olarak
  görünmeye devam eder; para sütunları tire gösterir, sıfır değil.
- Tablo yatayda taşmaz; alış ve güncel fiyat tek hücrede toplanır.
- Toplam satırı tüm işlemlerin maliyetini, değerini ve kâr/zararını verir.
- Silme ve düzenleme eylemleri çalışmaya devam eder.
