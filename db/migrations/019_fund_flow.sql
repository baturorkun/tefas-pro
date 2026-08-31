-- Fon başına net para akışı: 1 hafta ve 1 ay.
--
-- Projenin ilk gerekçesi: "bazı fonlarda büyük bir çıkış başlıyor ve hemen
-- fiyatı düşüyor." Veri toplanıyordu ama panelde hiç görünmüyordu.
--
-- Sıralama ORANA göre yapılır, ham TL'ye göre değil. Ham TL fon büyüklüğünü
-- sıralar, sıkıntıyı değil: HRZ parasının üçte birini kaybederken −0,12 mr₺
-- olduğu için ham listede görünmüyor, PRY ise 112 mr₺'lik fonun %7'siyle
-- üçüncü sıraya çıkıyor.
--
-- Payda: pencere başı ve sonu büyüklüklerin BÜYÜĞÜ.
--
-- Güncel büyüklüğe bölmek yanlış: PBR bugünkü 5,59 mr₺'ye bölününce −%477
-- çıkıyor, çünkü payda zaten erimiş olan tutar.
--
-- Yalnız pencere başına bölmek de yanlış — çıkışta doğru çalışıyor ama girişte
-- patlıyor: THF ay başında 1,08 mr₺ iken 59,35 mr₺'ye çıkmış, orana vurunca
-- %5073 veriyor. Küçükten büyüyen her fon listeyi ele geçirirdi.
--
-- Büyüğe bölmek ikisini de çözer ve simetrik: PBR −%90,4 (başı büyük),
-- THF +%92,0 (sonu büyük). Okunuşu "fonun büyük halinin yüzde kaçı hareket
-- etti" — her iki yönde de ±%100 civarında sınırlı.
--
-- Pencere son VERİ gününe göre kayar, takvim gününe değil: hafta sonunda
-- veya tatilde pencere boş kalmasın. fund_returns ile aynı kural.
CREATE VIEW analytics.fund_flow AS
WITH son AS (
  SELECT max(trade_date) AS d FROM fact_fund_daily WHERE net_flow IS NOT NULL
), pencere AS (
  SELECT
    d.fund_code,
    sum(d.net_flow) FILTER (WHERE d.trade_date > (SELECT d FROM son) - 7)  AS flow_1w,
    count(*)        FILTER (WHERE d.trade_date > (SELECT d FROM son) - 7)  AS days_1w,
    sum(d.net_flow) FILTER (WHERE d.trade_date > (SELECT d FROM son) - 30) AS flow_1m,
    count(*)        FILTER (WHERE d.trade_date > (SELECT d FROM son) - 30) AS days_1m
  FROM fact_fund_daily d
  WHERE d.net_flow IS NOT NULL
  GROUP BY d.fund_code
), buyukluk AS (
  -- aum her gün dolmayabilir, bu yüzden pencere içindeki ilk ve son DOLU
  -- değerler alınır.
  SELECT
    d.fund_code,
    greatest(
      (array_agg(d.aum ORDER BY d.trade_date)
         FILTER (WHERE d.aum IS NOT NULL
                 AND d.trade_date > (SELECT d FROM son) - 7))[1],
      (array_agg(d.aum ORDER BY d.trade_date DESC)
         FILTER (WHERE d.aum IS NOT NULL
                 AND d.trade_date > (SELECT d FROM son) - 7))[1]
    )  AS aum_1w,
    greatest(
      (array_agg(d.aum ORDER BY d.trade_date)
         FILTER (WHERE d.aum IS NOT NULL
                 AND d.trade_date > (SELECT d FROM son) - 30))[1],
      (array_agg(d.aum ORDER BY d.trade_date DESC)
         FILTER (WHERE d.aum IS NOT NULL
                 AND d.trade_date > (SELECT d FROM son) - 30))[1]
    )  AS aum_1m
  FROM fact_fund_daily d
  GROUP BY d.fund_code
)
SELECT
  p.fund_code,
  f.title,
  (SELECT d FROM son)                                          AS as_of_date,
  p.flow_1w,
  p.days_1w,
  round(p.flow_1w / nullif(b.aum_1w, 0) * 100, 2)              AS flow_pct_1w,
  p.flow_1m,
  p.days_1m,
  round(p.flow_1m / nullif(b.aum_1m, 0) * 100, 2)              AS flow_pct_1m
FROM pencere p
LEFT JOIN buyukluk b USING (fund_code)
LEFT JOIN dim_fund f USING (fund_code);
