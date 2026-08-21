-- 0095: Thêm cột ghi_chu vào sổ đối chiếu — cho phép user nhập ghi chú bằng tay (khác với sua_ghichu dành cho sửa CK).
ALTER TABLE so_doi_chieu ADD COLUMN ghi_chu TEXT;
