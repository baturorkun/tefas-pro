import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Arayüz kuralları kaynak üzerinden korunur: bunlar bozulduğunda görsel bir
 * hata çıkmaz, sessizce eski görünüme dönülür. Tarayıcı gerektirmeyenler
 * burada tutulur.
 */
const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

describe('düğme kuralları', () => {
  it('satır eylemleri metin değil ikon düğmesidir', () => {
    expect(main).not.toMatch(/\}, \['(düzenle|sil|çıkar)'\]\)/);
    expect(main).toContain("iconButton('edit', 'Düzenle')");
    expect(main).toContain("iconButton('delete', 'Sil', 'danger')");
  });

  it('ikon düğmesi ipucu metni taşır', () => {
    expect(main).toMatch(/title: label, 'aria-label': label/);
  });
});

describe('metin kuralları', () => {
  it('durum rozetleri büyük harfle başlar', () => {
    for (const t of ['Açık', 'Kapandı', 'Aktif', 'Pasif']) {
      expect(main).toContain(`badge('${t}'`);
    }
    for (const t of ['açık', 'kapandı', 'aktif', 'pasif']) {
      expect(main).not.toContain(`badge('${t}'`);
    }
  });

  it('uygulama adı TEFAS-Pro', () => {
    expect(html).toContain('<title>TEFAS-Pro</title>');
    expect(main).toContain("['TEFAS-Pro']");
  });
});

describe('form ve pencere', () => {
  it('işlem formu satırın yerine gömülmez, pencerede açılır', () => {
    expect(main).not.toMatch(/tr\.replaceWith\(.*transactionForm/);
    expect(main).toContain('openTransactionModal');
  });

  it('pencere Escape ve zemin tıklamasıyla kapanır', () => {
    expect(main).toMatch(/if \(e\.key === 'Escape'\) close\(\)/);
    expect(main).toMatch(/if \(e\.target === overlay\) close\(\)/);
  });
});

describe('kullanıcı yönetimi', () => {
  it('aktiflik listede değil formda', () => {
    // Liste hem "Durum" rozetini hem bir kutucuğu gösteriyordu: aynı bilgi iki
    // kez, üstelik tek tıkla yanlışlıkla değiştirilebiliyordu.
    expect(main).toContain("el('label', { class: 'switch-field' }");
    expect(main).not.toMatch(/const activeBox = el\('input', \{ type: 'checkbox' \}\)/);
  });

  it('kullanıcı formu pencerede açılır', () => {
    expect(main).toContain('openUserModal');
    expect(main).not.toContain("['Kullanıcı oluştur']");
  });

  it('tip ve durum insan diliyle yazılır', () => {
    expect(main).toContain("u.type === 'admin' ? 'Yönetici' : 'Kullanıcı'");
  });
});

describe('yerleşim', () => {
  it('liste eylemi panel başlığında durur, gövdeye girmez', () => {
    expect(main).toMatch(/function panel\([^)]*action\?: Node\)/);
    expect(main).toContain("el('div', { class: 'panel-heading-text' }");
  });

  it('kullanıcı bilgisi ve çıkış birlikte en altta', () => {
    // sidebar-user, sidebar-foot'un içinde olmalı; dışında kalırsa
    // margin-top:auto onu navigasyonun altına itiyor.
    const foot = main.indexOf("class: 'sidebar-foot'");
    const user = main.indexOf("class: 'sidebar-user'");
    expect(foot).toBeGreaterThan(-1);
    expect(user).toBeGreaterThan(foot);
  });
});

describe('ekran ayrımı', () => {
  it('piyasa sıralamaları panelde değil kendi ekranında', () => {
    // Panel "portföyüm ne durumda", piyasa ekranı "piyasada ne oluyor"
    // sorusunu cevaplar; ikisi tek ekranda birleşince panel gereksiz uzuyordu.
    expect(main).toContain('async function marketView');
    const dash = main.slice(main.indexOf('async function dashboardView'),
                            main.indexOf('async function marketView'));
    expect(dash).not.toContain('flowPanel(');
    expect(dash).not.toContain('investorPanel(');
  });

  it('piyasa ekranı mevcut ucu kullanır, yeni uç açılmaz', () => {
    const market = main.slice(main.indexOf('async function marketView'));
    expect(market).toContain("api(`/api/dashboard");
    expect(main).not.toContain("api('/api/market')");
  });

  it('takip listesi anahtarı her iki ekranda da bulunur', () => {
    const dash = main.slice(main.indexOf('async function dashboardView'),
                            main.indexOf('async function marketView'));
    const market = main.slice(main.indexOf('async function marketView'));
    expect(dash).toContain('watchlistToggle(');
    expect(market.slice(0, market.indexOf('// ─── Giriş'))).toContain('watchlistToggle(');
  });
});

describe('form görünümü', () => {
  it('alan kendi boşluğunu eklemez', () => {
    // .field'ın margin'i ızgaranın gap'iyle toplanıp formu gereksiz uzatıyordu.
    expect(css).not.toMatch(/\.field \{[^}]*margin-bottom/);
  });

  it('girdiler sabit yükseklikte', () => {
    // date ve number girdileri tarayıcının kendi süslerini taşıdığı için
    // serbest bırakılırsa komşularından farklı yükseklikte çıkıyor.
    expect(css).toMatch(/input, select \{[^}]*height:/);
    // Kutucuk bu kuraldan muaf olmalı, yoksa kocaman görünür.
    expect(css).toMatch(/input\[type="checkbox"\][^}]*height: auto/);
  });

  it('alan yardımcı metin taşıyabilir', () => {
    expect(main).toMatch(/function field\([^)]*hint\?: string/);
    expect(main).toContain("'Boş bırakılırsa pozisyon açık kalır.'");
  });

  it('iptal düğmesi çerçevelidir', () => {
    // RQ-0018'in "yazıdan düğme olmaz" kuralının gözden kaçan örneğiydi.
    expect(css).toMatch(/\.btn-ghost \{[^}]*border:/);
  });

  it('aç/kapa alanı çıplak kutucuk değil', () => {
    expect(css).toContain('.switch-track');
    expect(main).toContain("class: 'switch-track'");
  });
});

describe('valör bilgisi', () => {
  it('ilgili bölümün başlığında durur', () => {
    // Formun dibinde tek satırken hangi alanla ilgili olduğu anlaşılmıyordu.
    expect(main).toContain("class: 'section-note'");
    expect(main).toMatch(/'form-section' \}, \[el\('span', \{\}, \['Alış'\]\), buyValorNote\]/);
    expect(main).toMatch(/'form-section' \}, \[el\('span', \{\}, \['Satış'\]\), sellValorNote\]/);
  });

  it('fon bilinmiyorsa hiçbir şey yazmaz', () => {
    expect(main).toMatch(/days === undefined \? '' :/);
    expect(css).toContain('.section-note:empty { display: none; }');
  });
});

describe('banka alanı', () => {
  it('seçim listesidir, serbest metin değil', () => {
    // Serbest metinken aynı banka "Nkolay", "nkolay", "NKolay" diye üç ayrı
    // platform gibi görünebiliyordu; maliyet platform bazında tutulduğu için
    // bu doğrudan yanlış rakam üretirdi.
    expect(main).toContain("platform: el('select', { required: 'true' })");
    expect(main).not.toContain("placeholder: 'Nkolay'");
  });

  it('banka listesi boşken formda uyarı çıkar', () => {
    expect(main).toContain('Tanımlı banka yok. Ayarlar ekranından banka ekleyin.');
  });

  it('kullanımdaki banka için silme sebebi yazılır', () => {
    expect(main).toMatch(/işlemde kullanılıyor, silinemez/);
  });
});

describe('collector log', () => {
  it('yönetim menüsünde kendi ekranı var', () => {
    expect(main).toContain("{ id: 'runs', label: 'Collector Log', adminOnly: true");
  });

  it('hata metni kendi satırında gösterilir', () => {
    // Hata metni tabloya sığmıyor ve kısaltılınca işe yaramaz hale geliyor.
    expect(main).toContain("class: 'run-error-row'");
    expect(css).toContain('.run-error {');
  });

  it('verisi gelmemiş fon takip listesinde belli olur', () => {
    // Sessizce tire dizisi "veri yok" ile "henüz gelmedi"yi aynı şeye benzetirdi.
    expect(main).toContain("badge('Veri Bekleniyor', 'pending')");
    expect(css).toContain('.status-pending');
  });
});

describe('dönemsel getiri tablosu', () => {
  it('zararlı ayın şeridi kırmızı olur', () => {
    // Şerit ayın sonucunu satırı okumadan önce söylüyor.
    expect(main).toContain("'period-month period-loss'");
    expect(css).toContain('.period-month.period-loss td:first-child');
    expect(css).toContain('inset 3px 0 0 var(--danger)');
  });

  it('puan birimi başlıkta durur, her satırda değil', () => {
    expect(main).toContain("'Fark (puan)'");
    expect(main).not.toContain("signed(r.diff, ' p')");
  });
});

describe('tercihlerim', () => {
  it('herkese açık, yönetim ekranı değil', () => {
    expect(main).toContain("{ id: 'prefs', label: 'Tercihlerim', adminOnly: false");
  });

  it('devralınan değer ile kişisel seçim ayırt edilir', () => {
    // "TP2" yazan iki kullanıcıdan biri onu seçmiş, diğeri devralmış olabilir;
    // genel ayar değişince yalnız ikincisi etkilenir.
    expect(main).toContain("benchmark.personal ? 'Kendi Seçimin' : 'Genel Ayardan Devralındı'");
  });

  it('kişisel tercih temizlenebilir', () => {
    expect(main).toContain("'Genel Ayara Dön'");
  });
});

describe('menü grupları', () => {
  it('yönetim ekranları kendi başlığı altında toplanır', () => {
    // Düz listede kullanıcı ekranı ile yönetim ekranı yan yana duruyordu;
    // hangisinin admin'e ait olduğu yalnız içeri girince anlaşılıyordu.
    expect(main).toContain("class: 'nav-group'");
    expect(css).toContain('.nav-group {');
  });

  it('yönetim grubunun adı Admin', () => {
    expect(main).toContain("adminOnly: true, crumb: 'Admin' }");
    expect(main).not.toContain("crumb: 'Yönetim'");
  });

  it('grup sırası menü sırasından gelir, ayrı bir liste tutulmaz', () => {
    // İki liste olsaydı biri güncellenip diğeri unutulabilirdi.
    expect(main).toContain('last.label === v.crumb');
  });
});

describe('kabuk', () => {
  it('sürüm istemcide üretilmez, sunucudan alınır', () => {
    expect(main).toContain("api('/api/runtime')");
    expect(main).not.toMatch(/'v0\.\d+\.\d+/);
  });

  it('sağ üstte tarih yerine sürüm rozeti durur', () => {
    expect(main).not.toContain("new Date().toLocaleDateString('tr-TR')");
    expect(main).toContain('versionBadge()');
  });

  it('logo satır içi SVG çizimdir', () => {
    expect(main).toContain('function logoMark');
    expect(main).not.toContain("class: 'brand-mark' }, ['TP']");
  });
});
