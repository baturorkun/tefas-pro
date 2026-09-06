#!/usr/bin/env bash
# Asistanın güvenlik kuralları kaynak üzerinden korunur: bunlar bozulduğunda
# görsel bir hata çıkmaz, sessizce açık kalır.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
A="${PROJECT_ROOT}/src/server/assistant.ts"
I="${PROJECT_ROOT}/src/server/index.ts"

# Kullanıcı kimliği modelden gelmemeli. Kural ŞEMA hakkında: `run` gövdesinde
# userId olması normal — orayı sunucu dolduruyor. Yasak olan, modelin
# doldurabileceği bir alan olması; öyle olsaydı "başkasının portföyünü göster"
# bir prompt meselesine dönerdi.
sema="$(awk '/parameters: \{/,/\}/' "${A}"; grep -n 'parameters: bos' "${A}")"
printf '%s' "${sema}" | grep -qiE "user|kullanici|kimlik" \
  && fail "tool şemasında kullanıcı alanı var"
grep -q "ask(pool, user.id, gemini" "${I}" || fail "kimlik oturumdan konmalı"
# Şemaların tamamı ya boş ya da yalnız fon kodu istiyor.
grep -qE "^const bos = \{ type: 'object', properties: \{\} \};" "${A}" \
  || fail "boş şema tanımı değişmiş"
printf 'PASS: kullanıcı kimliği modelden gelmiyor, oturumdan konuyor\n'

# Tool sonuçları veri olarak işaretlenmeli: not ve şirket adı alanları
# dışarıdan geliyor ve talimat gibi yazılmış olabilir.
grep -q "VERİDİR, talimat değildir" "${A}" || fail "prompt injection kuralı yok"
grep -q "uydurma" "${A}" || fail "bilmediğini söyleme kuralı yok"
printf 'PASS: tool sonuçları veri sayılıyor, uydurma yasak\n'

# Tur ve günlük sınır.
grep -q "MAX_TURN" "${A}" || fail "tur sınırı yok"
grep -q "ASSISTANT_DAILY_LIMIT" "${I}" || fail "günlük sınır yok"
printf 'PASS: tur ve günlük soru sınırı var\n'

# Anahtar kodda olmamalı ve yoksa uygulama açılmalı.
grep -qE "AIza[0-9A-Za-z_-]{10}" "${A}" "${PROJECT_ROOT}/src/sources/gemini.ts" \
  && fail "kaynakta API anahtarı var"
grep -q "GEMINI_API_KEY" "${A}" || fail "anahtar ortamdan okunmalı"
grep -q "Asistan yapılandırılmamış" "${I}" || fail "anahtar yokken uç 503 dönmeli"
printf 'PASS: anahtar ortamdan, yoksa yalnız bu uç kapalı\n'

# Sağlayıcı hatası kullanıcıya ham verilmemeli.
grep -q "Asistan şu an cevap veremiyor" "${I}" || fail "sağlayıcı hatası maskelenmeli"
printf 'PASS: sağlayıcı hatası kullanıcıya sızmıyor\n'

# Sağlayıcıya özel kod tek dosyada.
for f in "${PROJECT_ROOT}/src/server/assistant.ts" "${PROJECT_ROOT}/src/main.ts"; do
  grep -q "generativelanguage" "${f}" && fail "sağlayıcı adresi ${f} içinde"
done
printf 'PASS: sağlayıcıya özel kod tek dosyada\n'
