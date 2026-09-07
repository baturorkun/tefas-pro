---
id: RQ-0043
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-07T06:57:09.773Z"
branch: "factory/RQ-0043"
createdFromCommit: "4b663557b7444e84a17db8b4f828bd5952ee1946"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/86"
githubPullRequestIid: 86
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/85"
githubIssueIid: 85
repositoryProvider: github
---
# RQ-0043 - Getiri karşılaştırması: süre etkisi ayrıştırılıyor

Panel'deki "En çok kazandıran fonlarım" listesi fonları alımdan beri toplam
getiriye göre sıralıyor. Bu sayı ne kadar kazanıldığını doğru söylüyor ama
fonları karşılaştırmıyor: 8 aydır elde tutulan bir fon, 9 gündür tutulan bir
fondan doğal olarak daha çok birikmiş oluyor. Ekran süreyi yazıyor ("118g")
ama sıralamaya katmıyor.

## 1. Panel süre etkisini gizliyor

Ölçüldü. Aynı portföy, iki farklı ölçüt:

    alımdan beri    TLY %72,09 (118g) · IVY %17,31 (114g) · FJB %8,48 (89g)
    son 1 ay        DOH %35,23   (9g) · THF %27,07   (9g) · TLY %17,67

Panel'e bakan biri "en iyi fonum TLY" sonucuna varıyor. Doğru ama eksik: TLY
sekiz aydır elde, DOH dokuz gündür ve şu anda daha hızlı koşuyor.

Çözüm panel başlığına ölçüt sekmesi: **Alımdan beri | Son 1 ay**. Varsayılan
"Alımdan beri", yani ilk açılışta panel bugünküyle aynı. Desen yeni değil,
Hisseler ekranındaki `Hisse | Sektör` sekmelerinin aynısı.

Üç sekme: **Alımdan beri | Son 1 ay | Son 3 ay**. Bir ay tek başına zıplak
kalıyor — dokuz günlük bir pozisyonda tek iyi hafta sıralamayı çeviriyor;
üç ay daha oturmuş bir resim veriyor.

Pencereyi doldurmayan fon için hesap kendiliğinden elde tutulan süreye
düşüyor: başlangıç, pencere başı ile alım tarihinin geç olanı. Dokuz günlük
bir pozisyonun "son 3 ayı" o dokuz gün oluyor ve üç sekmede de aynı sayı
görünüyor.

"En çok kaybettiren fonlarım" paneli de aynı sekmeyi izler ve sekme İKİ
PANELİN ÜSTÜNDE durur, birinin içinde değil. Ayrı ayrı yönetilseydi aynı fon
iki tarafta birden görünebilirdi: YAY alımdan beri %+5,50, son 3 ayda %−3,47
— yani hem "kazandıran" hem "kaybettiren" listesine girerdi. Yan yana duran
iki panel tek bir sıralamanın sıfırdan kesilmiş iki yarısı gibi okunuyor ve
bu okuma bozulurdu.

### Yıllıklandırma yok

İlk akla gelen çözüm kısa getiriyi yıllığa çevirmekti. Yapılmıyor: 9 günlük
%4,03 yıllığa çevrilince %397, 15 günlük %5,15 ise %240 çıkıyor. Bu sayılar
bilgi değil, gürültünün kırk katı. Aynı-pencere karşılaştırması hem doğru hem
zaten hesaplanmış durumda.

### Panelde iki sekme de KULLANICININ getirisi

İlk tasarım "Son 1 ay" sekmesine fonun kendi aylık getirisini koyuyordu.
Yanlış: yanındaki sekme kullanıcının kazancı ve aynı panelde iki farklı
sahip oluyor. DOH son ayda %35,23 yükselmiş ama pozisyon dokuz günlük ve
kazanç %2,96 — panel kullanıcıya kazanmadığı parayı gösteriyordu.

"Son 1 ay" da kullanıcının sayısı olacak: yalnız fonda BULUNDUĞU günlerin
getirisi zincirlenir. Hesap lot bazında, çünkü pencere içinde alım
yapılmış olabiliyor — TLY'de 26 ve 18 günlük lotlar var ve bu yüzden
kullanıcının aylık getirisi %16,84 iken fonunki %17,67.

Fonun kendi hareketi ipucunda bağlam olarak kalır: "fon ne kadar yükselmiş,
ben bunun ne kadarını yakalamışım".

## 2. Asistan aynı ayrımı yapmıyor

Asistan "en çok kazandıran fonun" sorusuna alımdan beri toplam getiriyle
cevap veriyor ve süreden hiç söz etmiyor. Aynı hata, bu kez cümle içinde.

Özet verirken iki sayının farkı söylenmeli: toplam getiri "ne kazandım",
aynı-pencere getirisi "şu an ne durumda".

## 3. Asistan tavsiye sorularında veriye hiç bakmıyor

Ölçüldü: "100 bin TL yeni para gelecek, hangi fonları almalıyım" sorusunda
asistan hiçbir tool çağırmadan "yatırım danışmanı değilim" deyip kesiyor.

Reddin kaynağı bizim promptumuz değil — sistem talimatı hiç verilmeden
sorulduğunda model aynı cümleyi kendiliğinden kuruyor. Sorun reddin kendisi
de değil; tavsiye vermemek doğru. Sorun, reddederken **veriye bakmaması**.

Sorunun altında veriyle cevaplanabilir gerçek bir şey var: dağılım ne, hangi
sınıfta ağırlık var, fonlar hangi pencerede ne durumda, yeni para girince
oranlar nasıl değişir. Bunları göstermek tavsiye değil, tablo çıkarmak;
kararı kullanıcı verir.

Ekranda zaten "Yatırım tavsiyesi değildir" yazıyor; modelin bunu her cevapta
tekrarlaması gereksiz.

## Acceptance Criteria

- Panel'deki "En çok kazandıran fonlarım" ölçüt sekmesi taşır: Alımdan beri,
  Son 1 ay ve Son 3 ay.
- Pencereyi doldurmayan fon için getiri elde tutulan süreden hesaplanır.
- Varsayılan "Alımdan beri"; ilk açılışta panel bugünkü davranışını korur.
- "En çok kaybettiren fonlarım" aynı sekmeyi izler; sekme iki panelin
  üstünde tek bir yerde durur.
- Seçim ekran değiştirip dönünce korunur.
- Sıralama ölçütü panelde okunur biçimde yazar; hangi sayıya bakıldığı
  tahmine bırakılmaz.
- Panelde iki sekme de kullanıcının kendi getirisini gösterir; sıralamaya
  fonun kendi hareketi girmez.
- Aylık getiri yalnız fonda bulunulan günlerden hesaplanır ve pencere içinde
  yapılan alımları hesaba katar.
- Fonun kendi aylık hareketi ipucunda bağlam olarak görünür.
- Asistan fonun getirisi ile kullanıcının kazancını karıştırmaz.
- Kısa dönem getirisi yıllığa çevrilmez.
- Asistan getiri özetinde toplam getiri ile aynı-pencere getirisini ayırır ve
  elde tutma süresini söyler.
- Asistan tavsiye sorusunda önce veriye bakar; portföyün mevcut durumunu
  anlatır ve kararı kullanıcıya bırakır.
- Asistan yine tavsiye vermez ve gelecek tahmini yapmaz.
