-- Insert the Phủ 1 mặt giảm trừ row if missing
INSERT OR IGNORE INTO bang_gia_chuan_melamine_nhua_osb_ghep (stt, loai_cot, do_day, gia_sang_trung, gia_toi_don_sac, gia_chum_104_106, giam_tru_sang_trung, giam_tru_toi_don_sac, giam_tru_chum_104_106)
VALUES (99, 'Phủ 1 mặt giảm trừ', '', NULL, NULL, NULL, 220000, 320000, 370000);

-- Update it with correct values in case it already existed with wrong values
UPDATE bang_gia_chuan_melamine_nhua_osb_ghep
SET
  giam_tru_sang_trung = 220000,
  giam_tru_toi_don_sac = 320000,
  giam_tru_chum_104_106 = 370000
WHERE loai_cot = 'Phủ 1 mặt giảm trừ'
  AND stt = 99;
