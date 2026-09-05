-- Fonların hisse kırılımı ve hisse fiyatları.
--
-- Kaynak fvt.com.tr. Fintables'ın info ucu yalnız varlık sınıfı veriyor
-- (fact_fund_allocation, RQ-0038); kalem düzeyinde veri orada yok. TEFAS de
-- yayımlamıyor.
--
-- İki ayrı tablo çünkü iki ayrı zaman ekseni var: ağırlıklar aylık açıklanıyor
-- ve bir aya kadar eski olabiliyor, fiyatlar günlük. Tek tabloda birleştirmek
-- aylık bir satırı günlük tekrarlamak olurdu.

-- Fonun ay sonu hisse kırılımı.
--
-- as_of_date fonun portföyünü açıkladığı tarih, ölçüm tarihi değil: aynı
-- açıklama günlerce çekilse de tek satır kalsın diye anahtarın parçası.
CREATE TABLE fund_stock_holding (
  fund_code      text        NOT NULL REFERENCES dim_fund(fund_code),
  as_of_date     date        NOT NULL,
  stock_code     text        NOT NULL,
  company        text,
  sector         text,
  weight_pct     numeric(9,4) NOT NULL,
  -- Fonun bir önceki ay açıkladığı ağırlık ve fark. Kaynak veriyor; kendimiz
  -- türetmiyoruz çünkü geçmiş açıklamaların hepsi elimizde olmayabilir.
  prev_weight_pct numeric(9,4),
  weight_change   numeric(9,4),
  ingest_run_id  integer REFERENCES ingest_run(id),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (fund_code, as_of_date, stock_code)
);

COMMENT ON TABLE fund_stock_holding IS
  'Fonların ay sonu hisse kırılımı. Kaynak fvt.com.tr; ağırlıklar aylık açıklanır.';
COMMENT ON COLUMN fund_stock_holding.as_of_date IS
  'Fonun portföyünü açıkladığı tarih. Ölçüm tarihi değil.';

CREATE INDEX fund_stock_holding_stock_idx ON fund_stock_holding (stock_code);

-- Hisse günlük kapanışları.
--
-- Getiri saklanmaz, kapanıştan hesaplanır: kaynağın hazır getiri alanı
-- temettü düzeltmeli görünüyor (ASELS için %9,97 derken ham fiyat farkı
-- %9,75) ve hangi tanımı kullandığımızı bilmek istiyoruz.
CREATE TABLE fact_stock_daily (
  stock_code  text        NOT NULL,
  trade_date  date        NOT NULL,
  close       numeric(18,6) NOT NULL,
  ingest_run_id integer REFERENCES ingest_run(id),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (stock_code, trade_date)
);

COMMENT ON TABLE fact_stock_daily IS
  'Hisse günlük kapanışları. Getiri buradan hesaplanır, kaynaktan alınmaz.';
