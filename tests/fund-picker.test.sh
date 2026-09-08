#!/usr/bin/env bash
# İşlem formunda fon seçimi. Serbest metinken yazılan kod hiçbir listeden
# geçmiyordu; sistemde olmayan bir fonda valör de fiyat da gelmiyor ve form
# sessizce eksik kalıyordu. Uyarı metni denendi, yetmedi — doğru olan hatayı
# açıklamak değil yapılamaz kılmak.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
R="${PROJECT_ROOT}/src/server/repository.ts"
I="${PROJECT_ROOT}/src/server/index.ts"
M="${PROJECT_ROOT}/src/main.ts"

grep -Fq "export async function fundOptions" "${R}" || fail "fon listesi ucu yok"
grep -Fq "if (path === '/api/funds' && method === 'GET')" "${I}" || fail "uç bağlı değil"
# Serbest metin kalmamalı.
grep -Fq "fundCode: el('input', { type: 'hidden', required: 'true' })" "${M}" \
  || fail "fon hâlâ serbest metin"
# Takip listesi formu bilerek serbest metin kalıyor: yeni fonun sisteme
# giriş kapısı orası. İşlem formunda ise fon zaten tanınıyor olmalı.
#
# Sayı üzerinden: awk aralığı ile bölmek denendi ve CI'da kırıldı — bitiş
# deseninde Türkçe karakter vardı, CI'ın locale'inde eşleşmedi ve aralık
# dosya sonuna kadar uzadı. Kural artık ASCII ve konumdan bağımsız.
kac="$(grep -Fc "placeholder: 'THF'" "${M}")"
[ "${kac}" = "1" ] \
  || fail "serbest metin fon alanı ${kac} yerde; yalnız takip listesi formunda olmalı"
grep -Fq "function watchlistForm" "${M}" || fail "takip listesi formu kaybolmuş"
printf 'PASS: fon serbest metin değil, listeden geliyor\n'

# Arama hem koda hem ada göre: comboFilter value+label+hint üzerinde arıyor,
# hint fon adı olarak veriliyor.
grep -Fq "hint: x.title ?? undefined" "${M}" || fail "fon adı aramaya girmiyor"
# Zorunlu alanda temizleme düğmesi ölü olur.
grep -Fq "clearable: false" "${M}" || fail "zorunlu alanda ölü temizleme düğmesi var"
# Düzenlenen kayıt listede yoksa yine gösterilmeli, yoksa kullanıcı kendi
# kaydını düzenleyemez.
grep -Fq "if (existing !== null && !fonlar.some((x) => x.fundCode === existing.fundCode))" "${M}" \
  || fail "listede olmayan kayıt düzenlenemez hâle geliyor"
# Çıkmaz sokak olmamalı: fon listede yoksa nereye gidileceği yazmalı.
grep -Fq "Takip Listem" "${M}" || fail "fon listede yoksa yol gösterilmiyor"
printf 'PASS: koda ve ada göre aranıyor, düzenleme ve çıkmaz sokak korunuyor\n'

# Sunucu doğrulaması kalkmamalı: arayüz tek savunma hattı değil.
grep -Fq "ensureFundKnown(pool, client, input.fundCode)" "${I}" \
  || fail "sunucu tarafı fon doğrulaması kalkmış"
printf 'PASS: sunucu doğrulaması yerinde\n'
