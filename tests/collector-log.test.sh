#!/usr/bin/env bash
# Tek fonluk toplama tetiklemesi ve koşum kaydı. DATABASE_URL yoksa atlanır.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

# Kaynak ayrımı tek yerde tanımlı olmalı: panel ile collector aynı sabite bakar.
grep -q "export const SCHEDULED_SOURCE" "${PROJECT_ROOT}/src/collector.ts" \
  || fail "zamanlanmış koşum kaynağı dışa açık olmalı"
grep -q "export const ONDEMAND_SOURCE" "${PROJECT_ROOT}/src/collector.ts" \
  || fail "tek fonluk koşum kaynağı dışa açık olmalı"
# Panel'in kutusu zamanlanmış koşumu göstermeli; ayrım olmazsa takip listesine
# eklenen her fon gecelik taramanın yerine geçerdi.
grep -q "WHERE source = \$1 ORDER BY id DESC LIMIT 1" "${PROJECT_ROOT}/src/server/repository.ts" \
  || fail "panel son koşum sorgusu kaynağa göre süzmeli"
# Yeni eklenen fon listede görünmeli: inner join'de hiç görünmüyordu.
grep -q "LEFT JOIN analytics.fund_latest" "${PROJECT_ROOT}/src/server/repository.ts" \
  || fail "takip listesi verisi olmayan fonu da göstermeli"
printf 'PASS: kaynak ayrımı ve takip listesi sorgusu doğru\n'

if [ -z "${DATABASE_URL:-}" ] || ! command -v psql >/dev/null 2>&1 \
   || ! psql "${DATABASE_URL}" -tAc 'SELECT 1' >/dev/null 2>&1; then
  printf 'SKIP: veritabanı yok\n'; exit 0
fi
q() { psql "${DATABASE_URL}" -tAqc "$1"; }

# Koşum kaydı tüm alanlarıyla okunabilmeli.
eksik="$(q "SELECT count(*) FROM ingest_run WHERE started_at IS NULL OR status IS NULL")"
[ "${eksik}" = "0" ] || fail "koşum kaydında başlangıç veya durum eksik: ${eksik}"
printf 'PASS: koşum kayıtları eksiksiz\n'

# Başarısız koşumların sebebi kayıtlı olmalı; ekranın göstereceği şey bu.
hatali="$(q "SELECT count(*) FROM ingest_run WHERE status = 'failed'")"
sebepsiz="$(q "SELECT count(*) FROM ingest_run WHERE status = 'failed' AND coalesce(last_error,'') = ''")"
[ "${sebepsiz}" = "0" ] || fail "${sebepsiz} başarısız koşumun sebebi kayıtlı değil"
printf 'PASS: başarısız koşumların sebebi kayıtlı (%s hatalı koşum)\n' "${hatali}"

# Fon sayısı saklanmalı: fact_fund_daily.ingest_run_id üzerinden türetilemiyor,
# sonraki koşumlar aynı satırların üzerine yazınca sütun el değiştiriyor.
q "SELECT funds_ok, funds_failed FROM ingest_run LIMIT 1" >/dev/null \
  || fail "fon sayısı sütunları yok"
# Yeni koşumlar sayacı dolduruyor mu? Eski kayıtlar migration öncesinden kalma.
dolu="$(q "SELECT count(*) FROM ingest_run WHERE status = 'passed' AND funds_ok > 0")"
[ "${dolu}" -ge 1 ] || printf 'NOT: henüz fon sayacı dolu koşum yok\n'
# Tek fonluk koşum tanım gereği tek fon toplar.
coklu="$(q "SELECT count(*) FROM ingest_run
            WHERE source = 'fintables-fund' AND funds_ok + funds_failed > 1")"
[ "${coklu}" = "0" ] || fail "tek fonluk koşum birden fazla fon saymış: ${coklu}"
printf 'PASS: fon sayısı saklanıyor ve tek fonluk koşum tek fon sayıyor\n'

# Kısmi koşumda hangi fonun neden düştüğü kaydedilmeli: sayı "üç fon düştü"
# der ama sebebi yalnız konsolda kalırsa log işe yaramaz.
sebepsiz_kismi="$(q "SELECT count(*) FROM ingest_run
                     WHERE status = 'partial' AND coalesce(last_error,'') = ''")"
[ "${sebepsiz_kismi}" = "0" ] || fail "${sebepsiz_kismi} kısmi koşumun sebebi kayıtlı değil"
printf 'PASS: kısmi koşumların sebebi kayıtlı\n'

# Fon sayacı yalnız fonları saymalı; büyüklük penceresi hataları ayrı.
grep -q "windowErrors" "${PROJECT_ROOT}/src/collector.ts" \
  || fail "pencere hataları fon hatalarından ayrılmalı"
grep -q "fundErrors.length," "${PROJECT_ROOT}/src/collector.ts" \
  || fail "funds_failed yalnız fon hatalarını saymalı"
printf 'PASS: fon hatası ile pencere hatası ayrı sayılıyor\n'

# Durum alanı yalnız bilinen değerleri alır; ekran bunlara göre rozet basıyor.
bilinmeyen="$(q "SELECT count(*) FROM ingest_run
                 WHERE status NOT IN ('running','passed','partial','failed')")"
[ "${bilinmeyen}" = "0" ] || fail "bilinmeyen koşum durumu var"
printf 'PASS: koşum durumları bilinen değerlerden\n'
