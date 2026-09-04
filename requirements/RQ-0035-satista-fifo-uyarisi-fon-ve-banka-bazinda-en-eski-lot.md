---
id: RQ-0035
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-04T13:46:34.197Z"
branch: "factory/RQ-0035"
createdFromCommit: "624e4732b921a87f607a73a33ba7ce1fecbf968f"
completedRunId: "20260904203145-RQ-0035"
completedBy: "Batur Orkun"
completedAt: "2026-09-04T20:34:45.361Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/70"
githubPullRequestIid: 70
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/69"
githubIssueIid: 69
repositoryProvider: github
---
# RQ-0035 - Satışta FIFO: adet girilir, en eski alım kaydından düşülür

Fon satışında ilk alınan ilk çıkar ve ilk alımın tamamı satılmadan sonrakine
geçilmez. Uygulamada bu kuralı koruyan hiçbir şey yok: kullanıcı hangi satıra
satış tarihi yazarsa o alım satılmış sayılıyor.

Terimler: **adet** kaç pay demek, **alım kaydı** tek bir alım işlemi — bir
tarih, bir banka, bir adet. Fon Hareketleri'ndeki her satır bir alım kaydıdır.
Ölçülen veride DFI'nın Fiba'da üç alım kaydı var (17.03'te 15.054, 09.04'te
13.806, 12.08'de 3.703 pay) ve FIFO sırası bunlar arasında kuruluyor.

Ölçülen veride şu an ihlal yok, kullanıcı tutarlı girmiş. Ama uygunluğu
sağlayan tek şey dikkat; dört fon+banka çiftinde hem açık hem satılmış alım
kaydı var.

## Neden sessiz bir hata

Gerçekleşen kâr/zarar satılan alımın kendi maliyetinden hesaplanıyor. Yanlış
satır işaretlenirse hem Kapananlar'daki kâr hem elde kalan pozisyonun maliyeti
kayar. Kötü tarafı ekranların yine kendi içinde tutarlı görünmesi: toplamlar
tutar, yalnız gerçekle uyuşmaz.

## Kural uyarı değil, yapı

Uyarı düşünülmüştü ama görmezden gelinebilecek bir uyarı görmezden gelinir ve
hata sessiz kalır. Bunun yerine seçim ortadan kalkıyor: kullanıcı satır
seçmiyor, satış adedi giriyor. Sistem aynı fon ve bankadaki açık alım
kayıtlarını alış tarihine göre sıralayıp en eskiden başlayarak düşüyor.

## Kısmi satış alım kaydını böler

Satılan adet en eski alım kaydından küçükse kayıt ikiye ayrılır: satılan adet
satış tarihini alır, kalan adet açık kalır. İkisi de aynı alış tarihini ve
bankayı taşır, dolayısıyla alış fiyatları da aynıdır; maliyet adetle doğru
orantılı olduğu için toplam bozulmaz.

Bölme yalnız bir kaydın ortasında kalındığında olur. Satılan adet bir veya
birkaç kaydı tam tüketiyorsa yeni satır çıkmaz, kayıtlara satış tarihi yazılır.
Dolayısıyla bir satış en fazla bir kaydı böler — o da son dokunulan kayıt.

    5.000'lik alımdan 3.000 satılır   → 3.000 satılmış + 2.000 açık (bölünür)
    5.000'lik alımdan 5.000 satılır   → tek satır, satış tarihi yazılır
    5.000 + 3.000'den 8.000 satılır   → iki satıra satış tarihi, bölme yok
    5.000 + 3.000'den 6.000 satılır   → ilki satılır, ikincisi bölünür

Alternatif, satıra "satılan adet" sütunu koyup tek satırı yarı açık yarı kapalı
tutmaktı. Bugün her hesap "bir satır = bir alım, ya açık ya kapalı" varsayımına
dayanıyor: position_slice, closed_position, position_leg, portfolio_daily.
Yarı-açık satır bunların hepsini yeniden yazmayı gerektirirdi ve bunlar PDF ile
kuruşu kuruşuna tutan hesaplar. Bölme hiçbirine dokunmuyor. Bölme gerçeği de
daha doğru anlatıyor: satılan payların kaderi ayrıldı, artık kalanla aynı şey
değiller.

## Kural fon değil, fon + banka bazında

Fiba'daki ve Nkolay'daki paylar ayrı havuz; her platform kendi sırasını
uygular. Yalnız fon koduna bakan bir kural, Nkolay'dan satarken Fiba'daki eski
alımı isteyip yanlış sonuç verir.

## Acceptance Criteria

- Satış, satır seçilerek değil; fon, banka, adet ve satış tarihi girilerek
  yapılır.
- Adet aynı fon ve bankadaki açık alım kayıtlarından alış tarihi sırasıyla
  düşülür; en eskisi tükenmeden sonrakine geçilmez.
- Satılan adet bir veya birkaç alım kaydını tam tüketiyorsa bölme yapılmaz;
  kayıtlara yalnız satış tarihi yazılır. Tamamı satılan tek kayıtta davranış
  bugünküyle aynıdır.
- Bölme yalnız bir kaydın ortasında kalındığında olur ve bir satış en fazla bir
  kaydı böler. Satılan adet satış tarihini alır, kalan adet açık kalır; ikisi de
  alış tarihini, bankayı ve dolayısıyla alış fiyatını korur.
- Bölünmeden önceki ve sonraki toplam adet ile toplam maliyet aynıdır.
- Satılan adet o fon ve bankadaki açık toplamdan büyükse işlem reddedilir ve
  eldeki adet söylenir.
- Bölünerek oluşmuş satırlar listede belli olur; kullanıcının yazmadığı bir
  satırın nereden geldiği görünmelidir.
- Bir alım kaydına doğrudan satış tarihi girilerek FIFO sırası atlanamaz.
- İleri tarihli satışı olan alım kaydı satılmış sayılır: kayıt girilmiştir,
  sıradaki paylar ondan sonra gelir.
- Aynı gün alınmış birden fazla alım kaydı varsa aralarındaki sıra sonucu
  değiştirmez.
- Mevcut kayıtlar bozulmaz; veri zaten FIFO ile uyumlu.
- Satış geri alınabilir: kayıt silindiğinde elde kalan adet doğru kalır.
