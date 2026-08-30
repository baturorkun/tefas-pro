import { describe, expect, it } from 'vitest';

import { monthsBack, parseArgs, todayIso } from '../src/collector.js';
import { parseWatchlistFile } from '../src/db/seed.js';

describe('tarih yardımcıları', () => {
  it('todayIso yerel takvim gününü verir', () => {
    expect(todayIso(new Date(2026, 7, 30, 1, 30))).toBe('2026-08-30');
  });
  it('monthsBack ay ve yıl sınırını geçer', () => {
    expect(monthsBack('2026-08-30', 6)).toBe('2026-02-28');
    expect(monthsBack('2026-01-15', 1)).toBe('2025-12-15');
  });
  it('hedef ayda o gün yoksa ayın son gününe kırpar', () => {
    expect(monthsBack('2028-03-31', 1)).toBe('2028-02-29'); // artık yıl
    expect(monthsBack('2027-03-31', 1)).toBe('2027-02-28');
  });
});

describe('parseArgs', () => {
  it('varsayılan 6 ay, tüm liste, yield dahil', () => {
    expect(parseArgs([])).toEqual({ months: 6, funds: undefined, skipYield: false });
  });
  it('bayrakları okur', () => {
    expect(parseArgs(['--months', '12', '--funds', 'AAA,BBB', '--skip-yield'])).toEqual({
      months: 12, funds: ['AAA', 'BBB'], skipYield: true,
    });
  });
});

describe('parseWatchlistFile', () => {
  it('durum verilmezse watching', () => {
    expect(parseWatchlistFile('AAA\nBBB owned\n')).toEqual([
      { code: 'AAA', status: 'watching' },
      { code: 'BBB', status: 'owned' },
    ]);
  });
  it('yorum ve boş satırları atlar', () => {
    expect(parseWatchlistFile('# not\n\n  \nCCC owned\n')).toEqual([
      { code: 'CCC', status: 'owned' },
    ]);
  });
  it('kodu büyük harfe çevirir', () => {
    expect(parseWatchlistFile('ddd')[0]?.code).toBe('DDD');
  });
  it('geçersiz durumda patlar', () => {
    expect(() => parseWatchlistFile('AAA sahip')).toThrow(/geçersiz durum/);
  });
});
