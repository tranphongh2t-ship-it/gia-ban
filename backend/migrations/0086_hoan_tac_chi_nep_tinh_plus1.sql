-- 0086: Hoàn tác 0084 — CHI_NEP khách Tỉnh +1% là CHIẾT KHẤU VẬN CHUYỂN (đã có sẵn ở ck_van_chuyen pct_khac=1%,
-- áp khi khách tự lấy), KHÔNG phải +1% CK doanh số. Đưa dl_tinh CHI_NEP tháng 08 về mức chung như NT/SG.

UPDATE ck_op1 SET dl_tinh = 0.1  WHERE thang = '2026-08' AND nhom_sp = 'CHI_NEP' AND dieu_kien = 'co_don';
UPDATE ck_op1 SET dl_tinh = 0.2  WHERE thang = '2026-08' AND nhom_sp = 'CHI_NEP' AND dieu_kien = '1_thung';
UPDATE ck_op1 SET dl_tinh = 0.23 WHERE thang = '2026-08' AND nhom_sp = 'CHI_NEP' AND dieu_kien = '10_thung';
UPDATE ck_op1 SET dl_tinh = 0.26 WHERE thang = '2026-08' AND nhom_sp = 'CHI_NEP' AND dieu_kien = '100_thung';
