-- 0016: Bảng màu Melamine + giá Ván nhựa-OSB-Plywood-Gỗ ghép phủ Melamine

CREATE TABLE IF NOT EXISTS bang_gia_chuan_mau_melamine_2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_mau TEXT NOT NULL,
  nhom TEXT NOT NULL,
  phan_nhom TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS bang_gia_chuan_melamine_plywood (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER,
  loai_cot TEXT,
  do_day TEXT,
  gia_sang_trung REAL,
  gia_toi REAL,
  gia_don_sac_101 REAL,
  gia_don_sac_khac_da REAL,
  gia_don_sac_106 REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS bang_gia_chuan_melamine_nhua_osb_ghep (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER,
  loai_cot TEXT,
  do_day TEXT,
  gia_sang_trung REAL,
  gia_toi_don_sac REAL,
  gia_chum_104_106 REAL,
  giam_tru_sang_trung REAL DEFAULT 0,
  giam_tru_toi_don_sac REAL DEFAULT 0,
  giam_tru_chum_104_106 REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS bang_gia_chuan_tinh_gia_melamine_tonghop (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_mau TEXT,
  nhom TEXT,
  phan_nhom TEXT,
  bang TEXT,
  loai_cot TEXT,
  do_day TEXT,
  so_mat INTEGER DEFAULT 2,
  gia REAL,
  created_at TEXT DEFAULT (datetime('now'))
);
