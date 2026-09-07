#!/usr/bin/env bash
# Hisseler ekranının kapsam kuralı. Bozulduğunda ekran hata vermez, yalnız
# sahip olunmayan fonların hisselerini kullanıcınınmış gibi listeler.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
R="${PROJECT_ROOT}/src/server/repository.ts"
I="${PROJECT_ROOT}/src/server/index.ts"
M="${PROJECT_ROOT}/src/main.ts"
SA="$(awk '/^export async function stockAllocation/,/^}/' "${R}")"

# Varsayılan yalnız sahip olunan fonlar. Ölçüldü: takip listesi de girince
# 686 hissenin 207'si listede 0 TL değerle duruyordu.
grep -q "includeWatchlist = false" <<<"${SA}" || fail "varsayılan kapsam açık"
grep -q "includeWatchlist || x.ownedFunds > 0" <<<"${SA}" \
  || fail "kapsam ayıklaması yok"

# Sayımlar anahtardan bağımsız: "kaç fonumda, kaç tanesi takipte" sorusunun
# cevabı seçilen kapsama göre değişmemeli. Bu yüzden SQL bütün takip edilen
# fonları getirir, ayıklama sonrasında yapılır.
grep -q "\$2::boolean" <<<"${SA}" && fail "kapsam SQL'de ayıklanıyor, sayımlar eksilir"
grep -q "ownedFunds: b.funds.filter((f) => f.owned).length" <<<"${SA}" \
  || fail "sahip olunan fon sayımı yok"
grep -q "watchFunds: b.funds.filter((f) => !f.owned).length" <<<"${SA}" \
  || fail "takip fonu sayımı yok"

# Evren kullanıcının kendi fonları. analytics.tracked_fund collector'ın
# evreni: herkesin takip listesi, benchmark'lar ve sistem fonları da içinde.
# Ölçüldü: 42 fonun 2'si (AAK, CVL) batur'un hiçbir listesinde yokken
# hisseleri ekrana giriyordu.
grep -q "FROM analytics.tracked_fund" <<<"${SA}" && fail "kapsam collector evreninden geliyor"
grep -q "FROM analytics.watchlist_visible WHERE user_id = \$1" <<<"${SA}" \
  || fail "takip listesi kullanıcıya özel değil"

# Sahiplik açık işlemden gelir, değerden değil. İleri tarihli alımın fiyatı
# henüz açıklanmadığı için değeri sıfır; değere bakan bir kural onları
# takip listesine yazardı. Ölçüldü: CKL ve DFI. Açıklık kuralı da
# position_slice.is_open ile aynı olmalı — GBZ ileri tarihli satışına rağmen
# 201.532 TL ile açık.
grep -q "OR x.sell_date > current_date)) AS owned" <<<"${SA}" \
  || fail "sahiplik işlemden gelmiyor ya da ileri tarihli satışı kapalı sayıyor"
grep -qE "owned:.*(fund_)?value.*> 0" <<<"${SA}" && fail "sahiplik değere bakıyor"
printf 'PASS: kapsam sahip olunan fonlarla sınırlı, sayımlar tam\n'

# Tarih aralığı listelenen satırları anlatır.
grep -q "stocks.flatMap((x) => x.funds.map((f) => f.asOfDate))" <<<"${SA}" \
  || fail "tarih aralığı listelenmeyen fonları da sayıyor"
printf 'PASS: tarih aralığı ekrandaki satırlardan çıkıyor\n'

# Uç yalnız açık talepte genişler; seçim sayfa yenilenince korunur.
grep -q "searchParams.get('watchlist') === '1'" "${I}" || fail "kapsam parametresi okunmuyor"
grep -q "tefas.stocks.watchlist" "${M}" || fail "seçim saklanmıyor"
grep -q "writeHisseTakip(takipGirdi.checked)" "${M}" || fail "anahtar seçimi yazmıyor"
printf 'PASS: kapsam anahtarı uçta ve arayüzde bağlı\n'
