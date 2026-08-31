-- Kullanıcının kendi getirisi: fonun değil, benim alış tarihime göre.
--
-- Fonun getirisi herkes için aynı; benimki alış tarihime bağlı. Fark küçük
-- değil: AFT fonu son ayda +%10,40 iken 74 gündür tutan kullanıcı −%1,59'da.
-- Panel bugün AFT'yi "kazandıran" tarafında gösteriyor.
--
-- NAV geçmişine gerek yok: getiri günlük getirilerin bileşiği, birim sadeleşir.
-- Zaten olmazdı — fact_fund_daily'de 30.643 satırın 36'sında nav_per_share
-- dolu, tarihsel NAV hiç toplanmamış. Günlük getiri 30.179 satırda var.
--
-- Alış NAV'ı da saklı değil, türetiliyor: bugünkü NAV / bileşik çarpan.
-- Doğrulandı — türetilen maliyetlerin 94'ten 79'u yuvarlak bin liralık
-- tutarlara bir adetlik fark içinde oturuyor.

-- Bir işlemin (veya simüle edilmiş takip satırının) bileşik çarpanı.
-- Pencere kırpılmaz: alış gününden bitişe kadar. Kırpmak denendi ve
-- reddedildi — 30 günden eski pozisyonlarda sonuç fon grafiğiyle birebir
-- aynı çıkıyor, yani körlük geri geliyor.
CREATE VIEW analytics.position_leg AS
SELECT
  p.user_id,
  p.fund_code,
  p.units,
  p.trade_date                AS start_date,
  coalesce(p.sell_date, (SELECT max(trade_date) FROM fact_fund_daily
                         WHERE daily_return_pct IS NOT NULL)) AS end_date,
  p.sell_date IS NULL         AS is_open,
  false                       AS simulated
FROM portfolio_transaction p
UNION ALL
-- Takip listesi "almış gibi": izlemeye başladığım gün alsaydım ne olurdu.
-- watchlist_visible kullanılır, user_watchlist değil — açık pozisyonu olan fon
-- zaten gerçek bacağıyla listede, iki kez sayılmamalı.
SELECT
  w.user_id,
  w.fund_code,
  1                           AS units,
  (w.added_at AT TIME ZONE 'Europe/Istanbul')::date AS start_date,
  (SELECT max(trade_date) FROM fact_fund_daily WHERE daily_return_pct IS NOT NULL),
  true                        AS is_open,
  true                        AS simulated
FROM analytics.watchlist_visible w;

-- Fon başına tek getiri. Ağırlık PARA, adet değil.
--
-- Aynı fondan farklı tarihlerde alım yapılınca çarpanların adet ağırlıklı
-- ortalaması yanlış sonuç verir: her adet farklı fiyattan alınmıştır.
--   DOĞRU:  Σadet / Σ(adet/çarpan) − 1
--   YANLIŞ: Σ(adet × çarpan) / Σadet − 1
-- TLY'de %63,48 yerine %72,33 veriyordu — dokuz puan.
--
-- Getiri günü olmayan bacak (aynı gün alınmış, henüz getiri yok) dışarıda
-- kalır: %0 göstermek "değişmedi" demek olurdu, oysa "henüz ölçülemiyor".
-- Fon başına tek getiri. Ağırlık PARA, adet değil.
--
-- Aynı fondan farklı tarihlerde alım yapılınca çarpanların adet ağırlıklı
-- ortalaması yanlış sonuç verir: her adet farklı fiyattan alınmıştır.
--   DOĞRU:  Σadet / Σ(adet/çarpan) − 1
--   YANLIŞ: Σ(adet × çarpan) / Σadet − 1
-- TLY'de %63,48 yerine %72,33 veriyordu — dokuz puan.
--
-- Tek çarpan tanımı: her tarihten SON VERİ GÜNÜNE kadar. Bir tarihin NAV'ı
-- bugünkü NAV'dan geriye yürünerek bulunur, getiri iki çarpanın oranıdır.
-- Alternatif — çarpanı satış gününde durdurmak — kapanmış pozisyonlarda TL
-- tutarlarını bozuyordu: maliyet bugünkü NAV'dan türetilirken çarpan satışta
-- kalınca ikisi aynı tarihe ait olmuyordu.
--
-- Getiri günü olmayan bacak (aynı gün alınmış) dışarıda kalır: %0 göstermek
-- "değişmedi" demek olurdu, oysa "henüz ölçülemiyor".
CREATE VIEW analytics.position_return AS
WITH son AS (
  SELECT max(trade_date) AS d FROM fact_fund_daily WHERE daily_return_pct IS NOT NULL
), leg AS (
  SELECT
    l.*,
    -- start_date → son veri günü
    (SELECT exp(sum(ln(1 + d.daily_return_pct / 100)))
     FROM fact_fund_daily d
     WHERE d.fund_code = l.fund_code AND d.daily_return_pct IS NOT NULL
       AND d.trade_date > l.start_date)                      AS m_start,
    -- end_date → son veri günü (açık pozisyonda 1)
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
         nav.nav_per_share / leg.m_start AS nav_buy,
         nav.nav_per_share / leg.m_end   AS nav_end
  FROM leg
  LEFT JOIN analytics.fund_latest nav USING (fund_code)
  WHERE leg.days > 0 AND leg.m_start IS NOT NULL
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
  -- Simüle bacakların adedi uydurma (1); TL tutarı yalnız gerçek pozisyonda
  -- anlamlı.
  CASE WHEN tl.simulated THEN NULL ELSE round(sum(tl.units * tl.nav_buy), 2) END AS cost,
  CASE WHEN tl.simulated THEN NULL ELSE round(sum(tl.units * tl.nav_end), 2) END AS value,
  CASE WHEN tl.simulated THEN NULL
       ELSE round(sum(tl.units * (tl.nav_end - tl.nav_buy)), 2) END              AS gain
FROM tl
LEFT JOIN dim_fund f USING (fund_code)
GROUP BY tl.user_id, tl.fund_code, f.title, tl.is_open, tl.simulated;
