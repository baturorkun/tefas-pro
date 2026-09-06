/**
 * Kullanıcı kimlik alanlarının kuralları.
 *
 * Paylaşılan modülde, çünkü aynı kurallar üç yerde geçerli: profil ekranı,
 * admin kullanıcı formu ve sunucu. Üçü ayrı ayrı yazılsaydı biri değişince
 * diğerleri sessizce geride kalır ve arayüzün kabul ettiğini sunucu
 * reddederdi — ya da daha kötüsü, tersi.
 *
 * Normalizasyon burada: kırpma ve Telegram adındaki baştaki `@` atılması.
 * Yalnız sunucuda yapılsaydı kullanıcı yazdığından farklı bir değerin
 * kaydedildiğini ancak sayfayı yenileyince görürdü.
 */

export const FULL_NAME_MAX = 80;
export const EMAIL_MAX = 160;

/** Veritabanındaki CHECK ile aynı: @ etrafında boşluksuz, alan adında nokta. */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
/** Telegram kuralı: 5-32 karakter, harf/rakam/alt çizgi. */
const TELEGRAM_RE = /^[A-Za-z0-9_]{5,32}$/;

export interface AlanHatasi {
  alan: 'fullName' | 'email' | 'telegram';
  mesaj: string;
}

/** Ad soyad: zorunlu. */
export function adSoyadKontrol(raw: string): AlanHatasi | null {
  const v = raw.trim();
  if (v === '') return { alan: 'fullName', mesaj: 'Ad soyad gerekli.' };
  if (v.length > FULL_NAME_MAX) {
    return { alan: 'fullName', mesaj: `Ad soyad en fazla ${String(FULL_NAME_MAX)} karakter.` };
  }
  return null;
}

/** E-posta: zorunlu. */
export function epostaKontrol(raw: string): AlanHatasi | null {
  const v = raw.trim();
  if (v === '') return { alan: 'email', mesaj: 'E-posta gerekli.' };
  if (v.length > EMAIL_MAX) {
    return { alan: 'email', mesaj: `E-posta en fazla ${String(EMAIL_MAX)} karakter.` };
  }
  if (!EMAIL_RE.test(v)) return { alan: 'email', mesaj: 'E-posta adresi geçersiz.' };
  return null;
}

/**
 * Telegram: isteğe bağlı, boş bırakılabilir.
 *
 * Baştaki `@` atılıyor: kullanıcı bazen yazıyor bazen yazmıyor ve iki farklı
 * kayıt aynı hesabı gösterirdi.
 */
export function telegramNormal(raw: string): string | null {
  const v = raw.trim().replace(/^@+/, '');
  return v === '' ? null : v;
}

export function telegramKontrol(raw: string): AlanHatasi | null {
  const v = telegramNormal(raw);
  if (v === null) return null;
  if (!TELEGRAM_RE.test(v)) {
    return {
      alan: 'telegram',
      mesaj: 'Telegram adı 5-32 karakter olmalı; harf, rakam ve alt çizgi.',
    };
  }
  return null;
}
