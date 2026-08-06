-- 0014: Bảng giá chuẩn VÁN NHỰA DURABO (từ Tab VÁN NHỰA DURABO)
-- Gồm 3 nhóm: DURABO ECO, DURABO, Ván nhựa
-- Lưu dạng phẳng để CRUD và tính giá

CREATE TABLE IF NOT EXISTS bang_gia_chuan_durabo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER,
  quy_cach TEXT NOT NULL,
  loai TEXT NOT NULL,
  nhom TEXT NOT NULL,
  gia REAL,
  dong_goi TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS bang_gia_chuan_tinh_gia_dr (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quy_cach TEXT,
  loai TEXT,
  nhom TEXT,
  gia REAL,
  created_at TEXT DEFAULT (datetime('now'))
);
