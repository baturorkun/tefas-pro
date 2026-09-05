---
id: RQ-0038
status: draft
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-05T09:50:43.980Z"
branch: "factory/RQ-0038"
createdFromCommit: "d0b788c6db5d427ae29a73a40e9256d231431a9d"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/76"
githubPullRequestIid: 76
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/75"
githubIssueIid: 75
repositoryProvider: github
---
# RQ-0038 - Fon içeriği: varlık türü kırılımı

Fonların neye yatırdığı hiçbir ekranda görünmüyor. İki soru cevapsız:
"paramın gerçekte ne kadarı hisse, ne kadarı tahvil" ve "THF neye yatırıyor".

## Veri toplanıyor, gösterilmiyor

Bu bir toplama işi değil. `fact_fund_allocation` tablosu Fintables'ın
`/funds/{KOD}/info/` ucundaki `last_asset` alanından besleniyor ve collector
her koşumda yazıyor. Ölçülen durum:

    39 fon · 1003 satır · 2026-08-28..2026-09-04
    portföydeki 39 açık fonun 39'unda kırılım var
    THF: Hisse Senedi %88,23 · Yatırım Fonları %7,88
         Vadeli İşl. Nakit Teminatları %3,87 · Finansman Bonosu %0,02

Tablo hiçbir sorgudan okunmuyor. `/api/allocation` ucu var ama o kullanıcının
portföyünü banka ve TEFAS şemsiye tipine göre kırıyor; fonun içeriğiyle
ilgisi yok. İş yalnız okuma, sunum ve iki ekran.

## İki ayrı soru, iki ayrı yer

**Toplam kırılım** Dağılım ekranına üçüncü bir kırılım olarak girer; banka ve
kategori zaten orada. Her fonun portföydeki değeri o fonun ağırlıklarıyla
çarpılıp toplanır. Bugünün verisiyle hesaplandığında:

    Hisse Senedi                     1.372.505 ₺   %36,4
    Ters-Repo                          754.105 ₺   %20,0
    Yabancı Hisse Senedi               405.130 ₺   %10,7
    Yatırım Fonları Katılma Payları    309.365 ₺    %8,2

Bu rakam bir fonun adına bakarak çıkarılamaz: "hisse fonu" diye alınan THF'nin
%11,8'i hisse değil. Toplam kırılım tam da bunu görünür kılıyor.

**Fon başına içerik** Portföyüm'de satır açılınca görünür. Orada zaten fon
başına bir satır var ve soru fona ait.

## Ağırlık ile değer aynı güne ait değil

Ağırlıklar fonun açıkladığı son tarihe ait, değer bugüne. Bu bir yaklaşım ve
ekranda söylenmeli: kırılımın hangi tarihli ağırlıklarla hesaplandığı yazılır.
Gizlenirse kullanıcı rakamı bugünün kesin dağılımı sanar.

Ağırlıklar toplamı %100 etmeyebilir — fon açıklamasında yuvarlama ve "Diğer"
kalemi var. Eksik kısmı sessizce dağıtmak yerine olduğu gibi bırakmak doğru;
uydurulan bir yüzde, ölçülen bir yüzde gibi görünürdü.

## Kapsam

Yalnız varlık türü. Tek tek hisseler (THYAO, ASELS) ayrı bir RQ: Fintables'ın
`info` yanıtında kalem düzeyinde veri yok, o yeni bir kaynak gerektiriyor.
Kullanıcının aday olarak söylediği site fvt.com; o RQ'da araştırılacak.
Sıralama doğru — hisse kırılımı geldiğinde bu ekranın altına açılır bir
katman olarak eklenir.

## Acceptance Criteria

- Dağılım ekranında varlık türü kırılımı bulunur: her tür için TL değeri ve
  portföydeki payı.
- Kırılım fon ağırlıkları ile pozisyon değerlerinden hesaplanır; fon adına
  veya şemsiye tipine bakılmaz.
- Portföyüm'de bir fon satırı açılınca o fonun kendi varlık kırılımı görünür.
- Ağırlıkların hangi tarihe ait olduğu her iki ekranda da yazılır.
- Ağırlıkları toplamı %100 etmeyen fonda eksik kısım uydurulmaz; olduğu gibi
  gösterilir.
- Kırılımı bilinmeyen fon varsa sessizce atlanmaz; kapsanmayan tutar söylenir.
- Kapalı pozisyonlar toplama girmez: kırılım elde ne olduğunu anlatır.
- Yeni bir dış kaynağa istek atılmaz; veri `fact_fund_allocation`'dan okunur.
