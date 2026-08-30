-- Takip listesindeki fonların gün grain'indeki serisi.
--
-- Alanlar iki ayrı endpoint'ten gelir ve aynı güne yazılır:
--   /funds/{KOD}/price/       → nav_per_share (yalnız son gün)
--   /funds/{KOD}/volatility/  → daily_return_pct (16 aylık seri)
--   /funds/{KOD}/cashflow/    → net_flow (günlük seri)
--   /funds/{KOD}/info/        → shares_active, investor_count (yalnız son gün)
--
-- nav_per_share TÜRETİLMEZ. end_aum/shares_active hesabı para piyasası fonunda
-- tutuyor ama hisse fonunda tutmuyor (AAL %0, GAL %0,3, THF %1,8 sapma), bu
-- yüzden gerçek fiyat /price/ endpoint'inden alınır.
CREATE TABLE fact_fund_daily (
  fund_code        text NOT NULL REFERENCES dim_fund(fund_code),
  trade_date       date NOT NULL,
  nav_per_share    numeric(20, 6),
  daily_return_pct numeric(12, 6),
  net_flow         numeric(24, 2),   -- günlük net giriş − çıkış, TL
  shares_active    numeric(24, 2),
  investor_count   integer,
  aum              numeric(24, 2),
  source           text NOT NULL DEFAULT 'fintables',
  ingest_run_id    integer REFERENCES ingest_run(id),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (fund_code, trade_date)
);

CREATE INDEX fact_fund_daily_date_idx ON fact_fund_daily (trade_date);

-- Varlık sınıfı dağılımı (info.last_asset). Hisse senedi kırılımı alınmaz.
CREATE TABLE fact_fund_allocation (
  fund_code     text NOT NULL REFERENCES dim_fund(fund_code),
  as_of_date    date NOT NULL,
  asset_class   text NOT NULL,
  weight_pct    numeric(9, 4) NOT NULL,   -- kaldıraçlı fonlarda negatif olabilir
  ingest_run_id integer REFERENCES ingest_run(id),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (fund_code, as_of_date, asset_class)
);

-- Tüm evren için dönemsel getiri. GET /funds/yield/ geçmiş vermiyor: start/end
-- verilse de yield_1m…5y değişmiyor, hep çağrı anı itibarıyla geliyor. Bu yüzden
-- seri değil, gün gün biriken snapshot'tır. as_of_date ölçümün alındığı gündür.
CREATE TABLE fact_fund_yield_snapshot (
  fund_code     text NOT NULL REFERENCES dim_fund(fund_code),
  as_of_date    date NOT NULL,
  yield_1m      numeric(14, 4),
  yield_3m      numeric(14, 4),
  yield_6m      numeric(14, 4),
  yield_ytd     numeric(14, 4),
  yield_1y      numeric(14, 4),
  yield_3y      numeric(14, 4),
  yield_5y      numeric(14, 4),
  ingest_run_id integer REFERENCES ingest_run(id),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (fund_code, as_of_date)
);
