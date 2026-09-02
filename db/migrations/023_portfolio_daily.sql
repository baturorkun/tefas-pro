-- Portföyün günlük değer serisi ve sermaye hareketinden arındırılmış kazancı.
--
-- Grafiğin ihtiyacı gün bazında portföy değeri; böyle bir seri bugün yok.
-- Saklanan bir snapshot da tutulmuyor ve tutulmasına gerek yok: seri, o gün
-- açık olan pozisyonların o günkü fiyatla çarpımından her zaman yeniden
-- hesaplanabilir.
--
-- Birim fiyat geçmişi ise ölçülmüş halde yok. Kaynak fon başına yalnız güncel
-- fiyatı veriyor (bkz. src/collector.ts mergeDailySources), o yüzden
-- nav_per_share ancak collector koştukça birikiyor ve 2026-08-28'de başlamış.
-- Getiri serisi 2021'e kadar eksiksiz olduğundan fiyat zincirlenerek türetilir:
--
--   nav(t) = nav_ölçülen × exp( Σ ln(1 + getiri/100) )   ölçüm gününden t'ye
--
-- 022_nav_carry_forward aynı zinciri ileri yönde kuruyordu. Burada kümülatif
-- toplam farkı kullanılır, böylece tek ifade her iki yönde de çalışır: ölçüm
-- gününden önceki günler için üs negatif çıkar ve bölme yerine geçer.
--
-- 022'nin koyduğu kural burada da geçerli: türetilmiş fiyat tabloya yazılmaz,
-- ölçülmüş fiyat gibi görünmez. Ölçülen bir değer geldiğinde zincir kendini
-- ona göre yeniden kurar.
DROP VIEW IF EXISTS analytics.portfolio_daily;

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
gunluk AS (
  SELECT
    t.user_id,
    n.trade_date,
    -- O gün açık olan pozisyonların değeri.
    sum(t.units * n.nav) FILTER (
      WHERE t.trade_date <= n.trade_date
        AND (t.sell_date IS NULL OR t.sell_date > n.trade_date)
    ) AS value,
    -- O gün açılan pozisyonlar: yeni sermaye, kazanç değil.
    coalesce(sum(t.units * n.nav) FILTER (WHERE t.trade_date = n.trade_date), 0) AS inflow,
    -- O gün kapanan pozisyonlar: değerden düşer ama kayıp değil.
    coalesce(sum(t.units * n.nav) FILTER (WHERE t.sell_date = n.trade_date), 0) AS outflow
  FROM portfolio_transaction t
  JOIN nav n ON n.fund_code = t.fund_code
   AND n.trade_date >= t.trade_date
   AND n.trade_date <= coalesce(t.sell_date, n.trade_date)
  GROUP BY t.user_id, n.trade_date
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
  'Gün bazında portföy değeri ve sermaye hareketinden arındırılmış günlük kazanç. Fiyat, ölçülen son fiyattan zincirlenerek türetilir.';
