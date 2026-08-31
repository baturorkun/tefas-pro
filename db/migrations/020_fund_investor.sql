-- Fon başına yatırımcı sayısı değişimi: 1 hafta ve 1 ay.
--
-- fund_flow paranın nereye gittiğini gösteriyor; bu view kimin gittiğini.
-- İkisi aynı şey değil: PBR'de son ay para −%90,4 çıkarken insan −%53,4
-- azalmış. Para insandan hızlı çıkıyorsa önce büyük yatırımcılar gidiyordur.
--
-- Ölçüt fund_flow ile aynı: değişim / pencere başı ve sonunun BÜYÜĞÜ.
-- Yalnız pencere başına bölmek azalışta çalışır (doğal olarak −%100'de
-- sınırlı) ama artışta patlar: THF ay başında 6.523 yatırımcıdan 111.839'a
-- çıkmış, başa vurunca +%1614,5 veriyor. Büyüğe bölünce +%94,2.
--
-- Pencere son VERİ gününe göre kayar, takvim gününe değil — fund_returns ve
-- fund_flow ile aynı kural.
CREATE VIEW analytics.fund_investor AS
WITH son AS (
  SELECT max(trade_date) AS d FROM fact_fund_daily WHERE investor_count IS NOT NULL
), pencere AS (
  -- investor_count her gün dolmayabilir; pencere içindeki ilk ve son DOLU
  -- değerler alınır.
  SELECT
    d.fund_code,
    (array_agg(d.investor_count ORDER BY d.trade_date)
       FILTER (WHERE d.trade_date > (SELECT d FROM son) - 7))[1]       AS bas_1w,
    (array_agg(d.investor_count ORDER BY d.trade_date DESC)
       FILTER (WHERE d.trade_date > (SELECT d FROM son) - 7))[1]       AS bit_1w,
    count(*) FILTER (WHERE d.trade_date > (SELECT d FROM son) - 7)     AS days_1w,
    (array_agg(d.investor_count ORDER BY d.trade_date)
       FILTER (WHERE d.trade_date > (SELECT d FROM son) - 30))[1]      AS bas_1m,
    (array_agg(d.investor_count ORDER BY d.trade_date DESC)
       FILTER (WHERE d.trade_date > (SELECT d FROM son) - 30))[1]      AS bit_1m,
    count(*) FILTER (WHERE d.trade_date > (SELECT d FROM son) - 30)    AS days_1m
  FROM fact_fund_daily d
  WHERE d.investor_count IS NOT NULL
  GROUP BY d.fund_code
)
SELECT
  p.fund_code,
  f.title,
  (SELECT d FROM son)                       AS as_of_date,
  p.bit_1w - p.bas_1w                       AS change_1w,
  p.days_1w,
  round((p.bit_1w - p.bas_1w)::numeric
        / nullif(greatest(p.bas_1w, p.bit_1w), 0) * 100, 2) AS change_pct_1w,
  p.bit_1m - p.bas_1m                       AS change_1m,
  p.days_1m,
  round((p.bit_1m - p.bas_1m)::numeric
        / nullif(greatest(p.bas_1m, p.bit_1m), 0) * 100, 2) AS change_pct_1m
FROM pencere p
LEFT JOIN dim_fund f USING (fund_code);
