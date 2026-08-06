-- 0008: MẶT PHỦ MELAMINE + 98 MÀU MELAMINE PHỔ THÔNG

-- 1. Phụ thu mặt phủ Melamine (bảng giá flat, 3 dòng × 12 cột giá)
CREATE TABLE IF NOT EXISTS bang_gia_chuan_phu_thu_melamine (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER,
  mo_ta TEXT,
  basic_1m REAL,
  basic_2m REAL,
  eco_1m REAL,
  eco_2m REAL,
  standard_1m REAL,
  standard_2m REAL,
  premium_wood_art_1m REAL,
  premium_wood_art_2m REAL,
  premium_color_1m REAL,
  premium_color_2m REAL,
  superb_1m REAL,
  superb_2m REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

-- 2. Danh mục màu Melamine (chuẩn hóa — mỗi mã màu 1 dòng, dễ tra cứu cho công thức)
CREATE TABLE IF NOT EXISTS bang_gia_chuan_mau_melamine (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER,
  nguon TEXT,           -- '220' hoặc '98'
  nhom TEXT,            -- Basic, Economy, Standard, Premium, Superb
  loai TEXT,            -- Wood, Art, Color
  ma_mau TEXT,
  ten_mau TEXT,
  vi_tri INTEGER,       -- Vị trí trong nhóm
  created_at TEXT DEFAULT (datetime('now'))
);

-- 3. 98 Màu Melamine phổ thông (giữ nguyên cấu trúc Excel để hiển thị)
CREATE TABLE IF NOT EXISTS bang_gia_chuan_98_mau (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER,
  wood_1 TEXT,
  wood_2 TEXT,
  wood_3 TEXT,
  wood_4 TEXT,
  wood_5 TEXT,
  wood_6 TEXT,
  wood_7 TEXT,
  art TEXT,
  color_code TEXT,
  color_name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
