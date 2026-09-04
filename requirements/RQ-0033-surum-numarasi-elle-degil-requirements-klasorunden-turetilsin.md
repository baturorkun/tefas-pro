---
id: RQ-0033
status: ready
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-04T11:40:00.699Z"
branch: "factory/RQ-0033"
createdFromCommit: "7476bcb18e4c0d206baf6de848fb61aec22ac863"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/66"
githubPullRequestIid: 66
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/65"
githubIssueIid: 65
repositoryProvider: github
---
# RQ-0033 - Sürüm numarası elle değil requirements klasöründen türetilsin

Sürüm rozeti `v0.18.1` gösteriyor, oysa proje RQ-0032'de. Ortadaki sayı
`src/version.ts` içinde elle tutulan bir sabitten geliyor:

    export const CURRENT_REQUIREMENT = 'RQ-0018';

RQ-0018'de yazılmış ve on dört requirement boyunca güncellenmemiş. Aynı dosyada
commit ve derleme zamanı da var ve onlar hiç bozulmadı — çünkü onları kimse
yazmıyor, ortam veriyor. Fark tasarımda: her seferinde hatırlanmayı gerektiren
alan er geç unutuluyor.

Aynı desen netforgesh projesinde de var ve orada da tek bir commit'te yazılıp
bir daha değişmemiş; doğru görünmesinin sebebi o projenin en son
requirement'ının zaten sürüm rozetini getiren RQ olması. Yani orada da bozuk,
yalnız henüz görünmüyor.

## Bilgi zaten repoda

`requirements/` klasörü en yüksek numarayı biliyor. İkinci bir kopya tutmak
yerine o okunmalı.

Tek engel: production imajında `requirements/` yok. `server/Containerfile`
yalnız `dist`, `public` ve `db/migrations` kopyalıyor, dolayısıyla çalışan
uygulama klasörü göremiyor.

Çözüm build sırasında üretilen bir dosya. `pnpm build` klasörü tarar, en yüksek
numarayı bulur ve `dist` içine yazar; `dist` zaten imaja kopyalanıyor.
Containerfile'ın yalnız build aşamasına `requirements` eklenir — o aşama
atılıyor, imaja girmiyor. Deploy akışı değişmez.

Elle yazılan bir `.version` dosyası çözüm değil: aynı unutma, farklı dosya.
Dosyayı kod üretmeli.

## Üçüncü hane

Sürümün son hanesi requirement'ın kaçıncı koşusu olduğunu gösteriyordu ve otuz
iki requirement'ın otuz birinde `1` çıktı; yalnız RQ-0008'de üç koşu oldu. Otuz
bir sürümdür aynı rakamı yazan bir hane bilgi taşımıyor, kaldırılıyor.

Ana sürüm 0 sabit kalır; 1.0'a geçmek ayrı bir karardır.

## Acceptance Criteria

- Sürümün requirement numarası `requirements/` klasöründeki en yüksek
  numaradan türetilir; kodda elle tutulan bir requirement sabiti kalmaz.
- Numara build sırasında hesaplanıp derleme çıktısına yazılır; çalışan uygulama
  onu okur.
- Container imajı `requirements/` klasörünü taşımaz.
- Local geliştirmede, container'da ve deploy'da aynı numara görünür.
- Commit ve derleme zamanı eskisi gibi çalışmaya devam eder.
- Sürümde koşu hanesi yer almaz.
- Klasör okunamazsa uygulama sürümsüz değil, yalnız ana sürümle çalışmaya
  devam eder; sürüm gösterilememesi ekranı bozmaz.
- Deploy iş akışı değişmeden çalışır.
