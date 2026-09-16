/**
 * TEFAS dağılım alan kodları → kanonik varlık sınıfı adları.
 *
 * `dagilimSiraliGetirT` 54 sabit kodla döner (hs, dt, tr…). Dağılım ekranı
 * sınıfları fonlar arasında topladığı için adlar migration 047'nin kurduğu
 * kanonik kümeye eşlenir; aksi hâlde TEFAS'tan gelen satırlar KAP döneminden
 * kalanlarla iki ayrı dilim oluştururdu.
 *
 * Alt kırılımlar tek sınıfta toplanır: TL/döviz/altın mevduatı hepsi
 * "Mevduat", kamu/özel/yabancı kira sertifikası hepsi "Kira Sertifikaları".
 * Ekran bu ayrımı göstermiyor ve KAP kaynağı da göstermiyordu; aynı seviyede
 * kalsın. Kod anlamları pytefas'ın DIST_FIELDS haritasından.
 */
const KOD_AD: Record<string, string> = {
  hs: 'Hisse Senedi',
  yhs: 'Yabancı Hisse Senedi',

  dt: 'Devlet Tahvili',
  hb: 'Hazine Bonosu',
  fb: 'Finansman Bonosu',
  ost: 'Özel Sektör Tahvili',
  bb: 'Banka Bonosu',
  vdm: 'Varlığa Dayalı Menkul Kıymet',

  // Dış ve döviz borçlanma araçları
  eut: 'Eurobond',
  kibd: 'Borçlanma Aracı',
  osdb: 'Borçlanma Aracı',
  kba: 'Borçlanma Aracı',
  dot: 'Borçlanma Aracı',
  db: 'Borçlanma Aracı',
  yba: 'Yabancı Borçlanma Aracı',
  ybkb: 'Yabancı Borçlanma Aracı',
  ybosb: 'Yabancı Borçlanma Aracı',
  ymk: 'Yabancı Menkul Kıymet',

  // Para piyasası
  tpp: 'Takasbank Para Piyasası',
  bpp: 'Takasbank Para Piyasası',
  btaa: 'Taahhütlü Alış-Satış İşlemleri',
  btas: 'Taahhütlü Alış-Satış İşlemleri',
  r: 'Ters-Repo',
  tr: 'Ters-Repo',

  // Mevduat ve katılım
  vm: 'Mevduat',
  vmtl: 'Mevduat',
  vmd: 'Mevduat',
  vmau: 'Mevduat',
  kh: 'Katılım Hesabı',
  khtl: 'Katılım Hesabı',
  khd: 'Katılım Hesabı',
  khau: 'Katılım Hesabı',

  // Kira sertifikaları
  kks: 'Kira Sertifikaları',
  kkstl: 'Kira Sertifikaları',
  kksd: 'Kira Sertifikaları',
  kksyd: 'Kira Sertifikaları',
  osks: 'Kira Sertifikaları',
  oksyd: 'Kira Sertifikaları',

  // Değerli maden
  km: 'Değerli Maden',
  kmbyf: 'Değerli Maden',
  kmkba: 'Değerli Maden',
  kmkks: 'Değerli Maden',

  // Fonlar
  fkb: 'Yatırım Fonu',
  yyf: 'Yatırım Fonu',
  byf: 'Borsa Yatırım Fonu',
  ybyf: 'Yabancı Borsa Yatırım Fonu',
  gykb: 'Gayrimenkul Yatırım Fonu',
  gyy: 'Gayrimenkul Yatırımı',
  gsykb: 'Girişim Sermayesi Yatırım Fonu',
  gsyy: 'Girişim Sermayesi Yatırımı',

  // Türev ve diğer
  t: 'Türev Araçlar',
  vint: 'Vadeli İşlem Teminatı',
  gas: 'Gayrimenkul Sertifikası',
  d: 'Diğer',
};

/**
 * Kod → yüzde sözlüğünü kanonik ad → yüzde'ye çevirir; aynı ada düşenler
 * toplanır. Bilinmeyen kod olduğu gibi geçer — sessizce "Diğer"e atmak
 * veriyi kaybettirir, ekranda görünmesi daha iyi.
 */
export function kanonikDagilim(yuzdeler: Record<string, number>): Map<string, number> {
  const out = new Map<string, number>();
  for (const [kod, yuzde] of Object.entries(yuzdeler)) {
    const ad = KOD_AD[kod] ?? kod.toUpperCase();
    out.set(ad, (out.get(ad) ?? 0) + yuzde);
  }
  return out;
}

/** Test ve belge için: tanınan kod sayısı. */
export const TANINAN_KOD_SAYISI = Object.keys(KOD_AD).length;
