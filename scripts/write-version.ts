/**
 * Sürüm numarasını requirements klasöründen türetip derleme çıktısına yazar.
 *
 * Numara kodda elle tutuluyordu ve on dört requirement boyunca güncellenmedi.
 * Aynı dosyadaki commit ve derleme zamanı hiç bozulmadı, çünkü onları kimse
 * yazmıyor. Bilgi zaten repoda; ikinci bir kopya tutmak yerine kaynağı okunur.
 *
 * Çıktı dist içine yazılır: production imajı requirements klasörünü taşımıyor
 * ama dist'i taşıyor.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { highestRequirement } from '../src/version.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Numara önce ortamdan okunur, yoksa klasör taranır.
 *
 * Container build'i klasörü göremiyor: .containerignore hem `requirements`
 * hem `*.md` hariç tutuyor, yani dizin build context'ine hiç girmiyor. Bu
 * doğru bir kural — imaja gereksiz dosya taşımamak için — o yüzden klasörü
 * açmak yerine değer dışarıdan veriliyor, tıpkı GIT_COMMIT_SHA gibi.
 *
 * Local derlemede ortam değişkeni yok ve klasör yerinde; tarama çalışır.
 */
function requirementNumber(): number | null {
  const fromEnv = process.env['APP_REQUIREMENT'];
  if (fromEnv !== undefined && fromEnv.trim() !== '') {
    const n = Number(fromEnv);
    if (Number.isInteger(n) && n > 0) return n;
  }
  return highestRequirement(join(root, 'requirements'));
}

const requirement = requirementNumber();
const out = join(root, 'dist', 'version.json');

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({ requirement })}\n`);
console.log(`Sürüm numarası: ${requirement === null ? '(bulunamadı)' : String(requirement)}`);
