---
id: RQ-0001
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-08-29T18:41:30.583Z"
branch: "factory/RQ-0001"
createdFromCommit: "2fcaef97c3eff7da8ce29cb9633eca1c69e2f73a"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/2"
githubPullRequestIid: 2
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/1"
githubIssueIid: 1
repositoryProvider: github
---
# RQ-0001 - PostgreSQL ve pgweb Podman kurulum altyapısı

Geliştirme veritabanını hem Podman kullanan yerel macOS bilgisayarda hem de
Podman kullanan uzak Linux sunucuda aynı tanım üzerinden çalıştırabilmek.
PostgreSQL kalıcı veri depolamalı, pgweb ise veritabanını salt-okunur incelemek
için kullanılmalıdır.

## Kapsam

- `db/compose.yaml`, `db/.env.example` ve `db/install.sh` oluşturulmalıdır.
- `db/.env`, örnek dosyadan üretilen çalışma zamanı yapılandırması olmalı ve
  Git'e hiçbir zaman eklenmemelidir.
- `factory.config.json` içindeki `targetProject.allowedPaths` listesine `db`
  eklenmelidir.
- Çözüm mevcut `../aifactory` veritabanından bağımsız olmalı; kendi container,
  network/proje adı ve kalıcı volume alanını kullanmalıdır.
- Eski projedeki dosyalar yalnızca davranış referansıdır. Yeni proje eski
  repository'ye, dosya yollarına veya Git geçmişine çalışma zamanı bağımlılığı
  taşımamalıdır.

## Compose Tanımı

- PostgreSQL için tam nitelikli `docker.io/library/postgres:16` image'ı
  kullanılmalıdır.
- pgweb için tam nitelikli ve sürümü sabitlenmiş
  `docker.io/sosedoff/pgweb:0.17.0` image'ı kullanılmalıdır.
- PostgreSQL UTF-8 ile başlatılmalı, named volume üzerinde kalıcı veri tutmalı
  ve `pg_isready` tabanlı healthcheck sağlamalıdır.
- pgweb PostgreSQL'e Compose servis adı üzerinden bağlanmalı ve `--readonly`
  modunda çalışmalıdır.
- Varsayılan host portları PostgreSQL için `5433`, pgweb için `8081` olmalıdır.
- Her iki port da varsayılan olarak yalnızca `127.0.0.1` adresine bind
  edilmelidir. Uzak pgweb erişimi SSH port yönlendirmesiyle yapılmalıdır.
- Servisler `restart: unless-stopped` davranışına sahip olmalıdır.
- Compose proje adı `db/.env` içindeki `COMPOSE_PROJECT_NAME` ile sabitlenmeli;
  uyumluluk için top-level `name` alanı kullanılmamalıdır.
- Normal durdurma veya yeniden kurulum named volume'u silmemelidir. Veri silen
  bir komut otomatik ya da örtük olarak çalıştırılmamalıdır.

## Ortam Yapılandırması

`db/.env.example` en az şu değişkenleri belgelemelidir:

- `COMPOSE_PROJECT_NAME`
- `TEFAS_POSTGRES_DB`
- `TEFAS_POSTGRES_USER`
- `TEFAS_POSTGRES_PASSWORD`
- `TEFAS_POSTGRES_PORT`
- `TEFAS_PGWEB_PORT`

Yerel geliştirme için açıkça işaretlenmiş varsayılan değerler kullanılabilir.
Uzak kurulum boş, örnek veya bilinen zayıf parola ile devam etmemelidir.
Parolalar loglara, komut özetlerine veya Git tarafından izlenen dosyalara
yazılmamalıdır.

## Kurulum Betiği

`db/install.sh` çalıştırıldığı dizinden bağımsız davranmalı, kendi dizinini
çözümlemeli ve aşağıdaki arayüzleri sağlamalıdır:

```text
db/install.sh local
db/install.sh remote <user@host> [-p ssh-port] [-d remote-dir] [--no-service]
db/install.sh --help
```

### Yerel macOS

`local` modu:

1. Podman'ın ve `podman compose` veya `podman-compose` komutlarından birinin
   kullanılabilir olduğunu doğrulamalıdır.
2. `db/.env` yoksa `db/.env.example` üzerinden oluşturmalı ve kullanıcıya
   hangi dosyayı düzenleyebileceğini bildirmelidir.
3. Compose servislerini detached modda başlatmalıdır.
4. PostgreSQL hazır olana kadar sınırlı süre beklemeli, SQL bağlantısını ve
   pgweb HTTP yanıtını doğrulamalıdır.
5. pgweb ve PostgreSQL bağlantı adreslerini parola göstermeden raporlamalıdır.

Betiğin yerel bölümü macOS ile gelen Bash 3.2 üzerinde çalışmalıdır. Podman
machine yaşam döngüsünü veya Podman kurulumunu yönetmemeli; eksik önkoşulları
açık hata ve çözüm ipucuyla bildirmelidir.

### Uzak Linux

`remote` modu:

1. Batch mode SSH bağlantısını ve uzak Podman/Compose önkoşullarını
   doğrulamalıdır.
2. `compose.yaml` ile yerel `db/.env` dosyasını yapılandırılabilir uzak dizine
   kopyalamalı ve uzak `.env` iznini `0600` yapmalıdır.
3. Varsayılan olarak root veya rootless çalışmayı algılayıp uygun systemd unit'i
   oluşturmalı, enable etmeli ve başlatmalıdır.
4. Rootless serviste mümkün olduğunda user lingering'i etkinleştirmeli; yetki
   yoksa durumu anlaşılır biçimde bildirmelidir.
5. `--no-service` seçeneğinde systemd oluşturmadan Compose'u doğrudan
   başlatmalıdır.
6. PostgreSQL readiness, SQL bağlantısı, pgweb HTTP yanıtı ve kurulduysa
   systemd durumunu doğrulamalıdır.
7. pgweb için örnek SSH tüneli komutunu parola göstermeden yazdırmalıdır.

Hem `local` hem `remote` modu tekrar çalıştırıldığında güvenli ve idempotent
olmalı; mevcut volume'u silmemeli ve gereksiz ikinci container/service
oluşturmamalıdır.

## Acceptance Criteria

- [ ] `db/compose.yaml`, `db/.env.example` ve çalıştırılabilir `db/install.sh`
      repository'de bulunur; gerçek `db/.env` `.gitignore` tarafından dışlanır.
- [ ] `factory.config.json` içinde `db`, izinli artifact yolu olarak tanımlıdır.
- [ ] Compose yapılandırması PostgreSQL 16 ve pgweb 0.17.0 servislerini tam
      nitelikli image adlarıyla tanımlar.
- [ ] PostgreSQL verisi named volume'da kalıcıdır ve normal stop/reinstall
      akışları volume'u silmez.
- [ ] PostgreSQL ve pgweb host portları varsayılan olarak sırasıyla
      `127.0.0.1:5433` ve `127.0.0.1:8081` ile sınırlıdır.
- [ ] pgweb veritabanına bağlanır ve salt-okunur çalışır.
- [ ] `db/install.sh local`, macOS üzerinde mevcut Podman Compose ile servisleri
      başlatır; PostgreSQL readiness, SQL sorgusu ve pgweb HTTP kontrolü başarılı
      olmadan başarı bildirmez.
- [ ] `db/install.sh remote user@host`, Linux sunucuya güvenli kopyalama yapar,
      root ve rootless systemd kurulumlarını destekler ve `--no-service`
      seçeneğini uygular.
- [ ] Uzak kurulum boş/örnek/zayıf PostgreSQL parolasıyla başlamadan hata verir.
- [ ] Script herhangi bir dizinden çağrılabilir, argümanları doğrular, eksik
      Podman/Compose/SSH önkoşullarında uygulanabilir hata mesajı verir ve gizli
      değerleri çıktılamaz.
- [ ] Kurulum iki kez çalıştırıldığında aynı servisleri günceller/yeniden
      kullanır; veri volume'u korunur ve duplicate container oluşmaz.
- [ ] `bash -n db/install.sh` başarılıdır ve macOS Bash 3.2 ile uyumsuz Bash
      özellikleri kullanılmaz.
- [ ] Desteklenen Compose komutuyla `compose config` doğrulaması başarılıdır.
- [ ] Yerel macOS ve uzak Linux smoke test sonuçları; kullanılan komutlar,
      PostgreSQL readiness/SQL sonucu, pgweb HTTP durumu ve systemd durumu
      (varsa) ile birlikte uygulama tesliminde belgelenir.

## Kapsam Dışı

- Podman veya Podman machine kurulumu/yükseltilmesi.
- PostgreSQL şema migration'ları, seed verisi ve uygulama tabloları.
- PostgreSQL veya pgweb portlarını genel ağa açmak.
- TLS, reverse proxy, DNS, güvenlik duvarı ve bulut sağlayıcı kaynakları.
- Otomatik volume silme veya veri sıfırlama komutu.
