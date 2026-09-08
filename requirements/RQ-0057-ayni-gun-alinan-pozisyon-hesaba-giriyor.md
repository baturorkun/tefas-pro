---
id: RQ-0057
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-08T20:01:26.935Z"
branch: "factory/RQ-0057"
createdFromCommit: "065a57a6fcc4dfa66a33cde8df765d8b3283e461"
completedRunId: "20260908200226-RQ-0057"
completedBy: "human"
completedAt: "2026-09-08T20:11:19.732Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/114"
githubPullRequestIid: 114
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/113"
githubIssueIid: 113
repositoryProvider: github
---
# RQ-0057 - Aynı gün alınan pozisyon hesaba giriyor

Bugün alınan bir fon Portföyüm'de görünmüyor: maliyet, değer ve getiri
hücreleri boş kalıyor, toplamlara girmiyor. Ertesi gün kendiliğinden
düzeliyor. Kullanıcı bunu "alım kaydedilmemiş" diye okuyor.

## Kök sebep

`analytics.position_slice` bacakları şu koşulla süzüyor:

    WHERE c.days > 0 AND c.m_start IS NOT NULL

`days`, alış gününden **sonraki** fiyat günlerini sayıyor. Aynı gün alınan
pozisyonda o sayı sıfır; `m_start` da boş çarpımdan NULL geliyor
(`sum(ln(...))` boş kümede NULL) ve satır düşüyor.

View'ın yorumu "aynı gün alınmış, henüz ölçülemiyor" diyor. Bu doğru değil:
o günün fiyatı elimizde. Maliyet o fiyattan, değer aynı fiyattan, kâr/zarar
sıfır. Doğru cevap "bilinmiyor" değil, **sıfır**.

## Ölçüm

    son veri günü                                2026-09-08
    aynı gün alınmış, dışarıda kalan işlem       10   (2 kullanıcı)
    ileri tarihli, doğru şekilde dışarıda         4

Salt-okunur doğrulama, düzeltilmiş formülle:

    CKL  49.873,92    DOH  50.772,69    THF  90.756,76
    DFI  25.218,30    HBU  25.364,04    TAU  25.163,17
    RBR  25.087,27    YZC  25.176,19        maliyet = değer, K/Z 0

Bu her gün tekrarlayan bir kayıp: o gün alınan her fon ertesi güne kadar
portföyden ve maliyet toplamından düşüyor.

## Düzeltme ileri tarihli alımı bozmamalı

`m_start`'ı 1'e sabitleyip koşulu tamamen kaldırmak yetmez — o zaman yarın
tarihli bir alım da bugünkü fiyattan değerlenirdi ve fiyatı açıklanmamış bir
işlem için uydurulmuş bir maliyet üretilirdi. RQ-0044'ten beri korunan kural
bu.

Doğru ayrım gün sayısı değil, **alış gününün veri gününü geçip geçmediği**:

    days > 0                →  start_date <= son veri günü
    m_start NULL ise 1      →  boş çarpım nötr elemandır

## Üç view birlikte

Aynı kural üç yerde:

    position_slice     days > 0 AND m_start IS NOT NULL
    position_return    aynı kural
    closed_position    m_buy IS NOT NULL

Üçü birlikte değişmeli. Ayrı kalırlarsa Portföyüm ile Dağılım farklı toplam
gösterir; `position_slice`'ın yorumu da zaten "tanım ayrışsaydı Dağılım
ekranının toplamı Portföyüm'ünkiyle tutmazdı" diyor.

## Acceptance Criteria

- Aynı gün alınan pozisyon maliyet, değer ve getiriyle birlikte görünür.
- O pozisyonun kâr/zararı sıfır, getirisi %0 olur.
- Alış günü son veri gününü geçen işlem hesaba girmez; bekleyen kalır.
- Üç view aynı kuralı kullanır; Portföyüm, Dağılım ve Kapananlar toplamları
  birbirini tutar.
- Portföy toplam değeri, aynı gün alınanların maliyeti kadar artar.
- Mevcut pozisyonların rakamları değişmez.
