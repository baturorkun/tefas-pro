import { describe, expect, it } from 'vitest';

import { buildAllocation, type PositionSlice } from '../src/server/repository.js';

const dilim = (
  fundCode: string, platform: string, umbrellaType: string | null,
  cost: number, value: number,
): PositionSlice => ({
  fundCode, platform, umbrellaType, cost: cost.toFixed(2), value: value.toFixed(2),
});

describe('buildAllocation', () => {
  it('ağırlık para üzerinden ölçülür, fon sayısı üzerinden değil', () => {
    // Ölçülen veriden alınmış desen: on fon hisse senedinde ama para orada
    // değil. Fon saymak dağılımı ters gösterirdi.
    const slices = [
      ...Array.from({ length: 10 }, (_, i) => dilim(`H${String(i)}`, 'Fiba', 'Hisse', 60, 70)),
      dilim('TP2', 'Fiba', 'Para Piyasası', 1200, 1230),
    ];
    const { byCategory } = buildAllocation(slices);
    const hisse = byCategory.find((g) => g.key === 'Hisse');
    const para = byCategory.find((g) => g.key === 'Para Piyasası');

    expect(hisse?.funds).toBe(10);
    expect(para?.funds).toBe(1);
    // 700 / 1930 = %36,3 — on fon olmasına rağmen tek fonun gerisinde.
    expect(Number(hisse?.weightPct)).toBeCloseTo(36.2694, 3);
    expect(Number(para?.weightPct)).toBeCloseTo(63.7306, 3);
    expect(Number(para?.weightPct)).toBeGreaterThan(Number(hisse?.weightPct));
  });

  it('ağırlıkların toplamı yüzdür', () => {
    const slices = [
      dilim('AAA', 'Fiba', 'Hisse', 100, 130),
      dilim('BBB', 'Nkolay', 'Serbest', 200, 190),
      dilim('CCC', 'Nkolay', 'Karma', 50, 77),
    ];
    const { byBank, byCategory } = buildAllocation(slices);
    for (const gruplar of [byBank, byCategory]) {
      const toplam = gruplar.reduce((a, g) => a + Number(g.weightPct), 0);
      expect(toplam).toBeCloseTo(100, 6);
    }
  });

  it('gruplar ağırlığa göre büyükten küçüğe sıralanır', () => {
    const slices = [
      dilim('AAA', 'Kucuk', 'X', 10, 10),
      dilim('BBB', 'Buyuk', 'Y', 100, 100),
      dilim('CCC', 'Orta', 'Z', 50, 50),
    ];
    expect(buildAllocation(slices).byBank.map((g) => g.key)).toEqual(['Buyuk', 'Orta', 'Kucuk']);
  });

  it('kategorisi bilinmeyen fon kendi grubunda toplanır', () => {
    // Sessizce düşürülseydi ağırlıkların toplamı yüzü tutmaz ve eksik olduğu
    // hiçbir yerden anlaşılmazdı.
    const slices = [
      dilim('AAA', 'Fiba', null, 100, 120),
      dilim('BBB', 'Fiba', 'Hisse', 100, 80),
    ];
    const { byCategory, total } = buildAllocation(slices);
    expect(byCategory.map((g) => g.key)).toContain('Bilinmiyor');
    expect(Number(total.value)).toBe(200);
    expect(byCategory.reduce((a, g) => a + Number(g.value), 0)).toBe(200);
  });

  it('aynı fon iki bankada tutulursa ikisinde de sayılır', () => {
    // Fon bazında toplayan bir görünüm bu kırılımı veremezdi.
    const slices = [
      dilim('AAA', 'Fiba', 'Hisse', 100, 110),
      dilim('AAA', 'Nkolay', 'Hisse', 300, 330),
    ];
    const { byBank, byCategory, total } = buildAllocation(slices);
    expect(byBank.map((g) => g.key).sort()).toEqual(['Fiba', 'Nkolay']);
    expect(byBank.every((g) => g.funds === 1)).toBe(true);
    // Kategori tarafında tek fon: farklı bacaklar aynı fonu iki kez saymamalı.
    expect(byCategory[0]?.funds).toBe(1);
    expect(byCategory[0]?.lots).toBe(2);
    expect(total.funds).toBe(1);
    expect(total.lots).toBe(2);
  });

  it('kâr zarar değer ile maliyetin farkıdır', () => {
    const slices = [
      dilim('AAA', 'Fiba', 'Hisse', 1000, 1250),
      dilim('BBB', 'Fiba', 'Hisse', 500, 400),
    ];
    const { byBank, total } = buildAllocation(slices);
    expect(byBank[0]?.gain).toBe('150.00');
    expect(total.gain).toBe('150.00');
  });

  it('boş portföyde sıfır döner, bölme hatası vermez', () => {
    const bos = buildAllocation([]);
    expect(bos.total).toEqual({ funds: 0, lots: 0, cost: '0.00', value: '0.00', gain: '0.00' });
    expect(bos.byBank).toEqual([]);
    expect(bos.byCategory).toEqual([]);
  });

  it('değeri sıfır olan portföyde ağırlık sıfır olur', () => {
    const { byBank } = buildAllocation([dilim('AAA', 'Fiba', 'Hisse', 100, 0)]);
    expect(byBank[0]?.weightPct).toBe('0.0000');
  });
});
