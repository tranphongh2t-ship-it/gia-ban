-- 0047: Cột còn thiếu cho engine chiết khấu 5 lớp trên sổ bán hàng.
-- hinh_thuc_giao: 'lay_tai_kho' (tự lấy hàng) | 'giao_hang' — để tính Lớp 2 (CK vận chuyển)
-- la_khuyen_mai / la_thanh_ly: loại trừ khỏi doanh số tính chiết khấu (đặc tả mục 10)
ALTER TABLE so_chi_tiet_ban_hang ADD COLUMN hinh_thuc_giao TEXT;
ALTER TABLE so_chi_tiet_ban_hang ADD COLUMN la_khuyen_mai INTEGER DEFAULT 0;
ALTER TABLE so_chi_tiet_ban_hang ADD COLUMN la_thanh_ly INTEGER DEFAULT 0;

ALTER TABLE check_gia_goc_ck ADD COLUMN hinh_thuc_giao TEXT;
ALTER TABLE check_gia_goc_ck ADD COLUMN la_khuyen_mai INTEGER DEFAULT 0;
ALTER TABLE check_gia_goc_ck ADD COLUMN la_thanh_ly INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_so_ct_ngay ON so_chi_tiet_ban_hang(ngay);
