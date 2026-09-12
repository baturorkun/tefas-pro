---
id: RQ-0066
status: draft
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-12T22:09:40.159Z"
branch: "factory/RQ-0066"
createdFromCommit: "2fc7013c42ae7e75d73875c82c67fc7f71bf8bde"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/133"
githubPullRequestIid: 133
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/132"
githubIssueIid: 132
repositoryProvider: github
---
# RQ-0066 - Kişi başına düşen para ölçütü, balina kuralı emekli

Alarm motorunda "büyük yatırımcılar çıkıyor mu" sorusunu `balina_cikis`
kuralı cevaplıyor: para çıktı **ama** yatırımcı sayısı neredeyse sabit
kaldı. Bu kural dar bir pencereye bakıyor ve asıl vakaları kaçırıyor.

## Ölçüm

Kişi başına düşen para = fon büyüklüğü / yatırımcı sayısı. Bu oranın düşmesi,
çıkanların kalanlardan büyük olduğu anlamına gelir.

PHE, 4-11 Eylül:

    4 Eylul    12.258 mn TL · 103.309 yatirimci → kisi basi 118.657 TL
    11 Eylul    1.741 mn TL ·  54.908 yatirimci → kisi basi  31.714 TL

Yatırımcıların yarısı çıkmış, paranın yedide altısı gitmiş. `balina_cikis`
bunu göremiyor çünkü yatırımcı sayısının sabit kalmasını şart koşuyor.

11 Eylül'de iki kural yan yana:

    fon    kisi basi  yatirimci   balina_cikis   kisi basi <= -%2
    PHE       -73,3%     -46,9%              -               UYAR
    PRY       -36,2%     -20,3%              -               UYAR
    PNU       -21,7%     -16,0%              -               UYAR
    KHA       -11,9%     -27,8%              -               UYAR
    GPG        -3,8%      -1,4%              -               UYAR
    IAE        -1,9%      -0,5%           UYAR                  -

Yeni ölçüt IAE'yi de yakalıyor ve `balina_cikis`'in tek başına yakaladığı fon
kalmıyor. Yani yeni ölçüt eskisinin yerini tutuyor.

## Para değil pay adedi

İlk tasarım kişi başına düşen PARAYA bakıyordu (büyüklük / yatırımcı). Yanlış:
o oran fiyattan kirleniyor, fon değer kaybedince kimse çıkmasa bile düşüyor.
Ölçüldü, 11 Eylül:

    fon   5g getiri   kisi basi PARA   kisi basi PAY
    PBR     -%47,7          -%27,6          +%22,1
    GPG      -%4,2           -%4,9           -%0,0
    TLY      +%3,9           +%0,5           -%2,7
    DFI      +%4,7           +%2,3           -%1,7

PBR'de para ölçütü "büyükler kaçıyor" derken pay ölçütü tersini söylüyor:
çıkanlar ortalamadan küçükmüş. GPG'nin düşüşü tamamen fiyattan. TLY ve DFI'de
ise para ölçütü hiçbir şey görmüyor, oysa gerçek çıkış var ve fiyat
kazancının altında gizlenmiş.

Doğru ölçüt dolaşımdaki pay adedi / yatırımcı sayısı. Fiyattan tamamen
bağımsız. Veri kapsamı yatırımcı sayısıyla aynı: son günlerde 71/72.

## Seyrelme alarm değil

Kişi başına düşen paranın düşmesi tek başına yeterli değil. AFS, aynı hafta:

    4 Eylul   927 mn TL · 29.360 yatirimci → kisi basi 31.583 TL
    11 Eylul  907 mn TL · 29.547 yatirimci → kisi basi 30.683 TL

Burada kimse kaçmıyor, yatırımcı sayısı **artmış** ve küçük yatırımcılar
ortalamayı aşağı çekiyor. Kural bu yüzden iki şartlı: kişi başına düşen para
azalacak **ve** yatırımcı sayısı da azalacak.

## Net akıştan bağımsız

Yeni ölçüt yalnız büyüklük ve yatırımcı sayısından hesaplanıyor. Akış oranının
paydası çöken fonlarda bozuluyor — PHE'de son güne bölününce %-220,8, pencere
en yükseğine bölününce %-45,3 — bu ölçüt o sorundan etkilenmiyor.

## Balina kuralı silinmiyor, kapatılıyor

`balina_cikis` ölçütü ve kuralı yerinde kalır, kural yalnız pasife alınır.
Karar geri alınmak istenirse ekrandaki anahtar yeter; kayıtlı geçmiş alarm
gerekçeleri de kurala bağlı olduğu için satır silinemez.

## Acceptance Criteria

- `kisi_basi_dusus` ölçütü motorda; kişi başına düşen PAY ADEDİNİN pencere
  başındaki değere göre değişimini hesaplıyor, paranın değil.
- Kural iki şartlı: kişi başı pay düşüşü ve yatırımcı sayısı artışının üst
  sınırı (%1 tolerans).
- Yatırımcı sayısı belirgin artarken kural ateşlemiyor (seyrelme).
- Pencerenin ucunda büyüklük ya da yatırımcı verisi yoksa ölçüt NULL kalıyor
  ve kural ateşlemiyor.
- Varsayılan kural Para Akışı ailesinde, eşik %3. Ölçüldü: %1,5 sarıyı 4'ten
  11'e çıkarıyor, %5 gerçek vakaları eliyor.
- `balina_cikis` kuralı pasif; ölçütü ve satırı duruyor.
- Ekranda cümle olarak okunuyor ve sayıları düzenlenebiliyor.

## Kapsam dışı

- Arkadaşın tablosundaki AND mantığı. Ölçüldü: üç çöken fonun yalnız birini
  yakalıyor, PBR'de net akış artı olduğu için susuyor.
- Net akış tahmini. Ölçüldü: onun formülü bizim `net_flow` ile birebir aynı,
  4.872 gözlemde ortanca fark %0,0000.
- Biriktirme (accumulation) sinyali; bu motor alarm üretiyor, fırsat değil.
