import { describe, expect, it } from 'vitest';

import { MARKET_WINDOWS, normalizeWindow } from '../src/server/repository.js';

/**
 * Pencere durakları. Ara değer kabul edilmiyor: uydurma bir pencereyle hesap
 * yapmak, kullanıcının seçmediği bir sonucu seçmiş gibi göstermek olurdu.
 */
describe('piyasa pencereleri', () => {
  it('duraklar kısa uçta sık, uzun uçta seyrek', () => {
    // Düz aralık olsaydı 1-7 gün bandı çubuğun %4'ü olur ve 3 günü tutturmak
    // imkânsızlaşırdı.
    expect([...MARKET_WINDOWS]).toEqual([1, 2, 3, 5, 7, 15, 30, 60, 90, 180]);
    expect(MARKET_WINDOWS.includes(7)).toBe(true);
    expect(MARKET_WINDOWS.includes(30)).toBe(true);
  });

  it('durak dışı değer en yakına çekilir', () => {
    expect(normalizeWindow(7)).toBe(7);
    expect(normalizeWindow(8)).toBe(7);
    expect(normalizeWindow(20)).toBe(15);
    expect(normalizeWindow(45)).toBe(30);
    expect(normalizeWindow(46)).toBe(60);
  });

  it('sınır dışı değerler uçlara oturur', () => {
    expect(normalizeWindow(0)).toBe(1);
    expect(normalizeWindow(-5)).toBe(1);
    expect(normalizeWindow(9999)).toBe(180);
    // Sayı olmayan girdi ilk durağa düşer, çökmez.
    expect(normalizeWindow(Number.NaN)).toBe(1);
  });
});
