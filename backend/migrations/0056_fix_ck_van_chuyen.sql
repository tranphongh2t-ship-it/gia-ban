-- 0056: Sửa Lớp 2 (CK vận chuyển) theo BẢNG TỔNG HỢP OP1.
-- 1. Đảo lại Lớp 3 Tinh về 20%/9% (đã gộp 4% ở 0055 — giờ tính riêng Lớp 2).
-- 2. Xưởng (PREMIUM) "khác" = 0% (không 1%).
-- 3. ĐL Tỉnh Mel = 4% luôn (nguong_kien = 0 = không cần kiện).

UPDATE policy_revenue_tiers SET pct_98mau = 0.20, pct_khac = 0.09
WHERE vung = 'Tinh' AND hang = 'OP1' AND bac_tu = 0;

UPDATE ck_van_chuyen SET pct_khac = 0 WHERE doi_tuong = 'PREMIUM';
UPDATE ck_van_chuyen SET nguong_kien = 0 WHERE vung = 'Tinh';
-- Dữ liệu thực tế: chỉ khách TỰ LẤY (Tỉnh) được CK vận chuyển Mel; SG/NT/xưởng giao hàng = 0%
UPDATE ck_van_chuyen SET pct_mdf_mel = 0 WHERE vung = 'SaiGon' OR vung = 'NgoaiThanh' OR doi_tuong = 'PREMIUM';
