---
id: RQ-0056
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-08T18:06:41.866Z"
branch: "factory/RQ-0056"
createdFromCommit: "b5db47c93a2ece4b1ed378481ddc6738cb71fb6c"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/112"
githubPullRequestIid: 112
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/111"
githubIssueIid: 111
repositoryProvider: github
---
# RQ-0056 - İşlem formunda fon serbest metin değil, listeden seçilir

İşlem formunda fon kodu serbest metin. Kullanıcı istediğini yazabiliyor ve
yazdığı şey sistemde olmayabiliyor. Sonuç sessiz: valör bilgisi yok, alış
tarihi hesaplanmıyor, fiyat gelmiyor — form hiçbir şey söylemeden boş
duruyor ve kullanıcı bunu bozukluk sanıyor.

Uyarı metni eklemek denendi ve yetersiz kaldı. Doğru olan hatayı açıklamak
değil, yapılamaz kılmak.

## Ölçüm

    dim_fund (tanınan fon)         69
    valörü olan (dim_fund_terms)   69
    fiyat verisi olan              69
    takip edilen                   69
    tanınıp verisi olmayan          0

Sistemdeki her fonun valörü de fiyatı da var. "Tanınıyor ama verisi yok"
diye bir durum yok, çünkü fon sisteme hangi yoldan girerse girsin toplama
tetikleniyor. Yani listeden seçilen her fon hesaplanabilir demek.

Boşluk yalnız serbest metinde: yazılan kod hiçbir listeden geçmiyor.

## Çözüm

Fon kodu alanı, koda ve ada göre aranabilen bir seçiciye dönüşür. Kullanıcı
"TERA" yazıp fonu adından da bulabilir, "THF" yazıp kodundan da.

Desen yeni değil: Fon Hareketleri'ndeki fon filtresi zaten aynı bileşen
(`comboFilter`) ve aynı arama kutusu. Kullanıcı bu etkileşimi biliyor.

Alan zorunlu olduğu için temizleme düğmesi olmaz — boş bir değere
dönülemiyorsa o düğme ölü olur.

## Listede olmayan fon

Yeni bir fon alındığında ne olacak sorusunun cevabı var olan akış: fon önce
sisteme girer (takip listesi ya da admin sistem fon listesi), o giriş
toplamayı tetikler, sonra işlem yazılır.

Seçici bunu bir çıkmaz sokağa çevirmemeli: liste boş kaldığında ya da fon
bulunamadığında kullanıcıya nereye gideceğini söyleyen bir satır durur.

## Takip listesi formu serbest metin kalır

Yeni bir fon sisteme oradan giriyor: kod yazılır, uç fonu tanıtır ve
toplamayı tetikler. Orayı da listeye bağlamak sistemi kapalı bir çembere
sokardı — hiç yeni fon eklenemezdi.

Yani iki form bilerek farklı: takip listesi giriş kapısı, işlem formu ise
zaten tanınan bir fonu istiyor.

## Ne değişmiyor

Düzenlemede kayıtlı fon seçili gelir. Kayıtlı fon bir şekilde listeden
düşmüşse — silinmiş, listeden çıkarılmış — seçici onu yine de gösterir;
aksi hâlde kullanıcı kendi kaydını düzenleyemez hâle gelirdi.

Sunucu tarafındaki `ensureFundKnown` kalır: uç hâlâ kendi başına
doğrulanabilir olmalı, arayüz tek savunma hattı değil.

## Acceptance Criteria

- İşlem formunda fon serbest metin olarak yazılamaz; listeden seçilir.
- Liste hem fon koduyla hem fon adıyla aranabilir.
- Yalnız sistemde tanınan fonlar listelenir.
- Seçici, aramanın yapıldığı diğer alanlarla aynı bileşeni kullanır.
- Zorunlu alan olduğu için temizleme düğmesi yoktur.
- Düzenlemede kaydın fonu seçili gelir; listede olmasa bile gösterilir.
- Fon listede yoksa kullanıcıya nereden ekleyeceği söylenir.
- Sunucu tarafı doğrulama kalkmaz.
- Takip listesi formu serbest metin kalır; yeni fonun giriş kapısı orası.
- Seçilen fonun valörü olduğu için alış/satış tarihi hesabı her seçimde
  çalışır.
