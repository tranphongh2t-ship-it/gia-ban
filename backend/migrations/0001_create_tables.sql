-- Migration 0001: Tạo tất cả bảng
-- Chạy: wrangler d1 migrations apply gia-ban-db (sau khi tạo DB: wrangler d1 create gia-ban-db)

-- 1. Nhân viên
CREATE TABLE IF NOT EXISTS nhan_vien (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ten TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  vai_tro TEXT NOT NULL DEFAULT 'sales',
  trang_thai TEXT NOT NULL DEFAULT 'dang_lam_viec',
  ngay_bat_dau TEXT,
  ngay_nghi_viec TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

-- 2. Khách hàng
CREATE TABLE IF NOT EXISTS khach_hang (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_kh TEXT NOT NULL UNIQUE,
  ten_kh TEXT,
  dia_chi TEXT,
  nhom_kh_ncc TEXT,
  ma_so_thue TEXT,
  dien_thoai TEXT,
  hoa_don TEXT,
  chi_nhanh TEXT,
  t6_2025 TEXT,
  phan_loai TEXT NOT NULL,
  phu_thu REAL DEFAULT 0,
  ck_phu_thu REAL DEFAULT 0,
  sales_phu_trach_id INTEGER REFERENCES nhan_vien(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_kh_ma ON khach_hang(ma_kh);
CREATE INDEX IF NOT EXISTS idx_kh_phan_loai ON khach_hang(phan_loai);

-- 3. Mã MISA
CREATE TABLE IF NOT EXISTS ma_misa (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_sp TEXT NOT NULL UNIQUE,
  ten_sp TEXT,
  dvt TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_mamisa_ma ON ma_misa(ma_sp);

-- 4. Phụ thu
CREATE TABLE IF NOT EXISTS phu_thu (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loai_phu_phi TEXT NOT NULL,
  ma_hang TEXT NOT NULL,
  ten TEXT,
  phi REAL NOT NULL DEFAULT 0,
  ghi_chu TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_pt_ma ON phu_thu(ma_hang);

-- 5. ThanhThuy-GG
CREATE TABLE IF NOT EXISTS thanhthuy_gg (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_mau TEXT,
  ten_mau TEXT,
  nhom TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

-- 6. ThanhThuy-GVT
CREATE TABLE IF NOT EXISTS thanhthuy_gvt (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loai TEXT,
  chat_lieu TEXT,
  do_day TEXT,
  ma_vt TEXT,
  ten_vt TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

-- 7. Phân bổ KH
CREATE TABLE IF NOT EXISTS phan_bo_kh (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_kh TEXT NOT NULL,
  thang INTEGER NOT NULL,
  nam INTEGER NOT NULL,
  loai_op TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT,
  UNIQUE(ma_kh, thang, nam)
);
CREATE INDEX IF NOT EXISTS idx_pbkh ON phan_bo_kh(ma_kh, thang, nam);

-- 8. Bảng giá chiết khấu
CREATE TABLE IF NOT EXISTS bang_gia_ck (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loai TEXT NOT NULL,
  key_match TEXT NOT NULL,
  loai_kh TEXT,
  cot_index INTEGER,
  gia_tri REAL NOT NULL,
  loai_don_vi TEXT NOT NULL DEFAULT 'percent',
  ghi_chu TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_bgck_loai ON bang_gia_ck(loai, key_match);

-- 9. Giá bán
CREATE TABLE IF NOT EXISTS gia_ban (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_sp TEXT NOT NULL REFERENCES ma_misa(ma_sp),
  ten_sp TEXT,
  do_day TEXT,
  ma_giay TEXT,
  nhom TEXT,
  loai_giay TEXT,
  loai_phim TEXT,
  so_luong TEXT,
  van_tron TEXT,
  dg_giay REAL,
  dg_vt REAL,
  hieu_luc_tu TEXT NOT NULL,
  hieu_luc_den TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_gb_ma ON gia_ban(ma_sp);
CREATE INDEX IF NOT EXISTS idx_gb_hieu_luc ON gia_ban(hieu_luc_tu);

-- 9b. Giá bán theo tier
CREATE TABLE IF NOT EXISTS gia_ban_tier (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gia_ban_id INTEGER NOT NULL REFERENCES gia_ban(id),
  tier TEXT NOT NULL,
  don_gia REAL,
  dg_giay REAL,
  dg_vt REAL,
  UNIQUE(gia_ban_id, tier)
);
CREATE INDEX IF NOT EXISTS idx_gbt_gb ON gia_ban_tier(gia_ban_id);

-- 10. Đơn hàng
CREATE TABLE IF NOT EXISTS don_hang (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nv_sale TEXT,
  dh TEXT,
  kho TEXT,
  ngay TEXT NOT NULL,
  tinh_hinh TEXT,
  ma_kh TEXT NOT NULL,
  khach TEXT,
  ma_hang TEXT NOT NULL,
  dien_giai TEXT,
  sl_dat REAL,
  tien_ck REAL,
  dso REAL,
  ty_le_ck REAL,
  don_gia_ban REAL,
  nhom_gia TEXT,
  es TEXT,
  hang_khach TEXT,
  giay TEXT,
  phim TEXT,
  mau TEXT,
  sl_mat REAL,
  van_tron_chi REAL,
  con_lai REAL,
  gia_dung_kiem_lai REAL,
  cl_sai_tam REAL,
  tong_cl REAL,
  dh_chieu TEXT,
  ck_dung REAL,
  pt REAL,
  cl_ck REAL,
  hk TEXT,
  n TEXT,
  ck_vc REAL,
  khach_text TEXT,
  kln REAL,
  cl_ck2 REAL,
  gia_dh REAL,
  cl REAL,
  ghi_chu TEXT,
  mau_sang_trung_toi TEXT,
  vt TEXT,
  sai_ma TEXT,
  ten_hang TEXT,
  dd_chung TEXT,
  so_ct TEXT,
  dvt TEXT,
  sl_tra REAL,
  gt_tra REAL,
  gt_giam REAL,
  sales_id INTEGER REFERENCES nhan_vien(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_dh_ma_kh ON don_hang(ma_kh);
CREATE INDEX IF NOT EXISTS idx_dh_ma_hang ON don_hang(ma_hang);
CREATE INDEX IF NOT EXISTS idx_dh_ngay ON don_hang(ngay);

-- 11. Bán
CREATE TABLE IF NOT EXISTS ban (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nv_sale TEXT,
  hd TEXT,
  dd TEXT,
  ngay TEXT NOT NULL,
  so_don TEXT,
  ma_kh TEXT NOT NULL,
  khach TEXT,
  ma_hang TEXT NOT NULL,
  ten_hang TEXT,
  sl_dat REAL,
  tien_ck REAL,
  dso REAL,
  dg REAL,
  gtgt REAL,
  don_gia_ban REAL,
  nhom_gia TEXT,
  test_nhom TEXT,
  es TEXT,
  hang_khach TEXT,
  giay TEXT,
  phim TEXT,
  mau TEXT,
  sl_mat REAL,
  van_tron_chi REAL,
  con_lai REAL,
  gia_dung_kiem REAL,
  cl_sai_tam REAL,
  tong_cl REAL,
  cl_mau TEXT,
  ck_dung REAL,
  pt REAL,
  ck_sai REAL,
  vat_t3 REAL,
  hk TEXT,
  n TEXT,
  ck_vc REAL,
  khach_text TEXT,
  kln REAL,
  cl_ck REAL,
  ct REAL,
  note TEXT,
  gia_dh REAL,
  cl2 REAL,
  ghi_chu TEXT,
  mau_sang_trung_toi TEXT,
  vt TEXT,
  ma_kt TEXT,
  sai_ma TEXT,
  ngay_hd TEXT,
  dd_chung TEXT,
  so_ct TEXT,
  dvt TEXT,
  sl_tra REAL,
  gt_tra REAL,
  gt_giam REAL,
  sales_id INTEGER REFERENCES nhan_vien(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT,
  rule_version TEXT DEFAULT 'v1'
);
CREATE INDEX IF NOT EXISTS idx_ban_ma_kh ON ban(ma_kh);
CREATE INDEX IF NOT EXISTS idx_ban_ma_hang ON ban(ma_hang);
CREATE INDEX IF NOT EXISTS idx_ban_ngay ON ban(ngay);
CREATE INDEX IF NOT EXISTS idx_ban_sales ON ban(sales_id);
CREATE INDEX IF NOT EXISTS idx_ban_ck ON ban(ck_dung, ck_sai);

-- 12. Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nhan_vien TEXT NOT NULL,
  bang TEXT NOT NULL,
  dong_id INTEGER,
  hanh_dong TEXT NOT NULL,
  gia_tri_cu TEXT,
  gia_tri_moi TEXT,
  thoi_gian TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit ON audit_log(bang, dong_id, thoi_gian);
