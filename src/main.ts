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
  type: 'admin' | 'user';
  mustChangePassword: boolean;
}

interface Transaction {
  buyOrderDate: string | null;
  sellOrderDate: string | null;
  id: number;
  fundCode: string;
  fundTitle: string | null;
  platform: string;
  tradeDate: string;
  units: string;
  sellDate: string | null;
  note: string | null;
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
  type: 'admin' | 'user';
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
    lastRun: { id: number; status: string; finishedAt: string | null } | null;
  };
  watchlistRanks: Record<string, { top: RankEntry[]; bottom: RankEntry[] }>;
  positions: {
    summary: PositionSummary | null;
    top: RankEntry[];
    bottom: RankEntry[];
  };
  /** Para akışı: `returnPct` oranı (%), `flow` TL tutarını taşır. */
  flowRanks: Record<string, { top: RankEntry[]; bottom: RankEntry[] }>;
  /** Yatırımcı sayısı: `returnPct` oranı (%), `people` kişi değişimini taşır. */
  investorRanks: Record<string, { top: RankEntry[]; bottom: RankEntry[] }>;
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

interface PeriodRow {
  label: string;
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
}

interface PerformanceSeries {
  points: PerformancePoint[];
  totalPct: string | null;
}

type ViewId =
  | 'dashboard' | 'portfolio' | 'closed' | 'periods' | 'market'
  | 'transactions' | 'watchlist' | 'users' | 'settings';

const root = document.getElementById('app');

// ─── Yardımcılar ────────────────────────────────────────────────────────────

async function api(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body: unknown = res.status === 204 ? null : await res.json();
  if (!res.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error: unknown }).error)
        : `HTTP ${String(res.status)}`;
    throw new Error(message);
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

function errorBox(message: string): HTMLElement {
  return el('p', { class: 'error' }, [message]);
}

/** Büyük TL tutarlarını okunur kısaltır: 1.479.274.366 → 1,48 mr ₺ */
function money(raw: string | null): string {
  if (raw === null || raw === '') return '—';
  const n = Number(raw);
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const fmt = (v: number, suffix: string): string =>
    `${v.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ${suffix}`;
  if (abs >= 1e9) return fmt(n / 1e9, 'mr ₺');
  if (abs >= 1e6) return fmt(n / 1e6, 'mn ₺');
  if (abs >= 1e3) return fmt(n / 1e3, 'b ₺');
  return fmt(n, '₺');
}

/** Yatırımcı sayısı değişimi: 105316 → +105.316 kişi */
function people(raw: string | null): string {
  if (raw === null || raw === '') return '—';
  const n = Number(raw);
  if (!Number.isFinite(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toLocaleString('tr-TR')} kişi`;
}

function signed(raw: string | null, suffix = '%'): HTMLElement {
  if (raw === null || raw === '') return el('span', { class: 'num' }, ['—']);
  const n = Number(raw);
  const cls = n > 0 ? 'num pos' : n < 0 ? 'num neg' : 'num';
  const sign = n > 0 ? '+' : '';
  return el('span', { class: cls }, [
    `${sign}${n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}${suffix}`,
  ]);
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
  fund: ['M4 19h16', 'M7 19V9M12 19V5M17 19v-7'],
  money: ['M12 3v18', 'M16 7.5A3.5 3.5 0 0 0 12.5 5h-1a3 3 0 0 0 0 6h1a3 3 0 0 1 0 6h-1A3.5 3.5 0 0 1 8 16.5'],
  chart: ['M4 19h16', 'm5 15 4-5 3 3 6-8'],
  flag: ['M5 21V4h9l-1 3h6v8h-7l-1-3H5'],
  closed: ['M20 6 9 17l-5-5'],
  periods: ['M4 5h16v15H4z', 'M4 10h16', 'M9 5V3M15 5V3', 'M8 14h3M13 14h3'],
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
function openModal(title: string, subtitle: string | null, body: Node, footer: Node[]): () => void {
  const closeBtn = iconButton('close', 'Kapat');
  const card = el('div', { class: 'modal-card modal-form' }, [
    el('div', { class: 'modal-head' }, [
      el('div', {}, [
        el('h3', { class: 'modal-title' }, [title]),
        ...(subtitle === null ? [] : [el('p', { class: 'modal-sub' }, [subtitle])]),
      ]),
      closeBtn,
    ]),
    el('div', { class: 'modal-body' }, [body]),
    el('div', { class: 'modal-actions' }, footer),
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
function field(labelText: string, input: HTMLElement, hint?: string): HTMLElement {
  return el('div', { class: 'field' }, [
    el('label', {}, [labelText]),
    input,
    ...(hint === undefined ? [] : [el('div', { class: 'field-hint' }, [hint])]),
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

function table(headers: string[], rows: HTMLElement[]): HTMLElement {
  if (rows.length === 0) return el('div', { class: 'empty-state' }, ['Kayıt Yok.']);
  return el('div', { class: 'table-wrap' }, [
    el('table', {}, [
      el('thead', {}, [el('tr', {}, headers.map((h) => el('th', {}, [h])))]),
      el('tbody', {}, rows),
    ]),
  ]);
}

// ─── Grafik ─────────────────────────────────────────────────────────────────

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
function performanceChart(points: PerformancePoint[]): SVGSVGElement {
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
  const PAD_B = 46;   // eğik tarih etiketleri
  const H = PAD_T + H_TOP + GAP + H_BOT + PAD_B;
  const plotW = W - PAD_L - PAD_R;

  const root = svg('svg', {
    viewBox: `0 0 ${String(W)} ${String(H)}`,
    class: 'perf-chart',
    role: 'img',
    preserveAspectRatio: 'xMidYMid meet',
  });

  const values = points.map((p) => Number(p.value));
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
  const pMax = Math.max(...pcts.map(Math.abs), 0.01);
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
  });

  // ── Tarih etiketleri: en fazla sekiz, kalabalık olmasın.
  const step = Math.max(1, Math.ceil(points.length / 8));
  points.forEach((p, i) => {
    if (i % step !== 0 && i !== points.length - 1) return;
    const tx = x(i);
    const ty = barTop + H_BOT + 20;
    root.append(
      svg('text', {
        x: String(tx), y: String(ty), class: 'perf-axis-x',
        transform: `rotate(-30 ${String(tx)} ${String(ty)})`,
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
  const body = el('div', { class: 'panel-body perf-body' }, [performanceChart(series.points)]);
  const toolbar = el('div', { class: 'chart-toolbar perf-toolbar' }, [
    el('span', { class: 'perf-total-label' }, ['Dönem Getirisi']),
    signed(series.totalPct),
  ]);
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
  return el('div', { class: 'chart-toolbar' }, [
    el('label', { class: 'toggle', for: 'toggle-watchlist' }, [
      input,
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
function positionSection(
  p: Dashboard['positions'],
  onlyOwned: boolean,
): Node[] {
  const s = p.summary;
  const kapsam = onlyOwned ? 'yalnız portföyüm' : 'takip listem dahil, almış gibi';
  return [
    el('h2', { class: 'section-title' }, ['Pozisyonlarım']),
    ...(s === null
      ? []
      : [
          el('div', { class: 'metric-grid' }, [
            metric('Maliyet', money(s.cost), 'açık pozisyonlar'),
            metric('Bugünkü değer', money(s.value), `${s.gainPct}% getiri`),
            metric('Açık kâr', money(s.gain), `${String(s.winners)} kârda · ${String(s.losers)} zararda`),
            metric('Gerçekleşmiş kâr', money(s.realizedGain), 'kapanmış pozisyonlar'),
          ]),
        ]),
    el('div', { class: 'chart-grid' }, [
      chartPanel('En çok kazandıran pozisyonlarım', kapsam, p.top,
        { emptyText: 'Henüz ölçülebilir pozisyon yok.' }),
      chartPanel('En çok kaybettiren pozisyonlarım', kapsam, p.bottom,
        { emptyText: 'Zararda pozisyonum yok.' }),
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
  const d = (await api(`/api/dashboard${onlyOwned ? '?onlyOwned=1' : ''}`)) as Dashboard;
  const m = d.metrics;
  const run = m.lastRun;

  const kapsam = onlyOwned ? 'yalnız portföyüm' : 'takip edilen fonlar';
  const grid = (nodes: Node[]): HTMLElement => el('div', { class: 'chart-grid' }, nodes);

  return [
    el('div', { class: 'metric-grid' }, [
      // Alt satır listenin kendi durumunu anlatır; toplanan fon sayısı
      // collector'ın kapsamı olduğu için "Son Toplama" kutusuna taşındı.
      metric(
        'Takip Listem',
        String(m.watchlist),
        typeof m.watchlistSold === 'number'
          ? `${String(m.watchlist - m.watchlistSold)} İzliyorum · ${String(m.watchlistSold)} Çıktım`
          : undefined,
        'watchlist',
        'fon',
      ),
      // Büyük sayı fon, altında o fonları oluşturan alım kaydı: ikisi farklı
      // ve "54" tek başına fon sayısı sanılıyordu. Alan gelmezse alt satır
      // "undefined" yazmak yerine sade bir açıklamaya düşer — eski bir sunucu
      // sürümü çalışıyorken arayüz bozuk görünmemeli.
      metric(
        'Açık Pozisyon',
        String(m.openPositions),
        typeof m.openLots === 'number' ? `${String(m.openLots)} Alım Kaydı` : undefined,
        'portfolio',
        'fon',
      ),
      metric('Son Veri', m.dataDate ?? '—', 'Getiri Günü', 'fund'),
      metric(
        'Son Toplama',
        run?.finishedAt?.slice(11) ?? '—',
        run ? `${String(m.trackedFunds)} Fon · #${String(run.id)}` : 'Henüz Koşmadı',
        'transactions',
      ),
    ]),
    watchlistToggle(!onlyOwned, (dahil) => {
      writeOnlyOwned(!dahil);
      reload();
    }),
    ...positionSection(d.positions, onlyOwned),
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
async function marketView(reload: () => void): Promise<Node[]> {
  const onlyOwned = readOnlyOwned();
  const d = (await api(`/api/dashboard${onlyOwned ? '?onlyOwned=1' : ''}`)) as Dashboard;
  const kapsam = onlyOwned ? 'yalnız portföyüm' : 'takip edilen fonlar';
  const grid = (nodes: Node[]): HTMLElement => el('div', { class: 'chart-grid' }, nodes);

  return [
    watchlistToggle(!onlyOwned, (dahil) => {
      writeOnlyOwned(!dahil);
      reload();
    }),
    el('h2', { class: 'section-title' }, ['Getiri']),
    grid([
      chartPanel('En çok kazandıran (1 hafta)', kapsam, d.watchlistRanks['1w']?.top ?? []),
      chartPanel('En çok kazandıran (1 ay)', kapsam, d.watchlistRanks['1m']?.top ?? []),
      chartPanel('En çok kaybettiren (1 hafta)', kapsam,
        d.watchlistRanks['1w']?.bottom ?? [],
        { emptyText: 'Haftayı ekside kapatan fon yok.' }),
      chartPanel('En çok kaybettiren (1 ay)', kapsam,
        d.watchlistRanks['1m']?.bottom ?? [],
        { emptyText: 'Ayı ekside kapatan fon yok.' }),
    ]),
    el('h2', { class: 'section-title' }, ['Para Akışı']),
    grid([
      flowPanel('En çok giriş olan (1 hafta)', kapsam, d.flowRanks['1w']?.top ?? [], 'giriş'),
      flowPanel('En çok giriş olan (1 ay)', kapsam, d.flowRanks['1m']?.top ?? [], 'giriş'),
      flowPanel('En çok çıkış olan (1 hafta)', kapsam, d.flowRanks['1w']?.bottom ?? [], 'çıkış'),
      flowPanel('En çok çıkış olan (1 ay)', kapsam, d.flowRanks['1m']?.bottom ?? [], 'çıkış'),
    ]),
    el('h2', { class: 'section-title' }, ['Yatırımcı Sayısı']),
    grid([
      investorPanel('En çok artan (1 hafta)', kapsam, d.investorRanks['1w']?.top ?? [], 'artış'),
      investorPanel('En çok artan (1 ay)', kapsam, d.investorRanks['1m']?.top ?? [], 'artış'),
      investorPanel('En çok azalan (1 hafta)', kapsam, d.investorRanks['1w']?.bottom ?? [], 'azalış'),
      investorPanel('En çok azalan (1 ay)', kapsam, d.investorRanks['1m']?.bottom ?? [], 'azalış'),
    ]),
  ];
}

/**
 * Sistem ayarları. Şimdilik tek ayar var: resmî tatiller.
 *
 * Liste, emir tarihinden gerçekleşme tarihini hesaplarken kullanılır. Geçmiş
 * günler fiyat verisinden anlaşılabilir ama emir verilirken ileriki günlerin
 * verisi henüz yok; bu yüzden elle tutuluyor.
 */
async function settingsView(reload: () => void): Promise<Node[]> {
  const data = (await api('/api/admin/settings')) as { holidays: string[] };
  const area = el('textarea', { rows: '14', spellcheck: 'false' }) as HTMLTextAreaElement;
  area.value = data.holidays.join('\n');
  const status = el('span', { class: 'status' });
  const save = el('button', { class: 'btn-primary' }, [icon('add'), 'Kaydet']);

  save.addEventListener('click', () => {
    void (async () => {
      const list = area.value.split('\n').map((x) => x.trim()).filter((x) => x !== '');
      try {
        status.textContent = 'Kaydediliyor…';
        const r = (await api('/api/admin/settings', {
          method: 'PUT', body: JSON.stringify({ holidays: list }),
        })) as { holidays: string[] };
        area.value = r.holidays.join('\n');
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
    ]),
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
 * İşlem formu. Gövdeyi ve kaydet düğmesini ayrı döndürür: pencerede gövde
 * ortada, eylemler altta sabit bir şeritte durur.
 */
function transactionForm(existing: Transaction | null, onDone: () => void): {
  body: HTMLElement;
  submit: HTMLButtonElement;
} {
  const f = {
    fundCode: el('input', { required: 'true', placeholder: 'THF', maxlength: '16' }),
    units: el('input', { type: 'number', step: 'any', min: '0', required: 'true', placeholder: '1000' }),
    buyOrderDate: el('input', { type: 'date' }),
    tradeDate: el('input', { type: 'date', required: 'true' }),
    platform: el('input', { required: 'true', placeholder: 'Nkolay' }),
    sellOrderDate: el('input', { type: 'date' }),
    sellDate: el('input', { type: 'date' }),
  };
  if (existing) {
    f.fundCode.value = existing.fundCode;
    f.units.value = existing.units;
    f.buyOrderDate.value = existing.buyOrderDate ?? '';
    f.tradeDate.value = existing.tradeDate;
    f.platform.value = existing.platform;
    f.sellOrderDate.value = existing.sellOrderDate ?? '';
    f.sellDate.value = existing.sellDate ?? '';
  }

  // Valör hesabı için gereken veri: tatiller ve fonun valör günleri. Fon kodu
  // değiştikçe yenilenir; bilinmeyen fonda valör null kalır ve hesap atlanır,
  // kullanıcı tarihleri elle girer.
  let holidayList: string[] = [];
  let valor: { buy: number; sell: number } | null = null;
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

  /**
   * İki tarih birbirini tamamlar: hangisi doldurulursa diğeri valöre göre
   * hesaplanır. Kullanıcı elle yazdığını ezmemek için yalnız boş olan alan
   * doldurulur.
   */
  const link = (
    order: HTMLInputElement,
    settle: HTMLInputElement,
    days: () => number | null,
  ): void => {
    order.addEventListener('change', () => {
      const d = days();
      if (d === null || order.value === '') return;
      try { settle.value = settlementFromOrder(order.value, d, holidayList); } catch { /* elle girilsin */ }
    });
    settle.addEventListener('change', () => {
      const d = days();
      if (d === null || settle.value === '' || order.value !== '') return;
      try { order.value = orderFromSettlement(settle.value, d, holidayList); } catch { /* elle girilsin */ }
    });
  };
  link(f.buyOrderDate, f.tradeDate, () => valor?.buy ?? null);
  link(f.sellOrderDate, f.sellDate, () => valor?.sell ?? null);
  f.fundCode.addEventListener('change', loadSettlement);
  loadSettlement();

  const status = el('span', { class: 'status' });
  const submit = el('button', { type: 'submit', class: 'btn-primary' }, [
    existing ? 'Güncelle' : 'İşlem Ekle',
  ]) as HTMLButtonElement;
  const form = el('form', { class: 'modal-form-grid', id: 'tx-form' }, [
    field('Fon Kodu', f.fundCode, 'TEFAS kodu, üç harf.'),
    field('Adet', f.units, 'Fon payı adedi, tutar değil.'),
    el('div', { class: 'form-section' }, [el('span', {}, ['Alış']), buyValorNote]),
    field('Emir Tarihi', f.buyOrderDate, 'İsteğe bağlı; girilirse alış tarihi hesaplanır.'),
    field('Alış Tarihi', f.tradeDate, 'Emrin fiyatlandığı gün.'),
    field('Banka', f.platform),
    el('div', { class: 'form-section' }, [el('span', {}, ['Satış']), sellValorNote]),
    field('Satış Emir Tarihi', f.sellOrderDate, 'İsteğe bağlı; girilirse satış tarihi hesaplanır.'),
    field('Satış Tarihi', f.sellDate, 'Boş bırakılırsa pozisyon açık kalır.'),
    status,
  ]);
  submit.setAttribute('form', 'tx-form');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void (async () => {
      const payload = {
        fundCode: f.fundCode.value,
        platform: f.platform.value,
        tradeDate: f.tradeDate.value,
        units: f.units.value,
        buyOrderDate: f.buyOrderDate.value || null,
        sellOrderDate: f.sellOrderDate.value || null,
        sellDate: f.sellDate.value || null,
      };
      try {
        status.textContent = 'Kaydediliyor…';
        await api(
          existing ? `/api/transactions/${String(existing.id)}` : '/api/transactions',
          { method: existing ? 'PUT' : 'POST', body: JSON.stringify(payload) },
        );
        onDone();
      } catch (err) {
        status.textContent = err instanceof Error ? err.message : 'Kaydedilemedi.';
      }
    })();
  });
  return { body: form, submit };
}

/** İşlem formunu pencerede açar; kaydedince pencere kapanır ve liste yenilenir. */
function openTransactionModal(existing: Transaction | null, reload: () => void): void {
  let close = (): void => {};
  const { body, submit } = transactionForm(existing, () => { close(); reload(); });
  const cancel = el('button', { class: 'btn-ghost', type: 'button' }, ['Vazgeç']);
  close = openModal(
    existing === null ? 'İşlem Ekle' : 'İşlemi Düzenle',
    existing === null ? 'Yeni alış kaydı' : `${existing.fundCode} · ${existing.tradeDate}`,
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
async function closedView(): Promise<Node[]> {
  const rows = (await api('/api/closed')) as ClosedPositionRow[];
  const sum = (f: (r: ClosedPositionRow) => number): number => rows.reduce((a, r) => a + f(r), 0);
  const buy = sum((r) => Number(r.buyValue));
  const sell = sum((r) => Number(r.sellValue));
  const gain = sell - buy;
  const winners = rows.filter((r) => Number(r.realizedGain) > 0).length;

  const num = (v: string, digits = 0): string =>
    Number(v).toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

  const body = rows.map((r) => el('tr', {}, [
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
    el('td', {}, [signed(r.realizedPct)]),
  ]));

  const foot = el('tr', { class: 'total-row' }, [
    el('td', {}, [`TOPLAM (${String(rows.length)})`]),
    el('td', {}, []), el('td', {}, []), el('td', {}, []), el('td', {}, []), el('td', {}, []),
    el('td', { class: 'num' }, [num(String(buy))]),
    el('td', { class: 'num' }, [num(String(sell))]),
    el('td', {}, [signed(String(gain), ' ₺')]),
    el('td', {}, [signed(buy === 0 ? null : String((sell / buy - 1) * 100))]),
  ]);

  return [
    el('div', { class: 'metric-grid' }, [
      metric('Gerçekleşen K/Z', money(String(gain)),
        buy === 0 ? '—' : `%${((sell / buy - 1) * 100).toFixed(2)}`, 'money'),
      metric('Kapanan İşlem', String(rows.length), 'Satılmış Kayıt', 'closed', 'işlem'),
      metric('Kazançla Kapanan', String(winners), `${String(rows.length - winners)} Zararla`, 'flag'),
      metric('Toplam Satış', money(String(sell)), 'Elde Edilen Tutar', 'chart'),
    ]),
    panel(
      'Kapanan Pozisyonlar',
      `${String(rows.length)} işlem · en son satılan üstte`,
      el('div', { class: 'panel-body' }, [
        rows.length === 0
          ? el('div', { class: 'empty-state' }, ['Henüz kapanmış pozisyon yok.'])
          : table(
              ['Fon', 'Banka', 'Alış', 'Satış', 'Süre', 'Adet', 'Alış ₺', 'Satış ₺', 'K/Z', 'K/Z %'],
              [...body, foot],
            ),
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
  const months = (await api('/api/periods')) as MonthlyPeriod[];

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
  ];

  const rows: HTMLElement[] = [];
  for (const m of months) {
    rows.push(el('tr', { class: 'period-month' }, cells(m, true)));
    for (const w of m.weeks) rows.push(el('tr', { class: 'period-week' }, cells(w, false)));
  }

  const gains = months.map((m) => Number(m.gain));
  const total = gains.reduce((a, b) => a + b, 0);
  // Toplam getiri aylık getirilerin bileşiği; yüzdeleri toplamak yanlış olurdu.
  const compound = months.reduce((a, m) => (m.pct === null ? a : a * (1 + Number(m.pct) / 100)), 1);
  const winners = gains.filter((g) => g > 0).length;
  const best = months.reduce<MonthlyPeriod | null>(
    (a, m) => (a === null || Number(m.gain) > Number(a.gain) ? m : a), null);
  const worst = months.reduce<MonthlyPeriod | null>(
    (a, m) => (a === null || Number(m.gain) < Number(a.gain) ? m : a), null);
  const latest = months[0];

  return [
    el('div', { class: 'metric-grid' }, [
      metric('Toplam K/Z', money(String(total)),
        months.length === 0 ? '—' : `${String(months.length)} ayın bileşiği · %${((compound - 1) * 100).toFixed(2)}`,
        'money'),
      metric('Son Ay', latest === undefined ? '—' : money(latest.gain),
        latest === undefined ? '—' : `${latest.label}${latest.pct === null ? '' : ` · %${Number(latest.pct).toFixed(2)}`}`,
        'chart'),
      metric('En İyi Ay', best === null ? '—' : money(best.gain), best?.label ?? '—', 'flag'),
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
          : table(['Dönem', 'Aralık', 'Gün', 'K/Z', 'Getiri'], rows),
      ]),
    ),
    el('p', { class: 'panel-note' }, [
      'Getiri sermaye hareketinden arındırılmıştır: para yatırılan veya çekilen gün ' +
      'kazanç sayılmaz. Bir ayın kazancı haftalarının toplamı, getirisi haftalarının ' +
      'bileşiğidir. Ay en fazla dört haftaya bölünür; artan günler son haftaya eklenir.',
    ]),
    el('p', { class: 'panel-note' }, [
      'K/Z ile getiri işaret olarak ayrışabilir. K/Z o günkü portföy büyüklüğüne ' +
      'göre ağırlıklıdır, getiri ise her günün kendi açılışına göre ölçülür; dönem ' +
      'içinde para giriş çıkışı olduğunda ikisi farklı yöne bakabilir.',
    ]),
  ];
}

async function transactionsView(reload: () => void): Promise<Node[]> {
  const rows = (await api('/api/transactions')) as Transaction[];
  const open = rows.filter((t) => t.sellDate === null);
  const funds = new Set(open.map((t) => t.fundCode));
  const platforms = new Set(open.map((t) => t.platform));
  const last = rows.map((t) => t.tradeDate).sort().at(-1);

  const addBtn = el('button', { class: 'btn-primary' }, [icon('add'), 'İşlem Ekle']);
  addBtn.addEventListener('click', () => { openTransactionModal(null, reload); });

  const body = rows.map((t) => {
    const editBtn = iconButton('edit', 'Düzenle');
    const delBtn = iconButton('delete', 'Sil', 'danger');
    const tr = el('tr', {}, [
      el('td', {}, [
        el('span', { class: 'fund-code' }, [t.fundCode]),
        el('span', { class: 'fund-title' }, [t.fundTitle ?? '']),
      ]),
      el('td', { class: 'num' }, [Number(t.units).toLocaleString('tr-TR')]),
      el('td', { class: 'num' }, [t.tradeDate]),
      el('td', {}, [t.platform]),
      el('td', { class: 'num' }, [t.sellDate ?? '—']),
      el('td', {}, [t.sellDate === null ? badge('Açık', 'open') : badge('Kapandı', 'closed')]),
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
      metric('Açık Pozisyon', String(open.length), `${String(rows.length)} İşlem Kaydı`, 'portfolio'),
      metric('Fon', String(funds.size), 'Açık Pozisyondaki Farklı Fon', 'fund'),
      metric('Platform', String(platforms.size), 'Banka / Aracı', 'money'),
      metric('Son İşlem', last ?? '—', 'Alış Tarihi', 'transactions'),
    ]),
    panel(
      'Fon Hareketleri',
      `${String(rows.length)} kayıt · ${String(open.length)} açık`,
      el('div', { class: 'panel-body' }, [
        table(['Fon', 'Adet', 'Alış', 'Banka', 'Satış', 'Durum', ''], body),
      ]),
      addBtn,
    ),
  ];
}

// ─── Portföyüm görünümü ─────────────────────────────────────────────────────

/**
 * Fon başına açık pozisyon. Salt okunur: bu türetilmiş bir görünüm, düzenlenecek
 * satırı yok. Düzenleme "Fon Hareketleri"nde, işlem başına.
 */
async function portfolioView(): Promise<Node[]> {
  const rows = (await api('/api/portfolio')) as PortfolioRow[];
  const sum = (f: (r: PortfolioRow) => number): number => rows.reduce((a, r) => a + f(r), 0);
  const cost = sum((r) => Number(r.cost));
  const value = sum((r) => Number(r.value));
  const gain = value - cost;
  const winners = rows.filter((r) => Number(r.returnPct) > 0).length;

  const num = (v: string | null, digits = 2): string =>
    v === null ? '—' : Number(v).toLocaleString('tr-TR', {
      minimumFractionDigits: digits, maximumFractionDigits: digits,
    });

  const body = rows.map((r) => {
    // NAV günü veri gününden eskiyse fiyat getirilerle taşınmıştır. Taşınmış
    // bir fiyat ölçülmüş gibi görünmemeli; hücre bunu söyler.
    const carried = r.navDate !== null && r.asOfDate !== null && r.navDate < r.asOfDate;
    return el('tr', {}, [
      el('td', {}, [
        el('span', { class: 'fund-code' }, [r.fundCode]),
        el('span', { class: 'fund-title' }, [r.title ?? '']),
      ]),
      el('td', {}, [signed(r.dailyReturnPct)]),
      el('td', {}, [signed(r.return1m)]),
      el('td', {}, [signed(r.return3m)]),
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
      el('td', {}, [signed(r.returnPct)]),
    ]);
  });

  const foot = el('tr', { class: 'total-row' }, [
    el('td', {}, [`TOPLAM (${String(rows.length)})`]),
    el('td', {}, []), el('td', {}, []), el('td', {}, []), el('td', {}, []), el('td', {}, []),
    el('td', { class: 'num' }, [num(String(cost), 0)]),
    el('td', { class: 'num' }, [num(String(value), 0)]),
    el('td', {}, [signed(String(gain), ' ₺')]),
    el('td', {}, [signed(cost === 0 ? null : String((value / cost - 1) * 100))]),
  ]);

  return [
    el('div', { class: 'metric-grid' }, [
      metric('Maliyet', money(String(cost)), `${String(rows.length)} Fon`, 'money'),
      metric('Bugünkü Değer', money(String(value)), rows[0]?.asOfDate ?? '—', 'chart'),
      metric('Kâr / Zarar', money(String(gain)),
        cost === 0 ? '—' : `%${(((value / cost) - 1) * 100).toFixed(2)}`),
      metric('Kârda', String(winners), `${String(rows.length - winners)} Zararda`, 'flag'),
    ]),
    panel(
      'Portföyüm',
      'Açık Pozisyonlar, Fon Başına',
      table(
        ['Fon', 'Gün %', '1 Ay %', '3 Ay %', 'Süre', 'Adet', 'Maliyet ₺', 'Değer ₺', 'K/Z', 'K/Z %'],
        [...body, foot],
      ),
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
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void (async () => {
      try {
        status.textContent = 'Ekleniyor…';
        await api('/api/watchlist', {
          method: 'POST',
          body: JSON.stringify({ fundCode: fundCode.value, note: note.value }),
        });
        onDone();
      } catch (err) {
        status.textContent = err instanceof Error ? err.message : 'Eklenemedi.';
      }
    })();
  });
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
      el('td', {}, [badge(STATUS_LABEL[r.status], r.status)]),
      el('td', { class: 'num' }, [r.navDate ?? '—']),
      el('td', { class: 'num' }, [
        r.navPerShare === null ? '—' : Number(r.navPerShare).toLocaleString('tr-TR', {
          minimumFractionDigits: 2, maximumFractionDigits: 6,
        }),
      ]),
      el('td', {}, [signed(r.dailyReturnPct)]),
      el('td', { class: 'num' }, [money(r.netFlow)]),
      el('td', { class: 'num' }, [r.taxPct === null ? '—' : `%${Number(r.taxPct).toFixed(1)}`]),
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
  if (existing !== null) {
    uname.value = existing.username;
    uname.disabled = true;
    utype.value = existing.type;
  }

  const status = el('span', { class: 'status' });
  const submit = el('button', { type: 'submit', class: 'btn-primary' }, [
    existing === null ? 'Kullanıcı Ekle' : 'Güncelle',
  ]) as HTMLButtonElement;
  const form = el('form', { class: 'modal-form-grid', id: 'user-form' }, [
    field('Kullanıcı Adı', uname),
    field('Parola', upass, existing === null
      ? 'En az 8 karakter.'
      : 'Boş bırakılırsa parola değişmez.'),
    field('Tip', utype, 'Yönetici kullanıcı yönetebilir.'),
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

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void (async () => {
      try {
        status.textContent = 'Kaydediliyor…';
        if (existing === null) {
          await api('/api/admin/users', {
            method: 'POST',
            body: JSON.stringify({
              username: uname.value, password: upass.value, type: utype.value,
            }),
          });
        } else {
          const patch: Record<string, unknown> = {
            type: utype.value, isActive: uactive.checked,
          };
          // Boş parola "değiştirme" demektir; sunucuya boş dize göndermeyiz.
          if (upass.value !== '') patch['password'] = upass.value;
          await api(`/api/admin/users/${String(existing.id)}`, {
            method: 'PATCH', body: JSON.stringify(patch),
          });
        }
        onDone();
      } catch (err) {
        status.textContent = err instanceof Error ? err.message : 'Kaydedilemedi.';
      }
    })();
  });
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

async function usersView(reload: () => void): Promise<Node[]> {
  const rows = (await api('/api/admin/users')) as UserRow[];
  const admins = rows.filter((u) => u.type === 'admin').length;
  const active = rows.filter((u) => u.isActive).length;

  const addBtn = el('button', { class: 'btn-primary' }, [icon('add'), 'Kullanıcı Ekle']);
  addBtn.addEventListener('click', () => { openUserModal(null, reload); });

  const body = rows.map((u) => {
    const editBtn = iconButton('edit', 'Düzenle');
    editBtn.addEventListener('click', () => { openUserModal(u, reload); });
    return el('tr', {}, [
      el('td', {}, [
        el('span', { class: 'fund-code' }, [u.username]),
        el('span', { class: 'fund-title' }, [`#${String(u.id)}`]),
      ]),
      el('td', {}, [badge(u.type === 'admin' ? 'Yönetici' : 'Kullanıcı', u.type)]),
      el('td', {}, [u.isActive ? badge('Aktif', 'open') : badge('Pasif', 'passive')]),
      el('td', { class: 'actions' }, [editBtn]),
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
        table(['Kullanıcı', 'Tip', 'Durum', ''], body),
      ]),
      addBtn,
    ),
  ];
}


// ─── İskelet ────────────────────────────────────────────────────────────────

const VIEWS: { id: ViewId; label: string; adminOnly: boolean; crumb: string }[] = [
  { id: 'dashboard', label: 'Panel', adminOnly: false, crumb: 'Genel' },
  { id: 'portfolio', label: 'Portföyüm', adminOnly: false, crumb: 'Genel' },
  { id: 'closed', label: 'Kapananlar', adminOnly: false, crumb: 'Genel' },
  { id: 'periods', label: 'Dönemsel Getiri', adminOnly: false, crumb: 'Genel' },
  { id: 'market', label: 'Piyasa', adminOnly: false, crumb: 'Genel' },
  { id: 'transactions', label: 'Fon Hareketleri', adminOnly: false, crumb: 'Genel' },
  { id: 'watchlist', label: 'Takip Listem', adminOnly: false, crumb: 'Genel' },
  { id: 'users', label: 'Kullanıcılar', adminOnly: true, crumb: 'Yönetim' },
  { id: 'settings', label: 'Ayarlar', adminOnly: true, crumb: 'Yönetim' },
];

/**
 * Sürüm rozeti. Değer sunucudan gelir; istemci commit ve derleme zamanını
 * bilemez, kendi başına uydurmamalı. Alınamazsa rozet sessizce boş kalır —
 * sürüm gösterilememesi ekranı bozmamalı.
 */
function versionBadge(): HTMLElement {
  const value = el('strong', { class: 'version-value' }, ['—']);
  const box = el('div', { class: 'version-badge' }, [
    el('span', { class: 'version-label' }, ['TEFAS-Pro']),
    value,
  ]);
  void (async () => {
    try {
      const rt = (await api('/api/runtime')) as { version?: string };
      // Sürüm gelmezse rozet boş bir kutu olarak kalmasın.
      value.textContent = rt.version ?? '—';
    } catch {
      value.textContent = '—';
    }
  })();
  return box;
}

async function appShell(me: Me, view: ViewId): Promise<void> {
  const reload = (): void => {
    void appShell(me, view);
  };
  const visible = VIEWS.filter((v) => !v.adminOnly || me.type === 'admin');
  const current = visible.find((v) => v.id === view) ?? visible[0]!;

  const nav = el(
    'nav',
    {},
    visible.map((v) => {
      const b = el('button', v.id === current.id ? { class: 'active' } : {}, [
        icon(v.id),
        v.label,
      ]);
      b.addEventListener('click', () => void appShell(me, v.id));
      return b;
    }),
  );

  const logout = el('button', { class: 'sidebar-logout', type: 'button' }, [icon('logout'), 'Çıkış Yap']);
  logout.addEventListener('click', () => {
    void (async () => {
      await api('/api/logout', { method: 'POST' });
      loginScreen();
    })();
  });

  const sidebar = el('aside', { class: 'sidebar' }, [
    brand(),
    nav,
    // Kullanıcı bilgisi ve çıkış birlikte en altta; kullanıcı çıkışın hemen
    // üstünde durur, ikisi nav'dan çizgiyle ayrılır.
    el('div', { class: 'sidebar-foot' }, [
      el('div', { class: 'sidebar-user' }, [
        el('div', { class: 'avatar' }, [me.username.slice(0, 2).toUpperCase()]),
        el('div', {}, [
          el('div', { class: 'sidebar-user-name' }, [me.username]),
          el('div', { class: 'sidebar-user-role' }, [me.type === 'admin' ? 'Yönetici' : 'Kullanıcı']),
        ]),
      ]),
      logout,
    ]),
  ]);

  let bodyNodes: Node[];
  try {
    if (current.id === 'dashboard') bodyNodes = await dashboardView(reload);
    else if (current.id === 'portfolio') bodyNodes = await portfolioView();
    else if (current.id === 'closed') bodyNodes = await closedView();
    else if (current.id === 'periods') bodyNodes = await periodsView();
    else if (current.id === 'market') bodyNodes = await marketView(reload);
    else if (current.id === 'transactions') bodyNodes = await transactionsView(reload);
    else if (current.id === 'watchlist') bodyNodes = await watchlistView(reload);
    else if (current.id === 'settings') bodyNodes = await settingsView(reload);
    else bodyNodes = await usersView(reload);
  } catch (err) {
    bodyNodes = [errorBox(err instanceof Error ? err.message : 'Yüklenemedi.')];
  }

  const content = el('main', { class: 'content' }, [
    el('header', { class: 'content-header' }, [
      el('div', {}, [
        el('div', { class: 'breadcrumb' }, [`${current.crumb} / ${current.label}`]),
        el('h1', {}, [current.label]),
      ]),
      versionBadge(),
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
