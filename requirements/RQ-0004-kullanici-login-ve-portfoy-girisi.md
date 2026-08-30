---
id: RQ-0004
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-08-30T11:33:22.029Z"
branch: "factory/RQ-0004"
createdFromCommit: "def22ef1fd72c22ab5ebab459bb3652834845719"
completedRunId: "20260830121028-RQ-0004"
completedBy: "batur"
completedAt: "2026-08-30T17:09:17.288Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/8"
githubPullRequestIid: 8
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/7"
githubIssueIid: 7
repositoryProvider: github
---
# RQ-0004 - Kullanıcı, login ve portföy girişi

Projenin ilk kullanıcı arayüzü ve ilk kimlik doğrulaması. Bugüne kadar yalnız
veri toplandı; burada veriyi kullanan insan tarafı başlıyor.

İki menü olur: yönetim işleri için **admin menüsü**, herkese açık **portföy
menüsü**. Portföy menüsünde kullanıcı hangi fonu, kaç pay, ne zaman, hangi
bankadan aldığını girer; sattıysa satış tarihini yazar.

## Bu requirement neden büyük

Projede şu an HTTP sunucusu yok. `src/main.ts` tarayıcıda çalışan birkaç satır,
kök `Dockerfile` nginx ile statik dosya servis ediyor. Login bir sunucu ister:
parola doğrulama, oturum, yetki kontrolü. Yani burada hem sunucu katmanı, hem
kimlik doğrulama, hem de ilk ekranlar birlikte geliyor.

Bölünebilir: sunucu + kimlik doğrulama bir requirement, ekranlar bir sonraki.
Tek parça istenirse aşağıdaki kapsam geçerlidir.

## Sunucu

Tek bir Node HTTP sunucusu hem API'yi hem statik dosyaları servis eder. nginx
şimdilik devre dışı kalır; ileride önüne konabilir. Gerekçe: iki süreç yerine
bir süreç, ve oturum çerezinin aynı origin'den gelmesi.

Sunucu veritabanına RQ-0001'in kurduğu instance üzerinden bağlanır; collector
ile aynı `DATABASE_URL` biçimi kullanılır.

**Sunucu da container'da çalışır.** Collector'ınkiyle aynı desen: Debian tabanlı
Node image, compose ağına katılıp `postgres:5432`'ye bağlanır, parola
`--env-file` ile verilir. Collector'dan farkı oneshot değil uzun ömürlü
olmasıdır: ayakta kalır, port dinler, `restart: unless-stopped` ile yönetilir ve
healthcheck taşır. Yerel geliştirme için container'sız `pnpm serve` de çalışır.

## Kimlik doğrulama

- **Parola hash'i Node'un yerleşik `crypto.scrypt`'i ile üretilir.** Ek bağımlılık
  gerekmez; her kullanıcı için ayrı salt saklanır. Parola hiçbir yerde düz metin
  tutulmaz, log'a ve hata mesajına yazılmaz.
- **Oturum veritabanında tutulur.** Çerez yalnız oturum kimliğini taşır;
  `HttpOnly`, `SameSite=Lax`, üretimde `Secure`. Veritabanında tutulması oturumun
  iptal edilebilmesi içindir — parola değişince veya kullanıcı pasife alınınca
  açık oturumlar kapanır.
- Oturumun bir sona erme süresi olur ve süresi geçmiş oturum kabul edilmez.
- Başarısız giriş denemesi, kullanıcı adının var olup olmadığını sızdırmayan tek
  bir mesaj döndürür.

### Admin kullanıcısı

- Sistem ilk kez ayağa kalktığında `admin` adında, tipi `admin` olan bir
  kullanıcı otomatik oluşur.
- **Sabit varsayılan parola kullanılmaz.** Parola `ADMIN_INITIAL_PASSWORD`
  ortam değişkeninden alınır; verilmemişse rastgele üretilip sunucu log'una bir
  kez yazılır ve kullanıcı ilk girişte parolasını değiştirmeye zorlanır.
- Kullanıcı adı `admin` olması bir ayrıcalık taşımaz; yetkiyi belirleyen `type`
  alanıdır. Başka kullanıcılar da `admin` tipinde olabilir.
- Son admin'in tipi düşürülemez veya pasife alınamaz; sistem yönetici­siz kalmaz.

## Menüler

### Admin menüsü (yalnız `type = admin`)

- Takip listesini görüntüleme: fon kodu, unvan, durum, son NAV, son günlük
  getiri, son net akış.
- Kullanıcı listesi.
- Kullanıcı oluşturma ve düzenleme: kullanıcı adı, tip, aktif/pasif, parola
  belirleme.

### Portföy menüsü (tüm kullanıcılar)

Kullanıcı kendi işlemlerini girer, düzenler ve siler. Bir işlem şunları taşır:

| Alan | Açıklama |
|---|---|
| Fon kodu | Zorunlu |
| Alış tarihi | Zorunlu |
| Adet (pay) | Zorunlu. Kullanıcının verdiği listede bu alan **adet**tir, TL değil (TLY 67 adet × 9.145,58 TL doğrulandı) |
| Banka / platform | Zorunlu. Aynı fon farklı platformlarda ayrı tutulur: Fiba, Nkolay, Nkolay-B, YKB |
| Satış tarihi | Boş bırakılabilir; boşsa pozisyon açıktır |

Her kullanıcı yalnız kendi işlemlerini görür ve değiştirir. Admin başka bir
kullanıcının işlemlerini bu requirement'ta göremez.

### Girilen fon otomatik takip listesine alınır

Kullanıcının geçmişindeki fonların bir kısmı şu an takip listesinde yok
(tamamen kapanmış 10 fon: AOY, GNS, GZH, HRZ, IAE, PBR, PHE, PRY, VPS, YJH) ve
`dim_fund` yalnız 26 fon taşıyor. Portföye girilen fon otomatik olarak
`dim_fund` ve `watchlist`'e eklenir; böylece bir sonraki collector koşusu o
fonun verisini de toplamaya başlar. Fon kodu geçerliliği `/funds/` üzerinden
doğrulanır.

## Veri modeli

```text
app_user(id PK, username UNIQUE, password_hash, password_salt,
         type CHECK (type IN ('admin','user')), is_active,
         must_change_password, created_at, updated_at)

app_session(id PK, user_id FK, created_at, expires_at, revoked_at)

portfolio_transaction(id PK, user_id FK, fund_code FK -> dim_fund,
                      platform, trade_date, units,
                      sell_date NULL, note, created_at, updated_at)
```

- `units` ondalık taşır; bazı platformlar kesirli pay veriyor.
- `sell_date` NULL ise pozisyon açıktır.
- Kâr/zarar bu requirement'ta hesaplanmaz; alanlar hesabın sonraki requirement'ta
  yapılabilmesi için yeterlidir.

## Kapsam

- Node HTTP sunucusu: API uçları ve statik dosya servisi, `pnpm serve` script'i.
- `crypto.scrypt` ile parola hash'leme ve doğrulama.
- Oturum tablosu, çerez yönetimi, yetki kontrolü (admin uçları admin ister).
- Migration'lar: `app_user`, `app_session`, `portfolio_transaction`.
- İlk admin kullanıcısının otomatik oluşturulması.
- Login ekranı, admin menüsü ve portföy ekranı.
- Portföye girilen fonun `dim_fund` ve `watchlist`'e eklenmesi.
- `server/Containerfile`: Debian tabanlı Node image, uzun ömürlü servis,
  healthcheck. Compose ağına katılır; portu yalnız `127.0.0.1`'e bind edilir.
- `server/install.sh local|remote`, `collector/install.sh` ile aynı arayüz.
- `.env.example` güncellemesi: `ADMIN_INITIAL_PASSWORD`, `PORT`, `SESSION_TTL`.

## Acceptance Criteria

- [ ] Migration'lar `pnpm db:migrate` ile uygulanır; ikinci çalıştırma hiçbir
      migration uygulamaz.
- [ ] Sunucu ilk açılışta `admin` adlı, `type = admin` bir kullanıcı oluşturur;
      ikinci açılış ikinci bir admin oluşturmaz.
- [ ] Admin parolası sabit bir varsayılan değildir: `ADMIN_INITIAL_PASSWORD`
      verilmişse o kullanılır, verilmemişse rastgele üretilip bir kez log'a
      yazılır ve ilk girişte değiştirilmesi istenir.
- [ ] Parola veritabanında düz metin tutulmaz; aynı parolayı kullanan iki
      kullanıcının hash'i farklıdır (salt).
- [ ] Doğru parolayla giriş oturum çerezi verir; yanlış parola vermez ve hata
      mesajı kullanıcının var olup olmadığını sızdırmaz.
- [ ] Çerez `HttpOnly` ve `SameSite` taşır; oturum kimliği dışında veri taşımaz.
- [ ] Süresi geçmiş veya iptal edilmiş oturumla korumalı uca erişilemez.
- [ ] `type = user` olan kullanıcı admin uçlarına erişemez (403), menüde de
      görmez.
- [ ] Admin kullanıcı listeler, kullanıcı oluşturur ve düzenler; oluşturulan
      kullanıcı giriş yapabilir.
- [ ] Admin takip listesini son NAV, son günlük getiri ve son net akışla görür.
- [ ] Son admin'in tipi düşürülemez veya pasife alınamaz.
- [ ] Kullanıcı işlem ekler, düzenler, siler; satış tarihi boş bırakılan satır
      açık pozisyon olarak görünür.
- [ ] Bir kullanıcı başka kullanıcının işlemlerini göremez ve değiştiremez.
- [ ] Takip listesinde olmayan bir fon koduyla işlem girilince fon `dim_fund` ve
      `watchlist`'e eklenir; geçersiz kod reddedilir.
- [ ] Sunucu container içinde ayağa kalkar, compose ağından `postgres:5432`'ye
      bağlanır ve portu yalnız `127.0.0.1`'e bind edilir.
- [ ] Container yeniden başlatıldığında açık oturumlar geçerliliğini korur;
      oturum veritabanında tutulduğu için süreç yeniden başlaması oturum düşürmez.
- [ ] Yapılandırılmış quality gate'ler (typecheck, test, build) geçer.

## Kapsam Dışı

- Kâr/zarar hesabı, stopaj ve ücret düşülmüş net getiri, raporlama.
- Sinyal üretimi, uyarı ve öneri.
- Parola sıfırlama e-postası, çok faktörlü doğrulama, harici kimlik sağlayıcı.
- Admin'in başka kullanıcıların portföyünü görüntülemesi.
- CSV/TSV toplu işlem içe aktarma.
- Sunucunun uzak ortama deployment'ı ve TLS sonlandırma.
