import { describe, expect, it } from 'vitest';

import {
  isMarketDay, orderFromSettlement, settlementFromOrder, shiftMarketDays,
} from '../src/settlement.js';

// Sistem ayarındaki liste: sabit tatiller yılsız (her yıl geçerli), hicrî
// takvimle kayan bayramlar yıllı.
const HOLIDAYS = [
  '01-01', '04-23', '05-01', '05-19', '07-15', '08-30', '10-29',
  '2026-03-20', '2026-05-27', '2026-05-28', '2026-05-29',
];

describe('isMarketDay', () => {
  it('hafta içi normal gün piyasa günüdür', () => {
    expect(isMarketDay('2026-09-02', HOLIDAYS)).toBe(true); // Çarşamba
  });
  it('hafta sonu piyasa günü değildir', () => {
    expect(isMarketDay('2026-09-05', HOLIDAYS)).toBe(false); // Cumartesi
    expect(isMarketDay('2026-09-06', HOLIDAYS)).toBe(false); // Pazar
  });
  it('sabit tatil piyasa günü değildir', () => {
    expect(isMarketDay('2026-04-23', HOLIDAYS)).toBe(false); // Perşembe
    expect(isMarketDay('2026-07-15', HOLIDAYS)).toBe(false); // Çarşamba
  });

  it('sabit tatil yıl yazmadan her yıl geçerlidir', () => {
    // Listede yalnız "04-23" var; 2027 ve 2030 da tatil sayılmalı.
    expect(isMarketDay('2027-04-23', HOLIDAYS)).toBe(false); // Cuma
    expect(isMarketDay('2030-04-23', HOLIDAYS)).toBe(false); // Salı
  });

  it('yıla özel bayram yalnız kendi yılında tatildir', () => {
    // 2026-05-27 Kurban; 2027'de aynı gün bayram değil (hicrî takvim kayar).
    expect(isMarketDay('2026-05-27', HOLIDAYS)).toBe(false); // Çarşamba
    expect(isMarketDay('2027-05-27', HOLIDAYS)).toBe(true);  // Perşembe
  });

  it('tatil hafta sonuna denk gelirse zaten kapalıdır', () => {
    expect(isMarketDay('2026-08-30', HOLIDAYS)).toBe(false); // Pazar
  });
});

describe('settlementFromOrder', () => {
  it('kullanıcının elle hesapladığı tarihleri üretir', () => {
    // 2026-09-02 Çarşamba. IJC ve PIL valörü 3, KHA valörü 2.
    expect(settlementFromOrder('2026-09-02', 3, HOLIDAYS)).toBe('2026-09-07');
    expect(settlementFromOrder('2026-09-02', 2, HOLIDAYS)).toBe('2026-09-04');
  });

  it('hafta sonunu atlar', () => {
    // Cuma + 1 iş günü = Pazartesi
    expect(settlementFromOrder('2026-09-04', 1, HOLIDAYS)).toBe('2026-09-07');
  });

  it('tatili atlar', () => {
    // 22 Nisan Çarşamba + 1 → 23 Nisan tatil, 24 Nisan Cuma.
    expect(settlementFromOrder('2026-04-22', 1, HOLIDAYS)).toBe('2026-04-24');
  });

  it('bayram ve hafta sonu zincirini birlikte atlar', () => {
    // 26 Mayıs Salı + 1 → 27/28/29 Kurban, 30-31 hafta sonu → 1 Haziran.
    expect(settlementFromOrder('2026-05-26', 1, HOLIDAYS)).toBe('2026-06-01');
  });

  it('valör sıfırsa gün değişmez', () => {
    expect(settlementFromOrder('2026-09-02', 0, HOLIDAYS)).toBe('2026-09-02');
  });
});

describe('orderFromSettlement', () => {
  it('ileri hesabın tersini verir', () => {
    expect(orderFromSettlement('2026-09-07', 3, HOLIDAYS)).toBe('2026-09-02');
    expect(orderFromSettlement('2026-09-04', 2, HOLIDAYS)).toBe('2026-09-02');
  });

  it('geriye giderken de tatili atlar', () => {
    expect(orderFromSettlement('2026-06-01', 1, HOLIDAYS)).toBe('2026-05-26');
  });

  it('valör sıfırsa gün değişmez', () => {
    expect(orderFromSettlement('2026-09-02', 0, HOLIDAYS)).toBe('2026-09-02');
  });
});

describe('sınırlar', () => {
  it('geçersiz tarihi reddeder', () => {
    expect(() => shiftMarketDays('2026-13-01', 1, HOLIDAYS)).toThrow(/Geçersiz tarih/);
    expect(() => shiftMarketDays('dün', 1, HOLIDAYS)).toThrow(/Geçersiz tarih/);
  });

  it('tam sayı olmayan valörü reddeder', () => {
    expect(() => shiftMarketDays('2026-09-02', 1.5, HOLIDAYS)).toThrow(/tam sayı/);
  });

  it('tatil listesi boşken yalnız hafta sonunu atlar', () => {
    expect(settlementFromOrder('2026-04-22', 1, [])).toBe('2026-04-23');
  });

  it('sabit tatil sonraki yıllarda da hesabı etkiler', () => {
    // 2027-04-22 Perşembe + 1 → 23 Nisan Cuma tatil → 26 Nisan Pazartesi.
    expect(settlementFromOrder('2027-04-22', 1, HOLIDAYS)).toBe('2027-04-26');
  });
});
