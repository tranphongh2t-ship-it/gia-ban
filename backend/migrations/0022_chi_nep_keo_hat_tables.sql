CREATE TABLE IF NOT EXISTS bang_gia_chuan_chi_nep (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER,
  nhom TEXT NOT NULL DEFAULT '',
  cuon TEXT NOT NULL DEFAULT '',
  gia_a REAL,
  gia_b REAL,
  gia_c REAL,
  gia_d REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS bang_gia_chuan_keo_hat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER,
  ma TEXT NOT NULL DEFAULT '',
  nhiet_do TEXT DEFAULT '',
  mau TEXT DEFAULT '',
  gia_1kg REAL,
  gia_25kg REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);
