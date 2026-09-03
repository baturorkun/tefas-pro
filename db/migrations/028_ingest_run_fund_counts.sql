-- Koşumun kaç fonu güncellediği saklanmıyordu, yalnız yazılan satır sayısı
-- vardı. Fon sayısı fact_fund_daily.ingest_run_id üzerinden türetilemiyor:
-- sonraki koşumlar aynı satırların üzerine yazınca sütun el değiştiriyor ve
-- eski koşumlar olduğundan az fona sahip görünüyor — 38 fonluk bir koşum
-- tabloda 23 fon gibi duruyordu.
--
-- Collector bu sayıları zaten tutuyor ve konsola yazıyordu; artık kaydediliyor.
ALTER TABLE ingest_run
  ADD COLUMN funds_ok     integer NOT NULL DEFAULT 0,
  ADD COLUMN funds_failed integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN ingest_run.funds_ok IS 'Koşumda başarıyla toplanan fon sayısı.';
COMMENT ON COLUMN ingest_run.funds_failed IS 'Koşumda hata alan fon sayısı.';
