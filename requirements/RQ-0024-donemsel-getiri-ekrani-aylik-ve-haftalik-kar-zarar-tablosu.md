---
id: RQ-0024
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-03T19:47:18.716Z"
branch: "factory/RQ-0024"
createdFromCommit: "286a52b5a26eb638f3e633bbe2ff8ea32465605d"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/48"
githubPullRequestIid: 48
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/47"
githubIssueIid: 47
repositoryProvider: github
---
# RQ-0024 - Dönemsel getiri ekranı: aylık ve haftalık kâr/zarar tablosu

Portföyün ay ay ve her ayın içinde hafta hafta ne kazandırdığını gösteren yeni
bir ekran. PDF raporundaki "Monthly & Weekly P&L" bölümünün karşılığı; sol
menüde **Dönemsel Getiri** adıyla kendi sayfası olur.

Kaynak `analytics.portfolio_daily`: gün bazında sermaye hareketinden
arındırılmış `daily_gain` ve o günün başlangıç değeri `prev_value` zaten orada.
Bir dönemin kazancı günlük kazançların toplamı, getirisi ise günlük getirilerin
bileşiği olur. Bu tanım gereği bir ayın kazancı haftalarının tam toplamına,
getirisi de haftalarının tam bileşiğine eşittir — yuvarlama dışında fark çıkmaz.

Hafta bölümlemesi PDF'teki kuralı izler: ayın işlem günleri baştan beşerli
bloklara ayrılır, en fazla dört blok olur ve artan günler **son** bloğa eklenir.
Artanı başa koymak, tek bir işlem gününü "ayın ilk haftası" diye gösterip
gerçek ilk haftayı ikiye bölüyordu.

Sıralama PDF'ten farklı: **en son ay en üstte**. Ayların içindeki haftalar ise
normal sırada kalır (1, 2, 3, 4) — okurken ay içinde zaman ileri akar, aylar
arasında geriye.

Kapsam dışı: PDF'teki benchmark sütunları (`Benchmark (%)`, `Diff (pp)`) bu
RQ'ya girmez. tefas-pro'da benchmark fonu diye bir kavram yok; eklenmesi ayrı
bir ayar ve ayrı bir getiri serisi demek. Satır renklendirmesi bu yüzden
benchmark'ı geçip geçmemeye göre değil, kâr/zarar işaretine göre yapılır.

## Acceptance Criteria

- Sol menüde **Dönemsel Getiri** girişi vardır; açtığında ay ve hafta satırlarını
  taşıyan tek bir tablo gelir.
- Aylar en yeniden en eskiye sıralanır; bir ayın haftaları kendi içinde 1'den
  4'e artan sırada durur.
- Her satır dönem adı, TL kâr/zarar ve yüzde getiri gösterir; ay satırı
  haftalarından görsel olarak ayrışır.
- Bir ayın TL kazancı, haftalarının TL kazançlarının toplamına eşittir; ayın
  yüzde getirisi haftalarının bileşiğine eşittir (test ile doğrulanır).
- Ayın işlem günleri beşerli bloklara ayrılır, en fazla dört hafta satırı olur
  ve artan günler son bloğa eklenir (test ile doğrulanır).
- Yüzde getiri sermaye hareketinden arındırılmıştır: para yatırılan veya
  çekilen gün getiri olarak sayılmaz.
- Kâr yeşil, zarar kırmızı gösterilir; veri yoksa ekran boş durum metniyle
  açılır, hata vermez.
- Ekran yalnız oturumdaki kullanıcının kendi portföyünü gösterir.
- Değerler PDF raporundaki karşılıklarıyla tutarlıdır.
