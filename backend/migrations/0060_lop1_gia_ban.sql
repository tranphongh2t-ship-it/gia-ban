-- 0060: Sửa Lớp 1 theo bảng giá PREMIER/PREMIUM (PDF 01.07.2026).
-- Chỉ nẹp (CHI_NEP): 10% chung / 20% (≥1 thùng = 5 cuộn) / 23% (≥10 thùng = 50 cuộn) / 26% (≥100 thùng = 500 cuộn).
-- Keo hạt (KEO_HAT): PREMIER 5% (≥1 bao) / 10% (≥10 bao).
-- Melamine Plywood (MELAMINE_PLYWOOD): 7% / 9% (≥50 tấm) / 11% (≥500 tấm).

UPDATE policy_rules SET nguong_kien = 5, pct_le = 0.10, pct_kien = 0.20, nguong_tier2 = 50, pct_tier2 = 0.23
WHERE nhom_sp = 'CHI_NEP' AND doi_tuong = 'PREMIER';

UPDATE policy_rules SET nguong_kien = 1, pct_le = 0.05, pct_kien = 0.10, nguong_tier2 = 10, pct_tier2 = 0.10
WHERE nhom_sp = 'KEO_HAT' AND doi_tuong = 'PREMIER';

UPDATE policy_rules SET nguong_kien = 50, pct_le = 0.07, pct_kien = 0.09, nguong_tier2 = 500, pct_tier2 = 0.11
WHERE nhom_sp = 'MELAMINE_PLYWOOD' AND doi_tuong = 'PREMIER';
