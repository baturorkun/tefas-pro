#!/usr/bin/env bash
# Fon alarm motoru.
#
# Bu motorun en pahalı hatası sessiz olur: eşik yanlışsa ya her fon yanar ve
# kimse bakmaz, ya hiçbiri yanar ve çöken fon kaçar. PHE 2 Eylül'de çökmeye
# başladı, 11 Eylül'de %76 kaybetmişti ve hiçbir uyarı yoktu.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
MIG="${PROJECT_ROOT}/db/migrations/044_alarm_rules.sql"
A="${PROJECT_ROOT}/src/server/alarm.ts"
I="${PROJECT_ROOT}/src/server/index.ts"
M="${PROJECT_ROOT}/src/main.ts"
C="${PROJECT_ROOT}/src/styles.css"

# ─── Şema ───
for t in alarm_family alarm_rule alarm_level fund_alarm_daily fund_alarm_hit; do
  grep -qF "CREATE TABLE ${t}" "${MIG}" || fail "tablo yok: ${t}"
done
# Ölçüt kod tarafında ve sabit: yeni eşik kod istemez, yeni ölçüt ister.
grep -qF "alarm_rule_kind_check" "${MIG}" || fail "olcut listesi sabit degil"
# Balina kuralı iki parametre ister; digerleri ikincisini kullanmaz.
grep -qF "(kind = 'balina_cikis') = (threshold2 IS NOT NULL)" "${MIG}" || fail "ikinci esik kisiti yok"
grep -qF "REFERENCES alarm_family(code)" "${MIG}" || fail "kural aileye bagli degil"
printf 'PASS: sema kural, aile, kademe ve sonuc tablolarini tasiyor\n'

# ─── Motorun üç mekanizması ───
# Kademe: aynı ölçütün iki eşiği birden puan verirse 5 güne ulaşan fon 3 gün
# kuralından da puan alıp iki kez cezalandırılır.
grep -qF "SELECT DISTINCT ON (fund_code, kind) * FROM vurus" "${A}" || fail "kademe tekillestirmesi yok"
grep -qF "ORDER BY fund_code, kind, points DESC" "${A}" || fail "kademe en yuksek puani secmiyor"
# Aile tavanı: getiri ailesindeki kurallar aynı şeyi ölçüyor; tavan olmadan
# kural SAYISI agirligi belirler.
grep -qF "least(sum(k.points), af.cap)" "${A}" || fail "aile tavani uygulanmiyor"
# Kıyas grubu şemsiye türü: evren ortancası para piyasası fonlariyla bastiriliyor.
grep -qF "GROUP BY umbrella_type, w HAVING count(*) >= 3" "${A}" || fail "gorece kural grup ortancasi kullanmiyor"
printf 'PASS: kademe, aile tavani ve semsiye grubu motorda\n'

# ─── Veri yoksa alarm yok ───
# Sessiz ateşlememe iyi haber gibi okunmamalı; ölçüt NULL kalır, kural atesleme.
grep -qF "CASE WHEN count(*) >= 2 AND (array_agg(yat ORDER BY trade_date))[1] > 0" "${A}" \
  || fail "yatirimci olcutu eksik veriyi ayirt etmiyor"
grep -qF "CASE WHEN max(aum) > 0" "${A}" || fail "cikis olcutu buyukluk yokken bolme yapiyor"
printf 'PASS: pencerenin ucunda veri yoksa olcut NULL, kural ateslemez\n'

# ─── Yön ───
# Ardışık gün ve fiyatsız gün "en az", digerleri "en cok".
grep -qF "WHEN 'ardisik_eksi'     THEN m.ardisik >= r.threshold" "${A}" || fail "ardisik kural yonu ters"
grep -qF "WHEN 'veri_yok'         THEN m.veri_yok_gun >= r.threshold" "${A}" || fail "veri_yok yonu ters"
grep -qF "WHEN 'birikimli_getiri' THEN m.birikimli <= r.threshold" "${A}" || fail "birikimli yonu ters"
printf 'PASS: kural yonleri olcute gore\n'

# ─── Tek hesap ───
# Gunluk kosum, onizleme ve geriye donuk test ayni sorguyu kullanmali; uc ayri
# yerde yazilsaydi biri duzeltilip digerleri unutulurdu.
test "$(grep -c "^const HESAP = \`" "${A}")" = "1" || fail "hesap tek yerde degil"
grep -qF "alarmHesapla(pool, gun)" "${A}" || fail "kayit yolu ortak hesabi kullanmiyor"
printf 'PASS: hesap tek yerde, kayit ve onizleme onu kullaniyor\n'

# ─── Uçlar ───
grep -qF "path === '/api/admin/alarm' && method === 'GET'" "${I}" || fail "alarm ucu yok"
# Ayarlar ve dagilim BIRLIKTE donuyor: esigi sonucunu gormeden secmek tahmindir.
grep -qF "sendJson(res, 200, { ...ayar, day: gun, funds: satirlar });" "${I}" \
  || fail "ayar ve dagilim ayni yanitta degil"
for u in "/api/admin/alarm/rules/:id" "/api/admin/alarm/families/:id" "/api/admin/alarm/levels/:id"; do
  grep -qF "matchPath('${u}', path)" "${I}" || fail "duzenleme ucu yok: ${u}"
done
printf 'PASS: ayarlar ve o anki dagilim tek uctan, duzenleme uclari yerinde\n'

# ─── Ekran ───
AV="$(awk '/^async function alarmView/,/^}/' "${M}")"
[ -n "${AV}" ] || fail "alarm ekrani yok"
grep -qF "id: 'alarm'" "${M}" || fail "alarm ekrani menude degil"
grep -qF "adminOnly: true" <<<"$(grep -F "id: 'alarm'" "${M}")" || fail "alarm ekrani admin disina acik"
# Esigin dogrulugunu soyleyen tek sayi: kac fon atesliyor.
grep -qF "'Ateşleyen'" <<<"${AV}" || fail "kural basina atesleyen fon sayisi yok"
grep -qF "d.funds.filter((f) => f.hits.some((h) => h.ruleId === r.id)).length" <<<"${AV}" \
  || fail "atesleyen sayisi hesaplanmiyor"
# Gerekcesiz renk kara kutudur.
grep -qF "alarm-gerekce" <<<"${AV}" || fail "gerekce listesi yok"
grep -qF "alarm-hit" "${C}" || fail "gerekce stilsiz"
# Aile tavani ekranda ham puanla birlikte: tavanin ne kestigi gorunmeli.
grep -qF "'Ham Puan'" <<<"${AV}" || fail "aile ham puani gosterilmiyor"
printf 'PASS: ekran kurallari, tavanlari, esikleri ve gerekceyi gosteriyor\n'

# Alarm fona ait ve genel: PUAN kullanici pozisyonundan etkilenmez. Gruplama
# kullaniciya bakar (hangi listede gorunecek) ama hesap bakmaz; aksi halde
# ayni fon iki kiside iki renk olurdu.
HESAP="$(awk '/^const HESAP = `/,/^`;$/' "${A}")"
[ -n "${HESAP}" ] || fail "hesap sorgusu bulunamadi"
grep -qE "user_id|position_slice|portfolio_transaction" <<<"${HESAP}" \
  && fail "puan hesabi kullanici pozisyonuna bakiyor"
printf 'PASS: puan fona ait, pozisyon hesaba girmiyor\n'

# ─── Kullanıcı ekranı ───
# Alarmı GÖRMEK herkesin hakkı; kural düzenlemek admin işi. Ölçüldü: sıradan
# kullanıcı /api/alarms'ta 200, /api/admin/alarm'da 403 alıyor.
grep -qF "path === '/api/alarms' && method === 'GET'" "${I}" || fail "kullanici alarm ucu yok"
# Uç admin bloğunun DIŞINDA olmalı, yoksa sıradan kullanıcı 403 alır.
awk "/path === '\/api\/alarms' && method === 'GET'/{a=NR} /path.startsWith\('\/api\/admin\/'\)/{b=NR} END{exit !(a && b && a<b)}" "${I}" \
  || fail "kullanici alarm ucu admin blogunun icinde"
printf 'PASS: alarmi gormek herkese acik, kural duzenlemek admin isi\n'

# Üç grup: payın olan, takip, diğer. Pozisyon takibi ezer, fon iki kez görünmez.
AL="$(awk '/^export async function alarmListesi/,/^}/' "${A}")"
[ -n "${AL}" ] || fail "alarmListesi yok"
grep -qF "if (r.scope === 'pozisyon' || !m.has(r.fund_code)) m.set(r.fund_code, r.scope);" <<<"${AL}" \
  || fail "pozisyon takibi ezmiyor; fon iki grupta gorunur"
grep -qF "m.get(s.fundCode) ?? 'diger'" <<<"${AL}" || fail "gruplanmamis fonlar diger degil"
# Kullanıcıya göre PUAN değişmemeli: aynı fon iki kişide iki renk olamaz.
grep -qF "alarmHesapla(pool, gun)" <<<"${AL}" || fail "kullanici listesi ortak hesabi kullanmiyor"
printf 'PASS: uc grup, pozisyon oncelikli, puan kullaniciya gore degismiyor\n'

AV2="$(awk '/^async function alarmlarView/,/^}/' "${M}")"
[ -n "${AV2}" ] || fail "kullanici alarm ekrani yok"
grep -qF "grup('pozisyon', 'Payım Olan Fonlar'" <<<"${AV2}" || fail "birinci liste yok"
grep -qF "grup('takip', 'Takip Ettiklerim'" <<<"${AV2}" || fail "ikinci liste yok"
grep -qF "grup('diger', 'Diğer Fonlar'" <<<"${AV2}" || fail "ucuncu liste yok"
# Sıra önemli: once payin olan, sonra takip, sonra digerleri.
awk "/grup\('pozisyon'/{a=NR} /grup\('takip'/{b=NR} /grup\('diger'/{c=NR} END{exit !(a<b && b<c)}" \
  <<<"${AV2}" || fail "listeler yanlis sirada"
# Kendi fonlarinda temiz olanlar da yazilir; digerlerinde yalniz alarm verenler.
grep -qF "grup('diger', 'Diğer Fonlar', 'yalnız alarm verenler', false)" <<<"${AV2}" \
  || fail "diger fonlarda temizler de listeleniyor"
grep -qF "id: 'alarms', label: 'Alarmlar', adminOnly: false" "${M}" || fail "ekran menude degil ya da admin'e kapali"
printf 'PASS: uc liste dogru sirada, kendi fonlarinda temizler de gorunuyor\n'
