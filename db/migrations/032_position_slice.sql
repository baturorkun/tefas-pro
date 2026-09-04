-- Bacak bazında portföy dilimi: bankaya veya kategoriye göre gruplanabilsin.
--
-- analytics.position_return aynı hesabı yapıyor ama fon bazında topluyor ve
-- platform bilgisini düşürüyor; aynı fon iki bankada tutulabildiği için oradan
-- banka kırılımı çıkarılamıyor.
--
-- Maliyet ve değer tanımı position_return ile birebir aynı: fiyat geçmişi
-- saklanmıyor, alış fiyatı bugünkü fiyatın o günden bu yana biriken getiriye
-- bölünmesiyle bulunuyor. Tanım ayrışsaydı Dağılım ekranının toplamı
-- Portföyüm'ünkiyle tutmazdı.
CREATE VIEW analytics.position_slice AS
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
  FROM portfolio_transaction p
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
  round(c.units * nav.nav_per_share / c.m_start, 2) AS cost,
  round(c.units * nav.nav_per_share / c.m_end, 2)   AS value
FROM carpan c
JOIN analytics.fund_latest nav USING (fund_code)
LEFT JOIN dim_fund f ON f.fund_code = c.fund_code
-- Getiri günü olmayan bacak dışarıda: aynı gün alınmış, henüz ölçülemiyor.
-- position_return da aynı satırları dışarıda bırakıyor, iki ekran tutarlı kalır.
WHERE c.days > 0 AND c.m_start IS NOT NULL;

COMMENT ON VIEW analytics.position_slice IS
  'Bacak bazında maliyet ve güncel değer, banka ve kategori bilgisiyle. Dağılım ekranı buradan gruplar.';
