CREATE TABLE IF NOT EXISTS danh_sach_khach (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_kh TEXT NOT NULL UNIQUE,
  ten_kh TEXT,
  loai_op TEXT NOT NULL DEFAULT 'OP1',
  nguon TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_danh_sach_khach_ma_kh ON danh_sach_khach (ma_kh);
CREATE INDEX IF NOT EXISTS idx_danh_sach_khach_loai_op ON danh_sach_khach (loai_op);
