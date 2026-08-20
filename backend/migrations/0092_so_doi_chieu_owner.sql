-- 0092: Sổ đối chiếu theo user — mỗi account 1 file riêng.
-- owner_user_id = id nhân viên đã import; NULL = dữ liệu cũ (mọi người đều thấy để không mất dữ liệu lịch sử).
ALTER TABLE so_doi_chieu ADD COLUMN owner_user_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_so_doi_chieu_owner ON so_doi_chieu(owner_user_id);