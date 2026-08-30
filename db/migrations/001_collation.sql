-- Türkçe fon unvanları için ICU collation. dim_fund.title bunu kullanır;
-- olmadan ORDER BY title İ/I, Ş, Ğ gibi harflerde yanlış sıralar.
CREATE COLLATION IF NOT EXISTS tr_tr (provider = icu, locale = 'tr-TR');
