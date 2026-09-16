---
id: RQ-0077
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-16T08:58:58.339Z"
branch: "factory/RQ-0077"
createdFromCommit: "23b610186e12e0dd8ab60d09a1b1957ab2f26f0e"
completedRunId: "20260916090654-RQ-0077"
completedBy: "human"
completedAt: "2026-09-16T09:25:15.341Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/155"
githubPullRequestIid: 155
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/154"
githubIssueIid: 154
repositoryProvider: github
---
# RQ-0077 - Yeni fon eklenince fiyatlar en eski alış tarihinden geriye çekilsin

Üretimde yaşandı. Kullanıcı 16 Eylül'de PSE ve BPZ'yi takip listesine ekledi;
alışları 15 Eylül tarihliydi. Tek fon toplaması yalnız o günün (16 Eylül)
fiyatını yazdı. Portföy günlüğü, elde tutulan tek bir fonun bile fiyatı eksik
olan günü tamamen atıyor: 15 Eylül satırı oluşmadı, 16 Eylül'ün kazancı 14
Eylül'e göre hesaplandı ve 15 Eylül'de giren 1,42 milyonluk alış parası
"giriş" olarak düşülemediği için kazanç sanıldı. Panel günlük getiriyi
+1,41 milyon TL, %53 gösterdi.

RQ-0076 tek fon yolunu toplu uca taşıdı ve sabit 8 günlük pencere getirdi;
bu vaka onunla kapanırdı. Ama 8 gün keyfî: 9 gün önceye tarihli bir alış
aynı hatayı üretir. Doğru pencere, o fondaki EN ESKİ alış tarihinden bugüne.

İkinci kusur: sunucu, fonun herhangi bir verisi varsa toplamayı atlıyor
(`fundHasData`). Fonun tek bir günü olsa bile "verisi var" sayılıyor; eksik
günler hiç dolmuyor. Ölçüt "verisi var mı" değil "en eski alışı kapsıyor mu"
olmalı.

## Acceptance Criteria

- Tek fon toplaması penceresini, o fondaki en eski `portfolio_transaction`
  alış tarihinden başlatır; alış yoksa 8 güne düşer.
- Pencere, kaynağın tek istekte kabul ettiği azami aralığı aşıyorsa istek
  parçalanır; hiçbir parça sınırı aşmaz.
- Sunucu, fonun en eski alış tarihini kapsayan fiyatı varsa toplamayı atlar;
  yalnız "herhangi bir satır var" diye atlamaz.
- Alışı kapsayan gün eksikken fon eklendiğinde, ekleme sonrası o günün
  fiyatı gelir ve portföy günlüğünde o gün oluşur.

## Kapsam dışı

- Portföy günlüğünün "bir fonun bir günü eksikse günü tamamen at" davranışı.
  Kasıtlı: eksik fiyatla yarım değer üretmek yanlış rakam gösterir. Kaynak
  boşluğu kapatıldığında sorun ortadan kalkıyor.
- Zamanlanmış koşumun penceresi (8 gün): her gün koştuğu için boşluk
  oluşturmuyor.
