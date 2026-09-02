/**
 * Postgres bağlantı havuzu. DATABASE_URL .env'den gelir; RQ-0001'in kurduğu
 * instance'ı gösterir (varsayılan yerel port 5434).
 */
import { readFileSync } from 'node:fs';

import pg from 'pg';

/**
 * Parolayı dosyadan okur.
 *
 * Compose ortamında parola bağlantı adresine gömülmez: `podman compose config`
 * çıktısı ve süreç listesi onu açıkta gösterirdi. pgweb aynı sebeple
 * `--passfile` kullanıyor; uygulama da aynı deseni izler.
 */
function passwordFromFile(path: string): string {
  try {
    return readFileSync(path, 'utf8').trim();
  } catch (err) {
    throw new Error(
      `Parola dosyası okunamadı: ${path} (${err instanceof Error ? err.message : 'bilinmeyen hata'})`,
    );
  }
}

export function makePool(
  connectionString: string | undefined = process.env.DATABASE_URL,
  passwordFile: string | undefined = process.env['DATABASE_PASSWORD_FILE'],
): pg.Pool {
  if (!connectionString) {
    throw new Error('DATABASE_URL tanımlı değil (.env source edilmeli)');
  }
  // Adreste parola varsa o kullanılır; yoksa dosyadan gelir. İkisi de yoksa
  // bağlantı denemesi kendi hatasını verir.
  //
  // Parola adrese gömülür, ayrı alan olarak verilmez: node-postgres
  // connectionString'i ayrıştırıp sonucu config'in üzerine yazıyor, bu yüzden
  // yanında geçilen `password` sessizce eziliyor ve "client password must be a
  // string" hatası çıkıyor.
  if (passwordFile !== undefined && passwordFile !== '') {
    const url = new URL(connectionString);
    if (url.password === '') url.password = encodeURIComponent(passwordFromFile(passwordFile));
    return new pg.Pool({ connectionString: url.toString() });
  }
  return new pg.Pool({ connectionString });
}
