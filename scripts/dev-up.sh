#!/usr/bin/env bash
# Geliştirme ortamını ayağa kaldırır.
#
# Tek işi compose'u çağırmadan önce `.env`i kabuğa almak. Compose değişken
# yerine koymayı ortamdan okuyor; `.env` okunmazsa `${CHATBOT_API_KEY:-}`
# boş kalıyor ve Asistan yerelde "CHATBOT_API_KEY yok" diyor — üstelik
# anahtar .env'de duruyor. Aynı hata daha önce deploy tarafında yaşandı:
# tanımlanmış ama aktarılmayan değişken, kullanıcının yaptığını sandığı ama
# olmayan bir ayardır.
#
# `db/.env` compose'un kendi değişkenleri (port, veritabanı adı) için
# kalıyor; oraya taşınsaydı anahtar iki dosyada birden tutulurdu.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi
exec podman compose --env-file db/.env -f db/compose.yaml up -d "$@"
