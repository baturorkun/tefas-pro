/**
 * Fon alarm motoru.
 *
 * Hesap tek bir SQL'de: günlük koşum, admin önizlemesi ve geriye dönük test
 * aynı sorguyu kullanır. Üç ayrı yerde yazılsaydı biri düzeltilip diğerleri
 * unutulurdu ve ekranda gördüğün dağılım gerçek alarmla tutmazdı.
 *
 * Motor TAHMİN etmez, TESPİT eder. Ölçüldü: 4.641 gözlemde bu sinyallerin
 * hiçbiri sonraki haftayı haber vermiyor, ortancalar yazı tura. Ortalamalarda
 * görünen büyük etkiler yalnız çöken iki fondan geliyordu. İşi, çökmekte olan
 * fonu birkaç gün içinde görünür kılmak.
 */
import type pg from 'pg';

export interface AlarmSatiri {
  fundCode: string;
  title: string | null;
  score: number;
  level: string | null;
  hits: { ruleId: number; label: string; family: string; value: string; points: number }[];
}

/**
 * Ölçüt hesabı ve kural eşleştirmesi.
 *
 * Pencere kural başına değişiyor ama farklı pencere sayısı az (1, 5, 20), o
 * yüzden ölçütler (fon × pencere) için bir kez hesaplanıp kurallara
 * eşleştiriliyor. Kural başına ayrı hesap fon sayısıyla çarpılırdı.
 */
const HESAP = `
WITH ref AS (SELECT $1::date AS d),
gunler AS (
  SELECT DISTINCT trade_date FROM fact_fund_daily
   WHERE daily_return_pct IS NOT NULL AND trade_date <= (SELECT d FROM ref)),
f AS (
  SELECT tf.fund_code, df.title, df.umbrella_type
    FROM analytics.tracked_fund tf JOIN dim_fund df USING (fund_code)),
-- Fon başına son veri günleri, en yeniden geriye numaralı.
g AS (
  SELECT d.fund_code, d.trade_date, d.daily_return_pct r, d.nav_per_share nav,
         d.net_flow nf, d.investor_count yat, d.aum,
         row_number() OVER (PARTITION BY d.fund_code ORDER BY d.trade_date DESC) rn
    FROM fact_fund_daily d JOIN f USING (fund_code)
   WHERE d.daily_return_pct IS NOT NULL AND d.trade_date <= (SELECT d FROM ref)),
pencere AS (SELECT DISTINCT window_days w FROM alarm_rule WHERE is_active),
m0 AS (
  SELECT f.fund_code, f.umbrella_type, p.w,
    -- Arka arkaya eksi gün: ilk artı günden önceki gün sayısı.
    (SELECT coalesce(min(rn) FILTER (WHERE r >= 0), 99) - 1
       FROM g WHERE g.fund_code = f.fund_code AND rn <= 30) AS ardisik,
    -- Birikimli getiri: günlük getirilerin zinciri.
    (SELECT round((((exp(sum(ln(1 + r/100))) - 1) * 100))::numeric, 4)
       FROM g WHERE g.fund_code = f.fund_code AND rn <= p.w) AS birikimli,
    -- Zirveden düşüş: bugünkü fiyat, pencere zirvesine göre.
    (SELECT round(((array_agg(nav ORDER BY rn))[1] / nullif(max(nav), 0) - 1) * 100, 4)
       FROM g WHERE g.fund_code = f.fund_code AND rn <= p.w AND nav IS NOT NULL) AS zirveden,
    -- Yatırımcı değişimi: pencerenin iki ucu. Uçlardan biri boşsa NULL kalır
    -- ve kural ateşlemez; sessiz ateşlememe iyi haber gibi okunmamalı.
    (SELECT CASE WHEN count(*) >= 2 AND (array_agg(yat ORDER BY trade_date))[1] > 0
              THEN round((((array_agg(yat ORDER BY trade_date DESC))[1]
                         - (array_agg(yat ORDER BY trade_date))[1])::numeric
                        / (array_agg(yat ORDER BY trade_date))[1]) * 100, 4) END
       FROM g WHERE g.fund_code = f.fund_code AND rn <= p.w AND yat IS NOT NULL) AS yat_degisim,
    -- Net çıkış: pencere akışı, güncel büyüklüğe oranla.
    (SELECT CASE WHEN max(aum) > 0 THEN round((sum(nf) / max(aum)) * 100, 4) END
       FROM g WHERE g.fund_code = f.fund_code AND rn <= p.w AND nf IS NOT NULL AND aum IS NOT NULL) AS cikis_oran,
    -- Fiyatsız iş günü: evrenin açık olduğu ama bu fonun veri vermediği gün.
    (SELECT count(*) FROM gunler
      WHERE gunler.trade_date > coalesce((SELECT max(trade_date) FROM g
                                           WHERE g.fund_code = f.fund_code), '1900-01-01')) AS veri_yok_gun
  FROM f CROSS JOIN pencere p),
-- Kıyas grubu şemsiye türü: evren ortancası para piyasası fonlarının
-- sakinliğiyle bastırılıyor ve her hisse fonu piyasa düşüşünde haksız yere
-- kötü görünüyordu. Grupta 3'ten az fon varsa görece kural çalışmaz.
med AS (
  SELECT umbrella_type, w, percentile_cont(0.5) WITHIN GROUP (ORDER BY birikimli)::numeric ortanca
    FROM m0 WHERE birikimli IS NOT NULL AND umbrella_type IS NOT NULL
   GROUP BY umbrella_type, w HAVING count(*) >= 3),
m AS (
  SELECT m0.*, round(m0.birikimli - med.ortanca, 4) AS gruba_gore
    FROM m0 LEFT JOIN med USING (umbrella_type, w)),
-- Kural eşleşmesi. Yön kurala göre: ardışık gün ve fiyatsız gün "en az",
-- diğerleri "en çok".
vurus AS (
  SELECT m.fund_code, r.id rule_id, r.kind, r.family, r.label, r.points,
    CASE r.kind
      WHEN 'ardisik_eksi'     THEN m.ardisik::numeric
      WHEN 'birikimli_getiri' THEN m.birikimli
      WHEN 'gruba_gore'       THEN m.gruba_gore
      WHEN 'zirveden_dusus'   THEN m.zirveden
      WHEN 'yatirimci_azalma' THEN m.yat_degisim
      WHEN 'net_cikis'        THEN m.cikis_oran
      WHEN 'balina_cikis'     THEN m.cikis_oran
      WHEN 'veri_yok'         THEN m.veri_yok_gun::numeric
    END AS deger
  FROM m JOIN alarm_rule r ON r.window_days = m.w AND r.is_active
  WHERE CASE r.kind
    WHEN 'ardisik_eksi'     THEN m.ardisik >= r.threshold
    WHEN 'veri_yok'         THEN m.veri_yok_gun >= r.threshold
    WHEN 'balina_cikis'     THEN m.cikis_oran <= r.threshold AND m.yat_degisim >= r.threshold2
    WHEN 'birikimli_getiri' THEN m.birikimli <= r.threshold
    WHEN 'gruba_gore'       THEN m.gruba_gore <= r.threshold
    WHEN 'zirveden_dusus'   THEN m.zirveden <= r.threshold
    WHEN 'yatirimci_azalma' THEN m.yat_degisim <= r.threshold
    WHEN 'net_cikis'        THEN m.cikis_oran <= r.threshold
  END),
-- Kademe: aynı ölçütün iki eşiği birden puan verirse 5 güne ulaşan fon
-- 3 gün kuralından da puan alıp iki kez cezalandırılır.
kademe AS (
  SELECT DISTINCT ON (fund_code, kind) * FROM vurus
   ORDER BY fund_code, kind, points DESC, rule_id),
-- Aile tavanı: getiri ailesindeki dört kural da aynı şeyi ölçüyor. Tavan
-- olmadan kural SAYISI sessizce ağırlık belirlerdi.
aile AS (
  SELECT k.fund_code, k.family, least(sum(k.points), af.cap) AS puan
    FROM kademe k JOIN alarm_family af ON af.code = k.family
   GROUP BY k.fund_code, k.family, af.cap),
toplam AS (SELECT fund_code, sum(puan)::int AS score FROM aile GROUP BY fund_code)
SELECT f.fund_code AS "fundCode", f.title,
       coalesce(t.score, 0) AS score,
       (SELECT code FROM alarm_level WHERE min_score <= coalesce(t.score, 0)
         ORDER BY min_score DESC LIMIT 1) AS level,
       coalesce((SELECT json_agg(json_build_object(
                  'ruleId', k.rule_id, 'label', k.label, 'family', k.family,
                  'value', round(k.deger, 2)::text, 'points', k.points)
                  ORDER BY k.points DESC)
                 FROM kademe k WHERE k.fund_code = f.fund_code), '[]'::json) AS hits
  FROM f LEFT JOIN toplam t USING (fund_code)
 ORDER BY coalesce(t.score, 0) DESC, f.fund_code`;

/** Verilen gün için bütün takip edilen fonların puanı. Yazmaz. */
export async function alarmHesapla(pool: pg.Pool, gun: string): Promise<AlarmSatiri[]> {
  const r = await pool.query<AlarmSatiri>(HESAP, [gun]);
  return r.rows;
}

/** Hesabı kaydeder. Aynı gün yeniden koşarsa üzerine yazar. */
export async function alarmKaydet(pool: pg.Pool, gun: string): Promise<number> {
  const satirlar = await alarmHesapla(pool, gun);
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    // Gün baştan yazılır: kural kapatıldığında eski vuruşun kalması,
    // gerekçeyi artık geçerli olmayan bir kurala dayandırırdı.
    await c.query('DELETE FROM fund_alarm_daily WHERE trade_date = $1', [gun]);
    for (const s of satirlar) {
      if (s.score === 0) continue;
      await c.query(
        `INSERT INTO fund_alarm_daily (fund_code, trade_date, score, level)
         VALUES ($1, $2, $3, $4)`,
        [s.fundCode, gun, s.score, s.level],
      );
      for (const h of s.hits) {
        await c.query(
          `INSERT INTO fund_alarm_hit (fund_code, trade_date, rule_id, value, points)
           VALUES ($1, $2, $3, $4, $5)`,
          [s.fundCode, gun, h.ruleId, h.value, h.points],
        );
      }
    }
    await c.query('COMMIT');
    return satirlar.filter((s) => s.score > 0).length;
  } catch (err) {
    await c.query('ROLLBACK');
    throw err;
  } finally {
    c.release();
  }
}

export interface AlarmKural {
  id: number; kind: string; family: string; label: string;
  windowDays: number; threshold: string; threshold2: string | null;
  points: number; isActive: boolean; sort: number;
}

export async function alarmKurallari(pool: pg.Pool): Promise<AlarmKural[]> {
  const r = await pool.query<AlarmKural>(
    `SELECT id, kind, family, label, window_days AS "windowDays",
            threshold::text, threshold2::text, points,
            is_active AS "isActive", sort
       FROM alarm_rule ORDER BY sort, id`,
  );
  return r.rows;
}

export interface AlarmAyar {
  families: { code: string; label: string; cap: number; sort: number }[];
  levels: { code: string; label: string; minScore: number; sort: number }[];
  rules: AlarmKural[];
}

export async function alarmAyarlari(pool: pg.Pool): Promise<AlarmAyar> {
  const [f, l, rules] = await Promise.all([
    pool.query(`SELECT code, label, cap, sort FROM alarm_family ORDER BY sort`),
    pool.query(`SELECT code, label, min_score AS "minScore", sort FROM alarm_level ORDER BY sort`),
    alarmKurallari(pool),
  ]);
  return { families: f.rows as AlarmAyar['families'], levels: l.rows as AlarmAyar['levels'], rules };
}

/** Kural alanlarını günceller. Yalnız verilen alanlara dokunur. */
export async function alarmKuralGuncelle(
  pool: pg.Pool,
  id: number,
  patch: { windowDays?: number; threshold?: number; threshold2?: number | null;
           points?: number; isActive?: boolean; label?: string },
  userId: number,
): Promise<void> {
  const set: string[] = [];
  const val: unknown[] = [id, userId];
  const ekle = (sutun: string, deger: unknown): void => {
    val.push(deger);
    set.push(`${sutun} = $${String(val.length)}`);
  };
  if (patch.windowDays !== undefined) ekle('window_days', patch.windowDays);
  if (patch.threshold !== undefined) ekle('threshold', patch.threshold);
  if (patch.threshold2 !== undefined) ekle('threshold2', patch.threshold2);
  if (patch.points !== undefined) ekle('points', patch.points);
  if (patch.isActive !== undefined) ekle('is_active', patch.isActive);
  if (patch.label !== undefined) ekle('label', patch.label);
  if (set.length === 0) return;
  await pool.query(
    `UPDATE alarm_rule SET ${set.join(', ')}, updated_at = now(), updated_by = $2 WHERE id = $1`,
    val,
  );
}

export async function alarmAileGuncelle(pool: pg.Pool, code: string, cap: number): Promise<void> {
  await pool.query('UPDATE alarm_family SET cap = $2 WHERE code = $1', [code, cap]);
}

export async function alarmKademeGuncelle(pool: pg.Pool, code: string, minScore: number): Promise<void> {
  await pool.query('UPDATE alarm_level SET min_score = $2 WHERE code = $1', [code, minScore]);
}

/** Son veri günü: alarmlar bu güne göre hesaplanır. */
export async function alarmSonGun(pool: pg.Pool): Promise<string | null> {
  const r = await pool.query<{ d: string | null }>(
    `SELECT to_char(max(trade_date), 'YYYY-MM-DD') d
       FROM fact_fund_daily WHERE daily_return_pct IS NOT NULL`,
  );
  return r.rows[0]?.d ?? null;
}
