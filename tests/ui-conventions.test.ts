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
    // Kural etiketlerin kendisinde değil biçiminde: sabit bir liste tutmak,
    // etiket değişince testi yanlış yere kırıyordu. Kullanılan bütün rozetler
    // taranıp ilk harfleri kontrol ediliyor.
    const etiketler = [...main.matchAll(/badge\('([^']+)'/g)].map((m) => m[1] ?? '');
    expect(etiketler.length).toBeGreaterThan(3);
    for (const e of etiketler) {
      expect(e[0], `rozet küçük harfle başlıyor: ${e}`).toBe((e[0] ?? '').toLocaleUpperCase('tr'));
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
    expect(main).toContain("'Emrin fiyatlandığı gün.'");
  });

  it('iptal düğmesi çerçevelidir', () => {
    // RQ-0018'in "yazıdan düğme olmaz" kuralının gözden kaçan örneğiydi.
    expect(css).toMatch(/\.btn-ghost \{[^}]*border:/);
  });

  it('aç/kapa alanı çıplak kutucuk değil', () => {
    expect(css).toContain('.switch-track');
    expect(main).toContain("class: 'switch-track'");
  });

  it('grafik araç çubuğu da aynı anahtarı kullanır', () => {
    // İki ayrı aç/kapa biçimi olsaydı aynı işi yapan şey iki türlü görünürdü.
    expect(main).toContain("class: 'switch-field switch-inline'");
    expect(css).toContain('.switch-inline');
    // Eski çıplak kutucuk stili kalmamalı: kullanılmayan stil bir sonraki
    // eklemede yanlışlıkla yeniden kullanılır.
    expect(css).not.toMatch(/^\.toggle\s/m);
    expect(css).not.toContain('.toggle input');
    expect(main).not.toContain("class: 'toggle'");
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

describe('sürüm', () => {
  it('kodda elle tutulan requirement sabiti yok', () => {
    // Sabit RQ-0018'de yazılmış ve on dört requirement boyunca
    // güncellenmemişti; aynı dosyadaki commit ve zaman ise hiç bozulmadı
    // çünkü onları kimse yazmıyor.
    const version = readFileSync(new URL('../src/version.ts', import.meta.url), 'utf8');
    expect(version).not.toMatch(/CURRENT_REQUIREMENT\s*=/);
    expect(version).not.toMatch(/CURRENT_RUN_ORDINAL\s*=/);
    expect(version).toContain('export function highestRequirement');
  });

  it('numara derleme sırasında yazılır', () => {
    const pkg = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
    expect(pkg).toContain('write-version.ts && tsc');
  });

  it('imaj requirements klasörünü taşımaz, numara dışarıdan verilir', () => {
    // .containerignore hem klasörü hem *.md dosyalarını dışarıda tutuyor;
    // klasörü açmak yerine değer build arg olarak geliyor.
    const cf = readFileSync(new URL('../server/Containerfile', import.meta.url), 'utf8');
    expect(cf).not.toContain('COPY requirements');
    expect(cf).toContain('ARG APP_REQUIREMENT');
    const deploy = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
    expect(deploy).toContain('APP_REQUIREMENT=');
  });
});

describe('performans grafiği', () => {
  it('tarih etiketi sayısı sığan kadar, sabit değil', () => {
    // Sabit sekiz etiket, sığdığı halde günleri gizliyordu; son 30 iş gününde
    // hepsi rahat sığıyor.
    expect(main).toContain('const maxLabels = Math.max(2, Math.floor(plotW / LABEL_FOOTPRINT))');
    expect(main).not.toContain('Math.ceil(points.length / 8)');
  });

  it('etiketler dik yazılır', () => {
    expect(main).toContain('rotate(-60');
  });
});

describe('fon hareketleri', () => {
  it('işlem başına fiyat, tutar ve kâr zarar gösterir', () => {
    expect(main).toContain("'Alış / Son', 'Maliyet / Değer', 'K/Z', 'K/Z %'");
  });

  it('fon ve banka filtresi vardır ve birlikte çalışır', () => {
    expect(main).toContain('const fonFiltre = comboFilter({');
    expect(main).toContain('const bankaFiltre = comboFilter({');
    // AND: ikisi aynı anda uygulanabilmeli.
    expect(main).toMatch(/txFiltre\.fundCode === '' \|\| t\.fundCode === txFiltre\.fundCode/);
    expect(main).toMatch(/txFiltre\.platform === '' \|\| t\.platform === txFiltre\.platform/);
  });

  it('filtreler sütun adlarının üstünde, kendi hizalarında durur', () => {
    // Panel başlığındayken "İşlem Ekle" düğmesi aramanın parçası gibi
    // görünüyordu, oysa alakasız. Sütun adlarının altına düşünce de tablonun
    // içindeymiş gibi duruyordu.
    expect(main).toContain('[fonFiltre, null, null, bankaFiltre');
    expect(css).toContain('.filter-row th');
    // Filtre satırı başlık satırından ÖNCE eklenir.
    const t = main.slice(main.indexOf('function table('));
    expect(t.indexOf("class: 'filter-row'")).toBeLessThan(t.indexOf('head.push('));
  });

  it('seçim temizlenebilir', () => {
    // Seçimi geri almanın yolu listeyi açıp "Tümü" aramak olmamalı.
    expect(main).toContain("class: 'combo-clear'");
    expect(main).toContain("opts.onChange('')");
  });

  it('seçim kutusunda arama vardır', () => {
    expect(main).toContain("class: 'combo-search'");
    expect(css).toContain('.combo-search');
  });

  it('arama Türkçe noktalı ve noktasız i ayrımına takılmaz', () => {
    // "DFI" Türkçe küçültmede "dfı" oluyor; kullanıcı "dfi" yazınca eşleşme
    // çıkmıyordu.
    expect(main).toContain('function aramaAnahtari');
    expect(main).toMatch(/replace\(\/\[ıİi\]\/g, 'i'\)/);
  });

  it('fon filtresinde yalnız kod görünür', () => {
    // Sütun dar; ad listede ikinci satır olarak duruyor.
    expect(main).toMatch(/value: kod, label: kod, hint: ad \?\? undefined/);
  });

  it('filtre işlem sonrası korunur', () => {
    // Liste her ekleme, düzenleme ve silmeden sonra baştan yükleniyor; durum
    // view içinde tutulsaydı her seferinde sıfırlanırdı.
    expect(main).toContain('const txFiltre = {');
    const view = main.slice(main.indexOf('async function transactionsView'));
    expect(view.slice(0, view.indexOf('const rows'))).not.toContain('let txFiltre');
  });

  it('toplam ve sayaç filtrelenmiş kümeyi yansıtır', () => {
    // Filtreyi yok sayan bir toplam yanlış okumaya yol açardı.
    expect(main).toContain('const olculen = gorunen.filter');
    expect(main).toContain('const body = gorunen.map');
    // "102 içinden" belirsizdi; bölü işareti paydayı zaten anlatıyor.
    expect(main).toMatch(/\/ \$\{String\(rows\.length\)\} kayıt/);
  });

  it('metrik kutuları filtreden etkilenmez', () => {
    // Kutular portföyün özeti; filtreye bağlanırlarsa aynı kutu ekrandan
    // ekrana farklı şey anlatır.
    expect(main).toContain("metric('Açık Pozisyon', String(open.length)");
  });

  it('filtre sonucu boşsa sebebi yazar', () => {
    expect(main).toContain('Bu filtreye uyan işlem yok');
  });

  it('başlangıç ve son değerler tek hücrede toplanır', () => {
    // Ayrı sütun olsalar tablo kapsayıcısını aşıyor, işlem düğmeleri ekran
    // dışında kalıyordu. Fiyat ile maliyet/değer aynı deseni kullanır.
    expect(main).toContain("class: 'stack-from'");
    expect(main).toContain("class: 'stack-to'");
    expect(css).toContain('.stack-from {');
  });

  it('fon adı yazılmaz, üzerine gelince çıkar', () => {
    // Kısaltılmış ad ayırt edici değildi (DOH da THF de "TERA PORTFÖY…")
    // ama sütunun yarısını yiyor ve satırı iki katına çıkarıyordu.
    expect(main).toContain("el('td', { title: t.fundTitle ?? t.fundCode }");
    expect(css).toContain('.tx-table td[title]');
  });

  it('satırın sonucu soldaki şeritte görünür', () => {
    // Dönemsel Getiri'deki ay satırıyla aynı dil.
    expect(main).toContain("'tx-loss' : 'tx-gain'");
    expect(css).toContain('.tx-gain td:first-child');
    expect(css).toContain('.tx-loss td:first-child');
  });

  it('gerçekleşmiş satış soluk yazılır', () => {
    // Kapanmış kayıt takip edilecek bir şey değil; ileri tarihli satış ise
    // hâlâ açık, o solmamalı.
    expect(main).toContain("t.sellDate !== null && t.sellDate <= bugun");
    expect(css).toContain('.tx-closed { opacity:');
  });

  it('ileri tarihli satış açık olduğunu belli eder', () => {
    // Tarih dolu ama pozisyon henüz kapanmadı; ayrı Durum sütunu olmadan da
    // bu ayrım görünmeli.
    expect(main).toContain("badge('Bekliyor', 'pending')");
  });

  it('ölçülemeyen işlem toplama katılmaz', () => {
    expect(main).toContain("gorunen.filter((t) => t.cost !== null)");
  });

  it('toplam satırında yüzde yazmaz', () => {
    // O sütun toplam değil oran; payda brüt alım olurdu ve şişik çıkardı.
    expect(main).toMatch(/Yüzde yok: bu sütun toplam değil oran/);
  });
});

describe('FIFO satış', () => {
  it('satışta adet sorulur, satır seçilmez', () => {
    expect(main).toContain('function openSellModal');
    expect(main).toContain("field('Adet', units");
    expect(main).toContain("api('/api/transactions/sell'");
  });

  it('pencere kurulu gelmez: havuz seçili değil, satış düğmesi kapalı', () => {
    // Alfabetik ilk havuzla ve tam adetle açılsaydı "AFS'nin tamamını sat"
    // hazır olurdu; yanlış tarihe basmak yeterdi.
    const sell = main.slice(main.indexOf('function openSellModal'),
                            main.indexOf('function openTransactionModal'));
    expect(sell).toMatch(/let secili = '';/);
    expect(sell).toContain("disabled: 'true'");
    expect(sell).toContain('submit.disabled = false;');
    // Boş adet artık "hepsi" demek değil: satır seçilerek ya da elle yazılarak
    // bir sayı girilmeden satış açılmıyor.
    expect(sell).toContain("submit.disabled = secili === '' || !(Number(units.value) > 0);");
  });

  it('satış tabloda değil panel başlığında girilir', () => {
    // Satış bir alım kaydına ait değil, havuza yapılıyor. Satıra iliştirilince
    // 01.09'un düğmesi 24.08'i satıyordu; yalnız en eski satıra koymak da
    // "havuzdan satıyorsak neden tek satırda?" sorusunu bırakıyordu.
    const gövde = main.slice(main.indexOf('const body = gorunen.map'),
                             main.indexOf('async function portfolioView'));
    expect(gövde).not.toContain("iconButton('sell'");
    expect(main).toContain("'Satış Ekle'");
    expect(main).toContain("openSellModal(havuzlar, reload)");
  });

  it('alış ve satış aynı yerde, simetrik adlarla', () => {
    // Biri tablodan biri başlıktan girilseydi aynı işin iki yarısı iki ayrı
    // yere dağılırdı. "İşlem Ekle" adı da yalnız alım eklerken geneldi.
    expect(main).toContain("'Alış Ekle'");
    expect(main).not.toContain("'İşlem Ekle'"); // pencere başlığı ve düğme dahil
    expect(main).toContain("class: 'panel-actions'");
    expect(css).toContain('.panel-actions');
  });

  it('havuzu boşaltan çarpı çizilmez', () => {
    // Satış bir havuza yapılır; seçimsiz duruma dönmenin anlamı yok. Çarpı
    // yine de çizilseydi basıldığında hiçbir şey yapmayan bir düğme olurdu.
    expect(main).toContain('clearable?: boolean;');
    expect(main).toContain('if (secili && opts.clearable !== false)');
    const sell = main.slice(main.indexOf('function openSellModal'),
                            main.indexOf('function openTransactionModal'));
    expect(sell).toContain('clearable: false,');
  });

  it('havuz seçimi aranabilir listeden, açık adediyle', () => {
    const sell = main.slice(main.indexOf('function openSellModal'),
                            main.indexOf('function openTransactionModal'));
    expect(sell).toContain('comboFilter(');
    expect(sell).toMatch(/hint: `\$\{toplam\(k\)/);
    // Havuz değişince valör de değişir: fon başkaysa T+n başka.
    expect(sell).toContain('valorYukle();');
  });

  it('açık kayıtta satış alanı yok', () => {
    // Satış kendi eylemi; açık kayda buradan tarih yazmak FIFO sırasını
    // atlamanın yolu olurdu. Alan bulunmayınca kural savunulacak bir şey
    // değil, yapının kendisi.
    expect(main).toContain("existing !== null && existing.sellDate !== null");
  });

  it('satılmış kaydın tarihi düzeltilebilir', () => {
    // Yanlış girilmiş tarihi düzeltmenin veya satışı geri almanın başka yolu
    // yok.
    expect(main).toMatch(/Boşaltılırsa pozisyon yeniden açılır/);
  });

  it('sunucu tarafında da atlama engellenir', () => {
    // Arayüzde alan olmasa da doğrudan API'ye istek atılabilir.
    const idx = readFileSync(new URL('../src/server/index.ts', import.meta.url), 'utf8');
    expect(idx).toContain('fifoBlocker(');
    expect(idx).toMatch(/İlk alınan ilk satılır/);
  });

  it('bölünmüş kayıt listede belli olur', () => {
    // Kullanıcının yazmadığı bir satırın nereden geldiği görünmeli.
    expect(css).toContain('.split-mark');
    // İki parça ayrı etiket: biri kullanıcının girdiği küçülmüş kayıt, diğeri
    // makinenin açtığı artık. Tek etiketle hangisinin ne olduğu okunmuyordu.
    expect(main).toContain("t.splitRole === 'parent' ? 'Bölündü' : 'Kalan'");
    expect(css).toContain('.split-parent');
    expect(css).toContain('.split-remainder');
    // "20.728" görüp "35.114 nereye gitti?" diye sorulmasını engelleyen bilgi.
    expect(main).toMatch(/paylık alımın /);
  });

  it('kuralın nasıl işlediği pencerede yazar', () => {
    expect(main).toMatch(/ilk alım bitmeden sonrakine/);
  });

  it('alım listesi hem seçici hem önizleme', () => {
    // 50.000 satınca ortaya 20.728 ve 14.386 çıkıyor; ikisi de kullanıcının
    // yazmadığı sayılar. Liste bunu önden gösteriyor; satıra basmak da adedi
    // o alıma kadar topluyor, böylece sayıyı kullanıcı hesaplamıyor.
    const sell = main.slice(main.indexOf('function openSellModal'),
                            main.indexOf('function openTransactionModal'));
    expect(sell).toContain("class: 'fifo-plan'");
    expect(sell).toMatch(/açık kalır/);
    expect(sell).toContain("'Seç'");
    expect(sell).toContain("'Bu alıma kadar sat'");
    expect(sell).toContain('units.value = String(hedef)');
    expect(css).toContain('.fifo-part');
    // Satır tıklanabilir: tarayıcı varsayılanları sıfırlanmazsa metin ortalanır.
    expect(css).toMatch(/\.fifo-row \{[^}]*text-align: left/);
    // Düğme içinde düğme geçersiz HTML; satır role taşıyan bir kutu olmalı.
    expect(sell).toContain("role: 'button', tabindex: '0'");
    expect(sell).toMatch(/e\.key === 'Enter' \|\| e\.key === ' '/);
  });

  it('her lotun kâr/zararı ve oranı görünür', () => {
    const sell = main.slice(main.indexOf('function openSellModal'),
                            main.indexOf('function openTransactionModal'));
    expect(sell).toContain("class: 'fifo-gain'");
    expect(sell).toContain("class: 'fifo-pct'");
    expect(css).toContain('.fifo-gain');
    // Sütun lotun tamamına ait; seçime göre değişseydi adet yazarken sayı
    // oynar ve "hangi alım ne durumda" okunamazdı.
    expect(sell).toContain('lot.gain === null');
  });

  it('satış ne kadar kâr/zarar gerçekleştiriyor yazılır', () => {
    const sell = main.slice(main.indexOf('function openSellModal'),
                            main.indexOf('function openTransactionModal'));
    expect(sell).toContain("'fifo-row fifo-total'");
    expect(sell).toContain("'Gerçekleşecek'");
    // Kısmi satışta gerçekleşen kısım lot toplamından az; fark tam o satırda
    // yazılmazsa satırlar toplama uymuyor görünür.
    expect(sell).toContain('const parcaKz =');
    expect(sell).toContain('${parcaKz === null');
    // Ölçülemeyen lot varsa toplam verilmez: eksiği sıfır saymak yanlış bir
    // "şu kadar kazanacaksın" üretirdi.
    expect(sell).toContain('const eksik = adimlar.some(');
    expect(sell).toContain('bazı alımlar değerlenemedi');
  });

  it('işaretli sayı metni ve kutusu tek biçimden gelir', () => {
    // İki ayrı biçimlendirme olsaydı cümle içindeki tutar ile sütundaki tutar
    // farklı hane sayısıyla yazılabilirdi.
    expect(main).toContain('function signedText');
    expect(main).toContain('[signedText(raw, suffix)]');
  });

  it('seçilen satır geri alınabilir', () => {
    const sell = main.slice(main.indexOf('function openSellModal'),
                            main.indexOf('function openTransactionModal'));
    expect(sell).toContain("class: 'fifo-undo'");
    // Etiket yaptığının tamamını söylemeli: sonraki alımlar da bırakılıyor.
    expect(sell).toContain("title: 'Buradan itibaren seçimi kaldır'");
    // FIFO sırası yüzünden ortadaki alım tek başına çıkarılamaz; iptal bir
    // önceki birikime döner.
    expect(sell).toContain('units.value = oncekiBirikim > 0 ? String(oncekiBirikim)');
    expect(sell).toContain('e.stopPropagation();');
    expect(css).toContain('.fifo-undo');
  });

  it('çift gönderim engellenir', () => {
    // Gerçekten oldu: tek satış denemesinde iki satış kaydı açıldı, 50.000
    // yerine 100.000 satıldı. Sunucu ayıramaz — iki istek de meşru; çift
    // gönderimi olanaksız kılmak gönderen tarafın işi.
    expect(main).toContain('function tekGonderim');
    expect(main).toMatch(/if \(ucusta\) return;\s*\n\s*ucusta = true;\s*\n\s*submit\.disabled = true;/);
    // Hatadan sonra yeniden denenebilmeli, yoksa düzeltmek imkânsız olurdu.
    expect(main).toMatch(/ucusta = false;\s*\n\s*submit\.disabled = false;/);
    // Kayıt açan bütün formlar aynı kilidi kullanmalı; biri dışarıda kalırsa
    // aynı açık orada sürer. Giriş ve parola ekranları hariç: onlarda ikinci
    // istek yeni bir kayıt açmıyor.
    expect(main.match(/tekGonderim\(form, submit, status,/g)?.length).toBe(4);
    // Tek meşru submit dinleyicisi yardımcının kendisi; başka yerde kalmamalı.
    const disarisi = main.replace(
      main.slice(main.indexOf('function tekGonderim'), main.indexOf('function sadeceSayi')), '');
    expect(disarisi).not.toMatch(/form\.addEventListener\('submit'/);
  });

  it('adet alanına harf girilemez', () => {
    // type=number "e" kabul ediyor; yazılınca value boş dönüyor ve alım
    // listesi sebepsiz kayboluyordu. İki formda da aynı koruma.
    expect(main).toContain('function sadeceSayi');
    expect(main).toContain('sadeceSayi(units);');
    expect(main).toContain('sadeceSayi(f.units);');
    expect(main).toMatch(/\['e', 'E', '\+', '-'\]\.includes\(e\.key\)/);
    // Yapıştırma da aynı yoldan giriyor.
    expect(main).toContain("input.addEventListener('paste'");
  });

  it('havuzdan fazla adet yazılamaz', () => {
    // Sınırsızken planFifoSale hata atıyor, liste boşalıyor ve kullanıcı neyi
    // yanlış yaptığını göremiyordu.
    const sell = main.slice(main.indexOf('function openSellModal'),
                            main.indexOf('function openTransactionModal'));
    expect(sell).toContain('if (secili !== \'\' && Number(units.value) > ust) units.value = String(ust);');
    expect(sell).toContain('units.max = String(toplam(v));');
    expect(sell).toContain("min: '1'");
  });

  it('gösterim adetten türetilir, ayrı seçim durumu tutulmaz', () => {
    // İki kaynak olsaydı elle yazılan sayı ile vurgulu satırlar ayrışır,
    // ekranda geride kalmış bir seçim kalırdı.
    const sell = main.slice(main.indexOf('function openSellModal'),
                            main.indexOf('function openTransactionModal'));
    expect(sell).not.toMatch(/let secililer|const secililer/);
    expect(sell).toContain('const adim = adimlar.find((a) => a.id === lot.id);');
  });

  it('arayüzün içe aktardığı her modül servis ediliyor', () => {
    // Bu liste bir izin listesi: eksik kalan modül 404 döner, sayfa hiç
    // açılmaz. Hata görsel değil, boş ekran — testin yakalaması gerekiyor.
    const server = readFileSync(new URL('../src/server/index.ts', import.meta.url), 'utf8');
    const yollar = [...main.matchAll(/^import .* from '\.\/([\w-]+)\.js';$/gm)]
      .map((m) => m[1] ?? '');
    expect(yollar.length).toBeGreaterThan(1);
    for (const y of yollar) {
      expect(server, `${y}.js STATIC listesinde yok`).toContain(`'/${y}.js':`);
    }
  });

  it('önizleme ile satış aynı hesabı kullanır', () => {
    // İki ayrı FIFO uygulaması olsaydı önizleme ile sonuç sessizce ayrışırdı.
    const fifo = readFileSync(new URL('../src/fifo.ts', import.meta.url), 'utf8');
    expect(fifo).toContain('export function planFifoSale');
    expect(fifo).not.toContain("from 'pg'");
    expect(main).toContain("import { planFifoSale } from './fifo.js'");
    const repo = readFileSync(new URL('../src/server/repository.ts', import.meta.url), 'utf8');
    expect(repo).toContain("from '../fifo.js'");
    expect(repo).not.toContain('export function planFifoSale');
  });

  it('satış penceresinde de valör hesabı çalışır', () => {
    // İşlem formunda emir tarihi girilince satış tarihi hesaplanıyordu; satış
    // kendi penceresine taşınınca bu davranış geride kalmıştı. Aynı yardımcıyı
    // kullanmak iki yerin ayrışmasını engelliyor.
    expect(main).toContain('function linkValorDates');
    const sell = main.slice(main.indexOf('function openSellModal'),
                            main.indexOf('function openTransactionModal'));
    expect(sell).toContain('linkValorDates(orderDate, sellDate');
    expect(sell).toContain("api(`/api/settlement?fundCode=");
  });
});

describe('yüzde sütunları', () => {
  it('başlığında % olan sütunda hücrede tekrarlanmaz', () => {
    // "K/Z %" başlığı altında "+0,37%" yazmak birimi iki kez söylüyordu.
    expect(main).toContain("signed(t.gainPct, '')");
    expect(main).toContain("signed(r.returnPct, '')");
    expect(main).toContain("signed(r.realizedPct, '')");
  });

  it('başlığında % olmayan sütunda işaret kalır', () => {
    // Takip Listem'in başlığı yalnız "Günlük"; orada birim hücrede durmalı.
    expect(main).toContain('signed(r.dailyReturnPct)]');
    // Satış penceresindeki lot listesinin hiç başlığı yok: birimi söyleyen
    // başka bir şey olmadığı için işaret değerin sonunda durur.
    expect(main).toContain("signed(lot.gainPct, '%')");
  });
});

describe('panel özeti', () => {
  it('bugünkü getiri sayı olarak yazar', () => {
    // Değer yalnız grafikte bar olarak çiziliyordu, sayı olarak yoktu.
    expect(main).toContain("metric(\n        'Bugünkü Getiri',");
  });

  it('toplam kazanç kapananları da içerir', () => {
    expect(main).toContain("metric('Toplam Kazanç'");
    expect(main).toMatch(/kapanan dahil/);
  });

  it('portföy yoksa alt satır da susar', () => {
    // "— / 26 fon" çelişkili okunurdu.
    expect(main).toContain('p !== null && typeof m.openLots');
  });

  it('panelde kutu sayısı dörtte kalır', () => {
    const panel = main.slice(main.indexOf('async function dashboardView'));
    const grid = panel.slice(panel.indexOf("class: 'metric-grid'"), panel.indexOf('watchlistToggle'));
    expect(grid.match(/metric\(/g)?.length).toBe(4);
  });
});

describe('dağılım ekranı', () => {
  it('Portföyüm ile Kapananlar arasında kendi menüsü var', () => {
    expect(main).toContain("{ id: 'allocation', label: 'Dağılım', adminOnly: false");
  });

  it('ağırlığın para üzerinden ölçüldüğü ekranda yazılı', () => {
    expect(main).toMatch(/Ağırlık güncel değer üzerinden hesaplanır, fon sayısı üzerinden değil/);
  });

  it('yüzdeler Türkçe ondalıkla yazılır', () => {
    // toFixed İngilizce ondalık üretiyor; aynı sütunda "%61.6" ile "%100,0"
    // yan yana düşüyordu.
    expect(main).toContain('function pct(');
    expect(main).not.toMatch(/`%\$\{[^}]*toFixed/);
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

describe('işlem notu', () => {
  it('alan isteğe bağlı ve sınırı paylaşılan sabitten gelir', () => {
    // İki ayrı sabit tutulsaydı biri değişince diğeri sessizce geride kalırdı:
    // arayüz 200'de keser, sunucu 500'e izin verir gibi.
    const limits = readFileSync(new URL('../src/limits.ts', import.meta.url), 'utf8');
    expect(limits).toContain('export const NOTE_MAX');
    expect(main).toContain("import { NOTE_MAX } from './limits.js'");
    const server = readFileSync(new URL('../src/server/index.ts', import.meta.url), 'utf8');
    expect(server).toContain("from '../limits.js'");
    expect(server).toContain("optText(body, 'note', NOTE_MAX)");
    // Zorunlu değil: required taşımamalı.
    expect(main).toMatch(/note: el\('input', \{ maxlength: String\(NOTE_MAX\)/);
    expect(main).not.toMatch(/note: el\('input', \{[^}]*required/);
  });

  it('not ayrı sütun açmaz, fon kodunun altında durur', () => {
    // Tablo on bir sütunlu ve zaten dar; on ikinci sütun kayıtların çoğunda
    // boş dururdu.
    expect(main).toContain("class: 'tx-note', title: t.note");
    expect(css).toContain('.tx-note');
    // Uzun not sütunu genişletmemeli, kırpılmalı.
    expect(css).toMatch(/\.tx-note \{[^}]*text-overflow: ellipsis/);
  });

  it('yalnız boşluktan oluşan not boş sayılır', () => {
    // '' ile null iki ayrı boş durum üretirdi ve okuyan tarafın ikisini de
    // kontrol etmesi gerekirdi.
    const http = readFileSync(new URL('../src/server/http.ts', import.meta.url), 'utf8');
    expect(http).toContain("return kirpik === '' ? null : kirpik;");
  });
});
