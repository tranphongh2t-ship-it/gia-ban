-- 0046: Bảng log tổng hợp mọi thay đổi theo user
-- Ghi nhận MỌI thay đổi (ghi tay) trên:
--   - 11/25 bảng nhỏ Bảng Tính Giá (qua crud lockable) + bảng ma_misa + bảng ban
--   - Lịch sử giá riêng lẻ tiếp tục lưu ở ma_misa_gia_history / gia_chuan_gia_history
CREATE TABLE IF NOT EXISTS thay_doi_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bang TEXT NOT NULL,
  ref_id INTEGER,
  cot TEXT,
  mo_ta TEXT,
  gia_tri_cu TEXT,
  gia_tri_moi TEXT,
  updated_by TEXT,
  thang TEXT,
  created_at TEXT DEFAULT (datetime('now','+7 hours'))
);
CREATE INDEX IF NOT EXISTS idx_tdl_updated_by ON thay_doi_log(updated_by, created_at);
CREATE INDEX IF NOT EXISTS idx_tdl_bang ON thay_doi_log(bang, ref_id);
CREATE INDEX IF NOT EXISTS idx_tdl_thang ON thay_doi_log(thang);