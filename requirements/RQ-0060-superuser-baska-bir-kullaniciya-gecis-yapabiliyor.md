---
id: RQ-0060
status: draft
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-10T11:05:34.259Z"
branch: "factory/RQ-0060"
createdFromCommit: "3b43ca9188d85daa5ec5d7c9b7fbceef7cded6cf"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/120"
githubPullRequestIid: 120
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/119"
githubIssueIid: 119
repositoryProvider: github
---
# RQ-0060 - Superuser başka bir kullanıcıya geçiş yapabiliyor

Bir kullanıcının bildirdiği sorunu görmenin tek yolu şu an onun parolasını
öğrenmek. Superuser, kullanıcı listesinden birini seçip o kullanıcı olarak
girmiş gibi uygulamayı görebilmeli.

## Bugünkü model

`app_user.type` iki değer alıyor: `admin` ve `user`. Superuser üçüncü bir
seviye — admin'in kullanıcı yönetebilmesi ayrı bir şey, başkasının verisini
görebilmesi ayrı bir şey ve ikisi aynı yetkide toplanmamalı.

Oturum `app_session` satırında tek bir `user_id` taşıyor. Geçiş bu satırın
üzerine kurulacak: kimin adına bakıldığı ile kimin baktığı ayrı ayrı
durmalı, çünkü geri dönüşün ve denetimin dayanağı budur.

## Kullanıcının gördüğü

Sol altta kullanıcı adı ve rolü yazan kutu var. Geçiş yapıldığında o kutu
durumu açıkça söylemeli: bakılan kullanıcının adı, yanında bunun bir geçiş
olduğunu belirten işaret ve bir **X**. X'e basınca oturum asıl superuser'a
dönüyor.

Gizli olmamalı. Superuser hangi kullanıcının verisine baktığını her ekranda
görmeli, yoksa yanlış hesapta işlem yapması an meselesi.

## Acceptance Criteria

- `app_user.type` üçüncü bir değer alıyor ve superuser ayrı bir seviye.
- Superuser kullanıcı listesini açıp bir kullanıcıya geçiş yapabiliyor.
- Geçiş sonrası uygulama o kullanıcıyla girilmiş gibi davranıyor: portföy,
  takip listesi, işlemler hep o kullanıcının.
- Sol alttaki kutu geçiş hâlini gösteriyor ve X ile asıl superuser'a dönüyor.
- Superuser olmayan hiçbir kullanıcı geçiş uçlarını çağıramıyor; sunucu
  reddediyor.
- Geçiş sırasında asıl superuser kimliği oturumda korunuyor.

## Kapsam dışı

- Kullanıcının parolasını görmek veya değiştirmek.
- Geçiş sırasında yapılan işlemlerin denetim kaydı. Ayrı bir iş.
