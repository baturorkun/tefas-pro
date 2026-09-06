/**
 * Gemini kaynak istemcisi.
 *
 * `fetch` ile elle yazıldı; `fintables.ts` ve `fvt.ts` ile aynı desen. Yeni
 * bağımlılık eklenmiyor ve sağlayıcıya özel her şey bu dosyada duruyor —
 * sağlayıcı değiştirmek bu dosyayı değiştirmek olacak, tool tanımları ve
 * ekran ortak kalacak.
 *
 * Parse fonksiyonları ağdan bağımsızdır ve fixture ile test edilir.
 */
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** Modelin çağırmak istediği fonksiyon. */
export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

/** Bir turun sonucu: ya metin ya da çağrılacak fonksiyonlar. */
export interface Turn {
  text: string | null;
  calls: ToolCall[];
}

/** Konuşma parçası. Rol adları Gemini'nin beklediği biçimde. */
export type Part =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: Record<string, unknown> } };

export interface Content {
  role: 'user' | 'model';
  parts: Part[];
}

/** Tool tanımı; şema JSON Schema alt kümesi. */
export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

const metin = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t;
};

/**
 * Yanıttan metni ve fonksiyon çağrılarını ayırır.
 *
 * Bir turda ikisi birden gelebiliyor: model önce bir cümle yazıp sonra
 * fonksiyon çağırabiliyor. İkisi de taşınır — metni atmak modelin "şuna
 * bakıyorum" demesini yutardı.
 */
export function parseTurn(raw: unknown): Turn {
  if (typeof raw !== 'object' || raw === null) return { text: null, calls: [] };
  const aday = (raw as { candidates?: unknown }).candidates;
  if (!Array.isArray(aday) || aday.length === 0) return { text: null, calls: [] };
  const ilk = aday[0] as { content?: { parts?: unknown } } | undefined;
  const parts = ilk?.content?.parts;
  if (!Array.isArray(parts)) return { text: null, calls: [] };

  const metinler: string[] = [];
  const calls: ToolCall[] = [];
  for (const p of parts) {
    if (typeof p !== 'object' || p === null) continue;
    const r = p as Record<string, unknown>;
    const t = metin(r['text']);
    if (t !== null) metinler.push(t);
    const fc = r['functionCall'];
    if (typeof fc === 'object' && fc !== null) {
      const ad = metin((fc as { name?: unknown }).name);
      if (ad !== null) {
        const args = (fc as { args?: unknown }).args;
        calls.push({
          name: ad,
          args: typeof args === 'object' && args !== null
            ? (args as Record<string, unknown>) : {},
        });
      }
    }
  }
  return { text: metinler.length === 0 ? null : metinler.join('\n'), calls };
}

/** Yanıttaki hata mesajı; anahtar yanlışsa ya da model adı geçersizse dolu. */
export function parseError(raw: unknown): string | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const e = (raw as { error?: unknown }).error;
  if (typeof e !== 'object' || e === null) return null;
  return metin((e as { message?: unknown }).message);
}

export class GeminiClient {
  private readonly key: string;

  private readonly model: string;

  constructor(key: string, model: string) {
    this.key = key;
    this.model = model;
  }

  /**
   * Bir tur çalıştırır. Döngü çağıranda: tool sonuçları eklenip tekrar
   * çağrılıyor. Döngüyü burada kapatmamak, tur sınırının ve tool
   * yürütmesinin sunucu tarafında kalmasını sağlıyor.
   */
  async generate(
    system: string,
    contents: readonly Content[],
    tools: readonly FunctionDeclaration[],
  ): Promise<Turn> {
    const res = await fetch(
      `${API_BASE}/models/${this.model}:generateContent`,
      {
        method: 'POST',
        // Anahtar başlıkta: sorgu dizesine konursa sunucu günlüklerine ve
        // proxy kayıtlarına düşer.
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          tools: tools.length === 0 ? undefined : [{ functionDeclarations: tools }],
        }),
      },
    );
    const govde: unknown = await res.json();
    if (res.status !== 200) {
      // Mesaj kullanıcıya gösterilmez; anahtar parçası taşıyabilir.
      throw new Error(`gemini http ${String(res.status)}: ${parseError(govde) ?? 'bilinmeyen hata'}`);
    }
    return parseTurn(govde);
  }
}
