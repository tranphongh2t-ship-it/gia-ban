-- 0045: Hệ thống chiết khấu mới theo đặc tả 2026 (2 file HTML)
-- Mở rộng danh_sach_khach + bảng nhóm khách + luật chiết khấu 5 lớp.

-- ============ 1. Mở rộng danh_sach_khach ============
-- vung: SaiGon | Tinh | NgoaiThanh
-- doi_tuong: PREMIER | PREMIUM
-- hang: OP1 | OP2 | Thuong | Premium
ALTER TABLE danh_sach_khach ADD COLUMN vung TEXT;
ALTER TABLE danh_sach_khach ADD COLUMN doi_tuong TEXT;
ALTER TABLE danh_sach_khach ADD COLUMN hang TEXT;
ALTER TABLE danh_sach_khach ADD COLUMN ck_vc_pct REAL;
ALTER TABLE danh_sach_khach ADD COLUMN ck_ds_98mau_pct REAL;
ALTER TABLE danh_sach_khach ADD COLUMN ck_ds_khac_pct REAL;
ALTER TABLE danh_sach_khach ADD COLUMN nhom TEXT;
ALTER TABLE danh_sach_khach ADD COLUMN ghi_chu TEXT;

-- Cột CK tính theo công thức 5 lớp cho trang đối chiếu
ALTER TABLE so_chi_tiet_ban_hang ADD COLUMN ck_tinh REAL;
ALTER TABLE so_chi_tiet_ban_hang ADD COLUMN ck_tinh_pct REAL;
ALTER TABLE so_chi_tiet_ban_hang ADD COLUMN ck_tinh_detail TEXT;

-- ============ 2. Nhóm khách (5 nhóm) ============
CREATE TABLE IF NOT EXISTS khach_nhom (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  doi_tuong TEXT NOT NULL,
  vung TEXT,
  stt INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_khach_nhom_key ON khach_nhom(key);

INSERT OR IGNORE INTO khach_nhom (key, label, doi_tuong, vung, stt) VALUES
  ('DL_TINH', 'Đại lý Tỉnh', 'PREMIER', 'Tinh', 1),
  ('DL_NGOAI_THANH', 'Đại lý Ngoại thành', 'PREMIER', 'NgoaiThanh', 2),
  ('DL_SAI_GON', 'Đại lý Sài Gòn', 'PREMIER', 'SaiGon', 3),
  ('XUONG_THUONG', 'Khách hàng thường', 'PREMIUM', NULL, 4),
  ('XUONG_PREMIUM', 'Khách hàng Premium', 'PREMIUM', NULL, 5);

-- ============ 3. Lớp 1 — Chiết khấu theo bảng giá (ván trơn) ============
CREATE TABLE IF NOT EXISTS policy_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nhom_sp TEXT NOT NULL,
  doi_tuong TEXT NOT NULL,
  tu_ngay TEXT,
  den_ngay TEXT,
  nguong_kien REAL,
  pct_le REAL,
  pct_kien REAL,
  pct_tier2 REAL,
  ghi_chu TEXT
);
CREATE INDEX IF NOT EXISTS idx_policy_rules ON policy_rules(nhom_sp, doi_tuong);

-- ============ 4. Lớp 3 — CK doanh số Melamine theo bậc (OP1/OP2) ============
CREATE TABLE IF NOT EXISTS policy_revenue_tiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vung TEXT,
  hang TEXT,
  bac_tu REAL,
  pct_98mau REAL,
  pct_khac REAL,
  tu_ngay TEXT,
  den_ngay TEXT
);
CREATE INDEX IF NOT EXISTS idx_policy_rev ON policy_revenue_tiers(vung, hang);

-- ============ 5. Lớp 2 — CK vận chuyển mặc định theo vùng/đối tượng ============
CREATE TABLE IF NOT EXISTS ck_van_chuyen (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doi_tuong TEXT NOT NULL,
  vung TEXT NOT NULL,
  pct_mdf_mel REAL,
  pct_khac REAL,
  nguong_kien REAL,
  tu_ngay TEXT,
  den_ngay TEXT
);

-- ============ 6. Lớp 5 — CK năm ============
CREATE TABLE IF NOT EXISTS policy_annual_tiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bac_tu REAL,
  pct REAL,
  tu_ngay TEXT,
  den_ngay TEXT
);

-- ============ 7. Tổng hợp doanh số theo tháng/khách (Lớp 4 + 5) ============
CREATE TABLE IF NOT EXISTS monthly_summary (
  ma_kh TEXT NOT NULL,
  thang TEXT NOT NULL,
  ds_mel_thang REAL DEFAULT 0,
  ds_mel_luy_ke_nam REAL DEFAULT 0,
  ck_thang_pct REAL DEFAULT 0,
  ck_nam_pct REAL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now','+7 hours')),
  PRIMARY KEY (ma_kh, thang)
);

-- ============ SEED: Lớp 1 (bảng giá theo loại ván — đặc tả mục 5) ============
INSERT OR REPLACE INTO policy_rules (id, nhom_sp, doi_tuong, tu_ngay, nguong_kien, pct_le, pct_kien, ghi_chu) VALUES
  (1, 'VAN_DAM_OKAL', 'PREMIER', '2026-05-10', 1, 0.10, 0.15, '10% lẻ / 15% kiện'),
  (2, 'VAN_DAM_OKAL', 'PREMIUM', '2026-05-10', 1, 0.10, NULL, '10% nguyên kiện'),
  (3, 'MDF_HDF', 'PREMIER', '2026-07-01', 1, 0.10, 0.15, '10% lẻ / 15% kiện'),
  (4, 'MDF_HDF', 'PREMIUM', '2026-07-01', 1, 0.10, NULL, '10% nguyên kiện'),
  (5, 'GO_GHEP', 'PREMIER', '2026-03-01', NULL, 0.03, NULL, '3%'),
  (6, 'VAN_EP', 'PREMIER', '2026-07-01', 1, 0.05, 0.10, '5% lẻ / 10% kiện'),
  (7, 'VAN_EP', 'PREMIUM', '2026-07-01', 1, 0.05, NULL, '5% nguyên kiện'),
  (8, 'OSB', 'PREMIER', '2026-03-01', 1, 0.10, 0.15, '10% lẻ / 15% kiện'),
  (9, 'OSB', 'PREMIUM', '2026-03-01', 1, 0.10, NULL, 'đã tính sẵn 10% trong giá kiện'),
  (10, 'DURABO', 'PREMIER', '2026-03-23', 1, 0.05, 0.10, '5% >10 tấm / 10% kiện'),
  (11, 'DURABO', 'PREMIUM', '2026-03-23', 1, 0.05, NULL, '5% nguyên kiện'),
  (12, 'PVC_PETG', 'PREMIER', '2026-03-01', NULL, 0.10, NULL, '10%'),
  (13, 'MAT_PHU_MELAMINE', 'PREMIER', '2026-05-01', NULL, 0.10, NULL, '10%'),
  (14, 'MELAMINE_PLYWOOD', 'PREMIER', '2026-03-01', 50, 0.07, NULL, '7% / 9% >50 tấm / 11% >500 tấm'),
  (15, 'MELAMINE_PLYWOOD', 'PREMIUM', '2026-03-01', 50, 0.03, NULL, '3% >50 tấm / 5% >500 tấm'),
  (16, 'MEL_NHUA_OSB_GO_GHEP', 'PREMIER', '2026-03-01', 1, 0.10, 0.15, '10% / 15% kiện'),
  (17, 'VENEER_MAT_PHU_KHAC', 'PREMIER', '2026-03-01', NULL, 0.10, NULL, '10%'),
  (18, 'CHI_NEP', 'PREMIER', '2026-03-23', NULL, 0.10, NULL, '10% chung / 20-26% theo thùng'),
  (19, 'CHI_NEP', 'PREMIUM', '2026-03-23', NULL, 0.10, NULL, '10% chung'),
  (20, 'KEO_HAT', 'PREMIER', '2026-03-23', 10, 0.05, NULL, '5% >10 bao'),
  (21, 'KEO_HAT', 'PREMIUM', '2026-03-23', 10, 0.05, NULL, '5% >10 bao'),
  (22, 'ACRYLIC', 'PREMIER', '2026-03-01', NULL, 0.10, NULL, '10%'),
  (23, 'ONE_LAMINATE', 'PREMIER', '2026-03-01', NULL, 0.02, NULL, '2% >100tr / 3% >200tr / 5% >500tr'),
  (24, 'ONE_LAMINATE', 'PREMIUM', '2026-03-01', NULL, 0.02, NULL, 'giống PREMIER'),
  (25, 'HPL_LAMINATE', 'PREMIER', '2026-03-01', NULL, 0.10, NULL, '10%'),
  (26, 'MIRROR', 'PREMIER', '2026-03-01', NULL, 0.10, NULL, '10%'),
  (27, 'MSG', 'PREMIER', '2026-03-01', 50, 0.10, NULL, '10% nền + 5% >50 / 10% >100'),
  (28, 'MSG', 'PREMIUM', '2026-03-01', 50, 0.03, NULL, '3% >50 / 5% >100');

-- ============ SEED: Lớp 3 — OP1 (mức chung theo vùng) ============
INSERT OR REPLACE INTO policy_revenue_tiers (id, vung, hang, bac_tu, pct_98mau, pct_khac, tu_ngay) VALUES
  (101, 'SaiGon', 'OP1', 0, 0.23, 0.12, '2026-03-01'),
  (102, 'Tinh', 'OP1', 0, 0.20, 0.09, '2026-03-01'),
  (103, 'NgoaiThanh', 'OP1', 0, 0.21, 0.10, '2026-03-01'),
  (104, NULL, 'Thuong', 0, 0.20, 0.07, '2026-03-01'),
  (105, NULL, 'Premium', 0, 0.20, 0.09, '2026-03-01'),
  -- OP2 Sài Gòn
  (201, 'SaiGon', 'OP2', 400000000, 0.26, 0.15, '2026-03-01'),
  (202, 'SaiGon', 'OP2', 1000000000, 0.27, 0.16, '2026-03-01'),
  (203, 'SaiGon', 'OP2', 2000000000, 0.28, 0.17, '2026-03-01'),
  (204, 'SaiGon', 'OP2', 5000000000, 0.29, 0.18, '2026-03-01'),
  -- OP2 Tỉnh
  (301, 'Tinh', 'OP2', 400000000, 0.23, 0.12, '2026-03-01'),
  (302, 'Tinh', 'OP2', 1000000000, 0.24, 0.13, '2026-03-01'),
  (303, 'Tinh', 'OP2', 2000000000, 0.25, 0.14, '2026-03-01'),
  (304, 'Tinh', 'OP2', 5000000000, 0.26, 0.15, '2026-03-01');

-- ============ SEED: Lớp 2 — CK vận chuyển mặc định ============
INSERT OR REPLACE INTO ck_van_chuyen (id, doi_tuong, vung, pct_mdf_mel, pct_khac, nguong_kien, tu_ngay) VALUES
  (1, 'PREMIER', 'SaiGon', 0.01, 0.01, 65, '2026-03-01'),
  (2, 'PREMIER', 'NgoaiThanh', 0.01, 0.01, 65, '2026-03-01'),
  (3, 'PREMIER', 'Tinh', 0.04, 0.01, 65, '2026-03-01'),
  (4, 'PREMIUM', 'ALL', 0.01, 0.01, 65, '2026-03-01');

-- ============ SEED: Lớp 5 — CK năm ============
INSERT OR REPLACE INTO policy_annual_tiers (id, bac_tu, pct, tu_ngay) VALUES
  (1, 4000000000, 0.03, '2026-03-01'),
  (2, 10000000000, 0.04, '2026-03-01'),
  (3, 15000000000, 0.05, '2026-03-01'),
  (4, 25000000000, 0.06, '2026-03-01'),
  (5, 50000000000, 0.07, '2026-03-01');
