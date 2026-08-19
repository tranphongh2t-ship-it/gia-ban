-- 0061: Sửa Lớp 1 PREMIUM theo PDF PREMIUM — lẻ = 0%, kiện mới có CK.
-- Đối chiếu ngược từ dữ liệu: PREMIER lẻ = 10%, PREMIUM lẻ = 0%.

-- Ván trơn PREMIUM: 0% lẻ / 10% kiện (≥65 tấm)
UPDATE policy_rules SET pct_le = 0, nguong_kien = 65, pct_kien = 0.10 WHERE nhom_sp = 'VAN_DAM_OKAL' AND doi_tuong = 'PREMIUM';
UPDATE policy_rules SET pct_le = 0, nguong_kien = 65, pct_kien = 0.10 WHERE nhom_sp = 'MDF_HDF' AND doi_tuong = 'PREMIUM';
-- Ván ép PREMIUM: 0% lẻ / 5% kiện
UPDATE policy_rules SET pct_le = 0, nguong_kien = 65, pct_kien = 0.05 WHERE nhom_sp = 'VAN_EP' AND doi_tuong = 'PREMIUM';
-- OSB PREMIUM: 0% lẻ / 10% kiện
UPDATE policy_rules SET pct_le = 0, nguong_kien = 65, pct_kien = 0.10 WHERE nhom_sp = 'OSB' AND doi_tuong = 'PREMIUM';
-- Durabo PREMIUM: 0% lẻ / 5% kiện
UPDATE policy_rules SET pct_le = 0, nguong_kien = 10, pct_kien = 0.05 WHERE nhom_sp = 'DURABO' AND doi_tuong = 'PREMIUM';
-- Plywood PREMIUM: 0% <50 tấm / 3% ≥50 / 5% ≥500
UPDATE policy_rules SET pct_le = 0, pct_kien = 0.03, nguong_tier2 = 500, pct_tier2 = 0.05 WHERE nhom_sp = 'MELAMINE_PLYWOOD' AND doi_tuong = 'PREMIUM';
-- Chỉ nẹp PREMIUM: 0% tất cả
UPDATE policy_rules SET pct_le = 0, pct_kien = 0, pct_tier2 = 0 WHERE nhom_sp = 'CHI_NEP' AND doi_tuong = 'PREMIUM';
-- Keo hạt PREMIUM: 0% <10 bao / 5% ≥10 bao
UPDATE policy_rules SET pct_le = 0, nguong_kien = 10, pct_kien = 0.05 WHERE nhom_sp = 'KEO_HAT' AND doi_tuong = 'PREMIUM';
