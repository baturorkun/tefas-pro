-- Kişi başına düşen pay adedi: dolaşımdaki pay / yatırımcı sayısı.
--
-- Bu oranın düşmesi, çıkanların kalanlardan büyük olduğu anlamına gelir.
--
-- Neden pay adedi, para değil: para (büyüklük/yatırımcı) fiyattan kirleniyor,
-- fon değer kaybedince kimse çıkmasa bile düşüyor. Ölçüldü, 11 Eylül:
--
--     fon   5g getiri   kisi basi PARA   kisi basi PAY
--     PBR     -%47,7          -%27,6          +%22,1
--     GPG      -%4,2           -%4,9           -%0,0
--     TLY      +%3,9           +%0,5           -%2,7
--
-- PBR'de para ölçütü "büyükler kaçıyor" derken pay ölçütü tersini söylüyor;
-- GPG'nin düşüşü tamamen fiyattan. TLY'de ise para ölçütü hiçbir şey
-- görmüyor ama gerçek çıkış var ve fiyat kazancının altında gizlenmiş.
--
-- İki şartlı, çünkü tek başına düşen oran seyrelme de olabilir: çok sayıda
-- küçük yatırımcı girerse kişi başı pay düşer ama kimse kaçmıyordur.
ALTER TABLE alarm_rule DROP CONSTRAINT alarm_rule_kind_check;
ALTER TABLE alarm_rule ADD CONSTRAINT alarm_rule_kind_check CHECK (kind IN (
  'ardisik_eksi', 'birikimli_getiri', 'gruba_gore', 'zirveden_dusus',
  'yatirimci_azalma', 'net_cikis', 'balina_cikis', 'veri_yok',
  'kisi_basi_dusus'));

-- İkinci eşik artık iki ölçütte kullanılıyor.
ALTER TABLE alarm_rule DROP CONSTRAINT alarm_rule_threshold2_check;
ALTER TABLE alarm_rule ADD CONSTRAINT alarm_rule_threshold2_check CHECK (
  (kind IN ('balina_cikis', 'kisi_basi_dusus')) = (threshold2 IS NOT NULL));

-- threshold  = kişi başı pay düşüş eşiği (yüzde)
-- threshold2 = yatırımcı sayısı artışının üst sınırı; altında olmalı.
--              %1 tolerans: yatırımcı sayısı sabit kalan gerçek çıkışlar
--              elenmesin. IAE'de pay/kişi %4,1 düşerken yatırımcı %0,2
--              artmış ve bu bir seyrelme değil.
INSERT INTO alarm_rule (kind, family, label, window_days, threshold, threshold2, points, sort) VALUES
--
-- Eşik %3: ölçüldü, 11 Eylül'de 72 fon üzerinde
--
--     esik   uyan   kirmizi/turuncu/sari
--     -%1,5    14          2 / 7 / 11
--     -%3       7          2 / 7 /  4
--     -%5       5          2 / 7 /  2
--
-- %1,5 sarıyı 4'ten 11'e çıkarıyor ve "alarm nadir olmalı" ilkesini bozuyor;
-- %5 gerçek vakaları da eliyor. %3'te kural yeni bilgi ekliyor ama yeni
-- gürültü eklemiyor.
  ('kisi_basi_dusus', 'akis', 'Kişi başına düşen pay adedi düştü', 5, -3, 1, 20, 15);

-- balina_cikis emekli: ölçüt ve satır duruyor, kural pasif. Kayıtlı alarm
-- gerekçeleri bu satıra bağlı olduğu için silinmiyor; karar geri alınmak
-- istenirse ekrandaki anahtar yeter.
--
-- Ölçüldü: eşik %1,5 iken yeni kural balina'nın yakaladığı IAE'yi de
-- yakalıyor ve balina'nın tek başına yakaladığı fon kalmıyor.
UPDATE alarm_rule SET is_active = false, updated_at = now() WHERE kind = 'balina_cikis';
