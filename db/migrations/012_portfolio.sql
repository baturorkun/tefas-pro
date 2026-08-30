-- Kullanıcının fon işlemleri.
--
-- Alanlar kullanıcının elindeki kayıt düzenini birebir karşılar: hangi fondan,
-- kaç pay, ne zaman, hangi platformdan alındı; satıldıysa ne zaman.
--
-- `platform` zorunludur çünkü aynı fon farklı platformlarda ayrı ayrı tutulur
-- (Fiba, Nkolay, Nkolay-B, YKB) ve maliyet takibi platform bazında yapılır.
--
-- `units` PAY ADEDİDİR, TL değil. Doğrulandı: TLY 67 adet x 9.145,58 TL birim
-- fiyat = 612.754 TL; TL olsaydı 24 TL'lik bir alım anlamsız olurdu.
CREATE TABLE portfolio_transaction (
  id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    integer NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  fund_code  text NOT NULL REFERENCES dim_fund(fund_code),
  platform   text NOT NULL,
  trade_date date NOT NULL,
  units      numeric(24, 6) NOT NULL CHECK (units > 0),
  sell_date  date,                       -- NULL ise pozisyon açık
  note       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT portfolio_transaction_sell_after_buy CHECK (sell_date IS NULL OR sell_date >= trade_date)
);

CREATE INDEX portfolio_transaction_user_idx ON portfolio_transaction (user_id, fund_code);
CREATE INDEX portfolio_transaction_open_idx ON portfolio_transaction (user_id) WHERE sell_date IS NULL;
