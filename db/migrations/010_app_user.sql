-- Uygulama kullanıcıları.
--
-- Yetkiyi kullanıcı adı değil `type` belirler: "admin" adlı kullanıcının bir
-- ayrıcalığı yoktur, başka kullanıcılar da admin tipinde olabilir.
--
-- Parola scrypt ile hash'lenir ve her kullanıcı için ayrı salt saklanır; düz
-- metin hiçbir yerde tutulmaz.
CREATE TABLE app_user (
  id                   integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username             text NOT NULL,
  password_hash        text NOT NULL,
  password_salt        text NOT NULL,
  type                 text NOT NULL DEFAULT 'user' CHECK (type IN ('admin', 'user')),
  is_active            boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Kullanıcı adı büyük/küçük harf duyarsız benzersizdir: "Admin" ile "admin"
-- aynı hesaptır, iki ayrı kayıt açılamaz.
CREATE UNIQUE INDEX app_user_username_key ON app_user (lower(username));
