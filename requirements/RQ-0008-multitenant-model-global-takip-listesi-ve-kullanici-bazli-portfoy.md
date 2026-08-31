---
id: RQ-0008
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-08-31T12:25:22.182Z"
branch: "factory/RQ-0008"
createdFromCommit: "fa32be56d03c413e1866a2097109f1cfd295da82"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/16"
githubPullRequestIid: 16
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/15"
githubIssueIid: 15
repositoryProvider: github
---
# RQ-0008 - Multitenant model: kullanıcı bazlı takip listesi ve portföy

Sistem çok kullanıcılı olacak. Şu an neyin kime ait olduğu net değil ve bir
tablo yanlış kapsamda duruyor.

## Bugünkü durum ve sorun

| Tablo | Kapsam | Doğru mu |
|---|---|---|
| `dim_fund`, `fact_fund_daily`, `dim_fund_terms`, … | global | ✓ piyasa verisi herkese ortak |
| `portfolio_transaction` | `user_id` var | ✓ |
| `app_session` | `user_id` var | ✓ |
| **`watchlist`** | **global, sahibi yok** | ✗ kimin listesi olduğu belirsiz |

Ölçüldü: `watchlist`, `dim_fund` ve işlem görmüş fonlar bugün aynı 36 fon. Takip
listesi bağımsız bir liste değil, portföyün yan ürünü — çünkü fon eklemenin tek
yolu işlem girmek. "Henüz almadığım ama izlediğim fon" kavramı şemada var
(`status='watching'`) ama eklenemiyor: 36 satırın hepsi `owned`.

## İki ayrı kavram, tek tabloda karışmış

`watchlist` bugün iki işi birden yapıyor ve ikisi de yanlış oluyor:

| Soru | Doğru kapsam |
|---|---|
| Ben neyi izliyorum? | **Kullanıcı başına** |
| Collector neyi toplasın? | **Türetilir** — elle tutulan bir liste değil |

Bu requirement ikisini ayırır.

## Takip listesi kullanıcıya ait olur

`watchlist` → `user_watchlist(user_id, fund_code, added_at)`.

- Her kullanıcı kendi listesini yönetir: ekler, çıkarır.
- Bir kullanıcının listesi başka kullanıcıyı etkilemez.
- Aynı fon birden çok kullanıcının listesinde olabilir; veri yine bir kez toplanır.

## Collector'ın kaynağı hesaplanır

Toplanacak fon kümesi bir tablo değil, bir sorgudur:

```
DISTINCT( tüm kullanıcıların takip listeleri
        ∪ tüm kullanıcıların AÇIK pozisyondaki fonları )
```

Bir fon kaç kullanıcıyı ilgilendirirse ilgilendirsin **bir kez** toplanır. Piyasa
verisi global kalır; THF'nin NAV'ını kullanıcı başına tekrar çekmek aynı veriyi
çoğaltmak olurdu ve RQ-0001'de ölçülen ban riski gerçek.

Portföyün de kümeye girmesi şart: bir kullanıcı fonu takip listesinden çıkarsa
ama pozisyonu duruyorsa verisi kesilmemelidir.

Bu gerekçe yalnız **açık** pozisyon için geçerli. Kapalı pozisyon da kümede
olsaydı, aylar önce çıkılmış ve takip listesinden de silinmiş bir fon sonsuza
kadar toplanırdı — kimse istemediği halde.

Satılmış bir fonu bir süre daha izlemek isteyen onu takip listesinde tutar.
Bu artık kullanıcının kararı, portföy geçmişinin yan etkisi değil. Kapalı
pozisyonun kâr/zarar hesabı da etkilenmez: satış tarihine kadarki NAV zaten
`fact_fund_daily`'de duruyor ve silinmiyor.

## Portföy kullanıcıya aittir

`portfolio_transaction` zaten `user_id` taşıyor ve kullanıcı yalnız kendi
işlemlerini görüyor (RQ-0004'te doğrulandı). Bu korunur.

`batur` adında bir kullanıcı oluşturulur ve mevcut 94 işlem ona taşınır. Bugün
işlemler `admin` üzerinde duruyor; `admin` yönetim hesabıdır, portföy taşımamalı.
Mevcut 36 takip satırı da `batur`'un listesi olur.

## Durum artık türetilir

`watchlist.status` alanı kaldırılır. Elle tutulduğu için zaten yanlış: 36 fonun
hepsi `owned` görünüyor, oysa 26'sında açık pozisyon var, 10'undan tamamen
çıkılmış.

Asıl sebep başka: **durum kullanıcıya göre değişir.** Aynı fon bir kullanıcı için
"sahibim", diğeri için "izliyorum" olabilir. Tek bir sütun bunu ifade edemez.

| Durum | Koşul |
|---|---|
| Sahibim | O kullanıcının o fonda satılmamış işlemi var |
| Çıktım | İşlemi var ama hepsi satılmış |
| İzliyorum | İşlemi yok, takip listesinde var |

## Kapsam

- `watchlist` → `user_watchlist(user_id, fund_code, added_at)`; `status` kaldırılır.
- `batur` kullanıcısı oluşturulur; 94 işlem ve 36 takip satırı ona taşınır.
- Collector'ın fon kümesi takip listeleri ile açık pozisyonların birleşiminden
  hesaplanır; her fon bir kez toplanır. Kapalı pozisyon kümeye girmez.
- Takip listesine fon ekleme ve çıkarma uçları; kullanıcı yalnız kendi listesini
  değiştirir.
- Takip listesi görünümü kullanıcının kendi listesini ve türetilmiş durumu gösterir.
- Portföye işlem girildiğinde fon o kullanıcının takip listesinde yoksa eklenir
  (mevcut davranış korunur).
- `pnpm db:seed <kullanıcı>` — tohum dosyası artık kime uygulanacağını bilmeli.
  Dosyadaki durum sütunu kaldırılır; kalmış bir durum sözcüğü sessizce yok
  sayılmaz, hata verir.
- `pnpm db:user` — panele girmeden kullanıcı açmak, parola sıfırlamak ve bir
  hesabın portföyünü/takip listesini başka hesaba devretmek için. `batur`
  devri bu komutla yapılır; uzak sunucuda da aynı komut koşar.

## Acceptance Criteria

- [ ] Migration'lar `pnpm db:migrate` ile uygulanır; ikinci çalıştırma hiçbir
      migration uygulamaz.
- [ ] `batur` kullanıcısı vardır, giriş yapabilir; 94 işlemin ve 36 takip
      satırının tamamı ona aittir, `admin`'de hiç işlem veya takip satırı kalmaz.
- [ ] Kullanıcı kendi takip listesine fon ekler ve çıkarır.
- [ ] Bir kullanıcının listesinden fon çıkarması başka kullanıcının listesini
      etkilemez.
- [ ] Bir kullanıcı başka kullanıcının takip listesini veya işlemlerini göremez,
      değiştiremez.
- [ ] Geçersiz fon kodu reddedilir; fon `dim_fund`'a fintables'tan doğrulanarak
      eklenir.
- [ ] Aynı fon aynı kullanıcı tarafından iki kez eklenirse hata vermez.
- [ ] Collector'ın topladığı fon kümesi takip listeleri ile açık pozisyonların
      birleşimidir; iki kullanıcı aynı fonu izlese de fon bir kez toplanır.
- [ ] Bir kullanıcı fonu takip listesinden çıkarsa ama açık pozisyonu varsa fon
      toplanmaya devam eder.
- [ ] Tamamen satılmış bir fon takip listesinden çıkınca toplanmayı bırakır;
      takip listesinde kaldığı sürece toplanmayı sürdürür.
- [ ] Fon durumu (sahibim / çıktım / izliyorum) işlemlerden türetilir ve
      kullanıcıya göre değişir; tabloda `status` alanı yoktur.
- [ ] `pnpm db:seed` kullanıcı adı olmadan çalışmaz; olmayan kullanıcı reddedilir.
- [ ] `pnpm db:user transfer` kaynakta satır bırakmaz; devir tek transaction'dır.
- [ ] Yapılandırılmış quality gate'ler (typecheck, test, build) geçer.

## Kapsam Dışı

- Arayüzde "sadece kendi fonlarım" / "başkalarının fonları dahil" seçeneği;
  grafiklerin kapsamını değiştiren filtre sonraki bir requirement'ta ele alınır.
- Pozisyon bazlı getiri ve kâr/zarar hesabı.
- Kullanıcı davetleri, kayıt olma, parola sıfırlama.
- Kullanıcılar arası portföy paylaşımı veya görüntüleme.
- Takip listesi büyüdükçe collector süresini sınırlama veya arşivleme.
