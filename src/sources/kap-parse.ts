/**
 * KAP Portföy Dağılım Raporu PDF metninin ayrıştırılması.
 *
 * Girdi `pdftotext -layout` çıktısıdır: sütun hizası korunmuş düz metin.
 * Ağdan ve dosya sisteminden bağımsızdır, fixture ile test edilir.
 *
 * İki şablon ailesi ölçüldü. Kurucular aynı fon muhasebe yazılımlarını
 * kullandığı için şablon sayısı kurucu sayısından az:
 *
 *   A (Ak Portföy vb.)   "III-FON PORTFÖY DEĞERİ TABLOSU", Türk sayı biçimi (1.234,56)
 *   B (Yapı Kredi vb.)   "III- FON PORTFÖY DEĞERİ", ABD sayı biçimi (1,234.56)
 *
 * Yalnız kalem düzeyi kırılım okunur. Varlık sınıfı dağılımı bir zamanlar
 * buradan da okunuyordu; artık TEFAS'ın toplu ucundan geliyor (RQ-0076) ve
 * PDF'teki şablon çeşitliliğiyle uğraşmaya gerek kalmadı.
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

/**
 * Menkul kıymet kodunu tek biçime getirir.
 *
 * Bazı fon şablonları borsa sonekini yazıyor (`AKBNK.E`), bazıları
 * yazmıyor (`AKBNK`). Ölçüldü: KAP'tan gelen 1327 kodun 139'u sonekli ve
 * 120'sinin sadesi de ayrıca kayıtlıydı — aynı kıymet iki kez sayılıyordu.
 *
 * Tahvil ISIN'lerine dokunulmaz: onlarda nokta yok zaten.
 */
export function kodNormalize(ham: string): string {
  return (ham.split('.')[0] ?? ham).trim();
}

/** Satırın başındaki menkul kıymet kodu; başlık satırı ya da kod değilse null. */
function kod(satir: string): string | null {
  const m = /^\s*([A-Z0-9ÇĞİÖŞÜ][A-Z0-9ÇĞİÖŞÜ.]{1,13})\b/.exec(satir);
  if (m === null) return null;
  const k = kodNormalize(m[1] ?? '');
  if (k === '') return null;
  // Tamamı rakam olan "kod" menkul kıymet değil: tablodan yanlış çıkarılmış
  // bir sayı. Ölçüldü, üretimde 15 tane böyle kod birikmişti.
  if (!/[A-ZÇĞİÖŞÜ]/.test(k)) return null;
  return BASLIK_TOKENLARI.has(k) ? null : k;
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
