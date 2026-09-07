---
id: RQ-0045
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-07T11:42:10.591Z"
branch: "factory/RQ-0045"
createdFromCommit: "fb886f9c41c53c6649761e23d21c9043c3a2d466"
completedRunId: "20260907114307-RQ-0045"
completedBy: "Batur Orkun"
completedAt: "2026-09-07T12:12:18.794Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/90"
githubPullRequestIid: 90
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/89"
githubIssueIid: 89
repositoryProvider: github
---
# RQ-0045 - Sistem fon listesi: toplama kapsamı kullanıcıdan bağımsız

Bazı fonların verisi toplansın ve Piyasa ekranında görünsün isteniyor, ama
kimsenin takip listesinde çıkmasınlar. Bugün bunun yolu yok.

## Toplama kapsamı tamamen kullanıcılara bağlı

`analytics.tracked_fund` dört kaynağın birleşimi:

    user_watchlist                (kullanıcı filtresi YOK, hepsi)
    açık portfolio_transaction    (hepsi)
    app_setting['benchmark']      (tek fon)
    user_setting['benchmark']     (kullanıcı başına tek fon)

İlk iki kaynak kullanıcı ayırt etmiyor, yani bir fon herhangi bir kullanıcının
listesindeyse toplanıyor. Ölçüldü: bugün 40 fon toplanıyor ve kapsamı fiilen
tek bir kullanıcı belirliyor (batur 39 takip + 24 açık fon).

Sistem düzeyinde tek kanca `app_setting['benchmark']` ama o bir liste değil,
tek fon ve işi karşılaştırma — veri havuzu değil.

### Neden bir hesabın listesine konmuyor

Akla gelen ilk çözüm fonları `admin` hesabının takip listesine koymaktı.
Reddedildi: **admin bir rol, kimlik değil.** Herhangi bir kullanıcı admin
olabilir, admin'liği bırakabilir, hesabı silinebilir. `user_watchlist`
satırları `ON DELETE CASCADE` ile hesaba bağlı; toplama kapsamının bir hesabın
ömrüne bağlı olması, hesap silinince kapsamın sessizce daralması demek.

Ayrıca o hesabın *Takip Listem* ekranı gerçek bir takip listesi gibi görünür,
oysa amacı yalnız veri çekmek — iki ayrı niyet tek alana biner.

## Çözüm

Kullanıcıya bağlı olmayan bir tablo:

    system_fund(fund_code PK, note, added_by, added_at)

`added_by` yalnız iz; `ON DELETE SET NULL`, çünkü hesap silinince kayıt
DURMALI. `user_watchlist`'teki CASCADE ile arasındaki fark tam bu.

`analytics.tracked_fund`'a beşinci dal olarak girer; collector ve Piyasa
kapsamı kendiliğinden genişler, ikisinde de değişiklik gerekmez.

Kullanıcıların *Takip Listem* ekranı etkilenmez: orası `watchlist_visible`
üzerinden yalnız `user_watchlist` okuyor.

Yönetim admin menüsünde KENDİ ekranında. Ayarlar'a konmuyor: orası tek
değerli ayarların yeri (benchmark, tatil takvimi), bu ise liste yönetimi.

Aynı gerekçeyle **Bankalar** da Ayarlar'dan çıkarılıp kendi ekranına alınıyor.
O da bir liste ve üç ayrı işi tek ekranda toplamak sayfayı uzatıyordu.

### Kararlar

**Bağımsız.** Bir fon hem sistem listesinde hem bir kullanıcının listesinde
olabilir; birinden çıkarmak diğerini etkilemez. İki ayrı niyet.

**Piyasa'da "takip listemde" rengiyle görünür.** Üçüncü bir renk grafikleri
kalabalıklaştırırdı; kullanıcı açısından ikisi de "sahip değilim ama veri
var" demek.

**Silme veriyi silmez.** Fon listeden çıkarılınca toplanan geçmiş fiyatlar
durur; yalnız bundan sonra toplanmaz. Aksi hâlde bir tıkla aylarca veri
kaybedilebilirdi.

## Acceptance Criteria

- Sisteme, hiçbir kullanıcıya bağlı olmayan bir fon listesi eklenir.
- Listedeki fonların verisi toplanır ve Piyasa ekranında görünürler.
- Bu fonlar hiçbir kullanıcının Takip Listem ekranında görünmez.
- Liste admin menüsündeki kendi ekranından, admin yetkisiyle eklenip
  çıkarılabilir.
- Bankalar da Ayarlar'dan çıkıp admin menüsünde kendi ekranına alınır.
- Her ikisi de sol menünün ana listesinde görünmez.
- Ekleyen hesap silinse bile kayıt durur ve toplama sürer.
- Tanınmayan fon kodu eklenemez.
- Listeden çıkarmak toplanmış geçmiş veriyi silmez.
- Kullanıcı takip listeleri ve mevcut toplama davranışı değişmez.
