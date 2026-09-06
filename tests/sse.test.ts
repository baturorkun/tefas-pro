import { describe, expect, it } from 'vitest';

import { sseAyir } from '../src/sse.js';

/**
 * SSE tamponlaması: asistan akışındaki tek zor kısım.
 *
 * Ağ paketleri olay sınırında bölünmüyor. Bu testler bölünmenin her yerinde
 * doğru davranıldığını sabitliyor — hata zamanlamaya bağlı olduğu için elde
 * denemekle yakalanmaz.
 */
describe('sseAyir', () => {
  it('tam olayları ayırır', () => {
    const r = sseAyir<{ a: number }>('data: {"a":1}\n\ndata: {"a":2}\n\n');
    expect(r.olaylar).toEqual([{ a: 1 }, { a: 2 }]);
    expect(r.kalan).toBe('');
  });

  it('yarım kalan olayı tamponda tutar', () => {
    const r = sseAyir<{ a: number }>('data: {"a":1}\n\ndata: {"a":2');
    expect(r.olaylar).toEqual([{ a: 1 }]);
    expect(r.kalan).toBe('data: {"a":2');
  });

  it('iki paket arasında bölünen olay birleşince okunur', () => {
    // Asıl senaryo: tek bir data satırı iki okuma arasında ikiye ayrılıyor.
    const ilk = sseAyir<{ tool: string }>('data: {"to');
    expect(ilk.olaylar).toEqual([]);
    const ikinci = sseAyir<{ tool: string }>(`${ilk.kalan}ol":"fon_listesi"}\n\n`);
    expect(ikinci.olaylar).toEqual([{ tool: 'fon_listesi' }]);
    expect(ikinci.kalan).toBe('');
  });

  it('tek pakette gelen birden çok olayı sırasıyla verir', () => {
    const r = sseAyir<{ n: number }>('data: {"n":1}\n\ndata: {"n":2}\n\ndata: {"n":3}\n\n');
    expect(r.olaylar.map((x) => x.n)).toEqual([1, 2, 3]);
  });

  it('data dışındaki satırları yok sayar', () => {
    // Canlı tutma darbeleri (`:` yorum) ve `event:` alanları akışı bozmamalı.
    const r = sseAyir<{ a: number }>(': ping\n\nevent: note\ndata: {"a":9}\n\n');
    expect(r.olaylar).toEqual([{ a: 9 }]);
  });

  it('boş gövde olay saymaz', () => {
    const r = sseAyir('data:\n\n');
    expect(r.olaylar).toEqual([]);
  });
});
