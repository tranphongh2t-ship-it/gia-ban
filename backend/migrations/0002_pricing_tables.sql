-- Migration 0002: Bảng giá tham chiếu từ BANG_GIA_2026_TRUC_QUAN.xlsx
-- Chạy: wrangler d1 migrations apply gia-ban-db

-- 1. GIÁ THEO CỐT GỖ
CREATE TABLE IF NOT EXISTS bang_gia_cot_go (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loai TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'PREMIUM',
  do_day TEXT NOT NULL,
  cap TEXT NOT NULL,
  gia INTEGER,
  gia_phu TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT,
  UNIQUE(loai, tier, do_day, cap)
);

-- 2. GIÁ BỀ MẶT PHỦ - NHÓM MÀU
CREATE TABLE IF NOT EXISTS bang_gia_nhom_mau (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bang TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'PREMIUM',
  nhom TEXT NOT NULL,
  loai_mau TEXT,
  gia_1_mat INTEGER,
  gia_2_mat INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT,
  UNIQUE(bang, tier, nhom)
);

-- 3. GIÁ BỀ MẶT PHỦ - MÃ MÀU
CREATE TABLE IF NOT EXISTS bang_gia_ma_mau (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bang TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'PREMIUM',
  nhom TEXT NOT NULL,
  ma_mau TEXT NOT NULL,
  ten_mau TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT,
  UNIQUE(bang, tier, ma_mau)
);

-- 4. VENEER & ACRYLIC
CREATE TABLE IF NOT EXISTS bang_gia_veneers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loai TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'PREMIUM',
  ten TEXT NOT NULL,
  gia_1_mat INTEGER,
  gia_2_mat INTEGER,
  ghi_chu TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT,
  UNIQUE(loai, tier, ten)
);

-- 5. VÁN NHỰA PVC & TẤM PHỦ
CREATE TABLE IF NOT EXISTS bang_gia_nhua_pvc (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loai TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'PREMIUM',
  do_day TEXT,
  ma_sp TEXT,
  gia INTEGER,
  gia_phu TEXT,
  ghi_chu TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);
