---
id: RQ-0007
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-08-30T20:18:06.694Z"
branch: "factory/RQ-0007"
createdFromCommit: "c754a0abf4df233c28cacc0181564f2e4497e51f"
completedRunId: "20260831081806-RQ-0007"
completedBy: "batur"
completedAt: "2026-08-31T08:20:12.936Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/14"
githubPullRequestIid: 14
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/13"
githubIssueIid: 13
repositoryProvider: github
---
# RQ-0007 - Giriş sonrası dashboard ve getiri sıralamaları

Giriş yapıldığında ilk gelen ekran portföy değil dashboard olur. Dashboard'da
takip listesindeki fonların en çok kazandıran ve en çok kaybettirenleri, 1
haftalık ve 1 aylık pencerelerde grafikle gösterilir.

Dört liste vardır ve hepsi **yalnız takip listesindeki fonları** kapsar:

| | 1 hafta | 1 ay |
|---|---|---|
| En çok kazandıran | ✓ | ✓ |
| En çok kaybettiren | ✓ | ✓ |

Takip listesi dışındaki fonlar dashboard'a girmez. Veritabanı RQ-0003'te takip
listesiyle sınırlandırılmıştı; o kural burada da geçerlidir ve piyasa geneli
sıralaması için veri toplanmaz.

## Adlandırma

Referans alınan marketvisuals.net'te "En çok yükselen" fiyat için, "En çok
artan" yatırımcı sayısı için kullanılıyor ve ayrım dışarıdan görünmüyor. Burada
kazanç açıkça söylenir: **"En çok kazandıran"** ve **"En çok kaybettiren"**.

## Sıralama nasıl hesaplanır

Saklanan `daily_return_pct` serisinden bileşik getiri olarak, veritabanında:

```sql
exp(sum(ln(1 + daily_return_pct/100))) - 1
```

Yöntem RQ-0003'te doğrulanmıştı: aylık bileşik, API'nin kendi aylık penceresiyle
dört ondalıkta aynı çıkıyor. Dış istek gerekmez; dashboard veritabanından çizilir
ve sayfa açılışında hiçbir dış servise bağlanılmaz.

Pencerede kaç iş günü bulunduğu birlikte gösterilir; yeni eklenmiş bir fon eksik
günle hesaplanıp yanıltıcı biçimde üste çıkmamalıdır.

**"En çok kaybettiren" yalnız gerçekten eksideki fonları listeler.** Alttan N
almak yanlış olurdu: takip listesi küçük ve çoğu fon artıdayken panel pozitif
değerlerle dolar ve başlığını yalanlar. Ekside fon yoksa liste kısa kalır.

## Grafik

Yatay bar grafik, satır içi SVG. Grafik kütüphanesi eklenmez: dört bar grafik
bir bağımlılığı hak etmiyor, proje çerçevesiz vanilla TypeScript ve renkler
zaten CSS custom property olarak tanımlı — kütüphane kendi paletini getirirse
tasarım ikiye bölünür.

- Pozitif değer aksan rengiyle, negatif değer tehlike rengiyle çizilir.
- Bar uzunlukları o gruptaki en büyük mutlak değere göre ölçeklenir.
- Fon kodu ve yüzde her barda okunur; unvan üzerine gelince görünür.
- Değer yoksa boş durum gösterilir, boş grafik çizilmez.

## Ekran düzeni

1. Üstte özet metrikler: takip edilen fon, açık pozisyon, son veri günü, son
   collector koşusu.
2. Dört grafik: kazandıran ve kaybettiren, 1 hafta ve 1 ay.

Sidebar'a "Panel" girişi eklenir ve giriş sonrası varsayılan görünüm olur. Admin
olmayan kullanıcı da dashboard'u görür.

## Kapsam

- `analytics` view'ı: takip listesi için 1 hafta ve 1 ay bileşik getiri, iş günü
  sayısıyla.
- `GET /api/dashboard` ucu: metrikler ve dört sıralama.
- Satır içi SVG yatay bar grafik bileşeni.
- Dashboard görünümü ve sidebar girişi; giriş sonrası varsayılan.

## Acceptance Criteria

- [ ] Giriş yapıldığında ilk gelen görünüm dashboard'dur.
- [ ] Dört liste gösterilir: kazandıran ve kaybettiren, 1 hafta ve 1 ay.
- [ ] Listeler yalnız takip listesindeki fonları içerir; başka fon görünmez.
- [ ] Sıralamalar saklanan günlük seriden hesaplanır; sayfa açılışında dış
      servise istek atılmaz.
- [ ] Bir fonun penceresinde kaç iş günü bulunduğu görünür.
- [ ] "En çok kaybettiren" yalnız getirisi negatif olan fonları listeler.
- [ ] Grafikler satır içi SVG ile çizilir; yeni bir çalışma zamanı bağımlılığı
      eklenmez.
- [ ] Pozitif ve negatif değerler farklı renkle ve doğru yönde çizilir.
- [ ] Veri yoksa boş durum gösterilir, hatalı veya boş grafik çizilmez.
- [ ] `type = user` olan kullanıcı dashboard'u görür; admin bölümleri görünmez.
- [ ] Takip listesi dışında hiçbir fon veritabanına yazılmaz.
- [ ] Yapılandırılmış quality gate'ler (typecheck, test, build) geçer.

## Kapsam Dışı

- Piyasa geneli (takip listesi dışı) sıralamalar.
- **Pozisyon bazlı getiri**: "aldığımdan beri ne kazandım". Farklı bir sorudur
  ve ayrı bir requirement'a aittir; ölçüldü: PBR fonu son 1 ayda -%7,56 iken
  kullanıcının alımından satışına +%47,43 getirmiş.
- Kâr/zarar hesabı, stopaj ve ücret düşülmüş net getiri.
- Nakit akışı ve yatırımcı sayısı sıralamaları.
- Kategori bazlı sıralama.
- Sinyal üretimi, eşik ve uyarı.
- Zaman serisi (çizgi) grafikleri; bu requirement yatay bar ile sınırlıdır.
