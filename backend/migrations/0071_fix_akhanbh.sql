-- 0071: Sửa mã KH gõ sai trong seed 0070 (AKHANBH -> AKHANHBH).
DELETE FROM op2_bac_thang WHERE ma_kh = 'AKHANBH' AND thang = '2026-08';

INSERT OR REPLACE INTO op2_bac_thang (ma_kh, thang, pct_98mau, pct_khac) VALUES
  ('AKHANHBH', '2026-08', 0.26, 0.15);