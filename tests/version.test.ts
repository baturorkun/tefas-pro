import { describe, expect, it } from 'vitest';

import { deriveVersion, displayVersion, formatBuildTime } from '../src/version.js';

describe('deriveVersion', () => {
  it('requirement numarasını ve koşu sırasını sürüme çevirir', () => {
    expect(deriveVersion('RQ-0018', 1)).toBe('0.18.1');
    expect(deriveVersion('RQ-0023', 4)).toBe('0.23.4');
  });

  it('baştaki sıfırlar sürüme taşınmaz', () => {
    // "RQ-0007" 0.7.1 olmalı; 0.0007.1 sürüm numarası değil.
    expect(deriveVersion('RQ-0007', 1)).toBe('0.7.1');
  });

  it('geçersiz requirement kimliğini reddeder', () => {
    expect(() => deriveVersion('0018', 1)).toThrow(/Geçersiz/);
    expect(() => deriveVersion('RQ-abc', 1)).toThrow(/Geçersiz/);
    expect(() => deriveVersion('', 1)).toThrow(/Geçersiz/);
  });

  it('koşu sırası en az 1 olmalıdır', () => {
    expect(() => deriveVersion('RQ-0018', 0)).toThrow(/en az 1/);
    expect(() => deriveVersion('RQ-0018', 1.5)).toThrow(/en az 1/);
  });
});

describe('displayVersion', () => {
  it('commit ve zaman yoksa yalnız sürümü verir', () => {
    expect(displayVersion({}, 'RQ-0018', 1)).toBe('v0.18.1');
  });

  it('commit ve derleme zamanını ekler', () => {
    expect(
      displayVersion({ commit: '000fffb', buildTime: '2026-08-31T19:52:00Z' }, 'RQ-0023', 1),
    ).toBe('v0.23.1+000fffb+2026-08-31-22-52');
  });

  it('uzun commit SHA kısaltılır', () => {
    expect(displayVersion({ commit: '000fffbdeadbeef' }, 'RQ-0018', 1)).toBe('v0.18.1+000fffb');
  });

  it('boş değerler sürümü bozmaz', () => {
    // Ortam değişkeni tanımlı ama boş olabilir; sürüm yine de görünmeli.
    expect(displayVersion({ commit: '', buildTime: '  ' }, 'RQ-0018', 1)).toBe('v0.18.1');
  });

  it('geçersiz derleme zamanı sessizce atlanır', () => {
    expect(displayVersion({ commit: 'abc1234', buildTime: 'dün' }, 'RQ-0018', 1))
      .toBe('v0.18.1+abc1234');
  });
});

describe('formatBuildTime', () => {
  it('UTC anını Istanbul saatine çevirir', () => {
    expect(formatBuildTime('2026-08-31T19:52:00Z')).toBe('2026-08-31-22-52');
  });
  it('geçersiz tarihte null döner', () => {
    expect(formatBuildTime('yok')).toBeNull();
  });
});
