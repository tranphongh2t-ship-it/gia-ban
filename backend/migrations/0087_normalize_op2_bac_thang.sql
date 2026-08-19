-- 0087: Chuẩn hóa op2_bac_thang — dữ liệu lẫn 2 dạng: 26 (đơn vị %) và 0.26 (REAL).
-- Engine đọc REAL (0..1); dòng dạng "26" gây CK tính 2600%. Đưa toàn bộ về REAL.

UPDATE op2_bac_thang SET pct_98mau = pct_98mau / 100.0 WHERE pct_98mau > 1;
UPDATE op2_bac_thang SET pct_khac  = pct_khac  / 100.0 WHERE pct_khac  > 1;
