import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { parseVarlikSiniflari } from '../src/sources/kap-parse.js';
import { kanonikVarlikSinifi } from '../src/sources/varlik-sinifi.js';
const dir = process.argv[2]!;
const say = new Map<string, number>();
for (const f of readdirSync(dir).filter((x) => x.endsWith('.pdf'))) {
  let t = '';
  try { t = execFileSync('pdftotext', ['-layout', `${dir}/${f}`, '-'], { encoding: 'utf8', maxBuffer: 64e6 }); } catch { /* bos */ }
  for (const v of parseVarlikSiniflari(t)) { const k = kanonikVarlikSinifi(v.label); if (k !== null) say.set(k, (say.get(k) ?? 0) + 1); }
}
for (const [k, v] of [...say].sort((a, b) => b[1] - a[1])) console.log(String(v).padStart(4), k);
