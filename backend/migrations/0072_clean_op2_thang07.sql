-- 0072: Xóa op2_bac_thang tháng 07 (dữ liệu test cũ lưu sai tỉ lệ phần trăm dạng số nguyên 26/15...).
-- Để tháng 07 rơi về mức ck_ds_* của master data danh_sach_khach (đã sửa ở 0070).
DELETE FROM op2_bac_thang WHERE thang = '2026-07';