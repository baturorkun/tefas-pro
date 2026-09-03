import { describe, expect, it } from 'vitest';

import { buildPeriodReturns, type PortfolioDailyRow } from '../src/server/repository.js';

/**
 * Bir ayın işlem günlerini üretir. Değer her gün `oran` kadar büyür, böylece
 * kazanç ve getiri elle de doğrulanabilir kalır.
 */
function ay(prefix: string, gunler: readonly number[], baslangic = 100000): PortfolioDailyRow[] {
  let deger = baslangic;
  return gunler.map((gun) => {
    const onceki = deger;
    deger = onceki * 1.01;
    return {
      date: `${prefix}-${String(gun).padStart(2, '0')}`,
      value: deger.toFixed(2),
      dailyGain: (deger - onceki).toFixed(2),
      prevValue: onceki.toFixed(2),
    };
  });
}

describe('buildPeriodReturns', () => {
  it('ayın kazancı haftalarının tam toplamıdır', () => {
    const [agustos] = buildPeriodReturns(ay('2026-08', [3, 4, 5, 6, 7, 10, 11, 12]));
    const haftaToplami = (agustos?.weeks ?? []).reduce((a, w) => a + Number(w.gain), 0);

    // Ay ayrı bir formülle hesaplanmıyor; ikisi de günlük kazançların toplamı.
    expect(Number(agustos?.gain)).toBeCloseTo(haftaToplami, 2);
  });

  it('ayın getirisi haftalarının bileşiğidir, toplamı değil', () => {
    const [agustos] = buildPeriodReturns(ay('2026-08', [3, 4, 5, 6, 7, 10, 11]));
    const weeks = agustos?.weeks ?? [];
    const bilesik = weeks.reduce((a, w) => a * (1 + Number(w.pct) / 100), 1);
    const toplam = weeks.reduce((a, w) => a + Number(w.pct), 0);

    // Bileşik burada haftaların yayımlanmış (4 haneye yuvarlanmış) yüzdelerinden
    // yeniden kuruluyor; eşitlik o yuvarlamanın bıraktığı payla aranır.
    expect(Number(agustos?.pct)).toBeCloseTo((bilesik - 1) * 100, 3);
    // Günde %1'den yedi gün, 5+2 bölünüyor. Ayın bileşiği %7,2135; haftaların
    // yüzdeleri toplansaydı %7,1110 çıkardı. Aradaki fark test edilebilir
    // büyüklükte, yani bu test yüzde toplamayı gerçekten yakalar.
    expect(Number(agustos?.pct)).toBeCloseTo(7.2135, 3);
    expect(toplam).toBeCloseTo(7.111, 3);
    expect(toplam).toBeLessThan(Number(agustos?.pct));
  });

  it('hafta blokları beşerlidir', () => {
    const [agustos] = buildPeriodReturns(ay('2026-08', [3, 4, 5, 6, 7, 10, 11, 12]));
    expect((agustos?.weeks ?? []).map((w) => w.days)).toEqual([5, 3]);
  });

  it('artan günler son haftaya eklenir, ilkine değil', () => {
    // 22 işlem günü: 5+5+5+7. Artan yedi gün başa konsaydı ayın ilk haftası
    // tek güne düşer, gerçek ilk hafta iki satıra bölünürdü.
    const gunler = Array.from({ length: 22 }, (_, i) => i + 1);
    const [agustos] = buildPeriodReturns(ay('2026-08', gunler));
    expect((agustos?.weeks ?? []).map((w) => w.days)).toEqual([5, 5, 5, 7]);
  });

  it('bir ay dörtten fazla hafta satırı üretmez', () => {
    const gunler = Array.from({ length: 31 }, (_, i) => i + 1);
    const [agustos] = buildPeriodReturns(ay('2026-08', gunler));
    expect(agustos?.weeks).toHaveLength(4);
  });

  it('aylar en yeniden en eskiye sıralanır', () => {
    const rows = [...ay('2026-07', [1, 2]), ...ay('2026-08', [3, 4]), ...ay('2026-09', [1, 2])];
    expect(buildPeriodReturns(rows).map((m) => m.month)).toEqual(['2026-09', '2026-08', '2026-07']);
  });

  it('ayın haftaları kendi içinde artan sırada kalır', () => {
    const gunler = Array.from({ length: 12 }, (_, i) => i + 1);
    const [agustos] = buildPeriodReturns(ay('2026-08', gunler));
    expect((agustos?.weeks ?? []).map((w) => w.label)).toEqual(['1. Hafta', '2. Hafta', '3. Hafta']);
  });

  it('ay adı Türkçe ve yılıyla birlikte yazılır', () => {
    const rows = [...ay('2026-03', [2]), ...ay('2026-12', [1])];
    expect(buildPeriodReturns(rows).map((m) => m.label)).toEqual(['Aralık 2026', 'Mart 2026']);
  });

  it('dönem sınırları ilk ve son işlem günüdür', () => {
    const [agustos] = buildPeriodReturns(ay('2026-08', [3, 4, 5, 6, 7, 10]));
    expect(agustos?.startDate).toBe('2026-08-03');
    expect(agustos?.endDate).toBe('2026-08-10');
    expect(agustos?.weeks[1]?.startDate).toBe('2026-08-10');
  });

  it('getirisi ölçülemeyen gün kazanca da bileşiğe de girmez', () => {
    // İlk gün: portföyün açıldığı gün, önceki değer yok. Görünen kazanç yalnız
    // ikinci günden gelmeli.
    const rows: PortfolioDailyRow[] = [
      { date: '2026-08-03', value: '100000', dailyGain: null, prevValue: null },
      { date: '2026-08-04', value: '101000', dailyGain: '1000', prevValue: '100000' },
    ];
    const [agustos] = buildPeriodReturns(rows);
    expect(agustos?.gain).toBe('1000.00');
    expect(agustos?.pct).toBe('1.0000');
  });

  it('açılış değeri sıfır olan gün sonsuz getiri üretmez', () => {
    // Portföy tamamen kapanıp yeniden açıldığında önceki değer sıfır olabilir;
    // bölme yapılsaydı getiri Infinity çıkardı.
    const rows: PortfolioDailyRow[] = [
      { date: '2026-08-03', value: '5000', dailyGain: '12', prevValue: '0' },
      { date: '2026-08-04', value: '5050', dailyGain: '50', prevValue: '5000' },
    ];
    const [agustos] = buildPeriodReturns(rows);
    expect(agustos?.gain).toBe('62.00');
    expect(Number(agustos?.pct)).toBeCloseTo(1, 6);
  });

  it('hiç getiri günü yoksa yüzde null döner', () => {
    const rows: PortfolioDailyRow[] = [
      { date: '2026-08-03', value: '100000', dailyGain: null, prevValue: null },
    ];
    expect(buildPeriodReturns(rows)[0]?.pct).toBeNull();
  });

  it('boş girdi boş liste döner', () => {
    expect(buildPeriodReturns([])).toEqual([]);
  });

  it('günler karışık gelse de sıralanır', () => {
    const sirali = ay('2026-08', [3, 4, 5, 6, 7, 10, 11]);
    const karisik = [sirali[4], sirali[0], sirali[6], sirali[2], sirali[1], sirali[5], sirali[3]]
      .filter((r): r is PortfolioDailyRow => r !== undefined);
    expect(buildPeriodReturns(karisik)[0]?.weeks.map((w) => w.days))
      .toEqual(buildPeriodReturns(sirali)[0]?.weeks.map((w) => w.days));
    expect(buildPeriodReturns(karisik)[0]?.startDate).toBe('2026-08-03');
  });

  it('sermaye girişi olan haftada TL ve yüzde işaret olarak ayrışabilir', () => {
    // Ölçülen veriden: 22–30 Haziran 2026. TL toplamı -42,30 iken bileşik getiri
    // +%0,0006. Çelişki değil — TL o günkü portföy büyüklüğüyle ağırlıklı, yüzde
    // her günün kendi açılışına göre. 26 Haziran'da portföye para girmiş, sonraki
    // günlerin lirası daha ağır basıyor. İkisini tek işarete zorlamak birini
    // bozardı.
    const gunluk: PortfolioDailyRow[] = [
      { date: '2026-06-22', value: '1876031', dailyGain: '-1700.76', prevValue: '1932473' },
      { date: '2026-06-23', value: '1948651', dailyGain: '21877.86', prevValue: '1876031' },
      { date: '2026-06-24', value: '1931616', dailyGain: '-17034.69', prevValue: '1948651' },
      { date: '2026-06-25', value: '1921883', dailyGain: '-9733.93', prevValue: '1931616' },
      { date: '2026-06-26', value: '2039636', dailyGain: '-2535.37', prevValue: '1921883' },
      { date: '2026-06-29', value: '2037786', dailyGain: '-1849.72', prevValue: '2039636' },
      { date: '2026-06-30', value: '2048721', dailyGain: '10934.31', prevValue: '2037786' },
    ];
    const [haziran] = buildPeriodReturns(gunluk);
    expect(haziran?.gain).toBe('-42.30');
    expect(Number(haziran?.pct)).toBeGreaterThan(0);
    expect(Number(haziran?.pct)).toBeCloseTo(0.0006, 4);
  });

  it('benchmark portföyün ölçülebildiği günler üzerinden zincirlenir', () => {
    const gunler = ay('2026-08', [3, 4, 5]);
    // Benchmark serisi portföyün olmadığı bir günü de taşıyor: o gün sayılmamalı,
    // yoksa benchmark paranın hiç girmediği bir dönemin kazancıyla öne geçerdi.
    const bench = new Map([
      ['2026-08-03', 0.5], ['2026-08-04', 0.5], ['2026-08-05', 0.5],
      ['2026-08-06', 90],
    ]);
    const [agustos] = buildPeriodReturns(gunler, bench);
    // 1,005^3 - 1 = %1,5075 — 06 Ağustos'un %90'ı hesaba girmiyor.
    expect(Number(agustos?.benchPct)).toBeCloseTo(1.5075, 3);
  });

  it('fark portföy ile benchmark arasındaki puan farkıdır', () => {
    const bench = new Map([['2026-08-03', 0.4], ['2026-08-04', 0.4]]);
    const [agustos] = buildPeriodReturns(ay('2026-08', [3, 4]), bench);
    // Portföy günde %1: 1,01^2-1 = %2,01. Benchmark 1,004^2-1 = %0,8016.
    expect(Number(agustos?.pct)).toBeCloseTo(2.01, 3);
    expect(Number(agustos?.benchPct)).toBeCloseTo(0.8016, 3);
    expect(Number(agustos?.diff)).toBeCloseTo(2.01 - 0.8016, 3);
  });

  it('ayın benchmark getirisi haftalarının bileşiğidir', () => {
    const gunler = Array.from({ length: 12 }, (_, i) => i + 1);
    const bench = new Map(
      gunler.map((g) => [`2026-08-${String(g).padStart(2, '0')}`, 0.3] as const),
    );
    const [agustos] = buildPeriodReturns(ay('2026-08', gunler), bench);
    const bilesik = (agustos?.weeks ?? [])
      .reduce((a, w) => a * (1 + Number(w.benchPct) / 100), 1);
    expect(Number(agustos?.benchPct)).toBeCloseTo((bilesik - 1) * 100, 3);
  });

  it('benchmark verisi yoksa yüzde ve fark null döner', () => {
    const [agustos] = buildPeriodReturns(ay('2026-08', [3, 4]));
    expect(agustos?.benchPct).toBeNull();
    expect(agustos?.diff).toBeNull();
    // Portföyün kendi getirisi etkilenmez.
    expect(agustos?.pct).not.toBeNull();
  });

  it('portföyün ölçülemediği gün benchmark\'a da sayılmaz', () => {
    const rows: PortfolioDailyRow[] = [
      { date: '2026-08-03', value: '100000', dailyGain: null, prevValue: null },
      { date: '2026-08-04', value: '101000', dailyGain: '1000', prevValue: '100000' },
    ];
    // İlk gün portföyün referans günü: kendi kazancı döneme ait değil.
    const bench = new Map([['2026-08-03', 50], ['2026-08-04', 0.5]]);
    const [agustos] = buildPeriodReturns(rows, bench);
    expect(Number(agustos?.benchPct)).toBeCloseTo(0.5, 6);
  });

  it('portföyün kapalı olduğu ay hiç satır üretmez', () => {
    // Temmuz ile Eylül arası boş: portfolio_daily o günler için satır vermez.
    const rows = [...ay('2026-07', [1, 2]), ...ay('2026-09', [1, 2])];
    expect(buildPeriodReturns(rows).map((m) => m.month)).toEqual(['2026-09', '2026-07']);
  });
});
