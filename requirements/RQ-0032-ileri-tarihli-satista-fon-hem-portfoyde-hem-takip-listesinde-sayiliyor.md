---
id: RQ-0032
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-04T09:42:18.594Z"
branch: "factory/RQ-0032"
createdFromCommit: "0251e752c4dc5c577c16e72c3bfec0d76a6da910"
completedRunId: "20260904094313-RQ-0032"
completedBy: "human"
completedAt: "2026-09-04T09:46:46.355Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/64"
githubPullRequestIid: 64
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/63"
githubIssueIid: 63
repositoryProvider: github
---
# RQ-0032 - İleri tarihli satışta fon hem portföyde hem takip listesinde sayılıyor

Panel'deki "En çok kazandıran pozisyonlarım" grafiğinde DFI iki kez çıkıyor:
bir kez gerçek pozisyon olarak (+%48,11, 115 gün), bir kez takip listesi
bacağı olarak (+%6,98, 5 gün).

Grafik doğru çiziyor; hata kaynağında. `analytics.position_return` iki tür
bacak taşır: gerçek pozisyonlar ve takip listesindeki fonlar için "o gün almış
gibi" simüle edilmiş bacaklar. İkisinin çakışmaması `analytics.watchlist_visible`
görevidir — açık pozisyonu olan fonu listeden düşürmesi gerekir.

Düşüremiyor, çünkü açıklığı `sell_date IS NULL` diye ölçüyor. Oysa
`analytics.position_leg` RQ-0024'te ileri tarihli satışı da açık saymaya
başladı: `sell_date IS NULL OR sell_date > current_date`. İki tanım ayrıştı.

DFI'nın beş lotunun satış tarihi 7 Eylül — bugünden ileri, yani pozisyon hâlâ
açık. `watchlist_visible` bunu "artık elimde yok" sayıp takip bacağını da
ekliyor. Ölçülen veride DFI'nın altı açık bacağı var: beşi gerçek, biri simüle.

Hata ancak ileri tarihli satış varken ortaya çıkıyor; bu yüzden RQ-0024'ten
beri sessizce duruyordu.

Etkisi üç yerde: bu grafik, Takip Listem ekranı ve Panel'deki takip sayısı.
Üçü de aynı view'a bakıyor.

## Acceptance Criteria

- Açık pozisyonu olan fon takip listesi görünümünde yer almaz; ileri tarihli
  satışı olan pozisyon da açık sayılır.
- Aynı fon "En çok kazandıran/kaybettiren pozisyonlarım" grafiğinde iki kez
  görünmez.
- Tamamen satılmış fon takip listesinde görünmeye devam eder: listeden çıkmak
  kullanıcının kararıdır, portföy geçmişinin yan etkisi değil.
- Satış tarihi bugün olan pozisyon kapanmış sayılır ve fon takip listesine
  geri döner.
- Açıklık kuralı `analytics.position_leg` ile aynı ifadeyi kullanır; iki yerde
  iki ayrı tanım kalmaz.
- Panel'deki takip listesi sayısı ile Takip Listem ekranındaki satır sayısı
  tutarlıdır.
