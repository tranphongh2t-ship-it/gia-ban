-- 0015: Bảng giá VÁN PHỦ PVC FILM - PETG
-- Tab PVC FILM - DURA+ (mã màu đã phân tách) + Tab VÁN PHỦ PVC FILM - PETG (giá)

CREATE TABLE IF NOT EXISTS bang_gia_chuan_pvc_film_dura (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_mau TEXT NOT NULL,
  nhom TEXT NOT NULL,
  loai TEXT NOT NULL,
  thong_so TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS bang_gia_chuan_van_phu_pvc_petg (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER,
  loai_van TEXT,
  do_day TEXT,
  gia_uu_dai_1m REAL,
  gia_uu_dai_2m REAL,
  gia_standard_1m REAL,
  gia_standard_2m REAL,
  gia_premium_1m REAL,
  gia_premium_2m REAL,
  gia_petg_1m REAL,
  gia_petg_2m REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS bang_gia_chuan_tinh_gia_pvc_petg (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_mau TEXT,
  nhom TEXT,
  loai TEXT,
  loai_van TEXT,
  do_day TEXT,
  so_mat INTEGER,
  gia REAL,
  created_at TEXT DEFAULT (datetime('now'))
);
