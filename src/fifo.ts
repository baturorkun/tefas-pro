/**
 * FIFO satış planı.
 *
 * Hem sunucu hem tarayıcı kullanıyor: sunucu planı uygular, pencere aynı planı
 * kullanıcı adedi yazarken önden gösterir. Tek kaynakta durmasının sebebi bu —
 * iki yerde ayrı hesap olsaydı önizleme ile sonuç sessizce ayrışabilirdi.
 * Bu yüzden dosyanın veritabanı bağımlılığı yok.
 */

/** Bir alım kaydına düşen satış payı. */
export interface FifoStep {
  id: number;
  /** Bu kayıttan satılan adet. */
  sell: number;
  /** Bölünme sonrası açık kalan adet; sıfırsa kayıt tam tükenmiştir. */
  keep: number;
}

/**
 * Satılacak adedi açık alım kayıtlarına dağıtır: en eskiden başlanır, bir kayıt
 * tükenmeden sonrakine geçilmez.
 *
 * Saf fonksiyon — sıralama ve bölme kararı veritabanı olmadan test edilebilsin
 * diye ayrı duruyor; `sellFifo` yalnız bu planı uygular.
 *
 * Kayıtlar çağıran tarafından alış tarihine göre sıralı verilir. `keep` sıfırdan
 * büyükse o kayıt bölünecek demektir ve bu en fazla bir kez olur: bölme ancak
 * bir kaydın ortasında kalındığında gerekir, o da son dokunulan kayıttır.
 */
export function planFifoSale(
  lots: readonly { id: number; units: number }[],
  units: number,
): FifoStep[] {
  // Kesirli adetlerde kayan nokta artığı kalıyor; eşitlik bu toleransla ölçülür.
  const EPS = 1e-6;
  if (!(units > 0)) throw new Error('Satış adedi sıfırdan büyük olmalı.');
  const elde = lots.reduce((a, l) => a + l.units, 0);
  if (units > elde + EPS) {
    throw new Error(
      `elde ${elde.toLocaleString('tr-TR')} pay var, ${units.toLocaleString('tr-TR')} pay satılamaz.`,
    );
  }
  const steps: FifoStep[] = [];
  let kalan = units;
  for (const lot of lots) {
    if (kalan <= EPS) break;
    if (lot.units - kalan <= EPS) {
      steps.push({ id: lot.id, sell: lot.units, keep: 0 });
      kalan -= lot.units;
    } else {
      steps.push({ id: lot.id, sell: kalan, keep: lot.units - kalan });
      kalan = 0;
    }
  }
  return steps;
}
