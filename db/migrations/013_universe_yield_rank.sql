-- Tüm evren için dönemsel getiri sıralaması, günlük snapshot.
--
-- RQ-0003 veritabanını takip listesiyle sınırlamıştı ve o kural korunur:
-- evrenin tamamı saklanmaz, yalnız her pencere için en iyi ve en kötü N fon
-- yazılır. Dashboard'ın ihtiyacı bu; gerisi saklanırsa tablo amaçsız büyür.
--
-- fund_code dim_fund'a foreign key DEĞİLDİR: buradaki fonların çoğu takip
-- listesinde değil, dolayısıyla dim_fund'da da yok. Unvan bu yüzden satırın
-- içinde durur.
CREATE TABLE fact_universe_yield_rank (
  as_of_date    date NOT NULL,
  window_key    text NOT NULL CHECK (window_key IN ('1w', '1m')),
  direction     text NOT NULL CHECK (direction IN ('top', 'bottom')),
  rank          integer NOT NULL CHECK (rank > 0),
  fund_code     text NOT NULL,
  title         text,
  return_pct    numeric(14, 4) NOT NULL,
  ingest_run_id integer REFERENCES ingest_run(id),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (as_of_date, window_key, direction, rank)
);

CREATE INDEX fact_universe_yield_rank_lookup
  ON fact_universe_yield_rank (window_key, direction, as_of_date DESC, rank);
