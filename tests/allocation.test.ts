import { describe, expect, it } from 'vitest';

import {
  buildAllocation, buildAssetAllocation,
  type AssetWeight, type PositionSlice,
} from '../src/server/repository.js';

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

describe('buildAssetAllocation', () => {
  const d = (fundCode: string, platform: string, value: number): PositionSlice => ({
    fundCode, platform, umbrellaType: null, cost: (value * 0.9).toFixed(2), value: value.toFixed(2),
  });
  const agirlik = (fundCode: string, assetClass: string, weightPct: string): AssetWeight =>
    ({ fundCode, assetClass, weightPct });

  it('fonu ağırlıklarına göre sınıflara böler', () => {
    // "Hisse fonu" diye alınan fonun tamamı hisse değil; ancak bölerek görünür.
    const a = buildAssetAllocation(
      [d('THF', 'Nkolay', 1000)],
      [agirlik('THF', 'Hisse Senedi', '88.23'), agirlik('THF', 'Ters-Repo', '11.77')],
    );
    expect(a.groups.map((g) => [g.key, g.value])).toEqual([
      ['Hisse Senedi', '882.30'],
      ['Ters-Repo', '117.70'],
    ]);
    expect(a.groups.map((g) => g.weightPct)).toEqual(['88.2300', '11.7700']);
  });

  it('aynı fonun farklı bankalardaki değerlerini toplar', () => {
    // Ağırlık fona ait, pozisyona değil.
    const a = buildAssetAllocation(
      [d('THF', 'Nkolay', 600), d('THF', 'Fiba', 400)],
      [agirlik('THF', 'Hisse Senedi', '100')],
    );
    expect(a.groups[0]?.value).toBe('1000.00');
    expect(a.groups[0]?.funds).toBe(1);
  });

  it('değere göre sıralar, fon sayısına göre değil', () => {
    // On küçük fon bir sınıfta olabilir ama para başka yerdedir.
    const a = buildAssetAllocation(
      [d('A', 'X', 100), d('B', 'X', 100), d('C', 'X', 5000)],
      [agirlik('A', 'Tahvil', '100'), agirlik('B', 'Tahvil', '100'),
       agirlik('C', 'Hisse Senedi', '100')],
    );
    expect(a.groups[0]?.key).toBe('Hisse Senedi');
    expect(a.groups[1]?.funds).toBe(2);
  });

  it('kırılımı bilinmeyen fon sessizce düşmez', () => {
    // Sessizce atlansaydı yüzdeler doğru görünür ama portföyün bir kısmı
    // hiçbir yerde sayılmazdı.
    const a = buildAssetAllocation(
      [d('THF', 'Nkolay', 1000), d('YOK', 'Nkolay', 400)],
      [agirlik('THF', 'Hisse Senedi', '100')],
    );
    expect(a.unknownValue).toBe('400.00');
    expect(a.unknownFunds).toEqual(['YOK']);
    expect(a.classified).toBe('1000.00');
  });

  it('yüzdeler sınıflandırılan toplam üzerinden, %100 eder', () => {
    // Ölçülen veride üç fonun ağırlıkları yuvarlama yüzünden 100'ü aşıyor.
    // Portföy değerine bölseydi sütun %100,45 diye toplanır, hata sanılırdı.
    const a = buildAssetAllocation(
      [d('IJC', 'Nkolay', 1000)],
      [agirlik('IJC', 'Hisse Senedi', '60.45'), agirlik('IJC', 'Tahvil', '40')],
    );
    const toplam = a.groups.reduce((t, g) => t + Number(g.weightPct), 0);
    expect(toplam).toBeCloseTo(100, 6);
    // Ölçekleme yok: TL değerleri ham ağırlıkla hesaplanır.
    expect(a.classified).toBe('1004.50');
  });

  it('ağırlığı olmayan portföyde boş döner, çökmez', () => {
    const a = buildAssetAllocation([], []);
    expect(a.groups).toEqual([]);
    expect(a.classified).toBe('0.00');
    expect(a.unknownValue).toBe('0.00');
  });
});
