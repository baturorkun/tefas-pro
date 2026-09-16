import { describe, expect, it } from 'vitest';

import { gunlukGetiri, topluSatirlar } from '../src/collect-tefas.js';
import type { TefasTopluGun } from '../src/sources/tefas.js';

/**
 * Sayılar TEFAS'ın toplu ucundan (fonGnlBlgSiraliGetir) alınmış gerçek TLY
 * kayıtları. Günlük getiri ardışık fiyatlardan türetiliyor; TEFAS'ın kendi
 * gunlukGetiri değeriyle 224 gözlemin 220'si binde bir içinde ölçüldü.
 */
const tly = (tradeDate: string, navPerShare: number, sharesActive: number): TefasTopluGun => ({
  fundCode: 'TLY', title: 'TERA PORTFÖY BİRİNCİ SERBEST FON', tradeDate,
  navPerShare, sharesActive, investorCount: 102683, aum: 244294145236.74,
});

describe('gunlukGetiri', () => {
  it('TEFAS ile aynı rakamı üretir', () => {
    // 15 Eylül: TEFAS gunlukGetiri 1.689 demişti.
    expect(gunlukGetiri(10133.510887, 9965.200719)).toBeCloseTo(1.689, 3);
  });

  it('önceki fiyat yoksa ya da sıfırsa üretmez', () => {
    // Uydurma sıfır, gerçekten sıfır getiri olan günden ayırt edilemez.
    expect(gunlukGetiri(10, undefined)).toBeUndefined();
    expect(gunlukGetiri(10, 0)).toBeUndefined();
  });
});

describe('topluSatirlar', () => {
  const rows = topluSatirlar([
    tly('2026-09-15', 10133.510887, 24394721),
    tly('2026-09-11', 9805.32494, 24765451),
    tly('2026-09-14', 9965.200719, 24514724),
  ]);
  const gun = (d: string) => rows.find((r) => r.trade_date === d);

  it('tarihi yanıttan alır, koşum gününü varsaymaz', () => {
    expect(rows.map((r) => r.trade_date).sort()).toEqual(['2026-09-11', '2026-09-14', '2026-09-15']);
  });

  it('getiriyi ve akışı bir önceki iş gününden türetir', () => {
    // 11 Eylül cuma, 14 Eylül pazartesi: hafta sonu atlanır, önceki iş günü.
    expect(gun('2026-09-14')?.daily_return_pct).toBeCloseTo((9965.200719 / 9805.32494 - 1) * 100, 6);
    expect(gun('2026-09-14')?.net_flow).toBeCloseTo((24514724 - 24765451) * 9965.200719, 2);
  });

  it('pencerenin ilk gününde önceki gün yoktur, alanlar boş kalır', () => {
    // Upsert COALESCE ile var olan değeri korur; sıfır yazmak yanlış olurdu.
    expect(gun('2026-09-11')?.daily_return_pct).toBeUndefined();
    expect(gun('2026-09-11')?.net_flow).toBeUndefined();
    expect(gun('2026-09-11')?.nav_per_share).toBe(9805.32494);
  });

  it('fonları birbirine karıştırmaz', () => {
    const iki = topluSatirlar([
      tly('2026-09-15', 10, 100),
      { ...tly('2026-09-14', 5, 50), fundCode: 'XYZ' },
    ]);
    // XYZ'nin 14'ü TLY'nin 15'ine "önceki gün" sayılmamalı.
    expect(iki.find((r) => r.fund_code === 'TLY')?.daily_return_pct).toBeUndefined();
  });
});
