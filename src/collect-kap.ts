/**
 * KAP'tan hisse kırılımı toplaması.
 *
 * fvt'nin yerini alır: aynı veri, ama kaynağın kendisinden. fvt veri merkezi
 * IP'lerini engellediği için sunucuda koşamıyordu; KAP'ta öyle bir kısıt yok,
 * bu yüzden bu koşum zamanlanmış olarak sunucuda çalışır.
 *
 * Her gün koşar ama her gün veri yazmaz: fonlar portföyünü aylık (`AB`) ya da
 * haftalık (`HB`) bildiriyor ve her fon farklı günde yayımlıyor. Zaten
 * kayıtlı bir dönem tekrar indirilmez.
 *
 * Bir fonun raporu okunamazsa koşum düşmez. Dört fon taranmış görüntü PDF'i
 * gönderiyor (IDO, NLE, NSP, ST1) ve metin içermiyor; bunlar kalıcı olarak
 * atlanacak, koşumun tamamını başarısız saymak yanlış olur.
 */
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import pg from 'pg';

import { parseKalemler } from './sources/kap-parse.js';
import {
  bildirimEkleri, ekIndir, fonListesi, portfoyBildirimleri, type KapBildirim,
} from './sources/kap.js';

const calistir = promisify(execFile);

export const KAP_SOURCE = 'kap-scheduled';

/** İstekler arası bekleme: KAP'ı yormayalım, engel yemeyelim. */
const THROTTLE_MS = Number(process.env['KAP_THROTTLE_MS'] ?? '') || 1500;

const bekle = (ms: number): Promise<void> =>
  new Promise((c) => setTimeout(c, ms));

/**
 * PDF'ten sütun hizası korunmuş metin.
 *
 * `pdftotext -layout` poppler-utils'ten gelir ve container'a eklenmiştir
 * (bkz. collector/Containerfile). Hizalama şart: ağırlık satırın SON
 * sütununda ve hizalama bozulursa sütunlar birbirine karışır.
 */
export async function pdfMetni(pdf: Buffer): Promise<string> {
  const dizin = await mkdtemp(join(tmpdir(), 'kap-'));
  const yol = join(dizin, 'r.pdf');
  try {
    await writeFile(yol, pdf);
    const { stdout } = await calistir('pdftotext', ['-layout', yol, '-'], {
      maxBuffer: 64 * 1024 * 1024,
      encoding: 'utf8',
    });
    return stdout;
  } finally {
    await rm(dizin, { recursive: true, force: true });
  }
}

/** Bildirimin dönemi: aylıkta "2026-08", haftalıkta "2026-H35". */
export function donemAnahtari(b: KapBildirim): string {
  const yil = b.year ?? Number(b.publishDate.slice(0, 4));
  const n = b.donem ?? 0;
  return b.period === 'HB'
    ? `${String(yil)}-H${String(n)}`
    : `${String(yil)}-${String(n).padStart(2, '0')}`;
}

/**
 * Bildirimin ekleri sırayla denenir.
 *
 * Bazı fonlar raporu ikiye bölüyor: ilk ek devam sayfaları (satışlar,
 * alışlar), portföy tablosu ikincisinde. Ölçüldü: IAE, IVY. İlk eke
 * sabitlenmek o fonları kaybettiriyordu.
 */
async function kalemleriBul(
  disclosureIndex: number,
): Promise<{ code: string; weightPct: number }[]> {
  const ekler = await bildirimEkleri(disclosureIndex);
  for (const ek of ekler) {
    if (!ek.fileName.toLowerCase().endsWith('.pdf')) continue;
    await bekle(THROTTLE_MS);
    const kalemler = parseKalemler(await pdfMetni(await ekIndir(ek.objId)));
    if (kalemler.length > 0) return kalemler;
  }
  return [];
}

async function main(): Promise<void> {
  const url = process.env['DATABASE_URL'];
  if (url === undefined || url === '') {
    console.error('DATABASE_URL tanımlı değil.');
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: url });

  try {
    const secili = process.argv.slice(2).filter((a) => !a.startsWith('-'));
    const codes = secili.length > 0
      ? secili.map((c) => c.toUpperCase())
      : (await pool.query<{ fund_code: string }>(
          'SELECT fund_code FROM analytics.tracked_fund ORDER BY fund_code',
        )).rows.map((r) => r.fund_code);
    if (codes.length === 0) {
      console.log('Toplanacak fon yok.');
      return;
    }

    const runId = (await pool.query<{ id: number }>(
      `INSERT INTO ingest_run (source, status) VALUES ($1, 'running') RETURNING id`,
      [KAP_SOURCE],
    )).rows[0]!.id;
    console.log(`kap toplaması: ${String(codes.length)} fon (run ${String(runId)})`);

    const oidler = new Map((await fonListesi()).map((f) => [f.fundCode, f.fundOid]));
    const hatalar: string[] = [];
    let yazilan = 0;
    let atlanan = 0;

    for (const kod of codes) {
      const oid = oidler.get(kod);
      if (oid === undefined) {
        hatalar.push(`${kod}: KAP'ta bulunamadı`);
        console.log(`  ✗ ${kod}: KAP'ta yok`);
        continue;
      }
      try {
        await bekle(THROTTLE_MS);
        const bildirimler = await portfoyBildirimleri(oid, 120);
        const son = bildirimler[0];
        if (son === undefined) {
          console.log(`  · ${kod}: bildirim yok`);
          continue;
        }
        const donem = donemAnahtari(son);
        // Aynı dönem zaten yazılmışsa PDF'i indirmeye gerek yok.
        const var_ = await pool.query(
          `SELECT 1 FROM fund_stock_holding
            WHERE fund_code = $1 AND as_of_date = $2::date LIMIT 1`,
          [kod, son.publishDate],
        );
        if ((var_.rowCount ?? 0) > 0) {
          atlanan++;
          console.log(`  · ${kod}: ${donem} zaten var`);
          continue;
        }
        await bekle(THROTTLE_MS);
        const kalemler = await kalemleriBul(son.disclosureIndex);
        if (kalemler.length === 0) {
          hatalar.push(`${kod}: rapor okunamadı (${donem})`);
          console.log(`  ✗ ${kod}: rapor okunamadı`);
          continue;
        }
        const r = await pool.query(
          // KAP hisse adı ve sektörü yayımlamıyor; ikisi de daha önce
          // toplanmış satırlardan taşınır. Aksi hâlde aynı ekranda bazı
          // hisseler adıyla, bazıları kodla görünürdü.
          `INSERT INTO fund_stock_holding
             (fund_code, as_of_date, stock_code, company, sector, weight_pct,
              ingest_run_id)
           SELECT $1, $2::date, x.stock_code, b.company, b.sector, x.weight_pct, $4
             FROM jsonb_to_recordset($3::jsonb)
                  AS x(stock_code text, weight_pct numeric)
             LEFT JOIN LATERAL (
               SELECT company, sector FROM fund_stock_holding p
                WHERE p.stock_code = x.stock_code
                  AND (p.company IS NOT NULL OR p.sector IS NOT NULL)
                ORDER BY p.as_of_date DESC LIMIT 1
             ) b ON true
           ON CONFLICT (fund_code, as_of_date, stock_code) DO UPDATE SET
             weight_pct = EXCLUDED.weight_pct,
             company = COALESCE(EXCLUDED.company, fund_stock_holding.company),
             sector = COALESCE(EXCLUDED.sector, fund_stock_holding.sector),
             ingest_run_id = EXCLUDED.ingest_run_id, updated_at = now()
            WHERE fund_stock_holding.weight_pct IS DISTINCT FROM EXCLUDED.weight_pct`,
          [kod, son.publishDate,
            JSON.stringify(kalemler.map((k) => ({
              stock_code: k.code, weight_pct: k.weightPct,
            }))), runId],
        );
        yazilan += r.rowCount ?? 0;
        console.log(`  ✓ ${kod}: ${String(kalemler.length)} kalem (${donem})`);
      } catch (err) {
        hatalar.push(`${kod}: ${String(err)}`);
        console.log(`  ✗ ${kod}: ${String(err)}`);
      }
    }

    // Kısmi başarı koşumu düşürmez: bir fonun raporu okunamıyor diye
    // diğerlerinin yazdığı veri geçersiz olmuyor.
    const durum = hatalar.length === 0 ? 'passed' : 'partial';
    await pool.query(
      `UPDATE ingest_run SET status = $2, finished_at = now(), rows_upserted = $3,
              funds_ok = $4, funds_failed = $5, last_error = $6 WHERE id = $1`,
      [runId, durum, yazilan, codes.length - hatalar.length, hatalar.length,
        hatalar.length === 0 ? null : hatalar.join('\n')],
    );
    console.log(
      `\nBitti: ${String(yazilan)} satır, ${String(atlanan)} fon güncel, ` +
      `${String(hatalar.length)} hata`,
    );
  } finally {
    await pool.end();
  }
}

if (process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
