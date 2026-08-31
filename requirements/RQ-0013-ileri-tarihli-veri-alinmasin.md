---
id: RQ-0013
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-08-31T20:32:16.152Z"
branch: "factory/RQ-0013"
createdFromCommit: "0fd9289e7fa66aa6821a67efc5399018a1c70b2f"
completedRunId: "20260831203315-RQ-0013"
completedBy: "human"
completedAt: "2026-08-31T20:36:01.984Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/26"
githubPullRequestIid: 26
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/25"
githubIssueIid: 25
repositoryProvider: github
---
# RQ-0013 - İleri tarihli veri alınmasın

Kaynak, yarın geçerli olacak fiyatı bu akşam yayımlıyor. Collector onu olduğu
gibi yazıyor ve veritabanında bugünden ileri tarihli satırlar oluşuyor.

Ölçüldü — 2026-08-31 akşamı, remote:

| trade_date | satır | getiri | nav | akış | yatırımcı |
|---|---:|---:|---:|---:|---:|
| 2026-08-31 | 36 | 36 | 28 | 36 | 36 |
| **2026-09-01** | **23** | **23** | **23** | **0** | **0** |

Ertesi güne ait satır hem eksik hem yarım: 36 fonun 23'ü var, akış ve yatırımcı
sayısı hiç yok.

## Neden zararlı

View'lar "son veri günü"nü `max(trade_date)` ile buluyor. Yarım bir gün en son
gün olunca pencereler kayıyor:

- `fund_returns` çıpası 2026-09-01 (23 fon), `fund_flow` ve `fund_investor`
  çıpası 2026-08-31 (36 fon). Aynı panelde farklı pencereler.
- Getirisi olan 23 fon bir gün fazla ölçülüyor, kalan 13 fon ölçülmüyor.
  Panelde yan yana `5g` ve `4g` görünmesinin sebeplerinden biri bu.
- `position_return` bitiş tarihi olarak aynı çıpayı kullanıyor; bir kısım
  pozisyon bir gün fazla sayılıyor.

Veri yanlış değil, ama eksik bir günü tam gün sayıyor.

## Kural

`trade_date` bugünden büyük olan satır yazılmaz. Bugün **Europe/Istanbul**
takvim günüdür.

Zaman dilimini açıkça yazmak şart: veritabanı `Etc/UTC` çalışıyor, dolayısıyla
`current_date` gece yarısı ile 03:00 arasında bir gün geride kalır ve o saatte
koşan collector meşru veriyi reddederdi. Fon piyasası Türkiye'de; hangi günün
"bugün" olduğunu belirleyen takvim de Türkiye'nin.

Kural tek noktada, `upsertDaily` içinde uygulanır — bütün günlük kaynaklar
(fiyat, getiri, akış, büyüklük) oradan geçer.

## Kapsam

- `upsertDaily` ileri tarihli satırı yazmaz; süzme SQL'de, tek çoklu-satır
  ekleme noktasında.
- Süzmeyi yapan saf yardımcı fonksiyon ve testi.
- Mevcut ileri tarihli satırları silen migration.
- Kaç satırın süzüldüğü koşu çıktısında görünür; sessizce atılmaz.

## Acceptance Criteria

- [ ] `trade_date` Europe/Istanbul bugününden büyük olan satır yazılmaz.
- [ ] Bugüne ait satır yazılır; kural yalnız ileri tarihi keser.
- [ ] Zaman dilimi açıkça Europe/Istanbul'dur; `current_date` kullanılmaz.
- [ ] Mevcut ileri tarihli satırlar migration ile silinir.
- [ ] Süzülen satır sayısı koşu çıktısında raporlanır.
- [ ] `rows_upserted` süzülen satırları saymaz.
- [ ] Mevcut collector davranışı başka biçimde değişmez; ikinci koşu yine sıfır
      satır yazar.
- [ ] Yapılandırılmış quality gate'ler (typecheck, test, build) geçer.

## Kapsam Dışı

- `fact_fund_yield_snapshot` ve `fact_fund_allocation`: `as_of_date` collector
  tarafından bugünle yazılıyor, kaynaktan gelmiyor. İleri tarih üretemezler;
  ölçüldü, sıfır satır.
- Yarının fiyatını ayrı bir alanda saklamak. Kullanıcı istemedi ve bugün
  hiçbir görünüm kullanmıyor.
