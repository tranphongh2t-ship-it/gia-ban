-- 0062: Chỉ nẹp — 1 thùng = 8 cuộn (xác nhận từ người dùng).
-- Thêm bậc tier3 (26% / 100 thùng) và sửa ngưỡng: 1 thùng=8, 10 thùng=80, 100 thùng=800.
ALTER TABLE policy_rules ADD COLUMN nguong_tier3 REAL;
ALTER TABLE policy_rules ADD COLUMN pct_tier3 REAL;

UPDATE policy_rules SET nguong_kien = 8, pct_le = 0.10, pct_kien = 0.20,
  nguong_tier2 = 80, pct_tier2 = 0.23, nguong_tier3 = 800, pct_tier3 = 0.26
WHERE nhom_sp = 'CHI_NEP' AND doi_tuong = 'PREMIER';
