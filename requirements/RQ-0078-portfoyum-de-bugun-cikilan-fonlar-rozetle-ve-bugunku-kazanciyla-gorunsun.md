---
id: RQ-0078
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-16T09:49:50.589Z"
branch: "factory/RQ-0078"
createdFromCommit: "2e87b8f85bb41440379213ed31c3ce27e4400dbb"
completedRunId: "20260916095504-RQ-0078"
completedBy: "human"
completedAt: "2026-09-16T10:41:31.805Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/157"
githubPullRequestIid: 157
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/156"
githubIssueIid: 156
repositoryProvider: github
---
# RQ-0078 - Portföyüm'de bugün çıkılan fonlar rozetle ve bugünkü kazancıyla görünsün

Bugün satılan fon Portföyüm'den tamamen kayboluyor. `position_return` yalnız
açık pozisyonları (`sell_date > current_date`) döndürdüğü için doğru — kapanan
pozisyon açık değil. Ama kullanıcı bugün çıktığı fonun O GÜN ne kazandırdığını
hiçbir yerde göremiyor: ne Portföyüm'de (kapandı), ne Kapananlar'da (orada
tüm-zamanlı realize kâr var, bugünkü hareket değil).

Bu bilgi hesaba zaten katılıyor — bugünkü kazanç, satılan pozisyonların o
günkü getirisini içeriyor (portfolio_daily'de outflow bugünkü fiyattan) — ama
görünmüyor. Kullanıcı "bugün 9.686 kaybettim" diyor, içindeki hangi fonun ne
kattığını ayıramıyor.

Çözüm: bugün satılan fonları Portföyüm tablosunda AYRI, rozetli satırlar
olarak göster. Açık pozisyon toplamlarına karışmasın; yalnız görünür olsun.

## Acceptance Criteria

- Bugün (`sell_date = current_date`) satılan her fon Portföyüm tablosunda
  "bugün çıkış" rozetli bir satır olarak görünür.
- Satır fonun bugünkü getiri yüzdesini, satılan pay adedini, çıkış değerini
  (bugünkü fiyattan) ve o çıkışın bugünkü kazancını gösterir.
- Bu satırlar TOPLAM satırına ve açık pozisyon maliyet/değer toplamlarına
  KATILMAZ — açık pozisyon değiller.
- Fonun bugün fiyatı yoksa çıkış değeri ve bugünkü kazanç boş gösterilir;
  uydurma sıfır yazılmaz.
- Aynı fon bugün hem satılıp hem hâlâ açık pozisyon taşıyorsa (kısmi satış),
  ikisi de görünür: açık satır ile bugün-çıkış satırı ayrı.

## Kapsam dışı

- Dünkü ve daha eski çıkışlar: yalnız bugün. Kapananlar ekranı geçmişi
  gösteriyor.
- Bugünkü kazancın hesaplanma biçimi: zaten doğru (portfolio_daily), bu RQ
  sadece görünürlük.
