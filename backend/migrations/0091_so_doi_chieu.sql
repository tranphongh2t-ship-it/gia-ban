-- 0091: Bảng Sổ đối chiếu — dữ liệu tạm tự xóa sau 6h.
-- 23 cột đúng theo file "Sổ chi tiết bán hàng file mới.xlsx" +
-- cột tính toán: giá gốc MISA tham chiếu, kết quả engine chiết khấu theo từng loại.
CREATE TABLE IF NOT EXISTS so_doi_chieu (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ngay_hach_toan TEXT,
  ngay_chung_tu TEXT,
  so_chung_tu TEXT,
  ngay_hoa_don TEXT,
  so_hoa_don TEXT,
  dien_giai_chung TEXT,
  dien_giai TEXT,
  ma_kh TEXT,
  ten_kh TEXT,
  ma_nhom_kh TEXT,
  ten_nhom_kh TEXT,
  ma_hang TEXT,
  ten_hang TEXT,
  dvt TEXT,
  sl_ban REAL DEFAULT 0,
  don_gia REAL DEFAULT 0,
  doanh_so REAL DEFAULT 0,
  ck REAL DEFAULT 0,
  sl_tra REAL DEFAULT 0,
  gt_tra REAL DEFAULT 0,
  gt_giam REAL DEFAULT 0,
  thue REAL DEFAULT 0,
  nv_ban TEXT,
  -- Cột tính toán / tham chiếu
  gia_goc REAL,              -- Giá gốc MISA tại thời điểm bán (tham chiếu)
  ck1_pct REAL,              -- CK1: ván trơn / chỉ nẹp (lớp 1)
  ck2_pct REAL,              -- CK2: vận chuyển (lớp 2)
  ck3_pct REAL,              -- CK3: Melamine (lớp 3)
  tong_pct REAL,             -- tổng % engine tính
  ck_tinh REAL,              -- số tiền CK engine tính = doanh_so * tong_pct
  nhom_mau TEXT,             -- nhóm màu Melamine
  dieu_kien TEXT,            -- điều kiện CK
  giai_thich TEXT,
  sua_ck1_pct REAL,          -- người dùng sửa % CK1
  sua_ck2_pct REAL,          -- người dùng sửa % CK2
  sua_ck3_pct REAL,          -- người dùng sửa % CK3
  sua_tong_pct REAL,         -- tổng sau khi sửa
  sua_ck_tinh REAL,          -- số tiền sau khi sửa = doanh_so * sua_tong_pct
  sua_ghichu TEXT,
  updated_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_so_doi_chieu_created_at ON so_doi_chieu(created_at);
CREATE INDEX IF NOT EXISTS idx_so_doi_chieu_ma_hang ON so_doi_chieu(ma_hang);