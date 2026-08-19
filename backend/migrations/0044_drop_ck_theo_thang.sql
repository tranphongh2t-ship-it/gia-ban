-- 0044: Xóa 3 trang Chiết khấu cũ (/audit, /quan-ly-thang, /tinh-gia)
--   Bảng ck_theo_thang_op1/op2 + ck_thang_op chỉ phục vụ route ck-theo-thang
--   (đã xóa) và trang QuanLyThang/TinhGia (đã xóa) → DROP.
--   GIỮ: ban, bang_gia_ck, phan_bo_kh (còn dùng bởi trang khác + lịch sử giá).
DROP TABLE IF EXISTS ck_theo_thang_op1;
DROP TABLE IF EXISTS ck_theo_thang_op2;
DROP TABLE IF EXISTS ck_thang_op;