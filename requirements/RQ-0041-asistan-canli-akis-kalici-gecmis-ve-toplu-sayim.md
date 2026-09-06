---
id: RQ-0041
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-06T18:26:04.736Z"
branch: "factory/RQ-0041"
createdFromCommit: "2be303acecac1b169606bbe160d8fc778a6cd847"
completedRunId: "20260906185220-RQ-0041"
completedBy: "Batur Orkun"
completedAt: "2026-09-06T20:19:09.950Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/82"
githubPullRequestIid: 82
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/81"
githubIssueIid: 81
repositoryProvider: github
---
# RQ-0041 - Asistan: canlı akış, kalıcı geçmiş ve toplu sayım

RQ-0040 asistanı çalışır hâle getirdi. Kullanımda üç eksik çıktı.

## 1. Cevap beklerken hiçbir şey olmuyor

Soru sorulunca "Düşünüyor…" yazıp bekliyor. Çok adımlı sorularda bu 30 saniyeyi
aşabiliyor ve kullanıcı çalışıp çalışmadığını bilmiyor.

Değerli olan yalnız metnin akması değil, **hangi adımda olduğunun görünmesi**:
"fon listesine bakıyor" → "hisse kırılımını açıyor" → cevap. Döngü zaten
sunucuda, adımlar orada biliniyor; dışarı verilmiyor.

Bu yüzden akış modelin token'larından değil, sunucunun kendi döngüsünden
üretilebilir. Model çıktısını da akıtmak ayrıca yapılabilir ama asıl kazanç
adım görünürlüğünde.

## 2. Sayfa yenilenince konuşma kayboluyor

Geçmiş modül düzeyinde tutuluyor; ekran değiştirince duruyor ama yenilemede
gidiyor. Dün sorulan bir soruya dönmek mümkün değil.

Saklarken bir karar var: **tool sonuçları saklanmamalı.** Sohbetin görünen
kısmı (soru ve cevap metni) kullanıcının kendi ifadesi ve sabit; tool sonuçları
ise o anki portföy durumu. Eski bir sonucu geri yükleyip modele vermek, dünkü
rakamlarla bugünkü soruyu cevaplamak olurdu. Devam eden konuşmada tool'lar
yeniden çağrılır.

Saklanan veri kullanıcının kendi soruları: hangi fonu düşündüğü, ne merak
ettiği. Kendi hesabına bağlı olmalı ve hesap silinince gitmeli.

## 3. Toplu sayım yapılamıyor

RQ-0040'ta ölçüldü: "salı günleri mi daha çok alım yaptım" sorusunda model, tool
olmadığı için ham listeyi çekip kendisi saymaya çalıştı. 103 işlemi bir
denemede 14, bir başkasında 77 diye bildirdi. İkisi de kesin görünen yanlış
cevaplardı.

O yüzden sistem talimatına "uzun listeleri kendin sayma" kuralı kondu ve model
şimdi dürüstçe "bu analizi yapacak bir aracım yok" diyor. Eksik olan araç.

### Serbest SQL değil, parametreli sayım

İlk düşünce salt-okunur bir SQL tool'uydu. Bu RQ bunun yerine **boyutları
sabit bir gruplama tool'u** öneriyor:

    gruplama boyutu   gün adı · ay · fon · banka · alış/satış
    ölçü              işlem sayısı · adet · maliyet · değer

Sebebi: gerçek soruların neredeyse tamamı "şuna göre grupla ve say/topla"
biçiminde. Sabit boyutlar bunu karşılıyor ve arbitrary SQL'in getireceği
güvenlik yüzeyini hiç açmıyor. Serbest SQL gerekirse ayrı bir RQ olur ve o
zaman salt-okunur rol, zaman aşımı ve satır limiti gerekir.

Sayım veritabanında yapılır; modelin kendi araması yasak kalır.

## 4. Giriş ekranında boşluk yok

Kart düz bir blok: etiket, girdi ve düğme aralarında hiç boşluk olmadan
yığılıyor. "Parola" etiketi üstteki girdiye, "Giriş yap" düğmesi de parola
girdisine yapışık duruyor. Düğme ayrıca girdilerden alçak; tam genişlikte
olduğu için sütun aşağı doğru inceliyor gibi görünüyor.

Asistan işiyle ilgisi yok, bu RQ'ya sığdırılıyor.

## 5. Asistan yerel geliştirme ortamında kapalı

`.env` içinde `CHATBOT_API_KEY` duruyor ama compose dosyası dev container'ına
aktarmıyor; 8282'deki uygulama "Asistan yapılandırılmamış" diyor. RQ-0040'ta
aynı hata deploy tarafında yaşanmıştı: tanımlanmış ama aktarılmayan değişken,
kullanıcının yaptığını sandığı ama olmayan bir ayardır.

## 6. Kuruş her yerde gürültü

Parasal tutarlar virgülden sonra iki hane yazıyor: "3.770.766,36 TL". Portföy
ölçeğinde kuruş bilgi taşımıyor, yalnız rakamı uzatıyor.

Kısaltmalardaki virgül bunun dışında: "3,77 m ₺" içindeki iki hane 770 bin
lira demek ve atılırsa bilgi gider. Yüzde, adet ve birim fiyat da öyle.

## 7. Soru örnekleri az

Asistan ekranında dört örnek var. Neyi sorabileceğini göstermek için az;
hepsini birden düğme olarak dizmek de ekranı rozet duvarına çevirir.

## Acceptance Criteria

- Soru sorulduğunda hangi adımda olunduğu canlı görünür; hangi tool'un
  çalıştığı beklerken belli olur.
- Bağlantı koparsa arayüz kilitlenmez; hata gösterilir ve yeniden sorulabilir.
- Konuşma geçmişi kullanıcı hesabına bağlı saklanır ve sayfa yenilenince
  durur.
- Tool sonuçları saklanmaz; devam eden konuşmada tool'lar yeniden çağrılır.
- Kullanıcı bir konuşmayı silebilir; hesap silinince konuşmaları da silinir.
- Toplu sayım tool'u eklenir: sabit boyutlara göre gruplayıp sayar ve toplar.
- Sayım veritabanında yapılır; model uzun listeleri kendisi saymaz.
- "Salı günleri mi daha çok alım yaptım" sorusu doğru cevaplanır ve rakam
  veritabanıyla birebir tutar.
- Serbest SQL bu RQ'da yok.
- Giriş ve parola ekranlarında alanlar arasında boşluk var; düğme girdilerle
  aynı yükseklikte.
- Asistan yerel geliştirme ortamında da çalışır: `.env`deki ayarlar dev
  container'ına geçer.
- Parasal tutarlar kuruşsuz gösterilir; kısaltma, yüzde, adet ve birim fiyat
  hanelerini korur. Asistanın cevapları da kuruşsuz.
- Örnek sorular çoğalır ama ekranı doldurmaz: bir kısmı görünür, gerisi
  konu başlıkları altında katlanmış durur.
- Sağlayıcı boş yanıt döndüğünde bir kez daha denenir; sebep günlüğe yazılır.
