import { execFileSync } from 'node:child_process';

/**
 * Uygulama sürümü.
 *
 * Biçim: `v<ana>.<requirement>.<koşu>[+<commit>][+<derleme zamanı>]`
 * Örnek: `v0.18.1+000fffb+2026-08-31-22-52`
 *
 * Ana sürüm sabittir. Ortadaki sayı requirement numarası, sondaki o
 * requirement için kaçıncı koşu olduğudur; ikisi de aşağıda elle tutulur ve
 * her requirement'ta güncellenir. Böylece çalışan bir dağıtımın hangi işten
 * geldiği tek bakışta görünür.
 *
 * Commit ve derleme zamanı derleme ortamından gelir. Yoksa sürüm yalnız
 * `v0.18.1` olarak görünür — geliştirme sırasında bu normaldir ve hata
 * sayılmaz.
 */
export const BASE_MAJOR = 0;
export const CURRENT_REQUIREMENT = 'RQ-0018';
export const CURRENT_RUN_ORDINAL = 1;

/** `RQ-0018` ve 1'den `0.18.1` üretir. */
export function deriveVersion(requirementId: string, runOrdinal: number): string {
  const match = /^RQ-0*(\d+)$/i.exec(requirementId.trim());
  if (match === null) throw new Error(`Geçersiz requirement kimliği: ${requirementId}`);
  if (!Number.isInteger(runOrdinal) || runOrdinal < 1) {
    throw new Error('Koşu sırası en az 1 olmalıdır.');
  }
  return `${String(BASE_MAJOR)}.${String(Number(match[1]))}.${String(runOrdinal)}`;
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
  requirementId: string = CURRENT_REQUIREMENT,
  runOrdinal: number = CURRENT_RUN_ORDINAL,
): string {
  let out = `v${deriveVersion(requirementId, runOrdinal)}`;
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
 * için sürüm yalnız `v0.18.1` görünüyordu; git varken bunu göstermemek için
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
