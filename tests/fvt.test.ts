import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  CHART_SYMBOL_LIMIT, chunkSymbols, parseChartData, parseDistribution,
} from '../src/sources/fvt.js';

const fixture = (ad: string): unknown =>
  JSON.parse(readFileSync(new URL(`fixtures/${ad}.json`, import.meta.url), 'utf8'));

describe('parseDistribution', () => {
  const d = parseDistribution(fixture('fvt-KHA-distribution'));

  it('hisse kodu, ağırlık ve şirket adını okur', () => {
    const ilk = d.holdings[0];
    expect(ilk?.stockCode).toBe('PEKGY');
    expect(ilk?.weightPct).toBe(6.52);
    expect(ilk?.company).toContain('Peker');
    expect(ilk?.sector).not.toBeNull();
  });

  it('önceki ay ağırlığını ve farkı okur', () => {
    // Kaynak veriyor; kendimiz türetmiyoruz çünkü geçmiş açıklamaların hepsi
    // elimizde olmayabilir.
    const ilk = d.holdings[0];
    expect(ilk?.prevWeightPct).toBe(6.9);
    expect(ilk?.weightChange).toBe(-0.38);
  });

  it('açıklama tarihini gün olarak alır', () => {
    // ISO damgası saat dilimi taşımıyor; saatiyle saklamak yanlış bir
    // kesinlik olurdu.
    expect(d.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(d.asOfDate).toBe('2026-09-02');
  });

  it('kodu ya da ağırlığı olmayan kalemi atlar', () => {
    const r = parseDistribution({ data: { items: [
      { hisseKodu: 'ASELS', agirlik: '5' },
      { hisseKodu: '', agirlik: '3' },
      { hisseKodu: 'THYAO' },
    ], meta: {} } });
    expect(r.holdings.map((x) => x.stockCode)).toEqual(['ASELS']);
  });

  it('data null gelince boş döner, hata atmaz', () => {
    // Ölçüldü: holdings-history ucu hep null dönüyor. Veri yok demek, hata değil.
    expect(parseDistribution({ success: true, data: null }).holdings).toEqual([]);
    expect(parseDistribution(null).asOfDate).toBeNull();
  });
});

describe('parseChartData', () => {
  const c = parseChartData(fixture('fvt-chart-data'));

  it('sembol başına günlük kapanışları düz listeye açar', () => {
    expect(c.length).toBeGreaterThan(4);
    expect(new Set(c.map((x) => x.stockCode))).toEqual(new Set(['ASELS', 'AKBNK']));
    expect(c[0]?.tradeDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(c[0]?.close).toBeGreaterThan(0);
  });

  it('getiri kaynaktan alınmaz, kapanış saklanır', () => {
    // Kaynağın `y` alanı temettü düzeltmeli görünüyor (ASELS %9,97 derken ham
    // fiyat farkı %9,75). Hangi tanımı kullandığımızı bilmek istiyoruz.
    expect(Object.keys(c[0] ?? {})).toEqual(['stockCode', 'tradeDate', 'close']);
  });

  it('aynı sembol ve tarih iki kez gelirse tekilleşir', () => {
    // Ölçüldü: 69 istekten 7'si çift kayıt taşıdı ve veritabanı tek ifadede
    // aynı satıra iki kez dokunmayı reddediyor. Son değer kazanır.
    const r = parseChartData({ data: [{ symbol: 'X', data: [
      { x: '2026-09-01', close: 10 }, { x: '2026-09-01', close: 11 },
    ] }] });
    expect(r).toEqual([{ stockCode: 'X', tradeDate: '2026-09-01', close: 11 }]);
  });

  it('kapanışı sıfır olan günü atar', () => {
    // Fiyat sıfır olmuyor; sıfır veri değil boşluk.
    const r = parseChartData({ data: [{ symbol: 'X', data: [
      { x: '2026-09-01', close: 0 }, { x: '2026-09-02', close: 10 },
    ] }] });
    expect(r).toEqual([{ stockCode: 'X', tradeDate: '2026-09-02', close: 10 }]);
  });
});

describe('chunkSymbols', () => {
  it('ucun sınırına göre böler', () => {
    // Ölçüldü: 60 sembol gönderildi, 10 döndü.
    expect(CHART_SYMBOL_LIMIT).toBe(10);
    const s = Array.from({ length: 23 }, (_, i) => `S${String(i)}`);
    const g = chunkSymbols(s);
    expect(g.map((x) => x.length)).toEqual([10, 10, 3]);
    expect(g.flat()).toEqual(s);
  });

  it('boş listede boş döner', () => {
    expect(chunkSymbols([])).toEqual([]);
  });
});
