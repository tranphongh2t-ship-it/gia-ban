-- 0094: Check chiết khấu theo user — mỗi account 1 file riêng.
-- owner_user_id = id nhân viên đã import; NULL = dữ liệu cũ (mọi người đều thấy để không mất dữ liệu lịch sử).
ALTER TABLE check_chiet_khau_test ADD COLUMN owner_user_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_check_chiet_khau_owner ON check_chiet_khau_test(owner_user_id);