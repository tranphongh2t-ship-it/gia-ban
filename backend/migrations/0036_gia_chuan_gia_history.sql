-- Bảng lịch sử giá dùng chung cho các bảng gia-chuan (mọi cột số)
CREATE TABLE IF NOT EXISTS gia_chuan_gia_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bang TEXT NOT NULL,
  ref_id INTEGER NOT NULL,
  cot TEXT NOT NULL,
  thang TEXT NOT NULL,
  gia_cu REAL,
  gia_moi REAL,
  updated_by TEXT,
  created_at TEXT DEFAULT (datetime('now', '+7 hours'))
);
CREATE INDEX IF NOT EXISTS idx_gia_chuan_gia_history
  ON gia_chuan_gia_history (bang, ref_id, cot, thang);
