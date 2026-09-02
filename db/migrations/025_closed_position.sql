-- Kapanmış pozisyonların gerçekleşen kâr/zararı.
--
-- Uygulama yalnız açık pozisyonları gösteriyordu; satılan bir pozisyonun ne
-- kazandırdığı hiçbir ekranda yoktu.
--
-- Değerleme açık pozisyonlarla aynı yöntemle yapılır: fiyat, ölçülen son
-- fiyattan getiri serisiyle zincirlenir (bkz. 022 ve 023). Alış fiyatı alım
-- gününe, satış fiyatı satış gününe zincirlenir; ikisi arasındaki fark o
-- işlemin gerçekleşen sonucudur.
--
-- Kapanma tanımı 024 ile aynıdır: sell_date gerçekleşme tarihidir, bugün veya
-- geçmişse pozisyon kapalıdır. İleri tarihli satışı olan kayıt burada
-- görünmez, portföyde açık durur.
--
-- Satır kırılımı işlem başınadır, fon başına değil: aynı fondan farklı
-- tarihlerde alınıp ayrı ayrı satılan pozisyonlar ayrı sonuçlar üretir ve
-- kullanıcı hangi alımın ne kazandırdığını görmek ister.
DROP VIEW IF EXISTS analytics.closed_position;

CREATE VIEW analytics.closed_position AS
WITH leg AS (
  SELECT
    p.user_id,
    p.fund_code,
    p.platform,
    p.units,
    p.trade_date AS buy_date,
    p.sell_date  AS sell_date,
    -- Alım gününden bugüne ve satış gününden bugüne bileşik getiri çarpanları.
    -- Bugünkü fiyatı bunlara bölmek o günkü fiyatı verir.
    (SELECT exp(sum(ln(greatest(1 + d.daily_return_pct / 100, 1e-9))))
     FROM fact_fund_daily d
     WHERE d.fund_code = p.fund_code AND d.daily_return_pct IS NOT NULL
       AND d.trade_date > p.trade_date)                       AS m_buy,
    coalesce((SELECT exp(sum(ln(greatest(1 + d.daily_return_pct / 100, 1e-9))))
              FROM fact_fund_daily d
              WHERE d.fund_code = p.fund_code AND d.daily_return_pct IS NOT NULL
                AND d.trade_date > p.sell_date), 1)           AS m_sell,
    (SELECT count(*)
     FROM fact_fund_daily d
     WHERE d.fund_code = p.fund_code AND d.daily_return_pct IS NOT NULL
       AND d.trade_date > p.trade_date AND d.trade_date <= p.sell_date) AS held_days
  FROM portfolio_transaction p
  WHERE p.sell_date IS NOT NULL AND p.sell_date <= current_date
)
SELECT
  leg.user_id,
  leg.fund_code,
  f.title,
  leg.platform,
  leg.buy_date,
  leg.sell_date,
  leg.held_days,
  leg.units,
  round(leg.units * nav.nav_per_share / leg.m_buy, 2)  AS buy_value,
  round(leg.units * nav.nav_per_share / leg.m_sell, 2) AS sell_value,
  round(leg.units * (nav.nav_per_share / leg.m_sell - nav.nav_per_share / leg.m_buy), 2)
    AS realized_gain,
  round((leg.m_buy / leg.m_sell - 1) * 100, 4) AS realized_pct
FROM leg
JOIN analytics.fund_latest nav USING (fund_code)
LEFT JOIN dim_fund f USING (fund_code)
-- m_buy yoksa alım gününden sonra hiç fiyat günü yok: değerlenemez.
WHERE leg.m_buy IS NOT NULL;

COMMENT ON VIEW analytics.closed_position IS
  'Kapanmış pozisyonların işlem başına gerçekleşen kâr/zararı. Fiyat, ölçülen son fiyattan zincirlenir.';
