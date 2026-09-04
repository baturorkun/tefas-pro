---
id: RQ-0030
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-04T06:53:13.251Z"
branch: "factory/RQ-0030"
createdFromCommit: "de88d44453452c1c3dffeb7104073aa4a8841181"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/60"
githubPullRequestIid: 60
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/59"
githubIssueIid: 59
repositoryProvider: github
---
# RQ-0030 - Panelde günlük getiri ve toplam kazanç

Panel'in üstünde portföyle ilgili tek bir rakam yok: Takip Listem, Açık
Pozisyon, Son Veri ve Son Toplama var. İlk ikisi zaten kendi ekranlarında
görünüyor. Uygulamayı açan kişinin ilk sorduğu iki soru ise hiçbir yerde
cevaplanmıyor.

## Bugünkü getiri

"Dün bugün ne oldu" sorusu. Değer hesaplanıyor ama yalnız grafikte bar olarak
çiziliyor; sayı olarak hiçbir yerde yazmıyor. Grafiğin üstündeki tek rakam
"Dönem Getirisi" ve o otuz günün toplamı.

## Toplam kazanç ve doğru payda

Açık pozisyon kârı Portföyüm'de, gerçekleşen kâr Kapananlar'da; toplamı
kullanıcının kafadan yapması gerekiyor.

Yüzde daha önemli bir mesele. Portföyüm getirisini maliyete bölüyor. Toplam
kazanç için doğru payda net sermayedir: maliyetten gerçekleşen kâr düşülür,
yani cebinden gerçekten çıkan para kalır. Kazanılıp yeniden yatırılan tutar
yeni sermaye değil; maliyete sayılırsa payda kendi kârıyla şişer ve getiri
olduğundan düşük görünür. Ölçülen veride fark iki puana yakın: maliyete göre
%13,25, net sermayeye göre %14,77.

Net sermaye ayrı bir kutu değil, bu oranın paydası. Tek başına bir soruya cevap
vermiyor.

## Kapsam dışı

Gross Purchases (bugüne kadarki toplam alım) konmuyor: muhasebe bilgisi, karar
bilgisi değil. Aynı fon defalarca alınıp satılınca şişiyor ve iyi mi kötü mü
gidildiği hakkında bir şey söylemiyor — ölçülen veride portföy 3,7 milyonken
brüt alım 5,6 milyon, yanıltıcı.

Ortalama tutuş süresi de konmuyor: günlük bakılacak bir sayı değil ve tanımı
belirsiz (para ağırlıklı mı, işlem sayısıyla mı). Yeri Panel değil.

## Acceptance Criteria

- Panel'de bugünkü getiri TL ve yüzde olarak görünür.
- Bugünkü getiri son ölçülen güne aittir ve hangi güne ait olduğu yazar.
- Panel'de toplam kazanç görünür: açık pozisyon kârı ile gerçekleşen kârın
  toplamı.
- Toplam kazancın yüzdesi net sermayeye bölünerek hesaplanır, maliyete değil.
- Panel'de portföyün güncel değeri görünür.
- Portföyü olmayan kullanıcıda kutular tire gösterir, hata vermez.
- Ölçülebilir gün yoksa günlük getiri tire gösterir, sıfır değil.
- Değerler Portföyüm ve Kapananlar ekranlarındaki karşılıklarıyla tutarlıdır.
- Panel'deki kutu sayısı artmaz; kendi ekranında zaten görünen sayılar yerini
  bunlara bırakır.
