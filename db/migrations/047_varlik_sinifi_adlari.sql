-- Varlık sınıfı adlandırması tek biçime getiriliyor.
--
-- Dağılım ekranı sınıfları FONLAR ARASINDA topluyor: aynı varlık sınıfı iki
-- farklı adla yazılırsa ekranda iki ayrı dilim olur. Fintables'ın adlandırması
-- ile KAP'ınki örtüşmüyor — "Yatırım Fonları Katılma Payları" ve "Yatırım
-- Fonu", "Mevduat (TL)" ve "Mevduat" gibi. Kaynak KAP'a geçtiğine göre
-- adlandırma da onunkine uyar; geçmiş satırlar dönüştürülür.
--
-- Bazı eşlemeler KAYIPLI ve bu bilinçli: KAP mevduatı TL/döviz diye
-- ayırmıyor, repo ile ters-repoyu tek kalemde topluyor. Eski ayrım korunsaydı
-- yeni veriyle yan yana gelince yine iki ayrı dilim oluşurdu.
--
-- Birleşen etiketler aynı (fon, tarih) için iki satıra düşebilir; ağırlıklar
-- toplanır, yoksa birincil anahtar çakışır.

BEGIN;

CREATE TEMP TABLE varlik_sinifi_esleme (eski text PRIMARY KEY, yeni text NOT NULL)
  ON COMMIT DROP;

INSERT INTO varlik_sinifi_esleme (eski, yeni) VALUES
  ('Yatırım Fonları Katılma Payları',   'Yatırım Fonu'),
  ('Girişim S. YF Kat. Payları',        'Yatırım Fonu'),
  ('Gayrimenkul YF Kat. Payları',       'Yatırım Fonu'),
  ('BYF Katılma Payları',               'Borsa Yatırım Fonu'),
  ('Yabancı BYF',                       'Yabancı Borsa Yatırım Fonu'),
  ('Vadeli İşlemler Nakit Teminatları', 'Vadeli İşlem Teminatı'),
  ('Mevduat (TL)',                      'Mevduat'),
  ('Mevduat (Döviz)',                   'Mevduat'),
  ('Katılma Hesabı (TL)',               'Katılım Hesabı'),
  ('Katılma Hesabı (Döviz)',            'Katılım Hesabı'),
  ('Repo',                              'Ters-Repo'),
  ('Borsa İstanbul Para Piyasası',      'Takasbank Para Piyasası'),
  ('Özel Sektör Kira Sert.',            'Kira Sertifikaları'),
  ('Kamu Kira Sert. (TL)',              'Kira Sertifikaları'),
  ('Kamu Kira Sert. (Döviz)',           'Kira Sertifikaları'),
  ('Varlığa Dayalı Menkul Kıy.',        'Varlığa Dayalı Menkul Kıymet'),
  ('Döviz Kamu İç Borç. Araç.',         'Borçlanma Aracı'),
  ('Özel Sektör Dış Borç. Araç.',       'Borçlanma Aracı'),
  ('Kamu Dış Borç. Araç.',              'Borçlanma Aracı');

-- Dönüştürülecek satırlar yeni adla toplanır, eskiler silinir, toplam yazılır.
CREATE TEMP TABLE yeni_satirlar ON COMMIT DROP AS
SELECT a.fund_code,
       a.as_of_date,
       e.yeni                        AS asset_class,
       sum(a.weight_pct)             AS weight_pct,
       max(a.ingest_run_id)          AS ingest_run_id
  FROM fact_fund_allocation a
  JOIN varlik_sinifi_esleme e ON e.eski = a.asset_class
 GROUP BY a.fund_code, a.as_of_date, e.yeni;

DELETE FROM fact_fund_allocation a
 USING varlik_sinifi_esleme e
 WHERE e.eski = a.asset_class;

-- Hedef ad o fon/tarih için zaten varsa ağırlıklar birleştirilir.
INSERT INTO fact_fund_allocation
       (fund_code, as_of_date, asset_class, weight_pct, ingest_run_id)
SELECT fund_code, as_of_date, asset_class, weight_pct, ingest_run_id
  FROM yeni_satirlar
    ON CONFLICT (fund_code, as_of_date, asset_class) DO UPDATE
   SET weight_pct = fact_fund_allocation.weight_pct + EXCLUDED.weight_pct,
       updated_at = now();

COMMIT;
