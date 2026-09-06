---
id: RQ-0041
status: draft
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-06T18:26:04.736Z"
branch: "factory/RQ-0041"
createdFromCommit: "2be303acecac1b169606bbe160d8fc778a6cd847"
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
