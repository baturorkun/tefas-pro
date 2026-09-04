import { describe, expect, it } from 'vitest';

import { planFifoSale } from '../src/fifo.js';

/** Ölçülen veriden: THF · Nkolay'ın üç alım kaydı, alış tarihine göre sıralı. */
const thf = [
  { id: 83, units: 29272 },  // 24.08
  { id: 97, units: 35114 },  // 31.08
  { id: 98, units: 36704 },  // 01.09
];

describe('planFifoSale', () => {
  it('en eski kayıttan başlar', () => {
    // Kullanıcı 01.09 alımını satmıştı; kural onu değil 24.08'i tüketmeli.
    const [ilk] = planFifoSale(thf, 1000);
    expect(ilk?.id).toBe(83);
  });

  it('tam tüketilen kayıt bölünmez', () => {
    const plan = planFifoSale(thf, 29272);
    expect(plan).toEqual([{ id: 83, sell: 29272, keep: 0 }]);
  });

  it('kaydın ortasında kalınırsa bölünür', () => {
    // 5.000'lik alımdan 3.000: 3.000 satılır, 2.000 açık kalır.
    expect(planFifoSale([{ id: 1, units: 5000 }], 3000))
      .toEqual([{ id: 1, sell: 3000, keep: 2000 }]);
  });

  it('birden çok kaydı tam tüketen satış hiç bölmez', () => {
    const plan = planFifoSale(thf, 29272 + 35114);
    expect(plan).toEqual([
      { id: 83, sell: 29272, keep: 0 },
      { id: 97, sell: 35114, keep: 0 },
    ]);
    expect(plan.every((x) => x.keep === 0)).toBe(true);
  });

  it('bir satış en fazla bir kaydı böler', () => {
    // 40.000: 24.08 tamamen, 31.08 yarıda kalır.
    const plan = planFifoSale(thf, 40000);
    expect(plan).toEqual([
      { id: 83, sell: 29272, keep: 0 },
      { id: 97, sell: 10728, keep: 24386 },
    ]);
    expect(plan.filter((x) => x.keep > 0)).toHaveLength(1);
  });

  it('sonraki kayda ancak öncekinin tamamı bittikten sonra geçer', () => {
    const plan = planFifoSale(thf, 70000);
    // Üçüncüye geçilmiş olması ilk ikisinin tam tükendiği anlamına gelir.
    expect(plan.map((x) => x.id)).toEqual([83, 97, 98]);
    expect(plan[0]?.keep).toBe(0);
    expect(plan[1]?.keep).toBe(0);
  });

  it('adet ve dolayısıyla maliyet korunur', () => {
    // Bölünen kaydın iki parçası toplamda aslını verir; alış tarihi aynı
    // kaldığı için birim fiyat da aynı, maliyet adetle doğru orantılı.
    const plan = planFifoSale(thf, 40000);
    const dokunulan = new Map(thf.map((l) => [l.id, l.units]));
    for (const x of plan) expect(x.sell + x.keep).toBe(dokunulan.get(x.id));
  });

  it('tamamı satılırsa hiçbir kayıt bölünmez', () => {
    const hepsi = thf.reduce((a, l) => a + l.units, 0);
    const plan = planFifoSale(thf, hepsi);
    expect(plan).toHaveLength(3);
    expect(plan.every((x) => x.keep === 0)).toBe(true);
  });

  it('elde olandan fazlası reddedilir ve eldeki söylenir', () => {
    expect(() => planFifoSale(thf, 101091)).toThrow(/101\.090 pay var/);
  });

  it('sıfır veya negatif adet reddedilir', () => {
    expect(() => planFifoSale(thf, 0)).toThrow(/sıfırdan büyük/);
    expect(() => planFifoSale(thf, -5)).toThrow(/sıfırdan büyük/);
  });

  it('kesirli adette kayan nokta artığı kayıt bırakmaz', () => {
    // 0.1 + 0.2 !== 0.3; tolerans olmasa üçüncü kayıt 5e-17 payla açık kalırdı.
    const plan = planFifoSale([{ id: 1, units: 0.1 }, { id: 2, units: 0.2 }], 0.3);
    expect(plan).toHaveLength(2);
    expect(plan.every((x) => x.keep === 0)).toBe(true);
  });
});
