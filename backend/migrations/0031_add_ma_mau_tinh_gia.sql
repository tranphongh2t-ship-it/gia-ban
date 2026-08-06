-- Thêm cột ma_mau (mã màu 220) vào bảng tính giá gốc VDO và VMH
ALTER TABLE bang_gia_chuan_tinh_gia_vdo ADD COLUMN ma_mau TEXT;
ALTER TABLE bang_gia_chuan_tinh_gia_vmh ADD COLUMN ma_mau TEXT;