-- Fon bazında günlük değer ve kazanç.
--
-- portfolio_daily aynı hesabı portföyün TAMAMI için yapıyordu; fon detayında
-- "bu fondan hangi gün ne kazandım" sorusunun cevabı yoktu.
--
-- NAV zincirlemesi ortak parçaydı ve iki yerde kopyalanacaktı. Ayrı bir
-- view'a çıkarıldı: fiyat geçmişi saklanmadığı için günlük getirilerden
-- türetiliyor ve bu hesabın iki ayrı yerde yaşaması, birinde yapılan
-- düzeltmenin diğerinde unutulması demekti.
CREATE VIEW analytics.fund_nav AS
  SELECT d.fund_code,
         d.trade_date,
         b.nav_per_share * exp(
           sum(ln(greatest(1 + d.daily_return_pct / 100, 0.000000001)))
             OVER (PARTITION BY d.fund_code ORDER BY d.trade_date)
           - b.cum_at_base) AS nav
    FROM fact_fund_daily d
    JOIN LATERAL (
      SELECT n.nav_per_share,
             (SELECT coalesce(sum(ln(greatest(1 + x.daily_return_pct / 100, 0.000000001))), 0)
                FROM fact_fund_daily x
               WHERE x.fund_code = n.fund_code AND x.daily_return_pct IS NOT NULL
                 AND x.trade_date <= n.trade_date) AS cum_at_base
        FROM fact_fund_daily n
       WHERE n.fund_code = d.fund_code AND n.nav_per_share IS NOT NULL
       ORDER BY n.trade_date DESC
       LIMIT 1) b ON true
   WHERE d.daily_return_pct IS NOT NULL;

COMMENT ON VIEW analytics.fund_nav IS
  'Günlük getirilerden zincirlenmiş pay fiyatı. Fiyat geçmişi saklanmıyor.';

-- Fon bazında günlük seri.
--
-- Kazanç nakit akışından arındırılıyor: o gün fona para eklendiyse değer
-- artışının bir kısmı kazanç değil yeni paradır. Ham fark yazılsaydı alım
-- yapılan gün dev bir kazanç gibi görünürdü.
--
-- Eksik fiyat koruması FON BAŞINA: bir fonun o gün fiyatı yoksa yalnız o fon
-- o günü kaybeder. portfolio_daily'de koruma portföy geneli — bir fonun
-- eksik fiyatı bütün günü düşürüyor, çünkü orada toplam eksik çıkardı.
-- Bu yüzden portfolio_daily bu view'ın toplamı olarak yeniden tanımlanmadı;
-- ikisi farklı sorulara cevap veriyor ve sayıları o günlerde ayrışır.
CREATE VIEW analytics.fund_daily AS
  WITH gun AS (SELECT DISTINCT trade_date FROM analytics.fund_nav),
  bacak AS (
    SELECT t.user_id, t.fund_code, g.trade_date, t.units,
           t.trade_date AS alis, t.sell_date, n.nav
      FROM portfolio_transaction t
      JOIN gun g ON g.trade_date >= t.trade_date
                AND (t.sell_date IS NULL OR g.trade_date <= t.sell_date)
      LEFT JOIN analytics.fund_nav n
             ON n.fund_code = t.fund_code AND n.trade_date = g.trade_date),
  gunluk AS (
    SELECT user_id, fund_code, trade_date,
           sum(units * nav) FILTER (
             WHERE alis <= trade_date AND (sell_date IS NULL OR sell_date > trade_date)) AS value,
           coalesce(sum(units * nav) FILTER (WHERE alis = trade_date), 0) AS inflow,
           coalesce(sum(units * nav) FILTER (WHERE sell_date = trade_date), 0) AS outflow
      FROM bacak
     GROUP BY user_id, fund_code, trade_date
    HAVING count(*) FILTER (WHERE nav IS NULL) = 0)
  SELECT user_id, fund_code, trade_date, value, inflow, outflow,
         value + outflow
           - lag(value) OVER (PARTITION BY user_id, fund_code ORDER BY trade_date)
           - inflow AS daily_gain,
         lag(value) OVER (PARTITION BY user_id, fund_code ORDER BY trade_date) AS prev_value
    FROM gunluk
   WHERE value IS NOT NULL;

COMMENT ON VIEW analytics.fund_daily IS
  'Fon başına günlük değer ve nakit akışından arındırılmış kazanç.';
