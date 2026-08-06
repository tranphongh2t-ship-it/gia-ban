CREATE TABLE IF NOT EXISTS bang_gia_chuan_veneer (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER,
  loai TEXT NOT NULL DEFAULT '',
  be_mat TEXT NOT NULL DEFAULT '',
  gia_1m_a REAL,
  gia_1m_b REAL,
  gia_2m REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS bang_gia_chuan_mat_phu_khac (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER,
  ten TEXT NOT NULL DEFAULT '',
  gia_1m REAL,
  gia_2m REAL,
  ghi_chu TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);
