---
id: RQ-0005
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-08-30T17:24:26.479Z"
branch: "factory/RQ-0005"
createdFromCommit: "d171dd4dffbd43cfb9599386ef453577e77de959"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/10"
githubPullRequestIid: 10
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/9"
githubIssueIid: 9
repositoryProvider: github
---
# RQ-0005 - CI üzerinden branch bazlı deployment

Deployment elle SSH ile değil, GitHub Actions üzerinden yapılacak. Desen
`baturorkun/NetForgeSH` projesindeki ile aynı: `main` sabit bir slot'a,
her requirement branch'i kendi portundaki ayrı bir slot'a açılır.

Böylece bir RQ'nun çıktısı merge edilmeden çalışır halde görülebilir ve branch
silinince ortamı da kendiliğinden kaybolur.

## Slot ve port şeması

Taban port **9100**'dür.

| Branch | Slot | Port |
|---|---|---|
| `main` | `main` | 9100 |
| `factory/RQ-0007` | `rq-7` | 9107 |
| `factory/RQ-0012` | `rq-12` | 9112 |

Branch adı büyük/küçük harf duyarsız eşlenir ve `rq-<sayı>` kalıbını herhangi
bir yerinde taşıyabilir; baştaki sıfırlar sekizlik sayı olarak yorumlanmaz.

9000-9099 aralığı aynı sunucuda NetForgeSH'e ait (`netforgesh-main` 9000,
`netforgesh-rq-22` 9022); 9100 tabanı o aralıkla çakışmaz. Taban tek bir yerde
tanımlanır ve testle sabitlenir.

## Deploy edilen parçalar

Deploy iki şeye dokunur: slot veritabanı ve uygulama sunucusu.

| Parça | Slot başına |
|---|---|
| PostgreSQL | Ortak instance, **slot başına ayrı veritabanı** |
| Uygulama sunucusu | Ayrı container, 9100 + rq portunda |

**Collector CI'ın kapsamında değildir.** Ne `main` ne de RQ slot'ları için
deploy edilir veya zamanlanır; kurulumu `collector/install.sh remote` ile ayrı
yapılır. Bunun bir yan faydası var: her açık slot kendi gecelik collector'ını
koşsaydı fintables'a giden trafik açık RQ sayısıyla çarpılırdı ve RQ-0001'de
ölçülen ban riski gerçek.

Slot'lar veri toplamaz; `main`'in veritabanından kopyalanmış bir anlık görüntü
üzerinde çalışır.

### Slot veritabanı main'den tohumlanır

NetForgeSH branch slot'unun SQLite dosyasını `main`'inkinden kopyalıyor.
PostgreSQL karşılığı `CREATE DATABASE tefas_rq7 TEMPLATE tefas_main`'dir: hızlı,
atomik ve `main` verisini değiştirmez. Slot veritabanı zaten varsa yeniden
tohumlanmaz, aksi halde slot üzerinde yapılan denemeler her deploy'da silinirdi.

Şema göçü slot veritabanında deploy sırasında koşar; böylece migration taşıyan
bir RQ merge edilmeden doğrulanabilir.

## Sırlar ve yapılandırma

- `ADMIN_INITIAL_PASSWORD` ve veritabanı parolası repository secret'ından gelir;
  workflow dosyasında ve log'da düz metin görünmez.
- Her slot kendi env dosyasını `0600` izinle alır.
- Slot portu yalnız `127.0.0.1`'e yayınlanmaz — NetForgeSH deseninde port dışa
  açıktır. **Bu bilinçli bir karardır ve TLS olmadan parola şifresiz gider.**
  Requirement bunu değiştirmez ama riski görünür kılar; TLS ve reverse proxy
  ayrı bir requirement'tır.

## Temizlik

- Branch silinince (`delete` tetikleyicisi) o slot'un container'ı ve veritabanı
  kaldırılır.
- `workflow_dispatch` ile elle `deploy` veya `cleanup` çalıştırılabilir; cleanup
  RQ numarasını girdi olarak alır.
- `main` slot'u hiçbir koşulda silinmez.

## Kapsam

- `scripts/resolve-deployment-target.sh`: branch adından slot ve port üretir,
  geçersiz branch adında sıfır dışı çıkar.
- `.github/workflows/` altında deploy ve cleanup işleri; kalite işleri
  `ubuntu-latest`, deploy işi `self-hosted` üzerinde koşar.
- Deploy: image build, slot veritabanını hazırlama, migration, container
  değiştirme, sağlık kontrolü.
- Aynı branch için üst üste gelen çalışmaların birbirini iptal etmesi
  (`concurrency`).

Deploy işi `self-hosted, Linux, X64` etiketli runner üzerinde koşar. Runner
`baturorkun/tefas-pro` için kayıtlı ve çalışır durumdadır (`ns2`).

## Acceptance Criteria

- [ ] `scripts/resolve-deployment-target.sh main` taban portu üretir;
      `factory/RQ-0007` `rq-7` ve taban+7 üretir.
- [ ] Baştaki sıfırlar sekizlik yorumlanmaz: `rq-0010` slot `rq-10` verir.
- [ ] Branch adı `rq-<sayı>` taşımıyorsa script sıfır dışı kodla çıkar ve
      deploy denenmez.
- [ ] Port tabanı 9100'dür, tek bir yerde tanımlıdır ve NetForgeSH'in kullandığı
      9000-9099 aralığıyla çakışmaz.
- [ ] Script'in eşleme davranışı CI'da testle doğrulanır.
- [ ] `main`'e push deploy'u tetikler; kalite işleri düşerse deploy koşmaz.
- [ ] Requirement branch'ine push kendi slot'unu ayağa kaldırır ve slot portu
      HTTP 200 döner.
- [ ] Slot veritabanı ilk deploy'da `main`'den tohumlanır; ikinci deploy
      tohumlamayı tekrarlamaz ve slot üzerindeki veriyi korumaz değiştirmez.
- [ ] Migration slot veritabanında koşar; migration taşıyan bir branch merge
      edilmeden doğrulanabilir.
- [ ] Deploy hiçbir slot için collector deploy etmez veya zamanlamaz; hiçbir
      slot fintables'a istek atmaz.
- [ ] Parolalar secret'tan gelir; workflow çıktısında ve container komut
      satırında görünmez.
- [ ] Branch silinince slot container'ı ve veritabanı kaldırılır; `main`
      slot'una dokunulmaz.
- [ ] `workflow_dispatch` ile elle cleanup çalıştırılabilir.
- [ ] Aynı deploy iki kez koşarsa ikinci koşu duplicate container bırakmaz.
- [ ] Yapılandırılmış quality gate'ler (typecheck, test, build) geçer.

## Kapsam Dışı

- TLS sonlandırma, reverse proxy ve alan adı.
- Slot portlarını güvenlik duvarıyla kısıtlama.
- Registry'ye image yayınlama; image runner üzerinde build edilir.
- Veritabanı yedekleme ve geri yükleme.
- Slot sayısını sınırlama veya otomatik yaşlandırma.
- Collector'ın deploy'u ve zamanlanması; `collector/install.sh remote` ile ayrı
  yapılır.
- Depoda duran ve bu platformda hiç çalışmayan `.gitlab-ci.yml`.
