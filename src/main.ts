/**
 * tefas-pro arayüzü.
 *
 * Çerçevesiz tek sayfa uygulaması. Oturum HttpOnly çerezle taşınır, bu yüzden
 * burada token tutulmaz; sunucu 401 dönerse giriş ekranına düşülür.
 *
 * Yapı: giriş ekranı → uygulama iskeleti (sidebar + içerik) → görünümler.
 * Admin görünümleri yalnız admin tipinde çizilir; sunucu ayrıca 403 ile korur,
 * yani menüyü gizlemek tek başına yetki denetimi sayılmaz.
 */
interface Me {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  telegram: string | null;
  type: 'super' | 'admin' | 'user';
  mustChangePassword: boolean;
  /** Geçiş hâlindeyse geçişi yapan superuser; değilse null. */
  actor: { id: number; username: string; fullName: string } | null;
}

interface Transaction {
  buyOrderDate: string | null;
  sellOrderDate: string | null;
  id: number;
  fundCode: string;
  fundTitle: string | null;
  platform: string;
  tradeDate: string;
  units: string | null;
  sellDate: string | null;
  note: string | null;
  /** Getiri günü olmayan işlemde null: sıfır "kâr etmedi" demek olurdu. */
  cost: string | null;
  value: string | null;
  gain: string | null;
  gainPct: string | null;
  /** Pasif kayıtta null: adet henüz belli değil. */
  orderAmount: string | null;
  buyPrice: string | null;
  nowPrice: string | null;
  /** Son bilinen birim fiyat; fiyatı açıklanmamış işlemde tahmin bunun üzerinden. */
  latestNav: string | null;
  latestNavDate: string | null;
  splitRole: 'parent' | 'remainder' | null;
  splitTotal: string | null;
}

interface WatchlistRow {
  fundCode: string;
  title: string | null;
  /** Sunucuda kullanıcının kendi işlemlerinden türetilir. */
  status: 'sold' | 'watch';
  addedAt: string;
  note: string | null;
  navDate: string | null;
  navPerShare: string | null;
  dailyReturnPct: string | null;
  netFlow: string | null;
  taxPct: string | null;
  sellValorDays: number | null;
}

interface UserRow {
  id: number;
  username: string;
  fullName: string;
  /** Alanın eklenmesinden önceki kayıtlarda boş olabilir. */
  email: string | null;
  telegram: string | null;
  type: 'super' | 'admin' | 'user';
  isActive: boolean;
}

interface RankEntry {
  fundCode: string;
  title: string | null;
  returnPct: string;
  days: number | null;
  /** Açık pozisyonum var mı. Dolu / içi boş bar ayrımı buna bakar. */
  owned: boolean;
  /** Yalnız pozisyon sıralamasında dolu: o fondaki kâr/zarar, TL. */
  gain?: string | null;
  /** Kullanıcının son bir aylık getirisi (%), yalnız elde tuttuğu günlerden. */
  return1m?: string | null;
  /** Kullanıcının son üç aylık getirisi (%); pencereyi doldurmayanda süre kadar. */
  return3m?: string | null;
  /** Fonun kendi son bir aylık getirisi (%). Sıralamaya girmez; ipucunda bağlam. */
  fundReturn1m?: string | null;
  /**
   * Kullanıcının alımdan beri getirisi (%). `returnPct` seçilen ölçüte göre
   * değiştiği için ayrı taşınıyor: aylık sıralamada returnPct fonun sayısı
   * oluyor ve kullanıcının kendi kazancı kaybolurdu.
   */
  ownPct?: string | null;
  /** Yalnız akış sıralamasında dolu: pencere net akışı, TL. */
  flow?: string | null;
  /** Yalnız yatırımcı sıralamasında dolu: pencere değişimi, kişi. */
  people?: string | null;
}

interface PortfolioRow {
  fundCode: string;
  title: string | null;
  dailyReturnPct: string | null;
  return1m: string | null;
  return3m: string | null;
  days: number;
  units: string;
  cost: string;
  value: string;
  gain: string;
  returnPct: string;
  navDate: string | null;
  asOfDate: string | null;
  /** Fonun son açıkladığı varlık kırılımı; ağırlığa göre sıralı. */
  assets: { assetClass: string; weightPct: string; asOfDate: string }[];
}

/** /api/portfolio/headline — Panel'in de okuduğu portfolioHeadline sonucu. */
interface PortfolioHeadline {
  value: string;
  openGain: string;
  realizedGain: string;
  totalGain: string;
  netCapital: string;
  totalPct: string | null;
  dayGain: string | null;
  dayPct: string | null;
  dayDate: string | null;
  weightedDays: number | null;
  firstBuyDate: string | null;
}

interface PositionSummary {
  cost: string;
  value: string;
  gain: string;
  gainPct: string;
  realizedGain: string;
  winners: number;
  losers: number;
}

interface Dashboard {
  metrics: {
    watchlist: number;
    trackedFunds: number;
    openPositions: number;
    /** Eski bir sunucu sürümü bu alanları göndermeyebilir. */
    openLots?: number;
    watchlistSold?: number;
    dataDate: string | null;
    pendingFunds: number;
    lastRun: { id: number; status: string; finishedAt: string | null } | null;
    /** Eski bir sunucu sürümü bunu göndermeyebilir; kutular tireye düşer. */
    portfolio?: {
      value: string;
      openGain: string;
      realizedGain: string;
      totalGain: string;
      netCapital: string;
      totalPct: string | null;
      dayGain: string | null;
      dayPct: string | null;
      dayDate: string | null;
    } | null;
  };
  watchlistRanks: Record<string, { top: RankEntry[]; bottom: RankEntry[] }>;
  positions: {
    summary: PositionSummary | null;
    /** Alımdan beri toplam getiriye göre. */
    top: RankEntry[];
    bottom: RankEntry[];
    /** Fonun kendi son bir aylık getirisine göre; sunucuda sıralanmış. */
    top1m: RankEntry[];
    bottom1m: RankEntry[];
    top3m: RankEntry[];
    bottom3m: RankEntry[];
  };
  /** Para akışı: `returnPct` oranı (%), `flow` TL tutarını taşır. */
  flowRanks: Record<string, { top: RankEntry[]; bottom: RankEntry[] }>;
  /** Yatırımcı sayısı: `returnPct` oranı (%), `people` kişi değişimini taşır. */
  investorRanks: Record<string, { top: RankEntry[]; bottom: RankEntry[] }>;
}

interface FundStockRow {
  stockCode: string;
  company: string | null;
  sector: string | null;
  weightPct: string;
  prevWeightPct: string | null;
  weightChange: string | null;
  return1w: string | null;
  return1m: string | null;
}

interface FundDetail {
  fundCode: string;
  title: string | null;
  value: string;
  assets: { assetClass: string; weightPct: string }[];
  assetsAsOf: string | null;
  stocks: FundStockRow[];
  stocksAsOf: string | null;
}

interface StockFundRow {
  fundCode: string;
  title: string | null;
  weightPct: string;
  value: string;
  owned: boolean;
  prevWeightPct: string | null;
  weightChange: string | null;
  asOfDate: string;
}

interface StockRow {
  stockCode: string;
  company: string | null;
  sector: string | null;
  value: string;
  weightPct: string;
  funds: StockFundRow[];
  ownedFunds: number;
  watchFunds: number;
  return1w: string | null;
  return1m: string | null;
}

interface StockAllocation {
  stocks: StockRow[];
  classified: string;
  portfolioValue: string;
  asOfFrom: string | null;
  asOfTo: string | null;
  unknownFunds: string[];
}

interface AllocationGroup {
  key: string;
  funds: number;
  lots: number;
  cost: string;
  value: string;
  gain: string;
  weightPct: string;
}

interface AssetGroup {
  key: string;
  funds: number;
  value: string;
  weightPct: string;
}

interface Allocation {
  total: { funds: number; lots: number; cost: string; value: string; gain: string };
  byBank: AllocationGroup[];
  byCategory: AllocationGroup[];
  byAsset: {
    groups: AssetGroup[];
    classified: string;
    unknownValue: string;
    unknownFunds: string[];
  };
  assetAsOfFrom: string | null;
  assetAsOfTo: string | null;
}

interface ClosedPositionRow {
  fundCode: string;
  title: string | null;
  platform: string;
  buyDate: string;
  sellDate: string;
  heldDays: number;
  units: string;
  buyValue: string;
  sellValue: string;
  realizedGain: string;
  realizedPct: string;
}

interface IngestRunRow {
  id: number;
  source: string;
  startedAt: string;
  finishedAt: string | null;
  seconds: number | null;
  status: string;
  rowsUpserted: number;
  fundsOk: number;
  fundsFailed: number;
  lastError: string | null;
}

interface BankRow {
  name: string;
  usage: number;
}

interface PeriodRow {
  label: string;
  benchPct: string | null;
  diff: string | null;
  startDate: string;
  endDate: string;
  days: number;
  gain: string;
  pct: string | null;
}

interface MonthlyPeriod extends PeriodRow {
  month: string;
  weeks: PeriodRow[];
}

interface PerformancePoint {
  date: string;
  /** Sermaye hareketinden arındırılmış değer — grafiğin çizgisi. */
  value: string;
  /** Organik günlük getiri (%). Pencerenin ilk gününde null. */
  dailyPct: string | null;
  /** Aynı para benchmark fonunda dursaydı değeri. Veri yoksa null. */
  benchValue?: string | null;
  /** Benchmark fonun o günkü getirisi (%) — alt panelin çizgisi. */
  benchDailyPct?: string | null;
}

interface PerformanceSeries {
  points: PerformancePoint[];
  totalPct: string | null;
  benchCode: string;
  benchPct: string | null;
  benchOwned: boolean;
}

type ViewId =
  | 'dashboard' | 'portfolio' | 'closed' | 'cash' | 'periods' | 'market'
  | 'allocation' | 'stocks' | 'chat' | 'transactions' | 'watchlist' | 'prefs'
  | 'profile' | 'users' | 'banks' | 'sysfunds' | 'runs' | 'settings';

const root = document.getElementById('app');

// ─── Yardımcılar ────────────────────────────────────────────────────────────

/**
 * Süren istek sayacı ve üstteki ilerleme çubuğu.
 *
 * Sayaç `api()` içinde tutuluyor: bütün ağ istekleri oradan geçiyor ve
 * gösterge her ekranı ayrı ayrı düzenlemeden çalışıyor.
 *
 * Çubuk GECİKMELİ açılıyor. Anında açılsaydı 40 ms süren bir istekte açılıp
 * kapanır ve düzeltmeye çalıştığımız göz kırpmanın aynısını üretirdi. Eşiğin
 * altında kalan istek hiç iz bırakmıyor; zaten kullanıcı da beklemiyor.
 */
const YUKLEME_GECIKME_MS = 180;
let acikIstek = 0;
let yuklemeZamani: ReturnType<typeof setTimeout> | null = null;

function yuklemeCubugu(): HTMLElement | null {
  return document.getElementById('yukleme');
}

function yuklemeBasladi(): void {
  acikIstek += 1;
  if (acikIstek > 1 || yuklemeZamani !== null) return;
  yuklemeZamani = setTimeout(() => {
    yuklemeZamani = null;
    // Sayaç bu arada sıfırlanmış olabilir: istek eşikten önce bitmiştir.
    if (acikIstek > 0) yuklemeCubugu()?.classList.add('acik');
  }, YUKLEME_GECIKME_MS);
}

function yuklemeBitti(): void {
  acikIstek = Math.max(0, acikIstek - 1);
  if (acikIstek > 0) return;
  if (yuklemeZamani !== null) {
    clearTimeout(yuklemeZamani);
    yuklemeZamani = null;
  }
  yuklemeCubugu()?.classList.remove('acik');
}

async function api(path: string, init?: RequestInit): Promise<unknown> {
  yuklemeBasladi();
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } finally {
    // Sayaç yanıt gelir gelmez düşüyor, gövde ayrıştırılmadan önce: bekleme
    // ağda, JSON.parse'ta değil.
    yuklemeBitti();
  }
  const body: unknown = res.status === 204 ? null : await res.json();
  if (!res.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error: unknown }).error)
        : `HTTP ${String(res.status)}`;
    // Gövde hataya iliştiriliyor: bazı hatalar kullanıcıya sorulacak bir
    // durum taşıyor (mükerrer kayıt uyarısı gibi) ve metni ayrıştırmak
    // kırılgan olurdu.
    throw Object.assign(new Error(message), { status: res.status, body });
  }
  return body;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const c of children) node.append(c);
  return node;
}

function badge(text: string, kind: string): HTMLElement {
  return el('span', { class: `status-badge status-${kind}` }, [text]);
}

/** Rol adı tek yerde: üç ayrı yerde yazılınca biri 'super'ı unutuyordu. */
function rolAdi(type: 'super' | 'admin' | 'user'): string {
  return type === 'super' ? 'Superuser' : type === 'admin' ? 'Yönetici' : 'Kullanıcı';
}

function errorBox(message: string): HTMLElement {
  return el('p', { class: 'error' }, [message]);
}

/**
 * Büyük TL tutarlarını okunur kısaltır: 1.479.274.366 → 1,48 mr ₺
 *
 * Kısaltmalar tek harf: b bin, m milyon. Milyar mr kalır, çünkü m
 * milyona ayrılmış.
 */
/**
 * Kısaltılmış tutar, tam değeri ipucunda.
 *
 * "129,17 b ₺" sütunu dar tutuyor ama kaç lira olduğu okunmuyordu — soruldu.
 * Üzerine gelince tam rakam çıkıyor; sütun genişlemiyor.
 */
function moneyCell(raw: string | null): HTMLElement {
  const kisa = money(raw);
  if (raw === null || raw === '' || !Number.isFinite(Number(raw))) {
    return el('span', {}, [kisa]);
  }
  return el('span', {
    // Tam tutar da kuruşsuz: kısaltmanın açığı "ne kadar" sorusuna cevap,
    // kuruş hanesi değil.
    title: `${Number(raw).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺`,
  }, [kisa]);
}

function money(raw: string | null): string {
  if (raw === null || raw === '') return '—';
  const n = Number(raw);
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const fmt = (v: number, suffix: string, digits = 2): string =>
    `${v.toLocaleString('tr-TR', { maximumFractionDigits: digits })} ${suffix}`;
  if (abs >= 1e9) return fmt(n / 1e9, 'mr ₺');
  if (abs >= 1e6) return fmt(n / 1e6, 'm ₺');
  if (abs >= 1e3) return fmt(n / 1e3, 'b ₺');
  // Kuruş yazılmıyor. Kısaltmalardaki virgül başka şey: "3,77 m ₺" içindeki
  // iki hane 770 bin lira demek, atılırsa bilgi gider. Kuruş ise portföy
  // ölçeğinde gürültü — kimse 15,71 ile 16 arasındaki farka bakmıyor.
  return fmt(n, '₺', 0);
}

const AY_ADLARI = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

/**
 * YYYY-AA-GG → "4 Eylül". Başındaki sıfır atılır.
 *
 * Yıl yalnız içinde bulunulan yıldan farklıysa yazılır: her satıra yıl koymak
 * gürültü, ama eski bir tarihi yılsız göstermek onu bu yılmış gibi okutur.
 */
function fiyat(raw: string | null): string {
  if (raw === null || raw === '') return '—';
  const n = Number(raw);
  if (!Number.isFinite(n)) return '—';
  // Ölçek çok geniş — 0,44 ile 9.440 arası. Sabit hane sayısı küçük fiyatta
  // bilgi kaybı, büyük fiyatta gürültü olurdu.
  const digits = Math.abs(n) >= 1000 ? 2 : 4;
  return n.toLocaleString('tr-TR', {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  });
}

/**
 * Bugünün tarihi, KULLANICININ saatine göre.
 *
 * `toISOString()` UTC veriyor: Türkiye'de gece 00:00 ile 03:00 arasında bir
 * önceki günü "bugün" sanıyordu. Ölçüldü — yerel 09 Eylül 00:07'de ekran
 * 8 Eylül diyordu ve o günün para girişleri "gelmiş" yerine "bugün"
 * kutusunda duruyordu.
 */
function bugunISO(): string {
  const d = new Date();
  return `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, '0')}`
    + `-${String(d.getDate()).padStart(2, '0')}`;
}

function gunAd(iso: string | null, yilHep = false): string {
  if (iso === null || iso.length < 10) return '—';
  const [y, a, g] = [iso.slice(0, 4), Number(iso.slice(5, 7)), Number(iso.slice(8, 10))];
  const ay = AY_ADLARI[a - 1] ?? iso.slice(5, 7);
  const buYil = String(new Date().getFullYear());
  // Listelerde bu yıl atlanır, göz yorulmasın diye. Tek başına duran bir
  // tarihte ("ilk alım 18 Mart") yıl yoksa hangi yıl olduğu bilinmiyor.
  return `${String(g)} ${ay}${!yilHep && y === buYil ? '' : ` ${y}`}`;
}

/**
 * Yüzde metni: %13,25. toFixed İngilizce ondalık üretiyor ve tabloda
 * toLocaleString ile biçimlenmiş sayıların yanına düşünce "%61.6" ile
 * "%100,0" aynı sütunda görünüyordu.
 */
function pct(value: number, digits = 2): string {
  return `%${value.toLocaleString('tr-TR', {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  })}`;
}

/** Yatırımcı sayısı değişimi: 105316 → +105.316 kişi */
function people(raw: string | null): string {
  if (raw === null || raw === '') return '—';
  const n = Number(raw);
  if (!Number.isFinite(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toLocaleString('tr-TR')} kişi`;
}

/**
 * İşaretli sayı. Yüzdede iki ondalık kalır — orada anlam taşıyor; TL
 * tutarlarında kuruş gösterilmez, sütunu okumayı zorlaştırıyordu.
 */
/**
 * İşaretli sayının metni. Renkli kutusu olmadan, cümle içine girebilsin diye
 * ayrı: `signed` bunu bir span'a sarıyor, ikisi aynı biçimi üretiyor.
 */
function signedText(raw: string, suffix = '%'): string {
  const n = Number(raw);
  const sign = n > 0 ? '+' : '';
  // Yüzde ve puan hep iki hane: sütun halinde dizildiklerinde sondaki sıfır
  // düşerse rakamlar kayıyor ve "+5,4" ile "+0,93" hizasız duruyor.
  const digits = suffix.includes('₺') ? 0 : 2;
  return `${sign}${n.toLocaleString('tr-TR', {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  })}${suffix}`;
}

function signed(raw: string | null, suffix = '%'): HTMLElement {
  if (raw === null || raw === '') return el('span', { class: 'num' }, ['—']);
  const n = Number(raw);
  const cls = n > 0 ? 'num pos' : n < 0 ? 'num neg' : 'num';
  return el('span', { class: cls }, [signedText(raw, suffix)]);
}

/**
 * Uygulama işareti. Metin kısaltması ("TP") yerine çizim: yükselen bir çizgi
 * ve onu taşıyan sütunlar — fon değeri ve portföy. Tek renk değil, kenar
 * cubuğunda ve giriş ekranında aynı görünsün diye viewBox sabit ve ölçek
 * çağıran tarafından verilir.
 */
function logoMark(size: number): SVGSVGElement {
  const root = svg('svg', {
    viewBox: '0 0 48 48', width: String(size), height: String(size),
    class: 'logo-mark', role: 'img', 'aria-label': 'TEFAS-Pro',
  });
  const defs = svg('defs', {});
  const grad = svg('linearGradient', {
    id: 'tp-line', x1: '10', y1: '34', x2: '38', y2: '12',
    gradientUnits: 'userSpaceOnUse',
  });
  grad.append(
    svg('stop', { 'stop-color': '#45d6bc' }),
    svg('stop', { offset: '1', 'stop-color': '#7fe6cf' }),
  );
  defs.append(grad);
  root.append(
    defs,
    svg('rect', { x: '2', y: '2', width: '44', height: '44', rx: '12', class: 'logo-plate' }),
    // Sütunlar: soldan sağa yükselen üç pozisyon.
    svg('rect', { x: '12', y: '27', width: '5', height: '10', rx: '1.5', class: 'logo-bar' }),
    svg('rect', { x: '21', y: '22', width: '5', height: '15', rx: '1.5', class: 'logo-bar' }),
    svg('rect', { x: '30', y: '16', width: '5', height: '21', rx: '1.5', class: 'logo-bar' }),
    // Sütunların tepesinden geçen getiri çizgisi.
    svg('polyline', {
      points: '11,31 23,25 32,19 39,13', fill: 'none', stroke: 'url(#tp-line)',
      'stroke-width': '2.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    }),
    svg('circle', { cx: '39', cy: '13', r: '3.1', class: 'logo-dot' }),
  );
  return root;
}

function brand(): HTMLElement {
  return el('div', { class: 'brand' }, [
    logoMark(38),
    el('div', { class: 'brand-text' }, [
      el('span', { class: 'brand-name' }, ['TEFAS-Pro']),
      el('span', { class: 'brand-sub' }, ['Fon Takip Paneli']),
    ]),
  ]);
}

/**
 * Satır içi ikon seti. Kütüphane eklenmez; her ikon 24 birimlik bir çizim
 * alanında, tek çizgi kalınlığıyla.
 */
const ICON_PATHS: Record<string, string[]> = {
  dashboard: ['M4 13h7V4H4zM13 20h7v-9h-7zM4 20h7v-5H4zM13 9h7V4h-7z'],
  portfolio: ['M3 7h18v13H3z', 'M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M3 12h18'],
  transactions: ['M4 8h13l-3-3', 'M20 16H7l3 3'],
  watchlist: ['M12 5c-5 0-8 4.5-8 7s3 7 8 7 8-4.5 8-7-3-7-8-7z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  users: ['M16 19v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V19', 'M9.5 9.5a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5z', 'M21 19v-1.5a4 4 0 0 0-3-3.87'],
  edit: ['M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z', 'M14.5 6.5 17.5 9.5'],
  delete: ['M4 7h16', 'M9 7V5h6v2', 'M6 7l1 13h10l1-13', 'M10 11v6M14 11v6'],
  add: ['M12 5v14M5 12h14'],
  logout: ['M15 17l5-5-5-5', 'M20 12H9', 'M12 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6'],
  close: ['M6 6l12 12M18 6 6 18'],
  // Yazıcı: Portföyüm'ün PDF düğmesi. Çıktı tarayıcının yazdırmasından.
  print: ['M6 9V3h12v6', 'M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2',
          'M6 14h12v7H6z'],
  // Kullanıcı geçişi: bir kişi ve yön değiştiren ok.
  impersonate: ['M13 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20',
                'M7.5 10.5a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5z',
                'M16 8h6l-2.5-2.5', 'M22 13h-6l2.5 2.5'],
  // Aşağı ok: satış paylardan çıkış. Yukarı bakarken "artır" gibi okunuyordu,
  // üstelik yanındaki "Alış Ekle" artı işaretiyle aynı yöne bakıyordu.
  sell: ['M12 5v14', 'm5 12 7 7 7-7'],
  // Konuşma balonu: Asistan ekranının menü ikonu.
  chat: ['M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z'],
  // Büyüteç: satırın detayını açan düğme. Tanımsız bir ad verilince icon()
  // boş bir svg üretiyor ve düğme boş kutu olarak çiziliyordu.
  search: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'm16.5 16.5 3.5 3.5'],
  // Hisseler ekranının menü ikonu: ad ICON_PATHS'te yoksa nav düğmesi de boş
  // kutu gösteriyordu.
  stocks: ['M4 19h16', 'm5 16 4-6 3 4 3-7 4 5'],
  fund: ['M4 19h16', 'M7 19V9M12 19V5M17 19v-7'],
  money: ['M12 3v18', 'M16 7.5A3.5 3.5 0 0 0 12.5 5h-1a3 3 0 0 0 0 6h1a3 3 0 0 1 0 6h-1A3.5 3.5 0 0 1 8 16.5'],
  chart: ['M4 19h16', 'm5 15 4-5 3 3 6-8'],
  calendar: ['M4 6h16v14H4z', 'M4 10h16', 'M9 3v4', 'M15 3v4'],
  cash: ['M3 7h18v10H3z', 'M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z', 'M7 7v10', 'M17 7v10'],
  flag: ['M5 21V4h9l-1 3h6v8h-7l-1-3H5'],
  closed: ['M20 6 9 17l-5-5'],
  periods: ['M4 5h16v15H4z', 'M4 10h16', 'M9 5V3M15 5V3', 'M8 14h3M13 14h3'],
  runs: ['M12 8v4l3 2', 'M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z'],
  prefs: ['M4 7h10M18 7h2M4 17h2M10 17h10', 'M16 5v4M8 15v4'],
  // Banka: kasa/bina cephesi. `money` para işareti ve banka listesi değil.
  banks: ['M3 9h18', 'M5 9v9M9 9v9M15 9v9M19 9v9', 'M3 21h18', 'm12 3 9 6H3z'],
  // Sistem fonları: fon çubukları + dişli, "sistemin topladığı fonlar".
  sysfunds: ['M4 19h16', 'M7 19v-6M12 19V8', 'M17 19v-4', 'M17 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z'],
  // Profil: tek kişi silueti. `users` üç kişilik, hesabı temsil etmiyor.
  profile: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M5 20a7 7 0 0 1 14 0'],
  // Kullanıcı menüsünün oku. Menü yukarı açıldığı için yukarı bakıyor;
  // açıkken CSS ile dönüyor.
  caretUp: ['m7 14 5-5 5 5'],
  allocation: ['M12 12V3a9 9 0 1 0 9 9z', 'M14 3a7 7 0 0 1 7 7h-7z'],
  market: ['M3 3v18h18', 'm7 14 3-4 3 3 5-7', 'M18 6h3v3'],
  settings: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'],
};

function icon(name: keyof typeof ICON_PATHS | string, size = 18): SVGSVGElement {
  const root = svg('svg', {
    viewBox: '0 0 24 24', width: String(size), height: String(size),
    class: 'icon', 'aria-hidden': 'true', focusable: 'false',
  });
  for (const d of ICON_PATHS[name] ?? []) root.append(svg('path', { d }));
  return root;
}

/**
 * Satır eylemi: yalnız ikon taşıyan düğme.
 *
 * Metnin kendisi tıklanabilir olmaz; eylem her zaman düğme görünümündedir.
 * İkon 18px çizilir ve dokunulabilir bir kutu içinde durur — referans
 * uygulamadaki ikonlar 10-12px olduğu için ne oldukları anlaşılmıyordu.
 */
function iconButton(name: string, label: string, kind = ''): HTMLButtonElement {
  const b = el('button', {
    class: `icon-btn${kind === '' ? '' : ` icon-btn-${kind}`}`,
    title: label, 'aria-label': label, type: 'button',
  }, [icon(name)]);
  return b as HTMLButtonElement;
}

/**
 * Ortada açılan pencere. Form da onay da bunun içinde durur: form listenin
 * üstüne, altına veya satırın yerine gömülmez.
 *
 * Escape ve zemine tıklama kapatır; kapatmak kaydetmez.
 */
function openModal(
  title: string, subtitle: string | null, body: Node, footer: Node[],
  // Geniş pencere: fon içeriği 7 sütunlu ve 80 satıra kadar çıkan bir tablo,
  // form genişliğinde okunmuyor. `xwide` 10 sütunlu kapanan işlem tablosu
  // için: ölçüldü, o tablo 1054 px istiyor ve `wide` 1024 px'te son sütunu
  // kesiyordu.
  size: 'form' | 'wide' | 'xwide' = 'form',
): () => void {
  const closeBtn = iconButton('close', 'Kapat');
  const card = el('div', { class: `modal-card modal-${size}` }, [
    el('div', { class: 'modal-head' }, [
      el('div', {}, [
        el('h3', { class: 'modal-title' }, [title]),
        ...(subtitle === null ? [] : [el('p', { class: 'modal-sub' }, [subtitle])]),
      ]),
      closeBtn,
    ]),
    el('div', { class: 'modal-body' }, [body]),
    // Eylemi olmayan pencerede alt şerit hiç çizilmiyor. Salt okunur bir
    // pencerede tek başına duran "Kapat", sağ üstteki çarpının aynısını
    // yapıyor ve altta boş bir şerit kaplıyordu. Kapatmanın üç yolu zaten
    // var: çarpı, Esc ve dışarı tıklama.
    ...(footer.length === 0 ? [] : [el('div', { class: 'modal-actions' }, footer)]),
  ]);
  const overlay = el('div', { class: 'modal-overlay' }, [card]);
  const close = (): void => {
    document.removeEventListener('keydown', onKey);
    overlay.remove();
  };
  const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') close(); };
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', onKey);
  document.body.append(overlay);
  return close;
}

/**
 * Form alanı. `hint` verilirse girdinin altında, ne beklendiğini söyleyen bir
 * satır çıkar — referans arayüzdeki gibi. Alanın kendi boşluğu yoktur; onu
 * kuşatan ızgaranın `gap` değeri belirler.
 */
/** Hint metin ya da hazır bir düğüm olabilir: içeriği sonradan değişen ipuçları
 *  (banka listesi yüklenirken olduğu gibi) düğüm olarak verilir. */
function field(labelText: string, input: HTMLElement, hint?: string | HTMLElement): HTMLElement {
  return el('div', { class: 'field' }, [
    el('label', {}, [labelText]),
    input,
    ...(hint === undefined
      ? []
      : [typeof hint === 'string' ? el('div', { class: 'field-hint' }, [hint]) : hint]),
  ]);
}

/**
 * Metrik kartı. Sol üstte ikon kutusu: kartlar yan yana dizildiğinde hangisinin
 * ne olduğu başlığı okumadan ayırt edilebilsin.
 */
function metric(
  label: string,
  value: string,
  foot?: string,
  iconName = 'chart',
  /** Sayının yanında duran birim: "25 fon" gibi. */
  unit?: string,
): HTMLElement {
  return el('div', { class: 'metric-card' }, [
    el('span', { class: `metric-symbol metric-symbol-${iconName}` }, [icon(iconName, 18)]),
    el('div', { class: 'metric-text' }, [
      el('div', { class: 'metric-label' }, [label]),
      el('div', { class: 'metric-value' }, [
        value,
        ...(unit === undefined ? [] : [el('span', { class: 'metric-unit' }, [unit])]),
      ]),
      ...(foot === undefined ? [] : [el('div', { class: 'metric-foot' }, [foot])]),
    ]),
  ]);
}

/**
 * Panel. `action` verilirse başlık şeridinin sağında durur — liste eylemleri
 * gövdeye girip tabloyu bölmemeli.
 */
function panel(title: string, meta: string, body: Node, action?: Node): HTMLElement {
  return el('section', { class: 'panel' }, [
    el('div', { class: 'panel-heading' }, [
      el('div', { class: 'panel-heading-text' }, [
        el('h2', {}, [title]),
        el('span', { class: 'header-meta' }, [meta]),
      ]),
      ...(action ? [action] : []),
    ]),
    body,
  ]);
}

/**
 * Geri alınamaz bir işlem için onay penceresi.
 *
 * Tarayıcının `confirm`'ü yerine kendi penceremiz: silinecek kaydı satır satır
 * gösterebilmek ve sonucun ne olacağını ayrı bir uyarı olarak vurgulayabilmek
 * için. Metin tek satıra sıkıştığında kullanıcı ne sildiğini okumadan onaylıyor.
 *
 * Söz, kullanıcı bir düğmeye basana kadar beklemez; Escape ve zemine tıklama
 * da vazgeçme sayılır — kapatmanın en kolay yolu her zaman iptal olmalı.
 */
function confirmDelete(opts: {
  title: string;
  /** Silinecek kaydı tanımlayan satırlar: "HBU", "34.200 lot" gibi. */
  detail: string[];
  /** Sonucu anlatan uyarı; boş bırakılırsa gösterilmez. */
  warning?: string;
  /** Silmek yerine yapılabilecek şey. */
  hint?: string;
  confirmLabel: string;
}): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (value: boolean): void => {
      if (done) return;
      done = true;
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      resolve(value);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') finish(false);
    };

    const cancelBtn = el('button', { class: 'btn-ghost' }, ['Vazgeç']);
    const okBtn = el('button', { class: 'btn-danger' }, [opts.confirmLabel]);
    const card = el('div', { class: 'modal-card' }, [
      el('h3', { class: 'modal-title' }, [opts.title]),
      el('div', { class: 'modal-detail' }, opts.detail.map((d) => el('div', {}, [d]))),
      ...(opts.warning === undefined ? [] : [el('p', { class: 'modal-warning' }, [opts.warning])]),
      ...(opts.hint === undefined ? [] : [el('p', { class: 'modal-hint' }, [opts.hint])]),
      el('div', { class: 'modal-actions' }, [cancelBtn, okBtn]),
    ]);
    const overlay = el('div', { class: 'modal-overlay' }, [card]);

    cancelBtn.addEventListener('click', () => { finish(false); });
    okBtn.addEventListener('click', () => { finish(true); });
    // Zemine tıklama vazgeçmedir; kartın içine tıklama pencereyi kapatmamalı.
    overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(false); });
    document.addEventListener('keydown', onKey);

    document.body.append(overlay);
    cancelBtn.focus();
  });
}

/**
 * Tablo. `filters` verilirse başlıkların üstüne bir satır gelir ve her hücre
 * kendi sütununun hizasında durur — filtre, süzdüğü sütunun hizasında
 * olduğunda hangi alana ait olduğu söylenmeden anlaşılır.
 */
function table(
  headers: string[],
  rows: HTMLElement[],
  filters?: (Node | null)[],
): HTMLElement {
  if (rows.length === 0) return el('div', { class: 'empty-state' }, ['Kayıt Yok.']);
  // Filtre satırı başlıkların ÜSTÜNDE: süzme, okumadan önce yapılan iş; sütun
  // adlarının altına düşünce tablonun içindeymiş gibi duruyordu.
  const head = filters === undefined ? [] : [
    el('tr', { class: 'filter-row' }, headers.map((_, i) =>
      el('th', {}, filters[i] == null ? [] : [filters[i]]))),
  ];
  head.push(el('tr', {}, headers.map((h) => el('th', {}, [h]))));
  return el('div', { class: 'table-wrap' }, [
    el('table', {}, [
      el('thead', {}, head),
      el('tbody', {}, rows),
    ]),
  ]);
}

/**
 * Arama karşılaştırması için metni sadeleştirir.
 *
 * Türkçe küçültme "DFI" kodunu "dfı" yapıyor (noktasız ı); kullanıcı "dfi"
 * yazınca eşleşme çıkmıyordu. Noktalı ve noktasız i tek harfe indirgeniyor ki
 * hangisini yazarsa yazsın bulsun.
 */
function aramaAnahtari(text: string): string {
  return text.toLocaleLowerCase('tr').replace(/[ıİi]/g, 'i');
}

/**
 * Aranabilir seçim kutusu.
 *
 * Yerli `select` arama kutusu taşıyamıyor; 37 fon arasından üç harfi yazarak
 * bulmak listeyi kaydırmaktan hızlı. `datalist` de arama verirdi ama açılır
 * listesini işletim sistemi çiziyor, uygulamanın geri kalanına benzemiyor.
 *
 * Seçim yapıldığında yanında bir temizleme düğmesi çıkar: seçimi geri almanın
 * yolu listeyi açıp "Tümü"yü bulmak olmamalı.
 */
function comboFilter(opts: {
  label: string;
  options: { value: string; label: string; hint?: string }[];
  value: string;
  onChange: (value: string) => void;
  /**
   * Seçimi temizleyen çarpı. Filtrede gerekli — süzmeyi geri almanın yolu bu.
   * Zorunlu bir alanda ise anlamsız: boş bir değere dönülemiyorsa düğme
   * basıldığında hiçbir şey yapmaz, yani ölü bir düğme olur.
   */
  clearable?: boolean;
}): HTMLElement {
  const secili = opts.options.find((o) => o.value === opts.value);
  const trigger = el('button', {
    type: 'button', class: `combo-trigger${secili ? ' combo-active' : ''}`,
    'aria-haspopup': 'listbox',
  }, [secili?.label ?? opts.label]);

  const search = el('input', {
    class: 'combo-search', placeholder: 'Ara…', spellcheck: 'false',
  }) as HTMLInputElement;
  const list = el('div', { class: 'combo-list', role: 'listbox' });
  const panel = el('div', { class: 'combo-panel' }, [search, list]);
  const root = el('div', { class: 'combo' }, [trigger, panel]);

  if (secili && opts.clearable !== false) {
    const temizle = el('button', {
      type: 'button', class: 'combo-clear', title: 'Seçimi temizle',
      'aria-label': `${opts.label} seçimini temizle`,
    }, [icon('close', 12)]);
    temizle.addEventListener('click', (e) => { e.stopPropagation(); opts.onChange(''); });
    root.append(temizle);
  }

  const ciz = (): void => {
    const q = aramaAnahtari(search.value.trim());
    list.replaceChildren();
    const uyan = opts.options.filter((o) =>
      q === '' || aramaAnahtari(`${o.value} ${o.label} ${o.hint ?? ''}`).includes(q));
    if (uyan.length === 0) {
      list.append(el('div', { class: 'combo-empty' }, ['Eşleşme yok.']));
      return;
    }
    for (const o of uyan) {
      const b = el('button', {
        type: 'button',
        class: `combo-option${o.value === opts.value ? ' combo-option-on' : ''}`,
      }, [
        el('span', { class: 'combo-option-value' }, [o.label]),
        ...(o.hint === undefined ? [] : [el('span', { class: 'combo-option-hint' }, [o.hint])]),
      ]);
      b.addEventListener('click', () => { opts.onChange(o.value); });
      list.append(b);
    }
  };

  const kapat = (): void => {
    root.classList.remove('combo-open');
    document.removeEventListener('mousedown', disariTikla);
  };
  // Dışarı tıklayınca kapanır; açık kalan bir panel altındaki satırları
  // örtüyor ve kullanıcı onu kapatmanın yolunu arıyor.
  const disariTikla = (e: MouseEvent): void => {
    if (!root.contains(e.target as Node)) kapat();
  };
  trigger.addEventListener('click', () => {
    const acik = root.classList.toggle('combo-open');
    if (!acik) { kapat(); return; }
    search.value = '';
    ciz();
    document.addEventListener('mousedown', disariTikla);
    search.focus();
  });
  search.addEventListener('input', ciz);
  search.addEventListener('keydown', (e) => {
    const k = e as KeyboardEvent;
    if (k.key === 'Escape') { kapat(); trigger.focus(); }
    // Enter ilk eşleşmeyi seçer: aramanın karşılığı bu, yoksa yazdıktan sonra
    // fareye geçmek gerekirdi.
    if (k.key === 'Enter') {
      const ilk = list.querySelector('button');
      if (ilk !== null) (ilk as HTMLButtonElement).click();
    }
  });
  return root;
}

// ─── Grafik ─────────────────────────────────────────────────────────────────

import { planFifoSale } from './fifo.js';
import { NOTE_MAX } from './limits.js';
import { toolEtiket } from './assistant-labels.js';
import { sseAyir } from './sse.js';
import { EMAIL_MAX, FULL_NAME_MAX } from './user-fields.js';
import { orderFromSettlement, settlementFromOrder } from './settlement.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  text?: string,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Yatay bar grafik, satır içi SVG. Grafik kütüphanesi kullanılmaz: iki bar
 * grafik bir bağımlılığı hak etmiyor ve kütüphane kendi paletini getirseydi
 * tasarım ikiye bölünürdü. Renkler CSS custom property'lerden gelir.
 *
 * Barlar gruptaki en büyük mutlak değere göre ölçeklenir; negatifler sıfır
 * çizgisinin solunda ve tehlike rengiyle çizilir.
 */
interface ChartOpts {
  emptyText?: string;
  /**
   * Akış ve yatırımcı grafiklerinde sağ sütun hem oranı hem ham büyüklüğü
   * taşır: sıralamayı oran belirler, büyüklüğü tutar/kişi anlatır. İkisi de
   * görünmezse bar ya anlamsız (yalnız ham sayı) ya da soyut (yalnız oran)
   * kalır.
   */
  withFlow?: boolean;
  withPeople?: boolean;
}

function barChart(
  entries: RankEntry[],
  { emptyText = 'Veri yok.', withFlow = false, withPeople = false }: ChartOpts = {},
): SVGSVGElement | HTMLElement {
  if (entries.length === 0) return el('div', { class: 'empty-state' }, [emptyText]);

  const W = 520;
  const ROW = 26;
  const LABEL = 52;   // fon kodu sütunu
  const DAYS = 28;    // iş günü sütunu — bar buraya taşmamalı
  const VALUE = withFlow || withPeople ? 132 : 62;   // değer sütunu
  const H = entries.length * ROW + 6;
  const plotW = W - LABEL - DAYS - VALUE;
  const max = Math.max(...entries.map((e) => Math.abs(Number(e.returnPct))), 0.0001);
  const hasNeg = entries.some((e) => Number(e.returnPct) < 0);
  // Negatif değer varsa sıfır çizgisi ortada, yoksa solda.
  const zeroX = LABEL + (hasNeg ? plotW / 2 : 0);
  const scale = (hasNeg ? plotW / 2 : plotW) / max;

  const root = svg('svg', {
    viewBox: `0 0 ${String(W)} ${String(H)}`,
    class: 'bar-chart',
    role: 'img',
  });

  entries.forEach((e, i) => {
    const v = Number(e.returnPct);
    const y = i * ROW + 3;
    const len = Math.abs(v) * scale;
    const x = v >= 0 ? zeroX : zeroX - len;

    root.append(
      svg('title', {}, [
        `${e.fundCode} — ${e.title ?? ''}`,
        e.owned ? 'portföyümde' : 'takip listemde',
        ...(e.gain == null ? [] : [`${money(e.gain)} kâr/zarar`]),
        // İki getiri de ipucunda: bar hangisini çiziyorsa çizsin, diğerine
        // bakmak için sekme değiştirmek gerekmesin. Fonun aylık hareketi ile
        // kullanıcının kazancı birbirinden çok ayrılabiliyor — DOH aylık
        // %35,23 yükselirken dokuz günlük sahiplikten gelen kazanç %2,96.
        ...(e.ownPct == null ? [] : [`alımdan beri ${signedText(e.ownPct)}`]),
        ...(e.return1m == null ? [] : [`son 1 ayda ${signedText(e.return1m)}`]),
        ...(e.return3m == null ? [] : [`son 3 ayda ${signedText(e.return3m)}`]),
        // Fonun kendi hareketi bağlam: fon ne kadar yükselmiş, bunun ne
        // kadarını yakalamışım. Sıralamaya girmiyor.
        ...(e.fundReturn1m == null ? [] : [`fon ${signedText(e.fundReturn1m)}`]),
      ].join(' · ')),
      svg('text', { x: '0', y: String(y + 13), class: 'bar-code' }, e.fundCode),
      svg('rect', {
        x: String(x),
        y: String(y + 3),
        width: String(Math.max(len, 1)),
        height: '14',
        rx: '3',
        // Sahiplik dokuyla ayrılır, renkle değil: renk zaten getirinin işareti.
        // İkisini de renge yüklemek iki bilgiyi tek kanalda çakıştırırdı.
        class: `${v >= 0 ? 'bar-pos' : 'bar-neg'}${e.owned ? '' : ' bar-watch'}`,
      }),
      svg(
        'text',
        { x: String(W), y: String(y + 13), class: `bar-value ${v >= 0 ? 'pos' : 'neg'}` },
        `${v > 0 ? '+' : ''}${v.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}%` +
          (withFlow ? ` · ${money(e.flow ?? null)}` : '') +
          (withPeople ? ` · ${people(e.people ?? null)}` : ''),
      ),
    );
    if (e.days !== null) {
      root.append(
        svg('text', { x: String(W - VALUE - 6), y: String(y + 13), class: 'bar-days' },
          `${String(e.days)}g`),
      );
    }
  });
  if (hasNeg) {
    root.append(svg('line', {
      x1: String(zeroX), y1: '0', x2: String(zeroX), y2: String(H), class: 'bar-zero',
    }));
  }
  return root;
}

/**
 * Boş kayıp grafiği "Veri yok." demez: kaybettiren fon olmaması veri eksikliği
 * değil, iyi haber. Toggle kapatılınca gerçekten oluyor — açık pozisyonların
 * hiçbiri son ayda ekside değilse panel boş kalıyor.
 */
function chartPanel(
  title: string,
  meta: string,
  entries: RankEntry[],
  opts: ChartOpts = {},
): HTMLElement {
  return el('section', { class: 'panel' }, [
    el('div', { class: 'panel-heading' }, [
      el('h2', {}, [title]),
      el('span', { class: 'header-meta' }, [meta]),
    ]),
    el('div', { class: 'panel-body' }, [barChart(entries, opts)]),
  ]);
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

/**
 * Portföy performans grafiği: ortak tarih ekseninde iki panel.
 *
 * Üstte değer çizgisi ve altında alan dolgusu, altta günlük getiri barları.
 * Panel yüksekliği 2:1 — referans grafikteki oran; üst panel şeklin taşıyıcısı,
 * alt panel onu okuyan ikinci bir bakış.
 *
 * Çizgi ham portföy değeri değildir. Sunucu seriyi sermaye hareketinden
 * arındırılmış gönderir: para yatırılan gün ham değer sıçrar ve o günün gerçek
 * performansı görünmez olur. Grafik "ne kadar param var" değil, "param ne
 * kazandırdı" sorusunu cevaplar.
 */
function performanceChart(points: PerformancePoint[], benchKod = ''): SVGSVGElement {
  // viewBox genişliği panelin gerçek genişliğine yakın seçilir. Bu panel tam
  // genişlikte duruyor; barChart gibi 520 verilseydi SVG üç kat ölçeklenir ve
  // 11px yazı ekranda 30px görünürdü. chart-grid içindeki grafikler iki sütuna
  // bölündüğü için orada 520 doğru sayı.
  const W = 1400;
  const H_TOP = 321;
  const H_BOT = 161;  // üst panelin yarısı — referans grafikteki 2:1 oranı
  const GAP = 34;
  const PAD_L = 64;   // y ekseni etiketleri
  const PAD_R = 24;   // çizgi ve dolgu sağ kenara dayanmasın
  const PAD_T = 12;
  const PAD_B = 66;   // dik tarih etiketleri
  const H = PAD_T + H_TOP + GAP + H_BOT + PAD_B;
  const plotW = W - PAD_L - PAD_R;

  const root = svg('svg', {
    viewBox: `0 0 ${String(W)} ${String(H)}`,
    class: 'perf-chart',
    role: 'img',
    preserveAspectRatio: 'xMidYMid meet',
  });

  // Benchmark çizgisi de ölçeğe girmeli: yalnız portföy değerlerine göre
  // ölçeklenirse benchmark kutunun dışına taşar ve kırpılır.
  const benchValues = points
    .map((p) => (p.benchValue == null ? null : Number(p.benchValue)))
    .filter((v): v is number => v !== null);
  const values = [...points.map((p) => Number(p.value)), ...benchValues];
  const pcts = points.map((p) => (p.dailyPct === null ? 0 : Number(p.dailyPct)));

  // Değer ekseni: seriyi kutuya oturtur, tabanı sıfıra çekmez. Portföy değeri
  // sıfırdan çok uzakta; sıfırdan başlatmak bütün hareketi düz çizgiye çevirir.
  const vMin = Math.min(...values);
  const vMax = Math.max(...values);
  const vPad = (vMax - vMin) * 0.08 || Math.abs(vMax) * 0.01 || 1;
  const yTop = vMax + vPad;
  const yBot = vMin - vPad;
  const x = (i: number): number =>
    points.length === 1 ? PAD_L + plotW / 2 : PAD_L + (i * plotW) / (points.length - 1);
  const yV = (v: number): number => PAD_T + ((yTop - v) / (yTop - yBot)) * H_TOP;

  // Bar ekseni sıfırda ortalanır: artı ve eksi günler aynı ölçekte okunmalı.
  // Benchmark günlük yüzdesi de ölçeğe girmeli: dışarıda kalırsa çizgi
  // kutunun dışına taşar.
  const benchPcts = points
    .map((p) => (p.benchDailyPct == null ? null : Number(p.benchDailyPct)))
    .filter((v): v is number => v !== null);
  const pMax = Math.max(...pcts.map(Math.abs), ...benchPcts.map(Math.abs), 0.01);
  const barTop = PAD_T + H_TOP + GAP;
  const zeroY = barTop + H_BOT / 2;
  const yP = (v: number): number => zeroY - (v / pMax) * (H_BOT / 2);

  const fmtMoney = (v: number): string =>
    `${Math.round(v / 1000).toLocaleString('tr-TR')}K`;

  // ── Üst panel: yatay kılavuz çizgileri ve değer etiketleri
  for (let i = 0; i <= 3; i += 1) {
    const v = yBot + ((yTop - yBot) * i) / 3;
    const gy = yV(v);
    root.append(
      svg('line', {
        x1: String(PAD_L), y1: String(gy), x2: String(W - PAD_R), y2: String(gy),
        class: 'perf-grid',
      }),
      svg('text', { x: String(PAD_L - 10), y: String(gy), class: 'perf-axis-y' }, fmtMoney(v)),
    );
  }

  // Alan dolgusu ve çizgi.
  const line = points.map((p, i) => `${String(x(i))},${String(yV(Number(p.value)))}`).join(' ');
  root.append(
    svg('polygon', {
      points: `${String(x(0))},${String(PAD_T + H_TOP)} ${line} ${String(x(points.length - 1))},${String(PAD_T + H_TOP)}`,
      class: 'perf-area',
    }),
    svg('polyline', { points: line, class: 'perf-line' }),
  );

  // Benchmark ikinci çizgi: kesikli ve soluk, portföy çizgisiyle
  // karışmasın. Dolgu yok — iki dolgu üst üste binince ikisi de okunmuyor.
  if (benchValues.length === points.length && points.length > 1) {
    root.append(svg('polyline', {
      points: points.map((p, i) => `${String(x(i))},${String(yV(Number(p.benchValue)))}`).join(' '),
      class: 'perf-bench',
    }));
  }

  // ── Alt panel: sıfır çizgisi ve günlük barlar
  root.append(
    svg('line', {
      x1: String(PAD_L), y1: String(zeroY), x2: String(W - PAD_R), y2: String(zeroY),
      class: 'perf-zero',
    }),
    svg('text', { x: String(PAD_L - 10), y: String(barTop), class: 'perf-axis-y' },
      `+${pMax.toFixed(1)}%`),
    svg('text', { x: String(PAD_L - 10), y: String(barTop + H_BOT), class: 'perf-axis-y' },
      `-${pMax.toFixed(1)}%`),
  );

  const barW = Math.max(3, Math.min(22, (plotW / Math.max(points.length, 1)) * 0.7));
  points.forEach((p, i) => {
    if (p.dailyPct === null) return;
    const v = Number(p.dailyPct);
    const y = yP(v);
    const bar = svg('rect', {
      x: String(x(i) - barW / 2),
      y: String(Math.min(y, zeroY)),
      width: String(barW),
      // Sıfıra çok yakın günler de görünsün: yükseklik en az 1 piksel.
      height: String(Math.max(1, Math.abs(zeroY - y))),
      class: v >= 0 ? 'perf-bar-pos' : 'perf-bar-neg',
    });
    bar.append(
      svg('title', {}, `${p.date}  ${v >= 0 ? '+' : ''}${v.toFixed(2)}%  ·  ${money(p.value)}`),
    );
    root.append(bar);

    // Barın ucuna yüzde. Dik yazılıyor, alttaki tarihlerle aynı açı: yatay
    // yazsaydı 30 etiket yan yana sığmaz, üst üste binerdi.
    //
    // % işareti yok: eksenin iki ucunda zaten "+x,x%" yazıyor ve otuz kez
    // tekrarlamak etiketleri uzatmaktan başka bir şey yapmıyor.
    const lx = x(i);
    // Etiket her zaman barın ÜST kenarının üstünde — eksi günlerde de. Eksi
    // bar sıfırın altına iniyor, üst kenarı sıfır çizgisi; etiket oraya
    // yazılıyor. Barın altına konsaydı etiketler iki farklı yönde okunur ve
    // göz her sütunda yön değiştirmek zorunda kalırdı.
    const ly = (v >= 0 ? y : zeroY) - 6;
    root.append(
      svg('text', {
        x: String(lx), y: String(ly),
        class: `perf-bar-label ${v >= 0 ? 'perf-bar-label-pos' : 'perf-bar-label-neg'}`,
        transform: `rotate(-60 ${String(lx)} ${String(ly)})`,
      // İşaret yok: yön zaten barın kendisinde. Yukarı ve yeşilse artı,
      // aşağı ve kırmızıysa eksi — işareti ayrıca yazmak aynı bilgiyi ikinci
      // kez söylemek ve etiketi uzatmak olurdu.
      }, Math.abs(v).toLocaleString('tr-TR', {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      })),
    );
  });

  // Alt panelde benchmark BAR BAŞINA kısa yatay çizgi, birleşik çizgi değil.
  //
  // Önce polyline denendi: barların arasında zikzak yapıyor ve hangi çizgi
  // parçasının hangi güne ait olduğu okunmuyordu. Her barın kendi üstünde
  // duran işaret ise doğrudan karşılaştırma veriyor — bar işaretin üstündeyse
  // o gün piyasayı yendin, altındaysa geride kaldın.
  //
  // Barlardan sonra çiziliyor: SVG'de sonra gelen üstte durur.
  const isaretW = barW * 1.5;
  points.forEach((p, i) => {
    if (p.benchDailyPct == null) return;
    const by = yP(Number(p.benchDailyPct));
    const cizgi = svg('line', {
      x1: String(x(i) - isaretW / 2), y1: String(by),
      x2: String(x(i) + isaretW / 2), y2: String(by),
      class: 'perf-bench-tick',
    });
    cizgi.append(svg('title', {}, `${p.date} · ${benchKod} ${signedText(p.benchDailyPct)}`));
    root.append(cizgi);
  });

  // ── Tarih etiketleri.
  //
  // Etiket sayısı sabit değil, yere göre: -60 derecede "09-03" yatayda ~20px
  // yer kaplıyor, kaç tanesi sığıyorsa o kadarı yazılıyor. Son 30 iş gününde
  // hepsi sığar. Sabit sekiz etiket, sığdığı halde günleri gizliyordu.
  const LABEL_FOOTPRINT = 20;
  const maxLabels = Math.max(2, Math.floor(plotW / LABEL_FOOTPRINT));
  const step = Math.max(1, Math.ceil(points.length / maxLabels));
  points.forEach((p, i) => {
    if (i % step !== 0 && i !== points.length - 1) return;
    const tx = x(i);
    const ty = barTop + H_BOT + 18;
    root.append(
      svg('text', {
        x: String(tx), y: String(ty), class: 'perf-axis-x',
        transform: `rotate(-60 ${String(tx)} ${String(ty)})`,
      }, p.date.slice(5)),
    );
  });

  return root;
}

async function performancePanel(): Promise<HTMLElement> {
  let series: PerformanceSeries;
  try {
    series = (await api('/api/portfolio/performance')) as PerformanceSeries;
  } catch {
    return panel('Portföy Performansı', 'Son 30 İş Günü',
      el('div', { class: 'panel-body' }, [
        el('div', { class: 'empty-state' }, ['Performans serisi alınamadı.']),
      ]));
  }

  // İki günden kısa seri çizilmez: tek noktadan çizgi de bar da çıkmaz.
  if (series.points.length < 2) {
    return panel('Portföy Performansı', 'Son 30 İş Günü',
      el('div', { class: 'panel-body' }, [
        el('div', { class: 'empty-state' }, [
          'Grafik için en az iki işlem günü gerekiyor. Pozisyon açıldıkça seri dolacak.',
        ]),
      ]));
  }

  const first = series.points[0];
  const last = series.points[series.points.length - 1];
  const meta = first && last ? `${first.date} → ${last.date}` : 'Son 30 İş Günü';
  const body = el('div', { class: 'panel-body perf-body' }, [performanceChart(series.points, series.benchCode)]);
  // Üç sayı yan yana: senin getirin, benchmark'ın getirisi ve aradaki puan
  // farkı. Yalnız fark yazılsaydı "neye göre" sorusu havada kalırdı.
  const fark = series.totalPct === null || series.benchPct === null
    ? null
    : (Number(series.totalPct) - Number(series.benchPct)).toFixed(2);
  const toolbar = el('div', { class: 'chart-toolbar perf-toolbar' }, [
    el('span', { class: 'perf-total-label' }, ['Dönem Getirisi']),
    signed(series.totalPct),
    ...(series.benchPct === null ? [] : [
      el('span', { class: 'perf-bench-key' }, []),
      el('span', { class: 'perf-total-label' }, [series.benchCode]),
      signed(series.benchPct),
      el('span', { class: 'perf-total-label' }, ['Fark']),
      signed(fark, ' puan'),
    ]),
  ]);

  // Benchmark verisi yoksa sebebi yazılıyor: çizgiyi sessizce çizmemek,
  // kullanıcıya "karşılaştırma yok" demeden bırakmak olurdu.
  const notlar: HTMLElement[] = [];
  if (series.benchPct === null) {
    notlar.push(el('p', { class: 'panel-note' }, [
      `Karşılaştırma çizilemedi: ${series.benchCode} fonunun bu penceredeki `
      + 'günlük verisi eksik. Eksik günü atlayıp çizgiyi tamamlamak farkı '
      + 'olduğundan küçük gösterirdi.',
    ]));
  } else if (series.benchOwned) {
    // Benchmark fonu portföyde de varsa o dilim kendisiyle karşılaştırılıyor
    // ve farkı sıfıra çekiyor. Hata değil ama söylenmezse sebebi anlaşılmaz.
    notlar.push(el('p', { class: 'panel-note' }, [
      `${series.benchCode} senin portföyünde de var; o dilim kendisiyle `
      + 'karşılaştırıldığı için aradaki farkı sıfıra doğru çekiyor.',
    ]));
  }
  body.append(...notlar);

  return panel('Portföy Performansı', meta, body, toolbar);
}

const ONLY_OWNED_KEY = 'tefas.dashboard.onlyOwned';

/**
 * Toggle durumu tarayıcıda saklanır: bu bir kullanıcı tercihi değil, o an
 * bakılan görünüm. Sunucuya yazmak gereksiz yazma trafiği olurdu.
 *
 * localStorage erişimi try/catch içinde: gizli sekmede veya site verisi
 * kapalıyken okuma da yazma da exception atar ve panel hiç açılmazdı.
 */
/**
 * Piyasa pencerelerinin durakları.
 *
 * Düz 1-180 aralığı olsaydı kısa pencereler ezilirdi: 1-7 gün bandı çubuğun
 * %4'ü olur ve 3 günü tutturmak imkânsızlaşırdı. Duraklar eşit genişlikte,
 * kaydırıcı değere yapışıyor.
 */
const PIYASA_PENCERE = [1, 2, 3, 5, 7, 15, 30, 60, 90, 180] as const;

/** Gün sayısının tanıdık karşılığı; yalnız tam oturanlarda yazılıyor. */
const PENCERE_ADI: Record<number, string> = {
  7: '1 hafta', 15: '2 hafta', 30: '1 ay', 60: '2 ay', 90: '3 ay', 180: '6 ay',
};

/**
 * Çubuğun üstünde duran kısa ölçek. Boş bir kaydırıcıda durakların nerede
 * olduğu görünmüyordu; sürükleyip bırakmadan hangi değere gittiğin belli
 * olmuyordu.
 */
const PENCERE_KISA: Record<number, string> = {
  1: '1g', 2: '2g', 3: '3g', 5: '5g', 7: '1h', 15: '2h',
  30: '1a', 60: '2a', 90: '3a', 180: '6a',
};

function pencereEtiket(gun: number): string {
  const ad = PENCERE_ADI[gun];
  return ad === undefined ? `${String(gun)} gün` : `${String(gun)} gün · ${ad}`;
}

const PIYASA_KEY = ['tefas.market.left', 'tefas.market.right'] as const;

function readPencere(yan: 0 | 1): number {
  // Varsayılanlar 7 ve 30: ilk açılışta ekran eski davranışını koruyor.
  const varsayilan = yan === 0 ? 7 : 30;
  try {
    const v = Number(localStorage.getItem(PIYASA_KEY[yan]));
    return PIYASA_PENCERE.includes(v as typeof PIYASA_PENCERE[number]) ? v : varsayilan;
  } catch {
    return varsayilan;
  }
}

function writePencere(yan: 0 | 1, gun: number): void {
  try {
    localStorage.setItem(PIYASA_KEY[yan], String(gun));
  } catch {
    // Saklanamıyorsa görünüm yine doğru, yalnız yenilemede varsayılana döner.
  }
}

/**
 * Duraklı kaydırıcı: değer değil, duraklar listesindeki SIRA taşınıyor.
 *
 * Doğrudan gün sayısını taşısaydı çubuk doğrusal olur ve kısa pencereler
 * birbirine yapışırdı. İstek sürükleme BİTİNCE atılıyor (`change`), sürüklerken
 * yalnız etiket güncelleniyor — her adımda istek on çağrı demek olurdu.
 */
function pencereKaydirici(
  etiketMetni: string, gun: number, onChange: (g: number) => void,
): HTMLElement {
  const i = Math.max(0, PIYASA_PENCERE.indexOf(gun as typeof PIYASA_PENCERE[number]));
  const input = el('input', {
    type: 'range', min: '0', max: String(PIYASA_PENCERE.length - 1), step: '1',
    class: 'pencere-range', 'aria-label': `${etiketMetni} pencere`,
  }) as HTMLInputElement;
  input.value = String(i);
  // Ölçek etiketleri duraklarla aynı hizada: konum i/(n-1) oranında, çünkü
  // range girdisinin başparmağı da orada duruyor. Eşit sütunlu bir ızgara
  // etiketleri yarım durak kaydırırdı.
  const son = PIYASA_PENCERE.length - 1;
  const olcek = el('div', { class: 'pencere-olcek' }, PIYASA_PENCERE.map((g, i) => {
    const b = el('button', {
      type: 'button',
      class: `pencere-durak${g === gun ? ' pencere-durak-on' : ''}`,
      style: `left:${String((i / son) * 100)}%`,
      title: pencereEtiket(g),
    }, [PENCERE_KISA[g] ?? String(g)]);
    // Etikete tıklamak da seçiyor: sürüklemek zorunda kalmadan tek tıkla
    // istenen durağa gitmek mümkün olsun.
    b.addEventListener('click', () => { onChange(g); });
    return b;
  }));

  // Sürüklerken yalnız vurgu geziyor; istek bırakınca atılıyor.
  const guncelle = (): void => {
    const g = PIYASA_PENCERE[Number(input.value)] ?? gun;
    Array.from(olcek.children).forEach((d, j) => {
      d.classList.toggle('pencere-durak-on', PIYASA_PENCERE[j] === g);
    });
  };
  input.addEventListener('input', guncelle);
  input.addEventListener('change', () => {
    onChange(PIYASA_PENCERE[Number(input.value)] ?? gun);
  });

  // Ne "Sol/Sağ" yazısı ne de sağda değer etiketi var: kaydırıcı yönettiği
  // sütunun tam üstünde duruyor, seçili durak ölçekte vurgulu ve paneller
  // pencereyi başlıklarında söylüyor. Üçü de aynı bilgiyi tekrar ediyordu.
  // Gün karşılığı durağın title'ında duruyor.
  return el('div', { class: 'pencere-kutu' }, [
    el('div', { class: 'pencere-cubuk' }, [olcek, input]),
  ]);
}

const HISSE_TAKIP_KEY = 'tefas.stocks.watchlist';

/**
 * Piyasa ekranının bölüm sekmeleri.
 *
 * Üç bölüm alt alta dizilince sayfa 2764 px oluyordu — 900 px ekranda 3,1
 * ekran boyu kaydırma. Pencere kaydırıcıları ilk 222 px'de kaldığı için
 * kaydırma menzilinin %92'sinde görünmüyordu.
 */
type MarketSekme = 'returns' | 'flow' | 'investor';
const MARKET_SEKME = ['returns', 'flow', 'investor'] as const;
const MARKET_SEKME_ADI: Record<MarketSekme, string> = {
  returns: 'Getiri', flow: 'Para Akışı', investor: 'Yatırımcı Sayısı',
};
const MARKET_SEKME_KEY = 'tefas.market.section';

/**
 * Kapananlar ekranının kırılım sekmesi.
 *
 * Varsayılan fon: 53 işlem satırı bir ekrana sığmıyor ve "en son satılan
 * üstte" sıralaması yüzünden bir fonun bacakları yan yana bile değil.
 * 19 fonluk liste sığıyor ve ekranın cevapladığı soru o.
 */
type KapananSekme = 'fund' | 'tx';
const KAPANAN_SEKME_KEY = 'tefas.closed.section';

/**
 * Kapananlar işlem listesinin filtresi.
 *
 * Modül düzeyinde: fon sekmesinden bir fona tıklayınca işlem sekmesi o fonla
 * açılıyor ve sekme değişimi seçimi silmemeli. Fon Hareketleri'ndeki
 * `txFiltre` ile aynı gerekçe.
 */
const kapananFiltre = { fundCode: '', platform: '' };

function readKapananSekme(): KapananSekme {
  try {
    return localStorage.getItem(KAPANAN_SEKME_KEY) === 'tx' ? 'tx' : 'fund';
  } catch {
    return 'fund';
  }
}

function writeKapananSekme(value: KapananSekme): void {
  try {
    localStorage.setItem(KAPANAN_SEKME_KEY, value);
  } catch {
    // Depolama kapalıysa seçim yalnız bu oturumda yaşar.
  }
}

function readMarketSekme(): MarketSekme {
  try {
    const v = localStorage.getItem(MARKET_SEKME_KEY);
    return MARKET_SEKME.includes(v as MarketSekme) ? (v as MarketSekme) : 'returns';
  } catch {
    return 'returns';
  }
}

function writeMarketSekme(value: MarketSekme): void {
  try {
    localStorage.setItem(MARKET_SEKME_KEY, value);
  } catch {
    // Depolama kapalıysa seçim yalnız bu oturumda yaşar.
  }
}

function readHisseTakip(): boolean {
  try {
    return localStorage.getItem(HISSE_TAKIP_KEY) === '1';
  } catch {
    return false;
  }
}

function writeHisseTakip(value: boolean): void {
  try {
    localStorage.setItem(HISSE_TAKIP_KEY, value ? '1' : '0');
  } catch {
    // Saklanamıyorsa görünüm yine doğru, yalnız yenilemede varsayılana döner.
  }
}

function readOnlyOwned(): boolean {
  try {
    return localStorage.getItem(ONLY_OWNED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeOnlyOwned(value: boolean): void {
  try {
    localStorage.setItem(ONLY_OWNED_KEY, value ? '1' : '0');
  } catch {
    // Saklanamıyorsa görünüm yine doğru, yalnız yenilemede sıfırlanır.
  }
}

/**
 * Dört grafiğin ortak kontrolü. Panel başına ayrı olsaydı bir panelde takip
 * listesi varken diğerinde yokken sıralamalar karşılaştırılamazdı.
 */
function watchlistToggle(checked: boolean, onChange: (v: boolean) => void): HTMLElement {
  const input = el('input', { type: 'checkbox', id: 'toggle-watchlist' });
  input.checked = checked;
  input.addEventListener('change', () => {
    onChange(input.checked);
  });
  // Kullanıcı formundaki anahtarın aynısı. Kendi stilini almasaydı ekranda
  // iki ayrı aç/kapa biçimi olurdu; aynı işi yapan şey aynı görünmeli.
  // Buradaki fark yalnız yerleşim: form alanı değil, araç çubuğu öğesi.
  return el('div', { class: 'chart-toolbar' }, [
    el('label', { class: 'switch-field switch-inline', for: 'toggle-watchlist' }, [
      input,
      el('span', { class: 'switch-track' }, []),
      el('span', {}, ['Takip listem de gösterilsin']),
    ]),
    el('div', { class: 'chart-legend' }, [
      el('div', { class: 'legend-item' }, [
        el('span', { class: 'legend-swatch legend-owned' }),
        el('span', {}, ['portföyümde']),
      ]),
      el('div', { class: 'legend-item' }, [
        el('span', { class: 'legend-swatch legend-watch' }),
        el('span', {}, ['takip listemde']),
      ]),
    ]),
  ]);
}

/**
 * Pozisyon bölümü: fonun değil, kullanıcının kendi getirisi.
 *
 * Pencere bar başına farklı — herkes kendi alış tarihinden ölçülüyor. Bu
 * yüzden gün sayısı burada piyasa grafiklerindekinden de kritik: 114 gündür
 * tutulan fon, 5 gündür tutulanın yanında haksız bir avantajla başa geçer.
 */
interface BekleyenIslemSatiri {
  fundCode: string;
  title: string | null;
  /** Alımda işlem tarihi, satışta satış tarihi. */
  date: string;
  platform: string;
  /** Pasif kayıtta null: adet henüz belli değil, tutar var. */
  units: string | null;
  orderAmount: string | null;
  /** Son bilinen birim fiyat; tahmin bunun üzerinden. Yoksa null. */
  navPerShare: string | null;
  navDate: string | null;
}

interface BekleyenAlim {
  count: number;
  funds: string[];
  firstDate: string | null;
  dataDate: string | null;
  /** Alım kırılımı: Portföyüm satırlarını işaretlemek için. */
  rows: BekleyenIslemSatiri[];
  sellCount: number;
  sells: BekleyenIslemSatiri[];
}

/**
 * Fiyatı henüz açıklanmamış alımların uyarısı.
 *
 * TEFAS'ta bugün verilen emir ertesi iş gününün fiyatından işlem görüyor, o
 * yüzden ileri tarihli alım normal. Ama değerleme son veri gününe kadar
 * yapıldığı için bu satırlar portföy görünümlerine hiç girmiyor: Fon
 * Hareketleri'nde duruyorlar, Portföyüm ve Panel'de yoklar. Ölçüldü —
 * sekiz alım eklendi, yeni fon (CKL) listede hiç görünmedi ve panel maliyeti
 * onlar hariç hesaplandı; hiçbir yerde sebebi yazmıyordu.
 *
 * Tutar yazılmıyor: fiyat açıklanmadığı için maliyet de bilinmiyor.
 */
function bekleyenAlimNotu(b: BekleyenAlim | null): HTMLElement[] {
  if (b === null || b.count === 0) return [];
  return [el('p', { class: 'panel-note panel-note-warn' }, [
    `${String(b.count)} alım (${b.funds.join(', ')}) ${gunAd(b.firstDate)} tarihli ve `
    + `fiyatı henüz açıklanmadı; son veri günü ${gunAd(b.dataDate)}. `
    + 'Kayıtlar Fon Hareketleri\'nde duruyor ama fiyat gelene kadar buradaki '
    + 'toplamlara girmiyorlar.',
  ])];
}

/**
 * Panel sıralama ölçütü.
 *
 * "Alımdan beri" ne kazanıldığını söylüyor ama fonları KARŞILAŞTIRMIYOR:
 * sekiz aydır elde tutulan bir fon, dokuz günlükten doğal olarak daha çok
 * birikmiş oluyor. Ölçüldü — aynı portföyde alımdan beri TLY %72,09 ile
 * birinci, son bir ayda ise DOH %35,23 ile birinci ve TLY üçüncü.
 *
 * Yıllıklandırma bilinçli olarak yok: dokuz günlük %4,03 yıllığa çevrilince
 * %397 çıkıyor ve bu sayı bilgi değil, gürültünün kırk katı.
 *
 * Modül düzeyinde tutuluyor ki ekran değiştirip dönünce seçim korunsun.
 */
type GetiriOlcut = 'total' | 'm1' | 'm3';
let panelOlcut: GetiriOlcut = 'total';

/**
 * İki sekme de KULLANICININ getirisi; farkları yalnız pencere.
 *
 * Bir ara "Son 1 ay" sekmesi fonun kendi aylık getirisini gösteriyordu ve
 * yanındaki sekme kullanıcının kazancıydı — aynı panelde iki farklı sahip.
 * Ölçüldü: DOH son ayda %35,23 yükselmiş ama pozisyon dokuz günlük ve kazanç
 * %2,96, yani panel kullanıcıya kazanmadığı parayı gösteriyordu.
 *
 * Şimdi "Son 1 ay" da kullanıcının sayısı: yalnız fonda bulunduğu günlerin
 * getirisi zincirleniyor. Fonun kendi hareketi ipucunda bağlam olarak
 * duruyor — "fon ne kadar yükselmiş, ben bunun ne kadarını yakalamışım".
 */
const OLCUT_ETIKET: Record<GetiriOlcut, string> = {
  total: 'Alımdan beri',
  m1: 'Son 1 ay',
  m3: 'Son 3 ay',
};

const OLCUT_BASLIK: Record<GetiriOlcut, { top: string; bottom: string; meta: string }> = {
  total: {
    top: 'En çok kazandıran fonlarım',
    bottom: 'En çok kaybettiren fonlarım',
    meta: 'alımdan beri',
  },
  m1: {
    top: 'En çok kazandıran fonlarım',
    bottom: 'En çok kaybettiren fonlarım',
    meta: 'son 1 ayda, yalnız elde tuttuğum günler',
  },
  m3: {
    top: 'En çok kazandıran fonlarım',
    bottom: 'En çok kaybettiren fonlarım',
    meta: 'son 3 ayda, yalnız elde tuttuğum günler',
  },
};

/** Her ölçütün kendi listesi; hepsi sunucuda sıralanıp kesilmiş geliyor. */
const OLCUT_LISTE: Record<GetiriOlcut, { top: keyof Dashboard['positions']; bottom: keyof Dashboard['positions'] }> = {
  total: { top: 'top', bottom: 'bottom' },
  m1: { top: 'top1m', bottom: 'bottom1m' },
  m3: { top: 'top3m', bottom: 'bottom3m' },
};

function positionSection(
  p: Dashboard['positions'],
  onlyOwned: boolean,
  /** Cepten çıkan para: maliyet eksi gerçekleşen kâr. Üstteki özetten gelir. */
  netCapital: string | null,
  reload: () => void,
  /** Takip listesi anahtarı ve renk açıklaması; sekmelerle aynı şeride girer. */
  arac: HTMLElement,
): Node[] {
  const s = p.summary;
  const kapsam = onlyOwned ? 'yalnız portföyüm' : 'takip listem dahil, almış gibi';

  const baslik = OLCUT_BASLIK[panelOlcut];
  // İki liste de sunucudan hazır geliyor. İstemcide yeniden sıralamak yanlış
  // olurdu: sunucu ilk onu alımdan beriye göre kesiyor ve o listeye girememiş
  // bir fon aylık getiride birinci olsa bile görünmezdi.
  const liste = OLCUT_LISTE[panelOlcut];
  const kazandiran = p[liste.top] as RankEntry[];
  const kaybettiren = p[liste.bottom] as RankEntry[];
  const bosMetin = panelOlcut === 'total'
    ? 'Henüz ölçülebilir fon yok.'
    : 'Bu pencerede ölçülebilir fon yok.';

  const olcutSekmeleri = (): HTMLElement => el('div', { class: 'tabs' },
    (['total', 'm1', 'm3'] as GetiriOlcut[]).map((id) => {
      const b = el('button', {
        type: 'button', class: `tab-btn${panelOlcut === id ? ' tab-on' : ''}`,
      }, [OLCUT_ETIKET[id]]);
      b.addEventListener('click', () => { panelOlcut = id; reload(); });
      return b;
    }));

  return [
    // "Pozisyonlarım" yanıltıyordu: liste takip listesindeki fonları da içeriyor
    // ve onlarda pozisyon yok, "almış gibi" hesaplanıyorlar. "Fonlarım" ikisini
    // birden kapsıyor; "Fonlar" ise Piyasa ekranındaki piyasa geneli sıralamayla
    // karışırdı.
    el('h2', { class: 'section-title' }, ['Fonlarım']),
    ...(s === null
      ? []
      : [
          el('div', { class: 'metric-grid' }, [
            metric('Maliyet', money(s.cost), 'açık pozisyonlar'),
            // "Bugünkü değer" üstteki "Portföy Değeri" kutusuyla aynı sayıydı;
            // aynı ekranda iki kez yazmak yer harcıyordu. Yerine net sermaye:
            // maliyet eksi gerçekleşen kâr, yani cepten çıkan para. Maliyetten
            // farkı, kazanılıp yeniden yatırılan tutarın sermaye sayılmaması —
            // üstteki getiri yüzdesinin paydası da bu.
            metric('Net sermaye', netCapital === null ? '—' : money(netCapital),
              'cepten çıkan para'),
            // Gerçekleşmiş önce: net sermaye kutusunun hemen yanında duruyor
            // ve ikisi aynı sayıyla bağlı — net sermaye, maliyetten bu kârın
            // çıkarılmış hâli. Yan yana olunca fark okunuyor.
            metric('Gerçekleşmiş kâr', money(s.realizedGain), 'kapanmış pozisyonlar'),
            metric('Açık kâr', money(s.gain), `${String(s.winners)} kârda · ${String(s.losers)} zararda`),
          ]),
        ]),
    // Sekmeler iki panelin ÜSTÜNDE, ikisini birden yönetiyor.
    //
    // Önce yalnız soldaki panelin içindeydi: sağdaki panel de ölçütle
    // değişiyordu ama kendi kontrolü olmadığı için neye göre sıralandığı
    // görünmüyordu. İki panele birer kopya koymak da olurdu; aynı durumu iki
    // düğme takımıyla göstermek gereksiz.
    //
    // Ölçüt bölümün tamamına değil bu iki panele ait: üstteki metrik
    // kutuları (maliyet, net sermaye) pencereden bağımsız, o yüzden sekmeler
    // "Fonlarım" başlığına değil grafiklerin hemen üstüne konuyor.
    // Bu iki paneli yöneten HER ŞEY tek şeritte: sıralama ölçütü, takip
    // listesi anahtarı ve renk açıklaması.
    //
    // Anahtar önce yukarıdaydı, "Fonlarım" başlığının da üstünde. İki sorun
    // vardı: aynı iki paneli yöneten iki kontrol araya bir başlık ve dört
    // kutu girerek ayrılıyordu, ve o dört kutu (maliyet, net sermaye,
    // gerçekleşmiş, açık kâr) anahtardan ETKİLENMİYOR — özet yalnız gerçek
    // pozisyonlardan hesaplanıyor, takip listesi simülasyonlarını saymıyor.
    // Yani anahtar, etkilemediği kutuların üstünde duruyordu.
    el('div', { class: 'chart-grid-head' }, [
      el('div', { class: 'chart-grid-olcut' }, [
        el('span', { class: 'chart-grid-label' }, ['Sıralama']),
        olcutSekmeleri(),
      ]),
      arac,
    ]),
    el('div', { class: 'chart-grid' }, [
      chartPanel(baslik.top, `${kapsam} · ${baslik.meta}`, kazandiran,
        { emptyText: bosMetin }),
      chartPanel(baslik.bottom, `${kapsam} · ${baslik.meta}`, kaybettiren, {
        emptyText: panelOlcut === 'total'
          ? 'Zararda fonum yok.'
          : 'Bu pencerede düşen fonum yok.',
      }),
    ]),
  ];
}

/**
 * Akış paneli. Sıralama net akışın pencere BAŞINDAKİ büyüklüğe oranına göre.
 *
 * Ham TL fon büyüklüğünü sıralar, sıkıntıyı değil: HRZ parasının üçte birini
 * kaybederken −0,12 mr₺ olduğu için ham listede görünmez, PRY ise 112 mr₺'lik
 * fonun %7'siyle üçüncü sıraya çıkar.
 */
function flowPanel(title: string, meta: string, rows: RankEntry[], yon: string): HTMLElement {
  return chartPanel(title, meta, rows, {
    withFlow: true,
    emptyText: `Bu pencerede ${yon} olan fon yok.`,
  });
}

/**
 * Yatırımcı paneli. Akış paneliyle aynı ölçüt — değişim / pencere büyüklüğü —
 * ama farklı soruyu cevaplar: para nereye gitti değil, kim gitti.
 *
 * İkisi birlikte okunur: PBR'de para −%90,4 çıkarken insan −%53,4 azalmış,
 * yani önce büyük yatırımcılar çıkmış.
 */
function investorPanel(title: string, meta: string, rows: RankEntry[], yon: string): HTMLElement {
  return chartPanel(title, meta, rows, {
    withPeople: true,
    emptyText: `Bu pencerede ${yon} olan fon yok.`,
  });
}

async function dashboardView(reload: () => void): Promise<Node[]> {
  // Toggle kapalıyken sıralama sunucuda baştan daraltılır, grafikte bar
  // gizlenmez: gizleseydik top-10'da üç bar kalır, başlık yalan olurdu.
  const onlyOwned = readOnlyOwned();
  const [d, bekleyen] = await Promise.all([
    api(`/api/dashboard${onlyOwned ? '?onlyOwned=1' : ''}`) as Promise<Dashboard>,
    api('/api/portfolio/pending') as Promise<BekleyenAlim>,
  ]);
  const m = d.metrics;
  const run = m.lastRun;
  const p = m.portfolio ?? null;

  const kapsam = onlyOwned ? 'yalnız portföyüm' : 'takip edilen fonlar';
  const grid = (nodes: Node[]): HTMLElement => el('div', { class: 'chart-grid' }, nodes);

  return [
    el('div', { class: 'metric-grid' }, [
      // En başta: diğer üç kutu da bu güne ait. Hangi günün verisine
      // bakıldığı bilinmeden kazanç rakamları havada kalıyor.
      // Veri günü ile toplama zamanı tek kutuda: ikisi aynı sorunun parçası —
      // hangi günün verisine bakıyorum ve o ne zaman geldi. Ayrı kutulardayken
      // biri dörtlü ızgaraya sığmıyordu.
      metric(
        'Getiri Günü',
        gunAd(m.dataDate),
        // Üç ayrı durum, üç ayrı cümle. Koşum sürerken finished_at boş
        // olduğu için kutu "Henüz Koşmadı" diyordu; toplama tam o sırada
        // koşuyorken bu düpedüz yanlış bilgiydi.
        run === null
          ? 'Henüz Koşmadı'
          : run.finishedAt === null
          ? 'Toplanıyor…'
          // Gün geride kaldığında SEBEBİ yazılır. Toplama gününü yazmak kutuyu
          // kendisiyle çelişkiye düşürüyordu: başlıkta 9 Eylül, altında
          // "toplandı 10 Eylül". Toplama koştu; eksik olan fonların fiyatıydı
          // ve okuyanın öğrenmesi gereken tek şey buydu.
          : m.pendingFunds > 0
          ? `${String(m.pendingFunds)} fonun fiyatı gelmedi · toplandı ${run.finishedAt.slice(11)}`
          : `toplandı ${run.finishedAt.slice(11)} · ${String(m.trackedFunds)} fon`,
        'fund',
      ),
      // Panel'in üstünde artık portföyün kendisi duruyor. Takip Listem ve
      // Açık Pozisyon sayıları kendi ekranlarında zaten görünüyordu; kutu
      // sayısını artırmadan yerlerini bunlara bıraktılar.
      //
      // Bugünkü getiri yalnız grafikte bar olarak çiziliyordu, sayı olarak
      // hiçbir yerde yazmıyordu.
      metric(
        // "Bugünkü" değil: hafta sonu ve tatilde son ölçülen gün geçmişte
        // kalıyor ve kutu yine de dolu görünüyordu.
        'Günlük Getiri',
        p === null || p.dayGain === null ? '—' : money(p.dayGain),
        p === null || p.dayPct === null
          ? 'Ölçülebilir gün yok'
          // Tarih yazılır: hafta sonu ya da tatil ertesi bakan kullanıcı
          // "bugünkü" derken hangi günü gördüğünü bilmiyordu. Rakam son
          // ÖLÇÜLEBİLİR güne ait — fiyatı eksik günler portfolio_daily'ye
          // girmiyor — ve o gün bugün olmayabilir.
          : `${pct(Number(p.dayPct))}${p.dayDate === null ? '' : ` · ${gunAd(p.dayDate)}`}`,
        'chart',
      ),
      metric('Portföy Değeri', p === null ? '—' : money(p.value),
        // Portföy yoksa alt satır da susar: "— / 26 fon" çelişkili okunurdu.
        p !== null && typeof m.openLots === 'number'
          ? `${String(m.openPositions)} fon · ${String(m.openLots)} alım kaydı`
          : undefined,
        'portfolio'),
      // Yüzde net sermayeye bölünür: kazanılıp yeniden yatırılan tutar yeni
      // sermaye değil. Maliyete bölünseydi payda kendi kârıyla şişer ve
      // getiri olduğundan düşük görünürdü.
      metric('Toplam Kazanç', p === null ? '—' : money(p.totalGain),
        p === null || p.totalPct === null
          ? '—'
          // Kırılım kısa tutuldu: iki satıra taşıyordu ve açık/kapanan ayrımı
          // zaten Portföyüm ile Kapananlar ekranlarında duruyor. Buradaki iş
          // kapananların da dahil olduğunu söylemek.
          : `${pct(Number(p.totalPct))} · ${money(p.realizedGain)} kapanan dahil`,
        'money'),
    ]),
    ...positionSection(d.positions, onlyOwned, p?.netCapital ?? null, reload,
      watchlistToggle(!onlyOwned, (dahil) => {
        writeOnlyOwned(!dahil);
        reload();
      })),
    ...bekleyenAlimNotu(bekleyen),
    await performancePanel(),
  ];
}

/**
 * Piyasa: takip edilen fonların getiri, para akışı ve yatırımcı sayısı
 * sıralamaları.
 *
 * Panelden ayrıldı; panel "portföyüm ne durumda", bu ekran "piyasada ne
 * oluyor" sorusunu cevaplar. Veri aynı `/api/dashboard` yanıtından gelir,
 * sunucuda yeni uç yok.
 */
interface MarketRanks {
  returns: { top: RankEntry[]; bottom: RankEntry[] };
  flow: { top: RankEntry[]; bottom: RankEntry[] };
  investor: { top: RankEntry[]; bottom: RankEntry[] };
}

async function marketView(reload: () => void): Promise<Node[]> {
  const onlyOwned = readOnlyOwned();
  const sol = readPencere(0);
  const sag = readPencere(1);
  const q = (gun: number): string =>
    `/api/market?days=${String(gun)}${onlyOwned ? '&onlyOwned=1' : ''}`;
  // İki pencere paralel çekiliyor: sıralı istek ekranı iki kat bekletirdi.
  const [a, b] = await Promise.all([
    api(q(sol)) as Promise<MarketRanks>,
    api(q(sag)) as Promise<MarketRanks>,
  ]);

  const kapsam = onlyOwned ? 'yalnız portföyüm' : 'takip edilen fonlar';
  const grid = (nodes: Node[]): HTMLElement => el('div', { class: 'chart-grid' }, nodes);
  const ad = (gun: number): string => PENCERE_ADI[gun] ?? `${String(gun)} gün`;

  const bolum = (id: MarketSekme): HTMLElement => {
    if (id === 'flow') {
      return grid([
        flowPanel(`En çok giriş olan (${ad(sol)})`, kapsam, a.flow.top, 'giriş'),
        flowPanel(`En çok giriş olan (${ad(sag)})`, kapsam, b.flow.top, 'giriş'),
        flowPanel(`En çok çıkış olan (${ad(sol)})`, kapsam, a.flow.bottom, 'çıkış'),
        flowPanel(`En çok çıkış olan (${ad(sag)})`, kapsam, b.flow.bottom, 'çıkış'),
      ]);
    }
    if (id === 'investor') {
      return grid([
        investorPanel(`En çok artan (${ad(sol)})`, kapsam, a.investor.top, 'artış'),
        investorPanel(`En çok artan (${ad(sag)})`, kapsam, b.investor.top, 'artış'),
        investorPanel(`En çok azalan (${ad(sol)})`, kapsam, a.investor.bottom, 'azalış'),
        investorPanel(`En çok azalan (${ad(sag)})`, kapsam, b.investor.bottom, 'azalış'),
      ]);
    }
    return grid([
      chartPanel(`En çok kazandıran (${ad(sol)})`, kapsam, a.returns.top),
      chartPanel(`En çok kazandıran (${ad(sag)})`, kapsam, b.returns.top),
      chartPanel(`En çok kaybettiren (${ad(sol)})`, kapsam, a.returns.bottom,
        { emptyText: 'Bu pencerede ekside kapatan fon yok.' }),
      chartPanel(`En çok kaybettiren (${ad(sag)})`, kapsam, b.returns.bottom,
        { emptyText: 'Bu pencerede ekside kapatan fon yok.' }),
    ]);
  };

  const govde = el('div', {}, [bolum(readMarketSekme())]);
  const dugmeler = new Map<MarketSekme, HTMLElement>();
  const sec = (id: MarketSekme): void => {
    // Yeniden istek yok: iki pencerenin yanıtı üç bölümü de taşıyor, veri
    // elde. reload() çağırmak aynı rakamı ikinci kez indirmek olurdu ve
    // kaydırıcıların yerini de sıfırlardı.
    writeMarketSekme(id);
    for (const [k, d] of dugmeler) d.classList.toggle('tab-on', k === id);
    govde.replaceChildren(bolum(id));
  };
  const sekmeler = el('div', { class: 'tabs section-tabs' },
    MARKET_SEKME.map((id) => {
      const d = el('button', {
        type: 'button',
        class: `tab-btn${readMarketSekme() === id ? ' tab-on' : ''}`,
      }, [MARKET_SEKME_ADI[id]]);
      d.addEventListener('click', () => { sec(id); });
      dugmeler.set(id, d);
      return d;
    }));

  return [
    watchlistToggle(!onlyOwned, (dahil) => {
      writeOnlyOwned(!dahil);
      reload();
    }),
    // Tek şerit, iki kaydırıcı: soldaki bütün sol panelleri, sağdaki bütün
    // sağ panelleri yönetiyor. Ekranın amacı iki pencereyi yan yana
    // karşılaştırmak, o yüzden sol/sağ ayrımı korunuyor.
    el('div', { class: 'pencere-serit' }, [
      pencereKaydirici('Sol', sol, (g) => { writePencere(0, g); reload(); }),
      pencereKaydirici('Sağ', sag, (g) => { writePencere(1, g); reload(); }),
    ]),
    sekmeler,
    govde,
  ];
}

/**
 * Banka tanımları.
 *
 * İşlem formundaki banka alanı bu listeden beslenir; serbest metin girilemez.
 * Aynı banka "Nkolay", "nkolay", "NKolay" diye üç ayrı platform gibi
 * görünürse maliyet takibi platform bazında yapıldığı için doğrudan yanlış
 * rakam çıkardı.
 *
 * Kullanımdaki banka silinemez. Asıl güvence veritabanındaki foreign key;
 * buradaki kontrol yalnız kullanıcıya sebebini söylemek için.
 */
interface SystemFundRow {
  fundCode: string;
  title: string | null;
  note: string | null;
  addedAt: string;
  addedBy: string | null;
  holders: number;
  watchers: number;
}

/**
 * Sistem fon listesi: verisi toplansın istenen ama kimsenin takip listesinde
 * görünmemesi gereken fonlar.
 *
 * Bankalar panelinin deseni: aynı ekranda iki farklı ekle/sil biçimi olmasın.
 */
function systemFundPanel(funds: SystemFundRow[], reload: () => void): HTMLElement {
  const input = el('input', {
    placeholder: 'Fon kodu', maxlength: '16', spellcheck: 'false',
  }) as HTMLInputElement;
  const note = el('input', {
    placeholder: 'Neden (isteğe bağlı)', maxlength: '200',
  }) as HTMLInputElement;
  const status = el('span', { class: 'status' });
  const add = el('button', { class: 'btn-primary' }, [icon('add'), 'Ekle']);

  const ekle = (): void => {
    const fundCode = input.value.trim().toUpperCase();
    if (fundCode === '') {
      status.textContent = 'Fon kodu boş olamaz.';
      return;
    }
    void (async () => {
      try {
        status.textContent = 'Ekleniyor…';
        const r = (await api('/api/admin/funds', {
          method: 'POST',
          body: JSON.stringify({ fundCode, note: note.value }),
        })) as { added: boolean };
        if (!r.added) {
          status.textContent = `${fundCode} zaten listede.`;
          return;
        }
        input.value = '';
        note.value = '';
        reload();
      } catch (err) {
        status.textContent = err instanceof Error ? err.message : 'Eklenemedi.';
      }
    })();
  };
  add.addEventListener('click', ekle);
  for (const alan of [input, note]) {
    alan.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') { e.preventDefault(); ekle(); }
    });
  }

  const rows = funds.map((f) => {
    const sil = iconButton('delete', 'Listeden çıkar', 'danger');
    sil.addEventListener('click', () => {
      void (async () => {
        const ok = await confirmDelete({
          title: 'Sistem listesinden çıkar',
          detail: [`${f.fundCode}${f.title === null ? '' : ` — ${f.title}`}`],
          // Toplanmış veri silinmiyor; bu, kararı rahatlatan bir bilgi ve
          // söylenmezse kullanıcı geri dönüşü olmayan bir şey yapıyor sanır.
          warning: 'Toplanmış fiyat verisi silinmez; fon yalnız bundan sonra '
            + 'toplanmaz.',
          hint: f.holders + f.watchers === 0
            ? undefined
            : `Bu fon ${[
              ...(f.holders === 0 ? [] : [`${String(f.holders)} kullanıcının portföyünde`]),
              ...(f.watchers === 0 ? [] : [`${String(f.watchers)} kullanıcının takip listesinde`]),
            ].join(' ve ')}; toplanmaya devam edecek.`,
          confirmLabel: 'Listeden Çıkar',
        });
        if (!ok) return;
        try {
          await api(`/api/admin/funds/${encodeURIComponent(f.fundCode)}`, { method: 'DELETE' });
          reload();
        } catch (err) {
          status.textContent = err instanceof Error ? err.message : 'Çıkarılamadı.';
        }
      })();
    });
    return el('tr', {}, [
      el('td', {}, [
        el('span', { class: 'fund-code' }, [f.fundCode]),
        el('span', { class: 'fund-title' }, [f.title ?? '']),
      ]),
      el('td', {}, [f.note ?? '—']),
      // Açık pozisyon ile takip ayrı sayılıyor: biri parasını koymuş, diğeri
      // izliyor. Tek "kullanıcıda da var" rozeti ikisini aynı kefeye
      // koyuyordu ve fonu herkes sattığında da aynı şeyi yazıyordu.
      el('td', {}, f.holders === 0 && f.watchers === 0
        ? [badge('Yalnız sistem', 'closed')]
        : [
          ...(f.holders === 0 ? [] : [badge(`${String(f.holders)} portföyde`, 'open')]),
          ...(f.watchers === 0 ? [] : [badge(`${String(f.watchers)} takipte`, 'watch')]),
        ]),
      el('td', { class: 'num' }, [gunAd(f.addedAt.slice(0, 10))]),
      el('td', {}, [f.addedBy ?? '—']),
      el('td', { class: 'actions' }, [sil]),
    ]);
  });

  return panel(
    'Sistem Fonları',
    `${String(funds.length)} fon · verisi toplanır, kimsenin takip listesinde görünmez`,
    el('div', { class: 'panel-body' }, [
      el('p', { class: 'settings-note' }, [
        'Buraya eklenen fonların verisi toplanır ve Piyasa ekranında görünürler, '
        + 'ama hiçbir kullanıcının Takip Listem ekranına girmezler. Liste '
        + 'kullanıcıya bağlı değildir: ekleyen hesap silinse bile kayıt durur.',
      ]),
      el('div', { class: 'settings-actions settings-add' }, [input, note, add]),
      funds.length === 0
        ? el('div', { class: 'empty-state' }, ['Sistem listesinde fon yok.'])
        : table(['Fon', 'Not', 'Kullanıcılar', 'Eklendi', 'Ekleyen', ''], rows),
      status,
    ]),
  );
}

function bankPanel(banks: BankRow[], reload: () => void): HTMLElement {
  const input = el('input', { placeholder: 'Banka adı', maxlength: '60' }) as HTMLInputElement;
  const status = el('span', { class: 'status' });
  const add = el('button', { class: 'btn-primary' }, [icon('add'), 'Ekle']);

  const ekle = (): void => {
    const name = input.value.trim();
    if (name === '') {
      status.textContent = 'Banka adı boş olamaz.';
      return;
    }
    void (async () => {
      try {
        status.textContent = 'Ekleniyor…';
        await api('/api/admin/banks', { method: 'POST', body: JSON.stringify({ name }) });
        input.value = '';
        reload();
      } catch (err) {
        status.textContent = err instanceof Error ? err.message : 'Eklenemedi.';
      }
    })();
  };
  add.addEventListener('click', ekle);
  input.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') { e.preventDefault(); ekle(); }
  });

  const rows = banks.map((b) => {
    const sil = iconButton('delete', 'Sil', 'danger');
    sil.addEventListener('click', () => {
      void (async () => {
        // Kullanımdaki banka silme penceresi bile açılmadan reddedilir:
        // onaylatıp sonra "olmaz" demek kullanıcıyı boşuna yürütürdü.
        if (b.usage > 0) {
          status.textContent = `"${b.name}" ${String(b.usage)} işlemde kullanılıyor, silinemez.`;
          return;
        }
        const ok = await confirmDelete({
          title: 'Bankayı sil',
          detail: [b.name, 'Hiçbir işlemde kullanılmıyor'],
          confirmLabel: 'Bankayı Sil',
        });
        if (!ok) return;
        try {
          await api(`/api/admin/banks/${encodeURIComponent(b.name)}`, { method: 'DELETE' });
          reload();
        } catch (err) {
          status.textContent = err instanceof Error ? err.message : 'Silinemedi.';
        }
      })();
    });
    // Kullanımdaki bankanın silme düğmesi tıklanabilir kalır: devre dışı bir
    // düğme neden çalışmadığını söyleyemez, tıklanınca sebep yazılır.
    return el('tr', {}, [
      el('td', {}, [el('span', { class: 'fund-code' }, [b.name])]),
      el('td', { class: 'num' }, [b.usage === 0 ? '—' : String(b.usage)]),
      el('td', {}, [b.usage === 0
        ? badge('Kullanılmıyor', 'closed')
        : badge('Kullanımda', 'open')]),
      el('td', { class: 'actions' }, [sil]),
    ]);
  });

  return panel(
    'Bankalar',
    `${String(banks.length)} tanım · işlem formu bu listeden seçer`,
    el('div', { class: 'panel-body' }, [
      el('div', { class: 'settings-actions settings-add' }, [input, add]),
      banks.length === 0
        ? el('div', { class: 'empty-state' }, ['Tanımlı banka yok.'])
        : table(['Banka', 'İşlem', 'Durum', ''], rows),
      status,
    ]),
  );
}

/**
 * Profil: kullanıcı adı, görünen ad ve parola.
 *
 * İki ayrı form, tek panelde değil iki panelde: kimlik bilgisi ile parola
 * değiştirmenin sonuçları farklı. Kimlik alanlarını kaydetmek ekranı
 * tazeliyor, parola
 * değiştirmek oturumları düşürüp giriş ekranına atıyor. Tek "Kaydet"
 * düğmesinin altında birleştirilseydi kullanıcı adını düzeltmek isteyen biri
 * kendini giriş ekranında bulurdu.
 */
async function profileView(me: Me, reload: () => void): Promise<Node[]> {
  const guncel = (await api('/api/me')) as Me;

  const kullaniciAdi = el('input', {
    maxlength: '64', spellcheck: 'false', autocomplete: 'username',
  }) as HTMLInputElement;
  kullaniciAdi.value = guncel.username;
  const adSoyad = el('input', {
    maxlength: String(FULL_NAME_MAX), spellcheck: 'false', autocomplete: 'name',
    required: 'true',
  }) as HTMLInputElement;
  adSoyad.value = guncel.fullName;
  const eposta = el('input', {
    type: 'email', maxlength: String(EMAIL_MAX), spellcheck: 'false',
    autocomplete: 'email', required: 'true',
  }) as HTMLInputElement;
  eposta.value = guncel.email ?? '';
  const telegram = el('input', {
    maxlength: '33', spellcheck: 'false', placeholder: '@kullaniciadi',
  }) as HTMLInputElement;
  // Ekranda @ ile gösteriliyor, veritabanında @ olmadan duruyor.
  telegram.value = guncel.telegram === null ? '' : `@${guncel.telegram}`;
  const kimlikDurum = el('span', { class: 'status' });
  const kimlikKaydet = el('button', { class: 'btn-primary', type: 'submit' }, ['Kaydet']);

  const kimlikForm = el('form', { class: 'profil-form' }, [
    field('Kullanıcı adı', kullaniciAdi,
      'Giriş yaparken kullandığın ad. Değiştirirsen oturumun düşmez.'),
    field('Ad soyad', adSoyad),
    field('E-posta', eposta),
    field('Telegram', telegram, 'İsteğe bağlı. Baştaki @ olsa da olmasa da olur.'),
    el('div', { class: 'profil-aksiyon' }, [kimlikKaydet, kimlikDurum]),
  ]);
  kimlikForm.addEventListener('submit', (e) => {
    e.preventDefault();
    void (async () => {
      kimlikDurum.className = 'status';
      kimlikDurum.textContent = 'Kaydediliyor…';
      try {
        const yeni = (await api('/api/profile', {
          method: 'PATCH',
          body: JSON.stringify({
            username: kullaniciAdi.value,
            fullName: adSoyad.value,
            email: eposta.value,
            telegram: telegram.value,
          }),
        })) as Me;
        // Kabuk yeniden kuruluyor: kenar çubuğundaki ad ve baş harfler
        // değişmiş olabilir.
        void appShell({ ...me, ...yeni }, 'profile');
      } catch (err) {
        kimlikDurum.className = 'status status-error';
        kimlikDurum.textContent = err instanceof Error ? err.message : 'Kaydedilemedi.';
      }
    })();
  });

  const mevcut = el('input', {
    type: 'password', autocomplete: 'current-password', required: 'true',
  }) as HTMLInputElement;
  const yeni = el('input', {
    type: 'password', autocomplete: 'new-password', required: 'true', minlength: '8',
  }) as HTMLInputElement;
  const parolaDurum = el('span', { class: 'status' });

  const parolaForm = el('form', { class: 'profil-form' }, [
    field('Mevcut parola', mevcut),
    field('Yeni parola (en az 8 karakter)', yeni),
    el('div', { class: 'profil-aksiyon' }, [
      el('button', { class: 'btn-primary', type: 'submit' }, ['Parolayı Değiştir']),
      parolaDurum,
    ]),
  ]);
  parolaForm.addEventListener('submit', (e) => {
    e.preventDefault();
    void (async () => {
      parolaDurum.className = 'status';
      parolaDurum.textContent = 'Değiştiriliyor…';
      try {
        await api('/api/profile/password', {
          method: 'POST',
          body: JSON.stringify({ current: mevcut.value, password: yeni.value }),
        });
        loginScreen('Parola değişti, yeniden giriş yapın.');
      } catch (err) {
        parolaDurum.className = 'status status-error';
        parolaDurum.textContent = err instanceof Error ? err.message : 'Değiştirilemedi.';
      }
    })();
  });

  return [
    panel('Hesap', 'kullanıcı adı, ad soyad ve iletişim',
      el('div', { class: 'panel-body' }, [kimlikForm])),
    panel('Parola', 'değiştirmek için mevcut parolan gerekir',
      el('div', { class: 'panel-body' }, [
        parolaForm,
        el('p', { class: 'panel-note' }, [
          'Parola değişince açık olan bütün oturumlar kapanır — bu tarayıcı '
          + 'dahil. Değiştirmenin sebebi çoğu zaman "başkası girmiş olabilir" '
          + 'endişesidir ve o oturumun açık kalması işe yaramazdı.',
        ]),
      ])),
  ];
}

/**
 * Kullanıcının kendi tercihleri.
 *
 * Kendi seçimi olmayan kullanıcı genel ayardaki değeri devralır; değer kayıt
 * anında kopyalanmaz, yoksa admin genel ayarı değiştirdiğinde hiç tercih
 * belirtmemiş kullanıcılar eski değerde donar ve bunu fark etmezlerdi.
 */
async function prefsView(reload: () => void): Promise<Node[]> {
  const { benchmark } = (await api('/api/preferences')) as {
    benchmark: { code: string; personal: boolean; inherited: string; hasData: boolean };
  };

  const input = el('input', {
    maxlength: '16', placeholder: benchmark.inherited, spellcheck: 'false',
  }) as HTMLInputElement;
  input.value = benchmark.personal ? benchmark.code : '';
  const status = el('span', { class: 'status' });
  const save = el('button', { class: 'btn-primary' }, [icon('add'), 'Kaydet']);
  const reset = el('button', { class: 'btn-ghost' }, ['Genel Ayara Dön']);

  const gonder = (value: string | null): void => {
    void (async () => {
      try {
        status.textContent = 'Kaydediliyor…';
        await api('/api/preferences', {
          method: 'PUT', body: JSON.stringify({ benchmark: value }),
        });
        reload();
      } catch (err) {
        status.textContent = err instanceof Error ? err.message : 'Kaydedilemedi.';
      }
    })();
  };
  save.addEventListener('click', () => {
    const v = input.value.trim().toUpperCase();
    // Boş bırakmak "genel ayara dön" demektir: ayrı bir düğmeye zorlamaya
    // gerek yok, ama düğme de duruyor çünkü niyeti açıkça söylüyor.
    gonder(v === '' ? null : v);
  });
  reset.addEventListener('click', () => { gonder(null); });

  return [
    el('div', { class: 'metric-grid' }, [
      metric('Benchmark', benchmark.code,
        // Veri yoksa fon yeni seçilmiş demektir; toplaması sürüyor.
        !benchmark.hasData
          ? 'Verisi Toplanıyor'
          : benchmark.personal ? 'Kendi Seçimin' : 'Genel Ayardan Devralındı',
        'chart'),
    ]),
    panel(
      'Benchmark',
      benchmark.personal ? 'kişisel seçim' : `genel ayardan: ${benchmark.inherited}`,
      el('div', { class: 'panel-body' }, [
        el('p', { class: 'settings-note' }, [
          'Portföyünün getirisi bu fonun getirisiyle karşılaştırılır. Dönemsel ' +
          'Getiri ekranındaki fark sütunu bu fona göre hesaplanır.',
        ]),
        field('Fon Kodu', input,
          benchmark.personal
            ? `Genel ayar ${benchmark.inherited}. Boş bırakırsan ona dönersin.`
            : `Şu an genel ayardan ${benchmark.inherited} devralınıyor.`),
        el('div', { class: 'settings-actions' }, [
          status,
          ...(benchmark.personal ? [reset] : []),
          save,
        ]),
      ]),
    ),
  ];
}

/**
 * Collector koşum geçmişi.
 *
 * Panel'deki "Son Toplama" kutusu yalnız son zamanlanmış koşumun saatini
 * gösteriyor; süre, yazılan satır ve hata metni hiçbir yerde görünmüyordu.
 * Başarısız koşumun sebebi tam da bakılması gereken şey.
 */
async function runsView(): Promise<Node[]> {
  const runs = (await api('/api/admin/runs')) as IngestRunRow[];
  const scheduled = runs.filter((r) => r.source === 'fintables-watchlist');
  // Kısmi koşum da sorunlu: tamamı çökmemiş ama fonların bir kısmı düşmüş.
  // Yalnız 'failed' sayılsaydı kutu sorunları olduğundan az gösterirdi.
  const failed = runs.filter((r) => r.status === 'failed' || r.fundsFailed > 0);
  const son = scheduled[0];

  const sure = (r: IngestRunRow): string =>
    r.seconds === null ? '—' : r.seconds < 60
      ? `${String(r.seconds)}sn`
      : `${String(Math.floor(r.seconds / 60))}dk ${String(r.seconds % 60)}sn`;

  const rows: HTMLElement[] = [];
  for (const r of runs) {
    rows.push(el('tr', {}, [
      el('td', { class: 'num dim' }, [`#${String(r.id)}`]),
      el('td', {}, [r.source === 'fintables-watchlist'
        ? badge('Zamanlanmış', 'watch')
        : badge('Tek Fon', 'sold')]),
      el('td', { class: 'num' }, [r.startedAt]),
      el('td', { class: 'num dim' }, [sure(r)]),
      el('td', {}, [badge(
        r.status === 'passed' ? 'Başarılı' : r.status === 'failed' ? 'Hata'
          : r.status === 'partial' ? 'Kısmi' : 'Sürüyor',
        r.status === 'passed' ? 'open' : r.status === 'failed' ? 'danger' : 'sold',
      )]),
      el('td', { class: 'num' }, [
        r.fundsOk === 0 && r.fundsFailed === 0 ? '—' : String(r.fundsOk),
        ...(r.fundsFailed === 0 ? [] : [el('span', { class: 'num neg' }, [` +${String(r.fundsFailed)}`])]),
      ]),
      el('td', { class: 'num' }, [r.rowsUpserted === 0 ? '—' : r.rowsUpserted.toLocaleString('tr-TR')]),
    ]));
    // Hata metni kendi satırında: tabloya sığmayacak kadar uzun ve
    // kısaltıldığında işe yaramaz hale geliyor.
    if (r.lastError !== null && r.lastError !== '') {
      rows.push(el('tr', { class: 'run-error-row' }, [
        el('td', { colspan: '7' }, [el('code', { class: 'run-error' }, [r.lastError])]),
      ]));
    }
  }

  return [
    el('div', { class: 'metric-grid' }, [
      // Tarih ve saat tek değere sığmıyor, kutuda iki satıra taşıyordu:
      // tarih büyük, saat alt satırda.
      metric('Son Zamanlanmış', son === undefined ? '—' : son.startedAt.slice(0, 10),
        son === undefined ? 'Henüz koşum yok'
          : `${son.startedAt.slice(11)} · #${String(son.id)} · ${sure(son)}`, 'runs'),
      metric('Toplam Koşum', String(runs.length),
        `${String(scheduled.length)} zamanlanmış · ${String(runs.length - scheduled.length)} tek fon`,
        'chart', 'koşum'),
      metric('Sorunlu', String(failed.length),
        failed.length === 0 ? 'Hepsi geçti' : `Son: #${String(failed[0]?.id ?? 0)}`, 'flag', 'koşum'),
      metric('Son Koşumda Fon', son === undefined ? '—' : String(son.fundsOk),
        son === undefined || son.fundsFailed === 0
          ? 'Hepsi toplandı'
          : `${String(son.fundsFailed)} fonda hata`,
        'fund', 'fon'),
    ]),
    panel(
      'Collector Log',
      `${String(runs.length)} koşum · en yeni üstte`,
      el('div', { class: 'panel-body' }, [
        runs.length === 0
          ? el('div', { class: 'empty-state' }, ['Henüz bir toplama koşumu yok.'])
          : table(['#', 'Kaynak', 'Başlangıç', 'Süre', 'Durum', 'Fon', 'Yazılan Satır'], rows),
      ]),
    ),
    // Fon sayısı sonradan kaydedilmeye başlandı. Eski koşumlarda tire durur;
    // sayı geri getirilemiyor çünkü satırların ingest_run_id'si sonraki
    // koşumlarda el değiştiriyor ve türetme olduğundan az fon gösteriyor.
    ...(runs.some((r) => r.fundsOk === 0 && r.fundsFailed === 0 && r.rowsUpserted > 0)
      ? [el('p', { class: 'panel-note' }, [
          'Fon sayısı sonradan kaydedilmeye başlandı; daha eski koşumlarda tire ' +
          'görünür. Yazılan satır sayısı upsert edilen kayıtları sayar, yalnız ' +
          'yeni gelenleri değil — her koşum önceki beş günü yeniden yazar.',
        ])]
      : []),
  ];
}

/**
 * Sistem ayarları. Şimdilik tek ayar var: resmî tatiller.
 *
 * Liste, emir tarihinden gerçekleşme tarihini hesaplarken kullanılır. Geçmiş
 * günler fiyat verisinden anlaşılabilir ama emir verilirken ileriki günlerin
 * verisi henüz yok; bu yüzden elle tutuluyor.
 */
/** Bankalar: işlem formunun seçtiği liste. Ayarlar'dan ayrıldı. */
async function banksView(reload: () => void): Promise<Node[]> {
  const banks = (await api('/api/banks')) as BankRow[];
  const kullanilan = banks.filter((b) => b.usage > 0).length;
  return [
    el('div', { class: 'metric-grid' }, [
      metric('Banka', String(banks.length), 'Tanımlı', 'banks'),
      metric('Kullanımda', String(kullanilan),
        `${String(banks.length - kullanilan)} tanesi boş`, 'transactions'),
    ]),
    bankPanel(banks, reload),
  ];
}

/** Sistem fonları: verisi toplanan ama kimsenin listesinde olmayan fonlar. */
async function sysFundsView(reload: () => void): Promise<Node[]> {
  const funds = (await api('/api/admin/funds')) as SystemFundRow[];
  const yalniz = funds.filter((f) => f.holders + f.watchers === 0).length;
  return [
    el('div', { class: 'metric-grid' }, [
      metric('Sistem Fonu', String(funds.length), 'Toplama listesinde', 'sysfunds'),
      // Ayrımı göstermek gerekiyor: kullanıcıda da olan bir fon zaten
      // toplanıyordu, listeden çıkarmak onu durdurmaz.
      metric('Yalnız Sistemde', String(yalniz),
        `${String(funds.length - yalniz)} tanesi kullanıcıda da var`, 'fund'),
    ]),
    systemFundPanel(funds, reload),
  ];
}

async function settingsView(reload: () => void): Promise<Node[]> {
  const data = (await api('/api/admin/settings')) as { holidays: string[]; benchmark: string };
  const area = el('textarea', { rows: '14', spellcheck: 'false' }) as HTMLTextAreaElement;
  area.value = data.holidays.join('\n');
  const benchInput = el('input', {
    maxlength: '16', placeholder: 'TP2', spellcheck: 'false',
  }) as HTMLInputElement;
  benchInput.value = data.benchmark;
  const status = el('span', { class: 'status' });
  const save = el('button', { class: 'btn-primary' }, [icon('add'), 'Kaydet']);

  save.addEventListener('click', () => {
    void (async () => {
      const list = area.value.split('\n').map((x) => x.trim()).filter((x) => x !== '');
      try {
        status.textContent = 'Kaydediliyor…';
        const r = (await api('/api/admin/settings', {
          method: 'PUT',
          body: JSON.stringify({
            holidays: list,
            benchmark: benchInput.value.trim().toUpperCase(),
          }),
        })) as { holidays: string[]; benchmark: string };
        area.value = r.holidays.join('\n');
        benchInput.value = r.benchmark;
        status.textContent = `${String(r.holidays.length)} tatil kaydedildi.`;
        reload();
      } catch (err) {
        status.textContent = err instanceof Error ? err.message : 'Kaydedilemedi.';
      }
    })();
  });

  const sabit = data.holidays.filter((d) => d.length === 5);
  const yillik = data.holidays.filter((d) => d.length > 5);
  const yil = new Set(yillik.map((d) => d.slice(0, 4)));
  return [
    el('div', { class: 'metric-grid' }, [
      // Tek kutu: ikisi de aynı listenin parçası, ayrı kutulardayken
      // ilişkisiz iki ölçü gibi okunuyordu.
      metric(
        'Resmî Tatil',
        String(data.holidays.length),
        `${String(sabit.length)} sabit · ${String(yillik.length)} yıla özel` +
          (yil.size === 0 ? '' : ` (${[...yil].sort().join(', ')})`),
        'flag',
        'gün',
      ),
      metric('Benchmark', data.benchmark, 'Karşılaştırma Fonu', 'chart'),

    ]),
    panel(
      'Benchmark',
      'karşılaştırma fonu',
      el('div', { class: 'panel-body' }, [
        el('p', { class: 'settings-note' }, [
          'Portföyün getirisi bu fonun getirisiyle karşılaştırılır. Dönemsel ' +
          'Getiri ekranında her ay ve hafta için fark puan olarak gösterilir.',
        ]),
        field('Fon Kodu', benchInput, 'TEFAS kodu.'),
      ]),
    ),
    panel(
      'Resmî Tatiller',
      'her satıra bir tarih',
      el('div', { class: 'panel-body' }, [
        el('p', { class: 'settings-note' }, [
          'Bu günler piyasa günü sayılmaz; emir tarihinden alış ve satış tarihi ' +
          'hesaplanırken hafta sonlarıyla birlikte atlanır.',
        ]),
        el('div', { class: 'settings-formats' }, [
          el('div', {}, [
            el('code', {}, ['AA-GG']),
            el('span', {}, ['Her yıl tekrarlayan sabit tatil — 23 Nisan her yıl 23 Nisan.']),
          ]),
          el('div', {}, [
            el('code', {}, ['YYYY-AA-GG']),
            el('span', {}, ['Yalnız o yıla ait tatil — dinî bayramlar hicrî takvimle kayar.']),
          ]),
        ]),
        area,
        el('div', { class: 'settings-actions' }, [status, save]),
      ]),
    ),
  ];
}

// ─── Giriş ──────────────────────────────────────────────────────────────────

function loginScreen(message?: string): void {
  const username = el('input', { name: 'username', autocomplete: 'username', required: 'true' });
  const password = el('input', {
    name: 'password', type: 'password', autocomplete: 'current-password', required: 'true',
  });
  const card = el('form', { class: 'login-card' }, [
    brand(),
    field('Kullanıcı adı', username),
    field('Parola', password),
    el('button', { type: 'submit', class: 'btn-primary btn-block' }, ['Giriş yap']),
    ...(message === undefined ? [] : [errorBox(message)]),
  ]);
  card.addEventListener('submit', (e) => {
    e.preventDefault();
    void (async () => {
      try {
        const me = (await api('/api/login', {
          method: 'POST',
          body: JSON.stringify({ username: username.value, password: password.value }),
        })) as Me;
        if (me.mustChangePassword) passwordScreen();
        else void appShell(me, 'dashboard');
      } catch (err) {
        loginScreen(err instanceof Error ? err.message : 'Giriş başarısız.');
      }
    })();
  });
  root?.replaceChildren(el('div', { class: 'login-shell' }, [card]));
}

function passwordScreen(message?: string): void {
  const pw = el('input', { type: 'password', autocomplete: 'new-password', required: 'true' });
  const card = el('form', { class: 'login-card' }, [
    brand(),
    el('p', { class: 'hint' }, ['İlk girişte parolanızı belirlemeniz gerekiyor.']),
    field('Yeni parola (en az 8 karakter)', pw),
    el('button', { type: 'submit', class: 'btn-primary btn-block' }, ['Kaydet']),
    ...(message === undefined ? [] : [errorBox(message)]),
  ]);
  card.addEventListener('submit', (e) => {
    e.preventDefault();
    void (async () => {
      try {
        await api('/api/password', { method: 'POST', body: JSON.stringify({ password: pw.value }) });
        loginScreen('Parola değişti, yeniden giriş yapın.');
      } catch (err) {
        passwordScreen(err instanceof Error ? err.message : 'Değiştirilemedi.');
      }
    })();
  });
  root?.replaceChildren(el('div', { class: 'login-shell' }, [card]));
}

// ─── Portföy görünümü ───────────────────────────────────────────────────────

/**
 * Formu tek gönderime kilitler.
 *
 * İstek uçarken düğme açık kalıyor ve pencere ancak cevap dönünce kapanıyordu.
 * Aradaki boşlukta ikinci bir tıklama ikinci bir kayıt açıyor: 50.000 satmak
 * isteyip 100.000 satmış oluyorsun ve iki kayıt da geçerli göründüğü için fark
 * etmiyorsun. Sunucu bunu ayıramaz — iki istek de meşru, sıra da doğru işliyor;
 * çift gönderimi olanaksız kılmak gönderen tarafın işi.
 *
 * Kilit yalnız uçuş boyunca: hata dönerse düğme geri açılır, yoksa düzeltip
 * yeniden denemek imkânsız olurdu.
 */
function tekGonderim(
  form: HTMLElement,
  submit: HTMLButtonElement,
  status: HTMLElement,
  gonder: () => Promise<void>,
  hataMetni: string,
): void {
  let ucusta = false;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (ucusta) return;
    ucusta = true;
    submit.disabled = true;
    void (async () => {
      try {
        status.textContent = 'Kaydediliyor…';
        await gonder();
      } catch (err) {
        ucusta = false;
        submit.disabled = false;
        status.textContent = err instanceof Error ? err.message : hataMetni;
      }
    })();
  });
}

/**
 * Sayı girdisini gerçekten sayıya kapatır.
 *
 * `type="number"` bilimsel gösterimi kabul ediyor: "e", "+" ve "-" yazılabiliyor.
 * Yazıldığı anda girdi geçersiz sayılıyor ve `value` boş dönüyor — ekranda "e"
 * duruyor ama okuyan taraf boş görüyor, bu yüzden satış penceresinde alım
 * listesi sebepsiz kayboluyordu. Yapıştırmada da aynı yoldan girebiliyor.
 */
function sadeceSayi(input: HTMLInputElement): void {
  input.addEventListener('keydown', (e) => {
    if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
  });
  input.addEventListener('paste', (e) => {
    const metin = e.clipboardData?.getData('text') ?? '';
    if (/[^\d.,\s]/.test(metin)) e.preventDefault();
  });
}

/**
 * İki tarih birbirini tamamlar: hangisi doldurulursa diğeri valöre göre
 * hesaplanır. Kullanıcı elle yazdığını ezmemek için yalnız boş olan alan
 * doldurulur.
 *
 * Valör günü ve tatil listesi fon seçildikten sonra sunucudan geliyor; bu
 * yüzden değer olarak değil okuyucu olarak alınır. Alanlar bağlandığında
 * ikisi de henüz bilinmiyor olabilir.
 */
/**
 * Sabit biçimli tarih alanı: gg-aa-yyyy.
 *
 * `type="date"` biçimi tarayıcının diline göre çiziyor. İngilizce bir
 * tarayıcıda aa/gg/yyyy görünüyor ve 08-09 ile 09-08 birbirine karışıyor —
 * fon işleminde bu doğrudan yanlış maliyet demek. Biçim artık sayfaya ait,
 * tarayıcıya değil.
 *
 * Değer alanda gg-aa-yyyy duruyor, sunucuya ISO gidiyor; dönüşüm
 * `tarihOku`/`tarihYaz` üzerinden tek yerde.
 */
function tarihGirdisi(attrs: Record<string, string> = {}): HTMLInputElement {
  const i = el('input', {
    type: 'text', inputmode: 'numeric', maxlength: '10',
    placeholder: 'gg-aa-yyyy', autocomplete: 'off', spellcheck: 'false',
    ...attrs,
  }) as HTMLInputElement;
  // Tireleri kullanıcı yazmıyor; rakam girdikçe kendiliğinden açılıyor.
  i.addEventListener('input', () => {
    const r = i.value.replace(/\D/g, '').slice(0, 8);
    const p: string[] = [];
    if (r.length > 0) p.push(r.slice(0, 2));
    if (r.length > 2) p.push(r.slice(2, 4));
    if (r.length > 4) p.push(r.slice(4, 8));
    i.value = p.join('-');
    // Yazarken kızarmasın: tarih ancak tamamlandığında yanlış olabilir.
    if (i.value.length === 10 || i.value === '') tarihDogrula(i);
    else i.setCustomValidity('');
  });
  i.addEventListener('blur', () => { tarihDogrula(i); });
  return i;
}

/**
 * Alanı doğrular ve mesajı yerleştirir; geçerliyse true.
 *
 * Üç yerde çağrılıyor: yazarken (tamamlanınca), alandan çıkarken ve
 * gönderimden hemen önce. Sonuncusu şart — kullanıcı yarım tarih yazıp
 * doğrudan Kaydet'e basabiliyor ve alan hiç blur almıyor.
 */
function tarihDogrula(i: HTMLInputElement): boolean {
  const bos = i.value.trim() === '';
  const gecerli = bos ? !i.required : tarihOku(i) !== '';
  i.setCustomValidity(gecerli
    ? ''
    : bos ? 'Tarih girin.' : 'Geçerli bir tarih yazın: gg-aa-yyyy.');
  return gecerli;
}

/** Alandaki gg-aa-yyyy değerini ISO'ya çevirir; geçersizse boş döner. */
function tarihOku(i: HTMLInputElement): string {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(i.value.trim());
  if (m === null) return '';
  const [, gun, ay, yil] = m;
  const iso = `${String(yil)}-${String(ay)}-${String(gun)}`;
  // Date ile doğrulama: 31-02-2026 biçim olarak doğru ama gün olarak yok.
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? '' : iso;
}

/**
 * Tarih alanı + takvim düğmesi.
 *
 * Biçim sayfaya ait kalıyor ama seçici geri geliyor: gizli bir `type=date`
 * alanının yerel takvimi `showPicker()` ile açılıyor, seçilen gün metin
 * alanına gg-aa-yyyy olarak yazılıyor. Gizli alan hiç görünmüyor, yani
 * tarayıcının biçimi de ekrana çıkmıyor.
 */
function tarihAlani(i: HTMLInputElement): HTMLElement {
  const gizli = el('input', {
    type: 'date', class: 'date-hidden', tabindex: '-1', 'aria-hidden': 'true',
  }) as HTMLInputElement;
  const btn = el('button', {
    type: 'button', class: 'date-pick', title: 'Takvimden seç',
    'aria-label': 'Takvimden seç',
  }, [icon('calendar')]);
  btn.addEventListener('click', () => {
    gizli.value = tarihOku(i);
    // showPicker desteklenmiyorsa metin alanına düşülür; elle yazmak zaten
    // asıl yol, takvim kolaylık.
    try {
      gizli.showPicker();
    } catch {
      i.focus();
    }
  });
  gizli.addEventListener('change', () => {
    tarihYaz(i, gizli.value);
    i.setCustomValidity('');
    // Valör hesabı 'change' dinliyor; takvimden seçmek de elle yazmak gibi
    // sayılmalı.
    i.dispatchEvent(new Event('change', { bubbles: true }));
  });
  return el('div', { class: 'date-field' }, [i, gizli, btn]);
}

/** ISO değeri alana gg-aa-yyyy olarak yazar. */
function tarihYaz(i: HTMLInputElement, iso: string | null): void {
  i.value = iso === null || iso === ''
    ? ''
    : `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}`;
}

function linkValorDates(
  order: HTMLInputElement,
  settle: HTMLInputElement,
  days: () => number | null,
  holidays: () => string[],
): void {
  // Alanlar gg-aa-yyyy taşıyor; hesap ISO ile yapılıyor.
  order.addEventListener('change', () => {
    const d = days();
    const iso = tarihOku(order);
    if (d === null || iso === '') return;
    try { tarihYaz(settle, settlementFromOrder(iso, d, holidays())); } catch { /* elle girilsin */ }
  });
  settle.addEventListener('change', () => {
    const d = days();
    const iso = tarihOku(settle);
    if (d === null || iso === '' || order.value !== '') return;
    try { tarihYaz(order, orderFromSettlement(iso, d, holidays())); } catch { /* elle girilsin */ }
  });
}

/**
 * İşlem formu. Gövdeyi ve kaydet düğmesini ayrı döndürür: pencerede gövde
 * ortada, eylemler altta sabit bir şeritte durur.
 */
/**
 * En son kullanılan banka.
 *
 * Sunucuda tutulmuyor: bu bir tercih, veri değil. Cihaz değişince
 * hatırlanmaması kabul edilebilir — alan yine de boş gelir, yanlış bir
 * banka seçili gelmez.
 */
const SON_BANKA_KEY = 'tefas.tx.platform';

function readSonBanka(): string {
  try {
    return localStorage.getItem(SON_BANKA_KEY) ?? '';
  } catch {
    return '';
  }
}

function writeSonBanka(value: string): void {
  try {
    localStorage.setItem(SON_BANKA_KEY, value);
  } catch {
    // Depolama kapalıysa alan her seferinde boş gelir; yanlış değer gelmez.
  }
}

/** İşlem formunu emirden gelen değerlerle açmak için. */
interface IslemOnDolgu {
  fundCode: string;
  platform: string;
  tradeDate: string;
  units: string;
  note: string | null;
}

function transactionForm(
  existing: Transaction | null,
  onDone: () => void,
  onDolgu?: IslemOnDolgu,
  kayitSonrasi?: () => Promise<void>,
): {
  body: HTMLElement;
  submit: HTMLButtonElement;
} {
  // Fon serbest metin değil: yazılan kod hiçbir listeden geçmiyordu ve
  // sistemde olmayan bir fonda valör de fiyat da gelmiyor, form sessizce
  // eksik kalıyordu. Değer gizli girdide taşınıyor; seçici onu yazıyor.
  const f = {
    fundCode: el('input', { type: 'hidden', required: 'true' }),
    units: el('input', { type: 'number', step: 'any', min: '0', placeholder: '1000' }),
    // Adet bilinmiyorsa tutar: TEFAS'ta emir tutarla veriliyor ve kaç pay
    // alındığı fiyat açıklanınca belli oluyor. İkisinden biri yeterli.
    orderAmount: el('input', { type: 'number', step: 'any', min: '0', placeholder: '50000' }),
    buyOrderDate: tarihGirdisi(),
    tradeDate: tarihGirdisi({ required: 'true' }),
    platform: el('select', { required: 'true' }) as HTMLSelectElement,
    sellOrderDate: tarihGirdisi(),
    sellDate: tarihGirdisi(),
    // textarea değil input: sınır zaten tek satırlık. Çok satırlı bir kutu
    // paragraf yazmaya davet eder, tabloda da öyle görünmez.
    note: el('input', { maxlength: String(NOTE_MAX), placeholder: 'İsteğe bağlı' }),
  };
  if (onDolgu !== undefined) {
    f.fundCode.value = onDolgu.fundCode;
    f.units.value = onDolgu.units;
    f.note.value = onDolgu.note ?? '';
    tarihYaz(f.tradeDate, onDolgu.tradeDate);
  }
  if (existing) {
    f.fundCode.value = existing.fundCode;
    // Kolon numeric(24,6): veritabanı "9911.000000" döndürüyor ve alan onu
    // olduğu gibi basıyordu. Fon payı kesirli olabildiği için haneler duruyor
    // ama gereksiz sıfırlar atılır: 9911.000000 → 9911, 12.345600 → 12.3456.
    f.units.value = existing.units === null ? '' : String(Number(existing.units));
    f.orderAmount.value = existing.orderAmount === null ? '' : String(Number(existing.orderAmount));
    f.note.value = existing.note ?? '';
    tarihYaz(f.buyOrderDate, existing.buyOrderDate);
    tarihYaz(f.tradeDate, existing.tradeDate);
    tarihYaz(f.sellOrderDate, existing.sellOrderDate);
    tarihYaz(f.sellDate, existing.sellDate);
  }

  // Banka listesi tanımlardan gelir; alan serbest metin değil. Liste boşsa
  // kullanıcı hiçbir işlem kaydedemez, bu yüzden sessiz boş bir açılır liste
  // yerine nereye gitmesi gerektiğini söyleyen bir uyarı gösterilir.
  // Seçici, arama yapılan diğer alanlarla aynı bileşen: kullanıcı bu
  // etkileşimi Fon Hareketleri filtresinden biliyor.
  const fonHint = el('div', { class: 'field-hint' }, ['Yükleniyor…']);
  const fonSarmal = el('div', { class: 'combo-field' }, []);
  const fonAlani = el('div', { class: 'field' }, [
    el('label', {}, ['Fon']), fonSarmal, fonHint,
  ]);
  let fonlar: { fundCode: string; title: string | null }[] = [];

  const fonSeciciCiz = (): void => {
    fonSarmal.replaceChildren(comboFilter({
      label: 'Fon seç',
      options: fonlar.map((x) => ({
        value: x.fundCode, label: x.fundCode, hint: x.title ?? undefined,
      })),
      value: f.fundCode.value,
      // Zorunlu alanda temizleme düğmesi ölü olur: boş bir değere dönülemiyor.
      clearable: false,
      onChange: (v) => {
        f.fundCode.value = v;
        fonSeciciCiz();
        // Valör fona bağlı; seçim değişince yeniden yükleniyor.
        loadSettlement();
      },
    }));
  };

  void (async () => {
    try {
      fonlar = (await api('/api/funds')) as { fundCode: string; title: string | null }[];
      // Düzenlenen kayıt listede yoksa yine de gösterilir: aksi hâlde
      // kullanıcı kendi kaydını düzenleyemez hâle gelirdi.
      if (existing !== null && !fonlar.some((x) => x.fundCode === existing.fundCode)) {
        fonlar = [{ fundCode: existing.fundCode, title: existing.fundTitle }, ...fonlar];
      }
      fonHint.textContent = 'Kod ya da ada göre ara. Listede yoksa önce '
        + 'Takip Listem\'den ekle; verisi çekilince burada çıkar.';
      fonSeciciCiz();
    } catch {
      fonHint.textContent = 'Fon listesi alınamadı.';
      fonHint.classList.add('field-warn');
    }
  })();

  const bankHint = el('div', { class: 'field-hint' }, ['Yükleniyor…']);
  void (async () => {
    try {
      const banks = (await api('/api/banks')) as { name: string }[];
      if (banks.length === 0) {
        bankHint.textContent = 'Tanımlı banka yok. Ayarlar ekranından banka ekleyin.';
        bankHint.classList.add('field-warn');
        return;
      }
      // Boş seçenek başta: listenin ilk bankası kendiliğinden seçili gelince
      // kullanıcı alanı okumadan geçiyor ve işlem yanlış bankaya yazılıyordu.
      f.platform.append(el('option', { value: '' }, ['Banka seçin']));
      for (const b of banks) f.platform.append(el('option', { value: b.name }, [b.name]));
      // Düzenlemede mevcut değer seçili gelmeli; seçenekler eklenmeden önce
      // atanan value boşa düşerdi. Yeni kayıtta en son kullanılan banka —
      // arka arkaya işlem girilirken hep aynı bankadan giriliyor.
      const sonBanka = readSonBanka();
      f.platform.value = existing?.platform ?? onDolgu?.platform
        ?? (banks.some((b) => b.name === sonBanka) ? sonBanka : '');
      bankHint.textContent = '';
    } catch {
      bankHint.textContent = 'Banka listesi alınamadı.';
      bankHint.classList.add('field-warn');
    }
  })();

  // Valör hesabı için gereken veri: tatiller ve fonun valör günleri. Fon kodu
  // değiştikçe yenilenir; bilinmeyen fonda valör null kalır ve hesap atlanır,
  // kullanıcı tarihleri elle girer.
  let holidayList: string[] = [];
  let valor: { buy: number; sell: number } | null = null;
  /**
   * Emir tarihi girilmiş ama karşılığı boşsa hesabı tamamlar.
   *
   * Yalnız BOŞ alanı doldurur: kullanıcı tarihi elle değiştirmişse üstüne
   * yazmak, girdiğini sessizce ezmek olurdu.
   */
  const valorTamamla = (): void => {
    if (valor === null) return;
    for (const [emir, sonuc, gun] of [
      [f.buyOrderDate, f.tradeDate, valor.buy],
      [f.sellOrderDate, f.sellDate, valor.sell],
    ] as const) {
      const iso = tarihOku(emir);
      if (iso === '' || sonuc.value.trim() !== '') continue;
      try {
        tarihYaz(sonuc, settlementFromOrder(iso, gun, holidayList));
      } catch {
        // Hesaplanamıyorsa elle girilir.
      }
    }
  };

  const loadSettlement = (): void => {
    const code = f.fundCode.value.trim().toUpperCase();
    void (async () => {
      try {
        const q = code === '' ? '' : `?fundCode=${encodeURIComponent(code)}`;
        const r = (await api(`/api/settlement${q}`)) as {
          holidays: string[];
          valor: { buy: number; sell: number } | null;
        };
        holidayList = r.holidays;
        valor = r.valor;
        hintValor();
        // Valör fon koduyla birlikte geliyor ama tarih ondan önce girilmiş
        // olabilir: kullanıcı önce tarihi, sonra fonu yazınca hesap hiç
        // koşmuyordu ve alan boş kalıyordu. Sıra kullanıcının işi değil.
        valorTamamla();
      } catch {
        valor = null;
      }
    })();
  };
  // Valör bilgisi ilgili bölümün başlığında durur: "ALIŞ · T+1 iş günü".
  // Formun dibinde tek satır olarak dururken hangi alanla ilgili olduğu
  // anlaşılmıyordu. Fon girilmemiş ya da tanınmamışsa hiçbir şey yazılmaz.
  const buyValorNote = el('span', { class: 'section-note' }, ['']);
  const sellValorNote = el('span', { class: 'section-note' }, ['']);
  const hintValor = (): void => {
    const note = (days: number | undefined): string =>
      days === undefined ? '' : `T+${String(days)} iş günü`;
    buyValorNote.textContent = note(valor?.buy);
    sellValorNote.textContent = note(valor?.sell);
  };

  sadeceSayi(f.units);
  linkValorDates(f.buyOrderDate, f.tradeDate, () => valor?.buy ?? null, () => holidayList);
  linkValorDates(f.sellOrderDate, f.sellDate, () => valor?.sell ?? null, () => holidayList);
  loadSettlement();

  const status = el('span', { class: 'status' });
  const submit = el('button', { type: 'submit', class: 'btn-primary' }, [
    existing ? 'Güncelle' : 'Alış Ekle',
  ]) as HTMLButtonElement;
  // İki alan aynı anda açık kalınca hangisinin geçerli olduğu formda
  // görünmüyordu. Kip seçilir: ya adet ya tutar, ikisi birden değil.
  const adetAlani = field('Adet', f.units, 'Fon payı adedi, tutar değil.');
  // Bu ipucu uyarı rengiyle: alanın sonucu diğerlerinden farklı — girilen
  // kayıt hiçbir hesaba katılmayacak ve kullanıcı bunu alanı doldurmadan
  // önce görmeli.
  const tutarAlani = field('Tutar ₺', f.orderAmount,
    el('div', { class: 'field-hint field-pending' }, [
      'Bankaya verdiğin tutar. Adet gelene kadar kayıt pasif bekler, '
      + 'hiçbir hesaba katılmaz.',
    ]));

  const kipDugmesi = (kip: 'adet' | 'tutar', etiket: string): HTMLElement =>
    el('button', { type: 'button', class: 'tab-btn', 'data-kip': kip }, [etiket]);
  // Ayrım olgusal: adet belli mi değil mi. "Gerçek / geçici" kaydın
  // gerçekliğini tartışıyor gibi okunuyordu — oysa alım gerçek, eksik olan
  // yalnız adet. Rozet sonucu söylüyor (Pasif), bu seçici sebebi.
  const gercekBtn = kipDugmesi('adet', 'Adet Belli · Kesin Giriş');
  const geciciBtn = kipDugmesi('tutar', 'Adet Belli Değil · Ön Giriş');
  const kipSecici = el('div', { class: 'tabs mode-tabs' }, [gercekBtn, geciciBtn]);

  const kipUygula = (kip: 'adet' | 'tutar'): void => {
    const adet = kip === 'adet';
    gercekBtn.classList.toggle('tab-on', adet);
    geciciBtn.classList.toggle('tab-on', !adet);
    adetAlani.hidden = !adet;
    tutarAlani.hidden = adet;
    // required kiple birlikte taşınıyor; yoksa gizli alan gönderimi
    // engelliyor ve kullanıcı sebebini göremiyor.
    f.units.toggleAttribute('required', adet);
    f.orderAmount.toggleAttribute('required', !adet);
    if (adet) f.orderAmount.setCustomValidity('');
    else f.units.setCustomValidity('');
  };
  gercekBtn.addEventListener('click', () => { kipUygula('adet'); });
  geciciBtn.addEventListener('click', () => { kipUygula('tutar'); });
  // Düzenlemede kip kaydın kendisinden: pasif kayıt açılınca tutar kipinde
  // gelir, adedi yazmak için kullanıcı "Gerçek alım"a geçer.
  kipUygula(existing !== null && existing.units === null ? 'tutar' : 'adet');

  const form = el('form', { class: 'modal-form-grid', id: 'tx-form' }, [
    // En üstte ve tam genişlikte: altındaki alanın ne olacağını belirliyor,
    // sonuç sebebin altında durmalı.
    el('div', { class: 'field field-wide' }, [
      el('label', {}, ['Giriş türü']),
      kipSecici,
      el('div', { class: 'field-hint field-pending' }, [
        'Bankaya tutar söyleyip adedi sonra öğreniyorsan Ön Giriş yap: '
        + 'kayıt adet girilene kadar pasif bekler ve hiçbir hesaba katılmaz.',
      ]),
    ]),
    fonAlani,
    adetAlani,
    tutarAlani,
    el('div', { class: 'form-section' }, [el('span', {}, ['Alış']), buyValorNote]),
    field('Emir Tarihi', tarihAlani(f.buyOrderDate), 'İsteğe bağlı; girilirse alış tarihi hesaplanır.'),
    field('Alış Tarihi', tarihAlani(f.tradeDate), 'Emrin fiyatlandığı gün.'),
    field('Banka', f.platform, bankHint),
    // Satış alanları yalnız SATILMIŞ kaydı düzenlerken çıkar.
    //
    // Satış artık kendi eylemi: adet giriliyor ve paylar en eski alımdan
    // düşülüyor. Açık bir kayda buradan satış tarihi yazmak o sırayı atlamanın
    // yolu olurdu — alan hiç bulunmayınca kural savunulacak bir şey değil,
    // yapının kendisi oluyor.
    //
    // Satılmış kayıtta duruyor, çünkü yanlış girilmiş bir tarihi düzeltmenin
    // veya alanı boşaltıp satışı geri almanın başka yolu yok.
    ...(existing !== null && existing.sellDate !== null
      ? [
          el('div', { class: 'form-section' }, [el('span', {}, ['Satış']), sellValorNote]),
          field('Satış Emir Tarihi', tarihAlani(f.sellOrderDate),
            'İsteğe bağlı; girilirse satış tarihi hesaplanır.'),
          field('Satış Tarihi', tarihAlani(f.sellDate), 'Boşaltılırsa pozisyon yeniden açılır.'),
        ]
      : []),
    // Not en altta: kaydın kendisi değil, kayıt hakkında. Zorunlu alanların
    // arasına girseydi doldurulması gerekiyormuş gibi görünürdü.
    field('Not', f.note, `İsteğe bağlı, en fazla ${String(NOTE_MAX)} karakter.`),
    status,
  ]);
  submit.setAttribute('form', 'tx-form');

  tekGonderim(form, submit, status, async () => {
    // Yarım yazılmış tarih gönderime sızmasın: alanlar blur almamış olabilir.
    for (const t of [f.buyOrderDate, f.tradeDate, f.sellOrderDate, f.sellDate]) {
      if (!tarihDogrula(t)) {
        t.reportValidity();
        throw new Error('Tarihi gg-aa-yyyy olarak yazın.');
      }
    }
    // Kip hangisiyse o gönderilir. Tutar kipinde adet gönderilmez: aksi
    // hâlde eski bir değer kayda sızıp pasif kaydı sessizce aktifleştirirdi.
    const tutarKipi = !tutarAlani.hidden;
    const payload = {
      fundCode: f.fundCode.value,
      platform: f.platform.value,
      tradeDate: tarihOku(f.tradeDate),
      units: tutarKipi ? null : f.units.value || null,
      // Tutar aktifleşince de saklanıyor: ne ödendiği bilgisi değerli.
      orderAmount: f.orderAmount.value || null,
      buyOrderDate: tarihOku(f.buyOrderDate) || null,
      sellOrderDate: tarihOku(f.sellOrderDate) || null,
      sellDate: tarihOku(f.sellDate) || null,
      note: f.note.value,
    };
    const kaydet = async (onayli: boolean): Promise<void> => {
      await api(
        existing ? `/api/transactions/${String(existing.id)}` : '/api/transactions',
        {
          method: existing ? 'PUT' : 'POST',
          body: JSON.stringify(onayli ? { ...payload, confirmDuplicate: true } : payload),
        },
      );
    };
    try {
      await kaydet(false);
    } catch (err) {
      // Mükerrer uyarısı hata değil, soru: kullanıcı ısrar edebilir.
      const g = (err as { body?: unknown }).body;
      const mukerrer = typeof g === 'object' && g !== null && 'duplicate' in g;
      if (!mukerrer) throw err;
      const kac = Number((g as { existing?: unknown }).existing ?? 1);
      const devam = await confirmDelete({
        title: 'Bu kayıt zaten var',
        detail: [
          `${payload.fundCode.toUpperCase()} · ${payload.tradeDate}`,
          `${payload.platform} · ${payload.units} adet`,
          `Listede birebir aynısından ${String(kac)} tane duruyor.`,
        ],
        warning: 'Yine de eklersen aynı işlem iki kez sayılır; maliyet ve '
          + 'getiri rakamların bozulur.',
        hint: 'Gerçekten iki ayrı işlem yaptıysan eklemekte sorun yok.',
        confirmLabel: 'Yine de ekle',
      });
      if (!devam) {
        status.textContent = 'Eklenmedi.';
        throw new Error('Eklenmedi.');
      }
      await kaydet(true);
    }
    writeSonBanka(f.platform.value);
    // Emir işleme dönüştüyse emir kaydı burada siliniyor: iki yerde iki
    // kayıt kalmamalı. Kayıt yazıldıktan sonra çalıştığı için başarısız
    // olursa işlem yine yerinde durur.
    if (kayitSonrasi !== undefined) {
      try {
        await kayitSonrasi();
      } catch {
        // Emir silinemediyse kullanıcı elle silebilir; işlem kaydı sağlam.
      }
    }
    // Kayıt yazıldı. Buradan sonra bir şey patlarsa "kaydedilemedi" demek
    // yanlış olur ve kullanıcı tekrar gönderip mükerrer kayıt yaratır —
    // yaşandı, on kayıt oluştu.
    try {
      onDone();
    } catch {
      // Pencere kapanmasa da kayıt yerinde; hata gösterilmiyor.
    }
  }, 'Kaydedilemedi.');
  return { body: form, submit };
}

/** İşlem formunu pencerede açar; kaydedince pencere kapanır ve liste yenilenir. */
/**
 * Satış penceresi.
 *
 * Girdi alım kaydı değil havuz: fon + banka seçilir, adet girilir. Bankada da
 * böyle çalışıyor — "THF'den 50.000 pay sat" deniyor, hangi alımdan çıkacağı
 * bizim defterimizin işi. Paylar en eski alımdan başlayarak düşülür ve plan
 * adet yazılırken gösterilir, böylece bölünen kayıt sürpriz olmaz.
 */
function openSellModal(havuzlar: Map<string, Transaction[]>, reload: () => void): void {
  const anahtarlar = [...havuzlar.keys()].sort((a, b) => a.localeCompare(b, 'tr'));
  // Seçim boş başlar. Alfabetik ilk havuzla açılsaydı pencere "AFS'nin
  // tamamını sat" diye kurulu gelirdi; yanlış tarihe basmak yeterdi.
  let secili = '';
  // Sunucudaki sıranın aynısı: alış tarihi, eşitlikte kimlik.
  const lotlar = (): Transaction[] => [...(havuzlar.get(secili) ?? [])].sort((a, b) =>
    (a.tradeDate < b.tradeDate ? -1 : a.tradeDate > b.tradeDate ? 1 : a.id - b.id));
  const toplam = (k: string): number =>
    (havuzlar.get(k) ?? []).reduce((a, t) => a + Number(t.units), 0);
  const units = el('input', {
    type: 'number', step: 'any', min: '1', required: 'true',
  }) as HTMLInputElement;
  const sellDate = tarihGirdisi({ required: 'true' });
  const orderDate = tarihGirdisi();
  const status = el('span', { class: 'status' });

  const havuzAlani = el('div', { class: 'field' });
  const havuzCiz = (): void => {
    havuzAlani.replaceChildren(
      el('label', {}, ['Fon · Banka']),
      comboFilter({
        label: 'Seçin',
        options: anahtarlar.map((k) => ({
          value: k,
          label: k.replace('·', ' · '),
          hint: `${toplam(k).toLocaleString('tr-TR')} pay`,
        })),
        value: secili,
        clearable: false,
        onChange: (v) => {
          secili = v;
          // Havuz değişince adet sıfırlanır: önceki havuzun sayısı yenisinde
          // anlamsız, hatta fazla olabilir.
          units.value = '';
          units.max = String(toplam(v));
          submit.disabled = true;
          havuzCiz();
          valorYukle();
          planCiz();
        },
      }),
      el('span', { class: 'field-hint' }, [secili === ''
        ? 'Satılacak fon ve bankayı seçin.'
        : `Havuzda ${toplam(secili).toLocaleString('tr-TR')} pay var.`]),
    );
  };

  // Valör: işlem formundaki davranışın aynısı. Emir tarihi girilince satış
  // tarihi hesaplanır, satış tarihi girilince emir tarihi geriye çözülür.
  // Havuz değişince yeniden yükleniyor — valör fona bağlı. Cevap gelene kadar
  // null kalır ve kullanıcı iki tarihi de elle yazabilir.
  let holidayList: string[] = [];
  let sellValor: number | null = null;
  const valorNote = el('span', { class: 'section-note' }, ['']);
  linkValorDates(orderDate, sellDate, () => sellValor, () => holidayList);
  const valorYukle = (): void => {
    const kod = secili.split('·')[0] ?? '';
    sellValor = null;
    valorNote.textContent = '';
    void (async () => {
      try {
        const r = (await api(`/api/settlement?fundCode=${encodeURIComponent(kod)}`)) as {
          holidays: string[];
          valor: { buy: number; sell: number } | null;
        };
        // Yavaş cevap arada değişen havuzun valörünü ezmesin.
        if ((secili.split('·')[0] ?? '') !== kod) return;
        holidayList = r.holidays;
        sellValor = r.valor?.sell ?? null;
        if (sellValor !== null) valorNote.textContent = `T+${String(sellValor)} iş günü`;
      } catch {
        sellValor = null;
      }
    })();
  };

  /**
   * Satışın hangi alımlardan çıkacağı, adet yazılırken gösterilir.
   *
   * Sonradan tabloda görülünce anlaşılmıyordu: 50.000 satınca ortaya 20.728 ve
   * 14.386 çıkıyor, ikisi de kullanıcının yazmadığı sayılar. Aynı hesabı önden
   * göstermek "bu sayılar nereden geldi" sorusunu ortadan kaldırıyor. Hesap
   * sunucuyla aynı fonksiyondan geliyor, ayrışamaz.
   */
  /**
   * Alım listesi: hem seçici hem önizleme.
   *
   * Satıra basmak adedi o alıma kadar toplar — FIFO zaten oradan geçeceği için
   * "şuraya kadar sat" demek tek anlamlı seçim. Gösterim her zaman adetten
   * türetiliyor: elle sayı yazınca liste kendini ona göre çizer, ekranda geride
   * kalmış bir seçim kalmaz.
   */
  const plan = el('div', { class: 'fifo-plan' });
  const say = (n: number): string => n.toLocaleString('tr-TR', { maximumFractionDigits: 6 });
  const planCiz = (): void => {
    plan.replaceChildren();
    if (secili === '') return;
    const adet = Number(units.value);
    const liste = lotlar();

    let adimlar: { id: number; sell: number; keep: number }[] = [];
    if (units.value.trim() !== '' && adet > 0) {
      try {
        adimlar = planFifoSale(liste.map((t) => ({ id: t.id, units: Number(t.units) })), adet);
      } catch {
        return; // Havuzdan fazla adet: hata kaydederken söylenecek.
      }
    }
    // Satıra kadarki birikim: o satır seçilince adet bu olur, iptal edilince
    // bir önceki satırın birikimine dönülür. FIFO sırası yüzünden ortadaki bir
    // alımı tek başına çıkarmak mümkün değil; iptal "buradan aşağısını bırak".
    let birikim = 0;
    for (const lot of liste) {
      const oncekiBirikim = birikim;
      birikim += Number(lot.units);
      const hedef = birikim;
      const adim = adimlar.find((a) => a.id === lot.id);
      const durum = adim === undefined
        ? 'Seç'
        : adim.keep > 0
          ? `${say(adim.sell)} satılır · ${say(adim.keep)} açık kalır`
          : 'tamamı satılır';

      // Sütun tek şey söyler: bu satıştan bu alımdan ne gerçekleşiyor.
      //
      // Seçilmemiş satır lotun tamamını yazsaydı — ilk hâli buydu — 29.272
      // satmakla 101.090 satmak aynı görünürdü: sayı yalnız sınırdaki tek
      // lotta değişir, gerisi sabit dururdu. Dokunulmayan alım hiçbir şey
      // gerçekleştirmiyor, o yüzden tire.
      //
      // Oran değişmiyor: satılan adet hem tutarı hem maliyeti aynı çarpanla
      // ölçeklediği için yüzde sadeleşiyor. Yani lotun getirisi kısmi satışta
      // da aynı ve seçilmemiş satırda da gösterilebilir.
      const kzTutar = lot.gain === null || adim === undefined
        ? null
        : Number(lot.gain) * (adim.sell / Number(lot.units));
      const cls = adim === undefined ? 'fifo-idle' : adim.keep > 0 ? 'fifo-part' : 'fifo-full';

      // Satır düğme değil, role taşıyan bir kutu: içine iptal düğmesi girecek
      // ve düğme içinde düğme geçersiz HTML.
      const satir = el('div', {
        class: `fifo-row ${cls}`, role: 'button', tabindex: '0',
        title: adim === undefined ? 'Bu alıma kadar sat' : 'Adedi bu alıma kadar getir',
      }, [
        el('span', { class: 'fifo-when' }, [gunAd(lot.tradeDate)]),
        el('span', { class: 'fifo-units' }, [say(Number(lot.units))]),
        el('span', { class: 'fifo-note' }, [durum]),
        // Kâr/zarar en sağda: satışın ne yapacağı soldaki adet ve durum
        // sütunlarında yazıyor, bu ikisi yalnız "bu alım ne kazandırıyor" diye
        // bakınca lazım. Araya girseydi asıl bilgiyle yan yana durup onunla
        // karışırdı.
        el('span', { class: 'fifo-gain' }, [
          kzTutar === null ? '—' : signed(String(kzTutar), ' ₺'),
        ]),
        // Yüzde işareti değerin sonunda: bu listede sütun başlığı yok, birimi
        // söyleyen başka bir şey de yok. Tablodaki kural tersi — orada başlık
        // zaten "K/Z %" diyor ve hücrede tekrarlamak gerekmiyor.
        el('span', { class: 'fifo-pct' }, [
          lot.gainPct === null ? '' : signed(lot.gainPct, '%'),
        ]),
      ]);
      const sec = (): void => {
        units.value = String(hedef);
        submit.disabled = false;
        planCiz();
      };
      satir.addEventListener('click', sec);
      satir.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sec(); }
      });

      // İptal yalnız seçili satırlarda: seçilmemiş bir satırda geri alınacak
      // bir şey yok.
      if (adim !== undefined) {
        const iptal = el('button', {
          // Etiket "bu satırı çıkar" demiyor: FIFO sırası yüzünden bu alım
          // bırakılınca sonrakiler de bırakılıyor. Düğme yaptığından azını
          // söylerse üç satır birden gidince sürpriz olur.
          type: 'button', class: 'fifo-undo', title: 'Buradan itibaren seçimi kaldır',
          'aria-label': `${gunAd(lot.tradeDate)} ve sonrasını seçimden çıkar`,
        }, [icon('close', 12)]);
        iptal.addEventListener('click', (e) => {
          e.stopPropagation();
          units.value = oncekiBirikim > 0 ? String(oncekiBirikim) : '';
          submit.disabled = !(oncekiBirikim > 0);
          planCiz();
        });
        satir.append(iptal);
      } else {
        // Izgara sütunu boş da olsa dursun; yoksa satırlar kayıyor.
        satir.append(el('span', { class: 'fifo-undo-gap' }));
      }
      plan.append(satir);
    }

  };
  sadeceSayi(units);
  units.addEventListener('input', () => {
    // Havuzdan fazlası yazılamaz. Sınırsız bırakıldığında planFifoSale hata
    // atıyor, liste boşalıyor ve kullanıcı neyi yanlış yaptığını göremiyordu;
    // sayıyı sınırda tutmak hatayı en baştan olanaksız kılıyor.
    const ust = toplam(secili);
    if (secili !== '' && Number(units.value) > ust) units.value = String(ust);
    submit.disabled = secili === '' || !(Number(units.value) > 0);
    planCiz();
  });
  havuzCiz();

  const submit = el('button', {
    type: 'submit', class: 'btn-primary', disabled: 'true',
  }, ['Sat']) as HTMLButtonElement;
  const form = el('form', { class: 'modal-form-grid', id: 'sell-form' }, [
    havuzAlani,
    el('p', { class: 'settings-note' }, [
      'Paylar en eski alımdan düşülür; ilk alım bitmeden sonrakine geçilmez. '
      + 'Satıra basınca adet o alıma kadar toplanır.',
    ]),
    plan,
    field('Adet', units, 'Satır seçebilir ya da elle yazabilirsiniz.'),
    el('div', { class: 'form-section' }, [el('span', {}, ['Satış']), valorNote]),
    field('Satış Emir Tarihi', tarihAlani(orderDate), 'İsteğe bağlı; girilirse satış tarihi hesaplanır.'),
    field('Satış Tarihi', tarihAlani(sellDate), 'Satışın gerçekleştiği gün.'),
    status,
  ]);
  submit.setAttribute('form', 'sell-form');

  let close = (): void => {};
  tekGonderim(form, submit, status, async () => {
    for (const t of [orderDate, sellDate]) {
      if (!tarihDogrula(t)) {
        t.reportValidity();
        throw new Error('Tarihi gg-aa-yyyy olarak yazın.');
      }
    }
    await api('/api/transactions/sell', {
      method: 'POST',
      body: JSON.stringify({
        fundCode: secili.split('·')[0] ?? '', platform: secili.split('·')[1] ?? '',
        units: Number(units.value), sellDate: tarihOku(sellDate),
        sellOrderDate: tarihOku(orderDate) || null,
      }),
    });
    close();
    reload();
  }, 'Satılamadı.');

  const cancel = el('button', { class: 'btn-ghost', type: 'button' }, ['Vazgeç']);
  close = openModal('Satış Ekle', 'Fon ve bankadaki açık paylardan düşülür', form, [cancel, submit]);
  cancel.addEventListener('click', () => { close(); });
}

function openTransactionModal(
  existing: Transaction | null,
  reload: () => void,
  emir?: { onDolgu: IslemOnDolgu; sil: () => Promise<void>; baslik: string },
): void {
  let close = (): void => {};
  const { body, submit } = transactionForm(
    existing, () => { close(); reload(); }, emir?.onDolgu, emir?.sil);
  const cancel = el('button', { class: 'btn-ghost', type: 'button' }, ['Vazgeç']);
  close = openModal(
    emir !== undefined ? 'Emri İşleme Çevir'
      : existing === null ? 'Alış Ekle' : 'İşlemi Düzenle',
    emir?.baslik
      ?? (existing === null ? 'Yeni alış kaydı' : `${existing.fundCode} · ${existing.tradeDate}`),
    body,
    [cancel, submit],
  );
  cancel.addEventListener('click', () => { close(); });
}

/**
 * Kapanan pozisyonlar: satılmış her işlemin gerçekleşen sonucu.
 *
 * Kırılım işlem başınadır, fon başına değil — aynı fondan farklı tarihlerde
 * alınıp ayrı satılan pozisyonların sonuçları farklıdır ve hangi alımın ne
 * kazandırdığı görünmelidir.
 */
/**
 * Dağılım: aynı portföy, farklı boyutlara göre gruplanmış.
 *
 * Portföyüm fon fon listeliyor; burada sorulan soru başka — para nasıl
 * dağılmış. İkisi ayrı ekran, çünkü ölçülen veride cevapları da ayrışıyor:
 * on fon hisse senedi şemsiyesinde ama para olarak orada yalnız %19 var.
 */
/**
 * Varlık türü kırılımı paneli.
 *
 * Banka ve kategori tablolarından ayrı bir tablo çünkü sütunları farklı:
 * maliyet ve kâr/zarar yok. Ağırlıklar bugüne ait; geçmişteki maliyete
 * uygulamak "bu sınıfa şu kadar para koydun" diye yanlış bir rakam verirdi.
 *
 * Kategori paneliyle karıştırılmamalı: o, fonun TEFAS şemsiye tipi — fonun
 * etiketi. Bu, fonun içinde gerçekte ne olduğu. "Hisse senedi şemsiyesi"ndeki
 * bir fonun parasının bir kısmı repoda duruyor olabilir.
 */
function varlikPaneli(a: Allocation): HTMLElement {
  // Negatif ağırlık gerçek: fon repo ile borçlanınca o kalem eksi çıkıyor
  // (ölçülen veride PBR'nin reposu %-69). Çubuk eksiye inemez, o yüzden sıfır
  // genişlikte ama kırmızı kalır — çubuğun hiç olmaması "veri yok" gibi
  // okunurdu.
  const bar = (pct2: string): HTMLElement => {
    const n = Number(pct2);
    return el('div', { class: 'weight-bar' }, [
      el('span', {
        class: n < 0 ? 'neg' : '',
        style: `width:${Math.min(Math.max(n, 0), 100).toFixed(2)}%`,
      }),
    ]);
  };
  const rows = a.byAsset.groups.map((g) => el('tr', {}, [
    el('td', {}, [g.key]),
    el('td', { class: 'num dim' }, [`${String(g.funds)} fon`]),
    el('td', { class: 'num' }, [money(g.value)]),
    el('td', { class: 'weight-cell' }, [
      el('span', { class: 'num' }, [pct(Number(g.weightPct), 1)]),
      bar(g.weightPct),
    ]),
  ]));
  const foot = el('tr', { class: 'total-row' }, [
    el('td', {}, ['TOPLAM']),
    el('td', { class: 'num dim' }, [`${String(a.byAsset.groups.length)} tür`]),
    el('td', { class: 'num' }, [money(a.byAsset.classified)]),
    el('td', { class: 'num' }, [pct(100, 1)]),
  ]);

  // Tarih gizlenirse rakam bugünün kesin dağılımı sanılır. Fonlar dağılımlarını
  // farklı günlerde açıklıyor, o yüzden tek tarih değil aralık yazılıyor.
  const tarih = a.assetAsOfFrom === null
    ? 'ağırlık verisi yok'
    : a.assetAsOfFrom === a.assetAsOfTo
      ? `${gunAd(a.assetAsOfFrom)} ağırlıklarıyla`
      : `${gunAd(a.assetAsOfFrom)} – ${gunAd(a.assetAsOfTo)} ağırlıklarıyla`;

  // Kapsanmayan tutar sessizce düşmez: yüzdeler doğru görünürken portföyün bir
  // kısmı hiçbir yerde sayılmamış olurdu.
  const kapsamDisi = Number(a.byAsset.unknownValue) > 0
    ? [el('p', { class: 'panel-note warn' }, [
        `${money(a.byAsset.unknownValue)} kırılıma girmedi: `
        + `${a.byAsset.unknownFunds.join(', ')} için ağırlık verisi yok.`,
      ])]
    : [];

  // Sınıflandırılan toplam ile portföy değeri arasındaki fark yuvarlamadan
  // gelir (ölçülen veride üç fonun ağırlıkları %100,01–100,45). Ölçekleyip
  // gizlemek uydurulan bir yüzdeyi ölçülen gibi gösterirdi.
  const fark = Number(a.byAsset.classified) + Number(a.byAsset.unknownValue)
    - Number(a.total.value);
  const yuvarlama = Math.abs(fark) >= 1
    ? [el('p', { class: 'panel-note' }, [
        `Sınıf toplamı portföy değerinden ${money(String(Math.abs(fark)))} `
        + `${fark > 0 ? 'fazla' : 'eksik'}: fonların açıkladığı ağırlıklar `
        + 'yuvarlanmış. Ölçeklenmedi, olduğu gibi gösteriliyor.',
      ])]
    : [];

  // Negatif kalem varsa sebebi yazılır: eksi bir ağırlık ilk bakışta veri
  // hatası gibi duruyor, oysa fonun borçlandığını söylüyor ve diğer kalemlerin
  // neden %100'ü aştığını da açıklıyor.
  const negatif = a.byAsset.groups.filter((g) => Number(g.value) < 0);
  const borclanma = negatif.length === 0
    ? []
    : [el('p', { class: 'panel-note' }, [
        `${negatif.map((g) => g.key).join(', ')} eksi görünüyor: fon repo ile `
        + 'borçlanmış. Kaldıraç demek — diğer kalemler bu yüzden portföyün '
        + 'tamamından fazlasını gösterebilir.',
      ])];

  return panel(
    'Varlık Türü',
    `${String(a.byAsset.groups.length)} tür · ${tarih}`,
    el('div', { class: 'panel-body' }, [
      a.byAsset.groups.length === 0
        ? el('div', { class: 'empty-state' }, ['Fon içeriği verisi yok.'])
        : table(['Varlık Türü', 'Kapsam', 'Değer', 'Ağırlık'], [...rows, foot]),
      ...kapsamDisi,
      ...borclanma,
      ...yuvarlama,
    ]),
  );
}

async function allocationView(): Promise<Node[]> {
  const a = (await api('/api/allocation')) as Allocation;
  const value = Number(a.total.value);

  const bar = (pct: string): HTMLElement =>
    el('div', { class: 'weight-bar' }, [
      el('span', { style: `width:${Math.min(Number(pct), 100).toFixed(2)}%` }),
    ]);

  const groupTable = (groups: AllocationGroup[], birinci: string): HTMLElement => {
    const rows = groups.map((g) => el('tr', {}, [
      el('td', {}, [el('span', { class: 'fund-code' }, [g.key])]),
      el('td', { class: 'num dim' }, [`${String(g.funds)} fon · ${String(g.lots)} lot`]),
      el('td', { class: 'num' }, [money(g.cost)]),
      el('td', { class: 'num' }, [money(g.value)]),
      el('td', {}, [signed(g.gain, ' ₺')]),
      el('td', {}, [signed(Number(g.cost) === 0 ? null
        : String((Number(g.gain) / Number(g.cost)) * 100), '')]),
      el('td', { class: 'weight-cell' }, [
        el('span', { class: 'num' }, [pct(Number(g.weightPct), 1)]),
        bar(g.weightPct),
      ]),
    ]));
    const foot = el('tr', { class: 'total-row' }, [
      el('td', {}, ['TOPLAM']),
      el('td', { class: 'num dim' }, [`${String(a.total.funds)} fon · ${String(a.total.lots)} lot`]),
      el('td', { class: 'num' }, [money(a.total.cost)]),
      el('td', { class: 'num' }, [money(a.total.value)]),
      el('td', {}, [signed(a.total.gain, ' ₺')]),
      el('td', {}, [signed(Number(a.total.cost) === 0 ? null
        : String((Number(a.total.gain) / Number(a.total.cost)) * 100), '')]),
      el('td', { class: 'num' }, [pct(100, 1)]),
    ]);
    return table([birinci, 'Kapsam', 'Maliyet', 'Değer', 'K/Z', 'K/Z %', 'Ağırlık'],
      [...rows, foot]);
  };

  if (a.total.lots === 0) {
    return [el('div', { class: 'empty-state' }, ['Açık pozisyon yok.'])];
  }

  const enBuyuk = (g: AllocationGroup[]): AllocationGroup | undefined => g[0];

  return [
    el('div', { class: 'metric-grid' }, [
      metric('Portföy Değeri', money(a.total.value),
        `${String(a.total.funds)} fon · ${String(a.total.lots)} lot`, 'chart'),
      metric('Kâr / Zarar', money(a.total.gain),
        Number(a.total.cost) === 0 ? '—'
          : pct((Number(a.total.gain) / Number(a.total.cost)) * 100), 'money'),
      metric('En Ağır Banka', enBuyuk(a.byBank)?.key ?? '—',
        enBuyuk(a.byBank) === undefined ? '—'
          : `${pct(Number(enBuyuk(a.byBank)?.weightPct), 1)} · ${money(enBuyuk(a.byBank)?.value ?? null)}`,
        'money'),
      metric('En Ağır Kategori', enBuyuk(a.byCategory)?.key ?? '—',
        enBuyuk(a.byCategory) === undefined ? '—'
          : `${pct(Number(enBuyuk(a.byCategory)?.weightPct), 1)} · ${money(enBuyuk(a.byCategory)?.value ?? null)}`,
        'fund'),
    ]),
    panel('Banka', `${String(a.byBank.length)} banka · ağırlığa göre`,
      el('div', { class: 'panel-body' }, [groupTable(a.byBank, 'Banka')])),
    panel('Kategori', `${String(a.byCategory.length)} kategori · şemsiye fon tipi`,
      el('div', { class: 'panel-body' }, [groupTable(a.byCategory, 'Kategori')])),
    varlikPaneli(a),
    el('p', { class: 'panel-note' }, [
      'Ağırlık güncel değer üzerinden hesaplanır, fon sayısı üzerinden değil: bir ' +
      'grupta çok fon bulunması oraya çok para konduğu anlamına gelmiyor. Yalnız ' +
      'açık pozisyonlar sayılır; kapananlar Kapananlar ekranında.',
    ]),
  ];
}

/**
 * Fon detay sayfası: bir fonun içinde ne olduğu.
 *
 * Uygulamada bugüne dek fon detayı yoktu — fon kodu beş ekranda geçiyor ama
 * hiçbirinde açılamıyordu. Hisse listesinin doğal yeri burası: bir fonda 80
 * kaleme kadar çıkabiliyor ve bu Portföyüm'ün açılır satırına sığmıyor.
 *
 * Hangi fonun açıldığı modül düzeyinde tutulur; yönlendirme parametre
 * taşımıyor (`appShell(me, view)`) ve Fon Hareketleri filtrelerinde de aynı
 * desen kullanılıyor.
 */
/**
 * Hisse satırının alt yazısı: şirket adı ve sektör.
 *
 * İkisi de boşsa hisse BIST'te değil. Kaynak yalnız BIST hisselerine şirket
 * adı ve sektör veriyor; ölçülen veride 686 hissenin 201'i böyle ve bunların
 * 180'inde fiyat da yok — kodları da yabancı borsalardan (7201 Nissan, 6752
 * Panasonic, ADBE). Boş bırakmak "veri eksik" gibi okunuyordu, oysa hissenin
 * nerede işlem gördüğünü söylüyor.
 */
function hisseAltYazi(company: string | null, sector: string | null): string {
  const parcalar = [company, sector].filter((v) => v !== null && v !== '');
  return parcalar.length === 0 ? 'yabancı borsa' : parcalar.join(' · ');
}

/**
 * Fon içeriği penceresi.
 *
 * Ayrı ekran değil pencere: kullanıcı listeden birkaç fona arka arkaya
 * bakıyor ve ekran değiştirmek listedeki kaydırma yerini kaybettiriyordu.
 * Pencere açıkken liste arkada olduğu yerde duruyor.
 *
 * Geniş pencere kullanılıyor — 7 sütunlu, 80 satıra kadar çıkan bir tablo
 * form genişliğinde okunmuyor.
 */
/**
 * Fon penceresinde hisse mi sektör mü gösteriliyor.
 *
 * Sektör ayrı panel olarak en alta konunca görünmüyordu: hisse tablosu 82
 * satır ve kimse altına inmiyor. Sekme başlıkta duruyor.
 */
type FonSekme = 'daily' | 'assets' | 'stock' | 'sector';
let fonSekme: FonSekme = 'daily';

interface FundDayRow {
  date: string;
  fundPct: string | null;
  gain: string | null;
  value: string | null;
}

async function openFundModal(fundCode: string): Promise<void> {
  const kod = fundCode.toUpperCase();
  let d: FundDetail;
  try {
    d = (await api(`/api/funds/${encodeURIComponent(kod)}`)) as FundDetail;
  } catch (err) {
    openModal(kod, null,
      el('div', { class: 'empty-state' }, [
        err instanceof Error ? err.message : 'Fon içeriği alınamadı.',
      ]), []);
    return;
  }

  const bar = (p: string): HTMLElement =>
    el('div', { class: 'weight-bar' }, [
      el('span', {
        class: Number(p) < 0 ? 'neg' : '',
        style: `width:${Math.min(Math.max(Number(p), 0), 100).toFixed(2)}%`,
      }),
    ]);

  // Rozet değil tablo: rozetler yan yana dizilince ağırlıklar hizasız kalıyor
  // ve büyüğü küçüğünden ayırt edilemiyordu. Altındaki hisse tablosuyla aynı
  // biçim, aynı okuma alışkanlığı.
  const varlikSatir = d.assets.map((a) => el('tr', {}, [
    el('td', {}, [a.assetClass]),
    el('td', { class: 'weight-cell' }, [
      el('span', { class: 'num' }, [pct(Number(a.weightPct), 2)]),
      bar(a.weightPct),
    ]),
  ]));

  // Sektör kendi sütununda genişliğin dörtte birini yiyordu ve satır başına
  // bir kez okunan bir bilgi. Şirket adının yanına alınınca sütun kalktı,
  // pencere daraldı.
  const rows = d.stocks.map((x) => el('tr', {}, [
    el('td', {}, [
      el('span', { class: 'fund-code' }, [x.stockCode]),
      el('span', { class: 'fund-title' }, [hisseAltYazi(x.company, x.sector)]),
    ]),
    el('td', { class: 'weight-cell' }, [
      el('span', { class: 'num' }, [pct(Number(x.weightPct), 2)]),
      bar(x.weightPct),
    ]),
    // Fonun bu hisseyi geçen aya göre artırıp azalttığı. Kâr değil ama
    // "fon da bu hisseye giriyor" bilgisi karar için değerli.
    el('td', { class: 'num dim' }, [
      x.prevWeightPct === null ? '—' : pct(Number(x.prevWeightPct), 2),
    ]),
    el('td', {}, [signed(x.weightChange, '')]),
    el('td', {}, [signed(x.return1w, '%')]),
    el('td', {}, [signed(x.return1m, '%')]),
  ]));

  const toplamAgirlik = d.stocks.reduce((t, x) => t + Number(x.weightPct), 0);
  // Fonun günlük varlık kırılımındaki hisse payı. Kalem toplamıyla aynı şey
  // değil: biri günlük, diğeri ay sonu açıklaması.
  // Kırılım ağırlığa göre sıralı geliyor; ilk satır en ağırı.
  const enAgirVarlik = d.assets[0];
  const enAgir = d.stocks[0];

  // Sektör dağılımı hisselerden türer, ayrı veri gerekmiyor. Fonun 82 hisseyi
  // nereye yaydığını tek tek satırlardan çıkarmak mümkün değil: "Finansal
  // Kiralama %41" ile "82 hisseye dağılmış" bambaşka iki portföy anlatıyor.
  //
  // Ağırlıklar fonun tamamına ait, hisse dilimine değil; yüzdeler kendi
  // aralarında %100 etmez ve etmemeli — gerisi tahvil, repo, mevduat.
  const sektorler = (() => {
    const m = new Map<string, { weight: number; count: number }>();
    for (const x of d.stocks) {
      const k = x.sector ?? 'Yabancı borsa';
      const b = m.get(k) ?? { weight: 0, count: 0 };
      b.weight += Number(x.weightPct);
      b.count += 1;
      m.set(k, b);
    }
    return [...m.entries()].map(([key, b]) => ({ key, ...b }))
      .sort((a, b) => b.weight - a.weight);
  })();

  // ── Sekmeler ──────────────────────────────────────────────────────────
  //
  // Pencere BİR kez açılıyor; sekme değişince yalnız sekme paneli yerinde
  // değişiyor. Önce her tıklamada pencere kapatılıp `openFundModal` baştan
  // çağrılıyordu: fon detayı yeniden çekiliyor, pencere göz kırpıyordu ve
  // kaydırma konumu sıfırlanıyordu. Oysa değişen yalnız hangi tablonun
  // çizileceği; veri zaten elde.
  //
  // Günlük sekmesi ayrı bir istek atıyor: seri fon detayının geri kalanından
  // bağımsız ve her açılışta çekmek gereksiz. Yalnız o sekme seçildiğinde ve
  // yalnız BİR kez isteniyor; sekmeler arasında gidip gelmek tekrar çekmiyor.
  let gunlerSakla: FundDayRow[] | null = null;
  const gunlerGetir = async (): Promise<FundDayRow[]> => {
    if (gunlerSakla === null) {
      try {
        gunlerSakla = (await api(`/api/funds/${encodeURIComponent(kod)}/daily?days=30`)) as FundDayRow[];
      } catch {
        gunlerSakla = [];
      }
    }
    return gunlerSakla;
  };

  const SEKME_BASLIK: Record<FonSekme, string> = {
    daily: 'Günlük', assets: 'Varlık Türü', stock: 'Hisseler', sector: 'Sektör',
  };

  // Seçili sekme verisi olmayan bir sekmeyse (fon değiştirildi, kırılım yok)
  // Günlük'e düşülüyor: o her fonda var.
  if ((fonSekme === 'assets' && d.assets.length === 0)
    || ((fonSekme === 'stock' || fonSekme === 'sector') && d.stocks.length === 0)) {
    fonSekme = 'daily';
  }

  const agirlikNotu = el('p', { class: 'panel-note' }, [
    `Ağırlıklar fonun ${gunAd(d.stocksAsOf)} açıklamasından; toplamı `
    + `${pct(toplamAgirlik, 1)}. Üstteki hisse oranı ${gunAd(d.assetsAsOf)} `
    + 'günlük kırılımından geliyor, ikisi farklı tarihlere ait ve fon '
    + 'aradaki günlerde alıp satmış olabilir.',
  ]);

  // Sekme panelinin yaşadığı kutu. `sekmeCiz` her çağrıda içini değiştiriyor,
  // kutunun kendisi ve etrafındaki pencere yerinde kalıyor.
  const sekmeKutu = el('div', { class: 'fund-tabs' }, []);

  const fonSekmeBtn = (id: FonSekme, etiket: string, sayi?: number): HTMLElement => {
    const b = el('button', {
      type: 'button', class: `tab-btn${fonSekme === id ? ' tab-on' : ''}`,
    }, [etiket, ...(sayi === undefined ? [] : [
      el('span', { class: 'tab-count' }, [String(sayi)]),
    ])]);
    b.addEventListener('click', () => {
      if (fonSekme === id) return;
      fonSekme = id;
      void sekmeCiz();
    });
    return b;
  };

  async function sekmeCiz(): Promise<void> {
    const gunler = fonSekme === 'daily' ? await gunlerGetir() : [];

    const sekmeler: HTMLElement[] = [
      fonSekmeBtn('daily', 'Günlük'),
      ...(d.assets.length === 0 ? [] : [fonSekmeBtn('assets', 'Varlık Türü', d.assets.length)]),
      ...(d.stocks.length === 0 ? [] : [
        fonSekmeBtn('stock', 'Hisse', d.stocks.length),
        fonSekmeBtn('sector', 'Sektör', sektorler.length),
      ]),
    ];

    const gunSatir = gunler.map((g) => el('tr', {}, [
      el('td', { class: 'num' }, [gunAd(g.date)]),
      el('td', {}, [g.fundPct === null ? el('span', { class: 'num' }, ['—']) : signed(g.fundPct)]),
      // Fonda olunmayan gün BOŞ, sıfır değil: sıfır "o gün kazanmadım" demek,
      // oysa doğrusu "o gün fonda değildim".
      el('td', {}, [g.gain === null
        ? el('span', { class: 'num dim' }, ['—'])
        : signed(g.gain, ' ₺')]),
      el('td', { class: 'num dim' }, [g.value === null ? '—' : money(g.value)]),
    ]));

    const sekmeAlt =
      fonSekme === 'daily' ? `son ${String(gunler.length)} iş günü`
        : fonSekme === 'assets'
          ? (d.assetsAsOf === null ? 'tarih yok' : `${gunAd(d.assetsAsOf)} · günlük`)
          : fonSekme === 'sector'
            ? `${String(sektorler.length)} sektör · hisselerden türetildi`
            : `${String(d.stocks.length)} hisse · ${gunAd(d.stocksAsOf)} açıklaması · aylık`;

    const sekmeGovde: Node[] =
      fonSekme === 'daily'
        ? (gunler.length === 0
          ? [el('div', { class: 'empty-state' }, ['Bu fon için günlük seri yok.'])]
          : [
            table(['Tarih', 'Fonun Günlük %', 'Benim K/Z ₺', 'Pozisyon ₺'], gunSatir),
            el('p', { class: 'panel-note' }, [
              'Yüzde fonun kendi hareketi, herkes için aynı. TL senin o günkü '
              + 'pozisyonundan ve nakit akışından arındırılmış: alım yaptığın gün '
              + 'giren para kazanç sayılmıyor. Fonda olmadığın günlerde TL boş.',
            ]),
          ])
        : fonSekme === 'assets'
          ? [table(['Varlık Türü', 'Ağırlık'], varlikSatir)]
          : fonSekme === 'sector'
            ? [table(['Sektör', 'Kapsam', 'Ağırlık'], sektorler.map((g) => el('tr', {}, [
              el('td', {}, [g.key]),
              el('td', { class: 'num dim' }, [`${String(g.count)} hisse`]),
              el('td', { class: 'weight-cell' }, [
                el('span', { class: 'num' }, [pct(g.weight, 2)]),
                bar(String(g.weight)),
              ]),
            ]))), agirlikNotu]
            : [table(['Hisse', 'Ağırlık', 'Önceki Ay', 'Fark', '1 Hafta', '1 Ay'], rows),
              agirlikNotu];

    // Tek sekme şeridi. Önce Varlık Türü ayrı bir panel, Hisseler/Sektör ayrı
    // ve kendi içinde sekmeliydi: aynı pencerede iki farklı düzen kuralı vardı
    // ve pencere alt alta iki tabloyla uzuyordu.
    //
    // Sekme yalnız VERİSİ OLANA göre çıkıyor. Para piyasası fonunda hisse
    // kırılımı yok; boş bir sekme açıp "veri yok" yazmak, kullanıcıyı
    // tıklatıp hiçbir şey göstermemek olurdu.
    sekmeKutu.replaceChildren(panel(
      SEKME_BASLIK[fonSekme],
      sekmeAlt,
      el('div', { class: 'panel-body' }, sekmeGovde),
      el('div', { class: 'tabs' }, sekmeler),
    ));
  }

  // Bekleyen işlemler burada da duruyor: kullanıcı detaya girmeden de
  // görebilmeli ama girince de kaybetmemeli. Ayrı uç değil, Portföyüm'ün
  // kullandığı ucun aynısı — hata verirse detay yine açılır.
  let bekleyenNot: HTMLElement[] = [];
  try {
    const b = (await api('/api/portfolio/pending')) as BekleyenAlim;
    const al = b.rows.filter((x) => x.fundCode === kod);
    const sat = b.sells.filter((x) => x.fundCode === kod);
    const parca = [
      ...(al.length === 0 ? [] : [`${String(al.length)} alım bekliyor (${al[0]?.date ?? ''})`]),
      ...(sat.length === 0 ? [] : [`${String(sat.length)} satış bekliyor (${sat[0]?.date ?? ''})`]),
    ];
    if (parca.length > 0) {
      bekleyenNot = [el('p', { class: 'pending-note' }, [
        `${parca.join(' · ')} — ${al.length === 0
          ? 'pozisyon satış tarihine kadar açık kalır.'
          : 'fiyatı henüz açıklanmadığı için yukarıdaki rakamlara girmiyor.'}`,
      ])];
    }
  } catch {
    // Bekleyen bilgisi alınamazsa detay yine açılır; ikincil bir not bu.
  }

  const govde = el('div', { class: 'fund-modal' }, [
    ...bekleyenNot,
    el('div', { class: 'metric-grid' }, [
      metric('Portföyümdeki Değer', Number(d.value) === 0 ? '—' : money(d.value),
        Number(d.value) === 0 ? 'pozisyon yok' : 'açık pozisyon', 'money'),
      // Sabit "Hisse Senedi" değil en ağır tür: para piyasası fonunda o kutu
      // tire gösterip yer kaplıyordu. Hisse fonunda zaten aynı sayıyı veriyor.
      //
      // Değer GÜNLÜK varlık kırılımından, alttaki hisse tablosunun toplamından
      // değil. İkisi farklı tarihlere ait: aylık açıklamadaki hisselerin
      // toplamı %97,8 derken günlük kırılım %88,23 diyordu ve yan yana
      // durunca çelişki gibi görünüyordu. Hangisinin ne zamana ait olduğu
      // kartın altında yazıyor.
      metric('En Ağır Varlık', enAgirVarlik?.assetClass ?? '—',
        enAgirVarlik === undefined
          ? 'varlık kırılımı yok'
          : `${pct(Number(enAgirVarlik.weightPct), 2)} · ${gunAd(d.assetsAsOf)} günlük`,
        'portfolio'),
      metric('Hisse Sayısı', String(d.stocks.length),
        d.stocksAsOf === null ? 'kırılım yok' : `${gunAd(d.stocksAsOf)} · aylık`, 'chart'),
      // En ağır kalem: fonun ne kadar yoğunlaştığını tek bakışta söylüyor.
      // 82 hisseye yayılmış bir fonla tek hisseye %20 yüklenmiş bir fon
      // listede aynı görünüyor, burada ayrışıyor.
      metric('En Ağır Hisse', enAgir?.stockCode ?? '—',
        enAgir === undefined ? '—'
          : `${pct(Number(enAgir.weightPct), 2)} · ${enAgir.company ?? 'yabancı borsa'}`,
        'money'),
    ]),
    sekmeKutu,
  ]);

  // İlk sekme pencere açılmadan çiziliyor: boş bir kutuyla açılıp sonra
  // dolması, düzelttiğimiz göz kırpmanın bir başka biçimi olurdu.
  await sekmeCiz();
  openModal(d.fundCode, d.title ?? null, govde, [], 'wide');
}

/**
 * Hisseler ekranı: portföyün hisse kırılımı.
 *
 * Dağılım ekranından farkı ölçek: orası portföy düzeyinde ("param nasıl
 * dağılmış"), burası fonların içi açılıp toplanmış hâli ("hangi hisselerdeyim").
 * Beş ayrı fon alıp çeşitlendirdiğini sanırken beşinin de aynı hisseyi tuttuğu
 * ancak burada görünüyor.
 */
let hisseAramasi = '';
/**
 * Hisse mi sektör mü gösteriliyor.
 *
 * İkisi alt alta çizilince ekran çok uzuyordu: 686 hisse ve 28 sektör. Sekme
 * olunca ekran kısa kalıyor ve seçim ekran yeniden çizilince de korunuyor.
 */
let hisseSekme: 'stock' | 'sector' = 'stock';

/**
 * Ekranı yeniden çizer. Modül düzeyinde tutulan arama ve gruplama seçimi
 * korunduğu için sonraki çizim aynı yerden devam eder — Fon Hareketleri
 * filtrelerindeki desenin aynısı.
 */
let stocksReload: () => void = () => {};
/** Görünüm değiştirir; kabuk her kurulduğunda güncel oturuma bağlanır. */
let gotoView: (v: ViewId) => void = () => {};
const reloadStocks = (): void => { stocksReload(); };

async function stocksView(): Promise<Node[]> {
  const takipDahil = readHisseTakip();
  const d = (await api(
    `/api/stocks${takipDahil ? '?watchlist=1' : ''}`,
  )) as StockAllocation;
  const toplam = Number(d.portfolioValue);

  // Tarih aralığı: fonlar portföylerini farklı günlerde açıklıyor. Tek tarih
  // yazmak, en eski açıklamayı olduğundan taze göstermek olurdu.
  const tarih = d.asOfFrom === null
    ? 'ağırlık verisi yok'
    : d.asOfFrom === d.asOfTo
      ? `${gunAd(d.asOfFrom)} ağırlıklarıyla`
      : `${gunAd(d.asOfFrom)} – ${gunAd(d.asOfTo)} ağırlıklarıyla`;

  const bar = (p: string): HTMLElement =>
    el('div', { class: 'weight-bar' }, [
      el('span', { style: `width:${Math.min(Math.max(Number(p), 0), 100).toFixed(2)}%` }),
    ]);

  // Sektör gruplaması aynı veriden türer: hisseler sektöre toplanır. Ayrı bir
  // uç ya da panel gerekmiyor.
  const sektorler = (): { key: string; value: number; count: number }[] => {
    const m = new Map<string, { value: number; kodlar: Set<string> }>();
    for (const x of d.stocks) {
      // Sektörü olmayanlar BIST dışı; "Bilinmiyor" demek veri eksikmiş gibi
      // okunuyordu.
      const k = x.sector ?? 'Yabancı borsa';
      const b = m.get(k) ?? { value: 0, kodlar: new Set<string>() };
      b.value += Number(x.value);
      b.kodlar.add(x.stockCode);
      m.set(k, b);
    }
    return [...m.entries()]
      .map(([key, b]) => ({ key, value: b.value, count: b.kodlar.size }))
      .sort((a, b) => b.value - a.value);
  };

  const sektorListesi = sektorler();
  const anahtar = aramaAnahtari(hisseAramasi.trim());
  const gorunen = anahtar === ''
    ? d.stocks
    : d.stocks.filter((x) =>
      aramaAnahtari(`${x.stockCode} ${x.company ?? ''} ${x.sector ?? ''}`).includes(anahtar));

  // Panel ve Piyasa'daki anahtarın aynısı; aynı işi yapan şey aynı görünmeli.
  const takipGirdi = el('input', {
    type: 'checkbox', id: 'toggle-stock-watchlist',
  }) as HTMLInputElement;
  takipGirdi.checked = takipDahil;
  takipGirdi.addEventListener('change', () => {
    writeHisseTakip(takipGirdi.checked);
    void reloadStocks();
  });
  const takipAnahtari = el('label', {
    class: 'switch-field switch-inline', for: 'toggle-stock-watchlist',
  }, [
    takipGirdi,
    el('span', { class: 'switch-track' }, []),
    el('span', {}, ['Takip listem de gösterilsin']),
  ]);

  const arama = el('input', {
    class: 'combo-search', placeholder: 'Hisse ara…', spellcheck: 'false',
  }) as HTMLInputElement;
  arama.value = hisseAramasi;
  let zaman = 0;
  arama.addEventListener('input', () => {
    hisseAramasi = arama.value;
    window.clearTimeout(zaman);
    // Her tuşta yeniden çizmek 686 satırlık listede yazmayı tutukluyordu.
    zaman = window.setTimeout(() => { void reloadStocks(); }, 180);
  });

  const sekme = (id: 'stock' | 'sector', etiket: string, sayi: number): HTMLElement => {
    const b = el('button', {
      type: 'button', class: `tab-btn${hisseSekme === id ? ' tab-on' : ''}`,
    }, [etiket, el('span', { class: 'tab-count' }, [String(sayi)])]);
    b.addEventListener('click', () => { hisseSekme = id; void reloadStocks(); });
    return b;
  };

  const govde: HTMLElement[] = [];
  if (hisseSekme === 'sector') {
    govde.push(table(['Sektör', 'Kapsam', 'Değer', 'Ağırlık'],
      sektorListesi.map((g) => el('tr', {}, [
        el('td', {}, [g.key]),
        el('td', { class: 'num dim' }, [`${String(g.count)} hisse`]),
        el('td', { class: 'num' }, [money(g.value.toFixed(2))]),
        el('td', { class: 'weight-cell' }, [
          el('span', { class: 'num' }, [pct(toplam === 0 ? 0 : (g.value / toplam) * 100, 2)]),
          bar(toplam === 0 ? '0' : String((g.value / toplam) * 100)),
        ]),
      ]))));
  } else {
    const body: HTMLElement[] = [];
    for (const x of gorunen.slice(0, 200)) {
      const acDugme = iconButton('search', 'Hangi fonlardan geldiğini aç');
      const satir = el('tr', {
        class: 'expandable', role: 'button', tabindex: '0',
        title: 'Hangi fonlardan geldiğini aç',
      }, [
        el('td', {}, [
          el('span', { class: 'fund-code' }, [x.stockCode]),
          el('span', { class: 'fund-title' }, [hisseAltYazi(x.company, x.sector)]),
        ]),
        el('td', { class: 'num' }, [moneyCell(x.value)]),
        el('td', { class: 'weight-cell' }, [
          el('span', { class: 'num' }, [pct(Number(x.weightPct), 2)]),
          bar(x.weightPct),
        ]),
        // İki sayı ayrı: tek "N fon" portföydekiyle takiptekini topluyordu ve
        // kullanıcı hepsine sahipmiş gibi okuyordu.
        el('td', { class: 'num dim' }, [
          `${String(x.ownedFunds)} fonumda`,
          ...(x.watchFunds === 0 ? [] : [
            el('span', { class: 'dim' }, [` · ${String(x.watchFunds)} takipte`]),
          ]),
        ]),
        el('td', {}, [signed(x.return1w, '%')]),
        el('td', {}, [signed(x.return1m, '%')]),
        // Açma düğmesi: satırın kendisi de tıklanabilir ama bunu kimse tahmin
        // etmiyor — görünür bir düğme olmadan özellik yok sayılıyor.
        el('td', { class: 'actions' }, [acDugme]),
      ]);

      // Hisseden fona: ayrı ekran değil, aynı tablonun açılır satırı. Kullanım
      // şu — bir hisse hareketlendi, hangi fonu artıracağını buradan buluyorsun.
      const icerik = el('tr', { class: 'expand-row' }, [
        el('td', { colspan: '7' }, [
          el('div', { class: 'stock-funds' }, [
            // Başlık satırı: sütunlar yalnız rakamdan ibaret olunca hangisinin
            // ne olduğu okunmuyordu. Tarih de burada çünkü fonlar aynı ayda
            // açıklamıyor — ölçülen veride PBR ve PHE 4 Ağustos, diğerleri
            // 1-2 Eylül. Yan yana durup aynı döneme aitmiş gibi görünüyorlardı.
            el('div', { class: 'stock-fund stock-fund-head' }, [
              el('span', {}, ['Fon']),
              el('span', {}, ['Ağırlık']),
              el('span', {}, ['Değer']),
              el('span', {}, ['Durum']),
              // Fark ayrı sütun: iki yüzdenin çıkarması ama rengi yönü tek
              // bakışta veriyor — yeşil artırmış, kırmızı azaltmış demek.
              // Çıkarmayı okuyanın yapması gerekmemeli.
              el('span', {}, ['Önceki Ay']),
              el('span', {}, ['Fark']),
              el('span', {}, ['Açıklama']),
            ]),
            ...x.funds.map((f) => el('div', {
              class: `stock-fund${f.owned ? '' : ' stock-fund-watch'}`,
            }, [
            (() => {
              // Fon koduna tıklayınca o fonun sayfası açılır: "bu hisse
              // DFI'da varmış, DFI başka ne tutuyor" sorusunun yolu bu.
              const b = el('button', { type: 'button', class: 'link-code' }, [f.fundCode]);
              b.addEventListener('click', (e) => {
                e.stopPropagation();
                void openFundModal(f.fundCode);
              });
              return b;
            })(),
            el('span', { class: 'num' }, [pct(Number(f.weightPct), 2)]),
            el('span', { class: 'num' }, [f.owned ? money(f.value) : '—']),
            el('span', { class: 'dim' }, [
              f.owned ? 'portföyümde' : 'takipte, pozisyon yok',
            ]),
            // Yön: fon geçen aya göre artırmış mı azaltmış mı. Kâr değil ama
            // "fon da bu hisseye giriyor" bilgisi karar için değerli.
              el('span', { class: 'num dim' }, [
                f.prevWeightPct === null ? '—' : pct(Number(f.prevWeightPct), 2),
              ]),
              el('span', {}, [f.weightChange === null ? '' : signed(f.weightChange, '')]),
              el('span', { class: 'dim' }, [gunAd(f.asOfDate)]),
            ])),
          ]),
        ]),
      ]);
      body.push(satir, icerik);
      const ac = (): void => {
        const acik = icerik.classList.toggle('open');
        satir.classList.toggle('open', acik);
        acDugme.title = acik ? 'Kapat' : 'Hangi fonlardan geldiğini aç';
      };
      acDugme.addEventListener('click', (e) => { e.stopPropagation(); ac(); });
      satir.addEventListener('click', ac);
      satir.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ac(); }
      });
    }
    if (body.length === 0) {
      govde.push(el('div', { class: 'empty-state' }, ['Bu aramaya uyan hisse yok.']));
    } else {
      govde.push(table(
        ['Hisse', 'Değer', 'Ağırlık', 'Kapsam', '1 Hafta', '1 Ay', ''], body));
    }
    // 200 satır sınırı: 686 hisse tek seferde çizilince tablo tutukluyor ve
    // kimse altıncı yüzü okumuyor. Arama zaten var.
    if (gorunen.length > 200) {
      govde.push(el('p', { class: 'panel-note' }, [
        `${String(gorunen.length)} hisseden ilk 200'ü gösteriliyor; aramayla daralt.`,
      ]));
    }
  }

  const oran = toplam === 0 ? 0 : (Number(d.classified) / toplam) * 100;
  return [
    el('div', { class: 'metric-grid' }, [
      metric('Hisse Sayısı', String(d.stocks.length), 'farklı hisse', 'fund'),
      metric('Hisseye Düşen', money(d.classified), `portföyün ${pct(oran, 1)}'i`, 'chart'),
      metric('En Ağır Hisse', d.stocks[0]?.stockCode ?? '—',
        d.stocks[0] === undefined ? '—'
          : `${pct(Number(d.stocks[0].weightPct), 2)} · ${String(d.stocks[0].funds.length)} fon`,
        'money'),
      metric('Ağırlık Tarihi', d.asOfTo === null ? '—' : gunAd(d.asOfTo), 'aylık açıklama',
        'transactions'),
    ]),
    panel(
      'Hisseler',
      `${String(d.stocks.length)} hisse · ${tarih}`,
      el('div', { class: 'panel-body' }, [
        ...govde,
        // Portföyün gerisi tahvil, repo, mevduat — hisse zaten değil. Bunu
        // yazmazsak %59,6 eksik bir hesap gibi görünür.
        el('p', { class: 'panel-note' }, [
          `Hisselere düşen ${money(d.classified)}, portföyün ${pct(oran, 1)}'i. `
          + 'Gerisi tahvil, repo, mevduat gibi kalemler — hisse değil. '
          + 'Ağırlıklar fonların ay sonu açıklamasından; bir aya kadar eski olabilir.',
        ]),
        ...(d.unknownFunds.length === 0 ? [] : [
          el('p', { class: 'panel-note panel-note-warn' }, [
            `${d.unknownFunds.join(', ')} için hisse kırılımı yok; bu fonların `
            + 'tutarı yukarıdaki toplama girmiyor.',
          ]),
        ]),
      ]),
      el('div', { class: 'panel-actions' }, [
        el('div', { class: 'tabs' }, [
          sekme('stock', 'Hisse', d.stocks.length),
          sekme('sector', 'Sektör', sektorListesi.length),
        ]),
        // Varsayılan kapalı: ekranın sorusu "hangi hisselerdeyim" ve sahip
        // olunmayan fon o soruya cevap vermiyor. Ölçüldü — 686 hissenin
        // 207'si yalnız takip fonlarından geliyor ve 0 TL değerle duruyordu.
        // Tamamen gizlemek de yanlış olurdu, anahtar geri getiriyor.
        takipAnahtari,
        ...(hisseSekme === 'stock' ? [arama] : []),
      ]),
    ),
  ];
}

/**
 * Asistan ekranı: doğal dille soru sorma.
 *
 * Konuşma sunucuda saklanıyor (RQ-0041). Saklanan yalnız görünen metin;
 * tool sonuçları saklanmıyor çünkü onlar o anki portföy durumu — dünkü
 * rakamları geri yükleyip modele vermek bugünkü soruyu dünün verisiyle
 * cevaplamak olurdu. Devam eden konuşmada tool'lar yeniden çağrılıyor.
 */
interface SohbetParca {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface KonusmaOzet {
  id: number;
  title: string;
  updatedAt: string;
  messages: number;
}

interface AsistanAdim {
  step: string | null;
  label: string | null;
  turn: number;
}

interface AsistanCevap {
  text: string;
  usedTools: string[];
  conversationId: number | null;
}

let sohbet: SohbetParca[] = [];
let sohbetAraclar: string[][] = [];
let sohbetMesgul = false;
let sohbetHata: string | null = null;
/** Sunucudaki konuşmanın kimliği; null ise bir sonraki soruda açılır. */
let sohbetId: number | null = null;
let sohbetAdim: string | null = null;
/**
 * Bekleme balonunun canlı düğümü.
 *
 * Adım değiştikçe tüm ekranı yeniden çizmek yerine bu düğümün metni
 * değiştiriliyor: yeniden çizim listeyi zıplatır ve odağı kaybettirir.
 * Düğüm koparsa (ekran değişip dönüldüyse) durum `sohbetAdim`'da duruyor
 * ve yeni çizimde oradan okunuyor.
 */
let sohbetBekleEl: HTMLElement | null = null;

function sohbetAdimYaz(metin: string): void {
  sohbetAdim = metin;
  if (sohbetBekleEl !== null) sohbetBekleEl.textContent = metin;
}

/**
 * Asistan uçunu akış olarak okur.
 *
 * Reddetme kolları (oturum, günlük sınır, anahtar yokluğu) hâlâ JSON ve
 * durum kodlu: akış başladıktan sonra durum kodu değiştirilemeyeceği için
 * sunucu onları akıştan önce yolluyor. Burada da önce `res.ok` bakılıyor.
 */
async function asistanAkis(
  govde: unknown,
  onAdim: (a: AsistanAdim) => void,
): Promise<AsistanCevap> {
  const res = await fetch('/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(govde),
  });
  if (!res.ok || res.body === null) {
    const hata = (await res.json().catch(() => null)) as { error?: unknown } | null;
    throw new Error(
      typeof hata?.error === 'string' ? hata.error : `HTTP ${String(res.status)}`,
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let tampon = '';
  let sonuc: (AsistanCevap & { error?: string }) | null = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    tampon += decoder.decode(value, { stream: true });
    const ayrik = sseAyir<
      (AsistanAdim & { done?: boolean }) | (AsistanCevap & { done: true; error?: string })
    >(tampon);
    tampon = ayrik.kalan;
    for (const veri of ayrik.olaylar) {
      if ('done' in veri && veri.done === true) {
        sonuc = veri as AsistanCevap & { error?: string };
      } else {
        onAdim(veri as AsistanAdim);
      }
    }
  }
  // Akış bitiş olayı gelmeden kapandıysa bağlantı koptu demektir. Sessizce
  // "cevap yok" bırakmak arayüzü kilitli gösterirdi.
  if (sonuc === null) throw new Error('Bağlantı kesildi; soruyu yeniden sorabilirsin.');
  if (typeof sonuc.error === 'string') throw new Error(sonuc.error);
  return sonuc;
}

async function chatView(reload: () => void): Promise<Node[]> {
  const gecmisListe = (await api('/api/assistant/conversations')) as KonusmaOzet[];

  const girdi = el('input', {
    class: 'chat-input', placeholder: 'Sorunu yaz…', spellcheck: 'false',
    ...(sohbetMesgul ? { disabled: 'true' } : {}),
  }) as HTMLInputElement;
  const gonder = el('button', {
    class: 'btn-primary', type: 'submit',
    ...(sohbetMesgul ? { disabled: 'true' } : {}),
  }, [sohbetMesgul ? 'Düşünüyor…' : 'Sor']);

  const sor = (): void => {
    const soru = girdi.value.trim();
    if (soru === '' || sohbetMesgul) return;
    sohbet.push({ role: 'user', parts: [{ text: soru }] });
    sohbetAraclar.push([]);
    sohbetMesgul = true;
    sohbetHata = null;
    sohbetAdim = 'Düşünüyor…';
    reload();
    void (async () => {
      try {
        const r = await asistanAkis(
          { history: sohbet, ...(sohbetId === null ? {} : { conversationId: sohbetId }) },
          (a) => {
            sohbetAdimYaz(
              a.label === null ? 'Düşünüyor…' : `${a.label} okunuyor…`,
            );
          },
        );
        sohbet.push({ role: 'model', parts: [{ text: r.text }] });
        sohbetAraclar.push(r.usedTools);
        sohbetId = r.conversationId;
      } catch (err) {
        // Soru geçmişte kalıyor: kullanıcı yeniden yazmak zorunda olmasın.
        sohbetHata = err instanceof Error ? err.message : 'Cevap alınamadı.';
      } finally {
        sohbetMesgul = false;
        sohbetAdim = null;
        sohbetBekleEl = null;
        reload();
      }
    })();
  };

  const form = el('form', { class: 'chat-form' }, [girdi, gonder]);
  form.addEventListener('submit', (e) => { e.preventDefault(); sor(); });

  const balonlar = sohbet.map((m, i) => {
    const metin = m.parts.map((x) => x.text).join('\n');
    const araclar = sohbetAraclar[i] ?? [];
    return el('div', { class: `chat-msg chat-${m.role}` }, [
      // Metin satır satır: modelin cevabı çok satırlı geliyor ve tek düğümde
      // satır sonları kayboluyordu.
      ...metin.split('\n').map((satir) => el('p', {}, [satir])),
      // Hangi tool'ların çağrıldığı görünür: cevabın nereden geldiği
      // gizlenirse kullanıcı doğruluğunu değerlendiremez.
      ...(araclar.length === 0 ? [] : [
        el('div', { class: 'chat-tools' }, [
          `ⓘ ${araclar.map(toolEtiket).join(' · ')}`,
        ]),
      ]),
    ]);
  });

  if (sohbetMesgul) {
    sohbetBekleEl = el('div', { class: 'chat-msg chat-model chat-wait' }, [
      sohbetAdim ?? 'Düşünüyor…',
    ]) as HTMLElement;
  }

  // İlk dört örnek her zaman görünür, gerisi konu başlıkları altında
  // katlanmış duruyor. Hepsi birden düğme olarak dizilseydi ekran yirmi
  // küsur rozetle dolar ve hangisinin ne olduğu okunmazdı; sorulabileceğin
  // şeyin genişliğini göstermek de aynı derecede gerekli.
  const ornekler = [
    'Portföyüm ne durumda?',
    'En çok hangi hissedeyim?',
    'Salı günleri mi daha çok alım yaptım?',
    'Geçen ay ne kazandım?',
  ];
  const ornekGruplari: { baslik: string; sorular: string[] }[] = [
    {
      baslik: 'Portföy',
      sorular: [
        'Toplam ne kadar kâr ettim?',
        'Cebimden çıkan para ne kadar?',
        'Bugün portföyüm ne kadar değişti?',
        'Paramın ne kadarı hisse senedinde?',
        'Varlık dağılımım nasıl?',
      ],
    },
    {
      baslik: 'Fonlar',
      sorular: [
        'Hangi fonum en çok kazandırdı?',
        'Zararda olan fonlarım hangileri?',
        'DOH ne kadar kârda?',
        'TLY fonunun içinde ne var?',
        'En uzun süredir hangi fondayım?',
      ],
    },
    {
      baslik: 'Hisseler',
      sorular: [
        'Hangi hisseye en çok maruzum?',
        'Kaç farklı hisseye yayılmışım?',
        'Aynı hisse kaç fonumda birden var?',
      ],
    },
    {
      baslik: 'İşlemler',
      sorular: [
        'Ayda kaç işlem yapıyorum?',
        'Hangi bankaya en çok para koydum?',
        'Kaç pozisyonum kapandı?',
        'Bu yıl kaç alım yaptım?',
        'En son hangi işlemi yaptım?',
      ],
    },
    {
      // Takip listesindeki ve hiç almadığın fonlar da veride: hisse
      // kırılımı tracked_fund üzerinden geliyor, yalnız açık pozisyonlardan
      // değil. Örnekler bunu göstermezse kimse denemeyi akıl etmez.
      baslik: 'Takip listem ve diğer fonlar',
      sorular: [
        'İçinde THYAO olan fonları listele',
        'Takip listemde hangi fonlar var?',
        'PBR fonunun içinde ne var?',
        'Almadığım hangi fonlarda ASELS var?',
      ],
    },
    {
      baslik: 'Getiri',
      sorular: [
        'Son 3 ayda ne kazandım?',
        'Bu yılın getirisi ne?',
        'Kapanan pozisyonlarımdan ne kadar kâr çıktı?',
      ],
    },
  ];

  const ornekDugme = (o: string): HTMLElement => {
    const b = el('button', { type: 'button', class: 'chat-sample' }, [o]);
    b.addEventListener('click', () => { girdi.value = o; sor(); });
    return b;
  };

  const yeniKonusma = (): void => {
    sohbet = [];
    sohbetAraclar = [];
    sohbetHata = null;
    sohbetId = null;
    reload();
  };

  const konusmaYukle = (id: number): void => {
    void (async () => {
      try {
        const m = (await api(`/api/assistant/conversations/${String(id)}`)) as
          { role: 'user' | 'model'; text: string; toolNames: string[] }[];
        sohbet = m.map((x) => ({ role: x.role, parts: [{ text: x.text }] }));
        sohbetAraclar = m.map((x) => x.toolNames);
        sohbetId = id;
        sohbetHata = null;
      } catch (err) {
        sohbetHata = err instanceof Error ? err.message : 'Konuşma açılamadı.';
      }
      reload();
    })();
  };

  const konusmaSilDugme = (k: KonusmaOzet): HTMLElement => {
    const b = el('button', {
      class: 'gecmis-sil', type: 'button', title: 'Konuşmayı sil',
      'aria-label': `${k.title} konuşmasını sil`,
    }, [icon('delete', 15)]) as HTMLElement;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      void (async () => {
        // Tarayıcının confirm'i yerine projenin modal'ı: diğer silmeler
        // böyle onaylanıyor ve neyin silineceğini satır satır gösteriyor.
        const ok = await confirmDelete({
          title: 'Konuşma silinsin mi?',
          detail: [k.title, `${gunAd(k.updatedAt.slice(0, 10))} · ${String(k.messages)} mesaj`],
          warning: 'Bu işlem geri alınamaz.',
          confirmLabel: 'Sil',
        });
        if (!ok) return;
        try {
          await api(`/api/assistant/conversations/${String(k.id)}`, { method: 'DELETE' });
          // Açık olan konuşma silindiyse ekran da boşalmalı; yoksa var
          // olmayan bir kayda yazmaya çalışırdık.
          if (sohbetId === k.id) { sohbet = []; sohbetAraclar = []; sohbetId = null; }
        } catch (err) {
          sohbetHata = err instanceof Error ? err.message : 'Silinemedi.';
        }
        reload();
      })();
    });
    return b;
  };

  const gecmisSatir = (k: KonusmaOzet): HTMLElement => {
    const ac = el('button', { class: 'gecmis-ac', type: 'button' }, [
      el('span', { class: 'gecmis-baslik' }, [k.title]),
      el('span', { class: 'gecmis-alt' }, [
        `${gunAd(k.updatedAt.slice(0, 10))} · ${String(k.messages)} mesaj`,
      ]),
    ]);
    ac.addEventListener('click', () => { konusmaYukle(k.id); });
    return el('li', {
      class: `gecmis-satir${sohbetId === k.id ? ' gecmis-acik' : ''}`,
    }, [ac, konusmaSilDugme(k)]);
  };

  // Liste sınırsız uzuyordu: otuz konuşmada Geçmiş paneli sayfanın tamamını
  // kaplıyor, asıl ekran olan sohbet yukarıda küçük bir kutuya dönüyordu.
  // Yeniler görünür, eskiler katlanmış durur — örnek sorularla aynı desen.
  const GECMIS_GORUNEN = 8;
  const yeniler = gecmisListe.slice(0, GECMIS_GORUNEN);
  const eskiler = gecmisListe.slice(GECMIS_GORUNEN);

  const gecmisPanel = gecmisListe.length === 0 ? [] : [
    panel(
      'Geçmiş',
      `${String(gecmisListe.length)} konuşma`,
      el('div', { class: 'panel-body' }, [
        el('ul', { class: 'gecmis-liste' }, yeniler.map(gecmisSatir)),
        ...(eskiler.length === 0 ? [] : [
          el('details', { class: 'ornek-katman' }, [
            el('summary', {}, [`Daha eski konuşmalar (${String(eskiler.length)})`]),
            el('ul', { class: 'gecmis-liste' }, eskiler.map(gecmisSatir)),
          ]),
        ]),
      ]),
    ),
  ];

  return [
    panel(
      'Asistan',
      'Portföyün ve Takip Listene Soru Sor',
      el('div', { class: 'panel-body chat-body' }, [
        ...(sohbet.length === 0
          ? [el('div', { class: 'chat-empty' }, [
              el('p', {}, ['Portföyün hakkında soru sorabilirsin. Örnekler:']),
              el('div', { class: 'chat-samples' }, ornekler.map(ornekDugme)),
              // <details>: açılıp kapanmayı tarayıcı yönetiyor, durum
              // yeniden çizimde kaybolmuyor ve klavyeyle erişilebilir.
              el('details', { class: 'ornek-katman' }, [
                el('summary', {}, ['Daha fazla soru örneği']),
                el('p', { class: 'ornek-not' }, [
                  'Sorular portföyünle sınırlı değil: takip listendeki ve hiç '
                  + 'almadığın fonların içeriğini de sorabilirsin.',
                ]),
                ...ornekGruplari.flatMap((g) => [
                  el('div', { class: 'ornek-baslik' }, [g.baslik]),
                  el('div', { class: 'chat-samples' }, g.sorular.map(ornekDugme)),
                ]),
              ]),
            ])]
          : balonlar),
        ...(sohbetBekleEl === null ? [] : [sohbetBekleEl]),
        ...(sohbetHata === null ? [] : [
          el('p', { class: 'panel-note panel-note-warn' }, [sohbetHata]),
        ]),
        form,
      ]),
      sohbet.length === 0 ? undefined : (() => {
        const t = el('button', { class: 'btn-ghost', type: 'button' }, ['Yeni konuşma']);
        t.addEventListener('click', yeniKonusma);
        return t;
      })(),
    ),
    ...gecmisPanel,
    el('p', { class: 'panel-note' }, [
      'Cevaplar senin verinden üretilir; ekranlardaki hesapların aynısı kullanılır. '
      + 'Hisse ağırlıkları fonların aylık açıklamasından gelir ve bir aya kadar eski '
      + 'olabilir. Yatırım tavsiyesi değildir.',
    ]),
  ];
}

async function closedView(): Promise<Node[]> {
  const rows = (await api('/api/closed')) as ClosedPositionRow[];
  const sum = (f: (r: ClosedPositionRow) => number): number => rows.reduce((a, r) => a + f(r), 0);
  const buy = sum((r) => Number(r.buyValue));
  const sell = sum((r) => Number(r.sellValue));
  const gain = sell - buy;
  const winners = rows.filter((r) => Number(r.realizedGain) > 0).length;

  const num = (v: string, digits = 0): string =>
    Number(v).toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

  // Fon kırılımı: aynı fonun bacakları listede yan yana değil, çünkü tablo
  // satış tarihine göre sıralı. Ölçüldü — 53 satır 19 fona dağılıyor,
  // VPS'in -126.585 TL'si yedi satıra bölünmüş ve hiçbir yerde toplanmıyor.
  interface FonOzet {
    fundCode: string; title: string | null; adet: number;
    buy: number; sell: number;
  }
  const fonlar = new Map<string, FonOzet>();
  for (const r of rows) {
    const f = fonlar.get(r.fundCode)
      ?? { fundCode: r.fundCode, title: r.title, adet: 0, buy: 0, sell: 0 };
    f.adet += 1;
    f.buy += Number(r.buyValue);
    f.sell += Number(r.sellValue);
    fonlar.set(r.fundCode, f);
  }
  // Portföye giren tutara göre azalan: listenin başında en çok para bağlanan
  // fon durur. K/Z'ye göre sıralamak küçük ama şanslı bir pozisyonu başa
  // taşıyordu; ölçekle sıralayınca satırın ağırlığı da okunuyor.
  const fonListe = [...fonlar.values()].sort((a, b) => b.buy - a.buy);

  // İşlem satırı ve toplam satırı tek yerde: hem İşlemler sekmesi hem fon
  // penceresi aynı tabloyu çiziyor. İki yerde ayrı kurulsaydı sütunlar
  // zamanla birbirinden ayrılırdı.
  const islemSatiri = (r: ClosedPositionRow): HTMLElement => el('tr', {}, [
    el('td', {}, [
      el('span', { class: 'fund-code' }, [r.fundCode]),
      el('span', { class: 'fund-title' }, [r.title ?? '']),
    ]),
    el('td', {}, [r.platform]),
    el('td', { class: 'num' }, [r.buyDate]),
    el('td', { class: 'num' }, [r.sellDate]),
    el('td', { class: 'num' }, [`${String(r.heldDays)}g`]),
    el('td', { class: 'num' }, [num(r.units)]),
    el('td', { class: 'num' }, [num(r.buyValue)]),
    el('td', { class: 'num' }, [num(r.sellValue)]),
    el('td', {}, [signed(r.realizedGain, ' ₺')]),
    el('td', {}, [signed(r.realizedPct, '')]),
  ]);

  const islemToplami = (liste: ClosedPositionRow[]): HTMLElement => {
    const b = liste.reduce((a, r) => a + Number(r.buyValue), 0);
    const v = liste.reduce((a, r) => a + Number(r.sellValue), 0);
    return el('tr', { class: 'total-row' }, [
      el('td', {}, [`TOPLAM (${String(liste.length)})`]),
      el('td', {}, []), el('td', {}, []), el('td', {}, []), el('td', {}, []), el('td', {}, []),
      el('td', { class: 'num' }, [num(String(b))]),
      el('td', { class: 'num' }, [num(String(v))]),
      el('td', {}, [signed(String(v - b), ' ₺')]),
      el('td', {}, [signed(b === 0 ? null : String((v / b - 1) * 100), '')]),
    ]);
  };

  const ISLEM_BASLIK = ['Fon', 'Banka', 'Alış', 'Satış', 'Süre', 'Adet',
    'Alış ₺', 'Satış ₺', 'K/Z', 'K/Z %'];

  // Fon penceresi: satır listeyi yerinde şişirmiyor, sekmeyi de
  // değiştirmiyor. Tablo İşlemler sekmesindekinin aynısı — filtresiz, çünkü
  // pencere zaten tek fonun penceresi.
  const fonPenceresi = (f: FonOzet): void => {
    const liste = rows.filter((r) => r.fundCode === f.fundCode);
    openModal(
      f.fundCode,
      `${f.title ?? ''} · ${String(liste.length)} kapanmış işlem`,
      table(ISLEM_BASLIK, [...liste.map(islemSatiri), islemToplami(liste)]),
      [],
      'xwide',
    );
  };

  const fonBody = fonListe.map((f) => {
    const btn = iconButton('transactions', `${f.fundCode} işlemleri`);
    const tr = el('tr', { class: 'fund-row', title: `${f.fundCode} işlemlerini aç` }, [
      el('td', {}, [
        el('span', { class: 'fund-code' }, [f.fundCode]),
        el('span', { class: 'fund-title' }, [f.title ?? '']),
      ]),
      el('td', { class: 'num dim' }, [`${String(f.adet)} işlem`]),
      el('td', { class: 'num' }, [num(String(f.buy))]),
      el('td', { class: 'num' }, [num(String(f.sell))]),
      el('td', {}, [signed(String(f.sell - f.buy), ' ₺')]),
      el('td', {}, [signed(f.buy === 0 ? null : String((f.sell / f.buy - 1) * 100), '')]),
      el('td', { class: 'row-action' }, [btn]),
    ]);
    tr.addEventListener('click', () => { fonPenceresi(f); });
    return tr;
  });

  const fonFoot = el('tr', { class: 'total-row' }, [
    el('td', {}, [`TOPLAM (${String(fonListe.length)})`]),
    el('td', { class: 'num dim' }, [`${String(rows.length)} işlem`]),
    el('td', { class: 'num' }, [num(String(buy))]),
    el('td', { class: 'num' }, [num(String(sell))]),
    el('td', {}, [signed(String(gain), ' ₺')]),
    el('td', {}, [signed(buy === 0 ? null : String((sell / buy - 1) * 100), '')]),
    el('td', {}, []),
  ]);

  // Filtre seçenekleri kapanan işlemlerden: hiç kapanmamış bir fonu listede
  // göstermenin anlamı yok.
  const fonSecenekleri = [...new Map(rows.map((r) => [r.fundCode, r.title])).entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'tr'));
  const bankaSecenekleri = [...new Set(rows.map((r) => r.platform))]
    .sort((a, b) => a.localeCompare(b, 'tr'));

  const govde = el('div', { class: 'panel-body' }, []);
  const meta = el('span', { class: 'header-meta' }, []);
  const dugmeler = new Map<KapananSekme, HTMLElement>();

  const islemTablosu = (): HTMLElement => {
    // İki filtre AND ile birleşir; tek başlarına da çalışırlar. Fon
    // Hareketleri'ndeki kuralın aynısı.
    const gorunen = rows.filter((r) =>
      (kapananFiltre.fundCode === '' || r.fundCode === kapananFiltre.fundCode)
      && (kapananFiltre.platform === '' || r.platform === kapananFiltre.platform));
    const fonFiltre = comboFilter({
      label: 'Tümü',
      options: fonSecenekleri.map(([kod, ad]) => ({
        value: kod, label: kod, hint: ad ?? undefined,
      })),
      value: kapananFiltre.fundCode,
      onChange: (v) => { kapananFiltre.fundCode = v; ciz('tx'); },
    });
    const bankaFiltre = comboFilter({
      label: 'Tümü',
      options: bankaSecenekleri.map((b) => ({ value: b, label: b })),
      value: kapananFiltre.platform,
      onChange: (v) => { kapananFiltre.platform = v; ciz('tx'); },
    });

    // Sonuç boşken de tablo çizilir: filtreler başlık satırında duruyor,
    // tabloyu kaldırmak seçimi geri almanın yolunu da kaldırırdı.
    return table(
      ISLEM_BASLIK,
      gorunen.length === 0
        ? [el('tr', {}, [el('td', { colspan: '10' }, [
            el('div', { class: 'empty-state' }, [
              'Bu filtreye uyan kapanmış işlem yok. Filtreyi temizleyin.',
            ]),
          ])])]
        : [...gorunen.map(islemSatiri), islemToplami(gorunen)],
      // Filtreler süzdükleri sütunun altında; diğer hücreler boş.
      [fonFiltre, bankaFiltre, null, null, null, null, null, null, null, null],
    );
  };

  const ciz = (id: KapananSekme): void => {
    if (rows.length === 0) {
      govde.replaceChildren(
        el('div', { class: 'empty-state' }, ['Henüz kapanmış pozisyon yok.']));
      meta.textContent = 'Henüz kapanmış pozisyon yok';
      return;
    }
    if (id === 'fund') {
      govde.replaceChildren(table(
        ['Fon', 'İşlem', 'Alış ₺', 'Satış ₺', 'K/Z', 'K/Z %', ''],
        [...fonBody, fonFoot]));
      meta.textContent = `${String(fonListe.length)} fon · en çok yatırılandan başlar`;
      return;
    }
    govde.replaceChildren(islemTablosu());
    const suzulu = kapananFiltre.fundCode !== '' || kapananFiltre.platform !== '';
    const kac = rows.filter((r) =>
      (kapananFiltre.fundCode === '' || r.fundCode === kapananFiltre.fundCode)
      && (kapananFiltre.platform === '' || r.platform === kapananFiltre.platform)).length;
    // Filtreliyken payda da yazılır: "7 işlem" tek başına listenin tamamı mı
    // yoksa süzülmüş hali mi belli etmiyor.
    meta.textContent = (suzulu
      ? `${String(kac)} / ${String(rows.length)} işlem`
      : `${String(rows.length)} işlem`) + ' · en son alınan üstte';
  };

  const sec = (id: KapananSekme): void => {
    // Yeniden istek yok: iki kırılım da aynı /api/closed yanıtından
    // hesaplanıyor, veri elde.
    writeKapananSekme(id);
    for (const [k, d] of dugmeler) d.classList.toggle('tab-on', k === id);
    ciz(id);
  };

  const sekmeler = el('div', { class: 'tabs' },
    ([['fund', 'Fonlar', fonListe.length], ['tx', 'İşlemler', rows.length]] as const)
      .map(([id, etiket, sayi]) => {
        const d = el('button', {
          type: 'button',
          class: `tab-btn${readKapananSekme() === id ? ' tab-on' : ''}`,
        }, [etiket, el('span', { class: 'tab-count' }, [String(sayi)])]);
        d.addEventListener('click', () => { sec(id); });
        dugmeler.set(id, d);
        return d;
      }));
  ciz(readKapananSekme());

  const kapananPanel = el('section', { class: 'panel' }, [
    el('div', { class: 'panel-heading' }, [
      el('div', { class: 'panel-heading-text' }, [
        el('h2', {}, ['Kapanan Pozisyonlar']),
        meta,
      ]),
      el('div', { class: 'panel-actions' }, [sekmeler]),
    ]),
    govde,
  ]);

  return [
    el('div', { class: 'metric-grid' }, [
      metric('Gerçekleşen K/Z', money(String(gain)),
        buy === 0 ? '—' : pct((sell / buy - 1) * 100), 'money'),
      metric('Kapanan İşlem', String(rows.length), 'Satılmış Kayıt', 'closed', 'işlem'),
      metric('Kazançla Kapanan', String(winners), `${String(rows.length - winners)} Zararla`, 'flag'),
      metric('Toplam Satış', money(String(sell)), 'Elde Edilen Tutar', 'chart'),
    ]),
    kapananPanel,
  ];
}

interface NakitGirisi {
  date: string;
  platform: string;
  fundCode: string;
  sellDate: string;
  valorDays: number | null;
  amount: string;
  estimated: boolean;
}

/**
 * Nakit takvimi: satıştan gelecek para, banka ve tarih kırılımında.
 *
 * Bakiye YOK ve bu bilinçli: uygulama bankaya dışarıdan yatırılan parayı
 * görmüyor, yalnız fon alım satımını biliyor. Sıfırdan net akış "eksi
 * bakiye" gibi okunurdu. Gösterilen şey gerçekten bilinen şey.
 */
async function cashView(): Promise<Node[]> {
  const rows = (await api('/api/cash')) as NakitGirisi[];
  const bugun = bugunISO();

  // Aynı gün aynı bankaya gelen tutarlar toplanıyor; hangi satışlardan
  // geldiği kaynak sütununda duruyor.
  interface Grup {
    date: string; platform: string; toplam: number;
    kaynak: NakitGirisi[]; tahmin: boolean; eksik: boolean;
  }
  const gruplar = new Map<string, Grup>();
  for (const r of rows) {
    const k = `${r.date}·${r.platform}`;
    const g = gruplar.get(k)
      ?? { date: r.date, platform: r.platform, toplam: 0, kaynak: [], tahmin: false, eksik: false };
    g.toplam += Number(r.amount || 0);
    g.kaynak.push(r);
    if (r.estimated) g.tahmin = true;
    if (r.amount === '') g.eksik = true;
    gruplar.set(k, g);
  }
  // Bugün ile sonrası ayrı: biri hesabında duran para, diğeri henüz yolda.
  // Tek listede olunca ikisi aynı şeymiş gibi okunuyordu.
  const liste = [...gruplar.values()];
  const bugunku = liste.filter((g) => g.date === bugun)
    .sort((a, b) => a.platform.localeCompare(b.platform, 'tr'));
  const sonraki = liste.filter((g) => g.date > bugun).sort((a, b) => (a.date < b.date ? -1 : 1));
  const gelmis = liste.filter((g) => g.date < bugun).sort((a, b) => (a.date > b.date ? -1 : 1));

  // Yalnız fon kodları. Valör bilgisi burada bir işe yaramıyordu: para günü
  // zaten satırın kendisinde ve valör onu açıklamıyor — satış tarihi emirden
  // türetilirken zaten uygulanmış oluyor.
  const kaynakMetni = (liste: NakitGirisi[]): string => {
    const sayim = new Map<string, number>();
    for (const r of liste) sayim.set(r.fundCode, (sayim.get(r.fundCode) ?? 0) + 1);
    return [...sayim.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'tr'))
      .map(([kod, n]) => `${kod}${n > 1 ? ` ×${String(n)}` : ''}`).join(', ');
  };

  const satir = (g: Grup): HTMLElement => el('tr', {}, [
    el('td', { class: 'num' }, [g.date]),
    el('td', {}, [g.platform]),
    el('td', { class: 'num' }, [
      // Tahmin işaretli: satış gerçekleşmemişse fiyat açıklanmamıştır.
      g.eksik && g.toplam === 0 ? '—' : `${g.tahmin ? '≈ ' : ''}${money(String(g.toplam))}`,
    ]),
    // Bir satış birden çok FIFO bacağına bölünüyor; kaynakta aynı fon üç kez
    // tekrar ediyordu. Fon ve satış gününe göre toplanıp kaç bacak olduğu
    // yazılıyor.
    el('td', { class: 'dim' }, [kaynakMetni(g.kaynak)]),
  ]);

  const bugunToplam = bugunku.reduce((a, g) => a + g.toplam, 0);
  const sonrakiToplam = sonraki.reduce((a, g) => a + g.toplam, 0);

  // Banka kutusunda iki rakam: bugün hesaba geçen ve yolda olan. "bugün +
  // yolda" diye etiket yazmak toplamın neden o kadar olduğunu söylemiyordu.
  const banka = new Map<string, { bugun: number; yolda: number }>();
  const ekle = (ad: string, tutar: number, alan: 'bugun' | 'yolda'): void => {
    const v = banka.get(ad) ?? { bugun: 0, yolda: 0 };
    v[alan] += tutar;
    banka.set(ad, v);
  };
  for (const g of bugunku) ekle(g.platform, g.toplam, 'bugun');
  for (const g of sonraki) ekle(g.platform, g.toplam, 'yolda');

  return [
    el('div', { class: 'metric-grid' }, [
      // Kutuda gün de yazıyor: "bugün" tek başına hangi güne bakıldığını
      // söylemiyor ve ekran açık kaldığında gün değişebiliyor.
      metric('Bugün Gelen', money(String(bugunToplam)),
        bugunku.length === 0 ? `${gunAd(bugun)} · giriş yok`
          : `${gunAd(bugun)} · ${String(bugunku.length)} banka`, 'money'),
      metric('Sonraki Günler', money(String(sonrakiToplam)),
        sonraki.length === 0 ? 'yolda para yok'
          : `en yakın ${gunAd(sonraki[0]?.date ?? null)}`, 'chart'),
      ...[...banka.entries()]
        .sort((a, b) => (b[1].bugun + b[1].yolda) - (a[1].bugun + a[1].yolda))
        .slice(0, 2)
        .map(([ad, v]) => metric(ad, money(String(v.bugun + v.yolda)),
          `bugün ${money(String(v.bugun))} · yolda ${money(String(v.yolda))}`, 'chart')),
    ]),
    panel(
      'Bugün Gelen',
      // Para gün içinde değil, öğleden sonra hesaba geçiyor: sabah bakıp
      // "gelmemiş" diye okumasın.
      bugunku.length === 0 ? `${gunAd(bugun)} · para girişi yok`
        : `${gunAd(bugun)} · saat 15:00'ten sonra hesapta`,
      el('div', { class: 'panel-body' }, [
        bugunku.length === 0
          ? el('div', { class: 'empty-state' }, ['Bugün para girişi yok.'])
          : table(['Para Günü', 'Banka', 'Tutar', 'Fonlar'], bugunku.map(satir)),
      ]),
    ),
    panel(
      'Sonraki Günler',
      'Satış girilmiş, para henüz hesapta değil',
      el('div', { class: 'panel-body' }, [
        sonraki.length === 0
          ? el('div', { class: 'empty-state' }, ['Yolda bekleyen para yok.'])
          : table(['Para Günü', 'Banka', 'Tutar', 'Fonlar'], sonraki.map(satir)),
      ]),
    ),
    panel(
      'Gelmiş Para',
      `${String(gelmis.length)} giriş · en yeni üstte`,
      el('div', { class: 'panel-body' }, [
        gelmis.length === 0
          ? el('div', { class: 'empty-state' }, ['Henüz para girişi yok.'])
          : table(['Para Günü', 'Banka', 'Tutar', 'Fonlar'], gelmis.map(satir)),
      ]),
    ),
  ];
}

/**
 * Dönemsel getiri: ay ay, her ayın içinde hafta hafta kâr/zarar.
 *
 * Aylar en yeniden en eskiye, ayın haftaları kendi içinde artan sırada gelir —
 * sıralamayı sunucu kurar, burada yeniden sıralanmaz.
 */
async function periodsView(): Promise<Node[]> {
  const [months, ayar] = (await Promise.all([
    api('/api/periods'),
    api('/api/benchmark'),
  ])) as [MonthlyPeriod[], { benchmark: string }];
  const bench = ayar.benchmark;
  const benchBekliyor = months.every((m) => m.benchPct === null) && months.length > 0;

  // Gün ve ay olarak kısa aralık: "01.08 – 07.08". Yıl yazılmaz, satırın
  // kendisi zaten bir ayın içinde duruyor.
  const range = (r: PeriodRow): string =>
    r.startDate === '' ? '—' : `${r.startDate.slice(8)}.${r.startDate.slice(5, 7)} – ${r.endDate.slice(8)}.${r.endDate.slice(5, 7)}`;

  const cells = (r: PeriodRow, isMonth: boolean): HTMLElement[] => [
    el('td', {}, [
      el('span', { class: isMonth ? 'period-name' : 'period-week-name' }, [r.label]),
    ]),
    el('td', { class: 'num dim' }, [range(r)]),
    el('td', { class: 'num dim' }, [`${String(r.days)}g`]),
    el('td', {}, [signed(r.gain, ' ₺')]),
    el('td', {}, [signed(r.pct)]),
    el('td', {}, [signed(r.benchPct)]),
    // Birim başlıkta: her satırda tekrarlanınca sütunu okumayı zorlaştırıyor.
    el('td', {}, [signed(r.diff, '')]),
  ];

  const rows: HTMLElement[] = [];
  for (const m of months) {
    // Şeridin rengi ayın sonucunu söyler: satırı okumadan önce zarar mı kâr mı
    // olduğu görünsün.
    rows.push(el('tr', {
      class: Number(m.gain) < 0 ? 'period-month period-loss' : 'period-month',
    }, cells(m, true)));
    for (const w of m.weeks) rows.push(el('tr', { class: 'period-week' }, cells(w, false)));
  }

  const gains = months.map((m) => Number(m.gain));
  const total = gains.reduce((a, b) => a + b, 0);
  // Toplam getiri aylık getirilerin bileşiği; yüzdeleri toplamak yanlış olurdu.
  const compound = months.reduce((a, m) => (m.pct === null ? a : a * (1 + Number(m.pct) / 100)), 1);
  const winners = gains.filter((g) => g > 0).length;
  const worst = months.reduce<MonthlyPeriod | null>(
    (a, m) => (a === null || Number(m.gain) < Number(a.gain) ? m : a), null);
  const latest = months[0];

  return [
    el('div', { class: 'metric-grid' }, [
      metric('Toplam K/Z', money(String(total)),
        months.length === 0 ? '—' : `${String(months.length)} ayın bileşiği · ${pct((compound - 1) * 100)}`,
        'money'),
      metric('Son Ay', latest === undefined ? '—' : money(latest.gain),
        latest === undefined ? '—' : `${latest.label}${latest.pct === null ? '' : ` · ${pct(Number(latest.pct))}`}`,
        'chart'),
      metric(`${bench} Üstü`,
        String(months.filter((m) => m.diff !== null && Number(m.diff) >= 0).length),
        `${String(months.filter((m) => m.diff !== null && Number(m.diff) < 0).length)} Ayda Geride`,
        'flag', 'ay'),
      metric('Kazançlı Ay', String(winners),
        worst === null || Number(worst.gain) >= 0
          ? `${String(months.length - winners)} Zararla`
          : `${String(months.length - winners)} Zararla · En Kötü ${worst.label}`,
        'closed', 'ay'),
    ]),
    panel(
      'Dönemsel Getiri',
      `${String(months.length)} ay · en son ay üstte, haftalar ay içinde sırayla`,
      el('div', { class: 'panel-body' }, [
        months.length === 0
          ? el('div', { class: 'empty-state' }, ['Getirisi ölçülebilen bir gün yok.'])
          : table(['Dönem', 'Aralık', 'Gün', 'K/Z', 'Getiri', bench, 'Fark (puan)'], rows),
      ]),
    ),
    el('p', { class: 'panel-note' }, [
      'Getiri sermaye hareketinden arındırılmıştır: para yatırılan veya çekilen gün ' +
      'kazanç sayılmaz. Bir ayın kazancı haftalarının toplamı, getirisi haftalarının ' +
      'bileşiğidir. Ay en fazla dört haftaya bölünür; artan günler son haftaya eklenir.',
    ]),
    ...(benchBekliyor
      ? [el('p', { class: 'panel-note panel-note-warn' }, [
          `${bench} için henüz getiri verisi yok; karşılaştırma sütunu veri gelince dolar.`,
        ])]
      : []),
    el('p', { class: 'panel-note' }, [
      `${bench} getirisi portföyün ölçülebildiği aynı günler üzerinden zincirlenir; ` +
      'para tutulmayan günün getirisi benchmark\'a sayılmaz. Fark puan cinsindendir: ' +
      'iki yüzdenin farkı yüzde değil puandır.',
    ]),
    el('p', { class: 'panel-note' }, [
      'K/Z ile getiri işaret olarak ayrışabilir. K/Z o günkü portföy büyüklüğüne ' +
      'göre ağırlıklıdır, getiri ise her günün kendi açılışına göre ölçülür; dönem ' +
      'içinde para giriş çıkışı olduğunda ikisi farklı yöne bakabilir.',
    ]),
  ];
}

/**
 * Fon Hareketleri filtresi.
 *
 * Modül düzeyinde tutuluyor: liste her ekleme, düzenleme ve silmeden sonra
 * baştan yükleniyor. Durum view'ın içinde kalsaydı Fiba'da üç kayıt düzeltirken
 * filtreyi üç kez yeniden seçmek gerekirdi.
 */
const txFiltre = { fundCode: '', platform: '' };

async function transactionsView(reload: () => void): Promise<Node[]> {
  const rows = (await api('/api/transactions')) as Transaction[];
  // Pasif kayıt açık pozisyon değil: adedi yok, hiçbir hesaba girmiyor.
  const open = rows.filter((t) => t.sellDate === null && t.units !== null);
  const pasif = rows.filter((t) => t.units === null);
  const funds = new Set(open.map((t) => t.fundCode));
  const platforms = new Set(open.map((t) => t.platform));
  // Son işlem alış da satış da olabilir. Yalnız alış tarihine bakılıyordu ve
  // kutu "Son İşlem" derken satışları görmezden geliyordu — ölçülen veride son
  // alış 4 Eylül, son satış 8 Eylül'dü.
  //
  // İleri tarihli satış sayılmaz: girilmiş ama henüz gerçekleşmemiş bir işlem
  // "son yaptığın şey" değil. Uygulama başka yerlerde de onu "Bekliyor" diye
  // ayırıyor.
  const buGun = bugunISO();
  const olaylar: { date: string; tur: string }[] = [
    ...rows.map((t) => ({ date: t.tradeDate, tur: 'Alış' })),
    ...rows.flatMap((t) => (t.sellDate !== null && t.sellDate <= buGun
      ? [{ date: t.sellDate, tur: 'Satış' }] : [])),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const sonOlay = olaylar.at(-1);
  const last = sonOlay?.date;

  // Seçenekler kullanıcının kendi işlemlerinden: hiç işlemi olmayan bir fonu
  // filtrede göstermenin anlamı yok.
  const fonSecenekleri = [...new Map(rows.map((t) => [t.fundCode, t.fundTitle])).entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'tr'));
  const bankaSecenekleri = [...new Set(rows.map((t) => t.platform))].sort((a, b) =>
    a.localeCompare(b, 'tr'));

  // Bir fon veya banka listeden tamamen kalkarsa seçili filtre boşa düşer ve
  // kullanıcı sebebi görünmeyen boş bir tabloya bakar; o durumda filtre sıfırlanır.
  if (txFiltre.fundCode !== '' && !fonSecenekleri.some(([k]) => k === txFiltre.fundCode)) {
    txFiltre.fundCode = '';
  }
  if (txFiltre.platform !== '' && !bankaSecenekleri.includes(txFiltre.platform)) {
    txFiltre.platform = '';
  }

  // İki filtre AND ile birleşir; tek başlarına da çalışırlar.
  const gorunen = rows.filter((t) =>
    (txFiltre.fundCode === '' || t.fundCode === txFiltre.fundCode)
    && (txFiltre.platform === '' || t.platform === txFiltre.platform));
  const filtreliMi = txFiltre.fundCode !== '' || txFiltre.platform !== '';

  // Filtreler sütunlarının üstünde durur. Tetikleyicide yalnız fon kodu
  // yazılır — sütun dar ve kod zaten satırlarda da o genişlikte; fon adı
  // listede, kodun yanında ikinci satır olarak görünür.
  const fonFiltre = comboFilter({
    label: 'Tümü',
    options: fonSecenekleri.map(([kod, ad]) => ({
      value: kod, label: kod, hint: ad ?? undefined,
    })),
    value: txFiltre.fundCode,
    onChange: (v) => { txFiltre.fundCode = v; reload(); },
  });
  const bankaFiltre = comboFilter({
    label: 'Tümü',
    options: bankaSecenekleri.map((b) => ({ value: b, label: b })),
    value: txFiltre.platform,
    onChange: (v) => { txFiltre.platform = v; reload(); },
  });

  // Alış ve satış aynı yerde duruyor: biri tablodan biri başlıktan girilseydi
  // aynı işin iki yarısı iki ayrı yere dağılırdı. Ad da düzeldi — "İşlem Ekle"
  // yalnız alım ekliyordu ama genel bir ad taşıyordu.
  const addBtn = el('button', { class: 'btn-primary' }, [icon('add'), 'Alış Ekle']);
  addBtn.addEventListener('click', () => { openTransactionModal(null, reload); });

  // Açık havuzlar: satılabilecek her fon+banka bir seçenek. Havuz yoksa düğme
  // hiç çizilmez; boş bir listeye açılan pencere yanıltıcı olurdu.
  const havuzlar = new Map<string, Transaction[]>();
  for (const t of rows) {
    if (t.sellDate !== null) continue;
    const k = `${t.fundCode}·${t.platform}`;
    havuzlar.set(k, [...(havuzlar.get(k) ?? []), t]);
  }
  const sellBtn = havuzlar.size === 0
    ? null
    : el('button', { class: 'btn-ghost' }, [icon('sell'), 'Satış Ekle']);
  sellBtn?.addEventListener('click', () => { openSellModal(havuzlar, reload); });

  // Toplam yalnız parası ölçülebilen satırlardan: getiri günü olmayan işlem
  // maliyetsiz görünüyor, onu sıfır sayıp toplama katmak yanlış olurdu.
  const bugun = bugunISO();
  const olculen = gorunen.filter((t) => t.cost !== null);
  const tMaliyet = olculen.reduce((a, t) => a + Number(t.cost), 0);
  const tDeger = olculen.reduce((a, t) => a + Number(t.value), 0);
  const toplamSatiri = el('tr', { class: 'total-row' }, [
    el('td', {}, [`TOPLAM (${String(olculen.length)})`]),
    el('td', {}, []), el('td', {}, []), el('td', {}, []), el('td', {}, []),
    el('td', { class: 'num' }, [
      el('span', { class: 'stack-from' }, [money(String(tMaliyet))]),
      el('span', { class: 'stack-to' }, [money(String(tDeger))]),
    ]),
    el('td', {}, [signed(String(tDeger - tMaliyet), ' ₺')]),
    // Yüzde yok: bu sütun toplam değil oran ve payda burada BRÜT alım, yani
    // aynı fona defalarca girip çıkınca şişen bir sayı. Doğru getiri oranı
    // Panel'de, net sermayeye bölünmüş halde duruyor.
    el('td', {}, []),
    el('td', {}, []), el('td', {}, []),
  ]);

  const body = gorunen.map((t) => {
    const editBtn = iconButton('edit', 'Düzenle');
    const delBtn = iconButton('delete', 'Sil', 'danger');
    // Satış düğmesi burada değil, panel başlığında.
    //
    // Satış bir alım kaydına ait değil: fon ve bankadaki bütün açık paylardan,
    // en eskiden başlayarak çıkıyor. Satıra iliştirildiğinde 01.09'un düğmesine
    // basıp 24.08'in satıldığını görmek gerekiyordu; yalnız en eski satıra
    // koymak da "havuzdan satıyorsak neden tek satırda?" sorusunu bırakıyordu.
    // Tablodan çıkınca arayüz olanı söylüyor: havuz seçiliyor, satır değil.
    // Soldaki şerit satırın sonucunu söyler; Dönemsel Getiri'deki ay satırıyla
    // aynı dil. Gerçekleşmiş satış soluk yazılır: kapanmış bir kayıt artık
    // takip edilecek bir şey değil, listede yer tutuyor.
    const kapali = t.sellDate !== null && t.sellDate <= bugun;
    // Pasif kayıt kendi rengini taşır ve kâr/zarar şeridini almaz: onun bir
    // sonucu yok, hesaplara da girmiyor. Rozet tek başına yetmiyordu —
    // satırın tamamı diğerleriyle aynı görünüyor ve göz kaymıyordu.
    const pasifSatir = t.units === null;
    const sinif = [
      pasifSatir ? 'tx-pending'
        : t.gain === null ? '' : Number(t.gain) < 0 ? 'tx-loss' : 'tx-gain',
      kapali ? 'tx-closed' : '',
    ].filter((c) => c !== '').join(' ');
    const tr = el('tr', sinif === '' ? {} : { class: sinif }, [
      // Fon adı yazılmıyor, üzerine gelince çıkıyor. Kısaltılmış hâli zaten
      // ayırt edici değildi — DOH da THF de "TERA PORTFÖY…" diye başlıyor —
      // ama sütunun yarısını yiyor ve satırı iki katına çıkarıyordu.
      el('td', { title: t.fundTitle ?? t.fundCode }, [
        el('span', { class: 'fund-code' }, [t.fundCode]),
        // Kısmi satışta bölünen kayıt: kullanıcının yazmadığı bir satırın
        // nereden geldiği görünmeli.
        // Kısmi satışın iki parçası ayrı etiket taşır: kullanıcının girdiği
        // kayıt küçüldü ("Bölündü"), makinenin açtığı satır ise onun artığı
        // ("Kalan"). Aynı etiket ikisinde de dururken hangisinin nereden
        // geldiği okunmuyordu.
        // Not fon kodunun altında, bölünme işaretiyle aynı yerde. Ayrı sütun
        // açılmıyor: tablo on bir sütunlu ve zaten dar, üstelik sütun kayıtların
        // çoğunda boş dururdu. Uzun not CSS ile kırpılır, tamamı ipucunda.
        ...(t.note === null || t.note === '' ? [] : [
          el('span', { class: 'tx-note', title: t.note }, [t.note]),
        ]),
        ...(t.splitRole === null ? [] : [(() => {
          const asil = t.splitTotal === null
            ? ''
            : `${Number(t.splitTotal).toLocaleString('tr-TR')} paylık alımın `;
          return el('span', {
            class: `split-mark split-${t.splitRole}`,
            title: t.splitRole === 'parent'
              ? `${asil}satılan parçası; geri kalanı ayrı satırda açık duruyor`
              : `${asil}satılmayan parçası; kalanı bu satırda açık duruyor`,
          }, [t.splitRole === 'parent' ? 'Bölündü' : 'Kalan']);
        })()]),
      ]),
      // Adet yoksa tutar yazılır ve satır pasif: fiyat açıklanınca adet
      // girilecek. Sıfır yazmak yanlış rakam yazmaktır.
      el('td', { class: 'num' }, t.units !== null
        ? [Number(t.units).toLocaleString('tr-TR')]
        : [
            el('span', { class: 'stack-from est-label' }, ['Adet bekleniyor']),
            el('span', { class: 'stack-to' }, [
              `${Number(t.orderAmount ?? 0).toLocaleString('tr-TR')} ₺`]),
          ]),
      el('td', { class: 'num' }, [t.tradeDate]),
      el('td', {}, [t.platform]),
      // Alış ve güncel fiyat tek hücrede alt alta: ayrı sütun olsalar tablo
      // on bir sütuna çıkıyordu, oysa ikisi aynı büyüklüğün iki ucu ve zaten
      // birbirine bakılarak okunuyor.
      el('td', { class: 'num' }, t.buyPrice === null ? ['—'] : [
        el('span', { class: 'stack-from' }, [fiyat(t.buyPrice)]),
        el('span', { class: 'stack-to' }, [fiyat(t.nowPrice)]),
      ]),
      // Maliyet ve değer de aynı desende: üstte başlangıç, altta son. İkisi
      // ayrı sütunken tablo kapsayıcısını aşıyordu ve zaten hep birbirine
      // bakılarak okunuyorlar.
      // Maliyet yoksa işlemin fiyatı henüz açıklanmamış demek. Boş bırakmak
      // yerine son bilinen fiyattan tahmin veriliyor; üst satır "tahmini"
      // diyor ki rakam ölçülmüş gibi okunmasın. Fonun hiç fiyatı yoksa
      // tahmin de yok.
      el('td', { class: 'num' }, t.cost !== null
        ? [
            el('span', { class: 'stack-from' }, [money(t.cost)]),
            el('span', { class: 'stack-to' }, [money(t.value)]),
          ]
        // Pasif kayıtta adet yok, yani tahmin de yok. Rozet burada duruyor:
        // "hesaba girmiyor" sözü tam da maliyet ve değerin olması gereken
        // yerde söylenmeli. Satış sütununda dururken ilgisiz bir yerdeydi.
        : t.units === null
          ? [badge('Pasif', 'pending')]
          : t.latestNav === null
          ? ['—']
          : [
              el('span', { class: 'stack-from est-label' }, ['Tahmini']),
              el('span', {
                class: 'stack-to',
                title: `${t.latestNavDate ?? ''} birim fiyatıyla; gerçek fiyat `
                  + 'işlem günü açıklanınca belli olacak',
              }, [`≈ ${money(String(Number(t.units) * Number(t.latestNav)))}`]),
            ]),
      el('td', {}, [signed(t.gain, ' ₺')]),
      // Birim başlıkta ("K/Z %"), her satırda tekrarlanmıyor.
      el('td', {}, [signed(t.gainPct, '')]),
      // Satış ve durum tek sütunda. Tarih varsa pozisyon kapanmıştır — tek
      // istisna ileri tarihli satış: emir verilmiş ama gerçekleşmemiş, o yüzden
      // hâlâ açık. Bilgi yalnız o satırda rozet olarak veriliyor; iki ayrı
      // sütun tablonun sağını ekran dışına itiyordu.
      el('td', { class: 'num' }, t.sellDate === null ? ['—'] : [
        t.sellDate,
        ...(t.sellDate > bugun ? [badge('Bekliyor', 'pending')] : []),
      ]),
      el('td', { class: 'actions' }, [editBtn, delBtn]),
    ]);
    delBtn.addEventListener('click', () => {
      void (async () => {
        const acik = t.sellDate === null;
        const ok = await confirmDelete({
          title: 'Fon hareketi silinsin mi?',
          detail: [
            `${t.fundCode}${t.fundTitle === null ? '' : ` — ${t.fundTitle}`}`,
            `${Number(t.units).toLocaleString('tr-TR')} lot · ${t.tradeDate} · ${t.platform}`,
            ...(acik ? [] : [`Satış: ${t.sellDate ?? ''}`]),
          ],
          // Açık pozisyonun silinmesi yalnız bir satırı değil, portföy değerini
          // ve performans grafiğinin geçmişini de değiştirir.
          warning: acik
            ? 'Bu kayıt açık bir pozisyon. Silmek portföy değerini ve performans geçmişini değiştirir. İşlem geri alınamaz.'
            : 'Bu işlem geri alınamaz.',
          hint: acik
            ? 'Fonu sattıysanız silmek yerine bu kayda satış tarihi girebilirsiniz; geçmiş korunur.'
            : undefined,
          confirmLabel: 'Sil',
        });
        if (!ok) return;
        await api(`/api/transactions/${String(t.id)}`, { method: 'DELETE' });
        reload();
      })();
    });
    editBtn.addEventListener('click', () => {
      openTransactionModal(t, reload);
    });
    return tr;
  });

  return [
    el('div', { class: 'metric-grid' }, [
      metric('Açık Pozisyon', String(open.length),
        pasif.length === 0
          ? `${String(rows.length)} İşlem Kaydı`
          : `${String(rows.length)} Kayıt · ${String(pasif.length)} Pasif`, 'portfolio'),
      metric('Fon', String(funds.size), 'Açık Pozisyondaki Farklı Fon', 'fund'),
      metric('Platform', String(platforms.size), 'Banka / Aracı', 'money'),
      metric('Son İşlem', last === undefined ? '—' : gunAd(last),
        sonOlay === undefined ? '—' : sonOlay.tur, 'transactions'),
    ]),
    panel(
      'Fon Hareketleri',
      // Filtreliyken payda da yazılır: "60 kayıt" tek başına listenin tamamı mı
      // yoksa süzülmüş hali mi belli etmiyor. Bölü işareti "şu kadarın içinden"
      // demeyi anlatıyor; "102 içinden" diye eklemek belirsiz kalıyordu.
      (filtreliMi ? `${String(gorunen.length)} / ${String(rows.length)} kayıt` : `${String(rows.length)} kayıt`)
        + ` · ${String(gorunen.filter((t) => t.sellDate === null && t.units !== null).length)} açık`
        + (gorunen.some((t) => t.units === null)
          ? ` · ${String(gorunen.filter((t) => t.units === null).length)} pasif` : ''),
      el('div', { class: 'panel-body' }, [
        // Kendi sınıfı: on sütunla tablo genişliyor, fon adı ve satış hücresi
        // burada daha dar tutulur. Diğer tablolar etkilenmez.
        // Sonuç boşken de tablo çizilir: filtreler başlık satırında duruyor,
        // tabloyu kaldırmak seçimi geri almanın yolunu da kaldırırdı.
        gorunen.length === 0 && !filtreliMi
          ? el('div', { class: 'empty-state' }, ['Henüz işlem kaydı yok.'])
          : el('div', { class: 'tx-table' }, [
              table(
                // "Fiyat" başlığı iki satırın hangisi olduğunu söylemiyordu.
                ['Fon', 'Adet', 'Alış', 'Banka', 'Alış / Son', 'Maliyet / Değer', 'K/Z', 'K/Z %',
                  'Satış', ''],
                gorunen.length === 0
                  ? [el('tr', {}, [el('td', { colspan: '10' }, [
                      el('div', { class: 'empty-state' }, [
                        'Bu filtreye uyan işlem yok. Filtreyi temizleyin.',
                      ]),
                    ])])]
                  : [...body, toplamSatiri],
                // Filtreler süzdükleri sütunun altında; diğer hücreler boş.
                [fonFiltre, null, null, bankaFiltre, null, null, null, null, null, null],
              ),
            ]),
      ]),
      el('div', { class: 'panel-actions' }, sellBtn === null ? [addBtn] : [sellBtn, addBtn]),
    ),
  ];
}

// ─── Portföyüm görünümü ─────────────────────────────────────────────────────

/**
 * Fon başına açık pozisyon. Salt okunur: bu türetilmiş bir görünüm, düzenlenecek
 * satırı yok. Düzenleme "Fon Hareketleri"nde, işlem başına.
 */
async function portfolioView(me: Me): Promise<Node[]> {
  // Başlık rakamları Panel'le aynı uçtan. Burada yeniden hesaplanmıyor: aynı
  // kullanıcı iki ekranda iki farklı "kâr" görüyordu ve hangisinin doğru
  // olduğu sorulacaktı.
  const [rows, bekleyen, h] = await Promise.all([
    api('/api/portfolio') as Promise<PortfolioRow[]>,
    api('/api/portfolio/pending') as Promise<BekleyenAlim>,
    api('/api/portfolio/headline') as Promise<PortfolioHeadline>,
  ]);
  const sum = (f: (r: PortfolioRow) => number): number => rows.reduce((a, r) => a + f(r), 0);
  const cost = sum((r) => Number(r.cost));
  const value = sum((r) => Number(r.value));
  const gain = value - cost;
  const winners = rows.filter((r) => Number(r.returnPct) > 0).length;

  const num = (v: string | null, digits = 2): string =>
    v === null ? '—' : Number(v).toLocaleString('tr-TR', {
      minimumFractionDigits: digits, maximumFractionDigits: digits,
    });

  // Fon başına bekleyen alımlar: hem mevcut satırı işaretlemek hem de hiç
  // satırı olmayan fonlara satır açmak için gerekiyor.
  const fonaGore = (liste: BekleyenIslemSatiri[]): Map<string, BekleyenIslemSatiri[]> => {
    const m = new Map<string, BekleyenIslemSatiri[]>();
    for (const b of liste) m.set(b.fundCode, [...(m.get(b.fundCode) ?? []), b]);
    return m;
  };
  const bekleyenFon = fonaGore(bekleyen.rows);
  const bekleyenSatis = fonaGore(bekleyen.sells);
  const gunAy = (d: string): string => `${d.slice(8)}.${d.slice(5, 7)}`;

  // Bekleyen bir işlemde ikisinden biri biliniyor: ya adet ya tutar. Bilinen
  // olduğu gibi yazılır, bilinmeyen son fiyattan tahmin edilir. Eskiden adet
  // null olunca "null × fiyat = 0" çıkıyor ve ekranda "≈ 0" duruyordu.
  const bekleyenAdet = (b: BekleyenIslemSatiri): { deger: string; tahmin: boolean } | null => {
    if (b.units !== null) return { deger: num(b.units, 0), tahmin: false };
    if (b.orderAmount === null || b.navPerShare === null) return null;
    return { deger: num(String(Number(b.orderAmount) / Number(b.navPerShare)), 0), tahmin: true };
  };
  const bekleyenTutar = (b: BekleyenIslemSatiri): { deger: string; tahmin: boolean } | null => {
    if (b.orderAmount !== null) return { deger: num(b.orderAmount, 0), tahmin: false };
    if (b.units === null || b.navPerShare === null) return null;
    return { deger: num(String(Number(b.units) * Number(b.navPerShare)), 0), tahmin: true };
  };
  const yaz = (x: { deger: string; tahmin: boolean } | null): string =>
    x === null ? '—' : x.tahmin ? `≈ ${x.deger}` : x.deger;
  // Aynı fonda birden çok bekleyen işlem olabiliyor; biri tahminse toplam da
  // tahmindir.
  const topla = (
    liste: BekleyenIslemSatiri[],
    f: (b: BekleyenIslemSatiri) => { deger: string; tahmin: boolean } | null,
  ): { deger: string; tahmin: boolean } | null => {
    const parcalar = liste.map(f);
    if (parcalar.some((x) => x === null)) return null;
    const toplam = parcalar.reduce(
      (a, x) => a + Number((x?.deger ?? '0').replace(/\./g, '').replace(',', '.')), 0);
    return { deger: num(String(toplam), 0), tahmin: parcalar.some((x) => x?.tahmin === true) };
  };

  // Tahmin son bilinen fiyattan. "Tahmini" sözü ve fiyatın günü aynı cümlede
  // duruyor: rakamın nereden geldiği görünmezse ölçülmüş bir tutar gibi
  // okunur, oysa gerçek fiyat işlem gününde açıklanacak.
  const tahminNotu = (liste: BekleyenIslemSatiri[], tur: 'alim' | 'satis'): string => {
    const fiyatli = liste.filter((b) => b.navPerShare !== null);
    if (fiyatli.length === 0) return 'Bu fonun henüz fiyat verisi yok, tahmin üretilemiyor.';
    const g = fiyatli[0]?.navDate ?? '';
    const f = num(fiyatli[0]?.navPerShare ?? '0', 6);
    return `Tahmin ${gunAy(g)} birim fiyatıyla (${f} ₺) hesaplandı. `
      + (tur === 'alim'
        ? 'Gerçek maliyet işlem günü fiyatı açıklanınca belli olacak.'
        : 'Gerçek tutar satış günü fiyatı açıklanınca belli olacak.');
  };

  // İşaret hem imleçle hem tıklamayla açılıyor: tooltip dokunmatikte yok ve
  // bu bilgi ekranda başka hiçbir yerde durmuyor.
  //
  // Alım "+", satış "−". İkisi ayrı işaret çünkü anlamları farklı: bekleyen
  // alımın fiyatı yok, satırı bile olmayabilir; bekleyen satışın pozisyonu
  // hâlâ açık ve rakamları gerçek — yalnız çıkışı ileri tarihli.
  const bekleyenIsaret = (liste: BekleyenIslemSatiri[], tur: 'alim' | 'satis'): HTMLElement => {
    const ad = tur === 'alim' ? 'alım' : 'satış';
    const metin = liste.map((b) =>
      `${gunAy(b.date)} · ${num(b.units, 0)} adet · ${b.platform}`).join('\n');
    const btn = el('button', {
      type: 'button', class: `pending-mark pending-${tur}`,
      title: `${String(liste.length)} ${ad} bekliyor\n${metin}`,
    }, [tur === 'alim' ? '+' : '−']);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal(
        `Bekleyen ${ad}`,
        `${liste[0]?.fundCode ?? ''} · ${tur === 'alim'
          ? 'fiyatı henüz açıklanmadı'
          : 'pozisyon satış tarihine kadar açık'}`,
        el('div', {}, [
          table(['Tarih', 'Banka', 'Adet', 'Tutar ₺'], liste.map((b) => el('tr', {}, [
            el('td', {}, [b.date]),
            el('td', {}, [b.platform]),
            // ≈ işareti hangi sütunda çıkacağı kayda göre değişiyor: adet
            // girilmişse tutar tahmin, tutar girilmişse adet tahmin.
            el('td', { class: 'num' }, [yaz(bekleyenAdet(b))]),
            el('td', { class: 'num' }, [yaz(bekleyenTutar(b))]),
          ]))),
          el('p', { class: 'pending-note' }, [tahminNotu(liste, tur)]),
        ]),
        [],
      );
    });
    return btn;
  };

  const body: HTMLElement[] = [];
  for (const r of rows) {
    // NAV günü veri gününden eskiyse fiyat getirilerle taşınmıştır. Taşınmış
    // bir fiyat ölçülmüş gibi görünmemeli; hücre bunu söyler.
    const carried = r.navDate !== null && r.asOfDate !== null && r.navDate < r.asOfDate;
    // Fon içeriği satırın altında açılmıyor artık: fon sayfası var ve varlık
    // dağılımı da hisseler de orada. Satır altında açılan kutu hem tabloyu
    // bölüyordu hem de aynı bilginin ikinci yeri oluyordu.
    const detay = iconButton('search', 'Fon detayı');
    detay.addEventListener('click', () => { void openFundModal(r.fundCode); });
    const bek = bekleyenFon.get(r.fundCode);
    const bekSat = bekleyenSatis.get(r.fundCode);
    body.push(el('tr', {}, [
      el('td', {}, [
        ...(bek === undefined ? [] : [bekleyenIsaret(bek, 'alim')]),
        ...(bekSat === undefined ? [] : [bekleyenIsaret(bekSat, 'satis')]),
        el('span', { class: 'fund-code' }, [r.fundCode]),
        el('span', { class: 'fund-title' }, [r.title ?? '']),
      ]),
      el('td', {}, [signed(r.dailyReturnPct, '')]),
      el('td', {}, [signed(r.return1m, '')]),
      el('td', {}, [signed(r.return3m, '')]),
      el('td', { class: 'num' }, [`${String(r.days)}g`]),
      el('td', { class: 'num' }, [num(r.units, 0)]),
      el('td', { class: 'num' }, [num(r.cost, 0)]),
      el('td', { class: 'num' }, [
        num(r.value, 0),
        ...(carried
          ? [el('span', {
              class: 'carried',
              title: `Fiyat ${r.navDate ?? ''} NAV'ından getirilerle taşındı`,
            }, ['~'])]
          : []),
      ]),
      el('td', {}, [signed(r.gain, ' ₺')]),
      el('td', {}, [signed(r.returnPct, '')]),
      el('td', { class: 'actions' }, [detay]),
    ]));
  }

  // Yalnız bekleyen alımı olan fonun position_return'de satırı yok ve ekranda
  // hiç görünmüyordu. Ölçüldü: CKL ve DFI böyleydi — kullanıcı aldığı fonu
  // ekranda arayıp bulamıyordu. Para hücreleri BOŞ: fiyat açıklanmadığı için
  // maliyet de değer de hesaplanamıyor, sıfır yazmak yanlış rakam yazmaktır.
  const yalnizBekleyen = [...bekleyenFon.entries()]
    .filter(([kod]) => !rows.some((r) => r.fundCode === kod))
    .sort((a, b) => a[0].localeCompare(b[0], 'tr'));
  for (const [kod, liste] of yalnizBekleyen) {
    const detay = iconButton('search', 'Fon detayı');
    detay.addEventListener('click', () => { void openFundModal(kod); });
    body.push(el('tr', { class: 'pending-row' }, [
      el('td', {}, [
        bekleyenIsaret(liste, 'alim'),
        el('span', { class: 'fund-code' }, [kod]),
        el('span', { class: 'fund-title' }, [liste[0]?.title ?? '']),
      ]),
      el('td', {}, []), el('td', {}, []), el('td', {}, []), el('td', {}, []),
      // Adet ve maliyet: hangisi biliniyorsa o yazılıyor, diğeri son
      // fiyattan tahmin ediliyor. İkisi de boş bırakılınca satır "ne aldım"
      // sorusuna hiç cevap vermiyordu.
      el('td', { class: 'num' }, [yaz(topla(liste, bekleyenAdet))]),
      el('td', { class: 'num' }, [yaz(topla(liste, bekleyenTutar))]),
      el('td', {}, []), el('td', {}, []), el('td', {}, []),
      el('td', { class: 'actions' }, [detay]),
    ]));
  }

  const foot = el('tr', { class: 'total-row' }, [
    el('td', {}, [`TOPLAM (${String(rows.length)})`]),
    el('td', {}, []), el('td', {}, []), el('td', {}, []),
    // Süre: maliyet ağırlıklı, sunucudan. Satırlar fonun en eski lotunu
    // gösteriyor; toplam satırı lot lot ağırlıklandırılmış hâli.
    el('td', { class: 'num' }, [h.weightedDays === null ? '' : `${String(h.weightedDays)}g`]),
    el('td', {}, []),
    el('td', { class: 'num' }, [num(String(cost), 0)]),
    el('td', { class: 'num' }, [num(String(value), 0)]),
    el('td', {}, [signed(String(gain), ' ₺')]),
    el('td', {}, [signed(cost === 0 ? null : String((value / cost - 1) * 100), '')]),
    el('td', {}, []),
  ]);

  const bekleyenToplam = bekleyen.count + bekleyen.sellCount;
  const veriGunu = h.dayDate ?? rows[0]?.asOfDate ?? null;
  const enBuyuk = rows.reduce<PortfolioRow | undefined>(
    (m, r) => (m === undefined || Number(r.value) > Number(m.value) ? r : m), undefined);

  // PDF: tarayıcının yazdırması. Projeye bağımlılık girmiyor ve sunucuda PDF
  // üreten bir şey yok; "PDF olarak kaydet" tarayıcının kendi penceresinde.
  // Yazdırma görünümü @media print ile ayrı: kenar çubuğu, düğmeler ve üst
  // şerit basılmıyor, zemin açık.
  const pdfBtn = el('button', { class: 'btn-ghost', type: 'button' }, [icon('print'), 'PDF']);
  pdfBtn.addEventListener('click', () => { window.print(); });

  return [
    // Yalnız kağıtta: çıktıyı alan kişi ekranı hiç görmemiş olacak, kimin
    // portföyü ve hangi gün olduğu başta yazmalı.
    el('div', { class: 'print-only print-head' }, [
      el('strong', {}, ['TEFAS-Pro · Portföyüm']),
      el('span', {}, [`${me.fullName} · ${veriGunu === null ? '—' : gunAd(veriGunu)}`]),
    ]),
    // Kutu sayısı SABİT on, beş+beş. Bekleyen kutusu sıfırken gizlenince
    // ızgara sekiz ile dokuz arasında biçim değiştiriyor, dokuzda bir yer boş
    // kalıyordu. Sabit sayı: boşluk yok, sıçrama yok, kağıtta da aynı.
    el('div', { class: 'metric-grid metric-grid-10' }, [
      // EN BAŞTA: ekrana gelen ilk soru "bugün ne oldu". Panel'deki kutunun
      // aynısı: etiket, biçim ve gün. Rakam son ölçülebilir
      // güne ait; hafta sonu bakan kullanıcı hangi günü gördüğünü bilmeli.
      metric('Günlük Getiri',
        h.dayGain === null ? '—' : money(h.dayGain),
        h.dayPct === null
          ? 'Ölçülebilir gün yok'
          : `${pct(Number(h.dayPct))}${h.dayDate === null ? '' : ` · ${gunAd(h.dayDate)}`}`,
        'chart'),
      metric('Maliyet', money(String(cost)), `${String(rows.length)} Fon`, 'money'),
      metric('Bugünkü Değer', money(String(value)), rows[0]?.asOfDate ?? '—', 'chart'),
      // "Açık": yanındaki Toplam Kazanç kapananları da içeriyor; ikisi aynı
      // sözcükle yazılsaydı iki farklı rakam aynı şey sanılırdı.
      metric('Açık Kâr / Zarar', money(String(gain)),
        cost === 0 ? '—' : pct(((value / cost) - 1) * 100)),
      // Üçlü yan yana okunsun: Açık + Gerçekleşen = Toplam. Gerçekleşen
      // önce yalnız Toplam'ın alt satırında "kapanan dahil" diye geçiyordu;
      // kutu olunca kazancın nereden geldiği bakmadan görünüyor.
      metric('Gerçekleşen Kazanç', money(h.realizedGain), 'kapanan pozisyonlardan', 'money'),
      // Yüzdenin paydası net sermaye (maliyet − gerçekleşen): kazanılıp
      // yeniden yatırılan para yeni sermaye değil. Payda yazılmazsa yüzde
      // neye göre olduğu bilinmeden okunuyordu.
      metric('Toplam Kazanç', money(h.totalGain),
        h.totalPct === null ? '—' : `${pct(Number(h.totalPct))} · net sermaye ${money(h.netCapital)}`,
        'money'),
      // Ana sayı ZARARDAKİLER: bakılması gereken onlar. Kârdakiler alt satırda.
      // Önce tersiydi ve göz önce iyi haberi görüyordu.
      metric('Zararda', String(rows.length - winners), `${String(winners)} Kârda`, 'flag'),
      // Portföyün yaşı: maliyet ağırlıklı işlem günü ve en eski alış. Tablo
      // ayağındaki Süre ile aynı alan; "ne kadar zamanda" sorusunu cevaplıyor.
      metric('Ağırlıklı Süre',
        h.weightedDays === null ? '—' : `${String(h.weightedDays)}g`,
        h.firstBuyDate === null ? 'açık lot yok' : `ilk alım ${gunAd(h.firstBuyDate, true)}`,
        'transactions'),
      // En büyük pozisyon: yoğunlaşma tek bakışta. Tabloyu taramadan hangi
      // fonun portföyün yüzde kaçı olduğu görünmüyordu.
      metric('En Büyük Pozisyon', enBuyuk === undefined ? '—' : enBuyuk.fundCode,
        enBuyuk === undefined || value === 0
          ? 'pozisyon yok'
          : `${pct((Number(enBuyuk.value) / value) * 100, 1)} · ${money(enBuyuk.value)}`,
        'portfolio'),
      // Sıfırken de duruyor: kutu sayısı sabit kalsın diye. Tutar YOK: fiyat
      // açıklanmadı.
      metric('Bekleyen İşlem', String(bekleyenToplam),
        bekleyenToplam === 0
          ? 'işlem yok'
          : [`${String(bekleyen.count)} alım`, `${String(bekleyen.sellCount)} satış`]
            .filter((t) => !t.startsWith('0 ')).join(' · '),
        'transactions', 'işlem'),
    ]),
    panel(
      'Portföyüm',
      'Açık Pozisyonlar, Fon Başına',
      el('div', {}, [
        table(
          ['Fon', 'Gün %', '1 Ay %', '3 Ay %', 'Süre', 'Adet', 'Maliyet ₺', 'Değer ₺',
            'K/Z', 'K/Z %', ''],
          [...body, foot],
        ),
        // Tablonun ALTINDA: tabloda olmayan satırları anlatıyor, üstte
        // dursaydı tablodakiler hakkında bir uyarı gibi okunurdu.
        ...bekleyenAlimNotu(bekleyen),
      ]),
      pdfBtn,
    ),
  ];
}

// ─── Takip listesi görünümü ─────────────────────────────────────────────────

/** Kod dışında alan yok: not isteğe bağlı, gerisi collector'dan gelir. */
function watchlistForm(onDone: () => void): { body: HTMLElement; submit: HTMLButtonElement } {
  const fundCode = el('input', { required: 'true', placeholder: 'THF', maxlength: '16' });
  const note = el('input', { placeholder: 'Neden izliyorum (isteğe bağlı)', maxlength: '200' });
  const status = el('span', { class: 'status' });
  const submit = el('button', { type: 'submit', class: 'btn-primary' }, ['Listeye Ekle']) as HTMLButtonElement;
  const form = el('form', { class: 'modal-form-grid', id: 'watch-form' }, [
    field('Fon Kodu', fundCode),
    field('Not', note, 'Neden izlediğini yazabilirsin; isteğe bağlı.'),
    status,
  ]);
  submit.setAttribute('form', 'watch-form');
  tekGonderim(form, submit, status, async () => {
    const r = (await api('/api/watchlist', {
      method: 'POST',
      body: JSON.stringify({ fundCode: fundCode.value, note: note.value }),
    })) as { fundCode: string; hidden?: boolean };
    // Fon portföyde ise kayıt yazıldı ama listede görünmeyecek. Pencereyi
    // kapatıp sessizce dönmek "eklenmedi" gibi okunuyordu; burada durup
    // sebebini söylüyoruz.
    if (r.hidden === true) {
      status.className = 'status status-warn';
      status.textContent = `${r.fundCode} portföyünde açık pozisyonun olduğu için `
        + 'takip listesinde görünmeyecek. Kaydedildi; fonu sattığında listene dönecek.';
      return;
    }
    onDone();
  }, 'Eklenemedi.');
  return { body: form, submit };
}

function openWatchlistModal(reload: () => void): void {
  let close = (): void => {};
  const { body, submit } = watchlistForm(() => { close(); reload(); });
  const cancel = el('button', { class: 'btn-ghost', type: 'button' }, ['Vazgeç']);
  close = openModal('Takip Listesine Ekle', 'İzlemek istediğin fon', body, [cancel, submit]);
  cancel.addEventListener('click', () => { close(); });
}

const STATUS_LABEL: Record<WatchlistRow['status'], string> = {
  sold: 'Çıktım',
  watch: 'İzliyorum',
};

async function watchlistView(reload: () => void): Promise<Node[]> {
  const watchAddBtn = el('button', { class: 'btn-primary' }, [icon('add'), 'Fon Ekle']);
  watchAddBtn.addEventListener('click', () => { openWatchlistModal(reload); });
  const rows = (await api('/api/watchlist')) as WatchlistRow[];
  const sold = rows.filter((r) => r.status === 'sold').length;
  const dates = rows.map((r) => r.navDate).filter((d): d is string => d !== null).sort();
  const gainers = rows.filter((r) => Number(r.dailyReturnPct ?? 0) > 0).length;

  const body = rows.map((r) => {
    const delBtn = iconButton('delete', 'Takip Listesinden Çıkar', 'danger');
    const tr = el('tr', {}, [
      el('td', {}, [
        el('span', { class: 'fund-code' }, [r.fundCode]),
        el('span', { class: 'fund-title' }, [r.title ?? '']),
      ]),
      // Fiyat verisi yoksa fon yeni eklenmiş demektir: toplama arkada sürüyor.
      // Sessizce tire dizisi göstermek "veri yok" ile "henüz gelmedi"yi aynı
      // şeye benzetirdi.
      el('td', {}, [r.navDate === null
        ? badge('Veri Bekleniyor', 'pending')
        : badge(STATUS_LABEL[r.status], r.status)]),
      el('td', { class: 'num' }, [r.navDate ?? '—']),
      el('td', { class: 'num' }, [
        r.navPerShare === null ? '—' : Number(r.navPerShare).toLocaleString('tr-TR', {
          minimumFractionDigits: 2, maximumFractionDigits: 6,
        }),
      ]),
      el('td', {}, [signed(r.dailyReturnPct)]),
      el('td', { class: 'num' }, [money(r.netFlow)]),
      el('td', { class: 'num' }, [r.taxPct === null ? '—' : pct(Number(r.taxPct), 1)]),
      el('td', { class: 'num' }, [r.sellValorDays === null ? '—' : `T+${String(r.sellValorDays)}`]),
      el('td', { class: 'actions' }, [delBtn]),
    ]);
    delBtn.addEventListener('click', () => {
      void (async () => {
        const ok = await confirmDelete({
          title: 'Takip listesinden çıkarılsın mı?',
          detail: [`${r.fundCode}${r.title === null ? '' : ` — ${r.title}`}`],
          // İşlem kaydı silmekten hafif: fon verisi ve geçmiş pozisyonlar durur.
          warning: 'Fon takip listenizden çıkar. İşlem geçmişiniz ve pozisyonlarınız etkilenmez.',
          confirmLabel: 'Çıkar',
        });
        if (!ok) return;
        await api(`/api/watchlist/${r.fundCode}`, { method: 'DELETE' });
        reload();
      })();
    });
    return tr;
  });

  return [
    el('div', { class: 'metric-grid' }, [
      metric(
        'Takip Listem',
        String(rows.length),
        `${String(rows.length - sold)} İzliyorum · ${String(sold)} Çıktım`,
        'watchlist',
        'fon',
      ),
      metric('Çıktığım', String(sold), 'Alıp Sattığım Fon', 'flag'),
      metric('Günü Artıda', String(gainers), `${String(rows.length - gainers)} Eksi veya Yatay`, 'chart'),
      metric('Son Veri', dates.at(-1) ?? '—', 'NAV Tarihi', 'fund'),
    ]),
    panel(
      'Takip Listem',
      `${String(rows.length)} fon · portföyüme aldığım fon burada görünmez`,
      el('div', { class: 'panel-body' }, [
        table(
          ['Fon', 'Durum', 'NAV Tarihi', 'NAV', 'Günlük', 'Net Akış', 'Stopaj', 'Satış Valörü', ''],
          body,
        ),
      ]),
      watchAddBtn,
    ),
  ];
}

// ─── Kullanıcılar görünümü ──────────────────────────────────────────────────

/**
 * Kullanıcı formu. Ekleme ve düzenleme aynı formu kullanır; düzenlemede
 * kullanıcı adı değişmez ve parola boş bırakılırsa dokunulmaz.
 *
 * Aktiflik burada, formun içinde: listede ayrı bir kutucuk olarak durduğunda
 * hem "Durum" sütunu hem kutucuk aynı şeyi iki kez gösteriyordu ve tek tıkla
 * yanlışlıkla değiştirilebiliyordu.
 */
function userForm(existing: UserRow | null, onDone: () => void): {
  body: HTMLElement;
  submit: HTMLButtonElement;
} {
  const uname = el('input', { required: 'true', placeholder: 'kullanici', maxlength: '32' });
  const ufull = el('input', {
    required: 'true', maxlength: String(FULL_NAME_MAX), spellcheck: 'false',
  }) as HTMLInputElement;
  const uemail = el('input', {
    type: 'email', required: 'true', maxlength: String(EMAIL_MAX), spellcheck: 'false',
  }) as HTMLInputElement;
  const utelegram = el('input', {
    maxlength: '33', spellcheck: 'false', placeholder: '@kullaniciadi',
  }) as HTMLInputElement;
  const upass = el('input', {
    type: 'password',
    placeholder: existing === null ? 'En az 8 karakter' : 'Değiştirmek için doldurun',
    ...(existing === null ? { required: 'true' } : {}),
  });
  const utype = el('select', {}, [
    el('option', { value: 'user' }, ['Kullanıcı']),
    el('option', { value: 'admin' }, ['Yönetici']),
  ]);
  const uactive = el('input', { type: 'checkbox' });
  uactive.checked = existing?.isActive ?? true;
  // Superuser'ın tipi ve durumu bu formdan değişmez. Sebep: form iki alanı da
  // her kayıtta gönderiyor ve 'super' listede olmadığı için 'user'a düşerdi —
  // tek superuser hesabı, ad soyad düzeltilirken kaybolurdu. Alanlar
  // gizlenmiyor, kilitleniyor: neden değiştirilemediği görünsün.
  const superKayit = existing !== null && existing.type === 'super';
  if (superKayit) {
    utype.disabled = true;
    uactive.disabled = true;
  }
  if (existing !== null) {
    uname.value = existing.username;
    uname.disabled = true;
    if (superKayit) {
      utype.replaceChildren(el('option', { value: 'super' }, [rolAdi('super')]));
    }
    utype.value = existing.type;
    ufull.value = existing.fullName;
    uemail.value = existing.email ?? '';
    utelegram.value = existing.telegram === null ? '' : `@${existing.telegram}`;
  }

  const status = el('span', { class: 'status' });
  const submit = el('button', { type: 'submit', class: 'btn-primary' }, [
    existing === null ? 'Kullanıcı Ekle' : 'Güncelle',
  ]) as HTMLButtonElement;
  const form = el('form', { class: 'modal-form-grid', id: 'user-form' }, [
    field('Kullanıcı Adı', uname),
    field('Ad Soyad', ufull),
    field('E-posta', uemail),
    field('Telegram', utelegram, 'İsteğe bağlı.'),
    field('Parola', upass, existing === null
      ? 'En az 8 karakter.'
      : 'Boş bırakılırsa parola değişmez.'),
    field('Tip', utype, superKayit
      ? 'Superuser tipi ve durumu bu ekrandan değiştirilemez.'
      : 'Yönetici kullanıcı yönetebilir.'),
    el('label', { class: 'switch-field' }, [
      uactive,
      el('span', { class: 'switch-track' }, []),
      el('div', { class: 'switch-text' }, [
        el('strong', {}, ['Hesap Aktif']),
        el('small', {}, ['Pasif hesap giriş yapamaz.']),
      ]),
    ]),
    status,
  ]);
  submit.setAttribute('form', 'user-form');

  tekGonderim(form, submit, status, async () => {
    if (existing === null) {
      await api('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          username: uname.value, password: upass.value, type: utype.value,
          fullName: ufull.value, email: uemail.value, telegram: utelegram.value,
        }),
      });
    } else {
      const patch: Record<string, unknown> = {
        fullName: ufull.value, email: uemail.value, telegram: utelegram.value,
      };
      // Superuser'da bu iki alan hiç gönderilmiyor; sunucu da reddediyor ama
      // asıl mesele isteğin oraya gitmemesi: kullanıcı kaydete basıp hata
      // almasın, alan zaten kilitli.
      if (!superKayit) {
        patch['type'] = utype.value;
        patch['isActive'] = uactive.checked;
      }
      // Boş parola "değiştirme" demektir; sunucuya boş dize göndermeyiz.
      if (upass.value !== '') patch['password'] = upass.value;
      await api(`/api/admin/users/${String(existing.id)}`, {
        method: 'PATCH', body: JSON.stringify(patch),
      });
    }
    onDone();
  }, 'Kaydedilemedi.');
  return { body: form, submit };
}

function openUserModal(existing: UserRow | null, reload: () => void): void {
  let close = (): void => {};
  const { body, submit } = userForm(existing, () => { close(); reload(); });
  const cancel = el('button', { class: 'btn-ghost', type: 'button' }, ['Vazgeç']);
  close = openModal(
    existing === null ? 'Kullanıcı Ekle' : 'Kullanıcıyı Düzenle',
    existing === null ? 'Yeni hesap' : `${existing.username} · #${String(existing.id)}`,
    body,
    [cancel, submit],
  );
  cancel.addEventListener('click', () => { close(); });
}

async function usersView(reload: () => void, me: Me): Promise<Node[]> {
  const rows = (await api('/api/admin/users')) as UserRow[];
  const admins = rows.filter((u) => u.type === 'admin' || u.type === 'super').length;
  const active = rows.filter((u) => u.isActive).length;

  const addBtn = el('button', { class: 'btn-primary' }, [icon('add'), 'Kullanıcı Ekle']);
  addBtn.addEventListener('click', () => { openUserModal(null, reload); });

  // Geçiş yalnız superuser'da ve yalnız superuser olmayan aktif hesaplara.
  // Kendi satırında da yok: oraya zaten dönülüyor.
  const gecisVar = me.type === 'super' && (me.actor ?? null) === null;
  const durum = el('p', { class: 'error', hidden: 'hidden' }, []);

  const body = rows.map((u) => {
    const editBtn = iconButton('edit', 'Düzenle');
    editBtn.addEventListener('click', () => { openUserModal(u, reload); });
    const actions: HTMLElement[] = [];
    if (gecisVar && u.type !== 'super' && u.isActive) {
      const gec = iconButton('impersonate', `${u.fullName} olarak görüntüle`);
      gec.addEventListener('click', () => {
        void (async () => {
          gec.disabled = true;
          try {
            await api('/api/impersonate', {
              method: 'POST', body: JSON.stringify({ userId: u.id }),
            });
            location.reload();
          } catch (err) {
            gec.disabled = false;
            durum.textContent = err instanceof Error ? err.message : 'Geçiş yapılamadı.';
            durum.hidden = false;
          }
        })();
      });
      actions.push(gec);
    }
    actions.push(editBtn);
    return el('tr', {}, [
      el('td', {}, [
        el('span', { class: 'fund-code' }, [u.username]),
        el('span', { class: 'fund-title' }, [u.fullName]),
      ]),
      // E-posta alanın eklenmesinden önceki kayıtlarda boş olabilir; boş
      // bırakmak yerine işaretleniyor ki tamamlanması gerektiği görünsün.
      el('td', {}, u.email === null
        ? [badge('E-posta yok', 'pending')]
        : [u.email]),
      el('td', {}, [u.telegram === null ? '—' : `@${u.telegram}`]),
      el('td', {}, [badge(rolAdi(u.type), u.type)]),
      el('td', {}, [u.isActive ? badge('Aktif', 'open') : badge('Pasif', 'passive')]),
      el('td', { class: 'actions' }, actions),
    ]);
  });

  return [
    el('div', { class: 'metric-grid' }, [
      metric('Kullanıcı', String(rows.length), 'Toplam Hesap', 'users'),
      metric('Yönetici', String(admins), 'Yönetici Yetkisi', 'flag'),
      metric('Aktif', String(active), `${String(rows.length - active)} Pasif`, 'chart'),
      metric('Standart', String(rows.length - admins), 'Kullanıcı Tipi', 'portfolio'),
    ]),
    panel(
      'Kullanıcılar',
      `${String(rows.length)} kayıt · ${String(active)} aktif`,
      el('div', { class: 'panel-body' }, [
        durum,
        table(['Kullanıcı', 'E-posta', 'Telegram', 'Tip', 'Durum', ''], body),
      ]),
      addBtn,
    ),
  ];
}


// ─── İskelet ────────────────────────────────────────────────────────────────

const VIEWS: {
  id: ViewId; label: string; adminOnly: boolean; crumb: string;
  /** Sol menünün ana listesi yerine kullanıcı menüsünde görünür. */
  inUserMenu?: boolean;
}[] = [
  { id: 'dashboard', label: 'Panel', adminOnly: false, crumb: 'Genel' },
  { id: 'portfolio', label: 'Portföyüm', adminOnly: false, crumb: 'Genel' },
  { id: 'transactions', label: 'Fon Hareketleri', adminOnly: false, crumb: 'Genel' },
  { id: 'allocation', label: 'Dağılım', adminOnly: false, crumb: 'Genel' },
  { id: 'stocks', label: 'Hisseler', adminOnly: false, crumb: 'Genel' },
  { id: 'chat', label: 'Asistan', adminOnly: false, crumb: 'Genel' },
  { id: 'closed', label: 'Kapananlar', adminOnly: false, crumb: 'Genel' },
  { id: 'cash', label: 'Nakit', adminOnly: false, crumb: 'Genel' },
  { id: 'periods', label: 'Dönemsel Getiri', adminOnly: false, crumb: 'Genel' },
  { id: 'market', label: 'Piyasa', adminOnly: false, crumb: 'Genel' },
  { id: 'watchlist', label: 'Takip Listem', adminOnly: false, crumb: 'Genel' },
  { id: 'prefs', label: 'Tercihlerim', adminOnly: false, crumb: 'Genel' },
  // Aşağıdakiler sol menünün ana listesinde ÇIKMAZ; en alttaki kullanıcı
  // satırından yukarı açılan menüde duruyorlar. Kayıtları burada kalıyor
  // çünkü ekran yönlendirmesi, breadcrumb ve ikon hep bu tablodan okunuyor.
  { id: 'profile', label: 'Profil', adminOnly: false, crumb: 'Hesabım', inUserMenu: true },
  { id: 'users', label: 'Kullanıcılar', adminOnly: true, crumb: 'Admin', inUserMenu: true },
  // Bankalar ve Sistem Fonları Ayarlar'dan çıkarıldı: ikisi de liste yönetimi
  // (ekle/çıkar), oysa Ayarlar tek değerli ayarların yeri — benchmark, tatil
  // takvimi. Üç ayrı işi tek ekranda toplamak sayfayı uzatıyordu.
  { id: 'banks', label: 'Bankalar', adminOnly: true, crumb: 'Admin', inUserMenu: true },
  { id: 'sysfunds', label: 'Sistem Fonları', adminOnly: true, crumb: 'Admin', inUserMenu: true },
  { id: 'runs', label: 'Collector Log', adminOnly: true, crumb: 'Admin', inUserMenu: true },
  { id: 'settings', label: 'Ayarlar', adminOnly: true, crumb: 'Admin', inUserMenu: true },
];

/**
 * Sürüm rozeti. Değer sunucudan gelir; istemci commit ve derleme zamanını
 * bilemez, kendi başına uydurmamalı. Alınamazsa rozet sessizce boş kalır —
 * sürüm gösterilememesi ekranı bozmamalı.
 */
/**
 * Sayfanın doğduğu sürüm.
 *
 * Uygulama tek sayfa: ekranlar arasında gezerken app.js bir daha çekilmiyor.
 * Deploy'dan önce açılmış bir sekme yeni kodu hiç görmüyor; üstelik rozet
 * her ekranda /api/runtime'ı taze çekip SUNUCUNUN sürümünü yazdığı için eski
 * kodu çalıştıran sekme yeni sürüm numarası gösteriyordu. Ölçüldü: RQ-0062
 * main'e girdi, sekmede PDF düğmesi yoktu, rozet "v0.62" diyordu.
 *
 * İlk okuma saklanır; rozet onu gösterir. Sonraki okumalar yalnız
 * karşılaştırma içindir.
 */
let yukluSurum: string | null = null;

async function sunucuSurumu(): Promise<string | null> {
  try {
    const rt = (await api('/api/runtime')) as { version?: string };
    return rt.version ?? null;
  } catch {
    return null;
  }
}

/**
 * Sunucu sürümü sayfanınkinden ayrıştıysa şeridi açar. Her ekran kurulumunda
 * ve sekme yeniden görünür olduğunda çağrılır.
 *
 * Kendiliğinden yenileme YOK: yarım doldurulmuş bir işlem formunu silmek,
 * eski sürümde kalmaktan kötü. Düğme kullanıcının.
 */
async function surumKontrol(): Promise<void> {
  const simdiki = await sunucuSurumu();
  if (simdiki === null) return;
  if (yukluSurum === null) { yukluSurum = simdiki; return; }
  if (simdiki === yukluSurum) return;
  const serit = document.getElementById('surum-uyari');
  if (serit === null || !serit.hidden) return;
  const yenile = el('button', { class: 'surum-yenile', type: 'button' }, ['Yenile']);
  yenile.addEventListener('click', () => { location.reload(); });
  serit.replaceChildren(
    el('span', {}, [`Yeni sürüm var (${simdiki}), bu sekme ${yukluSurum} çalıştırıyor.`]),
    yenile,
  );
  serit.hidden = false;
}

// Arka plandaki sekme deploy'u kaçırır; öne gelince bir kez daha bakılır.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void surumKontrol();
});

function versionBadge(): HTMLElement {
  const value = el('strong', { class: 'version-value' }, ['—']);
  const box = el('div', { class: 'version-badge' }, [
    el('span', { class: 'version-label' }, ['TEFAS-Pro']),
    value,
  ]);
  void (async () => {
    await surumKontrol();
    // Rozet YÜKLÜ sürümü yazar, sunucunun o anki sürümünü değil; yoksa eski
    // kodu çalıştıran sekme güncel görünür. Sürüm gelmezse boş kutu kalmasın.
    value.textContent = yukluSurum ?? '—';
  })();
  return box;
}

async function appShell(me: Me, view: ViewId): Promise<void> {
  const reload = (): void => {
    void appShell(me, view);
  };
  // Hisseler ekranının arama ve gruplama düğmeleri kendini yeniden çizdiriyor;
  // ekran her kurulduğunda güncel kabuğa bağlanır.
  stocksReload = reload;
  gotoView = (v: ViewId): void => { void appShell(me, v); };
  const yonetici = me.type === 'admin' || me.type === 'super';
  const izinli = VIEWS.filter((v) => !v.adminOnly || yonetici);
  // Ana listede yalnız gündelik ekranlar. Admin bağlantıları ve Profil
  // aşağıdaki kullanıcı menüsünde: haftada bir girilen ekranlar her sayfada
  // yer kaplamamalı.
  const visible = izinli.filter((v) => v.inUserMenu !== true);
  const menuOgeleri = izinli.filter((v) => v.inUserMenu === true);
  const current = izinli.find((v) => v.id === view) ?? visible[0]!;

  const navButton = (v: (typeof VIEWS)[number]): HTMLElement => {
    const b = el('button', v.id === current.id ? { class: 'active' } : {}, [
      icon(v.id),
      v.label,
    ]);
    b.addEventListener('click', () => void appShell(me, v.id));
    return b;
  };

  // Menü gruplara ayrılır. Düz listede kullanıcı ekranı ile yönetim ekranı yan
  // yana duruyordu ve hangisinin admin'e ait olduğu yalnız içeri girince,
  // breadcrumb'dan anlaşılıyordu.
  const groups: { label: string; items: typeof visible }[] = [];
  for (const v of visible) {
    const last = groups[groups.length - 1];
    if (last !== undefined && last.label === v.crumb) last.items.push(v);
    else groups.push({ label: v.crumb, items: [v] });
  }

  const nav = el('nav', {}, groups.flatMap((g) => [
    el('div', { class: 'nav-group' }, [g.label]),
    ...g.items.map(navButton),
  ]));

  const logout = el('button', { class: 'sidebar-logout', type: 'button' }, [icon('logout'), 'Çıkış Yap']);
  logout.addEventListener('click', () => {
    void (async () => {
      await api('/api/logout', { method: 'POST' });
      loginScreen();
    })();
  });

  // Kullanıcı menüsü: alttaki satıra basınca yukarı doğru açılır.
  //
  // <details> değil elle yazılmış bir açılır menü, çünkü menünün dışarı
  // tıklamayla ve Esc ile kapanması gerekiyor — <details> ikisini de
  // kendiliğinden yapmıyor ve açık kalan bir menü ekranın üstünü kapatırdı.
  const menu = el('div', { class: 'user-menu', role: 'menu' }, [
    ...menuOgeleri.map((v) => {
      const b = el('button', {
        class: `user-menu-item${v.id === current.id ? ' active' : ''}`,
        type: 'button', role: 'menuitem',
      }, [icon(v.id), v.label]);
      b.addEventListener('click', () => void appShell(me, v.id));
      return b;
    }),
    el('div', { class: 'user-menu-sep' }, []),
    logout,
  ]);

  const gorunenAd = me.fullName ?? me.username;
  // Baş harfler kelimelerin baş harflerinden: "Batur Orkun" → BO. İlk iki
  // karakteri almak "BA" verirdi ve ad soyad yazan biri onu bekliyor değil.
  // Tek kelimede (kullanıcı adı) ilk iki karakter kalıyor.
  const kelimeler = gorunenAd.trim().split(/\s+/).filter((x) => x !== '');
  const basHarfler = (kelimeler.length > 1
    ? kelimeler.slice(0, 2).map((k) => k[0] ?? '').join('')
    : gorunenAd.slice(0, 2)).toLocaleUpperCase('tr');

  const userButton = el('button', {
    class: 'sidebar-user', type: 'button',
    'aria-haspopup': 'menu', 'aria-expanded': 'false',
  }, [
    el('div', { class: 'avatar' }, [basHarfler]),
    el('div', { class: 'sidebar-user-text' }, [
      el('div', { class: 'sidebar-user-name' }, [gorunenAd]),
      el('div', { class: 'sidebar-user-role' }, [rolAdi(me.type)]),
    ]),
    icon('caretUp', 16),
  ]) as HTMLButtonElement;

  const foot = el('div', { class: 'sidebar-foot' }, [menu, userButton]);

  const menuKapat = (): void => {
    foot.classList.remove('acik');
    userButton.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', menuKlavye);
    document.removeEventListener('pointerdown', menuDisari);
  };
  function menuKlavye(e: KeyboardEvent): void {
    if (e.key === 'Escape') menuKapat();
  }
  function menuDisari(e: Event): void {
    // Menünün kendi içine yapılan tıklama kapatmamalı; öğeler zaten ekran
    // değiştirip kabuğu yeniden kuruyor.
    if (!foot.contains(e.target as Node)) menuKapat();
  }
  userButton.addEventListener('click', () => {
    const acildi = !foot.classList.contains('acik');
    if (acildi) {
      foot.classList.add('acik');
      userButton.setAttribute('aria-expanded', 'true');
      document.addEventListener('keydown', menuKlavye);
      document.addEventListener('pointerdown', menuDisari);
    } else {
      menuKapat();
    }
  });

  const sidebar = el('aside', { class: 'sidebar' }, [
    brand(),
    nav,
    // Kullanıcı satırı en altta; menü onun ÜSTÜNDE açılıyor, çünkü aşağıda
    // ekran bitiyor.
    foot,
  ]);

  let bodyNodes: Node[];
  try {
    if (current.id === 'dashboard') bodyNodes = await dashboardView(reload);
    else if (current.id === 'portfolio') bodyNodes = await portfolioView(me);
    else if (current.id === 'allocation') bodyNodes = await allocationView();
    else if (current.id === 'stocks') bodyNodes = await stocksView();
    else if (current.id === 'chat') bodyNodes = await chatView(reload);
    else if (current.id === 'closed') bodyNodes = await closedView();
    else if (current.id === 'cash') bodyNodes = await cashView();
    else if (current.id === 'periods') bodyNodes = await periodsView();
    else if (current.id === 'market') bodyNodes = await marketView(reload);
    else if (current.id === 'transactions') bodyNodes = await transactionsView(reload);
    else if (current.id === 'watchlist') bodyNodes = await watchlistView(reload);
    else if (current.id === 'prefs') bodyNodes = await prefsView(reload);
    else if (current.id === 'profile') bodyNodes = await profileView(me, reload);
    else if (current.id === 'banks') bodyNodes = await banksView(reload);
    else if (current.id === 'sysfunds') bodyNodes = await sysFundsView(reload);
    else if (current.id === 'runs') bodyNodes = await runsView();
    else if (current.id === 'settings') bodyNodes = await settingsView(reload);
    else bodyNodes = await usersView(reload, me);
  } catch (err) {
    bodyNodes = [errorBox(err instanceof Error ? err.message : 'Yüklenemedi.')];
  }

  // Geçiş şeridi: superuser hangi hesaba baktığını her ekranda görmeli,
  // yoksa yanlış hesapta işlem girmesi an meselesi. X asıl hesaba döndürüyor.
  // `?? null`: alanı göndermeyen bir yanıt geçiş varmış gibi okunmamalı.
  // Ölçüldü — giriş yanıtı alanı taşımıyordu, şerit kurulurken çöküyor ve
  // ekran boş kalıyordu; sayfa yenilenince açılıyordu.
  const aktorBilgi = me.actor ?? null;
  const gecisSeridi = aktorBilgi === null ? null : (() => {
    const dur = el('button', {
      class: 'impersonate-stop', type: 'button',
      title: `${aktorBilgi.fullName} hesabına dön`, 'aria-label': 'Geçişi bitir',
    }, [icon('close', 14)]) as HTMLButtonElement;
    const metin = el('span', { class: 'impersonate-text' }, [
      el('strong', {}, [gorunenAd]), ' olarak görüntülüyorsunuz',
    ]);
    dur.addEventListener('click', () => {
      void (async () => {
        dur.disabled = true;
        try {
          await api('/api/impersonate', { method: 'DELETE' });
          // Tam yeniden yükleme: her ekran kendi verisini oturumdan okuyor,
          // tek tek tazelemek yerine kabuk baştan kuruluyor.
          location.reload();
        } catch (err) {
          // Hata şeridin kendi içinde: burada bir modal açmak, kullanıcıyı
          // görmediği bir sorun için ekrandan koparmak olurdu.
          dur.disabled = false;
          metin.replaceChildren(
            err instanceof Error ? err.message : 'Geçiş bitirilemedi.',
          );
        }
      })();
    });
    return el('div', { class: 'impersonate-bar' }, [icon('impersonate', 14), metin, dur]);
  })();

  const content = el('main', { class: 'content' }, [
    el('header', { class: 'content-header' }, [
      el('div', {}, [
        el('div', { class: 'breadcrumb' }, [`${current.crumb} / ${current.label}`]),
        el('h1', {}, [current.label]),
      ]),
      // Geçiş şeridi sürüm rozetinin solunda: üst şerit her ekranda sabit
      // duruyor ve sayfa kaydırılsa da görünür kalıyor. Kenar çubuğunun
      // dibinde gözden kaçıyordu — bakılan hesabın hangisi olduğu, en çok
      // bakılan yerde durmalı.
      el('div', { class: 'header-right' }, [
        ...(gecisSeridi === null ? [] : [gecisSeridi]),
        versionBadge(),
      ]),
    ]),
    el('div', { class: 'content-body' }, bodyNodes),
  ]);

  root?.replaceChildren(el('div', { class: 'shell' }, [sidebar, content]));
}

async function start(): Promise<void> {
  try {
    const me = (await api('/api/me')) as Me;
    if (me.mustChangePassword) passwordScreen();
    else await appShell(me, 'dashboard');
  } catch {
    loginScreen();
  }
}

if (root) void start();
