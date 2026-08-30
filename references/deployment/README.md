# Deployment

Deploy CI üzerinden yapılır; sunucuya elle SSH ile kurulum gerekmez.

## Slot ve port

`scripts/resolve-deployment-target.sh` branch adından slot ve port üretir:

| Branch | Slot | Port | Container | Veritabanı |
|---|---|---|---|---|
| `main` | `main` | 9100 | `tefas-pro-main` | `tefas` |
| `factory/RQ-0007` | `rq-7` | 9107 | `tefas-pro-rq-7` | `tefas_rq_7` |

Taban port **9100**'dür ve yalnız bu script'te tanımlıdır. 9000-9099 aynı
sunucuda NetForgeSH'e ait; o aralık kullanılamaz.

## Akış

1. `main` veya `factory/RQ-*` branch'ine push.
2. **quality** işi (`ubuntu-latest`): typecheck, test, build. Düşerse deploy koşmaz.
3. **deploy** işi (`self-hosted`): slot çözümlenir, image build edilir, slot
   veritabanı hazırlanır, migration koşar, container değiştirilir, sağlık
   kontrolü yapılır.
4. Branch silinince **cleanup** işi container'ı, image'ı ve slot veritabanını
   kaldırır. `main` slot'u hiçbir koşulda silinmez.

Elle çalıştırmak için Actions sekmesinden `workflow_dispatch`; `cleanup`
işlemi RQ numarasını girdi olarak alır.

## Slot veritabanı

İlk deploy'da `main`'in veritabanından `pg_dump` ile kopyalanır. `CREATE
DATABASE ... TEMPLATE` kullanılmaz: main veritabanına açık bağlantı varken
PostgreSQL bunu reddeder ve main sunucusu sürekli bağlıdır.

Var olan slot veritabanı **yeniden tohumlanmaz** — aksi halde slot üzerinde
yapılan denemeler her deploy'da silinirdi. Migration her deploy'da slot
veritabanında koşar, böylece migration taşıyan bir RQ merge edilmeden
doğrulanabilir.

## Ön koşullar

**Self-hosted runner.** Deploy işi sunucunun üzerinde koşar; aksi halde
GitHub'a sunucuya root erişimi veren bir SSH anahtarı bırakmak gerekirdi.
Runner `baturorkun/tefas-pro` için kayıtlı olmalı ve `self-hosted, Linux, X64`
etiketlerini taşımalıdır.

**Veritabanı yığını.** `tefas-pro-postgres` ayakta ve compose ağı kurulu
olmalıdır (`db/install.sh remote`).

**Repository secret:**

| Ad | Neden |
|---|---|
| `ADMIN_INITIAL_PASSWORD` | İlk admin kullanıcısının parolası |

PostgreSQL parolası **secret olarak tutulmaz**: runner sunucunun üzerinde
koştuğu için `/opt/tefas-pro/db/.env` dosyasından okunur ve GitHub'a hiç
çıkmaz. Yol `TEFAS_DB_ENV_FILE` repository variable'ı ile değiştirilebilir.

**Repository variable (isteğe bağlı):**

| Ad | Varsayılan |
|---|---|
| `TEFAS_NETWORK` | `tefas-pro-db_default` |
| `TEFAS_DB_ENV_FILE` | `/opt/tefas-pro/db/.env` |

## Kapsam dışı

- **Collector CI'da deploy edilmez ve zamanlanmaz.** Kurulumu
  `collector/install.sh remote` ile ayrı yapılır. Her slot kendi gecelik
  collector'ını koşsaydı fintables trafiği açık RQ sayısıyla çarpılırdı.
- **TLS yok.** Slot portu dışa açıktır ve panel parolası şifresiz gider.
  Reverse proxy ve TLS ayrı bir requirement'tır.
