/**
 * KAP (Kamuyu Aydınlatma Platformu) kaynak istemcisi.
 *
 * Fonlar portföylerini yasa gereği KAP'a bildiriyor; Fintables'ın varlık
 * sınıfı dağılımı da fvt'nin hisse kırılımı da aslında bu bildirimden
 * türetilmiş veri. Ölçüldü: fvt'nin `fund_stock_holding` kayıtlarıyla KAP
 * raporundan çıkarılan ağırlıklar 8 fonda 214 kalemde karşılaştırıldı,
 * 214'ü de tam isabet, maksimum sapma 0.000.
 *
 * Kimlik doğrulaması yok, IP engeli yok — sunucudan da çalışır. Fintables
 * (tamamen erişilemez) ve fvt (yalnız ev IP'sinden) ile aradaki fark bu.
 *
 * Bildirim sıklığı `period` alanında: `AB` aylık (donem = ay numarası),
 * `HB` haftalık (donem = hafta numarası). Yasa değişikliğiyle fonlar
 * haftalığa geçiyor; geçiş kademeli, ikisi de desteklenmeli.
 *
 * Asıl veri JSON'da değil PDF ekinde. Bildirimin `disclosureBody`'si yalnız
 * XBRL şablonu, Excel export'u da sadece başlık bilgisi taşıyor — ikisi de
 * ölçüldü, portföy tablosu yok. PDF'ten metin çıkarma `pdftotext -layout`
 * ile yapılıyor (bkz. collector/Containerfile).
 *
 * Parse fonksiyonları ağdan ve dosya sisteminden bağımsızdır: metin alır,
 * veri döner. Fixture ile test edilir.
 */
const BASE = 'https://www.kap.org.tr';
const HEADERS = {
  Referer: `${BASE}/tr/bildirim-sorgu`,
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
};

/** Portföy Dağılım Raporu'nun KAP konu kimliği. */
export const PORTFOY_DAGILIM_RAPORU = '8aca490d502e34b801502e380044002b';

/** Yatırım fonları grubu. */
const FON_GRUBU = 'YF';

export interface KapFon {
  fundCode: string;
  fundOid: string;
  fundName: string;
  /** Kurucu portföy yönetimi şirketi. */
  founder: string | null;
}

export interface KapBildirim {
  disclosureIndex: number;
  /** Yayın tarihi, YYYY-MM-DD. */
  publishDate: string;
  /** `AB` aylık, `HB` haftalık. */
  period: string | null;
  /** Aylıkta ay numarası, haftalıkta hafta numarası. */
  donem: number | null;
  year: number | null;
}

export interface KapEk {
  objId: string;
  fileName: string;
}

/** Bir menkul kıymetin portföydeki ağırlığı. */
export interface KapKalem {
  code: string;
  weightPct: number;
}

/**
 * Geçici ağ hatalarında yeniden dener.
 *
 * Ölçüldü: 72 fonluk kesintisiz koşumda sonlara doğru 16 fon "fetch failed"
 * aldı, aynı fonlar hemen ardından tek tek denendiğinde sorunsuz geldi.
 * Kalıcı bir engel değil, sürekli istekte oluşan geçici bir durum — bu
 * yüzden hata yutulmuyor, araya beklemeyle tekrar deneniyor.
 */
async function yenidenDene<T>(is: () => Promise<T>, adet = 3): Promise<T> {
  let son: unknown;
  for (let i = 0; i < adet; i++) {
    try {
      return await is();
    } catch (err) {
      son = err;
      // Artan bekleme: 2sn, 4sn. Israrla üstüne gitmek durumu kötüleştirir.
      if (i < adet - 1) {
        await new Promise((c) => setTimeout(c, 2000 * (i + 1)));
      }
    }
  }
  throw son;
}

async function kapGet<T>(url: string): Promise<T> {
  return yenidenDene(async () => {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`kap ${url}: http ${String(res.status)}`);
    return (await res.json()) as T;
  });
}

/** Tüm yatırım fonları: kod → OID eşlemesi için. */
export async function fonListesi(): Promise<KapFon[]> {
  interface Satir {
    fundCode: string | null; fundOid: string | null;
    fundName: string | null; title: string | null;
  }
  const d = await kapGet<Satir[]>(`${BASE}/tr/api/fund/criteria/${FON_GRUBU}/Y`);
  const out: KapFon[] = [];
  for (const s of d) {
    if (s.fundCode === null || s.fundOid === null) continue;
    out.push({
      fundCode: s.fundCode,
      fundOid: s.fundOid,
      fundName: s.fundName ?? s.fundCode,
      founder: s.title,
    });
  }
  return out;
}

/**
 * Bir fonun portföy dağılım bildirimleri, yeniden eskiye.
 *
 * `gun` serbest bir sayı değil: KAP belirli değerleri kabul ediyor, 400
 * gönderilince boş liste dönüyor. 120 ve 365 ölçülerek doğrulandı.
 */
export async function portfoyBildirimleri(
  fundOid: string,
  gun: 30 | 120 | 365 = 120,
): Promise<KapBildirim[]> {
  interface Satir {
    disclosureBasic: {
      disclosureIndex: number; publishDate: string;
      period: string | null; donem: number | null; year: number | null;
    };
  }
  const d = await kapGet<Satir[]>(
    `${BASE}/tr/api/disclosure/filter/FILTERYFBF/${fundOid}/${PORTFOY_DAGILIM_RAPORU}/${String(gun)}`,
  );
  return d.map((s) => {
    const b = s.disclosureBasic;
    return {
      disclosureIndex: b.disclosureIndex,
      publishDate: isoTarih(b.publishDate),
      period: b.period,
      donem: b.donem,
      year: b.year,
    };
  });
}

/** KAP'ın "02.09.2026 17:53:14" biçimini YYYY-MM-DD'ye çevirir. */
export function isoTarih(kapTarih: string): string {
  const m = /^(\d{2})[.](\d{2})[.](\d{4})/.exec(kapTarih);
  if (m === null) return kapTarih.slice(0, 10);
  return `${m[3] ?? ''}-${m[2] ?? ''}-${m[1] ?? ''}`;
}

/** Bildirimin ekleri; portföy tablosu ilk ekteki PDF'te. */
export async function bildirimEkleri(disclosureIndex: number): Promise<KapEk[]> {
  interface Satir { attachments: { objId: string; fileName: string }[] }
  const d = await kapGet<Satir[]>(
    `${BASE}/tr/api/notification/attachment-detail/${String(disclosureIndex)}`,
  );
  return d[0]?.attachments ?? [];
}

/** Ek dosyasını indirir. */
export async function ekIndir(objId: string): Promise<Buffer> {
  return yenidenDene(async () => {
    const res = await fetch(`${BASE}/tr/api/file/download/${objId}`, { headers: HEADERS });
    if (!res.ok) throw new Error(`kap ek ${objId}: http ${String(res.status)}`);
    return Buffer.from(await res.arrayBuffer());
  });
}

/**
 * Şemsiye fon türü. KAP `fundClass` alanında kod veriyor; `dim_fund` ise
 * kullanıcıya gösterilen Türkçe adı tutuyor.
 */
const SEMSIYE = new Map<string, string>([
  ['HS', 'Hisse Senedi Şemsiye Fonu'],
  ['KTF', 'Katılım Şemsiye Fonu'],
  ['DG', 'Değişken Şemsiye Fonu'],
  ['SF', 'Serbest Şemsiye Fonu'],
  ['BA', 'Borçlanma Araçları Şemsiye Fonu'],
  ['PP', 'Para Piyasası Şemsiye Fonu'],
  ['KM', 'Kıymetli Madenler Şemsiye Fonu'],
  ['FS', 'Fon Sepeti Şemsiye Fonu'],
  ['GS', 'Girişim Sermayesi Şemsiye Fonu'],
  ['GM', 'Gayrimenkul Şemsiye Fonu'],
]);

/** `dim_fund` satırı biçiminde fon evreni. Fintables'ın fundUniverse'ünün yerini alır. */
export interface FonEvreniSatiri {
  code: string;
  title: string;
  /** mutual | pension | realestate | exchange */
  fundType: string;
  umbrellaType: string | null;
  managementCompanyId: string | null;
  isByf: boolean;
}

/**
 * Tüm yatırım fonları, `dim_fund`'a yazılacak biçimde.
 *
 * Ölçüldü: 2146 fon dönüyor ve takip edilen fonların tamamı eşleşiyor.
 * Fintables'ın evreninden geniş.
 */
export async function fonEvreni(): Promise<FonEvreniSatiri[]> {
  interface Satir {
    fundCode: string | null; fundName: string | null;
    fundClass: string | null; mkkMemberOid: string | null;
  }
  const d = await kapGet<Satir[]>(`${BASE}/tr/api/fund/criteria/${FON_GRUBU}/Y`);
  const out: FonEvreniSatiri[] = [];
  for (const s of d) {
    if (s.fundCode === null || s.fundCode === '') continue;
    out.push({
      code: s.fundCode,
      title: s.fundName ?? s.fundCode,
      // YF grubu yatırım fonu; emeklilik ve BYF ayrı KAP gruplarında.
      fundType: 'mutual',
      umbrellaType: s.fundClass === null ? null : SEMSIYE.get(s.fundClass) ?? null,
      managementCompanyId: s.mkkMemberOid,
      isByf: false,
    });
  }
  return out;
}
