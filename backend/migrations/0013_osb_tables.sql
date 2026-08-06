-- 0013: Bảng giá chuẩn OSB (từ Tab OSB của FILE GIÁ CHUẨN.xlsx)
-- Gồm: Giá gốc, Giá đã CK 10%, Giá đã CK 15%, Giá chưa CK 10%, Giá chưa CK 15%

CREATE TABLE IF NOT EXISTS bang_gia_chuan_osb (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER,
  mo_ta TEXT,
  do_day TEXT,
  gia REAL,
  gia_da_ck_10 REAL,
  gia_da_ck_15 REAL,
  gia_chua_ck_10 REAL,
  gia_chua_ck_15 REAL,
  tam_kien INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS bang_gia_chuan_tinh_gia_osb (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  do_day TEXT,
  loai TEXT,
  nhom TEXT,
  gia REAL,
  created_at TEXT DEFAULT (datetime('now'))
);
