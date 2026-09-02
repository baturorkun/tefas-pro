import { describe, expect, it } from 'vitest';

import { buildPerformanceSeries, type PortfolioDailyRow } from '../src/server/repository.js';

/**
 * Ölçülen veriden alınmış bir kesit: 3 Ağustos'ta 262.272 TL yatırılmış.
 * Ham değer o gün 3.012.667'den 3.274.939'a çıkıyor — %8,59 sıçrama — ama
 * organik kazanç yalnız 9.817 TL, yani %0,33.
 */
const sermayeGirisi: PortfolioDailyRow[] = [
  { date: '2026-07-31', value: '3012667', dailyGain: '4200', prevValue: '3008467' },
  { date: '2026-08-03', value: '3274939', dailyGain: '9817', prevValue: '3012667' },
  { date: '2026-08-04', value: '3279730', dailyGain: '4792', prevValue: '3274939' },
];

describe('buildPerformanceSeries', () => {
  it('sermaye girişi olan günde çizgi sıçramaz', () => {
    const { points } = buildPerformanceSeries(sermayeGirisi);
    const [ilk, giris] = points;

    // Ham değer 3.012.667 → 3.274.939 (+%8,59). Çizgi yalnız organik kazancı
    // ekler: 3.012.667 + 9.817 = 3.022.484.
    expect(ilk?.value).toBe('3012667.00');
    expect(giris?.value).toBe('3022484.00');
    expect(Number(giris?.value)).toBeLessThan(3_100_000);
  });

  it('bar sermaye hareketini değil organik getiriyi gösterir', () => {
    const { points } = buildPerformanceSeries(sermayeGirisi);
    // 9817 / 3012667 = %0,3259 — ham hesaptaki %8,59 değil.
    expect(points[1]?.dailyPct).toBe('0.3259');
  });

  it('çizgi kümülatif organik kazancı taşır', () => {
    const { points } = buildPerformanceSeries(sermayeGirisi);
    // 3.012.667 + 9.817 + 4.792
    expect(points[2]?.value).toBe('3027276.00');
  });

  it('pencerenin ilk gününde bar çizilmez', () => {
    const { points } = buildPerformanceSeries(sermayeGirisi);
    // İlk günün kazancı pencereden önceki güne ait; barı çizilirse pencere
    // kaydırıldığında aynı gün farklı yükseklikte görünürdü.
    expect(points[0]?.dailyPct).toBeNull();
  });

  it('dönem getirisi baştan sona organik değişimdir', () => {
    const { totalPct } = buildPerformanceSeries(sermayeGirisi);
    // (3.027.276 − 3.012.667) / 3.012.667 = %0,4849
    expect(totalPct).toBe('0.4849');
  });

  it('çıkış olan günde kayıp sayılmaz', () => {
    // Ham değer düşer (satış), organik kazanç pozitif kalır.
    const { points } = buildPerformanceSeries([
      { date: '2026-08-05', value: '3305090', dailyGain: '25360', prevValue: '3279730' },
      { date: '2026-08-06', value: '3143609', dailyGain: '11830', prevValue: '3305090' },
    ]);
    expect(Number(points[1]?.value)).toBeGreaterThan(Number(points[0]?.value));
    expect(points[1]?.dailyPct).toBe('0.3579');
  });

  it('boş seri çökmez', () => {
    expect(buildPerformanceSeries([])).toEqual({ points: [], totalPct: null });
  });

  it('tek günlük seri toplam getiri üretmez', () => {
    const { points, totalPct } = buildPerformanceSeries([
      { date: '2026-09-01', value: '3521119', dailyGain: '5536', prevValue: '3515583' },
    ]);
    expect(points).toHaveLength(1);
    expect(totalPct).toBe('0.0000');
  });

  it('sıfır önceki değerde yüzde hesaplamaz', () => {
    const { points } = buildPerformanceSeries([
      { date: '2026-03-12', value: '100000', dailyGain: null, prevValue: null },
      { date: '2026-03-13', value: '101000', dailyGain: '1000', prevValue: '0' },
    ]);
    expect(points[1]?.dailyPct).toBeNull();
  });
});
