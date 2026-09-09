---
id: RQ-0058
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-08T20:27:54.809Z"
branch: "factory/RQ-0058"
createdFromCommit: "7b2e6e2f7efb449e82c2a2315956e2c852881f0a"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/116"
githubPullRequestIid: 116
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/115"
githubIssueIid: 115
repositoryProvider: github
---
# RQ-0058 - Satış parasının hangi banka ve tarihte geleceği

Fon satıldığında para hemen gelmiyor: satış valörü kadar iş günü sonra
bankaya geçiyor. Kullanıcı "hangi bankaya ne zaman ne kadar para gelecek"
sorusunu uygulamada hiçbir yerde göremiyor; satış tarihini görüyor ama
paranın ne zaman elinde olacağını kendisi hesaplıyor.

## Ölçüm

Veri hazır. 70 fonun satış valörü tanımlı ve satışlar banka bilgisiyle
duruyor. batur'un yaklaşan nakit girişleri:

    09 Eylül   Fiba     +201.208    7 Eylül'ün üç satışı, T+2
    09 Eylül   Nkolay   +211.780    7 Eylül'ün dört satışı, T+2
    10 Eylül   Fiba     +230.254    TLY, T+2
    11 Eylül   Fiba      +18.725    IJC, T+3
    11 Eylül   Nkolay    +38.858    IJC + PIL, T+3
    13 Eylül   Nkolay    GBZ         henüz gerçekleşmemiş satış, T+3

Satış valörü tek bir sayı değil: 23 fon T+2, 13 fon T+3, birkaçı T+1 ve T+0.
Yani "iki gün sonra gelir" diye genellemek yanlış olurdu.

## Bakiye değil, takvim

Bakiye gösterilmiyor ve bu bilinçli: uygulama bankaya dışarıdan yatırılan
parayı görmüyor, yalnız fon alım satımını biliyor. Sıfırdan başlayan bir net
akış batur'da Fiba için -5.445 TL veriyor — bu "Fiba'da eksi para var"
demek değil, "dışarıdan para konmuş" demek. Böyle bir sayıyı bakiye diye
göstermek yanlış okunurdu.

Gösterilen şey uygulamanın gerçekten bildiği şey: **hangi satıştan, hangi
bankaya, hangi gün ne kadar para geçecek.**

## Valör ikinci kez eklenmiyor

İlk sürüm satış tarihine valörü bir kez daha ekliyordu ve para gününü iki gün
ileri atıyordu. Yanlıştı: uygulamanın modelinde **satış tarihi zaten emir
tarihine valör eklenerek** bulunuyor — işlem formu da öyle hesaplıyor
("Satış Emir Tarihi girilirse satış tarihi hesaplanır").

Ölçüldü: Fiba'da 32.563 adetlik DFI satış emri 3 Eylül'de verildi, kayıtlı
satış tarihi 7 Eylül (3 Eylül + 2 iş günü, DFI satış valörü T+2) ve para o
gün geldi. Takvim ise 9 Eylül diyordu.

Para günü = satış tarihi.

## Bugün, kullanıcının saatine göre

`toISOString()` UTC veriyor. Türkiye'de gece 00:00 ile 03:00 arasında
uygulama bir önceki günü "bugün" sanıyordu — ölçüldü, yerel 9 Eylül
00:07'de ekran 8 Eylül diyordu. Aynı kalıp üç yerde vardı; üçü de
kullanıcının kendi saatine geçti.

## Gerçekleşmemiş satışın tutarı

Satış tarihi gelmemişse fiyat da açıklanmamıştır; tutar bilinmez. Son bilinen
fiyattan tahmin edilir ve `≈` ile işaretlenir — RQ-0054'te kurulan kuralın
aynısı. Fiyatı hiç olmayan fonda tahmin de üretilmez.

## Kapsam dışı

Alışların para çıkışı bu RQ'da yok. Sorulan soru "satıştan gelen para" ve
takvimi tek yönlü tutmak onu okunur kılıyor; çıkışlar da eklenirse bu bir
bakiye tablosuna dönüşmeye başlar ve yukarıdaki gerekçeyle oraya
girilmiyor.

## Kaynak sütunu

Bir satış birden çok FIFO bacağına bölünüyor, yani aynı fon aynı günde
birkaç kez görünebiliyor. Kaynak fon ve satış gününe göre toplanır ve kaç
bacaktan geldiği yazılır: `DFI ×3 · 2026-09-07 · T+2`.

## Acceptance Criteria

- Satıştan gelecek para, banka ve tarih kırılımında listelenir.
- Para günü satış tarihidir; valör ikinci kez eklenmez.
- Bugün, kullanıcının saatine göre belirlenir; UTC'ye göre değil.
- Aynı gün aynı bankaya gelen tutarlar toplanır; hangi satışlardan geldiği
  görünür.
- Gerçekleşmemiş satışın tutarı tahmindir ve işaretlenir.
- Fiyat verisi olmayan fonda tutar tahmin edilmez.
- Bakiye gösterilmez.
- Geçmiş girişler de görünür; kullanıcı geriye bakabilmeli.
- Kaynak sütununda yalnız fon kodları yazar; valör bilgisi yer almaz.
- Bugün gelen para, sonraki günler ve gelmiş para ayrı panellerde durur.
- Bugünkü panel paranın gün içinde ne zaman geçtiğini söyler.
- Banka kutuları bugün ve yolda olan tutarı ayrı ayrı gösterir.
