-- 0070: Chuẩn tháng 08/2026 theo bảng HTML (bang_chi_tiet_va_mindmap_chiet_khau (1).html)
-- và OP_thang_08.xlsx (đã được user chốt).
-- 1) Sửa master data 8 đại lý TỈNH: vung SaiGon->Tinh, nhom DL_SAI_GON->DL_TINH, ck_ds theo chuẩn.
-- 2) Nạp op2_bac_thang tháng 08 cho toàn bộ OP2 theo chuẩn (đè 0058: NGOCTHOMGL 08=25/14 thay vì 29/18).

-- ============ 1. MASTER DATA: nhóm ĐẠI LÝ TỈNH ============
-- Toàn Phát 25/14, Ngọc Thơm 25/14, Quốc Tuấn 24/13, còn lại 23/12.
UPDATE danh_sach_khach
SET vung = 'Tinh', nhom = 'DL_TINH', hang = 'OP2', loai_op = 'OP2',
    ck_ds_98mau_pct = 0.25, ck_ds_khac_pct = 0.14
WHERE ma_kh IN ('TOANPHAT', 'NGOCTHOMGL');

UPDATE danh_sach_khach
SET vung = 'Tinh', nhom = 'DL_TINH', hang = 'OP2', loai_op = 'OP2',
    ck_ds_98mau_pct = 0.24, ck_ds_khac_pct = 0.13
WHERE ma_kh IN ('QUOCTUANDL');

UPDATE danh_sach_khach
SET vung = 'Tinh', nhom = 'DL_TINH', hang = 'OP2', loai_op = 'OP2',
    ck_ds_98mau_pct = 0.23, ck_ds_khac_pct = 0.12
WHERE ma_kh IN ('CNHUNG', 'GGTUNGUYEN', 'PHUCKHANG', 'THIENNHANCM', 'PHUMY');

-- ============ 2. op2_bac_thang tháng 08 (chuẩn HTML/xlsx) ============
INSERT OR REPLACE INTO op2_bac_thang (ma_kh, thang, pct_98mau, pct_khac) VALUES
  -- ĐẠI LÝ TỈNH
  ('TOANPHAT',    '2026-08', 0.25, 0.14),
  ('NGOCTHOMGL',  '2026-08', 0.25, 0.14),
  ('QUOCTUANDL',  '2026-08', 0.24, 0.13),
  ('CNHUNG',      '2026-08', 0.23, 0.12),
  ('GGTUNGUYEN',  '2026-08', 0.23, 0.12),
  ('PHUCKHANG',   '2026-08', 0.23, 0.12),
  ('THIENNHANCM', '2026-08', 0.23, 0.12),
  ('PHUMY',       '2026-08', 0.23, 0.12),
  -- ĐẠI LÝ SÀI GÒN: 27/16
  ('PHUCTHAITONG', '2026-08', 0.27, 0.16),
  ('PHUPHUGIA',    '2026-08', 0.27, 0.16),
  -- ĐẠI LÝ SÀI GÒN: 26/15
  ('KHAIVINH',     '2026-08', 0.26, 0.15),
  ('QUANGMINH',    '2026-08', 0.26, 0.15),
  ('TAMSON',       '2026-08', 0.26, 0.15),
  ('CHTUNGPHAT',   '2026-08', 0.26, 0.15),
  ('CHUTOAN',      '2026-08', 0.26, 0.15),
  ('CH55BH',       '2026-08', 0.26, 0.15),
  ('CHOAPVH',      '2026-08', 0.26, 0.15),
  ('LEBAO',        '2026-08', 0.26, 0.15),
  ('AKHANBH',      '2026-08', 0.26, 0.15),
  ('ACUNG',        '2026-08', 0.26, 0.15),
  ('GIATHINH',     '2026-08', 0.26, 0.15);
