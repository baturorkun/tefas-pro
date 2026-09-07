-- Sistem düzeyinde toplanacak fonlar.
--
-- Toplama kapsamı bugüne kadar tamamen kullanıcılara bağlıydı:
-- analytics.tracked_fund, user_watchlist ile açık pozisyonların birleşimi.
-- Bir fonun verisini toplamak isteyip kimsenin takip listesinde göstermemenin
-- yolu yoktu.
--
-- Akla gelen ilk çözüm fonları admin hesabının listesine koymaktı; reddedildi.
-- Admin bir ROL, kimlik değil: herhangi bir kullanıcı admin olabilir, rolünü
-- bırakabilir, hesabı silinebilir. user_watchlist satırları ON DELETE CASCADE
-- ile hesaba bağlı, yani toplama kapsamı bir hesabın ömrüne bağlanmış olurdu.
CREATE TABLE system_fund (
  fund_code text PRIMARY KEY REFERENCES dim_fund(fund_code),
  note      text,
  -- Yalnız iz: "kim eklemiş". Sahiplik DEĞİL, o yüzden SET NULL — hesap
  -- silinince kayıt durmalı ve toplama sürmeli. user_watchlist'teki CASCADE
  -- ile arasındaki fark tam burası.
  added_by  integer REFERENCES app_user(id) ON DELETE SET NULL,
  added_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE system_fund IS
  'Kullanıcıdan bağımsız toplama listesi. Hiçbir kullanıcının takip '
  'listesinde görünmez; yalnız veri toplanır ve Piyasa ekranına girer.';
COMMENT ON COLUMN system_fund.added_by IS
  'Ekleyen kullanıcı; yalnız iz. Hesap silinince NULL olur, kayıt durur.';

-- tracked_fund'a beşinci dal. Collector ve Piyasa kapsamı bu view'dan
-- okuduğu için ikisinde de değişiklik gerekmiyor.
CREATE OR REPLACE VIEW analytics.tracked_fund AS
  SELECT fund_code FROM user_watchlist
  UNION
  SELECT fund_code FROM portfolio_transaction WHERE sell_date IS NULL
  UNION
  SELECT s.value #>> '{}' AS fund_code
    FROM app_setting s
   WHERE s.key = 'benchmark'
     AND EXISTS (SELECT 1 FROM dim_fund f WHERE f.fund_code = s.value #>> '{}')
  UNION
  SELECT u.value #>> '{}' AS fund_code
    FROM user_setting u
   WHERE u.key = 'benchmark'
     AND EXISTS (SELECT 1 FROM dim_fund f WHERE f.fund_code = u.value #>> '{}')
  UNION
  SELECT fund_code FROM system_fund;
