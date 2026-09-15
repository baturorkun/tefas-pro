/**
 * Varlık sınıfı adlandırmasının tek biçime getirilmesi.
 *
 * Dağılım ekranı sınıfları FONLAR ARASINDA topluyor: aynı varlık sınıfı iki
 * farklı adla gelirse ekranda iki ayrı dilim olur. KAP raporlarında
 * adlandırma kurucuya göre değişiyor — "Finansman Bonusu" ve "Finansman
 * Bonosu", "Katilim Hesabı" ve "Katılma Hesabı" gibi — bu yüzden yazmadan
 * önce kanonik ada çevriliyor.
 *
 * Tanınmayan etiket olduğu gibi geçer: bilmediğimiz bir sınıfı "Diğer"e
 * atmak veriyi sessizce kaybettirir, ekranda görünmesi daha iyi.
 */

/** Başlık biçimine çevrilirken bozulmaması gereken kısaltmalar. */
const KISALTMALAR = new Set(['YP', 'TL', 'ETF', 'BYF', 'GOS', 'GES', 'SWAP', 'VİOP', 'VDMK', 'TPP', 'BPP']);

/** Varlık sınıfı olmayan, rapordaki diğer satırlar. */
const GURULTU = /TEDAVÜL|ORTALAMA|DEVİR HIZI|VADESİ|KATSAYI/i;

/**
 * Varyant → kanonik ad. Ölçülerek çıkarıldı: 72 fonun raporundaki tüm
 * etiketler toplanıp elle eşlendi.
 */
const ESLEME = new Map<string, string>([
  // Yazım farkları
  ['finansman bonusu', 'Finansman Bonosu'],
  ['katilim hesabı', 'Katılım Hesabı'],
  ['katılma hesabı', 'Katılım Hesabı'],
  ['pay', 'Hisse Senedi'],
  ['yabancı hisse senetleri', 'Yabancı Hisse Senedi'],
  ['yp hisse', 'Yabancı Hisse Senedi'],
  ['kıymetli madenler', 'Değerli Maden'],

  // Mevduat: KAP TL/döviz ayırıyor, Dağılım ekranı tek sınıf gösteriyor.
  ['vadeli mevduat tl', 'Mevduat'],
  ['vadeli mevduat döviz', 'Mevduat'],
  ['vadeli mevduat/yabancı para', 'Mevduat'],
  ['yp mevduat', 'Mevduat'],

  // Repo türleri tek başlıkta toplanır: dayanak varlık ayrımı portföy
  // dağılımı açısından anlamlı değil, hepsi kısa vadeli para piyasası.
  ['repo-trepo', 'Ters-Repo'],
  ['devlet tahvili repo', 'Ters-Repo'],
  ['devlet tahvili ters repo', 'Ters-Repo'],
  ['hazine bonosu repo', 'Ters-Repo'],
  ['kuponlar repo', 'Ters-Repo'],
  ['ters repo', 'Ters-Repo'],

  ['takasbank borsa para piyasası', 'Takasbank Para Piyasası'],
  ['borsa para piyasası', 'Takasbank Para Piyasası'],

  // Teminat ve türev: hepsi vadeli işlem teminatı.
  ['teminat', 'Vadeli İşlem Teminatı'],
  ['türev teminat', 'Vadeli İşlem Teminatı'],
  ['viop', 'Vadeli İşlem Teminatı'],
  ['viop nakit teminat işlemleri', 'Vadeli İşlem Teminatı'],
  ['viop nakit teminatı', 'Vadeli İşlem Teminatı'],
  ['viop nakit teminat', 'Vadeli İşlem Teminatı'],

  ['katılma belgesi', 'Yatırım Fonu'],
  ['yatırım fonu katılma payı', 'Yatırım Fonu'],
  ['borsa yatırım fonu /etf', 'Borsa Yatırım Fonu'],
  ['yabancı borsa yatırım fonları', 'Yabancı Borsa Yatırım Fonu'],
  ['varlığa dayalı menkuller', 'Varlığa Dayalı Menkul Kıymet'],

  // Borçlanma araçları: TPP/BPP kurum içi kısaltma, kullanıcıya bir şey
  // ifade etmiyor.
  ['tpp-tpp borçlanma', 'Borçlanma Aracı'],
  ['bpp-bpp borçlanma', 'Borçlanma Aracı'],
]);

/**
 * Bazı raporlar etiketi tümü büyük harfle yazıyor ("MEVDUAT"), bazıları
 * normal ("Mevduat"). Eşlemede olmayanlar başlık biçimine çevrilir, yoksa
 * aynı sınıf iki ayrı dilim olurdu. Türkçe kurallı: i→İ, ı→I.
 */
function baslikBicimi(s: string): string {
  return s.split(' ').map((k) => {
    if (k.length === 0) return k;
    // Kısaltmalar olduğu gibi kalır. Uzunluğa bakmak yetmiyordu: "FONU" ve
    // "ÖZEL" de dört harf ama kısaltma değil.
    if (KISALTMALAR.has(k.toLocaleUpperCase('tr'))) return k.toLocaleUpperCase('tr');
    return k.charAt(0).toLocaleUpperCase('tr') + k.slice(1).toLocaleLowerCase('tr');
  }).join(' ');
}

/**
 * Etiketi kanonik ada çevirir; varlık sınıfı değilse null döner.
 */
export function kanonikVarlikSinifi(ham: string): string | null {
  const temiz = ham.replace(/\s+/g, ' ').trim().replace(/^[.\-)\s]+|[.\-:\s]+$/g, '');
  if (temiz.length < 3 || GURULTU.test(temiz)) return null;
  const esles = ESLEME.get(temiz.toLocaleLowerCase('tr'));
  if (esles !== undefined) return esles;
  const baslik = baslikBicimi(temiz);
  // Başlığa çevirince eşleşebilir: "MEVDUAT" → "Mevduat".
  return ESLEME.get(baslik.toLocaleLowerCase('tr')) ?? baslik;
}
