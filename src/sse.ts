/**
 * SSE gövdesini olaylara ayırır.
 *
 * Ayrı ve saf bir fonksiyon, çünkü buradaki tek zor kısım tamponlama: ağ
 * paketleri olay sınırında bölünmüyor. Tek bir `data:` satırı iki okuma
 * arasında ikiye ayrılabilir ve doğrudan `split` yapan bir istemci onu
 * bozuk JSON sanıp konuşmayı düşürür. Hata seyrek ve zamanlamaya bağlı
 * olduğu için elde denemekle yakalanmaz; test edilebilir olması bu yüzden.
 *
 * Yarım kalan parça `kalan` olarak geri veriliyor ve bir sonraki okumanın
 * başına ekleniyor.
 */
export interface SseAyirma<T> {
  olaylar: T[];
  kalan: string;
}

export function sseAyir<T>(tampon: string): SseAyirma<T> {
  // Olaylar boş satırla ayrılır. Son parça her zaman yarım sayılır: tam bir
  // olayla bitmişse zaten boş string kalır.
  const parcalar = tampon.split('\n\n');
  const kalan = parcalar.pop() ?? '';
  const olaylar: T[] = [];
  for (const parca of parcalar) {
    // Yorum satırları (`:` ile başlayan canlı tutma darbeleri) ve `event:`
    // gibi alanlar yok sayılıyor; bu uçta yalnız `data` kullanılıyor.
    const satir = parca.split('\n').find((x) => x.startsWith('data:'));
    if (satir === undefined) continue;
    const govde = satir.slice(5).trim();
    if (govde === '') continue;
    olaylar.push(JSON.parse(govde) as T);
  }
  return { olaylar, kalan };
}
