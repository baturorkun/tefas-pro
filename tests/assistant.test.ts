import { describe, expect, it } from 'vitest';

import { parseError, parseTurn } from '../src/sources/gemini.js';

describe('parseTurn', () => {
  it('metni okur', () => {
    expect(parseTurn({ candidates: [{ content: { parts: [{ text: 'merhaba' }] } }] }))
      .toEqual({ text: 'merhaba', calls: [] });
  });

  it('fonksiyon çağrısını okur', () => {
    const t = parseTurn({ candidates: [{ content: { parts: [
      { functionCall: { name: 'portfoy_ozeti', args: {} } },
    ] } }] });
    expect(t.calls).toEqual([{ name: 'portfoy_ozeti', args: {} }]);
    expect(t.text).toBeNull();
  });

  it('metin ve çağrı aynı turda gelebilir', () => {
    // Model önce "şuna bakıyorum" deyip sonra fonksiyon çağırabiliyor;
    // metni atmak o cümleyi yutardı.
    const t = parseTurn({ candidates: [{ content: { parts: [
      { text: 'Bakıyorum.' },
      { functionCall: { name: 'fon_detayi', args: { fon_kodu: 'THF' } } },
    ] } }] });
    expect(t.text).toBe('Bakıyorum.');
    expect(t.calls[0]?.args).toEqual({ fon_kodu: 'THF' });
  });

  it('birden çok çağrıyı sırayla okur', () => {
    const t = parseTurn({ candidates: [{ content: { parts: [
      { functionCall: { name: 'a', args: {} } },
      { functionCall: { name: 'b', args: {} } },
    ] } }] });
    expect(t.calls.map((c) => c.name)).toEqual(['a', 'b']);
  });

  it('bozuk yanıtta çökmez', () => {
    // Sağlayıcı beklenmedik bir şey döndürürse konuşma kırılmamalı.
    for (const x of [null, {}, { candidates: [] }, { candidates: [{}] },
      { candidates: [{ content: {} }] }, 'metin']) {
      expect(parseTurn(x)).toEqual({ text: null, calls: [] });
    }
  });

  it('adı olmayan çağrıyı atar', () => {
    expect(parseTurn({ candidates: [{ content: { parts: [
      { functionCall: { args: {} } },
    ] } }] }).calls).toEqual([]);
  });
});

describe('parseError', () => {
  it('hata mesajını okur', () => {
    expect(parseError({ error: { message: 'API key not valid' } })).toBe('API key not valid');
  });

  it('hata yoksa null döner', () => {
    expect(parseError({ candidates: [] })).toBeNull();
    expect(parseError(null)).toBeNull();
  });
});
