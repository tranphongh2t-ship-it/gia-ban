-- 0042: Theo dõi mã hàng đã xuất hiện trong file audit (Check giá gốc - CK)
-- Quy tắc "lần đầu / lần sau":
--   - Lần đầu mã xuất hiện trong file audit → được phép TỰ ĐỘNG đổi giá MISA theo giá audit.
--   - Lần sau (mã đã từng xuất hiện ở file audit trước) → KHÔNG tự đổi, chỉ đánh dấu cần Quản trị viên xử lý.
CREATE TABLE IF NOT EXISTS audit_ma_seen (
  ma_sp TEXT PRIMARY KEY,
  first_seen_at TEXT DEFAULT (datetime('now','+7 hours')),
  last_seen_at TEXT DEFAULT (datetime('now','+7 hours')),
  auto_changed INTEGER DEFAULT 0,
  so_lan INTEGER DEFAULT 1
);
