import { describe, expect, it } from 'vitest';

import {
  clearCookie,
  generatePassword,
  hashPassword,
  newSessionId,
  readCookie,
  sessionCookie,
  verifyPassword,
} from '../src/server/auth.js';

describe('parola hash', () => {
  it('doğru parolayı kabul, yanlışı ret eder', async () => {
    const stored = await hashPassword('dogruparola');
    expect(await verifyPassword('dogruparola', stored)).toBe(true);
    expect(await verifyPassword('yanlisparola', stored)).toBe(false);
  });
  it('aynı parola iki kez farklı hash üretir (salt)', async () => {
    const a = await hashPassword('aynisifre1');
    const b = await hashPassword('aynisifre1');
    expect(a.hash).not.toBe(b.hash);
    expect(a.salt).not.toBe(b.salt);
  });
  it('parola düz metin olarak saklanmaz', async () => {
    const stored = await hashPassword('gizliparola');
    expect(stored.hash).not.toContain('gizliparola');
    expect(stored.hash).toMatch(/^[0-9a-f]{128}$/);
  });
  it('kısa parolayı reddeder', async () => {
    await expect(hashPassword('kisa')).rejects.toThrow(/en az 8/);
  });
  it('bozuk kayıtla çökmez', async () => {
    expect(await verifyPassword('x', { hash: 'bozuk', salt: 'abc' })).toBe(false);
    expect(await verifyPassword('x', { hash: '', salt: '' })).toBe(false);
  });
});

describe('oturum kimliği', () => {
  it('her çağrıda farklı ve URL-güvenli', () => {
    const a = newSessionId();
    const b = newSessionId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThanOrEqual(40);
  });
  it('üretilen parola hash için yeterince uzun', () => {
    expect(generatePassword().length).toBeGreaterThanOrEqual(8);
  });
});

describe('çerez', () => {
  it('HttpOnly ve SameSite taşır', () => {
    const c = sessionCookie('s', 'abc', { secure: false, maxAgeSeconds: 60 });
    expect(c).toContain('HttpOnly');
    expect(c).toContain('SameSite=Lax');
    expect(c).toContain('Max-Age=60');
    expect(c).not.toContain('Secure');
  });
  it('üretimde Secure eklenir', () => {
    expect(sessionCookie('s', 'abc', { secure: true, maxAgeSeconds: 60 })).toContain('Secure');
  });
  it('temizleme çerezi süreyi sıfırlar', () => {
    expect(clearCookie('s')).toContain('Max-Age=0');
  });
  it('başlıktan doğru çerezi okur', () => {
    expect(readCookie('a=1; tefas_session=xyz; b=2', 'tefas_session')).toBe('xyz');
    expect(readCookie('a=1', 'tefas_session')).toBeNull();
    expect(readCookie(undefined, 'tefas_session')).toBeNull();
    // Ön ek eşleşmesi olmamalı: "session" ile "tefas_session" karışmaz.
    expect(readCookie('tefas_session_old=zzz', 'tefas_session')).toBeNull();
  });
});
