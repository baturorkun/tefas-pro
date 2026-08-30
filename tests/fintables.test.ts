import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  parseCashflow,
  parseFundUniverse,
  parseInfo,
  parsePrice,
  parseVolatility,
  parseYield,
} from '../src/sources/fintables.js';

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf-8'));

describe('parsePrice', () => {
  const p = parsePrice(fixture('fintables-TLY-price.json'));
  it('gerçek birim fiyatı ve tarihini verir', () => {
    expect(p.price).toBeCloseTo(9145.58081, 5);
    expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(p.prevPrice).toBeCloseTo(9140.087628, 5);
  });
  it('price null gelemez', () => {
    expect(() => parsePrice({ day: '2026-08-28', price: null, prev_price: 1, market_cap: 1 })).toThrow(
      /null gelemez/,
    );
  });
  it('alan yanıtta hiç yoksa patlar', () => {
    expect(() => parsePrice({ day: '2026-08-28', price: 1, prev_price: 1 })).toThrow(
      /market_cap.*yok/,
    );
  });
});

describe('parseVolatility', () => {
  const v = parseVolatility(fixture('fintables-TLY-volatility.json'));
  it('oranı yüzdeye çevirir', () => {
    expect(v.length).toBeGreaterThan(0);
    const raw = fixture('fintables-TLY-volatility.json') as { daily_return: number }[];
    expect(v[0]?.returnPct).toBeCloseTo(raw[0]!.daily_return * 100, 10);
  });
  it('tarihleri kaynaktaki gibi bırakır, yerel saate göre kırpmaz', () => {
    const gelecek = parseVolatility([{ x: '2099-01-01', daily_return: 0.01 }]);
    expect(gelecek).toEqual([{ date: '2099-01-01', returnPct: 1 }]);
  });
  it('dizi değilse patlar', () => {
    expect(() => parseVolatility({ results: [] })).toThrow(/dizi/);
  });
});

describe('parseCashflow', () => {
  const c = parseCashflow(fixture('fintables-TLY-cashflow.json'));
  it('{time, value} → {date, netFlow}', () => {
    expect(c.length).toBeGreaterThan(0);
    expect(c[0]?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof c[0]?.netFlow).toBe('number');
  });
  it('results yoksa patlar', () => {
    expect(() => parseCashflow({})).toThrow(/results/);
  });
});

describe('parseInfo', () => {
  const i = parseInfo(fixture('fintables-TLY-info.json'));
  it('stopajı orandan yüzdeye çevirir', () => {
    expect(i.taxPct).toBeCloseTo(17.5, 6);
  });
  it('valör ve yönetim ücretini alır', () => {
    expect(i.buyValorDays).toBe(1);
    expect(i.sellValorDays).toBe(2);
    expect(i.managementFeePct).toBe(2);
  });
  it('varlık dağılımını düzleştirir ve toplamı makul', () => {
    expect(i.allocation.length).toBeGreaterThan(0);
    const toplam = i.allocation.reduce((s, a) => s + a.weightPct, 0);
    expect(toplam).toBeGreaterThan(50);
    expect(toplam).toBeLessThan(150);
  });
  it('stopaj null gelirse null kalır', () => {
    const i2 = parseInfo({
      tax: null, management_fee: null, buy_valor: null, sell_valor: null,
      risk: null, shares_active: null, investor_count: null, last_asset: [],
    });
    expect(i2.taxPct).toBeNull();
  });
});

describe('parseFundUniverse', () => {
  const f = parseFundUniverse(fixture('fintables-funds-sample.json'));
  it('yönetim şirketi kodunu düzleştirir', () => {
    expect(f.length).toBe(5);
    expect(f[0]?.code).toMatch(/^[A-Z0-9.]+$/);
    expect(f[0]?.managementCompanyId).toBeTypeOf('string');
  });
  it('umbrellaType null olabilir', () => {
    const one = parseFundUniverse([
      { code: 'X', title: 'X', fund_type: 'mutual', type: null, management_company: null },
    ]);
    expect(one[0]?.umbrellaType).toBeNull();
    expect(one[0]?.managementCompanyId).toBeNull();
  });
});

describe('parseYield', () => {
  const y = parseYield(fixture('fintables-yield-sample.json'));
  it('dönemsel getirileri alır', () => {
    expect(y.length).toBe(4);
    expect(y[0]?.code).toBeTypeOf('string');
  });
  it('yeni fonlarda uzun dönem null gelebilir', () => {
    const one = parseYield({
      results: [{ code: 'X', yield_1m: 1, yield_3m: null, yield_6m: null, yield_ytd: null,
                  yield_1y: null, yield_3y: null, yield_5y: null }],
    });
    expect(one[0]?.yield3y).toBeNull();
    expect(one[0]?.yield1m).toBe(1);
  });
});
