-- 0085: Bỏ mức riêng CHI_NEP|1_thung=24% của CNHUNG (khách Tỉnh).
-- Mức 24% thực chất là bậc "PVC ≥10 thùng/màu" 23% + 1% khách Tỉnh (dữ kiện mới 0084) — nhập tay nhầm bậc.
-- Engine giờ tự xếp bậc theo số thùng mua thật: 1 thùng→21%, 10 thùng→24%, 100 thùng→27%.
-- Giữ nguyên mức riêng DURABO|kien=0.

UPDATE danh_sach_khach SET ck_ct_pct = '{"DURABO|kien":0}' WHERE ma_kh = 'CNHUNG';
