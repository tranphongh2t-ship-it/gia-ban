-- 0040: Cột giá hiệu lực theo thời điểm cho bảng Check giá gốc - CK
-- Lưu "giá gốc tham chiếu tại ngày bán" cho mỗi dòng (không dùng giá mới nhất áp cho toàn lịch sử).
ALTER TABLE check_gia_goc_ck ADD COLUMN gia_goc_ngay REAL;
