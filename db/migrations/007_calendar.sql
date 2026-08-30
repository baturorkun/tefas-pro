-- İş günü takvimi. Cumartesi ve Pazar takvimden bilindiği için istek atılmaz;
-- resmî tatil önceden bilinemez, veriden anlaşılır: o pencerede API son iş
-- gününün değerini taşır ve pratikte her fonun değişimi 0 olur (ölçüm: tatil/
-- hafta sonu %99.9, iş günü %0.1). Collector bu tespiti buraya yazar.
CREATE TABLE dim_calendar (
  trade_date      date PRIMARY KEY,
  is_business_day boolean NOT NULL,
  updated_at      timestamptz NOT NULL DEFAULT now()
);
