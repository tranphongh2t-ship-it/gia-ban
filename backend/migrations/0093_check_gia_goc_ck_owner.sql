-- 0093: Check giá gốc - CK theo user — mỗi account 1 file riêng.
-- owner_user_id = id nhân viên đã import; NULL = dữ liệu cũ (mọi người đều thấy để không mất dữ liệu lịch sử).
ALTER TABLE check_gia_goc_ck ADD COLUMN owner_user_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_check_gia_goc_ck_owner ON check_gia_goc_ck(owner_user_id);