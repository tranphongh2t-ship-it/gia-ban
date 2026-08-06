-- 0011: Bảng giá chuẩn GỖ GHÉP (từ Tab GỖ GHÉP của FILE GIÁ CHUẨN.xlsx)

-- 1. GỖ TRƠN (Cao su, Thông NZL)
CREATE TABLE IF NOT EXISTS bang_gia_chuan_go_ghep (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER,
  quy_cach TEXT,
  cao_su_aa_ab REAL,
  cao_su_ac REAL,
  cao_su_bc REAL,
  cao_su_cc REAL,
  thong_nzl_aa REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

-- 2. GỖ GHÉP CAO SU PHỦ VENEER
CREATE TABLE IF NOT EXISTS bang_gia_chuan_phu_veneer (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER,
  quy_cach TEXT,
  xoan_1m REAL,
  xoan_2m REAL,
  soi_1m REAL,
  soi_2m REAL,
  soi_kt_1m REAL,
  soi_kt_2m REAL,
  oc_cho_kt_1m REAL,
  oc_cho_kt_2m REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

-- 3. Bảng tính giá gốc GỖ GHÉP (tổng hợp từ 2 bảng trên)
CREATE TABLE IF NOT EXISTS bang_gia_chuan_tinh_gia_gg (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quy_cach TEXT,
  loai TEXT,
  nhom TEXT,        -- "Gỗ Trơn" or "Phủ Veneer"
  gia REAL,
  created_at TEXT DEFAULT (datetime('now'))
);
