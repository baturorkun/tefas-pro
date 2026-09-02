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

type ViewId = 'dashboard' | 'portfolio' | 'transactions' | 'watchlist' | 'users';

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

function brand(): HTMLElement {
  return el('div', { class: 'brand' }, [
    el('div', { class: 'brand-mark' }, ['TP']),
    el('div', {}, [
      el('span', { class: 'brand-name' }, [
        'tefas-pro',
        el('span', { class: 'brand-sub' }, ['fon takip paneli']),
      ]),
    ]),
  ]);
}

function field(labelText: string, input: HTMLElement): HTMLElement {
  return el('div', { class: 'field' }, [el('label', {}, [labelText]), input]);
}

function metric(label: string, value: string, foot?: string): HTMLElement {
  return el('div', { class: 'metric-card' }, [
    el('div', { class: 'metric-label' }, [label]),
    el('div', { class: 'metric-value' }, [value]),
    ...(foot === undefined ? [] : [el('div', { class: 'metric-foot' }, [foot])]),
  ]);
}

function panel(title: string, meta: string, body: Node, toolbar?: Node): HTMLElement {
  return el('section', { class: 'panel' }, [
    el('div', { class: 'panel-heading' }, [
      el('h2', {}, [title]),
      el('span', { class: 'header-meta' }, [meta]),
    ]),
    ...(toolbar ? [toolbar] : []),
    body,
  ]);
}

function table(headers: string[], rows: HTMLElement[]): HTMLElement {
  if (rows.length === 0) return el('div', { class: 'empty-state' }, ['Kayıt yok.']);
  return el('div', { class: 'table-wrap' }, [
    el('table', {}, [
      el('thead', {}, [el('tr', {}, headers.map((h) => el('th', {}, [h])))]),
      el('tbody', {}, rows),
    ]),
  ]);
}

// ─── Grafik ─────────────────────────────────────────────────────────────────

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
    return panel('Portföy performansı', 'son 30 iş günü',
      el('div', { class: 'panel-body' }, [
        el('div', { class: 'empty-state' }, ['Performans serisi alınamadı.']),
      ]));
  }

  // İki günden kısa seri çizilmez: tek noktadan çizgi de bar da çıkmaz.
  if (series.points.length < 2) {
    return panel('Portföy performansı', 'son 30 iş günü',
      el('div', { class: 'panel-body' }, [
        el('div', { class: 'empty-state' }, [
          'Grafik için en az iki işlem günü gerekiyor. Pozisyon açıldıkça seri dolacak.',
        ]),
      ]));
  }

  const first = series.points[0];
  const last = series.points[series.points.length - 1];
  const meta = first && last ? `${first.date} → ${last.date}` : 'son 30 iş günü';
  const body = el('div', { class: 'panel-body perf-body' }, [performanceChart(series.points)]);
  const toolbar = el('div', { class: 'chart-toolbar perf-toolbar' }, [
    el('span', { class: 'perf-total-label' }, ['Dönem getirisi']),
    signed(series.totalPct),
  ]);
  return panel('Portföy performansı', meta, body, toolbar);
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
      metric('Takip listem', String(m.watchlist), `${String(m.trackedFunds)} fon toplanıyor`),
      metric('Açık pozisyon', String(m.openPositions), 'portföyümde'),
      metric('Son veri', m.dataDate ?? '—', 'getiri günü'),
      metric(
        'Son toplama',
        run?.finishedAt?.slice(11) ?? '—',
        run ? `#${String(run.id)} · ${run.status}` : 'henüz koşmadı',
      ),
    ]),
    watchlistToggle(!onlyOwned, (dahil) => {
      writeOnlyOwned(!dahil);
      reload();
    }),
    ...positionSection(d.positions, onlyOwned),
    await performancePanel(),
    el('h2', { class: 'section-title' }, ['Piyasa']),
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
    el('h2', { class: 'section-title' }, ['Para akışı']),
    grid([
      flowPanel('En çok giriş olan (1 hafta)', kapsam, d.flowRanks['1w']?.top ?? [], 'giriş'),
      flowPanel('En çok giriş olan (1 ay)', kapsam, d.flowRanks['1m']?.top ?? [], 'giriş'),
      flowPanel('En çok çıkış olan (1 hafta)', kapsam, d.flowRanks['1w']?.bottom ?? [], 'çıkış'),
      flowPanel('En çok çıkış olan (1 ay)', kapsam, d.flowRanks['1m']?.bottom ?? [], 'çıkış'),
    ]),
    el('h2', { class: 'section-title' }, ['Yatırımcı sayısı']),
    grid([
      investorPanel('En çok artan (1 hafta)', kapsam, d.investorRanks['1w']?.top ?? [], 'artış'),
      investorPanel('En çok artan (1 ay)', kapsam, d.investorRanks['1m']?.top ?? [], 'artış'),
      investorPanel('En çok azalan (1 hafta)', kapsam, d.investorRanks['1w']?.bottom ?? [], 'azalış'),
      investorPanel('En çok azalan (1 ay)', kapsam, d.investorRanks['1m']?.bottom ?? [], 'azalış'),
    ]),
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

function transactionForm(existing: Transaction | null, onDone: () => void): HTMLElement {
  const f = {
    fundCode: el('input', { required: 'true', placeholder: 'THF', maxlength: '16' }),
    units: el('input', { type: 'number', step: 'any', min: '0', required: 'true', placeholder: '1000' }),
    tradeDate: el('input', { type: 'date', required: 'true' }),
    platform: el('input', { required: 'true', placeholder: 'Nkolay' }),
    sellDate: el('input', { type: 'date' }),
  };
  if (existing) {
    f.fundCode.value = existing.fundCode;
    f.units.value = existing.units;
    f.tradeDate.value = existing.tradeDate;
    f.platform.value = existing.platform;
    f.sellDate.value = existing.sellDate ?? '';
  }
  const status = el('span', { class: 'status' });
  const form = el('form', { class: 'row-form' }, [
    field('Fon kodu', f.fundCode),
    field('Adet', f.units),
    field('Alış tarihi', f.tradeDate),
    field('Banka', f.platform),
    field('Satış tarihi', f.sellDate),
    el('div', { class: 'field' }, [
      el('button', { type: 'submit', class: 'btn-primary btn-block' }, [
        existing ? 'Güncelle' : 'İşlem ekle',
      ]),
    ]),
    status,
  ]);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void (async () => {
      const payload = {
        fundCode: f.fundCode.value,
        platform: f.platform.value,
        tradeDate: f.tradeDate.value,
        units: f.units.value,
        sellDate: f.sellDate.value || null,
      };
      try {
        status.textContent = 'kaydediliyor…';
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
  return form;
}

async function transactionsView(reload: () => void): Promise<Node[]> {
  const rows = (await api('/api/transactions')) as Transaction[];
  const open = rows.filter((t) => t.sellDate === null);
  const funds = new Set(open.map((t) => t.fundCode));
  const platforms = new Set(open.map((t) => t.platform));
  const last = rows.map((t) => t.tradeDate).sort().at(-1);

  const body = rows.map((t) => {
    const editBtn = el('button', { class: 'btn-ghost' }, ['düzenle']);
    const delBtn = el('button', { class: 'btn-danger' }, ['sil']);
    const tr = el('tr', {}, [
      el('td', {}, [
        el('span', { class: 'fund-code' }, [t.fundCode]),
        el('span', { class: 'fund-title' }, [t.fundTitle ?? '']),
      ]),
      el('td', { class: 'num' }, [Number(t.units).toLocaleString('tr-TR')]),
      el('td', { class: 'num' }, [t.tradeDate]),
      el('td', {}, [t.platform]),
      el('td', { class: 'num' }, [t.sellDate ?? '—']),
      el('td', {}, [t.sellDate === null ? badge('açık', 'open') : badge('kapandı', 'closed')]),
      el('td', { class: 'actions' }, [editBtn, delBtn]),
    ]);
    delBtn.addEventListener('click', () => {
      void (async () => {
        await api(`/api/transactions/${String(t.id)}`, { method: 'DELETE' });
        reload();
      })();
    });
    editBtn.addEventListener('click', () => {
      tr.replaceWith(el('tr', {}, [el('td', { colspan: '7' }, [transactionForm(t, reload)])]));
    });
    return tr;
  });

  return [
    el('div', { class: 'metric-grid' }, [
      metric('Açık pozisyon', String(open.length), `${String(rows.length)} işlem kaydı`),
      metric('Fon', String(funds.size), 'açık pozisyondaki farklı fon'),
      metric('Platform', String(platforms.size), 'banka / aracı'),
      metric('Son işlem', last ?? '—', 'alış tarihi'),
    ]),
    panel(
      'Fon Hareketleri',
      `${String(rows.length)} kayıt · ${String(open.length)} açık`,
      table(
        ['Fon', 'Adet', 'Alış', 'Banka', 'Satış', 'Durum', ''],
        body,
      ),
      transactionForm(null, reload),
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
      metric('Maliyet', money(String(cost)), `${String(rows.length)} fon`),
      metric('Bugünkü değer', money(String(value)), rows[0]?.asOfDate ?? '—'),
      metric('Kâr / zarar', money(String(gain)),
        cost === 0 ? '—' : `%${(((value / cost) - 1) * 100).toFixed(2)}`),
      metric('Kârda', String(winners), `${String(rows.length - winners)} zararda`),
    ]),
    panel(
      'Portföyüm',
      'açık pozisyonlar, fon başına',
      table(
        ['Fon', 'Gün %', '1 ay %', '3 ay %', 'Süre', 'Adet', 'Maliyet ₺', 'Değer ₺', 'K/Z', 'K/Z %'],
        [...body, foot],
      ),
    ),
  ];
}

// ─── Takip listesi görünümü ─────────────────────────────────────────────────

/** Kod dışında alan yok: not isteğe bağlı, gerisi collector'dan gelir. */
function watchlistForm(onDone: () => void): HTMLElement {
  const fundCode = el('input', { required: 'true', placeholder: 'THF', maxlength: '16' });
  const note = el('input', { placeholder: 'neden izliyorum (isteğe bağlı)', maxlength: '200' });
  const status = el('span', { class: 'status' });
  const form = el('form', { class: 'row-form' }, [
    field('Fon kodu', fundCode),
    field('Not', note),
    el('div', { class: 'field' }, [
      el('button', { type: 'submit', class: 'btn-primary btn-block' }, ['Listeye ekle']),
    ]),
    status,
  ]);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void (async () => {
      try {
        status.textContent = 'ekleniyor…';
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
  return form;
}

const STATUS_LABEL: Record<WatchlistRow['status'], string> = {
  sold: 'çıktım',
  watch: 'izliyorum',
};

async function watchlistView(reload: () => void): Promise<Node[]> {
  const rows = (await api('/api/watchlist')) as WatchlistRow[];
  const sold = rows.filter((r) => r.status === 'sold').length;
  const dates = rows.map((r) => r.navDate).filter((d): d is string => d !== null).sort();
  const gainers = rows.filter((r) => Number(r.dailyReturnPct ?? 0) > 0).length;

  const body = rows.map((r) => {
    const delBtn = el('button', { class: 'btn-danger' }, ['çıkar']);
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
        await api(`/api/watchlist/${r.fundCode}`, { method: 'DELETE' });
        reload();
      })();
    });
    return tr;
  });

  return [
    el('div', { class: 'metric-grid' }, [
      metric('Takip listem', String(rows.length), 'portföyümde olmayan fon'),
      metric('Çıktığım', String(sold), `${String(rows.length - sold)} hiç almadığım`),
      metric('Günü artıda', String(gainers), `${String(rows.length - gainers)} eksi veya yatay`),
      metric('Son veri', dates.at(-1) ?? '—', 'NAV tarihi'),
    ]),
    panel(
      'Takip listem',
      `${String(rows.length)} fon · portföyüme aldığım fon burada görünmez`,
      table(
        ['Fon', 'Durum', 'NAV tarihi', 'NAV', 'Günlük', 'Net akış', 'Stopaj', 'Satış valörü', ''],
        body,
      ),
      watchlistForm(reload),
    ),
  ];
}

// ─── Kullanıcılar görünümü ──────────────────────────────────────────────────

async function usersView(reload: () => void): Promise<Node[]> {
  const rows = (await api('/api/admin/users')) as UserRow[];
  const admins = rows.filter((u) => u.type === 'admin').length;
  const active = rows.filter((u) => u.isActive).length;

  const uname = el('input', { required: 'true', placeholder: 'kullanıcı adı' });
  const upass = el('input', { type: 'password', required: 'true', placeholder: 'en az 8 karakter' });
  const utype = el('select', {}, [
    el('option', { value: 'user' }, ['user']),
    el('option', { value: 'admin' }, ['admin']),
  ]);
  const status = el('span', { class: 'status' });
  const createForm = el('form', { class: 'row-form' }, [
    field('Kullanıcı adı', uname),
    field('Parola', upass),
    field('Tip', utype),
    el('div', { class: 'field' }, [
      el('button', { type: 'submit', class: 'btn-primary btn-block' }, ['Kullanıcı oluştur']),
    ]),
    status,
  ]);
  createForm.addEventListener('submit', (e) => {
    e.preventDefault();
    void (async () => {
      try {
        await api('/api/admin/users', {
          method: 'POST',
          body: JSON.stringify({
            username: uname.value, password: upass.value, type: utype.value,
          }),
        });
        reload();
      } catch (err) {
        status.textContent = err instanceof Error ? err.message : 'Oluşturulamadı.';
      }
    })();
  });

  const body = rows.map((u) => {
    const typeSel = el('select', {}, [
      el('option', { value: 'user' }, ['user']),
      el('option', { value: 'admin' }, ['admin']),
    ]);
    typeSel.value = u.type;
    const activeBox = el('input', { type: 'checkbox' });
    activeBox.checked = u.isActive;
    const rowStatus = el('span', { class: 'status' });
    const save = el('button', { class: 'btn-secondary' }, ['kaydet']);
    save.addEventListener('click', () => {
      void (async () => {
        try {
          await api(`/api/admin/users/${String(u.id)}`, {
            method: 'PATCH',
            body: JSON.stringify({ type: typeSel.value, isActive: activeBox.checked }),
          });
          reload();
        } catch (err) {
          rowStatus.textContent = err instanceof Error ? err.message : 'Kaydedilemedi.';
        }
      })();
    });
    return el('tr', {}, [
      el('td', {}, [
        el('span', { class: 'fund-code' }, [u.username]),
        el('span', { class: 'fund-title' }, [`#${String(u.id)}`]),
      ]),
      el('td', {}, [badge(u.type, u.type)]),
      el('td', {}, [u.isActive ? badge('aktif', 'open') : badge('pasif', 'passive')]),
      el('td', {}, [typeSel]),
      el('td', {}, [activeBox]),
      el('td', { class: 'actions' }, [save, rowStatus]),
    ]);
  });

  return [
    el('div', { class: 'metric-grid' }, [
      metric('Kullanıcı', String(rows.length), 'toplam'),
      metric('Admin', String(admins), 'yönetici yetkisi'),
      metric('Aktif', String(active), `${String(rows.length - active)} pasif`),
      metric('Standart', String(rows.length - admins), 'user tipi'),
    ]),
    panel(
      'Kullanıcılar',
      `${String(rows.length)} kayıt`,
      table(['Kullanıcı', 'Tip', 'Durum', 'Yeni tip', 'Aktif', ''], body),
      createForm,
    ),
  ];
}

// ─── İskelet ────────────────────────────────────────────────────────────────

const VIEWS: { id: ViewId; label: string; icon: string; adminOnly: boolean; crumb: string }[] = [
  { id: 'dashboard', label: 'Panel', icon: '▦', adminOnly: false, crumb: 'Genel' },
  { id: 'portfolio', label: 'Portföyüm', icon: '◈', adminOnly: false, crumb: 'Genel' },
  { id: 'transactions', label: 'Fon Hareketleri', icon: '⇄', adminOnly: false, crumb: 'Genel' },
  { id: 'watchlist', label: 'Takip listem', icon: '☰', adminOnly: false, crumb: 'Genel' },
  { id: 'users', label: 'Kullanıcılar', icon: '⚇', adminOnly: true, crumb: 'Yönetim' },
];

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
        el('span', { class: 'icon' }, [v.icon]),
        v.label,
      ]);
      b.addEventListener('click', () => void appShell(me, v.id));
      return b;
    }),
  );

  const logout = el('button', { class: 'btn-ghost btn-block' }, ['Çıkış yap']);
  logout.addEventListener('click', () => {
    void (async () => {
      await api('/api/logout', { method: 'POST' });
      loginScreen();
    })();
  });

  const sidebar = el('aside', { class: 'sidebar' }, [
    brand(),
    nav,
    el('div', { class: 'sidebar-foot' }, [
      el('div', { class: 'sidebar-user' }, [
        el('div', { class: 'avatar' }, [me.username.slice(0, 2).toUpperCase()]),
        el('div', {}, [
          el('div', { class: 'sidebar-user-name' }, [me.username]),
          el('div', { class: 'sidebar-user-role' }, [me.type]),
        ]),
      ]),
      logout,
    ]),
  ]);

  let bodyNodes: Node[];
  try {
    if (current.id === 'dashboard') bodyNodes = await dashboardView(reload);
    else if (current.id === 'portfolio') bodyNodes = await portfolioView();
    else if (current.id === 'transactions') bodyNodes = await transactionsView(reload);
    else if (current.id === 'watchlist') bodyNodes = await watchlistView(reload);
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
      el('span', { class: 'header-meta' }, [new Date().toLocaleDateString('tr-TR')]),
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
