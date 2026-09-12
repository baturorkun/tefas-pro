-- Fon alarm motoru: kural tablosu, aile tavanları, renk eşikleri.
--
-- Ayrım şu: KURAL bir veri satırı, ÖLÇÜT bir kod parçası. `kind` hangi
-- ölçütün hesaplanacağını söyler ve sabit bir listedir; pencere, eşik ve puan
-- ekrandan değişir. Yeni bir ölçüt kod ister, yeni bir eşik istemez.
--
-- Eşikler yüksek tutulur. Ölçüldü: çıkış eşiği %2 olunca 72 fonun 23'ü,
-- yatırımcı azalması %2 olunca 16'sı ateşliyor. Haftada bir sarı yanan sistem
-- üçüncü haftada görmezden gelinir ve asıl kırmızıyı kaçırır.

-- ─── Aileler ────────────────────────────────────────────────────────────
-- Tavan neden var: getiri ailesinde dört kural var ve dördü de aynı şeyi
-- ölçüyor (fiyat düşüyor). Ölçüldü — PHE dördünü birden ateşleyip o aileden
-- 100 puan topluyor, akış ailesinden en fazla 65 gelebiliyor. Tavan olmadan
-- kural SAYISI sessizce ağırlık belirler.
CREATE TABLE alarm_family (
  code      text PRIMARY KEY,
  label     text    NOT NULL,
  cap       integer NOT NULL CHECK (cap > 0),
  sort      integer NOT NULL
);

INSERT INTO alarm_family (code, label, cap, sort) VALUES
  ('getiri',    'Getiri',      60, 1),
  ('akis',      'Para Akışı',  40, 2),
  ('operasyon', 'Operasyon',   30, 3);

-- ─── Kurallar ───────────────────────────────────────────────────────────
--
-- `kind` başına parametrelerin anlamı:
--
--   ardisik_eksi      esik = gun sayisi            (pencere kullanilmaz)
--   birikimli_getiri  esik = yuzde, <= ise atesler
--   gruba_gore        esik = puan farki, semsiye turu ortancasina gore
--   zirveden_dusus    esik = yuzde, pencere zirvesine gore
--   yatirimci_azalma  esik = yuzde degisim, <= ise atesler
--   net_cikis         esik = net akis / buyukluk yuzdesi
--   balina_cikis      esik = akis yuzdesi, esik2 = yatirimci degisim alt siniri
--   veri_yok          esik = fiyatsiz is gunu sayisi
--
-- Aynı `kind` birden fazla satır olabilir: kademeler. Aile içinde yalnız en
-- yüksek kademe puan verir, yoksa 5 güne ulaşan fon 3 gün kuralından da puan
-- alıp iki kez cezalandırılır.
CREATE TABLE alarm_rule (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind        text    NOT NULL,
  family      text    NOT NULL REFERENCES alarm_family(code),
  label       text    NOT NULL,
  window_days integer NOT NULL DEFAULT 5 CHECK (window_days BETWEEN 1 AND 60),
  threshold   numeric NOT NULL,
  threshold2  numeric,
  points      integer NOT NULL CHECK (points > 0),
  is_active   boolean NOT NULL DEFAULT true,
  sort        integer NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  integer REFERENCES app_user(id),
  CONSTRAINT alarm_rule_kind_check CHECK (kind IN (
    'ardisik_eksi', 'birikimli_getiri', 'gruba_gore', 'zirveden_dusus',
    'yatirimci_azalma', 'net_cikis', 'balina_cikis', 'veri_yok')),
  -- balina_cikis iki parametre ister; digerleri ikincisini kullanmaz.
  CONSTRAINT alarm_rule_threshold2_check CHECK (
    (kind = 'balina_cikis') = (threshold2 IS NOT NULL))
);

-- Varsayılanlar ölçümden geldi; sayılar 72 takip fonu üzerinde bugün kaç
-- fonun ateşlediğini gösteriyor.
INSERT INTO alarm_rule (kind, family, label, window_days, threshold, threshold2, points, sort) VALUES
  ('ardisik_eksi',     'getiri',    '3 gün arka arkaya eksi',            1,   3, NULL, 10, 1),  -- 4 fon
  ('ardisik_eksi',     'getiri',    '5 gün arka arkaya eksi',            1,   5, NULL, 20, 2),  -- 2 fon
  ('birikimli_getiri', 'getiri',    '5 günde toplam -%2',                5,  -2, NULL, 15, 3),  -- 4 fon
  ('birikimli_getiri', 'getiri',    '5 günde toplam -%5',                5,  -5, NULL, 30, 4),  -- 2 fon
  ('gruba_gore',       'getiri',    'Grubundan 2 puan geride',           5,  -2, NULL, 15, 5),  -- 7 fon
  ('gruba_gore',       'getiri',    'Grubundan 4 puan geride',           5,  -4, NULL, 30, 6),
  ('zirveden_dusus',   'getiri',    '20 gün zirvesinden %3 aşağıda',    20,  -3, NULL, 10, 7),  -- 8 fon
  ('zirveden_dusus',   'getiri',    '20 gün zirvesinden %5 aşağıda',    20,  -5, NULL, 20, 8),  -- 4 fon
  ('yatirimci_azalma', 'akis',      '5 günde yatırımcı %5 azaldı',       5,  -5, NULL, 15, 9),  -- 7 fon
  ('yatirimci_azalma', 'akis',      '5 günde yatırımcı %10 azaldı',      5, -10, NULL, 25, 10),
  ('net_cikis',        'akis',      '5 günde büyüklüğün %10''u çıktı',   5, -10, NULL, 15, 11),
  ('net_cikis',        'akis',      '5 günde büyüklüğün %20''si çıktı',  5, -20, NULL, 25, 12),
  ('balina_cikis',     'akis',      'Yatırımcı sabit ama para çıkıyor',  5,  -2, -0.5, 20, 13), -- 4 fon
  ('veri_yok',         'operasyon', '3 iş günüdür fiyat gelmiyor',       1,   3, NULL, 25, 14);

-- ─── Renk eşikleri ──────────────────────────────────────────────────────
CREATE TABLE alarm_level (
  code      text PRIMARY KEY,
  label     text    NOT NULL,
  min_score integer NOT NULL CHECK (min_score > 0),
  sort      integer NOT NULL
);

INSERT INTO alarm_level (code, label, min_score, sort) VALUES
  ('sari',    'Sarı',    20, 1),
  ('turuncu', 'Turuncu', 40, 2),
  ('kirmizi', 'Kırmızı', 70, 3);

-- ─── Sonuçlar ───────────────────────────────────────────────────────────
-- Günlük saklanır: "üç gündür kırmızı" ancak böyle söylenebilir ve eşik
-- değiştiğinde geçmişe dönüp "bu ayar geçen ay ne derdi" sorusu sorulabilir.
CREATE TABLE fund_alarm_daily (
  fund_code  text    NOT NULL REFERENCES dim_fund(fund_code) ON DELETE CASCADE,
  trade_date date    NOT NULL,
  score      integer NOT NULL,
  level      text    REFERENCES alarm_level(code),
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (fund_code, trade_date)
);

-- Gerekçe: hangi kural hangi RAKAMLA ateşledi. Gerekçesiz renk kara kutudur.
-- Ölçülen değer saklanıyor çünkü kural sonradan değişse bile o günkü alarmın
-- neye dayandığı okunabilmeli.
CREATE TABLE fund_alarm_hit (
  fund_code  text    NOT NULL,
  trade_date date    NOT NULL,
  rule_id    integer NOT NULL REFERENCES alarm_rule(id) ON DELETE CASCADE,
  value      numeric NOT NULL,
  points     integer NOT NULL,
  PRIMARY KEY (fund_code, trade_date, rule_id),
  FOREIGN KEY (fund_code, trade_date) REFERENCES fund_alarm_daily(fund_code, trade_date) ON DELETE CASCADE
);

CREATE INDEX fund_alarm_daily_date_idx ON fund_alarm_daily (trade_date, score DESC);
