---
id: RQ-0042
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-06T20:21:56.425Z"
branch: "factory/RQ-0042"
createdFromCommit: "032ba2156005bf25dcfb5b483d1a4f9d72e8e458"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/84"
githubPullRequestIid: 84
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/83"
githubIssueIid: 83
repositoryProvider: github
---
# RQ-0042 - Kullanıcı menüsü: admin linkleri alta katlanır, profil sayfası

Sol menü on dört öğeye çıktı ve kullanıcının kendi bilgisine bakabileceği bir
yer yok. İkisi aynı köşede çözülüyor: admin bağlantıları en alttaki kullanıcı
satırından yukarı açılan bir menüye taşınıyor, Profil de oraya giriyor.

## 1. Sol menü büyüdü

On bir "Genel" öğesinin altında üç "Admin" öğesi daha açık listede duruyor.
Admin bağlantıları gündelik kullanımda değil — Kullanıcılar, Collector Log ve
Ayarlar'a haftada bir girilir — ama her ekranda yer kaplıyor ve menüyü
uzatıyor.

Bunlar en alttaki kullanıcı satırının altına taşınacak. "Batur" yazısının
yanında yukarı ok olacak; basınca yukarı doğru bir menü açılacak ve admin
bağlantıları orada listelenecek. Admin olmayan kullanıcıda o bağlantılar
zaten yok; menü yine açılmalı çünkü Profil ve Çıkış orada olacak.

## 2. Profil sayfası yok

Aynı menüde **Profil** olacak. Bugün kullanıcının kendi bilgisine bakabileceği
tek yer yok: parola değiştirme yalnız ilk girişte zorunlu ekranda çıkıyor,
sonradan değiştirmenin yolu bulunmuyor.

Profil sayfasında kullanıcı adı, ad soyad ve parola değiştirme olacak.

### Kullanıcı adı değişebilir

Ölçüldü: `app_user.username` yalnız giriş adı. Hiçbir tablo kopyasını
tutmuyor, her şey `user_id` üzerinden bağlı; oturumlar da öyle, dolayısıyla ad
değişince kimse düşmüyor. Benzersizlik `lower(username)` üzerindeki unique
index ile sağlanıyor — "Batur" ile "batur" aynı sayılıyor.

Değiştirmeye açılırken iki yerin de aynı kurala uyması gerekiyor: giriş
`lower(username)` ile arıyor ama `db/user.ts` CLI'ı birkaç yerde tam eşleşme
(`username = $1`) kullanıyor. Aradaki fark bugün görünmüyor, ad değiştirilir
hâle gelince görünür olur.

### Kimlik alanları yok

`app_user`'da ad soyad, e-posta ve Telegram yok; migration gerekiyor.

**Ad soyad zorunlu.** Var olan kayıtlar `username`'den dolduruluyor — uydurma
değil, bugün ekranda zaten o yazıyor.

**E-posta zorunlu, ama yazma yollarında.** Kolon NULL kabul ediyor çünkü var
olan hesaplar için doldurulacak bir kaynak yok ve "kullanici@local" gibi bir
değer, olmayan bir adresi varmış gibi göstermek olurdu — sonradan oraya posta
göndermeye kalkan bir kod için sessiz bir tuzak. Zorunluluk hesap açarken ve
her form kaydında; eli değen her kayıt doluyor. Eksik kalanlar Kullanıcılar
ekranında işaretli. Adres benzersiz, benzersizlik küçük harfe göre.

**Telegram isteğe bağlı.** Baştaki `@` saklanmıyor: kullanıcı bazen yazıyor
bazen yazmıyor ve iki farklı kayıt aynı hesabı gösterirdi.

Kurallar tek modülde: profil ekranı, admin kullanıcı formu ve sunucu aynı
yerden okuyor. Ayrı ayrı yazılsaydı arayüzün kabul ettiğini sunucu
reddederdi — ya da daha kötüsü, tersi.

## Acceptance Criteria

- Admin bağlantıları sol menünün ana listesinden çıkar; menü kısalır.
- En alttaki kullanıcı satırı basılabilir ve yukarı ok taşır; basınca yukarı
  doğru bir menü açılır.
- Admin kullanıcıda o menüde Kullanıcılar, Collector Log ve Ayarlar bulunur;
  admin olmayanda bulunmaz.
- Menüde Profil ve Çıkış Yap yer alır.
- Menü dışına tıklayınca ve Esc ile kapanır; klavyeyle erişilebilir.
- Profil sayfasında kullanıcı adı, ad soyad, e-posta, Telegram ve parola
  değiştirme vardır.
- Aynı alanlar admin Kullanıcılar formunda da vardır.
- Kullanıcı adı değiştirilebilir; büyük/küçük harf farkıyla başkasının adı
  alınamaz ve değişiklikten sonra oturum düşmez.
- Ad soyad zorunludur.
- E-posta zorunludur, biçimi denetlenir ve iki hesapta aynı adres olamaz.
- Telegram isteğe bağlıdır; baştaki @ ile de yazılabilir.
- Parola değiştirmek mevcut parolayı ister.
- Kullanıcı adı araması her yerde aynı kurala uyar.
