---
id: RQ-0007
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-08-30T20:18:06.694Z"
branch: "factory/RQ-0007"
createdFromCommit: "c754a0abf4df233c28cacc0181564f2e4497e51f"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/14"
githubPullRequestIid: 14
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/13"
githubIssueIid: 13
repositoryProvider: github
---
# RQ-0007 - Giriş sonrası dashboard ve getiri sıralamaları

Giriş yapıldığında ilk gelen ekran portföy değil dashboard olur. Dashboard'da
en kârlı ve en çok kaybettiren fonlar 1 haftalık ve 1 aylık pencerelerde
grafikle gösterilir.

Referans marketvisuals.net/tefas_fonlar.html'deki düzen. Oradaki "En çok
yükselen" başlığı burada **"En kârlı fonlar"** olur; "yükselen" kelimesi o
sayfada fiyat için, "artan" ise yatırımcı sayısı için kullanılıyor ve dışarıdan
bakınca ayrımı görünmüyor.

## İki ayrı soru, iki ayrı sıralama

Bunlar farklı sorulardır ve dashboard ikisini de ayrı ayrı, açıkça etiketleyerek
göstermelidir:

| Sıralama | Soru | Kaynak |
|---|---|---|
| **Takip listem** | Elimdeki fonların hangisi kazandırdı? | Saklanan günlük seri, dış istek yok |
| **Tüm evren** | Piyasada en çok kazandıran hangisi? | Günlük snapshot, pencere başına 1 istek |

Ölçüldü: takip listesinin en iyisi 1 haftada %7,41 (DOH) iken tüm evrenin en
iyisi %33,56 (DIH). İkisini tek listede karıştırmak yanıltıcı olurdu.

## Takip listesi sıralaması nasıl hesaplanır

Saklanan `daily_return_pct` serisinden bileşik getiri olarak, veritabanında:

```sql
exp(sum(ln(1 + daily_return_pct/100))) - 1
```

Yöntem RQ-0003'te doğrulanmıştı: aylık bileşik, API'nin kendi aylık penceresiyle
dört ondalıkta aynı çıkıyor. Dış istek gerekmez, dashboard veritabanından çizilir.

Pencerede kaç iş günü bulunduğu birlikte gösterilmelidir; yeni eklenmiş bir fon
eksik günle hesaplanıp yanıltıcı biçimde üste çıkmamalıdır.

## Tüm evren sıralaması nasıl beslenir

`GET /funds/yield/?start=&end=` bir pencere için tüm evreni **tek istekte**
döndürür: 2026-08-24→31 aralığında 2395 fon, 2083'ünde değer.

RQ-0003 veritabanını takip listesiyle sınırlamıştı. Bu kural korunur: evrenin
tamamı saklanmaz, yalnız **her pencere için en iyi ve en kötü N fon** günlük
snapshot olarak yazılır. Dashboard'ın ihtiyacı bu; gerisi saklanırsa tablo
amaçsız büyür.

Gecelik collector koşusuna pencere başına 1 istek eklenir (1 hafta + 1 ay = 2).

## Grafik

Yatay bar grafik, satır içi SVG ile çizilir. Grafik kütüphanesi eklenmez:
iki bar grafik bir bağımlılığı hak etmiyor, proje çerçevesiz vanilla TypeScript
ve renkler zaten CSS custom property olarak tanımlı — kütüphane kendi paletini
getirirse tasarım ikiye bölünür.

- Pozitif değer aksan rengiyle, negatif değer tehlike rengiyle çizilir.
- Bar uzunlukları o gruptaki en büyük mutlak değere göre ölçeklenir.
- Fon kodu ve yüzde her barda okunur; unvan üzerine gelince görünür.
- Değer yoksa boş durum gösterilir, boş grafik çizilmez.

## Ekran düzeni

1. Üstte özet metrikler: takip edilen fon, açık pozisyon, son veri günü,
   son collector koşusu.
2. **En kârlı fonlar (1 hafta)** ve **(1 ay)** — takip listem.
3. **En çok kaybettiren fonlar (1 hafta)** ve **(1 ay)** — takip listem.
   Çıkış sinyali aranan bir üründe kaybedenler kazananlar kadar önemlidir.
4. Tüm evren sıralamaları, ayrı başlık altında ve kaynağı belirtilerek.

Sidebar'a "Panel" girişi eklenir ve giriş sonrası varsayılan görünüm olur.
Admin olmayan kullanıcı da dashboard'u görür; tüm evren bölümü herkese açıktır.

## Kapsam

- `fact_universe_yield_rank` benzeri bir tablo: pencere, tarih, yön (top/bottom),
  sıra, fon kodu, getiri.
- Collector'a pencere başına bir `/funds/yield/` çağrısı ve top/bottom N yazımı.
- `analytics` view'ı: takip listesi için 1 hafta ve 1 ay bileşik getiri, iş günü
  sayısıyla.
- `GET /api/dashboard` ucu: metrikler, takip listesi sıralamaları, evren
  sıralamaları.
- Satır içi SVG yatay bar grafik bileşeni.
- Dashboard görünümü ve sidebar girişi; giriş sonrası varsayılan.

## Acceptance Criteria

- [ ] Giriş yapıldığında ilk gelen görünüm dashboard'dur.
- [ ] Dashboard takip listesi için 1 haftalık ve 1 aylık en kârlı fonları
      azalan sırada gösterir.
- [ ] En çok kaybettiren fonlar da aynı iki pencerede gösterilir.
- [ ] Sıralamalar saklanan günlük seriden hesaplanır; sayfa açılışında dış
      servise istek atılmaz.
- [ ] Bir fonun penceresinde kaç iş günü bulunduğu görünür.
- [ ] Tüm evren sıralaması ayrı başlık altındadır ve takip listesi sıralamasıyla
      karıştırılamaz.
- [ ] Evren snapshot'ı yalnız top/bottom N fonu saklar; evrenin tamamı
      veritabanına yazılmaz.
- [ ] Collector koşusu evren snapshot'ını günceller; aynı gün ikinci koşu
      değişmemiş satırı yeniden yazmaz.
- [ ] Grafikler satır içi SVG ile çizilir; yeni bir çalışma zamanı bağımlılığı
      eklenmez.
- [ ] Pozitif ve negatif değerler farklı renkle ve doğru yönde çizilir.
- [ ] Veri yoksa boş durum gösterilir, hatalı veya boş grafik çizilmez.
- [ ] `type = user` olan kullanıcı dashboard'u görür; admin bölümleri görünmez.
- [ ] Yapılandırılmış quality gate'ler (typecheck, test, build) geçer.

## Kapsam Dışı

- Nakit akışı ve yatırımcı sayısı sıralamaları; bu requirement getiriye odaklanır.
- Kâr/zarar hesabı, stopaj ve ücret düşülmüş net getiri.
- Kategori bazlı sıralama.
- Sinyal üretimi, eşik ve uyarı.
- Grafiklerin dışa aktarılması veya paylaşılması.
- Zaman serisi (çizgi) grafikleri; bu requirement yatay bar ile sınırlıdır.
