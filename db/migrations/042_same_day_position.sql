-- Aynı gün alınan pozisyon hesaba giriyor.
--
-- Üç view de bacakları "days > 0" ile süzüyordu: alış gününden sonraki fiyat
-- günü sayısı. Aynı gün alınan pozisyonda o sayı sıfır, m_start da boş
-- çarpımdan NULL geliyor ve satır düşüyordu. Oysa o günün fiyatı elimizde;
-- maliyet o fiyattan, değer aynı fiyattan, kâr/zarar sıfır. Doğru cevap
-- "bilinmiyor" değil, sıfır. Ölçüldü: 2026-09-08'de 10 işlem, 2 kullanıcı.
--
-- Koşulu tamamen kaldırmak yetmez: o zaman ileri tarihli alım da bugünkü
-- fiyattan değerlenir ve fiyatı açıklanmamış bir işlem için uydurulmuş bir
-- maliyet üretilirdi. Ayrım gün sayısı değil, alış gününün veri gününü
-- geçip geçmediği.
--
-- Üçü birlikte değişiyor; ayrı kalsalardı Portföyüm, Dağılım ve Kapananlar
-- farklı toplam gösterirdi.

-- position_return
CREATE OR REPLACE VIEW analytics.position_return AS
WITH son AS (
  SELECT max(trade_date) AS d FROM fact_fund_daily WHERE daily_return_pct IS NOT NULL
), leg AS (
  SELECT
    l.*,
    (SELECT exp(sum(ln(1 + d.daily_return_pct / 100)))
     FROM fact_fund_daily d
     WHERE d.fund_code = l.fund_code AND d.daily_return_pct IS NOT NULL
       AND d.trade_date > l.start_date)                      AS m_start,
    coalesce((SELECT exp(sum(ln(1 + d.daily_return_pct / 100)))
              FROM fact_fund_daily d
              WHERE d.fund_code = l.fund_code AND d.daily_return_pct IS NOT NULL
                AND d.trade_date > l.end_date), 1)           AS m_end,
    (SELECT count(*)
     FROM fact_fund_daily d
     WHERE d.fund_code = l.fund_code AND d.daily_return_pct IS NOT NULL
       AND d.trade_date > l.start_date AND d.trade_date <= l.end_date) AS days
  FROM analytics.position_leg l
), tl AS (
  SELECT leg.*,
         -- Boş çarpım nötr elemandır: alış gününden sonra hiç fiyat günü
         -- yoksa taşıma katsayısı 1'dir, NULL değil.
         nav.nav_per_share / coalesce(leg.m_start, 1) AS nav_buy,
         nav.nav_per_share / leg.m_end   AS nav_end
  FROM leg
  LEFT JOIN analytics.fund_latest nav USING (fund_code)
  -- Ayrım gün sayısı değil, alış gününün veri gününü geçip geçmediği.
  -- days > 0 aynı gün alınan pozisyonu da düşürüyordu; oysa o günün fiyatı
  -- elimizde ve doğru cevap "bilinmiyor" değil, sıfır.
  WHERE leg.start_date <= (SELECT max(trade_date) FROM fact_fund_daily
                            WHERE daily_return_pct IS NOT NULL)
)
SELECT
  tl.user_id,
  tl.fund_code,
  f.title,
  tl.is_open,
  tl.simulated,
  min(tl.start_date)                                         AS first_date,
  max(tl.days)                                               AS days,
  round((sum(tl.units * tl.nav_end) / sum(tl.units * tl.nav_buy) - 1) * 100, 4) AS return_pct,
  CASE WHEN tl.simulated THEN NULL ELSE sum(tl.units) END                       AS units,
  CASE WHEN tl.simulated THEN NULL ELSE round(sum(tl.units * tl.nav_buy), 2) END AS cost,
  CASE WHEN tl.simulated THEN NULL ELSE round(sum(tl.units * tl.nav_end), 2) END AS value,
  CASE WHEN tl.simulated THEN NULL
       ELSE round(sum(tl.units * (tl.nav_end - tl.nav_buy)), 2) END              AS gain
FROM tl
LEFT JOIN dim_fund f USING (fund_code)
GROUP BY tl.user_id, tl.fund_code, f.title, tl.is_open, tl.simulated;

-- position_slice
CREATE OR REPLACE VIEW analytics.position_slice AS
WITH son AS (
  SELECT max(trade_date) AS d FROM fact_fund_daily WHERE daily_return_pct IS NOT NULL
), leg AS (
  SELECT
    p.id, p.user_id, p.fund_code, p.platform, p.units,
    p.trade_date AS start_date,
    -- Gerçekleşmemiş satışta değerleme son veri gününde durur.
    CASE
      WHEN p.sell_date IS NULL OR p.sell_date > (SELECT d FROM son) THEN (SELECT d FROM son)
      ELSE p.sell_date
    END AS end_date,
    (p.sell_date IS NULL OR p.sell_date > current_date) AS is_open
  FROM analytics.settled_transaction p
), carpan AS (
  SELECT
    leg.*,
    (SELECT exp(sum(ln(1 + d.daily_return_pct / 100)))
     FROM fact_fund_daily d
     WHERE d.fund_code = leg.fund_code AND d.daily_return_pct IS NOT NULL
       AND d.trade_date > leg.start_date)                    AS m_start,
    coalesce((SELECT exp(sum(ln(1 + d.daily_return_pct / 100)))
              FROM fact_fund_daily d
              WHERE d.fund_code = leg.fund_code AND d.daily_return_pct IS NOT NULL
                AND d.trade_date > leg.end_date), 1)         AS m_end,
    (SELECT count(*)
     FROM fact_fund_daily d
     WHERE d.fund_code = leg.fund_code AND d.daily_return_pct IS NOT NULL
       AND d.trade_date > leg.start_date AND d.trade_date <= leg.end_date) AS days
  FROM leg
)
SELECT
  c.user_id,
  c.id AS transaction_id,
  c.fund_code,
  f.title,
  c.platform,
  f.umbrella_type,
  c.is_open,
  c.units,
  -- Boş çarpım nötr elemandır: alış gününden sonra fiyat günü yoksa 1.
  round(c.units * nav.nav_per_share / coalesce(c.m_start, 1), 2) AS cost,
  round(c.units * nav.nav_per_share / c.m_end, 2)   AS value
FROM carpan c
JOIN analytics.fund_latest nav USING (fund_code)
LEFT JOIN dim_fund f ON f.fund_code = c.fund_code
-- Getiri günü olmayan bacak dışarıda: aynı gün alınmış, henüz ölçülemiyor.
-- position_return da aynı satırları dışarıda bırakıyor, iki ekran tutarlı kalır.
-- Ayrım gün sayısı değil, alış gününün veri gününü geçip geçmediği. Aynı gün
-- alınan pozisyonun fiyatı elimizde; ileri tarihli alımın değil.
WHERE c.start_date <= (SELECT d FROM son);

-- closed_position
CREATE OR REPLACE VIEW analytics.closed_position AS
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
  FROM analytics.settled_transaction p
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
  round(leg.units * nav.nav_per_share / coalesce(leg.m_buy, 1), 2)  AS buy_value,
  round(leg.units * nav.nav_per_share / leg.m_sell, 2) AS sell_value,
  round(leg.units * (nav.nav_per_share / leg.m_sell - nav.nav_per_share / coalesce(leg.m_buy, 1)), 2)
    AS realized_gain,
  round((coalesce(leg.m_buy, 1) / leg.m_sell - 1) * 100, 4) AS realized_pct
FROM leg
JOIN analytics.fund_latest nav USING (fund_code)
LEFT JOIN dim_fund f USING (fund_code)
-- Alış günü veri gününü geçmişse fiyat henüz açıklanmamış: değerlenemez.
-- m_buy NULL olması ise "aynı gün alınmış" demek ve o ölçülebiliyor.
WHERE leg.buy_date <= (SELECT max(trade_date) FROM fact_fund_daily
                        WHERE daily_return_pct IS NOT NULL);