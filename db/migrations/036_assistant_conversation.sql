-- Asistan konuşma geçmişi.
--
-- Saklanan yalnız GÖRÜNEN metin: kullanıcının sorusu ve modelin cevabı.
-- Tool sonuçları bilinçli olarak saklanmıyor — onlar o anki portföy durumu.
-- Eski bir sonucu geri yükleyip modele vermek, dünkü rakamlarla bugünkü
-- soruyu cevaplamak olurdu. Devam eden konuşmada tool'lar yeniden çağrılır.
--
-- tool_names ayrı: hangi araçların çalıştığı cevabın nereden geldiğini
-- gösteriyor ve zamanla eskimiyor (sonucun kendisi eskiyor, adı değil).
CREATE TABLE assistant_conversation (
  id         serial PRIMARY KEY,
  user_id    integer NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  title      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Listeleme hep "benim konuşmalarım, yeniden eskiye".
CREATE INDEX assistant_conversation_user_idx
  ON assistant_conversation (user_id, updated_at DESC);

CREATE TABLE assistant_message (
  id              serial PRIMARY KEY,
  conversation_id integer NOT NULL
                    REFERENCES assistant_conversation(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user', 'model')),
  text            text NOT NULL,
  tool_names      text[] NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Bir konuşmanın mesajları hep yazılma sırasına göre okunuyor.
CREATE INDEX assistant_message_conv_idx
  ON assistant_message (conversation_id, id);

COMMENT ON TABLE assistant_conversation IS
  'Asistan konuşmaları. Kullanıcı silinince konuşmaları da silinir.';
COMMENT ON COLUMN assistant_message.tool_names IS
  'Cevabı üreten tool adları. Tool SONUÇLARI saklanmaz: onlar o anki '
  'portföy durumudur ve yeniden çağrılmalıdır.';
