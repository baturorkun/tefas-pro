import { describe, expect, it } from 'vitest';

import { netAkis } from '../src/collect-tefas.js';

/**
 * Fintables'ın geçmişte yazdığı gerçek `net_flow` değerleri. Formülün
 * Fintables'ınkiyle aynı olduğu 405 gözlemde ölçüldü; aşağıdakiler o
 * kümeden alınmış, veritabanındaki ham satırlar.
 */
const gecmis = [
  { fon: 'TLY', oncekiPay: 29214243, pay: 26825517, fiyat: 9293.933893, beklenen: -22200661532.49 },
  { fon: 'PRY', oncekiPay: 31031097495, pay: 26062004656, fiyat: 3.229241, beklenen: -16046398328.51 },
  { fon: 'PRY', oncekiPay: 34738611279, pay: 31031097495, fiyat: 3.224920, beklenen: -11956435352.30 },
  { fon: 'THF', oncekiPay: 37982428782, pay: 41495550512, fiyat: 2.912217, beklenen: 10230972825.18 },
];

describe('netAkis', () => {
  it.each(gecmis)(
    '$fon: Fintablesın yazdığı rakamı üretir',
    ({ oncekiPay, pay, fiyat, beklenen }) => {
      // Kuruş düzeyinde tutması yeterli: tutar milyarlarca TL.
      expect(netAkis(pay, oncekiPay, fiyat)).toBeCloseTo(beklenen, 1);
    },
  );

  it('para girişini pozitif, çıkışını negatif verir', () => {
    expect(netAkis(120, 100, 2)).toBe(40);
    expect(netAkis(80, 100, 2)).toBe(-40);
  });

  it('pay adedi değişmemişse sıfır', () => {
    expect(netAkis(100, 100, 7.5)).toBe(0);
  });

  it('önceki pay adedi yoksa değer üretmez', () => {
    // Uydurma sıfır yazmak, gerçekten sıfır akış olan günden ayırt edilemez.
    expect(netAkis(100, null, 2)).toBeUndefined();
    expect(netAkis(100, undefined, 2)).toBeUndefined();
  });

  it('bugünün pay adedi yoksa değer üretmez', () => {
    expect(netAkis(undefined, 100, 2)).toBeUndefined();
  });
});
