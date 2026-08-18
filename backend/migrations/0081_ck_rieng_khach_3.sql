-- 0081: Mức CK riêng — CHI chỉ nẹp + DURABO kiện + ván trơn MDF/HDF theo khách; revert 0080 sai.
-- Đối chiếu 08/2026 TOÀN BỘ dòng nhóm liên quan của từng khách (không chỉ dòng sai), ưu tiên > ck_op1 và bỏ vận chuyển.

-- CNHUNG: DURABO kiện thực 0% (engine 5%+1vc=6%); CHI chỉ nẹp bậc 1_thung thực 24% (khách dùng mức 10_thung 23%+1vc cho mọi dòng từ 1 thùng).
--   Ngoại lệ 1 đơn BH08577 (dòng 1) thực 21% — chấp nhận.
UPDATE danh_sach_khach SET ck_ct_pct = '{"CHI_NEP|1_thung":0.24,"DURABO|kien":0}' WHERE ma_kh = 'CNHUNG';

-- MYXUANVT: DURABO kiện thực 10% (engine 5%); ván trơn MDF/HDF thực 0% (giá đã gộp CK, engine 10/15%).
UPDATE danh_sach_khach SET ck_ct_pct = '{"DURABO|kien":0.10,"MDF_HDF|kien":0,"MDF_HDF|le":0}' WHERE ma_kh = 'MYXUANVT';

-- THIENNHANCM: revert DURABO kiện 0 (0080) — đa số dòng NT17063* thực 6% (5%+1vc), chỉ NT08065B2M/NT17055R1M thực 0%.
UPDATE danh_sach_khach SET ck_ct_pct = NULL WHERE ma_kh = 'THIENNHANCM';
