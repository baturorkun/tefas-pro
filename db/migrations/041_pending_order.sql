-- Tutarla verilen alım emri.
--
-- TEFAS'ta emir tutarla verilir; kaç pay alındığı fiyat açıklanınca belli
-- olur. portfolio_transaction.units NOT NULL olduğu için emir o anda
-- kaydedilemiyordu.
--
-- Ayrı tablo, çünkü emir pozisyon değil: adedi, maliyeti ve getirisi yok.
-- units'i nullable yapmak altı analytics view'ı ve FIFO maliyet zincirini
-- etkilerdi; NULL bir adet oraya sızarsa rakam ekranda hata vermeden bozulur.
-- Bu tablo hiçbir view'a girmiyor, var olan tek bir hesap değişmiyor.
CREATE TABLE IF NOT EXISTS pending_order (
  id          serial PRIMARY KEY,
  user_id     integer NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  fund_code   text    NOT NULL,
  platform    text    NOT NULL REFERENCES bank (name),
  -- Emrin verildiği gün. Fiyatlanacağı gün valörden hesaplanıyor ve
  -- saklanmıyor: valör tanımı değişirse saklanmış tarih eskir.
  order_date  date    NOT NULL,
  amount      numeric(24, 2) NOT NULL CHECK (amount > 0),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pending_order_user_idx ON pending_order (user_id, order_date);

COMMENT ON TABLE pending_order IS
  'Tutarla verilmiş, adedi henüz belli olmayan alım emirleri. Hiçbir analytics view''ına girmez.';
