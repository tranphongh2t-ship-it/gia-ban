-- Fix Phủ 1 mặt giảm trừ values: the original import used 0 defaults
-- because the SQL generator only captured keys from the first row
UPDATE bang_gia_chuan_melamine_nhua_osb_ghep
SET
  giam_tru_sang_trung = 220000,
  giam_tru_toi_don_sac = 320000,
  giam_tru_chum_104_106 = 370000
WHERE loai_cot = 'Phủ 1 mặt giảm trừ'
  AND stt = 99;
