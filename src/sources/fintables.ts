/**
 * fintables.com kaynak istemcisi.
 *
 * api.fintables.com Cloudflare arkasında ve koruma TLS/HTTP2 parmak izine
 * (JA3/JA4) dayanıyor: düz fetch/curl `cf-mitigated: challenge` ile 403 alır,
 * tam Chrome header seti bile yetmez. Çözüm Chrome'un TLS parmak izini taklit
 * eden bir HTTP client (impit) — tarayıcı gerekmez.
 *
 * Bu proje FON BAŞINA endpoint'leri kullanır. Sebep: her biri tek istekte tüm
 * günlük geçmişi döndürüyor (volatility 16 ay, cashflow istenen aralık), oysa
 * toplu endpoint'ler gün başına bir istek gerektiriyor. Ayrıca toplu
 * /funds/cashflow/ 1 günlük pencerede tutarsız değer veriyor; fon başına olan
 * AUM aritmetiğiyle %0,001 içinde uyuşuyor.
 *
 * Parse fonksiyonları ağdan bağımsızdır ve fixture ile test edilir.
 */
import { Impit } from 'impit';

const API_BASE = 'https://api.fintables.com';
const HEADERS = {
  Accept: 'application/json',
  Referer: 'https://fintables.com/',
  Origin: 'https://fintables.com',
} as const;

/** `/funds/` — fon evreni ve statik meta. */
export interface FundUniverseRow {
  code: string;
  title: string;
  /** mutual | pension | realestate | exchange */
  fundType: string | null;
  /** Şemsiye fon tipi, ör. "Para Piyasası Şemsiye Fonu". Bazı fonlarda null. */
  umbrellaType: string | null;
  managementCompanyId: string | null;
  isByf: boolean;
}

/** `/funds/{KOD}/price/` — gerçek birim fiyat. Türetilmez, buradan alınır. */
export interface PricePoint {
  date: string; // YYYY-MM-DD
  price: number;
  prevPrice: number | null;
  marketCap: number | null;
}

/** `/funds/{KOD}/volatility/` — günlük getiri serisi. */
export interface DailyReturn {
  date: string;
  /** Yüzde. API oran döndürür (0.0027), burada 0.27'ye çevrilir. */
  returnPct: number;
}

/** `/funds/{KOD}/cashflow/` — günlük net giriş − çıkış, TL. */
export interface FlowPoint {
  date: string;
  netFlow: number;
}

/** Varlık sınıfı ağırlığı. Kaldıraçlı fonlarda negatif olabilir. */
export interface AllocationEntry {
  assetClass: string;
  weightPct: number;
}

/** `/funds/{KOD}/info/` — ticari şartlar ve anlık sayaçlar. */
export interface FundInfo {
  /** Stopaj yüzdesi. API oran döndürür (0.175), burada 17.5'e çevrilir. */
  taxPct: number | null;
  managementFeePct: number | null;
  buyValorDays: number | null;
  sellValorDays: number | null;
  risk: number | null;
  sharesActive: number | null;
  investorCount: number | null;
  allocation: AllocationEntry[];
}

/** `/funds/yield/` — tüm evren için dönemsel getiri, çağrı anı itibarıyla. */
export interface YieldRow {
  code: string;
  title: string;
  /** Yalnız `start`/`end` verildiğinde gelir; parametresiz çağrıda alan yoktur. */
  yieldCustom: number | null;
  yield1m: number | null;
  yield3m: number | null;
  yield6m: number | null;
  yieldYtd: number | null;
  yield1y: number | null;
  yield3y: number | null;
  yield5y: number | null;
}

function asRecord(raw: unknown, ctx: string): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`fintables ${ctx}: JSON nesnesi bekleniyordu`);
  }
  return raw as Record<string, unknown>;
}

function reqString(row: Record<string, unknown>, key: string, ctx: string): string {
  const v = row[key];
  if (typeof v !== 'string') throw new Error(`fintables ${ctx}: \`${key}\` string bekleniyordu`);
  return v;
}

function optString(row: Record<string, unknown>, key: string): string | null {
  const v = row[key];
  return typeof v === 'string' ? v : null;
}

/**
 * Sayısal alan. `null` MEŞRUDUR ve null döner: API paydası sıfır olan türev
 * alanları ve bazı fon tiplerinde hesaplanamayan alanları null verir. Alanın
 * hiç GELMEMESİ ise şema kaymasıdır ve patlar — biri veriyi, diğeri sözleşmeyi
 * ilgilendirir.
 */
function numField(row: Record<string, unknown>, key: string, ctx: string): number | null {
  if (!(key in row)) throw new Error(`fintables ${ctx}: \`${key}\` alanı yanıtta yok`);
  const v = row[key];
  if (v === null) return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error(`fintables ${ctx}: \`${key}\` sayı veya null bekleniyordu`);
  }
  return v;
}

function toIsoDate(v: unknown): string | null {
  return typeof v === 'string' && v.length >= 10 ? v.slice(0, 10) : null;
}

export function parseFundUniverse(raw: unknown): FundUniverseRow[] {
  if (!Array.isArray(raw)) throw new Error('fintables funds: dizi bekleniyordu');
  return raw.map((r) => {
    const row = asRecord(r, 'funds');
    const company = row['management_company'];
    return {
      code: reqString(row, 'code', 'funds'),
      title: reqString(row, 'title', 'funds'),
      fundType: optString(row, 'fund_type'),
      umbrellaType: optString(row, 'type'),
      managementCompanyId:
        typeof company === 'object' && company !== null
          ? optString(asRecord(company, 'funds.management_company'), 'code')
          : null,
      isByf: row['is_byf'] === true,
    };
  });
}

export function parsePrice(raw: unknown): PricePoint {
  const row = asRecord(raw, 'price');
  const date = toIsoDate(row['day']);
  const price = numField(row, 'price', 'price');
  if (date === null) throw new Error('fintables price: `day` tarihi yok');
  if (price === null) throw new Error('fintables price: `price` null gelemez');
  return {
    date,
    price,
    prevPrice: numField(row, 'prev_price', 'price'),
    marketCap: numField(row, 'market_cap', 'price'),
  };
}

/**
 * `[{x, daily_return, y}]` → günlük getiri serisi, yüzdeye çevrilmiş.
 *
 * Tarihler kaynağın verdiği gibi saklanır, yerel saate göre filtrelenmez:
 * fintables'ın gün etiketi yerel takvimin bir gün ilerisinde olabiliyor
 * (2026-08-30'da /price/ `day: 2026-08-31` döndürdü). Yerel güne göre kırpmak
 * en yeni ve en önemli satırı düşürür.
 */
export function parseVolatility(raw: unknown): DailyReturn[] {
  if (!Array.isArray(raw)) throw new Error('fintables volatility: dizi bekleniyordu');
  const out: DailyReturn[] = [];
  for (const r of raw) {
    const row = asRecord(r, 'volatility');
    const date = toIsoDate(row['x']);
    const ratio = numField(row, 'daily_return', 'volatility');
    if (date === null || ratio === null) continue;
    out.push({ date, returnPct: ratio * 100 });
  }
  return out;
}

/** `{results:[{time, value}]}` → günlük net akış serisi. */
export function parseCashflow(raw: unknown): FlowPoint[] {
  const results = asRecord(raw, 'cashflow')['results'];
  if (!Array.isArray(results)) throw new Error('fintables cashflow: `results` dizisi yok');
  const out: FlowPoint[] = [];
  for (const r of results) {
    const row = asRecord(r, 'cashflow');
    const date = toIsoDate(row['time']);
    const value = numField(row, 'value', 'cashflow');
    if (date === null || value === null) continue;
    out.push({ date, netFlow: value });
  }
  return out;
}

export function parseInfo(raw: unknown): FundInfo {
  const row = asRecord(raw, 'info');
  const tax = numField(row, 'tax', 'info');
  const lastAsset = row['last_asset'];
  const allocation: AllocationEntry[] = [];
  if (Array.isArray(lastAsset)) {
    for (const a of lastAsset) {
      const entry = asRecord(a, 'info.last_asset');
      const title = optString(entry, 'title');
      const value = numField(entry, 'value', 'info.last_asset');
      if (title !== null && value !== null) allocation.push({ assetClass: title, weightPct: value });
    }
  }
  return {
    taxPct: tax === null ? null : tax * 100,
    managementFeePct: numField(row, 'management_fee', 'info'),
    buyValorDays: numField(row, 'buy_valor', 'info'),
    sellValorDays: numField(row, 'sell_valor', 'info'),
    risk: numField(row, 'risk', 'info'),
    sharesActive: numField(row, 'shares_active', 'info'),
    investorCount: numField(row, 'investor_count', 'info'),
    allocation,
  };
}

export function parseYield(raw: unknown): YieldRow[] {
  const results = asRecord(raw, 'yield')['results'];
  if (!Array.isArray(results)) throw new Error('fintables yield: `results` dizisi yok');
  return results.map((r) => {
    const row = asRecord(r, 'yield');
    return {
      code: reqString(row, 'code', 'yield'),
      title: optString(row, 'title') ?? '',
      // Parametresiz çağrıda bu alan hiç gelmez; numField eksik alanı şema
      // kayması sayıp patlardı, o yüzden varlığı ayrıca kontrol edilir.
      yieldCustom: 'yield_custom' in row ? numField(row, 'yield_custom', 'yield') : null,
      yield1m: numField(row, 'yield_1m', 'yield'),
      yield3m: numField(row, 'yield_3m', 'yield'),
      yield6m: numField(row, 'yield_6m', 'yield'),
      yieldYtd: numField(row, 'yield_ytd', 'yield'),
      yield1y: numField(row, 'yield_1y', 'yield'),
      yield3y: numField(row, 'yield_3y', 'yield'),
      yield5y: numField(row, 'yield_5y', 'yield'),
    };
  });
}


// ─── Toplu (bulk) pencere endpoint'leri ─────────────────────────────────────
// Fon büyüklüğünün geçmişi için tek kaynak bunlar: fon başına bir AUM endpoint'i
// yok (/funds/{KOD}/aum|size|growth|market-cap|shares|history|statistics/ hepsi
// 404). Bir istek tüm evreni verdiği için maliyeti gece +2 istektir.

/** `/funds/growth/?start=&end=` — pencere sonundaki büyüklük ve pay adedi. */
export interface WindowSize {
  code: string;
  endAum: number | null;
  endShareCount: number | null;
  /** Pencere getirisi; iş günü tespiti için kullanılır, saklanmaz. */
  changePct: number | null;
}

/**
 * `/funds/cashflow/?start=&end=` — pencere sonundaki yatırımcı sayısı.
 *
 * Bu endpoint `cumulative_cashflow` da döndürür ama **bilerek alınmaz**:
 * 1 günlük pencerede AUM aritmetiğinden 5 kat sapıyor (RQ-0002'de ölçüldü).
 * Net akış yalnız fon başına `/funds/{KOD}/cashflow/` endpoint'inden gelir.
 */
export interface WindowInvestors {
  code: string;
  endInvestorCount: number | null;
}

function windowResults(raw: unknown, ctx: string): Record<string, unknown>[] {
  const results = asRecord(raw, ctx)['results'];
  if (!Array.isArray(results)) throw new Error(`fintables ${ctx}: \`results\` dizisi yok`);
  return results.map((r) => asRecord(r, ctx));
}

export function parseWindowSize(raw: unknown): WindowSize[] {
  return windowResults(raw, 'growth').map((row) => ({
    code: reqString(row, 'code', 'growth'),
    endAum: numField(row, 'end_aum', 'growth'),
    endShareCount: numField(row, 'end_shares_active', 'growth'),
    changePct: numField(row, 'aum_change', 'growth'),
  }));
}

export function parseWindowInvestors(raw: unknown): WindowInvestors[] {
  return windowResults(raw, 'cashflow-window').map((row) => ({
    code: reqString(row, 'code', 'cashflow-window'),
    endInvestorCount: numField(row, 'end_investor_count', 'cashflow-window'),
  }));
}

/**
 * Hafta sonu ve tatilde API son iş gününün değerini taşır (carry-forward): o
 * pencerede pratikte her fonun değişimi 0 olur. Ölçüm: 2026-08-22/23'te %99.9,
 * iş günlerinde %0.1 — 0.90 eşiği ikisinin de çok uzağında. Cumartesi ve Pazar
 * takvimden bilindiği için istek atılmaz; bu kontrol resmî tatiller içindir.
 */
export function isCarriedForwardWindow(rows: WindowSize[], threshold = 0.9): boolean {
  if (rows.length === 0) return true;
  const unchanged = rows.filter((r) => (r.changePct ?? 0) === 0).length;
  return unchanged / rows.length >= threshold;
}

/** Chrome TLS taklidiyle (impit) API'ye tarayıcısız erişir. Durumsuz. */
export class FintablesClient {
  private readonly impit: Impit;

  constructor() {
    this.impit = new Impit({ browser: 'chrome' });
  }

  private async fetchJson(path: string): Promise<unknown> {
    const res = await this.impit.fetch(`${API_BASE}${path}`, { headers: { ...HEADERS } });
    if (res.status !== 200) throw new Error(`fintables ${path}: http ${res.status}`);
    return JSON.parse(await res.text()) as unknown;
  }

  async fundUniverse(): Promise<FundUniverseRow[]> {
    return parseFundUniverse(await this.fetchJson('/funds/'));
  }

  async price(fundCode: string): Promise<PricePoint> {
    return parsePrice(await this.fetchJson(`/funds/${fundCode}/price/`));
  }

  async volatility(fundCode: string): Promise<DailyReturn[]> {
    return parseVolatility(await this.fetchJson(`/funds/${fundCode}/volatility/`));
  }

  async cashflow(fundCode: string, startDate: string, endDate: string): Promise<FlowPoint[]> {
    const q = `?start_date=${startDate}&end_date=${endDate}`;
    return parseCashflow(await this.fetchJson(`/funds/${fundCode}/cashflow/${q}`));
  }

  async info(fundCode: string): Promise<FundInfo> {
    return parseInfo(await this.fetchJson(`/funds/${fundCode}/info/`));
  }

  /**
   * Dönemsel getiri. `start`/`end` verilirse her satıra o pencerenin getirisi
   * `yieldCustom` olarak eklenir — tüm evren için tek istek.
   */
  async yields(window?: { start: string; end: string }): Promise<YieldRow[]> {
    const q = window ? `?start=${window.start}&end=${window.end}` : '';
    return parseYield(await this.fetchJson(`/funds/yield/${q}`));
  }

  /** Pencere sonundaki büyüklük ve pay adedi — tüm evren, tek istek. */
  async windowSize(start: string, end: string): Promise<WindowSize[]> {
    return parseWindowSize(await this.fetchJson(`/funds/growth/?start=${start}&end=${end}`));
  }

  /** Pencere sonundaki yatırımcı sayısı — tüm evren, tek istek. */
  async windowInvestors(start: string, end: string): Promise<WindowInvestors[]> {
    return parseWindowInvestors(
      await this.fetchJson(`/funds/cashflow/?start=${start}&end=${end}`),
    );
  }

  /** Ham JSON — keşif ve fixture üretimi için. */
  async raw(path: string): Promise<unknown> {
    return this.fetchJson(path);
  }
}
