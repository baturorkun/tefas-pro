-- Her collector çalışması buraya bir satır bırakır. Fact tabloları hangi run'da
-- yazıldıklarını taşır, böylece bozuk bir run'ın etkisi izlenebilir.
CREATE TABLE ingest_run (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source        text NOT NULL,
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  status        text NOT NULL DEFAULT 'running'
                CHECK (status IN ('running', 'passed', 'partial', 'failed')),
  rows_upserted integer NOT NULL DEFAULT 0,
  last_error    text
);
