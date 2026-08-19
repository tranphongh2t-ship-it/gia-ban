-- 0076: Chỉ nẹp (CHI_NEP) — ngưỡng chuyển sang THÙNG theo khổ (xác nhận 08/2026).
-- Khổ 21 = 10 cuộn/thùng, khổ 43 = 5 cuộn/thùng.
-- 1_thung: dòng tự đạt ≥1 thùng; 10_thung: tổng thùng cả đơn ≥10; 100_thung: ≥100.
-- Các cột nguong chỉ để hiển thị/đối chiếu — engine tính bậc theo thùng trong code.
UPDATE ck_op1 SET nguong = 1 WHERE nhom_sp = 'CHI_NEP' AND dieu_kien = '1_thung';
UPDATE ck_op1 SET nguong = 10 WHERE nhom_sp = 'CHI_NEP' AND dieu_kien = '10_thung';
UPDATE ck_op1 SET nguong = 100 WHERE nhom_sp = 'CHI_NEP' AND dieu_kien = '100_thung';

UPDATE policy_rules SET nguong_kien = 1, nguong_tier2 = 10, nguong_tier3 = 100
WHERE nhom_sp = 'CHI_NEP';