/**
 * Arayüz ile sunucunun paylaştığı sınırlar.
 *
 * Tek yerde durmasının sebebi: sınır iki tarafta birden uygulanmak zorunda.
 * Yalnız arayüzde olsa API'ye doğrudan istekle aşılır; yalnız sunucuda olsa
 * kullanıcı yazarken uyarı almaz, kaydederken reddedilir. İki ayrı sabit
 * tutulsaydı biri değişince diğeri sessizce geride kalırdı.
 */

/** İşlem notu: hatırlatma için kısa bir satır, paragraf yeri değil. */
export const NOTE_MAX = 200;
