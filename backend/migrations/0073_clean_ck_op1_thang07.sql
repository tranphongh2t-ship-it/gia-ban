-- 0073: Xóa ck_op1 tháng 07 (dữ liệu test cũ bị lưu sai tỉ lệ — số nguyên 26/23/2 thay vì 0.26...).
-- Tháng 07/08 sẽ dùng rule tháng 06 (đúng tỉ lệ phần trăm) qua findCkOp1Rule.
DELETE FROM ck_op1 WHERE thang = '2026-07';