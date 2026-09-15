/**
 * BIST hisse günlük kapanışları.
 *
 * fvt kalkınca `fact_stock_daily` beslenmez oldu. Fon detayındaki 1 haftalık
 * ve 1 aylık getiri sütunları bu veriye dayanıyor ve kaynak durunca
 * boşalmıyor, DONUYOR: ekran güncel bir getiri gösteriyormuş gibi durur ama
 * sayı geçmişte kalmıştır. Bu yüzden kaynağın sürmesi gerekiyor.
 *
 * Doğruluk ölçüldü: AKBNK için 10 Eylül 72,10 ve 11 Eylül 72,70 — fvt'nin
 * yazdığı değerlerle birebir aynı.
 *
 * BIST sembolleri `.IS` sonekiyle sorgulanıyor; fiyatlar TRY.
 */
const BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
};

export interface GunlukKapanis {
  stockCode: string;
  tradeDate: string;
  close: number;
}

/** Epoch saniyeyi YYYY-MM-DD'ye çevirir (Istanbul). */
function isoGun(saniye: number): string {
  return new Date(saniye * 1000).toLocaleDateString('en-CA', {
    timeZone: 'Europe/Istanbul',
  });
}

/**
 * Bir hissenin son `gun` günlük kapanışları.
 *
 * Kapanışı henüz oluşmamış gün `null` geliyor (seans sürerken); o günler
 * atlanır — yarım veriyi kapanış diye yazmak getiriyi yanlış hesaplatır.
 */
export async function gunlukKapanislar(
  stockCode: string,
  gun = 30,
): Promise<GunlukKapanis[]> {
  interface Yanit {
    chart: {
      result: {
        timestamp?: number[];
        indicators: { quote: { close?: (number | null)[] }[] };
      }[] | null;
      error: unknown;
    };
  }
  const url = `${BASE}/${encodeURIComponent(stockCode)}.IS`
    + `?interval=1d&range=${String(gun)}d`;
  const res = await fetch(url, { headers: HEADERS });
  // 404 hata değil: kod BIST'te işlem görmüyor demek. Fonların tuttuğu
  // katılma payları ve yatırım fonları da harf koduna sahip ve filtreyi
  // geçiyor, ama borsada sembolleri yok. Koşumu düşürmemeli.
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`hisse fiyat ${stockCode}: http ${String(res.status)}`);
  const d = (await res.json()) as Yanit;
  const r = d.chart.result?.[0];
  if (r === undefined) return [];
  const ts = r.timestamp ?? [];
  const kapanis = r.indicators.quote[0]?.close ?? [];
  const out: GunlukKapanis[] = [];
  for (let i = 0; i < ts.length; i++) {
    const c = kapanis[i];
    const t = ts[i];
    if (c === null || c === undefined || t === undefined) continue;
    out.push({ stockCode, tradeDate: isoGun(t), close: c });
  }
  return out;
}
