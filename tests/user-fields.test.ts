import { describe, expect, it } from 'vitest';

import {
  adSoyadKontrol, epostaKontrol, telegramKontrol, telegramNormal,
} from '../src/user-fields.js';

/**
 * Kimlik alanlarının kuralları. Aynı kurallar profil ekranında, admin
 * kullanıcı formunda ve sunucuda geçerli; burada bir kez sabitleniyor.
 */
describe('ad soyad', () => {
  it('zorunlu', () => {
    expect(adSoyadKontrol('')?.mesaj).toBe('Ad soyad gerekli.');
    // Yalnız boşluk da boştur: kırpılmadan bakılsaydı " " geçerli sayılırdı.
    expect(adSoyadKontrol('   ')?.mesaj).toBe('Ad soyad gerekli.');
  });

  it('normal ad geçer', () => {
    expect(adSoyadKontrol('Batur Orkun')).toBeNull();
    expect(adSoyadKontrol('Ayşe Öz')).toBeNull();
  });

  it('çok uzun ad reddedilir', () => {
    expect(adSoyadKontrol('a'.repeat(81))?.alan).toBe('fullName');
  });
});

describe('e-posta', () => {
  it('zorunlu', () => {
    expect(epostaKontrol('')?.mesaj).toBe('E-posta gerekli.');
  });

  it('biçimi denetlenir', () => {
    for (const bozuk of ['bozuk', 'a@b', 'a@@b.com', 'a b@c.com', '@ornek.com', 'a@.com']) {
      expect(epostaKontrol(bozuk), bozuk).not.toBeNull();
    }
  });

  it('geçerli adres kabul edilir', () => {
    for (const iyi of ['a@b.co', 'batur.orkun@ornek.com.tr', 'x+etiket@alt.ornek.org']) {
      expect(epostaKontrol(iyi), iyi).toBeNull();
    }
  });

  it('baştaki ve sondaki boşluk sorun değil', () => {
    expect(epostaKontrol('  a@b.co  ')).toBeNull();
  });
});

describe('telegram', () => {
  it('boş bırakılabilir', () => {
    expect(telegramKontrol('')).toBeNull();
    expect(telegramNormal('')).toBeNull();
    expect(telegramNormal('  @  ')).toBeNull();
  });

  it('baştaki @ saklanmaz', () => {
    // Kullanıcı bazen yazıyor bazen yazmıyor; iki farklı kayıt aynı hesabı
    // gösterirdi.
    expect(telegramNormal('@batur_orkun')).toBe('batur_orkun');
    expect(telegramNormal('batur_orkun')).toBe('batur_orkun');
    expect(telegramNormal('@@batur_orkun')).toBe('batur_orkun');
  });

  it('kısa, uzun ve geçersiz karakterler reddedilir', () => {
    expect(telegramKontrol('@abcd')).not.toBeNull();
    expect(telegramKontrol('a'.repeat(33))).not.toBeNull();
    expect(telegramKontrol('nokta.li')).not.toBeNull();
    expect(telegramKontrol('boşluk var')).not.toBeNull();
  });

  it('geçerli ad kabul edilir', () => {
    expect(telegramKontrol('@batur_orkun')).toBeNull();
    expect(telegramKontrol('abcde')).toBeNull();
  });
});
