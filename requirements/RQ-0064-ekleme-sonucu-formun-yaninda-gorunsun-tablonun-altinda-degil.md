---
id: RQ-0064
status: completed
executionMode: handoff
pipelineFast: false
createdByName: "Batur Orkun"
createdByEmail: "batur@bc.int"
createdAt: "2026-09-12T11:49:51.297Z"
branch: "factory/RQ-0064"
createdFromCommit: "562fb520d0d3ffcec8bf25dfa1fbf14371d2b9d7"
completedRunId: "20260912115453-RQ-0064"
completedBy: "human"
completedAt: "2026-09-12T12:02:28.283Z"
githubPullRequestUrl: "https://github.com/baturorkun/tefas-pro/pull/129"
githubPullRequestIid: 129
githubIssueUrl: "https://github.com/baturorkun/tefas-pro/issues/128"
githubIssueIid: 128
repositoryProvider: github
---
# RQ-0064 - Ekleme sonucu formun yanında görünsün, tablonun altında değil

Sistem Fonları ekranında fon eklerken sonuç tablonun **altında** yazıyor.
Liste 19 satır; mesaj ekranın dışında kalıyor ve kullanıcı tıklamasının
işleyip işlemediğini göremiyor.

## Ölçüm

Panel gövdesinin sırası şöyleydi:

    settings-add   (fon kodu, not, Ekle)
    table          (19 satır)
    status         ← sonuç burada

Ekleme alanı tablonun üstünde, sonucu ise tablonun altında. İkisi arasında
bir ekran boyu mesafe var.

Aynı desen Bankalar ekranında da var: `bankPanel` de `status`'ü tablodan
sonra koyuyor.

İkinci sorun renk: bütün mesajlar `.status` ile soluk gri yazılıyor.
"Fon kodu boş olamaz." ile "Ekleniyor…" aynı görünüyor, hata fark edilmiyor.

Üçüncüsü: ekleme başarılı olunca `reload()` paneli baştan kuruyor ve durum
satırını da götürüyor. Ekranda hiçbir onay kalmıyor; liste alfabetik ve yeni
satırın nereye düştüğü gözle bulunmuyor.

## Kural

Sonuç, sonucu doğuran eylemin yanında durur. Durum satırı ekleme alanının
hemen altında, kendi satırında; boşken hiç yer kaplamaz.

Renk türden gelir: hata kırmızı, uyarı sarı, ilerleme soluk.

`reload()` sonrası gösterilmesi gereken mesaj modül düzeyinde bekler ve yeni
durum satırı onu bir kez okuyup siler.

## Acceptance Criteria

- Sistem Fonları ve Bankalar panellerinde durum satırı ekleme alanının hemen
  altında; tablodan sonra durum düğümü yok.
- Boş durumda satır yer kaplamıyor.
- Hata kırmızı, uyarı sarı görünüyor.
- Başarılı ekleme ve çıkarma sonrası, yeniden çizimin ardından onay mesajı
  görünüyor.
- Mesaj bir kez gösterilip siliniyor; sonraki ekran değişiminde tekrar
  çıkmıyor.

## Kapsam dışı

- Kendiliğinden kaybolan bildirim (toast) altyapısı.
- Diğer ekranların durum satırları.
