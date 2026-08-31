-- Takip listesi kullanıcıya ait olur.
--
-- Eski `watchlist` tablosu iki işi birden yapıyordu: "ben neyi izliyorum" ve
-- "collector neyi toplasın". Birincisi kullanıcı başına, ikincisi türetilmiş
-- olmalı; tek tabloda ikisi de yanlış oluyordu.
--
-- `status` sütunu kaldırılıyor. Elle tutuluyordu ve zaten gerçekle uyuşmuyordu
-- (36 satırın hepsi 'owned' iken 10 fondan tamamen çıkılmıştı). Asıl sebep:
-- durum kullanıcıya göre değişir — aynı fon biri için "sahibim", diğeri için
-- "izliyorum" olabilir. Tek sütun bunu taşıyamaz, işlemlerden türetilir.
CREATE TABLE user_watchlist (
  user_id   integer NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  fund_code text NOT NULL REFERENCES dim_fund(fund_code),
  added_at  timestamptz NOT NULL DEFAULT now(),
  note      text,
  PRIMARY KEY (user_id, fund_code)
);

CREATE INDEX user_watchlist_fund_idx ON user_watchlist (fund_code);

-- Mevcut satırlar en düşük id'li admin'e taşınır. Boş veritabanında bu sorgu
-- hiçbir şey yapmaz; veri taşıma tek seferlik bir işlem olarak ayrıca yapılır.
INSERT INTO user_watchlist (user_id, fund_code, added_at, note)
SELECT (SELECT min(id) FROM app_user WHERE type = 'admin'), w.fund_code, w.added_at, w.note
FROM watchlist w
WHERE EXISTS (SELECT 1 FROM app_user WHERE type = 'admin')
ON CONFLICT DO NOTHING;

-- Eski tabloya bağlı view'lar önce düşürülür; fon bazlı halleri sonraki
-- migration'da yeniden kurulur.
DROP VIEW IF EXISTS analytics.watchlist_latest;
DROP VIEW IF EXISTS analytics.watchlist_daily;
DROP VIEW IF EXISTS analytics.watchlist_allocation;
DROP VIEW IF EXISTS analytics.watchlist_returns;
DROP VIEW IF EXISTS analytics.watchlist_monthly;
DROP TABLE watchlist;
