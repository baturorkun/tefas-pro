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
  status: string;
  title: string | null;
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

type ViewId = 'portfolio' | 'watchlist' | 'users';

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
        else void appShell(me, 'portfolio');
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

async function portfolioView(reload: () => void): Promise<Node[]> {
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
      'İşlemler',
      `${String(rows.length)} kayıt`,
      table(
        ['Fon', 'Adet', 'Alış', 'Banka', 'Satış', 'Durum', ''],
        body,
      ),
      transactionForm(null, reload),
    ),
  ];
}

// ─── Takip listesi görünümü ─────────────────────────────────────────────────

async function watchlistView(): Promise<Node[]> {
  const rows = (await api('/api/admin/watchlist')) as WatchlistRow[];
  const owned = rows.filter((r) => r.status === 'owned').length;
  const dates = rows.map((r) => r.navDate).filter((d): d is string => d !== null).sort();
  const gainers = rows.filter((r) => Number(r.dailyReturnPct ?? 0) > 0).length;

  const body = rows.map((r) =>
    el('tr', {}, [
      el('td', {}, [
        el('span', { class: 'fund-code' }, [r.fundCode]),
        el('span', { class: 'fund-title' }, [r.title ?? '']),
      ]),
      el('td', {}, [badge(r.status === 'owned' ? 'sahip' : 'izleniyor', r.status)]),
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
    ]),
  );

  return [
    el('div', { class: 'metric-grid' }, [
      metric('Takip edilen', String(rows.length), 'fon'),
      metric('Sahip olunan', String(owned), `${String(rows.length - owned)} yalnız izleniyor`),
      metric('Günü artıda', String(gainers), `${String(rows.length - gainers)} eksi veya yatay`),
      metric('Son veri', dates.at(-1) ?? '—', 'NAV tarihi'),
    ]),
    panel(
      'Takip listesi',
      `${String(rows.length)} fon`,
      table(
        ['Fon', 'Durum', 'NAV tarihi', 'NAV', 'Günlük', 'Net akış', 'Stopaj', 'Satış valörü'],
        body,
      ),
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
  { id: 'portfolio', label: 'Portföyüm', icon: '◈', adminOnly: false, crumb: 'Genel' },
  { id: 'watchlist', label: 'Takip listesi', icon: '☰', adminOnly: true, crumb: 'Yönetim' },
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
    if (current.id === 'portfolio') bodyNodes = await portfolioView(reload);
    else if (current.id === 'watchlist') bodyNodes = await watchlistView();
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
    else await appShell(me, 'portfolio');
  } catch {
    loginScreen();
  }
}

if (root) void start();
