import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  deriveVersion, displayVersion, formatBuildTime, highestRequirement, readBuiltRequirement,
} from '../src/version.js';

describe('deriveVersion', () => {
  it('requirement numarasını sürüme çevirir', () => {
    expect(deriveVersion('RQ-0018')).toBe('0.18');
    expect(deriveVersion('RQ-0033')).toBe('0.33');
  });

  it('baştaki sıfırlar sürüme taşınmaz', () => {
    // "RQ-0007" 0.7 olmalı; 0.0007 sürüm numarası değil.
    expect(deriveVersion('RQ-0007')).toBe('0.7');
  });

  it('geçersiz requirement kimliğini reddeder', () => {
    expect(() => deriveVersion('0018')).toThrow(/Geçersiz/);
    expect(() => deriveVersion('RQ-abc')).toThrow(/Geçersiz/);
    expect(() => deriveVersion('')).toThrow(/Geçersiz/);
  });
});

describe('highestRequirement', () => {
  const klasor = (adlar: string[]): string => {
    const d = mkdtempSync(join(tmpdir(), 'rq-'));
    for (const a of adlar) writeFileSync(join(d, a), '');
    return d;
  };

  it('en yüksek numarayı bulur, dosya sırasına bakmaz', () => {
    // Alfabetik sıra yanıltıcı: RQ-0009 listede RQ-0010'dan sonra gelir.
    expect(highestRequirement(klasor(['RQ-0009-a.md', 'RQ-0010-b.md', 'RQ-0002-c.md']))).toBe(10);
  });

  it('numarasız dosyaları yok sayar', () => {
    expect(highestRequirement(klasor(['README.md', 'RQ-0005-x.md', 'notlar.txt']))).toBe(5);
  });

  it('klasör yoksa null döner', () => {
    // Sürümün görünmemesi uygulamayı durdurmamalı.
    expect(highestRequirement(join(tmpdir(), 'boyle-bir-klasor-yok-12345'))).toBeNull();
  });

  it('boş klasörde null döner', () => {
    expect(highestRequirement(klasor([]))).toBeNull();
  });

  it('projenin kendi klasörünü okur', () => {
    // Asıl güvence: numara elle değil buradan geliyor.
    const n = highestRequirement(new URL('../requirements', import.meta.url).pathname);
    expect(n).toBeGreaterThanOrEqual(33);
  });
});

describe('sürüm numarasının kaynağı', () => {
  it('ortam değişkeni klasör taramasının önüne geçer', async () => {
    // Container build'i klasörü göremiyor; değer dışarıdan veriliyor.
    const betik = readFileSync(new URL('../scripts/write-version.ts', import.meta.url), 'utf8');
    expect(betik).toContain("process.env['APP_REQUIREMENT']");
    expect(betik).toContain('highestRequirement(join(root');
  });
});

describe('readBuiltRequirement', () => {
  const dosya = (icerik: string): string => {
    const d = mkdtempSync(join(tmpdir(), 'ver-'));
    mkdirSync(d, { recursive: true });
    const f = join(d, 'version.json');
    writeFileSync(f, icerik);
    return f;
  };

  it('derlemenin yazdığı numarayı okur', () => {
    expect(readBuiltRequirement(dosya('{"requirement":33}'))).toBe(33);
  });

  it('dosya yoksa null döner', () => {
    expect(readBuiltRequirement(join(tmpdir(), 'yok-12345.json'))).toBeNull();
  });

  it('bozuk içerik uygulamayı düşürmez', () => {
    expect(readBuiltRequirement(dosya('{bozuk'))).toBeNull();
    expect(readBuiltRequirement(dosya('{"requirement":"otuz"}'))).toBeNull();
    expect(readBuiltRequirement(dosya('{"requirement":0}'))).toBeNull();
    expect(readBuiltRequirement(dosya('null'))).toBeNull();
  });
});

describe('displayVersion', () => {
  it('commit ve zaman yoksa yalnız sürümü verir', () => {
    expect(displayVersion({}, 18)).toBe('v0.18');
  });

  it('commit ve derleme zamanını ekler', () => {
    expect(
      displayVersion({ commit: '000fffb', buildTime: '2026-08-31T19:52:00Z' }, 33),
    ).toBe('v0.33+000fffb+2026-08-31-22-52');
  });

  it('uzun commit SHA kısaltılır', () => {
    expect(displayVersion({ commit: '000fffbdeadbeef' }, 18)).toBe('v0.18+000fffb');
  });

  it('boş değerler sürümü bozmaz', () => {
    // Ortam değişkeni tanımlı ama boş olabilir; sürüm yine de görünmeli.
    expect(displayVersion({ commit: '', buildTime: '  ' }, 18)).toBe('v0.18');
  });

  it('geçersiz derleme zamanı sessizce atlanır', () => {
    expect(displayVersion({ commit: 'abc1234', buildTime: 'dün' }, 18)).toBe('v0.18+abc1234');
  });

  it('numara okunamazsa yalnız ana sürüm görünür', () => {
    // Sürüm gösterilememesi ekranı bozmamalı.
    expect(displayVersion({ commit: 'abc1234' }, null)).toBe('v0+abc1234');
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
