/**
 * Koşum kaynağı etiketleri.
 *
 * Ayrı ve bağımsız bir modülde: `collector.ts` tek fon toplaması için
 * `collect-tefas.ts`'i çağırıyor, o da bu etiketleri kullanıyor. Sabitler
 * collector.ts'te kalsaydı dairesel import oluşuyor ve modül yüklenirken
 * "Cannot access 'SCHEDULED_SOURCE' before initialization" ile çöküyordu —
 * typecheck göremiyor, ancak çalıştırınca ortaya çıkıyor.
 */

/**
 * Zamanlanmış koşumun kaynağı. Fintables kaldırıldıktan sonra günlük veriyi
 * TEFAS yazıyor; Panel'deki "Son Toplama" kutusu da onu gösteriyor. Geçmiş
 * satırlar eski etiketle (`fintables-watchlist`) kalır.
 */
export const SCHEDULED_SOURCE = 'tefas-scheduled';

/**
 * Takip listesine yeni fon eklendiğinde açılan tek fonluk koşum. Zamanlanmış
 * koşumdan ayrı tutulur: Panel'in kutusu en son kaydı gösteriyor, ayrım
 * olmasaydı eklenen her fon gecelik taramanın yerine geçerdi.
 */
export const ONDEMAND_SOURCE = 'tekil-fon';

/** KAP portföy dağılım toplaması. */
export const KAP_SOURCE = 'kap-scheduled';

/** Hisse günlük kapanış toplaması. */
export const HISSE_SOURCE = 'hisse-scheduled';
