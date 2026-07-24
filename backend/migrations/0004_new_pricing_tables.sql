-- 0004: Bảng giá Tab 2 & 3 - Veneer, Chỉ, Acrylic, Laminate, Ván Nhựa, PVC

-- ============ TAB 2: VENEER, CHỈ, ACRYLIC, LAMINATE ============

-- 2a. Mặt phủ khác + Veneer tự nhiên + Veneer kỹ thuật (dùng bảng bang_gia_veneers hiện có)
-- Schema: loai, tier, ten, gia_1_mat, gia_2_mat, ghi_chu

-- 2b. Chỉ (Edge banding strips) - ABS/PVC/Acrylic/Veneer
CREATE TABLE IF NOT EXISTS bang_gia_chi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loai TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'PREMIUM',
  ten TEXT NOT NULL,
  quy_cach TEXT,
  gia INTEGER,
  don_vi TEXT DEFAULT 'cuộn',
  ghi_chu TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

-- 2c. Hạt keo nóng chảy
CREATE TABLE IF NOT EXISTS bang_gia_keo_nong (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ma TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'PREMIUM',
  nhiet_do TEXT,
  mau_sac TEXT,
  don_gia_kg INTEGER,
  don_gia_bao25 INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

-- 2d. Acrylic foil
CREATE TABLE IF NOT EXISTS bang_gia_acrylic_foil (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  series TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'PREMIUM',
  loai TEXT NOT NULL,
  gia_tot INTEGER,
  ma_mau TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

-- 2e. Ván phủ Acrylic
CREATE TABLE IF NOT EXISTS bang_gia_van_phu_acrylic (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  series TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'PREMIUM',
  phu TEXT NOT NULL,
  loai_cot TEXT,
  gia_don_sac INTEGER,
  gia_anh_kim INTEGER,
  gia_van_go INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

-- 2f. Laminate One
CREATE TABLE IF NOT EXISTS bang_gia_laminate_one (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nhom TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'PREMIUM',
  gia_foil INTEGER,
  ma_mau TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

-- ============ TAB 3: VÁN NHỰA, PVC & TẤM PHỦ ============

-- 3a. PVC Film & Dura+ (dùng bảng riêng vì cấu trúc khác)
CREATE TABLE IF NOT EXISTS bang_gia_pvc_film (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loai TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'PREMIUM',
  nhom_mau TEXT NOT NULL,
  ma_so TEXT,
  thong_so_film TEXT,
  gia_1_mat INTEGER,
  gia_2_mat INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

-- 3b. Ván phủ PVC Film-PETG
CREATE TABLE IF NOT EXISTS bang_gia_van_phu_pvc (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loai_cot TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'PREMIUM',
  do_day TEXT,
  pvc_uu_dai_1m INTEGER,
  pvc_uu_dai_2m INTEGER,
  pvc_standard_1m INTEGER,
  pvc_standard_2m INTEGER,
  pvc_premium_1m INTEGER,
  pvc_premium_2m INTEGER,
  petg_1m INTEGER,
  petg_2m INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

-- 3c. Ván Nhựa Phủ Màu
CREATE TABLE IF NOT EXISTS bang_gia_nhua_phu_mau (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loai_cot TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'PREMIUM',
  do_day TEXT,
  nhom_sang_trung INTEGER,
  nhom_toi_don_sac INTEGER,
  mau_106 INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

-- 3d. Ván Nhựa Laminate
CREATE TABLE IF NOT EXISTS bang_gia_nhua_laminate (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loai_cot TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'PREMIUM',
  do_day TEXT,
  do_day_thanh_pham TEXT,
  le1_backer INTEGER,
  le2_backer INTEGER,
  lp1_backer INTEGER,
  lp2_backer INTEGER,
  lp3_backer INTEGER,
  le1_2mat INTEGER,
  le2_2mat INTEGER,
  lp1_2mat INTEGER,
  lp2_2mat INTEGER,
  lp3_2mat INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

-- 3e. Ván OSB Laminate (cấu trúc giống nhựa laminate)
CREATE TABLE IF NOT EXISTS bang_gia_osb_laminate (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loai_cot TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'PREMIUM',
  do_day TEXT,
  do_day_thanh_pham TEXT,
  le1_backer INTEGER,
  le2_backer INTEGER,
  lp1_backer INTEGER,
  lp2_backer INTEGER,
  lp3_backer INTEGER,
  le1_2mat INTEGER,
  le2_2mat INTEGER,
  lp1_2mat INTEGER,
  lp2_2mat INTEGER,
  lp3_2mat INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

-- 3f. MDF Kháng Ẩm Mirror + Tấm Siêu Bóng Gương
CREATE TABLE IF NOT EXISTS bang_gia_mirror (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loai TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'PREMIUM',
  ten TEXT,
  loai_cot TEXT,
  gia INTEGER,
  ghi_chu TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);
