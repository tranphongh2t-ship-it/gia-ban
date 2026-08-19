-- 0064: Ván trơn — ngưỡng "kiện" (15%) là 65 tấm (1 kiện/chẵn xe), không phải 1.
-- Dữ liệu thực tế hầu như không có bậc 15% (kiện) → giữ 10% lẻ cho đa số dòng.
UPDATE policy_rules SET nguong_kien = 65
WHERE nhom_sp IN ('VAN_DAM_OKAL', 'MDF_HDF', 'OSB', 'MEL_NHUA_OSB_GO_GHEP') AND doi_tuong = 'PREMIER';
