-- 0069: Bổ sung khách đang bán hàng thiếu trong danh_sach_khach + điền CK doanh số theo nhóm
-- B1: Khách có trong so_chi_tiet_ban_hang nhưng chưa có trong danh_sach_khach
--     → thêm mặc định Xưởng thường (PREMIUM/Thuong/XUONG_THUONG) như chính sách.
INSERT INTO danh_sach_khach (ma_kh, ten_kh, doi_tuong, hang, nhom)
SELECT
  s.ma_kh,
  MAX(s.ten_kh),
  'PREMIUM', 'Thuong', 'XUONG_THUONG'
FROM so_chi_tiet_ban_hang s
WHERE s.ma_kh NOT IN (SELECT ma_kh FROM danh_sach_khach)
  AND s.ma_kh IS NOT NULL AND s.ma_kh != ''
GROUP BY s.ma_kh;

-- B2: Điền CK doanh số theo nhóm (chỉ nơi đang NULL) — theo policy_revenue_tiers (Lớp 3):
--   DL_Tinh 20/9, DL_NT 21/10, DL_SG-OP1 23/12, Xưởng thường 20/7, Xưởng premium 20/9.
--   KHÔNG đặt ck_vc_pct: VC là động theo loại hàng (Mel Tinh 4% / hàng khác 1%, PREMIUM 0%) —
--   engine vẫn tự tính từ ck_van_chuyen; chỉ điền mức doanh số để trang hiển thị đủ.
UPDATE danh_sach_khach SET ck_ds_98mau_pct = 0.20, ck_ds_khac_pct = 0.09
WHERE nhom = 'DL_TINH' AND ck_ds_98mau_pct IS NULL;

UPDATE danh_sach_khach SET ck_ds_98mau_pct = 0.21, ck_ds_khac_pct = 0.10
WHERE nhom = 'DL_NGOAI_THANH' AND ck_ds_98mau_pct IS NULL;

-- SG: mọi khách OP1/không hẳn OP2 (không ghi đè khách OP2 đã có giá trị trong 0054)
UPDATE danh_sach_khach SET ck_ds_98mau_pct = 0.23, ck_ds_khac_pct = 0.12
WHERE nhom = 'DL_SAI_GON' AND (hang = 'OP1' OR (hang IS NULL AND loai_op='OP1')) AND ck_ds_98mau_pct IS NULL;

UPDATE danh_sach_khach SET ck_ds_98mau_pct = 0.20, ck_ds_khac_pct = 0.07
WHERE nhom = 'XUONG_THUONG' AND ck_ds_98mau_pct IS NULL;

UPDATE danh_sach_khach SET ck_ds_98mau_pct = 0.20, ck_ds_khac_pct = 0.09
WHERE nhom = 'XUONG_PREMIUM' AND ck_ds_98mau_pct IS NULL;