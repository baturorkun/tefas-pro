---
id: RQ-0025
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-03T20:30:08.342Z"
branch: "factory/RQ-0025"
createdFromCommit: "8c3a0c5e11cd04dcde495b9f2f744fe968ef0e90"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/50"
githubPullRequestIid: 50
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/49"
githubIssueIid: 49
repositoryProvider: github
---
# RQ-0025 - Banka yönetimi: işlem formunda seçim listesi, ayarlarda banka tanımı

İşlem formundaki banka alanı serbest metin. Aynı banka "Nkolay", "nkolay",
"NKolay" diye üç ayrı platform gibi görünebilir ve maliyet takibi platform
bazında yapıldığı için bu doğrudan yanlış rakam üretir. Alan seçim listesine
dönüşür; bankalar admin'in yönettiği bir tanım listesinden gelir.

Bankalar `app_setting` içinde JSON olarak değil, kendi tablosunda tutulur.
Tatiller JSON durabiliyor çünkü onlara hiçbir satır referans vermiyor; banka
adına ise işlem satırları bakıyor. Bu farkın üç sonucu var:

- "Kullanılmayan banka silinebilir" kuralı `ON DELETE RESTRICT` ile
  veritabanının kendi garantisi olur. Uygulama kodundaki bir kontrol,
  db/sync.sh veya doğrudan psql gibi diğer yazma yollarında atlanırdı.
- Yeniden adlandırma `ON UPDATE CASCADE` ile bütün işlem satırlarını atomik
  günceller. JSON listede ad değişince eski adı taşıyan satırlar öksüz kalırdı.
- Var olmayan bir bankaya işaret eden işlem satırı hiç oluşamaz.

Birincil anahtar integer id değil, bankanın adıdır. `platform` sütunu zaten
text ve `analytics.closed_position` view'ında, API yanıtlarında ve arayüzde
o adla geçiyor; text anahtar sayesinde foreign key yerinde eklenir ve tek bir
sorgu değişmez. Integer id'nin asıl gerekçesi olan rename'i `ON UPDATE CASCADE`
karşılıyor.

Tablo mevcut `platform` değerlerinden tohumlanır: Nkolay, Fiba, Nkolay-B, YKB.

## Acceptance Criteria

- İşlem formundaki banka alanı seçim listesidir; serbest metin girilemez.
- Bankalar `bank` tablosunda tutulur; `portfolio_transaction.platform` bu
  tabloya `ON UPDATE CASCADE ON DELETE RESTRICT` ile bağlıdır.
- Migration mevcut işlemlerdeki bankaları tabloya taşır ve hiçbir işlem
  satırını sahipsiz bırakmaz.
- Ayarlar ekranında admin banka ekleyebilir ve silebilir; liste kullanıcı
  ekranlarında değil yalnız yönetimde düzenlenir.
- Hiçbir işlemde kullanılmayan banka silinir; kullanılan banka silinmez ve
  kaç işlemde kullanıldığını söyleyen bir uyarı gösterilir.
- Aynı ada sahip ikinci banka eklenemez; boş ad reddedilir.
- Banka listesi boşken işlem formu anlaşılır bir yönlendirme gösterir, sessizce
  boş bir seçim listesi çıkarmaz.
- Banka yönetimi yalnız admin'e açıktır; admin olmayan istek reddedilir.
- Mevcut ekranlar (Portföyüm, Kapananlar, Fon Hareketleri) bankayı eskisi gibi
  gösterir; değerler değişmez.
