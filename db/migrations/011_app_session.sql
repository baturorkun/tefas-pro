-- Oturumlar veritabanında tutulur, çerezin içinde değil.
--
-- Gerekçe: oturum iptal edilebilir olmalı. Parola değişince veya kullanıcı
-- pasife alınınca açık oturumlar kapanır; imzalı çerezle bu yapılamaz.
-- Sunucu yeniden başladığında da oturumlar hayatta kalır.
CREATE TABLE app_session (
  id         text PRIMARY KEY,           -- rastgele üretilen oturum kimliği
  user_id    integer NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

CREATE INDEX app_session_user_idx ON app_session (user_id);
CREATE INDEX app_session_expires_idx ON app_session (expires_at);
