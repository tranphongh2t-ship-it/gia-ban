-- 0065: Khóa đồng bộ giá MISA từ file audit (Check giá gốc - CK).
-- locked = 1: KHÔNG tự đồng bộ giá MISA = giá gốc khi import file (mặc định).
-- locked = 0: cho phép đồng bộ. Chỉ Admin bật/tắt.
CREATE TABLE IF NOT EXISTS misa_sync_lock (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  locked INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT,
  updated_at TEXT DEFAULT (datetime('now','+7 hours'))
);
INSERT OR IGNORE INTO misa_sync_lock (id, locked) VALUES (1, 1);
