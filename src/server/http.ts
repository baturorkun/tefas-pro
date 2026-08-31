/**
 * HTTP yardımcıları: gövde okuma, JSON yanıt, yol eşleştirme.
 * Ağdan bağımsız kısımlar burada ve fixture'sız test edilebilir.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

/** Gövde sınırı: kimlik doğrulaması yapılmamış isteğin belleği tüketmesini engeller. */
const MAX_BODY_BYTES = 64 * 1024;

export async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    size += buf.length;
    if (size > MAX_BODY_BYTES) throw new Error('Gövde çok büyük.');
    chunks.push(buf);
  }
  if (size === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf-8')) as unknown;
}

export function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(payload);
}

/**
 * `/api/transactions/:id` gibi tek parametreli yolları eşler.
 * Dönen değer eşleşmezse null, eşleşirse yakalanan parça.
 */
export function matchPath(pattern: string, path: string): string | null {
  const p = pattern.split('/');
  const a = path.split('/');
  if (p.length !== a.length) return null;
  let captured: string | null = null;
  for (let i = 0; i < p.length; i += 1) {
    // `:` ile başlayan her segment yakalanır. Yalnız `:id` tanınsaydı
    // `/api/watchlist/:code` sessizce eşleşmez, istek 404 dönerdi.
    if (p[i]?.startsWith(':') === true) {
      captured = a[i] ?? '';
      continue;
    }
    if (p[i] !== a[i]) return null;
  }
  return captured;
}

export function asRecord(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('JSON nesnesi bekleniyordu.');
  }
  return raw as Record<string, unknown>;
}

export function reqString(body: Record<string, unknown>, key: string): string {
  const v = body[key];
  if (typeof v !== 'string' || v.trim() === '') {
    throw new Error(`\`${key}\` alanı zorunludur.`);
  }
  return v.trim();
}

export function optString(body: Record<string, unknown>, key: string): string | null {
  const v = body[key];
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'string') throw new Error(`\`${key}\` metin olmalıdır.`);
  return v.trim();
}

export function reqNumber(body: Record<string, unknown>, key: string): number {
  const v = body[key];
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new Error(`\`${key}\` sayı olmalıdır.`);
  }
  return n;
}

/** YYYY-MM-DD; Date'e çevirmeden doğrular ki saat dilimi tarihi kaydırmasın. */
export function reqDate(body: Record<string, unknown>, key: string): string {
  const v = reqString(body, key);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error(`\`${key}\` YYYY-MM-DD olmalıdır.`);
  return v;
}

export function optDate(body: Record<string, unknown>, key: string): string | null {
  const v = optString(body, key);
  if (v === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error(`\`${key}\` YYYY-MM-DD olmalıdır.`);
  return v;
}
