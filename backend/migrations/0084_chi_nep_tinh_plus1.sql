-- 0084: Dữ kiện mới — Khách Tỉnh mua chỉ nẹp được chiết khấu thêm 1% (mọi bậc), tháng 2026-08.
-- ck_op1 CHI_NEP tháng 08: dl_tinh = mức chung + 1% (lẻ 10→11, 1 thùng 20→21, 10 thùng 23→24, 100 thùng 26→27).
-- Các vùng khác (NT/SG/Xưởng) giữ nguyên.

UPDATE ck_op1 SET dl_tinh = 0.11 WHERE thang = '2026-08' AND nhom_sp = 'CHI_NEP' AND dieu_kien = 'co_don';
UPDATE ck_op1 SET dl_tinh = 0.21 WHERE thang = '2026-08' AND nhom_sp = 'CHI_NEP' AND dieu_kien = '1_thung';
UPDATE ck_op1 SET dl_tinh = 0.24 WHERE thang = '2026-08' AND nhom_sp = 'CHI_NEP' AND dieu_kien = '10_thung';
UPDATE ck_op1 SET dl_tinh = 0.27 WHERE thang = '2026-08' AND nhom_sp = 'CHI_NEP' AND dieu_kien = '100_thung';
