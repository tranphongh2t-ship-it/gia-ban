-- 0034: Lịch sử giá gốc theo tháng cho mã sản phẩm
-- Mỗi lần đổi giá ma_misa.gia_goc -> thêm 1 dòng lịch sử (ma_sp, thang YYYY-MM, gia_cu, gia_goc mới)
CREATE TABLE IF NOT EXISTS ma_misa_gia_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_sp TEXT NOT NULL,
  thang TEXT NOT NULL,
  gia_cu REAL,
  gia_goc REAL NOT NULL,
  nguon TEXT DEFAULT 'manual',
  updated_by TEXT,
  created_at TEXT DEFAULT (datetime('now','+7 hours'))
);
CREATE INDEX IF NOT EXISTS idx_mamisa_gia_history ON ma_misa_gia_history(ma_sp, thang);
