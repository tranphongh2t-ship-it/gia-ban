-- 0083: Bảng Check chiết khấu (test) — đối chiếu CK theo từng loại (CK1 ván trơn/chỉ nẹp, CK2 vận chuyển, CK3 Melamine).
-- Giống check_gia_goc_ck nhưng lưu thêm kết quả engine theo từng loại + cho phép SỬA % từng loại để test
-- rồi tự tính tổng và so sánh với chuẩn (bang-ck-thang) — dữ liệu tạm tự xóa sau 6h.
CREATE TABLE IF NOT EXISTS check_chiet_khau_test (
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
  hinh_thuc_giao TEXT,
  la_khuyen_mai INTEGER DEFAULT 0,
  la_thanh_ly INTEGER DEFAULT 0,
  ds_mel_running REAL DEFAULT 0,
  -- Kết quả engine tính (chuẩn bang-ck-thang)
  ck1_pct REAL,              -- CK1: ván trơn / chỉ nẹp / phụ kiện (lớp 1)
  ck2_pct REAL,              -- CK2: vận chuyển (lớp 2)
  ck3_pct REAL,              -- CK3: Melamine (lớp 3)
  tong_pct REAL,             -- tổng % engine tính
  ck_tinh REAL,              -- tổng số tiền CK engine tính = doanh_so * tong_pct
  nhom_mau TEXT,             -- nhóm màu Melamine (98_pho_thong / khac)
  dieu_kien TEXT,            -- điều kiện CK (co_don, kien...)
  giai_thich TEXT,
  -- Người dùng sửa % từng loại CK (null = chưa sửa, hiển thị theo engine)
  sua_ck1_pct REAL,
  sua_ck2_pct REAL,
  sua_ck3_pct REAL,
  sua_tong_pct REAL,         -- tổng sau khi sửa (tự tính)
  sua_ck_tinh REAL,          -- số tiền sau khi sửa = doanh_so * sua_tong_pct
  sua_ghichu TEXT,
  updated_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_check_chiet_khau_test_created_at ON check_chiet_khau_test(created_at);
CREATE INDEX IF NOT EXISTS idx_check_chiet_khau_test_thang ON check_chiet_khau_test(substr(ngay,7,4) || '-' || substr(ngay,4,2));
