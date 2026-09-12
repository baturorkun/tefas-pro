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
grep -qF "id: 'alarms', label: 'Alarmlar', adminOnly: false" "${M}" || fail "ekran menude degil ya da admin'e kapali"

# Üç sekme, bu sırayla: portföy, takip, diğer.
grep -qF "{ id: 'pozisyon', ad: 'Portföyümdekiler' }," "${M}" || fail "birinci sekme yok"
grep -qF "{ id: 'takip', ad: 'Takiptekiler' }," "${M}" || fail "ikinci sekme yok"
grep -qF "{ id: 'diger', ad: 'Diğerleri' }," "${M}" || fail "ucuncu sekme yok"
awk "/id: 'pozisyon', ad:/{a=NR} /id: 'takip', ad:/{b=NR} /id: 'diger', ad:/{c=NR} END{exit !(a<b && b<c)}" \
  "${M}" || fail "sekmeler yanlis sirada"

# Sekme degisimi yeniden istek atmamali: tek yanit uc grubu da tasiyor.
grep -qF "govde.replaceChildren(bolum(id))" <<<"${AV2}" || fail "sekme govdeyi yerinde degistirmiyor"
# Yorum satirlari elenir: aciklamada gecen "reload()" sozcugu cagri degil.
SEC_KOD="$(awk '/const sec = \(id: AlarmSekme\)/,/^  };/' "${M}" | grep -v '^\s*//')"
grep -qE "reload\(\)|api\(" <<<"${SEC_KOD}" && fail "sekme degisimi yeniden istek atiyor"
# Baslik da sekmeyle degismeli: govde takip listesini gosterirken baslikta
# "Portfoyumdekiler" yazmasi olmaz.
grep -qF "baslik.textContent = SEKME_ADI[id];" <<<"${AV2}" || fail "panel basligi sekmeyle degismiyor"
grep -qF "ozetAlani.textContent = ozet(id);" <<<"${AV2}" || fail "panel ozeti sekmeyle degismiyor"
# Secim modul duzeyinde: ekran yeniden kurulunca kaybolmamali.
grep -qF "let alarmSekme: AlarmSekme = 'pozisyon';" "${M}" || fail "secili sekme saklanmiyor"
printf 'PASS: uc sekme dogru sirada, degisim istek atmiyor, baslik takip ediyor\n'

# Kutular: portfoyde renk renk, diger ikisinde toplam + alt satirda kirilim.
for k in "'Portföyde Kırmızı'" "'Portföyde Turuncu'" "'Portföyde Sarı'" "'Takipte Alarm'" "'Diğerlerinde Alarm'"; do
  grep -qF "metric(${k}" <<<"${AV2}" || fail "kutu yok: ${k}"
done
grep -qF "kirilim('takip')" <<<"${AV2}" || fail "takip kutusunda renk kirilimi yok"
grep -qF "kirilim('diger')" <<<"${AV2}" || fail "diger kutusunda renk kirilimi yok"
# Veri gunu kutusu kaldirildi: ekranda yer kapliyordu.
grep -qF "'Veri Günü'" <<<"${AV2}" && fail "veri gunu kutusu hâlâ duruyor"
printf 'PASS: bes kutu, portfoyde renk renk, digerlerinde toplam ve kirilim\n'

# Yalniz alarm verenler listelenir. Temiz fonlari da yazmak ekrani 30 satir
# sessizlikle dolduruyor ve alarm veren satir aralarinda kayboluyordu.
# Olcut PUAN degil RENK: puani 1-19 arasinda kalan fon esigi asmamistir ve
# listeye alininca rozeti bos kaliyordu. Olculdu: 7 fon bu aralikta.
grep -qF "const gosterilen = hepsi.filter((f) => f.level !== null);" <<<"${AV2}" \
  || fail "esik alti fonlar da listeleniyor"
grep -qF "grupta(k).filter((f) => f.level !== null).length" <<<"${AV2}" \
  || fail "sekme sayaci listeyle ayni olcutu kullanmiyor"
# "Temiz" belirsiz bir kelimeydi: hem alarm vermeyen fonu hem eşik altında
# kalanı anlatıyordu. Hiçbir ekranda etiket olarak kullanılmaz.
grep -qF "'Temiz'" "${M}" && fail "temiz etiketi hâlâ var"
grep -qF "alarm-temiz" "${M}" && fail "temiz satir bicimi hâlâ kullaniliyor"
grep -qF "alarm-temiz" "${C}" && fail "temiz satir stili olu kod"
# Gerekcesiz renk kara kutudur: hangi kural hangi rakamla atesledi yazmali.
grep -qF "alarm-gerekce" <<<"${AV2}" || fail "gerekce listesi yok"
grep -qF "alarm-hit" "${C}" || fail "gerekce stilsiz"
printf 'PASS: yalniz alarm veren fonlar listeleniyor, gerekcesiyle\n'

# Admin ekrani AYAR ekranidir: fon listesi orada degil, Alarmlar ekraninda.
grep -qF "'Alarm Veren Fonlar'" <<<"${AV}" && fail "ayar ekraninda fon listesi duruyor"
# Dagilim kutulari kaliyor: esigi sonucunu gormeden secmek tahmindir.
grep -qF "metric('Kırmızı'" <<<"${AV}" || fail "ayar ekraninda dagilim onizlemesi yok"
printf 'PASS: ayar ekraninda liste yok, dagilim onizlemesi var\n'
