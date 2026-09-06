---
id: RQ-0040
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-06T09:20:29.422Z"
branch: "factory/RQ-0040"
createdFromCommit: "ed3ca105e3ffd85afea4c4deb4550604a812413e"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/80"
githubPullRequestIid: 80
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/79"
githubIssueIid: 79
repositoryProvider: github
---
# RQ-0040 - Doğal dille soru sorma: veri destekli AI asistan

Uygulamada on ekran var ve her biri belirli bir soruyu cevaplıyor. Ama önceden
düşünülmemiş sorular için yer yok: "geçen ay hangi fonu artırmalıydım", "en çok
hangi hissede yoğunlaştım", "THF'yi satsam ne kadar vergi öderim". Bu RQ,
kullanıcının kendi verisi üzerinde doğal dille soru sorup cevap almasını
sağlıyor.

## Model SQL yazmıyor, hazır fonksiyonları çağırıyor

Bu, RQ'nun en önemli kararı.

Modele şemayı verip SQL yazdırmak esnek görünüyor ama bu uygulamada yanlış
sonuç üretir. Buradaki hesaplar basit toplama değil ve hepsi testlerle
sabitlenmiş:

    FIFO maliyet          satılan payın hangi alımdan düştüğü
    NAV zincirleme        fiyat geçmişi saklanmıyor, getiriden türetiliyor
    nakit akışı düzeltmesi  daily_gain = deger + cikis - onceki - giris
    net sermaye           maliyet - gerçekleşen kâr
    look-through          fon değeri x hisse ağırlığı, aylık açıklamayla

Model bunları kendi SQL'inde yeniden keşfetmeye çalışırsa ekranlardaki
rakamlarla çelişen cevaplar verir ve hangisinin doğru olduğu anlaşılmaz. Aynı
soruya iki farklı sayı veren bir uygulama, tek sayı vermeyenden kötüdür.

Bunun yerine `repository.ts`'teki fonksiyonlar tool olarak veriliyor:
`portfolioHeadline`, `allocation`, `stockAllocation`, `fundDetail`,
`buildPeriodReturns`, `closedPositions`, `listTransactions`. Bunlar zaten
ekranların kullandığı fonksiyonlar — asistan ile ekran aynı sayıyı söylüyor.

## Serbest SQL bu RQ'da yok

İlk tasarımda öngörülmemiş sorular için salt-okunur bir SQL tool'u vardı.
Kapsam dışına alındı: sekiz tool'un neyi karşılamadığı ancak gerçek sorularla
belli olur ve eksiği tahmin ederek bir güvenlik yüzeyi açmak yanlış sıra.

Sonraki RQ'da yapılacak ve şunları gerektirecek:

    ayrı veritabanı rolü    yalnız SELECT; kısıt GRANT'te olmalı, kodda değil
    statement_timeout       uzun sorgu kesilir
    satır limiti            devasa sonuç dönmez
    son çare kuralı         hazır tool cevaplayabiliyorsa o kullanılmalı

Karşılanmayan soru örneği: "salı günleri mi daha çok alım yaptım".

Bu örnek çalıştırılarak doğrulandı ve beklenmedik bir şey çıktı: model, tool
yokluğunda ham işlem listesini çekip **kendisi saymaya** çalıştı. 103 işlemi
bir denemede 14, bir başkasında 77 diye bildirdi; her ikisinde de cevap kesin
göründüğü için yanlışlık ancak veritabanıyla karşılaştırınca anlaşıldı.

Sonuç: eksik olan yalnız bir tool değil, bir kural. Sistem talimatına "uzun
listeleri kendin sayma, sayamıyorsan söyle" eklendi ve model artık dürüstçe
"bu analizi yapacak bir aracım yok" diyor. Sonraki RQ toplu sayımı
veritabanında yapan bir yol getirecek — serbest SQL ya da sabit boyutlara
göre gruplayan bir tool.

## Güvenlik

**Kullanıcı kimliği modelden gelmez.** Tool imzalarında `user_id` yok; sunucu
oturumdan koyuyor. Aksi halde "başkasının portföyünü göster" bir prompt
meselesine dönerdi.

**SQL tool'u ayrı ve kısıtlı bir rolle koşar.** Yalnız SELECT, `statement_timeout`,
satır limiti. Rol DDL ve DML yetkisi taşımaz; kısıt uygulama kodunda değil
veritabanında olmalı ki bir hata onu atlayamasın.

**Tool sonuçları veri, talimat değil.** Bu projede gerçek bir prompt injection
yüzeyi var: `portfolio_transaction.note` kullanıcının yazdığı serbest metin,
`fund_stock_holding.company` ve `sector` ise **dış kaynaktan** geliyor. Bir fon
ya da şirket adı talimat gibi yazılmış olabilir. Tool sonuçları modele veri
olarak işaretlenerek verilir ve sistem talimatı sonuçların içinden gelen
yönlendirmeleri yok sayacak şekilde yazılır.

**Maliyet tavanı.** Her soru bir dış API çağrısı ve birkaç tool turu demek.
Kullanıcı başına günlük soru sınırı ve konuşma başına tur sınırı olmalı;
sınırsız döngü hem para hem zaman harcar.

## Sağlayıcı

Gemini. Anahtar kullanıcıda hazır. İstemci `fetch` ile elle yazılır — projede
`src/sources/fintables.ts` ve `src/sources/fvt.ts` aynı desende ve yeni
bağımlılık eklemek gerekmiyor.

İstemci tek dosyada toplanır. Tool tanımları, güvenlik kuralları ve ekran
sağlayıcıdan bağımsız kalır; sağlayıcı değiştirmek o dosyayı değiştirmek olur.

Claude CLI sunucuda kullanılmıyor: kimlik bilgisi ihtiyacını ortadan
kaldırmıyor ve dosya sistemi ile kabuk araçları taşıyan etkileşimli bir ajan,
kullanıcıdan gelen soruyu işleyecek yer değil.

## Ekran

Menüde kendi ekranı. Soru yazılır, cevap gelir; konuşma geçmişi oturum boyunca
korunur. Modelin hangi tool'ları çağırdığı görünür olmalı — cevabın nereden
geldiği gizlenirse kullanıcı doğruluğunu değerlendiremez.

## Acceptance Criteria

- Kullanıcı doğal dille soru sorabilir ve kendi verisinden cevap alır.
- Model, ekranların kullandığı repository fonksiyonlarını tool olarak çağırır;
  aynı soru ekranla asistanda farklı sayı vermez.
- Model SQL yazmaz; yalnız tanımlı fonksiyonları çağırır.
- Cevaplanamayan soruda model cevaplayamadığını söyler, uydurmaz.
- Tool imzalarında kullanıcı kimliği bulunmaz; sunucu oturumdan koyar.
- Tool sonuçları modele veri olarak verilir; sonuç içinden gelen talimatlar
  uygulanmaz.
- Konuşma başına tur sınırı ve kullanıcı başına günlük soru sınırı vardır.
- Modelin çağırdığı tool'lar kullanıcıya görünür.
- API anahtarı ortam değişkeninden okunur; kodda ve günlüklerde görünmez.
- Anahtar yoksa ekran çalışmaz ama uygulama açılır ve diğer ekranlar bozulmaz.
- Sağlayıcıya özel kod tek dosyada durur.
