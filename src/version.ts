import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Uygulama sürümü.
 *
 * Biçim: `v<ana>.<requirement>[+<commit>][+<derleme zamanı>]`
 * Örnek: `v0.33+7476bcb+2026-09-04-13-05`
 *
 * Ana sürüm sabittir. Ortadaki sayı requirement numarasıdır ve ELLE TUTULMAZ:
 * `pnpm build` sırasında `requirements/` klasöründeki en yüksek numaradan
 * türetilip `dist/version.json` içine yazılır. Önceki hali koddaki bir sabitti
 * ve on dört requirement boyunca güncellenmedi; aynı dosyadaki commit ve
 * derleme zamanı ise hiç bozulmadı, çünkü onları kimse yazmıyor.
 *
 * Commit ve derleme zamanı derleme ortamından gelir. Yoksa sürüm yalnız
 * `v0.33` olarak görünür — geliştirmede bu normaldir.
 */
export const BASE_MAJOR = 0;

/**
 * Klasördeki en yüksek RQ numarası. Klasör okunamazsa null.
 *
 * Sürümün tek kaynağı burası: numara kodda elle tutulduğunda on dört
 * requirement boyunca güncellenmemişti.
 */
export function highestRequirement(dir: string): number | null {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return null;
  }
  let best: number | null = null;
  for (const name of names) {
    const m = /^RQ-0*(\d+)/i.exec(name);
    if (m === null) continue;
    const n = Number(m[1]);
    if (Number.isInteger(n) && n > 0 && (best === null || n > best)) best = n;
  }
  return best;
}

/** `RQ-0033` biçimindeki kimlikten `0.33` üretir. */
export function deriveVersion(requirementId: string): string {
  const match = /^RQ-0*(\d+)$/i.exec(requirementId.trim());
  if (match === null) throw new Error(`Geçersiz requirement kimliği: ${requirementId}`);
  return `${String(BASE_MAJOR)}.${String(Number(match[1]))}`;
}

/**
 * Build'in yazdığı numara. Dosya yoksa veya okunamazsa null döner ve sürüm
 * yalnız ana sürümle görünür: eksik bir numara yüzünden uygulama çalışmamazlık
 * etmemeli.
 */
export function readBuiltRequirement(file?: string): number | null {
  const path = file ?? join(dirname(fileURLToPath(import.meta.url)), 'version.json');
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (typeof parsed !== 'object' || parsed === null) return null;
    const n = (parsed as { requirement?: unknown }).requirement;
    return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/** Derleme zamanını sürümde kullanılan `2026-08-31-22-52` biçimine çevirir. */
export function formatBuildTime(iso: string, timeZone = 'Europe/Istanbul'): string | null {
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(instant);
  const get = (t: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}-${get('hour')}-${get('minute')}`;
}

/**
 * Kullanıcıya gösterilen sürüm. Commit ve zaman eksikse sessizce atlanır:
 * eksik bir derleme bilgisi yüzünden sürüm hiç görünmemesindense, sürümün
 * kendisi görünsün.
 */
export function displayVersion(
  env: { commit?: string | undefined; buildTime?: string | undefined } = {},
  requirement: number | null = readBuiltRequirement(),
): string {
  let out = requirement === null
    ? `v${String(BASE_MAJOR)}`
    : `v${deriveVersion(`RQ-${String(requirement)}`)}`;
  const commit = env.commit?.trim();
  if (commit !== undefined && commit !== '') out += `+${commit.slice(0, 7)}`;
  const buildTime = env.buildTime?.trim();
  if (buildTime !== undefined && buildTime !== '') {
    const stamp = formatBuildTime(buildTime);
    if (stamp !== null) out += `+${stamp}`;
  }
  return out;
}

/**
 * Commit ve zamanı ortamdan okur; yoksa çalışma dizinindeki git deposundan
 * dener.
 *
 * Dağıtımda bu iki değer derleme sırasında verilir. Geliştirmede verilmediği
 * için sürüm yalnız ana sürüm görünüyordu; git varken bunu göstermemek için
 * sebep yok. Depo yoksa ya da komut başarısız olursa sessizce atlanır.
 */
function buildStamp(): { commit?: string; buildTime?: string } {
  const commit = process.env['GIT_COMMIT_SHA'];
  const buildTime = process.env['GIT_COMMIT_TIME'];
  if (commit !== undefined && commit !== '') return { commit, buildTime };
  try {
    const run = (args: string[]): string =>
      execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return { commit: run(['rev-parse', '--short=7', 'HEAD']), buildTime: run(['log', '-1', '--format=%cI']) };
  } catch {
    return { commit, buildTime };
  }
}

/** Süreç ortamından okunan sürüm; sunucu bunu istemciye gönderir. */
export function currentVersion(): string {
  return displayVersion(buildStamp());
}
