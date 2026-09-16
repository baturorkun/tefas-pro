import { describe, expect, it } from 'vitest';

import { TANINAN_KOD_SAYISI, kanonikDagilim } from '../src/sources/tefas-dagilim.js';

describe('kanonikDagilim', () => {
  it('ADP\'nin gerçek dağılımını kanonik adlara çevirir', () => {
    // dagilimSiraliGetirT'den 16 Eylül için dönen sıfır olmayan alanlar.
    const m = kanonikDagilim({ byf: 6.94, hs: 83.28, tr: 4.59, vmtl: 0.04, vint: 1.72, yyf: 3.43 });
    expect(m.get('Hisse Senedi')).toBe(83.28);
    expect(m.get('Borsa Yatırım Fonu')).toBe(6.94);
    expect(m.get('Ters-Repo')).toBe(4.59);
    expect(m.get('Mevduat')).toBe(0.04);
    expect(m.get('Vadeli İşlem Teminatı')).toBe(1.72);
    expect(m.get('Yatırım Fonu')).toBe(3.43);
  });

  it('alt kırılımları tek sınıfta toplar', () => {
    // TL, döviz ve altın mevduatı ekranda tek dilim: Dağılım ekranı sınıfları
    // fonlar arasında topluyor, ayrı adlar aynı sınıfı bölerdi.
    const m = kanonikDagilim({ vmtl: 1, vmd: 2, vmau: 0.5, kkstl: 3, osks: 1 });
    expect(m.get('Mevduat')).toBeCloseTo(3.5, 6);
    expect(m.get('Kira Sertifikaları')).toBe(4);
  });

  it('bilinmeyen kodu kaybetmez', () => {
    // "Diğer"e atmak veriyi sessizce yutar; görünsün ki fark edilsin.
    expect(kanonikDagilim({ xyz: 2 }).get('XYZ')).toBe(2);
  });

  it('pytefas haritasındaki tüm kodları tanır', () => {
    // 54 alan kodu (yanıttaki 58 alanın 4'ü kod değil: fonKodu, fonUnvan,
    // tarih, rn); biri eksilirse o sınıf ekranda kod olarak görünür.
    expect(TANINAN_KOD_SAYISI).toBe(54);
  });
});
