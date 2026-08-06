-- 0012: Bảng giá chuẩn VÁN ÉP (từ Tab VÁN ÉP của FILE GIÁ CHUẨN.xlsx)

-- 1. VÁN ÉP THANH THÙY (Mặt Ash/mỡ CD)
CREATE TABLE IF NOT EXISTS bang_gia_chuan_van_ep (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER,
  quy_cach TEXT,
  kt_1000x2000 REAL,
  kt_1220x2440 REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

-- 2. VÁN ÉP KHÁC (Nhập khẩu, Phủ phim, Phủ veneer, Okume/EV)
CREATE TABLE IF NOT EXISTS bang_gia_chuan_van_ep_khac (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER,
  quy_cach TEXT,
  loai TEXT,
  gia REAL,
  nhom TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

-- 3. Bảng tính giá gốc VÁN ÉP (tổng hợp từ 2 bảng trên)
CREATE TABLE IF NOT EXISTS bang_gia_chuan_tinh_gia_ve (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quy_cach TEXT,
  loai TEXT,
  nhom TEXT,
  gia REAL,
  created_at TEXT DEFAULT (datetime('now'))
);
