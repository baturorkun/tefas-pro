/**
 * Emir tarihi ile gerçekleşme tarihi arasındaki valör hesabı.
 *
 * TEFAS'ta emir verildiği gün değil, fonun valörü kadar iş günü sonra
 * fiyatlanır. Kullanıcı bu hesabı elden yapıyordu; buradaki işlevler onu
 * devralır.
 *
 * Hafta sonları ve resmî tatiller atlanır. Tatil listesi sistem ayarlarından
 * gelir: geçmiş günler fiyat verisinden anlaşılabilir ama emir verilirken
 * ileriki günlerin verisi henüz yoktur.
 *
 * Listede iki biçim bulunur:
 *
 *   `AA-GG`       her yıl tekrarlayan sabit tatil — 23 Nisan her yıl 23 Nisan
 *   `YYYY-AA-GG`  yalnız o yıla ait tatil — dinî bayramlar hicrî takvimle kayar
 *
 * Sabitleri yıl yazarak tutmak listeyi her sene elden geçirmeyi gerektirirdi;
 * ayrım bunu ortadan kaldırır, yılda yalnız iki bayram güncellenir.
 */

/** `YYYY-MM-DD` — saat dilimi karışmasın diye tarihler metin olarak taşınır. */
export type IsoDate = string;

const DAY_MS = 86_400_000;

function parse(date: IsoDate): Date {
  const text = date.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (m === null) throw new Error(`Geçersiz tarih: ${date}`);
  // UTC: yerel saat dilimi kullanılırsa yaz saati geçişlerinde gün kayabilir.
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  // Date.UTC taşan değeri sessizce kaydırır: 13. ay ertesi yılın ocağı olur,
  // 31 Şubat 3 Mart'a döner. Geri çevirip karşılaştırmak bunu yakalar.
  if (d.toISOString().slice(0, 10) !== text) throw new Error(`Geçersiz tarih: ${date}`);
  return d;
}

function format(d: Date): IsoDate {
  return d.toISOString().slice(0, 10);
}

/** Tatil girdisi geçerli mi: `AA-GG` ya da `YYYY-AA-GG`. */
export function isValidHoliday(entry: string): boolean {
  return /^(\d{4}-)?\d{2}-\d{2}$/.test(entry.trim());
}

/** Hafta sonu ya da tatil değilse piyasa günüdür. */
export function isMarketDay(date: IsoDate, holidays: readonly string[]): boolean {
  const d = parse(date);
  const weekday = d.getUTCDay();
  if (weekday === 0 || weekday === 6) return false;

  const full = format(d);        // YYYY-AA-GG
  const dayMonth = full.slice(5); // AA-GG
  for (const raw of holidays) {
    const h = raw.trim();
    // Kısa giriş her yıl geçerli; uzun giriş yalnız kendi yılında.
    if (h.length === 5 ? h === dayMonth : h === full) return false;
  }
  return true;
}

/**
 * `from` gününden `count` piyasa günü ileri/geri gider.
 *
 * `count` sıfırsa gün olduğu gibi döner — valörü sıfır olan fonlarda emir ve
 * gerçekleşme aynı gündür. Başlangıç günü kapalıysa bile sıfır valörde
 * dokunulmaz: o gün ne girildiyse odur.
 */
export function shiftMarketDays(
  from: IsoDate,
  count: number,
  holidays: readonly string[],
): IsoDate {
  if (!Number.isInteger(count)) throw new Error('Valör tam sayı olmalıdır.');
  if (count === 0) return format(parse(from));

  const step = count > 0 ? DAY_MS : -DAY_MS;
  let remaining = Math.abs(count);
  let cursor = parse(from).getTime();
  // Tatil zinciri uzun olabilir (Kurban Bayramı + hafta sonu); yine de sonsuz
  // döngüye düşmemek için üst sınır konur.
  let guard = 0;
  while (remaining > 0) {
    cursor += step;
    if (++guard > 400) throw new Error('Piyasa günü bulunamadı; tatil listesi hatalı olabilir.');
    if (isMarketDay(format(new Date(cursor)), holidays)) remaining -= 1;
  }
  return format(new Date(cursor));
}

/** Emir gününden gerçekleşme gününe. */
export function settlementFromOrder(
  orderDate: IsoDate,
  valorDays: number,
  holidays: readonly string[],
): IsoDate {
  return shiftMarketDays(orderDate, valorDays, holidays);
}

/** Gerçekleşme gününden emir gününe — formun ters yönü. */
export function orderFromSettlement(
  settlementDate: IsoDate,
  valorDays: number,
  holidays: readonly string[],
): IsoDate {
  return shiftMarketDays(settlementDate, -valorDays, holidays);
}
