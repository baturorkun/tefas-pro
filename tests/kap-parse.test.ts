import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { kodNormalize, parseKalemler } from '../src/sources/kap-parse.js';

const metin = (ad: string): string =>
  readFileSync(new URL(`fixtures/${ad}.txt`, import.meta.url), 'utf8');

const agirlik = (ad: string): Map<string, number> =>
  new Map(parseKalemler(metin(ad)).map((k) => [k.code, k.weightPct]));

/**
 * Beklenen değerler fvt'nin aynı fon için verdiği ağırlıklardır. İki kaynak
 * bağımsız görünüyordu ama ölçüldü: fvt de aynı KAP raporunu okuyor, 8 fonda
 * 214 kalemin 214'ü tam isabet. Buradaki sayılar o karşılaştırmadan geliyor.
 */
describe('parseKalemler — şablon A (Ak Portföy)', () => {
  const a = agirlik('kap-ADP-2026-08');

  it('hisseleri ve ağırlıklarını okur', () => {
    expect(a.get('AKBNK')).toBe(26.03);
    expect(a.get('YKBNK')).toBe(20.11);
    expect(a.get('ISCTR')).toBe(16.37);
    expect(a.get('GARAN')).toBe(12.86);
    expect(a.get('ICBCT')).toBe(0.14);
  });

  it('hisse dışı kalemleri de okur', () => {
    // Borsa yatırım fonu ve devlet tahvili aynı tabloda, aynı kuralla.
    expect(a.get('APLIB')).toBe(4.23);
    expect(a.get('TRT280531T14')).toBe(0.83);
  });

  it('sıfır ağırlıklı artık pozisyonları atmaz', () => {
    // Fon satmış ama kalıntı duruyor; portföyde görünüyorsa raporlanmalı.
    expect(a.get('THYAO')).toBe(0);
  });

  it('grup toplamı satırlarını kalem saymaz', () => {
    expect(a.has('GRUP')).toBe(false);
    expect(a.has('TOPLAM')).toBe(false);
  });
});

describe('parseKalemler — şablon B (Yapı Kredi)', () => {
  const b = agirlik('kap-CKL-2026-08');

  it('ABD sayı biçimini doğru okur', () => {
    // Bu şablonda 8.55 sekiz tam elli beş; Türk biçimi sanılırsa 855 olurdu.
    expect(b.get('RGYAS')).toBe(8.55);
    expect(b.get('SOKM')).toBe(7.33);
  });

  it('borsa sonekini ayırır, aynı kıymet tek kodla gelir', () => {
    // Raporda INTC.O ve BABA.K yazıyor; başka fonlar aynı kıymeti soneksiz
    // yazıyor. Ölçüldü: 139 sonekli kodun 120'sinin sadesi de kayıtlıydı,
    // yani aynı kıymet iki kez sayılıyordu.
    expect(b.get('INTC')).toBe(8.65);
    expect(b.get('BABA')).toBe(2.8);
    expect(b.has('INTC.O')).toBe(false);
    expect(b.get('MELI')).toBe(4.94);
  });
});

describe('parseKalemler — sınır durumlar', () => {
  it('ağırlık olamayacak sayıyı yazmaz', () => {
    // Bazı satırlar ağırlık sütunları olmadan kesiliyor; son sayı o zaman
    // tutar oluyor. Ölçüldü: GUH'ta 209.326,80 ağırlık sanılıp tüm fonun
    // yazımı "numeric field overflow" ile düşmüştü.
    const kesik = [
      'III-FON PORTFÖY DEĞERİ TABLOSU',
      'JDUS-NAGS   US47215P1066   152,00   28,29   28,59   209.326,80',
      'MUUS-NAGS   US5951121038   3.000,00   415,49   941,07   136.006.339,93   3,00   2,93',
      'IV-FON TOPLAM DEĞERİ TABLOSU',
    ].join('\n');
    const k = new Map(parseKalemler(kesik).map((x) => [x.code, x.weightPct]));
    expect(k.get('MUUS')).toBe(2.93);
    expect(k.has('JDUS')).toBe(false);
  });

  it('portföy bölümü olmayan metinde boş döner', () => {
    expect(parseKalemler('alakasiz bir metin')).toEqual([]);
  });

  it('ağırlıkların toplamı yüzde yüze yakın çıkar', () => {
    // Şablon A'da tablo tüm portföyü kapsıyor; sapma yuvarlamadan.
    const t = parseKalemler(metin('kap-ADP-2026-08'))
      .reduce((x, k) => x + k.weightPct, 0);
    expect(t).toBeGreaterThan(99);
    expect(t).toBeLessThan(101);
  });
});

describe('kodNormalize', () => {
  it('borsa sonekini atar', () => {
    expect(kodNormalize('AKBNK.E')).toBe('AKBNK');
    expect(kodNormalize('AAPL.O')).toBe('AAPL');
    expect(kodNormalize('BABA.K')).toBe('BABA');
  });

  it('soneksiz kodu değiştirmez', () => {
    expect(kodNormalize('GARAN')).toBe('GARAN');
    // Tahvil ISIN'inde nokta yok; bozulmamalı.
    expect(kodNormalize('TRT181028T14')).toBe('TRT181028T14');
  });
});

describe('parseKalemler — hisse olmayan kodlar', () => {
  it('tamamı rakam olan kodu yazmaz', () => {
    // PDF'ten yanlış çıkarılmış sayı satırları; üretimde 15 tane birikmişti.
    const metin = [
      'III-FON PORTFÖY DEĞERİ TABLOSU',
      '1.232.000   TL   ACIKLAMA   100,00   50,00   25,00',
      'GARAN   TL   GARANTI   3.792.180,00   116,58   14,65   12,86',
      'IV-FON TOPLAM DEĞERİ TABLOSU',
    ].join('\n');
    const k = new Map(parseKalemler(metin).map((x) => [x.code, x.weightPct]));
    expect(k.get('GARAN')).toBe(12.86);
    expect(k.has('1')).toBe(false);
    expect(k.has('1.232.000')).toBe(false);
  });
});
