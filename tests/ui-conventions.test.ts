import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Arayüz kuralları kaynak üzerinden korunur: bunlar bozulduğunda görsel bir
 * hata çıkmaz, sessizce eski görünüme dönülür. Tarayıcı gerektirmeyenler
 * burada tutulur.
 */
const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

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
