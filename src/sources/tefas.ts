/**
 * TEFAS'ın kendi resmi API'si — birincil fiyat/getiri kaynağı.
 *
 * Fintables 15 Eylül'de dört bağımsız ağdan (sunucu, iki ev IP'si, Anthropic
 * altyapısı) aynı anda 403 vermeye başladı — kalıcı, IP'ye özel olmayan bir
 * durum. tefas.gov.tr'nin kendi web sayfaları (TarihselVeriler.aspx,
 * /tr/fon-verileri, FonAnaliz.aspx, /tr/fon-detayli-analiz) hepsi Akamai bot
 * korumasına takılıyor — düz istek de headless tarayıcı da JS-sensör
 * kabuğundan öteye geçemiyor.
 *
 * Ama `api/funds/*` altındaki uçlar bu korumaya HİÇ tabi değil, ne istemcide
 * ne IP'de bir kısıtlama var. Ölçüldü:
 *
 *     ev IP'si      fonBilgiGetir   200, tam veri
 *     sunucu IP'si  fonBilgiGetir   200, tam veri
 *
 * Kullanıcının kendi eski projesinde (github/tefas, main.py) bu uçlar
 * aylardır kullanılıyordu — o kod referans alındı, ölçülerek doğrulandı.
 *
 * Fintables'tan farkı: net akış (cashflow) ve varlık sınıfı dağılımı burada
 * yok. Bu yüzden TEFAS birincil kaynak (fiyat, günlük getiri, yatırımcı
 * sayısı, büyüklük — Getiri Günü'nü ilerletmeye yeter), Fintables varsa
 * tamamlayıcı; artık kritik yolda değil.
 */
const BASE = 'https://www.tefas.gov.tr/api/funds';
const HEADERS = {
  'Content-Type': 'application/json',
  Referer: 'https://www.tefas.gov.tr/',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
};

export interface TefasGunOzeti {
  fundCode: string;
  navPerShare: number;
  dailyReturnPct: number | null;
  investorCount: number | null;
  aum: number | null;
  sharesActive: number | null;
}

async function tefasPost<T>(url: string, payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`tefas ${url}: http ${String(res.status)}`);
  return (await res.json()) as T;
}

/** Bir fonun günün özeti: fiyat, günlük getiri, yatırımcı, büyüklük, pay adedi. */
export async function fonBilgiGetir(fundCode: string): Promise<TefasGunOzeti | null> {
  interface Yanit {
    resultList: {
      fonKodu: string; sonFiyat: number; gunlukGetiri: number | null;
      yatirimciSayi: number | null; portBuyukluk: number | null; payAdet: number | null;
    }[];
  }
  const data = await tefasPost<Yanit>(`${BASE}/fonBilgiGetir`, { fonKodu: fundCode, dil: 'TR' });
  const item = data.resultList[0];
  if (item === undefined) return null;
  return {
    fundCode: item.fonKodu,
    navPerShare: item.sonFiyat,
    dailyReturnPct: item.gunlukGetiri,
    investorCount: item.yatirimciSayi,
    aum: item.portBuyukluk,
    sharesActive: item.payAdet,
  };
}

/**
 * Fonun son fiyatının AİT OLDUĞU gün.
 *
 * `fonBilgiGetir` yalnız "son fiyat" veriyor, hangi güne ait olduğunu
 * söylemiyor. Fon bugünün fiyatını henüz açıklamamışsa dünkü fiyat dönüyor;
 * onu bugünün verisi diye yazmak uydurma bir günlük getiri üretir ve Getiri
 * Günü'nü yanlış ilerletir.
 *
 * Bu uç tarihli seri veriyor ve en son kaydı `sonFiyat` ile birebir aynı
 * (ölçüldü: TLY 2026-09-15, 10133.510887 iki uçta da aynı). Koşum saatinden
 * bağımsız doğru sonuç için tarih buradan alınır.
 */
export async function sonFiyatTarihi(fundCode: string): Promise<string | null> {
  interface Yanit { resultList?: { tarih: string; fiyat: number }[] }
  const data = await tefasPost<Yanit>(`${BASE}/fonFiyatBilgiGetir`, {
    fonKodu: fundCode, dil: 'TR', periyod: 1,
  });
  const liste = data.resultList ?? [];
  const son = liste[liste.length - 1];
  return son?.tarih.slice(0, 10) ?? null;
}

/**
 * Toplu uçların ortak gövdesi. fon-verileri sayfasının gönderdiği alanların
 * tamamı zorunlu: `aramaMetni`, `sfonTurKod`, `dil`, `sFonTurKod` eksikse
 * sunucu NullPointerException döndürüyor (ölçüldü — beş farklı gövde denendi,
 * ancak tam küme kabul edildi). Tarihler YYYYMMDD.
 */
function topluGovde(bas: string, bit: string, fonKodu: string | null): Record<string, unknown> {
  return {
    fonTipi: 'YAT', fonKodu, aramaMetni: null, fonTurKod: null, fonGrubu: null,
    sfonTurKod: null, fonTurAciklama: null, kurucuKod: null,
    basTarih: bas.replace(/-/g, ''), bitTarih: bit.replace(/-/g, ''),
    basSira: 1, bitSira: 100000, dil: 'TR', sFonTurKod: '', fonKod: '', fonGrup: '', fonUnvanTip: '',
  };
}

const TOPLU_HEADERS = { ...HEADERS, Referer: 'https://www.tefas.gov.tr/tr/fon-verileri' };

async function topluPost<T>(url: string, govde: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: TOPLU_HEADERS, body: JSON.stringify(govde) });
  if (!res.ok) throw new Error(`tefas ${url}: http ${String(res.status)}`);
  const d = (await res.json()) as { errorMessage: string | null; resultList: T[] | null };
  // Boş sonuç kümesinde sunucu "Index 0 out of bounds" mesajı döndürüyor;
  // bu hata değil, o aralıkta veri yok demek.
  if (d.errorMessage !== null && !/out of bounds/.test(d.errorMessage)) {
    throw new Error(`tefas ${url}: ${d.errorMessage}`);
  }
  return (d.resultList ?? []) as unknown as T;
}

/** Bir günün toplu fon verisi. */
export interface TefasTopluGun {
  fundCode: string;
  title: string;
  /** YYYY-MM-DD */
  tradeDate: string;
  navPerShare: number;
  sharesActive: number | null;
  investorCount: number | null;
  aum: number | null;
}

/**
 * Tüm yatırım fonlarının günlük verisi, tarih aralığıyla, TEK istekte.
 *
 * Ölçüldü: 5 günlük aralık 8157 kayıt (2040 fon x 4 iş günü) döndürdü ve
 * takip edilen fonların tamamı listedeydi. 15 Eylül için tekil uçtan
 * yazılmış veriyle karşılaştırıldı: fiyat, yatırımcı, büyüklük 74/74 aynı.
 *
 * `fonKodu` verilirse tek fona iner — takip listesine yeni fon eklendiğinde
 * tek fon yolu bunu kullanır, ayrı uç yok.
 */
export async function topluFonBilgisi(
  bas: string, bit: string, fonKodu: string | null = null,
): Promise<TefasTopluGun[]> {
  interface Satir {
    fonKodu: string; fonUnvan: string; tarih: string; fiyat: number | null;
    tedPaySayisi: number | null; kisiSayisi: number | null; portfoyBuyukluk: number | null;
  }
  const l = await topluPost<Satir[]>(`${BASE}/fonGnlBlgSiraliGetir`, topluGovde(bas, bit, fonKodu));
  const out: TefasTopluGun[] = [];
  for (const s of l) {
    if (s.fiyat === null) continue;
    out.push({
      fundCode: s.fonKodu, title: s.fonUnvan, tradeDate: s.tarih.slice(0, 10),
      navPerShare: s.fiyat, sharesActive: s.tedPaySayisi,
      investorCount: s.kisiSayisi, aum: s.portfoyBuyukluk,
    });
  }
  return out;
}

/** Bir fonun bir günkü varlık sınıfı dağılımı: alan kodu → yüzde. */
export interface TefasDagilim {
  fundCode: string;
  tradeDate: string;
  /** Sıfır olmayan alanlar; kod anlamları için tefas-dagilim.ts. */
  yuzdeler: Record<string, number>;
}

/**
 * Tüm fonların varlık sınıfı dağılımı, günlük, TEK istekte.
 *
 * 54 sabit alan kodu (hs, dt, tr, vmtl, byf, yyf…). KAP'ın aylık PDF'inin
 * yerini alır: şablon çeşitliliği yok, etiket normalizasyonu yok.
 */
export async function topluDagilim(bas: string, bit: string): Promise<TefasDagilim[]> {
  type Satir = { fonKodu: string; tarih: string } & Record<string, unknown>;
  const l = await topluPost<Satir[]>(`${BASE}/dagilimSiraliGetirT`, topluGovde(bas, bit, null));
  const out: TefasDagilim[] = [];
  for (const s of l) {
    const yuzdeler: Record<string, number> = {};
    for (const [k, v] of Object.entries(s)) {
      if (k === 'fonKodu' || k === 'fonUnvan' || k === 'tarih' || k === 'rn') continue;
      if (typeof v === 'number' && v !== 0) yuzdeler[k] = v;
    }
    out.push({ fundCode: s.fonKodu, tradeDate: s.tarih.slice(0, 10), yuzdeler });
  }
  return out;
}
