---
id: RQ-0011
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-08-31T19:47:53.813Z"
branch: "factory/RQ-0011"
createdFromCommit: "012d639d5cd34a75b7f44f992dbc9c0b0c0b9ed2"
completedRunId: "20260831194855-RQ-0011"
completedBy: "human"
completedAt: "2026-08-31T19:59:48.836Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/22"
githubPullRequestIid: 22
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/21"
githubIssueIid: 21
repositoryProvider: github
---
# RQ-0011 - Fon giriş/çıkış grafikleri: 1 hafta ve 1 ay net akış

Projenin ilk gerekçesi buydu: *"bazı fonlarda büyük bir çıkış başlıyor ve hemen
fiyatı düşüyor, ben bunu yakalamaya çalışıyorum."* Veri toplanıyor
(`fact_fund_daily.net_flow`, 36 fon, 2025-09-01'den bu yana 8.784 satır) ama
panelde hiç görünmüyor.

PBR bunun ders kitabı örneği:

| Tarih | Büyüklük | Net akış | Günlük |
|---|---:|---:|---:|
| 2026-08-14 | 18,04 mr₺ | −1,77 mr₺ | −%1,42 |
| 2026-08-18 | 16,02 mr₺ | −2,21 mr₺ | +%0,38 |
| 2026-08-24 | 9,79 mr₺ | −1,75 mr₺ | −%1,64 |
| 2026-08-28 | 6,11 mr₺ | −0,99 mr₺ | −%2,26 |
| 2026-08-31 | 5,59 mr₺ | | |

17 günde %69 küçülme, neredeyse her gün çıkış, fiyat da düşüyor. Kullanıcı
PBR'yi 18 ve 24 Ağustos'ta satmış — yani sinyali elle yakalamış. Panel bunu
göstermeliydi.

## Sıralama orana göre, ham TL'ye göre değil

Ham TL sıralaması fon büyüklüğünü sıralar, sıkıntıyı değil. Aynı pencere,
iki farklı sıralama:

| Orana göre | Ham TL'ye göre |
|---|---|
| PBR −%90,4 | PHE −37,12 mr₺ |
| PHE −%64,8 | PBR −26,70 mr₺ |
| **HRZ −%31,8** | PRY −7,87 mr₺ |
| VPS −%23,3 | DFI −2,03 mr₺ |

HRZ parasının üçte birini kaybetmiş ama −0,12 mr₺ olduğu için ham listede yok.
PRY ham listede üçüncü, oysa 112 mr₺'lik fonun %7'si çıkmış — sıkıntı değil,
sadece büyük fon.

Ölçüt: **net akış / pencere başı ve sonu büyüklüklerin büyüğü**.

Payda seçimi üç denemeyle oturdu:

| Payda | PBR (çıkış) | THF (giriş) | Sorun |
|---|---:|---:|---|
| Güncel büyüklük | −%477 | — | payda zaten erimiş tutar |
| Pencere başı | −%90,4 | **+%5073** | küçükten büyüyen fon listeyi ele geçirir |
| **Büyüğü** | **−%90,4** | **+%80,2** | — |

Çıkış tarafında pencere başı doğru çalışıyor çünkü oran doğal olarak −%100'de
sınırlı. Giriş tarafında sınır yok: THF ay başında 1,08 mr₺ iken 59,35 mr₺'ye
çıkmış. Büyüğe bölmek her iki yönü de ±%100 civarında sınırlar ve simetriktir.
Okunuşu: "fonun büyük halinin yüzde kaçı hareket etti".

TL tutarı kaybolmaz, barın yanında yazılı durur. Sıralamayı oran belirler,
büyüklüğü tutar anlatır.

## Yerleşim

Dashboard'un en altına yeni bölüm: **Para akışı**. Mevcut "Pozisyonlarım" ve
"Piyasa" bölümlerinin altına.

Dört panel, mevcut düzenle aynı: en çok giriş / en çok çıkış × 1 hafta / 1 ay.

Sahiplik ayrımı ve toggle RQ-0009'daki kuralla aynı çalışır: dolu bar
portföyümde, içi boş bar takip listemde; toggle kapalıyken yalnız açık
pozisyonlar. Yeni kontrol eklenmez.

## Kapsam

- `analytics.fund_flow` view'ı: fon başına 1 hafta ve 1 ay net akış (TL),
  pencere büyüklüğü, oran, gün sayısı.
- `dashboard()` akış sıralamalarını döndürür; mevcut toggle parametresi bu
  bölümü de süzer.
- Bar grafik oranı çizer, TL tutarını değer sütununda gösterir.
- Dashboard'da "Para akışı" bölümü, dört panel.

## Acceptance Criteria

- [ ] Dört panel: en çok giriş / en çok çıkış, 1 hafta ve 1 ay.
- [ ] Sıralama net akışın pencere başı büyüklüğe oranına göredir; ham TL
      tutarına göre değil.
- [ ] Payda pencere başı ve sonu büyüklüklerin büyüğüdür; ne güncel büyüklük
      ne de yalnız pencere başı — ilki çıkışta, ikincisi girişte oranı patlatır.
- [ ] Giriş sıralaması küçükten büyüyen fonlar tarafından ele geçirilmez.
- [ ] TL tutarı her barda okunur biçimde görünür (mr₺ / mn₺ kısaltmasıyla).
- [ ] Her barda pencerede kaç gün veri olduğu görünür.
- [ ] Pencere başı büyüklüğü bilinmeyen fon listeye girmez; oranı sıfır gibi
      gösterilmez.
- [ ] Sahiplik ayrımı RQ-0009'daki kuralla aynıdır: dolu / içi boş bar.
- [ ] Toggle kapalıyken yalnız açık pozisyondaki fonlar kalır ve sıralama
      yeniden hesaplanır.
- [ ] Boş panel "veri yok" demez; giriş veya çıkış olmadığını söyler.
- [ ] Mevcut piyasa ve pozisyon bölümleri değişmez.
- [ ] Yapılandırılmış quality gate'ler (typecheck, test, build) geçer.

## Kapsam Dışı

- Uyarı/bildirim üretmek ("bu fonda çıkış başladı" alarmı). Grafik önce,
  eşik ve bildirim ayrı iş.
- Akış ile fiyat düşüşü arasındaki ilişkinin ölçülmesi.
- Günlük akış zaman serisi grafiği (bu RQ pencere toplamı gösterir).
