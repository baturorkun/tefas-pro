-- Eksik fiyatlı gün portföyü çökmüş gösteriyordu.
--
-- Eski view portföyü, o gün fiyatı olan fonlarla değerliyordu: bir fonun o
-- güne ait satırı yoksa join onu hiç üretmiyor ve pozisyon sessizce sıfır
-- sayılıyordu. Ölçülen veride 3 Eylül'de 39 fondan 2'si toplanmıştı ve değer
-- 3.762.405'ten 37.566'ya düşmüş, Eylül ayı -%99 çıkmıştı.
--
-- Durum erişilebilir: tek fonluk toplama sabahki tam taramadan önce çalışırsa
-- (gün içinde takip listesine fon eklendiğinde) o gün için tek fonluk bir
-- satır yazılıyor.
--
-- Çözüm: eksik fonu sıfır saymak yerine günü atlamak. O günkü değer gerçekten
-- bilinmiyor; uydurmak yerine ölçülmemiş saymak doğru. Sonraki günün getirisi
-- lag() ile son ÖLÇÜLEN güne göre hesaplandığı için kazanç kaybolmuyor,
-- yalnız iki güne yayılıyor.
DROP VIEW IF EXISTS analytics.portfolio_daily CASCADE;

CREATE VIEW analytics.portfolio_daily AS
WITH nav AS (
  -- Fon başına günlük fiyat: ölçülen son fiyattan zincirlenir.
  SELECT
    d.fund_code,
    d.trade_date,
    b.nav_per_share * exp(
      sum(ln(greatest(1 + d.daily_return_pct / 100, 1e-9)))
        OVER (PARTITION BY d.fund_code ORDER BY d.trade_date)
      - b.cum_at_base
    ) AS nav
  FROM fact_fund_daily d
  JOIN LATERAL (
    -- Zincirin dayandığı ölçülmüş fiyat ve o güne kadarki kümülatif çarpan.
    SELECT n.nav_per_share,
           (SELECT coalesce(sum(ln(greatest(1 + x.daily_return_pct / 100, 1e-9))), 0)
            FROM fact_fund_daily x
            WHERE x.fund_code = n.fund_code AND x.daily_return_pct IS NOT NULL
              AND x.trade_date <= n.trade_date) AS cum_at_base
    FROM fact_fund_daily n
    WHERE n.fund_code = d.fund_code AND n.nav_per_share IS NOT NULL
    ORDER BY n.trade_date DESC LIMIT 1
  ) b ON true
  WHERE d.daily_return_pct IS NOT NULL
),
gun AS (SELECT DISTINCT trade_date FROM nav),
-- Her bacak, açık olduğu her gün için bir satır üretir. LEFT JOIN: fiyatı
-- olmayan gün de satır olarak çıkar ki eksikliği sayılabilsin.
bacak AS (
  SELECT
    t.user_id, g.trade_date, t.units, t.trade_date AS alis, t.sell_date, n.nav
  FROM portfolio_transaction t
  JOIN gun g
    ON g.trade_date >= t.trade_date
   AND (t.sell_date IS NULL OR g.trade_date <= t.sell_date)
  LEFT JOIN nav n ON n.fund_code = t.fund_code AND n.trade_date = g.trade_date
),
gunluk AS (
  SELECT
    user_id,
    trade_date,
    -- O gün açık olan pozisyonların değeri.
    sum(units * nav) FILTER (
      WHERE alis <= trade_date AND (sell_date IS NULL OR sell_date > trade_date)
    ) AS value,
    -- O gün açılan pozisyonlar: yeni sermaye, kazanç değil.
    coalesce(sum(units * nav) FILTER (WHERE alis = trade_date), 0) AS inflow,
    -- O gün kapanan pozisyonlar: değerden düşer ama kayıp değil.
    coalesce(sum(units * nav) FILTER (WHERE sell_date = trade_date), 0) AS outflow
  FROM bacak
  GROUP BY user_id, trade_date
  -- Fiyatı eksik bacağı olan gün hiç değerlenmez.
  HAVING count(*) FILTER (WHERE nav IS NULL) = 0
)
SELECT
  user_id,
  trade_date,
  value,
  inflow,
  outflow,
  -- Organik kazanç: değer farkından o günün sermaye hareketi çıkarılır.
  -- Para yatırılan gün fark büyük çıkar; inflow düşülmezse yatırılan para
  -- kazanç sayılır ve grafik o günü yüzde sekiz kazanç gibi gösterir.
  value + outflow - lag(value) OVER (PARTITION BY user_id ORDER BY trade_date) - inflow
    AS daily_gain,
  lag(value) OVER (PARTITION BY user_id ORDER BY trade_date) AS prev_value
FROM gunluk
WHERE value IS NOT NULL;

COMMENT ON VIEW analytics.portfolio_daily IS
  'Gün bazında portföy değeri ve sermaye hareketinden arındırılmış günlük kazanç. Fiyat, ölçülen son fiyattan zincirlenerek türetilir. Fiyatı eksik olan gün değerlenmez.';
