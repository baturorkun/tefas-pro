---
id: RQ-0028
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-04T05:28:52.118Z"
branch: "factory/RQ-0028"
createdFromCommit: "0dab6c522cda455e49326a0609ceeec5332fbcea"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/56"
githubPullRequestIid: 56
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/55"
githubIssueIid: 55
repositoryProvider: github
---
# RQ-0028 - Kullanıcı ayarları ve kullanıcıya özel benchmark fonu

Benchmark fonu şu anda tek ve global: admin ne seçerse herkes ona göre
kıyaslanıyor. Ama kimin neye göre "iyi" olduğuna karar verdiği kişiseldir —
biri parayı para piyasası fonunda tutmakla, bir başkası hisse endeksiyle
kıyaslamak isteyebilir.

Bu RQ kullanıcı ayarı kavramını kuruyor ve ilk ayarı benchmark fonu oluyor.

Sistemde bugün yalnız genel ayar var (`app_setting`, admin'e açık). Kullanıcı
bazında hiçbir tercih saklanmıyor: tek kullanıcı tercihi Panel'deki "sadece
sahip olduklarım" toggle'ı ve o da localStorage'da — başka tarayıcıda
kayboluyor, site verisi silinince sıfırlanıyor, sunucu bilmiyor.

Kullanıcı ayarları genel ayarla aynı şekli izler: anahtar ve JSON değer. Ama
ayrı tabloda tutulur, çünkü genel ayarın sahibi yok ve iki kavramı tek tabloda
"user_id boşsa geneldir" diye ayırmak her sorguya bir tuzak koyardı — filtreyi
unutan sorgu sessizce yanlış satırı okurdu.

## Varsayılan kopyalanmaz, devralınır

Kullanıcının kendi seçimi yoksa genel ayardaki benchmark kullanılır. Değer
kullanıcıya kayıt anında kopyalanmaz: kopyalansaydı admin genel benchmark'ı
değiştirdiğinde hiç tercih belirtmemiş kullanıcılar eski değerde donar ve bunu
fark etmezlerdi. Devralma sayesinde tercih belirtmeyen kullanıcı genel ayarı
izlemeye devam eder; tercih belirten kullanıcı ondan etkilenmez.

## Ayarlar nerede durur

Admin'in Ayarlar ekranı genel ayarlar için kalır. Kullanıcı tercihleri kendi
ekranına gider ve herkese açıktır. İki ekranın adı ayrışır: genel olan
"Ayarlar", kişisel olan "Tercihlerim".

## Acceptance Criteria

- Kullanıcı ayarları kendi tablosunda tutulur; birincil anahtar kullanıcı ve
  anahtar birlikte, kullanıcı silinince satırları da silinir.
- Menüde herkese açık bir "Tercihlerim" ekranı vardır; admin olmayan kullanıcı
  da görebilir ve kendi benchmark fonunu değiştirebilir.
- Kendi seçimi olmayan kullanıcı genel ayardaki benchmark ile kıyaslanır.
- Admin genel benchmark'ı değiştirince tercih belirtmemiş kullanıcılar yeni
  değeri görür; tercih belirtmiş kullanıcılar etkilenmez.
- Kullanıcı kendi tercihini temizleyip genel ayara dönebilir.
- Ekranda hangi değerin devralındığı, hangisinin kişisel seçim olduğu bellidir.
- Getiri verisi olmayan fon kodu reddedilir; genel ayardaki doğrulamanın aynısı.
- Dönemsel Getiri sütun başlığı ve karşılaştırması o kullanıcının benchmark
  fonunu kullanır.
- Bir kullanıcı başka kullanıcının ayarını okuyamaz ve yazamaz.
