/**
 * KAP Portföy Dağılım Raporu PDF metninin ayrıştırılması.
 *
 * Girdi `pdftotext -layout` çıktısıdır: sütun hizası korunmuş düz metin.
 * Ağdan ve dosya sisteminden bağımsızdır, fixture ile test edilir.
 *
 * İki şablon ailesi ölçüldü. Kurucular aynı fon muhasebe yazılımlarını
 * kullandığı için şablon sayısı kurucu sayısından az:
 *
 *   A (Ak Portföy vb.)   "III-FON PORTFÖY DEĞERİ TABLOSU", Türk sayı biçimi
 *                        (1.234,56), varlık sınıfları "a-)Hisse Senedi : 87,51"
 *   B (Yapı Kredi vb.)   "III- FON PORTFÖY DEĞERİ", ABD sayı biçimi
 *                        (1,234.56), varlık sınıfları "Hisse Senedi  16.64%"
 *
 * Kalem tablosunda sütun sayısı şablona göre değişiyor ama ölçülen kural her
 * ikisinde de aynı: satırın ilk token'ı menkul kıymet kodu, SON sayısı
 * portföy ağırlığı. 8 fonda fvt'nin verisiyle karşılaştırıldı — 214 kalemin
 * 214'ü tam isabet.
 */

/** Türk biçimi: 1.234.567,89 */
const TR_SAYI = /-?\d{1,3}(?:\.\d{3})*,\d+/g;
/** ABD biçimi: 1,234,567.89 */
const US_SAYI = /-?\d{1,3}(?:,\d{3})*\.\d+/g;

/**
 * Kalem satırının başındaki büyük harfli token menkul kıymet kodu DEĞİL de
 * tablo başlığı/grup adı olabiliyor. Bunlar elenir.
 */
const BASLIK_TOKENLARI = new Set([
  'MENKUL', 'VADEYE', 'NOMİNAL', 'TOPLAM', 'GRUP', 'III', 'HİSSE', 'MEVDUAT',
  'DİĞER', 'VIOP', 'BİRİM', 'DÖVİZ', 'SATIN', 'BORSA', 'REPO', 'ISIN', 'FAİZ',
  'NET', 'GÜNLÜK', 'CİNSİ', 'KALAN', 'TL', 'TABLOSU', 'SENETLERİ', 'YABANCI',
  'ETF', 'FONU', 'KIYMET', 'ORAN', 'TUTAR', 'AÇIKLAMA', 'VADE', 'RAYİÇ',
  'KAMU', 'ÖZEL', 'KATILMA', 'TAKASBANK', 'VİOP', 'FON', 'TERS',
]);

export interface KapVarlikSinifi {
  /** Rapordaki ham etiket. */
  label: string;
  weightPct: number;
}

export interface KapKalem {
  /** Menkul kıymet kodu (AKBNK, TRT181028T14, BABA…). */
  code: string;
  /** Portföydeki ağırlık, yüzde. */
  weightPct: number;
}

const sayiya = (s: string, abdBicimi: boolean): number =>
  Number(abdBicimi ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.'));

/** Gövdede hangi sayı biçiminin kullanıldığını sayarak belirler. */
function abdBicimiMi(govde: string): boolean {
  const us = govde.match(US_SAYI)?.length ?? 0;
  const tr = govde.match(TR_SAYI)?.length ?? 0;
  return us > tr;
}

/** Satırın başındaki menkul kıymet kodu; başlık satırıysa null. */
function kod(satir: string): string | null {
  const m = /^\s*([A-Z0-9ÇĞİÖŞÜ][A-Z0-9ÇĞİÖŞÜ.]{1,13})\b/.exec(satir);
  if (m === null) return null;
  const k = (m[1] ?? '').replace(/\.$/, '');
  if (k === '') return null;
  return BASLIK_TOKENLARI.has(k.split('.')[0] ?? '') ? null : k;
}

/**
 * Bazı fonların PDF'inde Türkçe harfler bozuk gömülü: noktalı İ yerine Ġ,
 * ş yerine ġ çıkıyor (ölçüldü: EC2). Aynı şablon, yalnız font sorunu —
 * bölüm başlıklarını eşleştirebilmek için önce düzeltilir.
 */
export function harfleriDuzelt(metin: string): string {
  return metin.replace(/\u0120/g, 'İ').replace(/\u0121/g, 'ş')
              .replace(/\u011E/g, 'Ğ').replace(/\u011F/g, 'ğ');
}

/**
 * Portföy değeri tablosunun gövdesi.
 *
 * Bölüm numarası kurucuya göre Romen (III-) ya da Arap (3-) rakamı
 * olabiliyor; ölçüldü, ikisi de yaygın. Ayraç tire ya da nokta, araya boşluk
 * girebiliyor.
 */
const BOLUM_III = /(?:III|3)\s?[-.]\s?FON PORTFÖY DEĞERİ/;
const BOLUM_IV = /(?:IV|4)\s?[-.]\s?FON TOPLAM DEĞERİ/;

function portfoyBolumu(ham: string): string | null {
  const metin = harfleriDuzelt(ham);
  const bas = BOLUM_III.exec(metin);
  if (bas === null) return null;
  const kalan = metin.slice(bas.index + bas[0].length);
  const son = BOLUM_IV.exec(kalan);
  return son === null ? kalan : kalan.slice(0, son.index);
}

/**
 * Kalem düzeyi portföy: hangi menkul kıymet, hangi ağırlıkla.
 *
 * Aynı kod birden fazla satırda görünebilir (farklı vadeli repolar gibi);
 * ağırlıklar toplanır.
 */
export function parseKalemler(metin: string): KapKalem[] {
  const govde = portfoyBolumu(metin);
  if (govde === null) return [];
  const abd = abdBicimiMi(govde);
  const desen = abd ? US_SAYI : TR_SAYI;
  const toplam = new Map<string, number>();
  for (const satir of govde.split('\n')) {
    // Grup toplamı satırları kalem değil; sayılırsa ağırlıklar iki katlanır.
    if (satir.trimStart().startsWith('TOPLAM') || satir.includes('TOPLAMI')) continue;
    const k = kod(satir);
    if (k === null) continue;
    const sayilar = satir.match(desen);
    // En az üç sayı: nominal, değer ve ağırlık. Daha azı eksik/başlık satırı.
    if (sayilar === null || sayilar.length < 3) continue;
    const agirlik = sayiya(sayilar[sayilar.length - 1] ?? '0', abd);
    // Bazı satırlar ağırlık sütunları olmadan kesiliyor ve son sayı tutar
    // oluyor (ölçüldü: GUH'ta JDUS 209.326,80). Tek bir kıymet portföyün
    // tamamından fazla olamaz; sınır dışı değer ağırlık değildir, satır
    // atlanır — yanlış sayıyı yazmak tüm fonu bozuyordu.
    if (!Number.isFinite(agirlik) || Math.abs(agirlik) > 100) continue;
    toplam.set(k, (toplam.get(k) ?? 0) + agirlik);
  }
  return [...toplam].map(([code, weightPct]) => ({ code, weightPct }));
}

/**
 * II. bölümdeki varlık sınıfı yüzdeleri — Dağılım ekranının verisi.
 *
 * Şablon A sabit bir etiket listesi kullanıyor ("a-)Hisse Senedi : 87,51"),
 * şablon B etiketi harf öneki olmadan ve yüzde işaretiyle yazıyor
 * ("Hisse Senedi  16.64%"). İkisi de aynı düzenle okunur: satırın sonundaki
 * sayı ağırlık, öncesindeki metin etiket.
 *
 * Etiketler HAM döner. Dağılım ekranı sınıfları fonlar arasında topladığı
 * için adlandırmanın tek biçime getirilmesi gerekiyor, ama o eşleme burada
 * değil: parse ne yazdığını bildirir, yorumlamaz.
 */
export function parseVarlikSiniflari(ham: string): KapVarlikSinifi[] {
  const metin = harfleriDuzelt(ham);
  const bas = /MENKUL KIYMETLER|Menkul Kıymetler/.exec(metin);
  if (bas === null) return [];
  const kalan = metin.slice(bas.index + bas[0].length);
  const son = /Portföy Devir Hızı|PORTFÖY DEVİR|(?:III|3)\s?[-.]\s?FON/.exec(kalan);
  const govde = son === null ? kalan.slice(0, 2000) : kalan.slice(0, son.index);

  const out: KapVarlikSinifi[] = [];
  const gorulen = new Set<string>();
  for (const satir of govde.split('\n')) {
    const m = /^\s*(?:[A-Za-zçğıöşüÇĞİÖŞÜ]\d?-?\)\s*)?([A-Za-zÇĞİÖŞÜçğıöşü .\-/]{3,45}?)\s*:?\s+(-?[\d.,]+)\s*%?\s*$/
      .exec(satir);
    if (m === null) continue;
    const label = (m[1] ?? '').replace(/\s+/g, ' ').trim().replace(/^[.\-]+|[.\-]+$/g, '');
    const sayi = m[2] ?? '';
    if (label.length < 3 || !/\d/.test(sayi)) continue;
    // Aynı etiket iki kez yazılmışsa ilki geçerli: ikincisi genelde devir
    // hızı tablosunun tekrarı.
    if (gorulen.has(label)) continue;
    gorulen.add(label);
    // Bu bölümde binlik ayraç yok; tek ondalık ayracı hangisiyse o.
    const weightPct = Number(sayi.includes(',') ? sayi.replace(',', '.') : sayi);
    if (!Number.isFinite(weightPct)) continue;
    out.push({ label, weightPct });
  }
  return out;
}
