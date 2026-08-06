-- 0035: Lưu mức co dãn cột của từng bảng theo người dùng
CREATE TABLE IF NOT EXISTS user_column_prefs (
  user_id INTEGER NOT NULL,
  page_key TEXT NOT NULL,
  col_widths TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT DEFAULT (datetime('now','+7 hours')),
  PRIMARY KEY (user_id, page_key)
);