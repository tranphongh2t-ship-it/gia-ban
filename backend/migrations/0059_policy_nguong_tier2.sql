-- 0059: Thêm ngưỡng tier2 cho Lớp 1 (chiết khấu 3 bậc theo số lượng).
ALTER TABLE policy_rules ADD COLUMN nguong_tier2 REAL;
