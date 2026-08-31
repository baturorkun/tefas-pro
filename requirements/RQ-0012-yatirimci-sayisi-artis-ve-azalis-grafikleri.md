---
id: RQ-0012
status: draft
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-08-31T20:15:59.377Z"
branch: "factory/RQ-0012"
createdFromCommit: "8533a9df9d7368bc0ba10d9f0217921e919d23fb"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/24"
githubPullRequestIid: 24
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/23"
githubIssueIid: 23
repositoryProvider: github
---
# RQ-0012 - Yatırımcı sayısı artış ve azalış grafikleri

RQ-0011 paranın nereye gittiğini gösteriyor. Bu RQ kimin gittiğini gösteriyor.
İkisi aynı şey değil ve farkı bilgi taşıyor.

Ölçüldü — son 1 ay, çıkış yaşayan fonlar:

| Fon | Para | İnsan | Ne anlama geliyor |
|---|---:|---:|---|
| PBR | −%90,4 | −%53,4 | para insandan hızlı çıkmış: önce büyükler gitmiş |
| PHE | −%64,8 | −%27,2 | aynı örüntü, daha ılımlı |
| HRZ | −%31,8 | −%19,7 | |
| VPS | −%23,3 | −%15,7 | |

Dördünde de para oranı insan oranından belirgin düşük. Yani fondan önce büyük
yatırımcılar çıkıyor, küçükler kalıyor. Yalnız para grafiğine bakan bunu
göremez.

Veri toplanıyor: `fact_fund_daily.investor_count`, 36 fon, 2025-09-30'dan bu
yana 4.912 satır. Panelde hiç görünmüyor.

## Ölçüt RQ-0011 ile aynı

Değişim = pencere sonu − pencere başı yatırımcı sayısı.

Payda **pencere başı ve sonunun büyüğü**. Aynı gerekçe, aynı tuzak: pencere
başına bölmek azalışta çalışır (doğal olarak −%100'de sınırlı) ama artışta
patlar. THF ay başında 6.523 yatırımcıdan 111.839'a çıkmış:

| Payda | THF (artış) | PBR (azalış) |
|---|---:|---:|
| Pencere başı | **+%1614,5** | −%53,4 |
| **Büyüğü** | **+%94,2** | **−%53,4** |

Kişi sayısı da kaybolmaz, oranın yanında durur — sıralamayı oran belirler,
büyüklüğü sayı anlatır. RQ-0011'de TL tutarının durduğu yer.

## Yerleşim

Dashboard'un en altına, "Para akışı" bölümünün ardına yeni bölüm:
**Yatırımcı sayısı**. Dört panel: en çok artan / en çok azalan × 1 hafta / 1 ay.

Sahiplik ayrımı ve toggle RQ-0009'daki kuralla aynı çalışır; yeni kontrol
eklenmez.

## Kapsam

- `analytics.fund_investor` view'ı: fon başına 1 hafta ve 1 ay yatırımcı
  değişimi (kişi), pencere büyüklüğü, oran, gün sayısı.
- `dashboard()` yatırımcı sıralamalarını döndürür; mevcut toggle parametresi
  bu bölümü de süzer.
- Bar grafik oranı çizer, kişi sayısını değer sütununda gösterir.
- Dashboard'da "Yatırımcı sayısı" bölümü, dört panel.

## Acceptance Criteria

- [ ] Dört panel: en çok artan / en çok azalan, 1 hafta ve 1 ay.
- [ ] Sıralama değişimin pencere büyüklüğüne oranına göredir, ham kişi
      sayısına göre değil.
- [ ] Payda pencere başı ve sonunun büyüğüdür; yalnız pencere başı artış
      tarafında oranı patlatır.
- [ ] Kişi sayısı her barda görünür (binlik ayraçlı).
- [ ] Her barda pencerede kaç gün veri olduğu görünür.
- [ ] Pencere büyüklüğü bilinmeyen fon listeye girmez; oranı sıfır gibi
      gösterilmez.
- [ ] Sahiplik ayrımı RQ-0009'daki kuralla aynıdır: dolu / içi boş bar.
- [ ] Toggle kapalıyken yalnız açık pozisyondaki fonlar kalır ve sıralama
      yeniden hesaplanır.
- [ ] Boş panel "veri yok" demez; artış veya azalış olmadığını söyler.
- [ ] Mevcut piyasa, pozisyon ve para akışı bölümleri değişmez.
- [ ] Yapılandırılmış quality gate'ler (typecheck, test, build) geçer.

## Kapsam Dışı

- Para ile insan oranının yan yana karşılaştırılması ("büyükler mi çıkıyor"
  göstergesi). Bu RQ'nun gerekçesi ama ayrı bir görünüm; iki grafik önce
  ayrı ayrı doğru çalışsın.
- Uyarı/bildirim üretmek.
- Ortalama yatırımcı büyüklüğü (AUM / yatırımcı sayısı) türetmesi.
