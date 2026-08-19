-- 0080: Mức CK riêng — nhóm OKAL trơn / DURABO / ván trơn / veneer (qua ck_ct_pct) + mel (qua ck_ds)
-- Đối chiếu 08/2026 từng dòng thực tế (tất cả dòng nhóm liên quan đã rà), ưu tiên > ck_op1 và bỏ vận chuyển.

-- TINHANH: OKAL ván trơn bậc THƯỜNG thực 10% (engine 0%); bậc kiện đã đúng 10% → không đổi.
UPDATE danh_sach_khach SET ck_ct_pct = '{"VAN_DAM_OKAL|le":0.10}' WHERE ma_kh = 'TINHANH';

-- VIETFURNITURE & 008086012004 (Xưởng Thuong): ván trơn MDF/HDF thực 0% (giá đã gộp CK).
UPDATE danh_sach_khach SET ck_ct_pct = '{"MDF_HDF|kien":0,"MDF_HDF|le":0}' WHERE ma_kh = 'VIETFURNITURE';
UPDATE danh_sach_khach SET ck_ct_pct = '{"MDF_HDF|kien":0,"MDF_HDF|le":0}' WHERE ma_kh = '008086012004';

-- DURABO kiện theo khách (engine chung 5%, thực tế lệch từng khách):
UPDATE danh_sach_khach SET ck_ct_pct = '{"DURABO|kien":0.10}' WHERE ma_kh = 'HSLQ9';      -- thực 10%
UPDATE danh_sach_khach SET ck_ct_pct = '{"DURABO|kien":0.11}' WHERE ma_kh = 'GGTUNGUYEN'; -- thực 11%
UPDATE danh_sach_khach SET ck_ct_pct = '{"DURABO|kien":0}' WHERE ma_kh = 'THIENNHANCM';   -- thực 0%

-- MOCHOANG: ván veneer mặt phủ khác thực 5% (engine 0%).
UPDATE danh_sach_khach SET ck_ct_pct = '{"VENEER_MAT_PHU_KHAC|co_don":0.05}' WHERE ma_kh = 'MOCHOANG';

-- Mel khác-màu theo khách (Xưởng):
UPDATE danh_sach_khach SET ck_ds_khac_pct = 0    WHERE ma_kh = 'DOANTHANHPHAT'; -- thực 0%
UPDATE danh_sach_khach SET ck_ds_khac_pct = 0.07 WHERE ma_kh = 'NTTHIETMOC';    -- thực 7%