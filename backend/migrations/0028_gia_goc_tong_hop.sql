-- Bảng tổng hợp tất cả giá gốc từ các module + mô tả để search
CREATE TABLE IF NOT EXISTS gia_goc_tong_hop (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  module TEXT NOT NULL DEFAULT '',
  ref_id INTEGER NOT NULL DEFAULT 0,
  mo_ta TEXT NOT NULL DEFAULT '',
  mo_ta_search TEXT NOT NULL DEFAULT '',
  gia_goc REAL DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now','+7 hours'))
);
CREATE INDEX IF NOT EXISTS idx_ggth_module ON gia_goc_tong_hop(module);
CREATE INDEX IF NOT EXISTS idx_ggth_search ON gia_goc_tong_hop(mo_ta_search);

-- Thêm cột match vào ma_misa
ALTER TABLE ma_misa ADD COLUMN match_status TEXT DEFAULT 'pending';
ALTER TABLE ma_misa ADD COLUMN match_module TEXT DEFAULT '';
ALTER TABLE ma_misa ADD COLUMN match_mo_ta TEXT DEFAULT '';
ALTER TABLE ma_misa ADD COLUMN match_score REAL DEFAULT 0;
ALTER TABLE ma_misa ADD COLUMN match_updated_at TEXT DEFAULT NULL;
