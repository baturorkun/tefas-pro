-- Fon evreni. GET /funds/ tüm fonları tek istekte verir; takip listesine fon
-- ararken ve tarama yaparken buraya bakılır. Günlük seri burada tutulmaz.
CREATE TABLE dim_fund (
  fund_code             text PRIMARY KEY,
  title                 text COLLATE tr_tr,
  fund_type             text,   -- mutual | pension | realestate | exchange
  umbrella_type         text,   -- şemsiye fon tipi; bazı fonlarda null gelir
  management_company_id text,
  is_byf                boolean,
  first_seen_at         timestamptz NOT NULL DEFAULT now(),
  last_seen_at          timestamptz NOT NULL DEFAULT now()
);

-- Fonun ticari şartları. GET /funds/{KOD}/info/ verir ve yavaş değişir, ama
-- fona göre ciddi farklılık gösterir: stopaj %0 ile %17,5 arasında ölçüldü,
-- yönetim ücreti %1 ile %2,25 arasında, satış valörü 0 ile 2 gün arasında.
-- Net kâr/zarar bunlar olmadan hesaplanamaz.
CREATE TABLE dim_fund_terms (
  fund_code           text PRIMARY KEY REFERENCES dim_fund(fund_code),
  tax_pct             numeric(6, 3),   -- stopaj, yüzde
  management_fee_pct  numeric(6, 3),   -- yıllık yönetim ücreti, yüzde
  buy_valor_days      integer,
  sell_valor_days     integer,
  risk                integer,
  updated_at          timestamptz NOT NULL DEFAULT now()
);
