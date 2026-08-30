/**
 * Parola hash'leme ve oturum yönetimi.
 *
 * Parola için Node'un yerleşik scrypt'i kullanılır — ek bağımlılık gerekmez ve
 * scrypt bellek-zor bir fonksiyondur, GPU ile toplu deneme pahalıdır. Her
 * kullanıcı için ayrı salt saklanır, böylece aynı parolayı kullanan iki
 * kullanıcının hash'i farklı olur ve önceden hesaplanmış tablolar işe yaramaz.
 *
 * Bu dosya veritabanı bilmez; saf fonksiyonlar fixture'sız test edilebilir.
 */
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SALT_BYTES = 16;

export interface PasswordHash {
  hash: string;
  salt: string;
}

export async function hashPassword(password: string): Promise<PasswordHash> {
  if (password.length < 8) {
    throw new Error('Parola en az 8 karakter olmalıdır.');
  }
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return { hash: derived.toString('hex'), salt };
}

/**
 * Sabit süreli karşılaştırma: erken çıkan bir karşılaştırma, doğru baytların
 * sayısını süreden sızdırır.
 */
export async function verifyPassword(
  password: string,
  stored: PasswordHash,
): Promise<boolean> {
  let expected: Buffer;
  try {
    expected = Buffer.from(stored.hash, 'hex');
  } catch {
    return false;
  }
  if (expected.length !== KEY_LENGTH) return false;
  const derived = await scrypt(password, stored.salt, KEY_LENGTH);
  return timingSafeEqual(derived, expected);
}

/** Tahmin edilemez oturum kimliği. */
export function newSessionId(): string {
  return randomBytes(32).toString('base64url');
}

/** İlk admin parolası verilmediğinde üretilen, log'a bir kez yazılacak parola. */
export function generatePassword(): string {
  return randomBytes(12).toString('base64url');
}

export interface CookieOptions {
  secure: boolean;
  maxAgeSeconds: number;
}

/**
 * Oturum çerezi. `HttpOnly` çerezi JavaScript'ten okunamaz kılar (XSS ile
 * çalınmaz), `SameSite=Lax` başka sitenin tetiklediği isteklerde gönderilmesini
 * engeller (CSRF), `Secure` üretimde şifresiz bağlantıda gönderilmesini durdurur.
 */
export function sessionCookie(name: string, value: string, opts: CookieOptions): string {
  const parts = [
    `${name}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${opts.maxAgeSeconds}`,
  ];
  if (opts.secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearCookie(name: string): string {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/** `a=1; b=2` başlığından tek bir çerezi okur. */
export function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}
