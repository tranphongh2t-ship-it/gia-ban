-- 0079: Mức CK riêng của khách (override) — đã chốt 08/2026, đối chiếu dữ liệu thực tế.
-- Cột ck_ct_pct (JSON) chứa mức CUỐI CÙNG (đã bao gồm vận chuyển), engine ưu tiên hơn ck_op1 + bỏ Lớp 2:
--   "flat_pct"          -> mức cố định áp mọi nhóm Lớp 1 (không phải Mel/phụ phí)
--   "<dieuKien>"        -> mức theo bậc (co_don/1_thung/10_thung/100_thung...), áp mọi nhóm Lớp 1
--   "<nhomSP>|<dieuKien>" -> mức riêng cho đúng nhóm + bậc
ALTER TABLE danh_sach_khach ADD COLUMN ck_ct_pct TEXT;

-- 1) 058206009385 (TRẦN CHÍ NGHĨA, xưởng nhưng nhận mức đại lý Tỉnh):
--    đổi hạng PREMIER/Tỉnh để lấy dl_tinh (MDF_HDF le 10%, CHI_NEP co_don 10%, MAT_PHU_MELAMINE 10%),
--    + ck_ds 98-màu 23% / khác-màu 12% (melamine MDF/Okal).
UPDATE danh_sach_khach
SET doi_tuong = 'PREMIER', vung = 'Tinh', hang = 'OP1', nhom = 'DL_TINH',
    ck_ds_98mau_pct = 0.23, ck_ds_khac_pct = 0.12
WHERE ma_kh = '058206009385';

-- 2) DAILYPAINTING: toàn bộ hàng Lớp 1 (GM/LP foil One Laminate...) nhận cố định 1.85%.
UPDATE danh_sach_khach
SET ck_ct_pct = '{"flat_pct":0.0185}'
WHERE ma_kh = 'DAILYPAINTING';

-- 3) ATRUCBMT: bậc 1_thung thực nhận 24% (engine 21%) — đúng mức còn lại (co_don 11%, 10_thung 24%).
UPDATE danh_sach_khach
SET ck_ct_pct = '{"1_thung":0.24}'
WHERE ma_kh = 'ATRUCBMT';
