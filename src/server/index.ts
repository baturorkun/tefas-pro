/**
 * tefas-pro uygulama sunucusu.
 *
 *   pnpm serve
 *
 * Tek Node süreci hem JSON API'yi hem statik dosyaları servis eder. nginx
 * kullanılmaz: iki süreç yerine bir süreç, ve oturum çerezi API ile arayüzün
 * aynı origin'inden gelir.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import type pg from 'pg';

import { collectSingleFund } from '../collector.js';
import { FintablesClient } from '../sources/fintables.js';
import { makePool } from '../db/pool.js';
import { currentVersion } from '../version.js';
import { NOTE_MAX } from '../limits.js';
import { toolEtiket } from '../assistant-labels.js';
import { ask, chatbotFromEnv } from './assistant.js';
import type { Content } from '../sources/gemini.js';
import { isValidHoliday } from '../settlement.js';
import {
  clearCookie,
  generatePassword,
  readCookie,
  sessionCookie,
  verifyPassword,
} from './auth.js';
import {
  asRecord,
  matchPath,
  optDate,
  optString,
  optText,
  openSse,
  readJson,
  reqDate,
  reqNumber,
  reqString,
  sendJson,
} from './http.js';
import {
  addBank,
  addToWatchlist,
  allocation,
  cashCalendar,
  duplicateTransaction,
  fundOptions,
  stockAllocation,
  fundDetail,
  readUserSetting,
  benchmarkCode,
  clearUserSetting,
  closedPositions,
  createSession,
  createTransaction,
  createUser,
  dashboard,
  deleteBank,
  deleteTransaction,
  changeOwnPassword,
  fifoBlocker,
  findSessionContext,
  portfolioHeadline,
  findUserById,
  setImpersonation,
  clearImpersonation,
  fundDaily,
  konusmaAc,
  konusmaMesajlari,
  konusmaSil,
  konusmalar,
  addSystemFund,
  konusmayaYaz,
  listSystemFunds,
  marketRanks,
  pendingPurchases,
  removeSystemFund,
  updateProfile,
  findUserByUsername,
  fundHasData,
  fundValor,
  getTransaction,
  holidays,
  ingestRuns,
  listBanks,
  listTransactions,
  listUsers,
  listWatchlist,
  normalizeBankName,
  periodReturns,
  portfolioPerformance,
  portfolioSummary,
  removeFromWatchlist,
  revokeSession,
  revokeUserSessions,
  sellFifo,
  trackFundForUser,
  type AppUser,
  type TransactionInput,
  updateTransaction,
  updateUser,
  userBenchmark,
  writeSetting,
  writeUserSetting,
} from './repository.js';

const COOKIE_NAME = 'tefas_session';
const PORT = Number(process.env.PORT ?? 8282);
/**
 * Dinlenecek adres. Yerelde 127.0.0.1 doğrudur, ama CONTAINER İÇİNDE 127.0.0.1
 * yalnız container'ın kendisini kapsar ve servis dışarıdan erişilemez olur.
 * Container'da 0.0.0.0 verilir; host'a açılan yüzeyi podman'ın port yayını
 * sınırlar (127.0.0.1:PORT olarak yayınlanır).
 */
const HOST = process.env.HOST ?? '127.0.0.1';
/** Kullanıcı başına günlük soru sınırı. */
const ASSISTANT_DAILY_LIMIT = Number(process.env['CHATBOT_DAILY_LIMIT'] ?? 50);
const SESSION_TTL = Number(process.env.SESSION_TTL ?? 60 * 60 * 12);
const SECURE_COOKIE = process.env.SECURE_COOKIE === 'true';

/**
 * Statik dosyalar sabit bir eşlemeden servis edilir. İstekten gelen yol dosya
 * sistemine hiç dokunmaz, böylece yol aşımı (`../`) mümkün değildir.
 */
// Tarayıcıya giden SPA derlenmiş dosyadan servis edilir; sunucunun kendisi
// tsx ile kaynaktan koşar. İkisi ayrı olduğu için `dist/main.js` bayatlarsa
// backend yeniyken arayüz eski uçları çağırmayı sürdürür ve hata anlaşılmaz
// olur — bu yüzden `pnpm serve` önce build eder.
const STATIC: Record<string, { file: string; type: string }> = {
  '/': { file: 'public/index.html', type: 'text/html; charset=utf-8' },
  '/index.html': { file: 'public/index.html', type: 'text/html; charset=utf-8' },
  '/app.js': { file: 'dist/main.js', type: 'text/javascript; charset=utf-8' },
  // main.js bunları içe aktarıyor; listede olmazsa modül yüklenemez ve sayfa
  // hiç açılmaz — boş ekran, konsolda 404. Tablo bir izin listesi, dizin
  // servis edilmiyor. Yeni bir paylaşılan modül eklenince buraya da girmeli;
  // ui-conventions testi bunu kontrol ediyor.
  '/settlement.js': { file: 'dist/settlement.js', type: 'text/javascript; charset=utf-8' },
  '/fifo.js': { file: 'dist/fifo.js', type: 'text/javascript; charset=utf-8' },
  '/limits.js': { file: 'dist/limits.js', type: 'text/javascript; charset=utf-8' },
  '/assistant-labels.js': {
    file: 'dist/assistant-labels.js', type: 'text/javascript; charset=utf-8',
  },
  '/sse.js': { file: 'dist/sse.js', type: 'text/javascript; charset=utf-8' },
  '/user-fields.js': {
    file: 'dist/user-fields.js', type: 'text/javascript; charset=utf-8',
  },
  '/styles.css': { file: 'src/styles.css', type: 'text/css; charset=utf-8' },
};

/**
 * İlk admin. Kullanıcı adı "admin" olması bir ayrıcalık taşımaz; yetkiyi type
 * belirler. Parola ADMIN_INITIAL_PASSWORD'den gelir; verilmemişse rastgele
 * üretilip bir kez log'a yazılır ve ilk girişte değiştirilmesi istenir —
 * koda gömülü sabit bir parola bırakılmaz.
 */
export async function ensureAdminUser(pool: pg.Pool): Promise<void> {
  const existing = await pool.query<{ n: string }>(
    "SELECT count(*) AS n FROM app_user WHERE type = 'admin'",
  );
  if (Number(existing.rows[0]?.n ?? 0) > 0) return;

  const fromEnv = process.env.ADMIN_INITIAL_PASSWORD;
  // Verilmiş ama geçersiz bir parola sessizce rastgele parolaya düşerse, kimsenin
  // giremediği bir hesap oluşur ve log "ADMIN_INITIAL_PASSWORD ile verildi" diyerek
  // yanıltır. Yanlış yapılandırma gürültülü başarısız olmalı.
  if (fromEnv !== undefined && fromEnv !== '' && fromEnv.length < 8) {
    throw new Error(
      `ADMIN_INITIAL_PASSWORD en az 8 karakter olmalı (${String(fromEnv.length)} verildi). ` +
        'Boş bırakılırsa rastgele bir parola üretilir.',
    );
  }
  const password = fromEnv && fromEnv.length >= 8 ? fromEnv : generatePassword();
  await createUser(pool, {
    username: 'admin',
    password,
    type: 'admin',
    mustChange: !fromEnv,
  });
  if (fromEnv) {
    console.log('İlk admin kullanıcısı oluşturuldu (parola ADMIN_INITIAL_PASSWORD ile verildi).');
  } else {
    console.log(`İlk admin kullanıcısı oluşturuldu. Geçici parola: ${password}`);
    console.log('Bu parola bir daha gösterilmez; ilk girişte değiştirilmesi istenecek.');
  }
}

/**
 * Fon kodu dim_fund'da yoksa fintables evreninden çekilip yazılır; evrende de
 * yoksa istek reddedilir. Hem portföy hem takip listesi girişleri buradan
 * geçer, ikisi de dim_fund'a foreign key ile bağlı.
 *
 * Takip listesine yazmaz: liste kullanıcıya ait, bu fonksiyonun kullanıcısı
 * yok. Çağıran taraf gerekiyorsa trackFundForUser ile ekler.
 */
async function ensureFundKnown(
  pool: pg.Pool,
  client: FintablesClient,
  fundCode: string,
): Promise<void> {
  const known = await pool.query('SELECT 1 FROM dim_fund WHERE fund_code = $1', [fundCode]);
  if ((known.rowCount ?? 0) > 0) return;
  const universe = await client.fundUniverse();
  const fund = universe.find((f) => f.code === fundCode);
  if (!fund) throw new Error(`Fon kodu bulunamadı: ${fundCode}`);
  await pool.query(
    `INSERT INTO dim_fund (fund_code, title, fund_type, umbrella_type, management_company_id, is_byf)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (fund_code) DO NOTHING`,
    [fund.code, fund.title, fund.fundType, fund.umbrellaType, fund.managementCompanyId, fund.isByf],
  );
}

/**
 * Toplaması süren fonlar. Aynı fonu iki kullanıcı arka arkaya eklerse ikinci
 * istek yeni bir koşum başlatmaz: aynı veriyi iki kez çekmek kaynakta gereksiz
 * yük, veritabanında da iki paralel upsert demek olurdu.
 *
 * Süreç belleğinde: tek sunucu süreci var ve kayıt kaybı zararsız — kaçan fon
 * zamanlanmış taramada toplanır.
 */
const collecting = new Set<string>();

/**
 * Takip listesine eklenen fon için tek fonluk toplamayı arkada başlatır.
 *
 * İstek beklenmez: yeni bir fonun on iki aylık para akışı çekiliyor ve bu
 * saniyeler sürüyor. Hata yutulmaz ama isteği de düşürmez — fon listede kalır,
 * verisi zamanlanmış koşumda gelir. Ekleme kullanıcının kararı, toplama onun
 * yan etkisi.
 */
function triggerFundCollection(pool: pg.Pool, client: FintablesClient, fundCode: string): void {
  if (collecting.has(fundCode)) return;
  collecting.add(fundCode);
  void (async () => {
    try {
      if (await fundHasData(pool, fundCode)) return;
      const { runId, upserted } = await collectSingleFund(pool, client, fundCode);
      console.log(`Tek fon toplandı: ${fundCode}, ${String(upserted)} satır (run #${String(runId)})`);
    } catch (err) {
      console.error(`Tek fon toplanamadı: ${fundCode}: ${String(err).split('\n')[0]}`);
    } finally {
      collecting.delete(fundCode);
    }
  })();
}

/**
 * Benchmark olarak kaydedilecek fon kodunu hazırlar.
 *
 * Ölçüt "bizde verisi var mı" değil, "TEFAS evreninde böyle bir fon var mı".
 * Önceki hali yalnız toplanan fonları kabul ediyordu; o zaman serbest metin
 * alanının bir anlamı kalmıyordu, çünkü kullanıcı zaten yalnız bildiğimiz
 * fonlardan birini yazabiliyordu.
 *
 * Takip listesine fon eklemekle aynı akış: fon dim_fund'da yoksa evrenden
 * çekilip yazılır, sonra toplaması arkada başlatılır. Fon ayara yazıldığı anda
 * analytics.tracked_fund'a da girer, yani bundan sonraki her taramada toplanır.
 *
 * Evrende olmayan kod reddedilir: kaydedilseydi karşılaştırma sütunu kalıcı
 * olarak boş kalır ve sebebi görünmezdi.
 */
async function prepareBenchmark(
  pool: pg.Pool,
  client: FintablesClient,
  raw: unknown,
): Promise<string> {
  const code = String(raw).trim().toUpperCase();
  if (code === '') throw new Error('Benchmark fon kodu boş olamaz.');
  await ensureFundKnown(pool, client, code);
  return code;
}

function readTransactionInput(body: Record<string, unknown>): TransactionInput {
  // Ya adet ya tutar. Tutarla girilen alım pasif bekler: TEFAS'ta emir
  // tutarla veriliyor ve kaç pay alındığı fiyat açıklanınca belli oluyor.
  const units = body['units'] === null || body['units'] === undefined || body['units'] === ''
    ? null : reqNumber(body, 'units');
  const orderAmount =
    body['orderAmount'] === null || body['orderAmount'] === undefined || body['orderAmount'] === ''
      ? null : reqNumber(body, 'orderAmount');
  if (units === null && orderAmount === null) {
    throw new Error('Adet ya da tutar girilmeli.');
  }
  if (units !== null && units <= 0) throw new Error('`units` sıfırdan büyük olmalıdır.');
  if (orderAmount !== null && orderAmount <= 0) {
    throw new Error('Tutar sıfırdan büyük olmalıdır.');
  }
  const tradeDate = reqDate(body, 'tradeDate');
  const sellDate = optDate(body, 'sellDate');
  if (sellDate !== null && sellDate < tradeDate) {
    throw new Error('Satış tarihi alış tarihinden önce olamaz.');
  }
  // Adedi belli olmayan pozisyon satılamaz; veritabanında da kısıt var ama
  // hata mesajı burada anlaşılır oluyor.
  if (units === null && sellDate !== null) {
    throw new Error('Adedi belli olmayan alım satılamaz; önce adedi girin.');
  }
  return {
    fundCode: reqString(body, 'fundCode').toUpperCase(),
    platform: reqString(body, 'platform'),
    tradeDate,
    units,
    orderAmount,
    sellDate,
    note: optText(body, 'note', NOTE_MAX),
    // Emir tarihleri isteğe bağlı; değerlemeye girmez, kayıt için tutulur.
    buyOrderDate: optDate(body, 'buyOrderDate'),
    sellOrderDate: optDate(body, 'sellOrderDate'),
  };
}

/**
 * Statik dosyalar. Adları sabit (`/app.js`), içerikleri her derlemede
 * değişiyor.
 *
 * Önbellek başlığı olmadan tarayıcı kendi tahminiyle önbellekliyor ve
 * sunucuya hiç sormadan eski dosyayı veriyordu: deploy edilen özellik
 * görünmüyor, kimse de sebebini anlamıyor — ölçüldü, yeni kodu servis eden
 * sunucudan tarayıcıya eski JS gidiyordu.
 *
 * `no-cache` "önbellekleme" demek değil, "her seferinde sor" demek. ETag ile
 * birlikte dosya değişmediyse 304 dönüyor, gövde tekrar inmiyor; değiştiyse
 * yeni içerik geliyor. Hash içerikten üretiliyor, zaman damgasından değil:
 * derleme aynı çıktıyı ürettiğinde ETag da aynı kalsın.
 */
function serveStatic(res: ServerResponse, path: string, req: IncomingMessage): boolean {
  const entry = STATIC[path];
  if (!entry) return false;
  try {
    const body = readFileSync(join(process.cwd(), entry.file));
    const etag = `"${createHash('sha1').update(body).digest('base64url').slice(0, 22)}"`;
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, { ETag: etag, 'Cache-Control': 'no-cache' }).end();
      return true;
    }
    res.writeHead(200, {
      'Content-Type': entry.type,
      'Content-Length': body.length,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache',
      ETag: etag,
    });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
  return true;
}

export function createApp(pool: pg.Pool, client: FintablesClient) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname;
    const method = req.method ?? 'GET';

    if (path === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok\n');
      return;
    }

    if (!path.startsWith('/api/')) {
      if (serveStatic(res, path, req)) return;
      res.writeHead(404).end('not found');
      return;
    }

    const sessionId = readCookie(req.headers.cookie, COOKIE_NAME);
    const ctx = sessionId ? await findSessionContext(pool, sessionId) : null;
    // `user` verisi gösterilen kullanıcı: geçiş varken hedef, yoksa giriş
    // yapanın kendisi. Veri uçlarının hepsi bunu kullanıyor ve geçişten
    // habersiz kalabiliyor — geçişin bütün anlamı da bu.
    const user: AppUser | null = ctx?.user ?? null;
    // Yetki kararları giriş yapana bakar. Geçiş kimseye yeni yetki vermez.
    const oturumSahibi: AppUser | null = ctx === null ? null : ctx.actor ?? ctx.user;

    try {
      // ─── Kimlik doğrulaması gerektirmeyen uçlar ───
      if (path === '/api/login' && method === 'POST') {
        const body = asRecord(await readJson(req));
        const username = reqString(body, 'username');
        const password = reqString(body, 'password');
        const found = await findUserByUsername(pool, username);
        const ok =
          found !== null &&
          found.isActive &&
          (await verifyPassword(password, {
            hash: found.password_hash,
            salt: found.password_salt,
          }));
        if (!found || !ok) {
          // Tek mesaj: kullanıcının var olup olmadığı sızdırılmaz.
          sendJson(res, 401, { error: 'Kullanıcı adı veya parola hatalı.' });
          return;
        }
        const sid = await createSession(pool, found.id, SESSION_TTL);
        sendJson(
          res,
          200,
          // Alanlar elle sayılıyor: `found` parola hash'ini ve tuzunu da
          // taşıyor, olduğu gibi gönderilemez. Bedeli, yeni bir alan
          // eklendiğinde buraya da eklenmesinin unutulabilmesi — ölçüldü,
          // ad soyad eklendi ama giriş yanıtında yoktu ve kenar çubuğu
          // kullanıcı adını göstermeye devam ediyordu. Testle sabitlendi.
          {
            id: found.id,
            username: found.username,
            fullName: found.fullName,
            email: found.email,
            telegram: found.telegram,
            type: found.type,
            mustChangePassword: found.mustChangePassword,
            // Taze giriş hiçbir zaman geçiş değildir. Alan yine de yazılıyor:
            // eksik bırakıldığında `undefined` geliyordu ve arayüz `=== null`
            // ile baktığı için geçiş varmış gibi davranıp çöküyordu.
            actor: null,
          },
          {
            'Set-Cookie': sessionCookie(COOKIE_NAME, sid, {
              secure: SECURE_COOKIE,
              maxAgeSeconds: SESSION_TTL,
            }),
          },
        );
        return;
      }

      if (path === '/api/runtime' && method === 'GET') {
        // Sürüm sunucuda türetilir: istemci commit ve derleme zamanını bilemez.
        sendJson(res, 200, { version: currentVersion() });
        return;
      }

      if (path === '/api/me' && method === 'GET') {
        if (!user || ctx === null) {
          sendJson(res, 401, { error: 'Oturum yok.' });
          return;
        }
        // `actor` yalnız geçiş hâlinde dolu. Arayüz sol alttaki kutuyu buna
        // bakarak kuruyor: gizli bir geçiş, yanlış hesapta işlem demek.
        sendJson(res, 200, {
          ...user,
          actor: ctx.actor === null
            ? null
            : { id: ctx.actor.id, username: ctx.actor.username, fullName: ctx.actor.fullName },
        });
        return;
      }

      // ─── Kullanıcı geçişi ───
      //
      // Yetki kararı `oturumSahibi` üzerinden veriliyor: geçiş hâlindeki bir
      // superuser sıradan bir kullanıcı gibi görünür ama geçişi başlatma ve
      // bitirme hakkı hâlâ kendisinindir. `user` üzerinden bakılsaydı geçiş
      // yapan kişi kendi kendini kilitlerdi.
      if (path === '/api/impersonate' && method === 'POST') {
        if (!ctx || sessionId === null || oturumSahibi === null) {
          sendJson(res, 401, { error: 'Oturum gerekli.' });
          return;
        }
        if (oturumSahibi.type !== 'super') {
          sendJson(res, 403, { error: 'Bu işlem için superuser yetkisi gerekir.' });
          return;
        }
        const body = asRecord(await readJson(req));
        const hedefId = Number(body['userId']);
        if (!Number.isInteger(hedefId)) {
          sendJson(res, 400, { error: 'Geçilecek kullanıcı seçilmedi.' });
          return;
        }
        if (hedefId === oturumSahibi.id) {
          // Kendine geçiş yok: istenen şey geçişi bitirmekse yolu DELETE.
          sendJson(res, 400, { error: 'Zaten bu hesaptasınız.' });
          return;
        }
        const hedef = await findUserById(pool, hedefId);
        if (hedef === null || !hedef.isActive) {
          sendJson(res, 404, { error: 'Kullanıcı bulunamadı.' });
          return;
        }
        if (hedef.type === 'super') {
          // Superuser'a geçiş, geçişi bitirme hakkını devretmek olurdu.
          sendJson(res, 403, { error: 'Superuser hesabına geçilemez.' });
          return;
        }
        await setImpersonation(pool, sessionId, hedefId);
        sendJson(res, 200, { ok: true, user: hedef });
        return;
      }

      if (path === '/api/impersonate' && method === 'DELETE') {
        if (!ctx || sessionId === null) {
          sendJson(res, 401, { error: 'Oturum gerekli.' });
          return;
        }
        if (ctx.actor === null) {
          sendJson(res, 400, { error: 'Geçiş hâlinde değilsiniz.' });
          return;
        }
        await clearImpersonation(pool, sessionId);
        sendJson(res, 200, { ok: true, user: ctx.actor });
        return;
      }

      if (path === '/api/logout' && method === 'POST') {
        if (sessionId) await revokeSession(pool, sessionId);
        sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearCookie(COOKIE_NAME) });
        return;
      }

      // ─── Buradan sonrası oturum ister ───
      if (!user) {
        sendJson(res, 401, { error: 'Oturum gerekli.' });
        return;
      }

      // İlk giriş ekranı: kullanıcı az önce o parolayla girdi, mevcut parola
      // sorulmuyor. Bu uç yalnız zorunlu değişiklik içindir.
      if (path === '/api/password' && method === 'POST') {
        const body = asRecord(await readJson(req));
        if (!user.mustChangePassword) {
          sendJson(res, 409, {
            error: 'Parolanız zaten belirlenmiş; Profil ekranından değiştirin.',
          });
          return;
        }
        await updateUser(pool, user.id, { password: reqString(body, 'password') });
        sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearCookie(COOKIE_NAME) });
        return;
      }

      // Kendi profili. Admin uçlarından ayrı: burada kullanıcı yalnız
      // kendine yazıyor ve kimlik oturumdan geliyor, istekten değil.
      if (path === '/api/profile' && method === 'PATCH') {
        const body = asRecord(await readJson(req));
        try {
          // Alanların hepsi isteniyor: kısmi güncelleme, zorunlu bir alanı
          // hiç göndermeyerek boş bırakmanın yolu olurdu.
          const guncel = await updateProfile(pool, user.id, {
            username: reqString(body, 'username'),
            fullName: reqString(body, 'fullName'),
            email: reqString(body, 'email'),
            telegram: optString(body, 'telegram') ?? '',
          });
          sendJson(res, 200, guncel);
        } catch (err) {
          // Çakışan kullanıcı adı kullanıcının düzeltebileceği bir durum;
          // 500 yerine mesajı gösteriliyor.
          sendJson(res, 400, {
            error: err instanceof Error ? err.message : 'Profil güncellenemedi.',
          });
        }
        return;
      }

      // Sonradan parola değiştirme: mevcut parola isteniyor. Açık bırakılmış
      // bir oturumun başına geçen biri, parolayı bilmeden hesabı
      // devralabilirdi.
      if (path === '/api/profile/password' && method === 'POST') {
        const body = asRecord(await readJson(req));
        const oldu = await changeOwnPassword(
          pool, user.id, reqString(body, 'current'), reqString(body, 'password'),
        );
        if (!oldu) {
          sendJson(res, 403, { error: 'Mevcut parola yanlış.' });
          return;
        }
        // Parola değişince kullanıcının TÜM oturumları düşer. Yalnız bu
        // tarayıcının çerezini silmek yetmezdi: parolayı değiştirmenin asıl
        // sebebi çoğu zaman "başkası girmiş olabilir" endişesidir ve o
        // oturum açık kalırdı.
        await revokeUserSessions(pool, user.id);
        sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearCookie(COOKIE_NAME) });
        return;
      }

      if (path === '/api/dashboard' && method === 'GET') {
        // ?onlyOwned=1 — takip listesi fonlarını sıralamadan çıkarır.
        const onlyOwned = url.searchParams.get('onlyOwned') === '1';
        sendJson(res, 200, await dashboard(pool, user.id, onlyOwned));
        return;
      }

      // ─── Takip listesi ───
      // Admin altında değil: her kullanıcı kendi listesini yönetir.
      if (path === '/api/watchlist' && method === 'GET') {
        sendJson(res, 200, await listWatchlist(pool, user.id));
        return;
      }

      if (path === '/api/watchlist' && method === 'POST') {
        const body = asRecord(await readJson(req));
        const fundCode = reqString(body, 'fundCode').toUpperCase();
        const note = body['note'] === undefined || body['note'] === null
          ? null
          : String(body['note']).trim() || null;
        await ensureFundKnown(pool, client, fundCode);
        await addToWatchlist(pool, user.id, fundCode, note);
        triggerFundCollection(pool, client, fundCode);
        // Takip listesi "sahip olmadığım fonlar" demek: açık pozisyonu olan
        // fon listede GÖRÜNMEZ (analytics.watchlist_visible). Kayıt yine de
        // duruyor ve pozisyon kapanınca listeye dönüyor — yani ekleme boşa
        // gitmiyor. Eksik olan haberdi: uç 201 dönüyor, satır yazılıyor, liste
        // onu göstermiyor ve hiçbir yerde sebebi yazmıyordu. Kullanıcı yanlış
        // tıkladığını sanıp tekrar deniyordu.
        const acik = await pool.query(
          `SELECT 1 FROM portfolio_transaction
            WHERE user_id = $1 AND fund_code = $2
              AND (sell_date IS NULL OR sell_date > CURRENT_DATE)`,
          [user.id, fundCode],
        );
        sendJson(res, 201, { fundCode, hidden: (acik.rowCount ?? 0) > 0 });
        return;
      }

      const wlCode = matchPath('/api/watchlist/:code', path);
      if (wlCode !== null && method === 'DELETE') {
        const done = await removeFromWatchlist(pool, user.id, wlCode.toUpperCase());
        sendJson(res, done ? 200 : 404, done ? { ok: true } : { error: 'Takip listesinde yok.' });
        return;
      }

      // Fiyatı henüz açıklanmamış alımlar. Portföy görünümlerine girmiyorlar
      // ve sebebi hiçbir yerde yazmıyordu.
      // Piyasa sıralamaları, istenen pencere için. Ekran iki kez çağırıyor:
      // sol sütun bir pencere, sağ sütun başka bir pencere.
      if (path === '/api/market' && method === 'GET') {
        const raw = url.searchParams.get('days');
        const gun = raw === null ? 7 : Number(raw);
        if (!Number.isFinite(gun)) {
          sendJson(res, 400, { error: 'days sayı olmalı' });
          return;
        }
        sendJson(res, 200, await marketRanks(
          pool, user.id, gun, url.searchParams.get('onlyOwned') === '1',
        ));
        return;
      }

      if (path === '/api/portfolio/pending' && method === 'GET') {
        sendJson(res, 200, await pendingPurchases(pool, user.id));
        return;
      }

      // Portföyüm'ün başlık rakamları. Panel'in kullandığı fonksiyonun aynısı,
      // ayrı bir hesap değil: aynı kullanıcı iki ekranda iki farklı "kâr"
      // görüyordu ve hangisinin doğru olduğu sorulacaktı. /api/dashboard'un
      // tamamını çekmek yerine yalnız bu parça; o uç grafik ve sıralama
      // taşıyor.
      if (path === '/api/portfolio/headline' && method === 'GET') {
        sendJson(res, 200, await portfolioHeadline(pool, user.id));
        return;
      }
      if (path === '/api/portfolio' && method === 'GET') {
        sendJson(res, 200, await portfolioSummary(pool, user.id));
        return;
      }

      if (path === '/api/portfolio/performance' && method === 'GET') {
        const raw = url.searchParams.get('days');
        const days = raw === null ? undefined : Number(raw);
        if (raw !== null && !Number.isFinite(days)) {
          sendJson(res, 400, { error: 'days sayı olmalı' });
          return;
        }
        sendJson(res, 200, await portfolioPerformance(pool, user.id, days));
        return;
      }

      // Tatil listesi ve valör: form tarih hesabını burada yapmaz, veriyi
      // alıp istemcide hesaplar — kullanıcı yazarken anında görsün diye.
      if (path === '/api/settlement' && method === 'GET') {
        const code = url.searchParams.get('fundCode');
        sendJson(res, 200, {
          holidays: await holidays(pool),
          valor: code === null ? null : await fundValor(pool, code),
        });
        return;
      }

      if (path === '/api/closed' && method === 'GET') {
        sendJson(res, 200, await closedPositions(pool, user.id));
        return;
      }

      if (path === '/api/banks' && method === 'GET') {
        sendJson(res, 200, await listBanks(pool));
        return;
      }

      // Kullanıcının kendi tercihleri. Oturumdaki kullanıcıya bağlı: id
      // dışarıdan alınmaz, başkasının ayarı okunamaz veya yazılamaz.
      if (path === '/api/preferences' && method === 'GET') {
        sendJson(res, 200, { benchmark: await userBenchmark(pool, user.id) });
        return;
      }

      if (path === '/api/preferences' && method === 'PUT') {
        const body = asRecord(await readJson(req));
        const raw = body['benchmark'];
        // null: kişisel tercih temizlenir, kullanıcı genel ayara döner.
        if (raw === null) {
          await clearUserSetting(pool, user.id, 'benchmark');
        } else {
          let code: string;
          try {
            code = await prepareBenchmark(pool, client, raw);
          } catch (err) {
            sendJson(res, 400, {
              error: err instanceof Error ? err.message : 'Fon kodu doğrulanamadı.',
            });
            return;
          }
          await writeUserSetting(pool, user.id, 'benchmark', code);
          // Verisi olmayan yeni fon arkada toplanır; karşılaştırma sütunu o
          // bitene kadar boş kalır, bu yüzden istek beklemez.
          triggerFundCollection(pool, client, code);
        }
        sendJson(res, 200, { benchmark: await userBenchmark(pool, user.id) });
        return;
      }

      if (path === '/api/benchmark' && method === 'GET') {
        sendJson(res, 200, { benchmark: (await userBenchmark(pool, user.id)).code });
        return;
      }

      const fonEslesme = /^\/api\/funds\/([A-Za-z0-9]{2,10})$/.exec(path);
      if (fonEslesme !== null && method === 'GET') {
        const d = await fundDetail(pool, user.id, fonEslesme[1] ?? '');
        if (d === null) { sendJson(res, 404, { error: 'Fon bulunamadı.' }); return; }
        sendJson(res, 200, d);
        return;
      }

      // Asistan. Anahtar yoksa uç 503 döner; uygulama ve diğer ekranlar
      // etkilenmez.
      if (path === '/api/assistant' && method === 'POST') {
        const gemini = chatbotFromEnv();
        if (gemini === null) {
          sendJson(res, 503, { error: 'Asistan yapılandırılmamış: CHATBOT_API_KEY yok.' });
          return;
        }
        const body = (await readJson(req)) as Record<string, unknown>;
        const gecmis = body['history'];
        if (!Array.isArray(gecmis) || gecmis.length === 0) {
          sendJson(res, 400, { error: 'Soru gerekli.' });
          return;
        }
        // Günlük sınır: her soru bir dış API çağrısı ve birkaç tool turu.
        // Sayaç kullanıcı ayarlarında tutuluyor; ayrı tablo açmaya değmez ve
        // yeniden başlatmada sıfırlanmaması gerekiyor.
        const bugun = new Date().toISOString().slice(0, 10);
        const kullanim = await readUserSetting<{ date: string; count: number }>(
          pool, user.id, 'assistant.usage',
        );
        const sayi = kullanim !== null && kullanim.date === bugun ? kullanim.count : 0;
        if (sayi >= ASSISTANT_DAILY_LIMIT) {
          sendJson(res, 429, {
            error: `Günlük soru sınırına ulaşıldı (${String(ASSISTANT_DAILY_LIMIT)}).`,
          });
          return;
        }
        await writeUserSetting(pool, user.id, 'assistant.usage',
          { date: bugun, count: sayi + 1 });

        // Buradan sonrası SSE. Tüm reddetme kolları yukarıda ve JSON: durum
        // kodu bir kez yazılıyor, akış başladıktan sonra 429 dönmek mümkün
        // olmazdı.
        const gonder = openSse(res);
        // Sekme kapanırsa döngüyü sürdürmenin anlamı yok: her tur bir dış
        // API çağrısı ve kimsenin okumayacağı bir cevaba para ödeniyor.
        //
        // Dinleme `res` üzerinde, `req` üzerinde değil: istek gövdesi zaten
        // okunmuş durumda ve `req` "close" olayını isteğin tamamlanmasında
        // veriyor — dinleyici bağlandığında olay çoktan geçmiş oluyor.
        // Ölçüldü: `req` ile kopuş hiç yakalanmıyordu, sekme kapandıktan
        // sonra döngü sonuna kadar koşup geçmişe bir konuşma yazıyordu.
        // `res` "close" ise akış sürerken yalnız bağlantı düşünce gelir.
        let kopuk = false;
        res.on('close', () => { kopuk = true; });
        const sonSoru = sonKullaniciMetni(gecmis as Content[]);
        const istenenId = body['conversationId'];
        try {
          // Kullanıcı kimliği oturumdan; istekten değil. Modelin de tool
          // şemalarında böyle bir alanı yok.
          const cevap = await ask(pool, user.id, gemini, gecmis as Content[], {
            onAdim: (a) => {
              if (kopuk) return;
              gonder({
                step: a.tool,
                label: a.tool === null ? null : toolEtiket(a.tool),
                turn: a.tur,
              });
            },
            iptal: () => kopuk,
          });

          // Bağlantı koptuysa kaydedilecek bir cevap yok: döngü yarıda
          // durdu ve elde kalan metin "İstek yarıda bırakıldı." Onu geçmişe
          // yazmak, kullanıcının hiç görmediği bir cevabı konuşmaya koymak
          // olurdu. Ölçüldü: sekme kapanınca geçmişe boş bir konuşma düşüyordu.
          if (kopuk) {
            res.end();
            return;
          }
          // Konuşma cevap alındıktan sonra açılıyor: hata hâlinde geriye
          // boş bir kayıt kalmasın.
          let id = typeof istenenId === 'number' ? istenenId : null;
          if (id === null) id = await konusmaAc(pool, user.id, sonSoru);
          // Başkasının kimliği gönderildiyse yazma reddedilir; o konuşmaya
          // yazmak yerine istemciye "kaydedilmedi" denir.
          const yazildi = await konusmayaYaz(pool, user.id, id, sonSoru, cevap);
          if (!kopuk) gonder({ ...cevap, conversationId: yazildi ? id : null, done: true });
        } catch (err) {
          // Sağlayıcı hatası kullanıcıya olduğu gibi verilmez: anahtar parçası
          // ya da iç ayrıntı taşıyabilir. Günlüğe tam hâli, kullanıcıya kısası.
          console.error('asistan hatası:', err);
          if (!kopuk) gonder({ error: 'Asistan şu an cevap veremiyor.', done: true });
        }
        res.end();
        return;
      }

      if (path === '/api/assistant/conversations' && method === 'GET') {
        sendJson(res, 200, await konusmalar(pool, user.id));
        return;
      }

      const konusmaKimlik = matchPath('/api/assistant/conversations/:id', path);
      if (konusmaKimlik !== null) {
        const id = Number(konusmaKimlik);
        if (!Number.isInteger(id) || id <= 0) {
          sendJson(res, 400, { error: 'Geçersiz konuşma kimliği.' });
          return;
        }
        if (method === 'GET') {
          sendJson(res, 200, await konusmaMesajlari(pool, user.id, id));
          return;
        }
        if (method === 'DELETE') {
          const done = await konusmaSil(pool, user.id, id);
          sendJson(res, done ? 200 : 404, done ? { ok: true } : { error: 'Konuşma bulunamadı.' });
          return;
        }
      }

      // Fon detayının günlük sekmesi. days sınırı repository'de.
      const fundDailyCode = matchPath('/api/funds/:code/daily', path);
      if (fundDailyCode !== null && method === 'GET') {
        const raw = url.searchParams.get('days');
        const gun = raw === null ? undefined : Number(raw);
        if (raw !== null && !Number.isFinite(gun)) {
          sendJson(res, 400, { error: 'days sayı olmalı' });
          return;
        }
        sendJson(res, 200, await fundDaily(
          pool, user.id, decodeURIComponent(fundDailyCode).toUpperCase(), gun,
        ));
        return;
      }

      if (path === '/api/stocks' && method === 'GET') {
        // Varsayılan kapsam yalnız sahip olunan fonlar; anahtar açıkken
        // takip listesi de giriyor.
        sendJson(res, 200, await stockAllocation(
          pool, user.id, url.searchParams.get('watchlist') === '1',
        ));
        return;
      }

      if (path === '/api/allocation' && method === 'GET') {
        sendJson(res, 200, await allocation(pool, user.id));
        return;
      }

      if (path === '/api/periods' && method === 'GET') {
        sendJson(res, 200, await periodReturns(pool, user.id));
        return;
      }

      if (path === '/api/transactions' && method === 'GET') {
        sendJson(res, 200, await listTransactions(pool, user.id));
        return;
      }

      // İşlem formunun fon listesi: serbest metin yerine seçim.
      // Satıştan gelecek paranın banka ve tarih takvimi.
      if (path === '/api/cash' && method === 'GET') {
        sendJson(res, 200, await cashCalendar(pool, user.id));
        return;
      }

      if (path === '/api/funds' && method === 'GET') {
        sendJson(res, 200, await fundOptions(pool));
        return;
      }

      if (path === '/api/transactions' && method === 'POST') {
        const govde = asRecord(await readJson(req));
        const input = readTransactionInput(govde);
        // Aynı kayıt iki kez yazılabiliyordu. Kaydın kendisi başarılıyken
        // sonrasında bir şey patlayınca kullanıcı hata görüp tekrar
        // gönderiyor; yaşandı, on kayıt oluştu. Meşru tekrar da var (aynı
        // gün aynı fondan iki eşit alım), o yüzden engel değil onay:
        // istemci durumu görüp confirmDuplicate ile ısrar edebilir.
        if (govde['confirmDuplicate'] !== true) {
          const ayni = await duplicateTransaction(pool, user.id, input);
          if (ayni > 0) {
            sendJson(res, 409, {
              error: `Bu kayıt zaten var: ${input.fundCode} · ${input.tradeDate} · `
                + `${input.platform} · ${String(input.units)} adet.`,
              duplicate: true,
              existing: ayni,
            });
            return;
          }
        }
        await ensureFundKnown(pool, client, input.fundCode);
        await trackFundForUser(pool, user.id, input.fundCode);
        // Takip listesine ekleme bunu yapıyordu, alış ekleme yapmıyordu:
        // fon tanıtılıp takibe alınıyor ama verisi çekilmiyordu. Ölçüldü —
        // 07:38'de zamanlanmış koşum bitti, 11:46'da PPS alışı girildi ve fon
        // ertesi güne kadar fiyatsız kaldı; ekranda maliyet vardı, değer ve
        // getiri hesaplanamıyordu.
        triggerFundCollection(pool, client, input.fundCode);
        sendJson(res, 201, await createTransaction(pool, user.id, input));
        return;
      }

      // FIFO satış: kullanıcı satır seçmez, adet girer. Kimlik yolundan önce
      // eşleşmeli, yoksa "sell" bir kimlik sanılır.
      if (path === '/api/transactions/sell' && method === 'POST') {
        const b = asRecord(await readJson(req));
        try {
          const sonuc = await sellFifo(pool, user.id, {
            fundCode: reqString(b, 'fundCode').toUpperCase(),
            platform: reqString(b, 'platform'),
            units: reqNumber(b, 'units'),
            sellDate: reqDate(b, 'sellDate'),
            sellOrderDate: optDate(b, 'sellOrderDate'),
          });
          sendJson(res, 200, sonuc);
        } catch (err) {
          sendJson(res, 400, {
            error: err instanceof Error ? err.message : 'Satış kaydedilemedi.',
          });
        }
        return;
      }

      const txId = matchPath('/api/transactions/:id', path);
      if (txId !== null) {
        const id = Number(txId);
        if (!Number.isInteger(id)) {
          sendJson(res, 400, { error: 'Geçersiz kimlik.' });
          return;
        }
        if (method === 'PUT') {
          const input = readTransactionInput(asRecord(await readJson(req)));
          await ensureFundKnown(pool, client, input.fundCode);
          await trackFundForUser(pool, user.id, input.fundCode);
          // Satış tarihi eklenen kayıt, o fon ve bankadaki en eski açık kayıt
          // değilse reddedilir. Yalnız açıktan kapalıya geçişte bakılır: zaten
          // satılmış bir kaydın tarihini düzeltmek engellenmemeli.
          if (input.sellDate !== null) {
            const mevcut = await getTransaction(pool, user.id, id);
            if (mevcut !== null && mevcut.sellDate === null) {
              const onceki = await fifoBlocker(
                pool, user.id, id, input.fundCode, input.platform, input.tradeDate,
              );
              if (onceki !== null) {
                sendJson(res, 400, {
                  error: `İlk alınan ilk satılır. ${input.fundCode} · ${input.platform} için `
                    + `önce ${onceki.tradeDate} tarihli `
                    + `${Number(onceki.units).toLocaleString('tr-TR')} paylık alım satılmalı. `
                    + 'Kısmi satış için "Sat" düğmesini kullanın.',
                });
                return;
              }
            }
          }
          const updated = await updateTransaction(pool, user.id, id, input);
          if (!updated) {
            sendJson(res, 404, { error: 'İşlem bulunamadı.' });
            return;
          }
          sendJson(res, 200, updated);
          return;
        }
        if (method === 'DELETE') {
          const done = await deleteTransaction(pool, user.id, id);
          sendJson(res, done ? 200 : 404, done ? { ok: true } : { error: 'İşlem bulunamadı.' });
          return;
        }
      }

      // ─── Admin uçları ───
      if (path.startsWith('/api/admin/')) {
        // Superuser yönetim ekranlarını da görür: geçiş yapacağı kullanıcı
        // listesi orada. Geçiş hâlindeyken bakılan kullanıcının yetkisi
        // geçerli — superuser sıradan bir kullanıcıya geçtiyse yönetim
        // ekranlarını görmemeli, gördüğü şey o kullanıcının gördüğü olmalı.
        if (user.type !== 'admin' && user.type !== 'super') {
          sendJson(res, 403, { error: 'Bu işlem için admin yetkisi gerekir.' });
          return;
        }
        // Sistem fon listesi: kullanıcıya bağlı değil, yalnız toplama kapsamı.
        if (path === '/api/admin/funds' && method === 'GET') {
          sendJson(res, 200, await listSystemFunds(pool));
          return;
        }
        if (path === '/api/admin/funds' && method === 'POST') {
          const b = asRecord(await readJson(req));
          const fundCode = reqString(b, 'fundCode').toUpperCase();
          // Tanınmayan kod kaydedilemez: foreign key zaten engellerdi ama
          // mesajı anlaşılır olsun ve fon evrenden çekilip kaydedilsin.
          await ensureFundKnown(pool, client, fundCode);
          const eklendi = await addSystemFund(
            pool, fundCode, optString(b, 'note'), user.id,
          );
          triggerFundCollection(pool, client, fundCode);
          sendJson(res, eklendi ? 201 : 200, { fundCode, added: eklendi });
          return;
        }
        const sysFund = matchPath('/api/admin/funds/:code', path);
        if (sysFund !== null && method === 'DELETE') {
          const done = await removeSystemFund(pool, decodeURIComponent(sysFund).toUpperCase());
          sendJson(res, done ? 200 : 404,
            done ? { ok: true } : { error: 'Fon sistem listesinde yok.' });
          return;
        }

        if (path === '/api/admin/settings' && method === 'GET') {
          sendJson(res, 200, {
            holidays: await holidays(pool),
            benchmark: await benchmarkCode(pool),
          });
          return;
        }
        if (path === '/api/admin/settings' && method === 'PUT') {
          const body = asRecord(await readJson(req));
          const list = body['holidays'];
          // İki biçim geçerli: AA-GG her yıl tekrarlar, YYYY-AA-GG yalnız o yıl.
          if (!Array.isArray(list) || list.some((d) => typeof d !== 'string' || !isValidHoliday(d))) {
            sendJson(res, 400, {
              error: 'Her satır AA-GG (her yıl) veya YYYY-AA-GG (yıla özel) olmalı.',
            });
            return;
          }
          // Sıralı ve tekrarsız: aynı gün iki kez yazılırsa hesap değişmez ama
          // liste okunmaz hale gelir.
          const clean = [...new Set(list as string[])].sort();

          // Benchmark isteğe bağlı gelir; verilmişse evrende doğrulanır.
          // Evrende olmayan kod kaydedilseydi karşılaştırma sütunu kalıcı
          // olarak boş kalır ve sebebi görünmezdi.
          const bench = body['benchmark'];
          if (bench !== undefined) {
            let code: string;
            try {
              code = await prepareBenchmark(pool, client, bench);
            } catch (err) {
              sendJson(res, 400, {
                error: err instanceof Error ? err.message : 'Fon kodu doğrulanamadı.',
              });
              return;
            }
            await writeSetting(pool, 'benchmark', code, user.id);
            triggerFundCollection(pool, client, code);
          }

          await writeSetting(pool, 'holidays', clean, user.id);
          sendJson(res, 200, { holidays: clean, benchmark: await benchmarkCode(pool) });
          return;
        }
        if (path === '/api/admin/banks' && method === 'POST') {
          const name = normalizeBankName(asRecord(await readJson(req))['name']);
          if (name === null) {
            sendJson(res, 400, { error: 'Banka adı boş olamaz ve 60 karakteri aşamaz.' });
            return;
          }
          if (!(await addBank(pool, name))) {
            sendJson(res, 409, { error: `"${name}" zaten kayıtlı.` });
            return;
          }
          sendJson(res, 201, await listBanks(pool));
          return;
        }

        const bankName = matchPath('/api/admin/banks/:name', path);
        if (bankName !== null && method === 'DELETE') {
          const sonuc = await deleteBank(pool, decodeURIComponent(bankName));
          if (sonuc.missing === true) {
            sendJson(res, 404, { error: 'Banka bulunamadı.' });
            return;
          }
          // Kullanımdaki banka silinmez. Kaç işlemin engellediği söylenir;
          // yalnız "silinemez" demek kullanıcıyı sebebi aramaya bırakırdı.
          if (!sonuc.deleted) {
            sendJson(res, 409, {
              error: `Bu banka ${String(sonuc.usage)} işlemde kullanılıyor, silinemez.`,
              usage: sonuc.usage,
            });
            return;
          }
          sendJson(res, 200, await listBanks(pool));
          return;
        }

        if (path === '/api/admin/runs' && method === 'GET') {
          sendJson(res, 200, await ingestRuns(pool));
          return;
        }

        if (path === '/api/admin/users' && method === 'GET') {
          sendJson(res, 200, await listUsers(pool));
          return;
        }
        if (path === '/api/admin/users' && method === 'POST') {
          const body = asRecord(await readJson(req));
          const type = body['type'] === 'admin' ? 'admin' : 'user';
          sendJson(
            res,
            201,
            await createUser(pool, {
              username: reqString(body, 'username'),
              password: reqString(body, 'password'),
              type,
              // Arayüzden açılan her hesapta ad soyad ve e-posta zorunlu.
              fullName: reqString(body, 'fullName'),
              email: reqString(body, 'email'),
              telegram: optString(body, 'telegram') ?? '',
            }),
          );
          return;
        }
        const userId = matchPath('/api/admin/users/:id', path);
        if (userId !== null && method === 'PATCH') {
          const body = asRecord(await readJson(req));
          // Superuser bu formdan düşürülemez. Form `type` alanını her kayıtta
          // gönderiyor ve 'super' burada 'user'a çevrilirdi: tek superuser
          // hesabı, kimse istemeden, ad soyad düzeltilirken kaybolurdu.
          // Pasifleştirme de aynı kapıdan geçiyor.
          const mevcut = await findUserById(pool, Number(userId));
          if (mevcut !== null && mevcut.type === 'super'
              && (body['type'] !== undefined || body['isActive'] !== undefined)) {
            sendJson(res, 409, {
              error: 'Superuser hesabının tipi ve durumu bu ekrandan değiştirilemez.',
            });
            return;
          }
          const patch: {
            type?: 'admin' | 'user'; isActive?: boolean; password?: string;
            fullName?: string; email?: string; telegram?: string;
          } = {};
          if (body['type'] !== undefined) patch.type = body['type'] === 'admin' ? 'admin' : 'user';
          if (body['isActive'] !== undefined) patch.isActive = body['isActive'] === true;
          if (body['password'] !== undefined) patch.password = reqString(body, 'password');
          // Kimlik alanları birlikte: ad soyad geldiyse e-posta da isteniyor.
          if (body['fullName'] !== undefined) {
            patch.fullName = reqString(body, 'fullName');
            patch.email = reqString(body, 'email');
            patch.telegram = optString(body, 'telegram') ?? '';
          }
          sendJson(res, 200, await updateUser(pool, Number(userId), patch));
          return;
        }
      }

      sendJson(res, 404, { error: 'Bulunamadı.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Beklenmeyen hata.';
      sendJson(res, 400, { error: message });
    }
  };
}

async function main(): Promise<void> {
  const pool = makePool();
  await ensureAdminUser(pool);
  const server = createServer((req, res) => {
    void createApp(pool, new FintablesClient())(req, res);
  });
  server.listen(PORT, HOST, () => {
    console.log(`tefas-pro sunucusu hazır: http://${HOST}:${String(PORT)}`);
  });
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  });
}

/**
 * Konuşmanın başlığı ve kaydedilecek soru: son kullanıcı mesajı.
 *
 * Geçmişin tamamı değil son soru saklanıyor çünkü önceki turlar zaten kendi
 * kayıtlarında duruyor; hepsini yeniden yazmak konuşmayı katlardı.
 */
function sonKullaniciMetni(gecmis: readonly Content[]): string {
  for (let i = gecmis.length - 1; i >= 0; i -= 1) {
    const m = gecmis[i];
    if (m?.role !== 'user') continue;
    const metin = (m.parts ?? [])
      .map((x) => ('text' in x ? x.text : ''))
      .filter((x) => x !== '')
      .join('\n')
      .trim();
    if (metin !== '') return metin;
  }
  return 'Konuşma';
}
