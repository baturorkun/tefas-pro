import { describe, expect, it } from 'vitest';

import { asRecord, matchPath, optDate, reqDate, reqNumber, reqString } from '../src/server/http.js';

describe('matchPath', () => {
  it('parametreyi yakalar', () => {
    expect(matchPath('/api/transactions/:id', '/api/transactions/42')).toBe('42');
  });
  it('uzunluk uymazsa eşleşmez', () => {
    expect(matchPath('/api/transactions/:id', '/api/transactions')).toBeNull();
    expect(matchPath('/api/transactions/:id', '/api/transactions/42/extra')).toBeNull();
  });
  it('sabit parça uymazsa eşleşmez', () => {
    expect(matchPath('/api/transactions/:id', '/api/users/42')).toBeNull();
  });
  // Yalnız `:id` tanınırsa `:code` sabit metin sayılır ve rota hiç eşleşmez.
  it(':id dışındaki parametre adlarını da yakalar', () => {
    expect(matchPath('/api/watchlist/:code', '/api/watchlist/THF')).toBe('THF');
  });
});

describe('gövde doğrulama', () => {
  it('nesne olmayanı reddeder', () => {
    expect(() => asRecord([])).toThrow(/nesne/);
    expect(() => asRecord(null)).toThrow(/nesne/);
    expect(() => asRecord('x')).toThrow(/nesne/);
  });
  it('boş metni zorunlu alanda reddeder', () => {
    expect(() => reqString({ a: '   ' }, 'a')).toThrow(/zorunlu/);
    expect(reqString({ a: '  x ' }, 'a')).toBe('x');
  });
  it('sayıyı metinden de okur', () => {
    expect(reqNumber({ n: '12.5' }, 'n')).toBe(12.5);
    expect(() => reqNumber({ n: 'abc' }, 'n')).toThrow(/sayı/);
  });
  it('tarihi biçim üzerinden doğrular, Date kullanmaz', () => {
    expect(reqDate({ d: '2026-08-30' }, 'd')).toBe('2026-08-30');
    expect(() => reqDate({ d: '30.08.2026' }, 'd')).toThrow(/YYYY-MM-DD/);
    expect(optDate({ d: '' }, 'd')).toBeNull();
    expect(optDate({}, 'd')).toBeNull();
  });
});

describe('ensureAdminUser parola dogrulamasi', () => {
  // Sunucu ayağa kalkarken parolayı ADMIN_INITIAL_PASSWORD'den alır. Geçersiz
  // bir değer sessizce rastgele parolaya düşerse kimsenin giremediği bir hesap
  // oluşur; gerçek bir deploy'da tam olarak bu oldu (secret yanlışlıkla tek
  // karakter yazılmıştı) ve log doğru parolanın kullanıldığını söyledi.
  const decide = (fromEnv: string | undefined): 'reject' | 'use-env' | 'generate' => {
    if (fromEnv !== undefined && fromEnv !== '' && fromEnv.length < 8) return 'reject';
    return fromEnv && fromEnv.length >= 8 ? 'use-env' : 'generate';
  };
  it('kısa parola reddedilir, sessizce atlanmaz', () => {
    expect(decide('-')).toBe('reject');
    expect(decide('kisa')).toBe('reject');
  });
  it('yeterli parola kullanılır', () => {
    expect(decide('mysecret11')).toBe('use-env');
  });
  it('verilmemişse üretilir', () => {
    expect(decide(undefined)).toBe('generate');
    expect(decide('')).toBe('generate');
  });
});
