-- 0037: Bảng Check giá gốc - CK (Audit giá & CK)
-- Giống cấu trúc so_chi_tiet_ban_hang nhưng dữ liệu tạm:
-- dùng để check giá gốc / chiết khấu hàng ngày - tuần, tự xóa sau 6h.
CREATE TABLE IF NOT EXISTS check_gia_goc_ck (
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

-- Chỉ mục cho việc xóa dữ liệu quá 6h
CREATE INDEX IF NOT EXISTS idx_check_gia_goc_ck_created_at ON check_gia_goc_ck(created_at);
