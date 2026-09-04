-- Kullanıcı ayarları. Genel ayarla (app_setting) aynı şekil: anahtar ve JSON
-- değer. Ayrı tabloda, çünkü genel ayarın sahibi yok ve iki kavramı tek
-- tabloda "user_id boşsa geneldir" diye ayırmak her sorguya tuzak koyardı;
-- filtreyi unutan sorgu sessizce yanlış satırı okurdu.
CREATE TABLE user_setting (
  user_id    integer NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  key        text NOT NULL,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

COMMENT ON TABLE user_setting IS
  'Kullanıcı başına tercihler. Satırı olmayan kullanıcı genel ayarı devralır.';
