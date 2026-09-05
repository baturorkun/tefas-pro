/**
 * fvt.com.tr kaynak istemcisi.
 *
 * Fonların HİSSE kırılımı için tek kaynak. Fintables'ın `/funds/{KOD}/info/`
 * ucu yalnız varlık sınıfı veriyor (Hisse Senedi %88,23) ve TEFAS kalem
 * düzeyinde veri yayımlamıyor — ölçülerek doğrulandı.
 *
 * Cloudflare koruması yok: düz fetch yetiyor. Tek özel başlık `x-device-id`;
 * bir token ucu (`/api/app-token`) var ama bu çağrılar için gerekmiyor.
 *
 * İki ayrı zaman ekseni:
 *   - distribution  ay sonu ağırlıkları, fon başına bir istek
 *   - chart-data    günlük kapanışlar, istek başına EN FAZLA 10 sembol
 *
 * Parse fonksiyonları ağdan bağımsızdır ve fixture ile test edilir.
 */
const API_BASE = 'https://fvt.com.tr/api';

/** Uç istek başına bu kadar sembol döndürüyor: 60 gönderildi, 10 geldi. */
export const CHART_SYMBOL_LIMIT = 10;

/** `/funds/{KOD}/distribution` — fonun ay sonu hisse kırılımı. */
export interface StockHolding {
  stockCode: string;
  company: string | null;
  sector: string | null;
  weightPct: number;
  /** Fonun bir önceki ay açıkladığı ağırlık. */
  prevWeightPct: number | null;
  weightChange: number | null;
}

export interface FundDistribution {
  /** Fonun portföyünü açıkladığı tarih (YYYY-MM-DD). */
  asOfDate: string | null;
  holdings: StockHolding[];
}

/** `/stocks/chart-data` — hisse günlük kapanışları. */
export interface StockClose {
  stockCode: string;
  tradeDate: string;
  close: number;
}

const say = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const metin = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t;
};

/**
 * Yanıt gövdesi `{success, data, timestamp}` sarmalında geliyor. `data` null
 * dönebiliyor (ölçüldü: holdings-history hep null) — bu hata değil, veri yok
 * demek; çağıran boş liste görür.
 */
function icerik(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return null;
  return (raw as { data?: unknown }).data ?? null;
}

export function parseDistribution(raw: unknown): FundDistribution {
  const d = icerik(raw);
  if (typeof d !== 'object' || d === null) return { asOfDate: null, holdings: [] };
  const items = (d as { items?: unknown }).items;
  const meta = (d as { meta?: unknown }).meta;
  // aciklamaTarihi ISO damgası; gün kısmı alınır. Saat dilimi taşımıyor,
  // saatiyle saklamak yanlış bir kesinlik olurdu.
  const tarih = typeof meta === 'object' && meta !== null
    ? metin((meta as { aciklamaTarihi?: unknown }).aciklamaTarihi)
    : null;
  const holdings: StockHolding[] = [];
  if (Array.isArray(items)) {
    for (const x of items) {
      if (typeof x !== 'object' || x === null) continue;
      const r = x as Record<string, unknown>;
      const kod = metin(r['hisseKodu']);
      const agirlik = say(r['agirlik']);
      // Kodsuz ya da ağırlıksız kalem atlanır: ikisi de olmadan satır
      // hiçbir soruyu cevaplamıyor.
      if (kod === null || agirlik === null) continue;
      holdings.push({
        stockCode: kod.toUpperCase(),
        company: metin(r['sirketAdi']),
        sector: metin(r['sektorAdi']),
        weightPct: agirlik,
        prevWeightPct: say(r['eskiAgirlik']),
        weightChange: say(r['fark']),
      });
    }
  }
  return { asOfDate: tarih === null ? null : tarih.slice(0, 10), holdings };
}

/**
 * Kaynak aynı sembol+tarih çiftini iki kez döndürebiliyor (ölçüldü: 69
 * istekten 7'si çift kayıt taşıdı). Tekilleştirilmeden yazılırsa tek
 * ifadede aynı satıra iki kez dokunulmuş oluyor ve veritabanı reddediyor.
 * Son değer kazanır: yanıt zaman sırasında geliyor.
 */
export function parseChartData(raw: unknown): StockClose[] {
  const d = icerik(raw);
  if (!Array.isArray(d)) return [];
  const tekil = new Map<string, StockClose>();
  for (const s of d) {
    if (typeof s !== 'object' || s === null) continue;
    const kod = metin((s as { symbol?: unknown }).symbol);
    const seri = (s as { data?: unknown }).data;
    if (kod === null || !Array.isArray(seri)) continue;
    for (const p of seri) {
      if (typeof p !== 'object' || p === null) continue;
      const r = p as Record<string, unknown>;
      const gun = metin(r['x']);
      const kapanis = say(r['close']);
      // Kapanışı sıfır olan gün veri değil, boşluk: fiyat sıfır olmuyor.
      if (gun === null || kapanis === null || kapanis <= 0) continue;
      const k = kod.toUpperCase();
      const t = gun.slice(0, 10);
      tekil.set(`${k}|${t}`, { stockCode: k, tradeDate: t, close: kapanis });
    }
  }
  return [...tekil.values()];
}

/** Sembolleri ucun kabul ettiği boyutta gruplara böler. */
export function chunkSymbols(
  symbols: readonly string[], size = CHART_SYMBOL_LIMIT,
): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < symbols.length; i += size) out.push([...symbols.slice(i, i + size)]);
  return out;
}

export class FvtClient {
  /**
   * Cihaz kimliği: uç bunu istiyor ama doğrulamıyor. Koşum başına tek değer
   * üretilir — her istekte değiştirmek sunucuya her seferinde yeni bir istemci
   * gibi görünmek olurdu.
   */
  private readonly deviceId: string;

  constructor(deviceId?: string) {
    this.deviceId = deviceId ?? [...crypto.getRandomValues(new Uint8Array(8))]
      .map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  private async fetchJson(path: string): Promise<unknown> {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        Accept: 'application/json',
        'x-device-id': this.deviceId,
        Referer: 'https://fvt.com.tr/',
      },
    });
    if (res.status !== 200) throw new Error(`fvt ${path}: http ${String(res.status)}`);
    return await res.json();
  }

  async distribution(fundCode: string): Promise<FundDistribution> {
    return parseDistribution(await this.fetchJson(`/funds/${fundCode}/distribution`));
  }

  /** En fazla CHART_SYMBOL_LIMIT sembol; fazlası sessizce düşer. */
  async chartData(symbols: readonly string[], range = '1M'): Promise<StockClose[]> {
    const q = encodeURIComponent(symbols.join(','));
    return parseChartData(await this.fetchJson(`/stocks/chart-data?symbols=${q}&range=${range}`));
  }
}
