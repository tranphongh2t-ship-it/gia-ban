-- 0003: Import Sổ chi tiết bán hàng.xlsx

CREATE TABLE IF NOT EXISTS so_chi_tiet_ban_hang (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngay TEXT,
  so_ct TEXT,
  dien_giai TEXT,
  ma_kh TEXT,
  ten_kh TEXT,
  ma_hang TEXT,
  ten_hang TEXT,
  sl_ban REAL DEFAULT 0,
  don_gia REAL DEFAULT 0,
  doanh_so REAL DEFAULT 0,
  ck REAL DEFAULT 0,
  sl_tra REAL DEFAULT 0,
  gt_tra REAL DEFAULT 0,
  gt_giam REAL DEFAULT 0,
  thue REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS don_hang_excel (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tinh_trang TEXT,
  ngay_dh TEXT,
  so_dh TEXT,
  phe_duyet TEXT,
  ngay_hen_giao TEXT,
  ten_kh TEXT,
  chi_tiet TEXT,
  tong_sl REAL DEFAULT 0,
  gia_tri_dh REAL DEFAULT 0,
  chung_tu TEXT,
  dien_giai TEXT,
  nv_sale TEXT,
  dia_chi TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
