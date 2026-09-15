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
