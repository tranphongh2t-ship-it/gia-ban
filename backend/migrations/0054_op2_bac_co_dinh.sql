-- 0054: Gán bậc OP2 cố định theo từng khách (từ reverse-engineering).
-- OP2 bậc được cập nhật hàng tháng, KHÔNG lũy tiến trong tháng.
-- Dùng cột ck_ds_98mau_pct / ck_ds_khac_pct (mức CK riêng) để engine dùng đúng rate.

-- Bậc 400tr (26%/15%)
UPDATE danh_sach_khach SET ck_ds_98mau_pct = 0.26, ck_ds_khac_pct = 0.15
WHERE ma_kh IN ('ACUNG','AKHANHBH','CH55BH','CHOAPVH','CHTUNGPHAT','CHUTOAN','GIATHINH','KHAIVINH','LEBAO','QUANGMINH','TAMSON');

-- Bậc 1 tỷ (27%/16%)
UPDATE danh_sach_khach SET ck_ds_98mau_pct = 0.27, ck_ds_khac_pct = 0.16
WHERE ma_kh IN ('CNHUNG','GGTUNGUYEN','PHUCKHANG','PHUCTHAITONG','PHUPHUGIA','THIENNHANCM');

-- Bậc 2 tỷ (28%/17%)
UPDATE danh_sach_khach SET ck_ds_98mau_pct = 0.28, ck_ds_khac_pct = 0.17
WHERE ma_kh IN ('NGOCTHOMGL','QUOCTUANDL');

-- Bậc 5 tỷ (29%/18%)
UPDATE danh_sach_khach SET ck_ds_98mau_pct = 0.29, ck_ds_khac_pct = 0.18
WHERE ma_kh IN ('TOANPHAT');
