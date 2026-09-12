---
id: RQ-0062
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-12T06:18:33.019Z"
branch: "factory/RQ-0062"
createdFromCommit: "64a2158ea11c066cf6fa28a90892fc3fc7799657"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/125"
githubPullRequestIid: 125
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/124"
githubIssueIid: 124
repositoryProvider: github
---
# RQ-0062 - Portföyüm ekranında günlük getiri, toplam kazanç ve PDF çıktısı

Portföyüm ekranı portföyün asıl ekranı ama iki temel rakamı taşımıyor:
bugün ne kazandım, toplamda ne kazandım. İkisi de Panel'de var, buraya
gelince kayboluyor. Bir de bu ekranı başkasına verecek bir çıktı yok.

## Ölçüm

Portföyüm'deki kutular: Maliyet, Bugünkü Değer, Kâr / Zarar, Kârda/Zararda.

    Portföyüm · Kâr / Zarar   = açık pozisyonların kazancı        (openGain)
    Panel     · Toplam Kazanç = açık + gerçekleşmiş                (totalGain)
    Panel     · Günlük Getiri = bugünkü TL ve %, veri gününüyle    (dayGain, dayPct, dayDate)

Panel bu üçünü `portfolioHeadline` ile tek yerden hesaplıyor. Portföyüm ise
kendi satırlarını toplayarak yalnız açık kazancı buluyor. Aynı kullanıcı iki
ekranda iki farklı "kâr" görüyor ve hangisinin ne olduğu yazmıyor.

## Kural: aynı rakam, aynı kaynak

Portföyüm günlük getiri ve toplam kazancı yeniden hesaplamayacak; Panel'in
kullandığı `portfolioHeadline` sonucunu okuyacak. Aksi hâlde iki hesap bir
gün ayrışır ve hangisi doğru diye bakılır.

Etiketler ayrışmalı: "Kâr / Zarar" kutusu açık pozisyonu anlatıyor, yanına
gelen kutu toplamı. İkisi aynı sözcükle yazılırsa kullanıcı yine iki farklı
rakamı aynı şey sanır.

## PDF: tarayıcının yazdırması

Projeye bağımlılık eklenmiyor ve sunucuda PDF üreten bir kütüphane yok.
Dürüst yol tarayıcının "PDF olarak kaydet"i: ekrana bir yazdırma stili
eklenir, "PDF" düğmesi `window.print()` çağırır, kullanıcı kaydeder.

Yazdırma görünümü ekranın aynısı olmamalı. Kenar çubuğu, menü, düğmeler ve
üst şerit basılmaz; kalan sayfa kağıda sığmalı ve başlıkta kimin portföyü,
hangi gün olduğu yazmalı. Çıktıyı alan kişi ekranı hiç görmemiş olacak.

Karanlık tema kağıda gitmez: siyah zemine beyaz yazı basmak mürekkep
israfı ve okunmaz. Yazdırma stili açık zemin kullanır.

## Acceptance Criteria

- Portföyüm'de Günlük Getiri kutusu var: TL, yüzde ve hangi güne ait olduğu.
- Portföyüm'de Toplam Kazanç kutusu var ve gerçekleşmiş kazancı içeriyor.
- İki rakam da Panel'le birebir aynı: aynı fonksiyon, yeniden hesap yok.
- Açık kazanç ile toplam kazanç ekranda farklı adlarla duruyor.
- Ekranda bir "PDF" düğmesi var; tarayıcının yazdırma penceresini açıyor.
- Yazdırma görünümünde kenar çubuğu, menü, düğmeler ve üst şerit yok.
- Çıktının başında kullanıcı adı ve veri günü yazıyor; zemin açık.
- Pozisyon tablosu kağıda sığıyor, satırlar kesilmiyor.

## Kapsam dışı

- Sunucuda PDF üretmek.
- E-posta ile göndermek.
- Başka ekranların yazdırma görünümü.
