/**
 * Postgres bağlantı havuzu. DATABASE_URL .env'den gelir; RQ-0001'in kurduğu
 * instance'ı gösterir (varsayılan yerel port 5434).
 */
import pg from 'pg';

export function makePool(connectionString: string | undefined = process.env.DATABASE_URL): pg.Pool {
  if (!connectionString) {
    throw new Error('DATABASE_URL tanımlı değil (.env source edilmeli)');
  }
  return new pg.Pool({ connectionString });
}
