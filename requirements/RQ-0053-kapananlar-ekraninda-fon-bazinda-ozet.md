---
id: RQ-0053
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-07T22:05:31.971Z"
branch: "factory/RQ-0053"
createdFromCommit: "54c9e85393f073ad19dd1e1e56ed8a2455fac301"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/106"
githubPullRequestIid: 106
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/105"
githubIssueIid: 105
repositoryProvider: github
---
# RQ-0053 - Kapananlar ekranında fon bazında özet

Kapananlar ekranı satılmış her FIFO bacağını ayrı satır olarak listeliyor.
Üstte dört kutu toplamı veriyor, altta 53 satır tek tek duruyor. Arada bir
şey eksik: **hangi fondan ne kadar çıktı.**

## Ölçüm

    kapanan işlem satırı      53
    ayrı fon                  19
    fon başına ortalama      2,8 satır
    en dağınık               PHE 8, DFI 7, PBR 7, VPS 7 satır

Liste "en son satılan üstte" sıralı, yani bir fonun bacakları yan yana bile
değil. VPS yedi satıra bölünmüş:

    VPS   7 satır   alış 299.896   satış 173.311   K/Z -126.585   %-42,21
    DFI   7 satır   alış 306.203   satış 418.057   K/Z +111.854   %+36,53
    PHE   8 satır   alış 245.339   satış 311.322   K/Z  +65.983   %+26,89
    PBR   7 satır   alış 275.381   satış 334.638   K/Z  +59.257   %+21,52

Bu tablo ekranda hiçbir yerde yok. "Toplam ne kazandım" var, "bu işlemde ne
kazandım" var; "VPS bana ne kaybettirdi" yok — oysa karar verirken sorulan
soru bu.

## Sekme, yeni ekran değil

Ekranda zaten iki okuma var: kutular (toplam) ve tablo (işlem). Üçüncüsü
bunların arasına giriyor, ayrı bir ekrana taşımak parçalardı.

Hisseler'de Hisse/Sektör sekmeleri aynı işi yapıyor: aynı veriyi iki
kırılımda gösteriyor. Aynı `tabs` bileşeni burada da kullanılmalı.

Varsayılan sekme fon olmalı. Ölçüm bunu söylüyor: 19 fonluk bir liste bir
ekrana sığıyor, 53 satırlık liste sığmıyor ve okumaya nereden başlanacağı
belli değil.

## Sıralama ve kapsam

Fon listesi portföye giren tutara göre azalan sıralanır: listenin başında en
çok para bağlanan fon durur. K/Z'ye göre sıralamak küçük ama şanslı bir
pozisyonu başa taşıyordu; ölçekle sıralayınca satırın ağırlığı da okunuyor.

İşlem listesi alış tarihine göre yeniden eskiye sıralanır. Satış tarihi
sıralaması aynı fonun bacaklarını giriş sırasının tersine diziyordu — önce
alınan sonra satılabiliyor ve liste pozisyonun nasıl kurulduğunu
anlatmıyordu.

## Filtre ve fon satırından geçiş

Fon satırındaki "7 işlem" bir soru soruyor ama cevabı verecek yol yok:
kullanıcı işlem sekmesine geçip 53 satır içinde o fonu aramak zorunda.

Fon satırına tıklamak işlemlerini **pencerede** açar; satırın sonunda bir
işlem ikonu bunu görünür kılar.

İki tasarım denendi ve ikisi de bırakıldı. Önce tıklama işlem sekmesine
geçiriyordu: sekme kullanıcının kontrol ettiği bir şey, kendiliğinden
değişince tıklanan yer ile değişen yer ekranın iki ayrı ucunda kalıyor —
kullanıcı geçişi görmüyor bile, üstelik gelen tablo eskisine benziyor (yine
tablo, yine ilk sütunda FON). Sonra bacaklar satırın altında açıldı: bu sefer
alt satırlar üstteki sütun başlıklarını ödünç alıyordu ve "FON" başlığının
altındaki tarih aralığı okunmuyordu.

Pencere ikisinin de sorununu taşımıyor: liste yerinde kalıyor, hiçbir başlık
ödünç alınmıyor, kapatmanın üç yolu var (çarpı, Esc, dışarı tıklama).

Penceredeki tablo İşlemler sekmesindekinin **aynısı** — aynı sütunlar, aynı
satır ve toplam kurucusu. İki yerde ayrı kurulsaydı sütunlar zamanla
birbirinden ayrılırdı. Filtre yok: pencere zaten tek fonun penceresi.

İşlem listesinde ayrıca fon ve banka filtresi durur — Fon Hareketleri'ndeki
desenin aynısı, aynı `comboFilter` bileşeni ve aynı AND kuralı.

Fon satırı yalnız **kapanmış** bacakları toplar. Bir fon satılıp yeniden
alınmış olabilir — DFI 7 Eylül'de kapandı, 8 Eylül'de yeniden alındı — ve
açık pozisyon bu ekranın konusu değil.

Banka kırılımı fon satırında yok: aynı fon iki bankada kapanmış olabilir
(VPS'te öyle), ama sorulan soru fonun kendisi. Banka bilgisi işlem
sekmesinde zaten duruyor.

## Acceptance Criteria

- Kapananlar ekranı fon ve işlem olmak üzere iki sekme gösterir.
- Fon sekmesi her fon için satır sayısı, alış, satış, K/Z ve K/Z % verir.
- Fon satırı yalnız kapanmış bacakları toplar; açık pozisyon karışmaz.
- Fon listesi portföye giren tutara göre azalan sıralanır.
- İşlem listesi alış tarihine göre yeniden eskiye sıralanır.
- İşlem listesinde fon ve banka filtresi vardır; ikisi AND ile birleşir.
- Fon satırının sonunda işlem ikonu vardır; satırın tamamı tıklanabilir.
- Tıklamak fonun işlemlerini pencerede açar ve sekmeyi değiştirmez.
- Penceredeki tablo İşlemler sekmesindekiyle aynı sütunları taşır.
- Pencerede filtre yoktur.
- Pencere tablosu kesilmeden sığar.
- Pencerenin toplam satırı fon satırındaki rakamlarla birebir tutar.
- Filtreliyken başlık kaç kaydın kaçının görüldüğünü yazar.
- Varsayılan sekme fon; seçim sayfa yenilendiğinde korunur.
- Sekme değiştirmek `/api/closed`'a yeni istek atmaz.
- Fon toplamları işlem tablosunun toplam satırıyla birebir tutar.
