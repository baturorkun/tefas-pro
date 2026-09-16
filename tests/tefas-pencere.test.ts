import { describe, expect, it } from 'vitest';

import { AZAMI_ISTEK_GUN, gunEkle, tarihParcalari } from '../src/collect-tefas.js';

describe('tarihParcalari', () => {
  it('sınır içindeki aralığı tek parça bırakır', () => {
    expect(tarihParcalari('2026-09-08', '2026-09-16')).toEqual([['2026-09-08', '2026-09-16']]);
  });

  it('uzun aralığı azami güne göre bitişik parçalara böler', () => {
    // 60 gün, azami 28: 28 + 28 + 4. Parçalar bitişik, örtüşmez, boşluk yok.
    const p = tarihParcalari('2026-07-01', '2026-08-29', 28);
    expect(p).toEqual([
      ['2026-07-01', '2026-07-28'],
      ['2026-07-29', '2026-08-25'],
      ['2026-08-26', '2026-08-29'],
    ]);
    for (let i = 1; i < p.length; i++) {
      expect(gunEkle(p[i - 1]![1], 1)).toBe(p[i]![0]);
    }
  });

  it('hiçbir parça azami günü aşmaz', () => {
    for (const [b, e] of tarihParcalari('2025-01-01', '2026-09-16')) {
      const gun = (Date.parse(e) - Date.parse(b)) / 86400000 + 1;
      expect(gun).toBeLessThanOrEqual(AZAMI_ISTEK_GUN);
    }
  });

  it('tek gün tek parçadır', () => {
    expect(tarihParcalari('2026-09-16', '2026-09-16')).toEqual([['2026-09-16', '2026-09-16']]);
  });

  it('kaynak kütüphanenin sınırını kullanır', () => {
    // pytefas MAX_DAYS_PER_REQUEST = 28; daha uzun aralıklar reddediliyor.
    expect(AZAMI_ISTEK_GUN).toBe(28);
  });
});

describe('gunEkle', () => {
  it('ay ve yıl sınırını geçer', () => {
    expect(gunEkle('2026-08-29', 3)).toBe('2026-09-01');
    expect(gunEkle('2026-01-01', -1)).toBe('2025-12-31');
  });
});
