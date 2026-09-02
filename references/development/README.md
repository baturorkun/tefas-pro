# Geliştirme ortamı

İki yol var. İkisi de aynı veritabanını kullanır.

## Container (önerilen)

Uygulama, veritabanı ve pgweb tek komutla kalkar; uygulama dağıtımdaki Node
imajının aynısında koşar ve kod değişikliği anında yansır.

```bash
pnpm dev
```

- Uygulama: http://127.0.0.1:8282  (`TEFAS_APP_PORT` ile değiştirilir)
- pgweb:     http://127.0.0.1:8081
- Log:       `pnpm dev:logs`
- Durdurma:  `pnpm dev:stop`

Kaynak host'tan bağlanır: `src/`, `public/`, `tests/`, `db/migrations/` ve
tsconfig dosyaları. Kaydettiğin an sunucu yeniden başlar ve `dist/main.js`
yeniden üretilir. Tarayıcıyı elle yenilemek gerekir; sayfanın kendiliğinden
yenilenmesi ayrı bir mekanizma ister ve kurulmadı.

Bağımlılık eklediğinde (`package.json` değiştiğinde) imaj yeniden kurulmalı:

```bash
pnpm dev:rebuild
```

### İki macOS ayrıntısı

**`node_modules` bağlanmaz.** Host'taki paketler macOS/arm64 için derlenmiş;
Linux container'da çalışmazlar. Bağımlılıklar imajın içinden gelir, bu yüzden
yukarıdaki `--build` gerekir.

**Dosya olayları poll edilir.** Podman burada `applehv` sanal makinesinde
koşuyor ve host'tan VM'e giden bağlamalarda `inotify` olayları güvenilir
iletilmiyor: dosya kaydedilir, izleyici fark etmez. `CHOKIDAR_USEPOLLING` ve
`TSC_WATCHFILE` bu yüzden ayarlı.

## Host üzerinde

Veritabanı yine container'da olmalı:

```bash
podman compose --env-file db/.env -f db/compose.yaml up -d postgres pgweb
```

Sonra iki seçenek var:

```bash
source .env && pnpm serve         # tek seferlik
source .env && pnpm serve:watch   # canlı yenilenen
```

`pnpm serve` tek seferliktir: `pnpm build` bir kez koşar, sunucu kaynağı
başlangıçta okur. Kod değiştirdiğinde ne `dist/main.js` yenilenir ne de sunucu
yeni kodu görür — durdurup yeniden başlatmak gerekir. Hızlı bir kontrol için
uygundur.

`pnpm serve:watch` container'daki davranışın host karşılığıdır: `tsc --watch`
`dist/main.js`'i üretir, `tsx watch` sunucuyu yeniden başlatır. Ctrl+C ikisini
birden düşürür.

Aynı portu ikisi birden kullanamaz: container ayaktayken `pnpm serve`
"address already in use" verir.
