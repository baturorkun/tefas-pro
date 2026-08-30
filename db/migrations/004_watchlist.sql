-- Collector'ın kaynağı. Yalnızca burada listelenen fonlar için günlük seri
-- toplanır; 2823 fonluk evren için toplanmaz.
--   owned    : pozisyon tutuluyor
--   watching : henüz alınmadı, izleniyor
CREATE TABLE watchlist (
  fund_code text PRIMARY KEY REFERENCES dim_fund(fund_code),
  status    text NOT NULL DEFAULT 'watching' CHECK (status IN ('owned', 'watching')),
  added_at  timestamptz NOT NULL DEFAULT now(),
  note      text
);
