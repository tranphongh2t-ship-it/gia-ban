-- Thêm cột ma_sp, ten_sp vào bảng giá chuẩn Veneer và Mặt phủ khác để gán mã MISA
-- Migration 0032

ALTER TABLE bang_gia_chuan_veneer ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_chuan_veneer ADD COLUMN ten_sp TEXT DEFAULT '';

ALTER TABLE bang_gia_chuan_mat_phu_khac ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_chuan_mat_phu_khac ADD COLUMN ten_sp TEXT DEFAULT '';
