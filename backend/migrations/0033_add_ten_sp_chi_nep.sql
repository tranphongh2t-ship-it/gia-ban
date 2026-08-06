-- Thêm cột ten_sp vào bảng giá chuẩn CHỈ NẸP để gán mã MISA
-- Migration 0033

ALTER TABLE bang_gia_chuan_chi_nep ADD COLUMN ten_sp TEXT DEFAULT '';