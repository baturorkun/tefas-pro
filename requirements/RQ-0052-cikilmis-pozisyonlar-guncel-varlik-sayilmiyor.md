---
id: RQ-0052
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-07T21:26:52.015Z"
branch: "factory/RQ-0052"
createdFromCommit: "3efc5442fd687ca2d9b38706245bffbed60d8bcb"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/104"
githubPullRequestIid: 104
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/103"
githubIssueIid: 103
repositoryProvider: github
---
# RQ-0052 - Çıkılmış pozisyonlar güncel varlık sayılmıyor

Asistana "BARMA hangi fonlarda" diye sorulunca cevap şu:

> BARMA hissesini **portföyünüzde bulunduran** fonlar şunlardır:
> DOH: Fonun %0,00'ı (önceki ay %5,74)
> THF: Fonun %0,00'ı (önceki ay %3,12)

FVT'nin DOH sayfasında BARMA görünmüyor. Model uydurmuyor — veritabanı öyle
diyor. Fonlar BARMA'dan çıkmış ve biz çıkışı güncel varlık gibi okuyoruz.

## Ölçüm

    son raporlarda toplam satır         1361
    ağırlığı %0 olan satır               125   (%9,2)
    bunların çıkılmış pozisyon olanı     125   (hepsi)
    yalnız bu satırlardan gelen hisse     37

    BARMA / DOH   %0.0000   önceki %5.7400   değişim -5.74
    BARMA / THF   %0.0000   önceki %3.1200   değişim -3.12
    BARMA / VPS   %0.0000   önceki %16.0100  değişim -16.01

Sıfır ağırlıklı satırların **tamamının** önceki ağırlığı pozitif. "Çok küçük
pozisyon yuvarlanmış" diye bir vaka yok; hepsi çıkış.

Hisseler ekranında da görünüyor: BARMA orada "2 fonumda · 0,00 TL" diye
duruyor. Sahip olunan fonlar görünümündeki 28 hisse yalnız çıkılmış
pozisyonlardan geliyor.

## Satır silinmiyor

Kolay çözüm collector'ın bu satırları hiç yazmaması olurdu. Yanlış olur:
"fon BARMA'dan çıktı" gerçek ve değerli bir bilgi, `weight_change` onu
taşıyor. Bir fonun neyden çıktığını görmek ileride ayrı bir ekran olabilir.

Sorun yazmakta değil, okumakta: iki okuma yolu da satırı "fonda var" diye
yorumluyor.

## Tek kural, üç ekran

`fundDetail()` ve `stockAllocation()` — hisse kırılımını okuyan tek yer bu
ikisi. Asistan da kendi sorgusunu yazmıyor, aynı iki fonksiyonu tool olarak
çağırıyor. Dolayısıyla kural iki yerde düzelince asistan, Hisseler ve fon
detayı birlikte düzeliyor.

## Acceptance Criteria

- Ağırlığı %0 olan satır güncel varlık olarak listelenmez.
- Asistan "portföyünde bulunduran fonlar" cevabında çıkılmış fonu saymaz.
- Hisseler ekranında yalnız çıkılmış pozisyondan gelen hisse görünmez.
- Fon detayının hisse kırılımında çıkılmış pozisyon yer almaz.
- Satırlar veritabanından silinmez; `weight_change` bilgisi korunur.
- Collector'ın yazdığı satırlar değişmez.
- Kural iki okuma yolunda da aynıdır; asistan için ayrı bir kural yazılmaz.
