-- 0039: Chiết khấu áp dụng theo tháng (Bảng giá CK OP1 / OP2)
-- Mỗi tháng chọn 1 trong 2 OP. Dữ liệu lấy từ file "CK áp dụng theo tháng.xlsx".

-- Bảng tổng hợp OP1: theo Loại Ván + Tên áp dụng, chia theo 5 nhóm khách hàng.
-- Giá trị lưu dạng TEXT giữ nguyên file (vd "0.2" hoặc "20,000đ/ tấm").
CREATE TABLE IF NOT EXISTS ck_theo_thang_op1 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thang TEXT NOT NULL,
  stt INTEGER,
  loai_van TEXT,
  ten_ap_dung TEXT,
  dai_ly_tinh TEXT,
  dai_ly_ngoai_thanh TEXT,
  dai_ly_sai_gon TEXT,
  xuong_thuong TEXT,
  xuong_premium TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ck_op1_thang ON ck_theo_thang_op1 (thang, stt);

-- Bảng tổng hợp OP2: theo khách hàng cụ thể (MÃ KH + TÊN KH).
CREATE TABLE IF NOT EXISTS ck_theo_thang_op2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thang TEXT NOT NULL,
  stt INTEGER,
  nhom TEXT,
  ten TEXT,
  mdf_ok_phu_mel REAL,
  con_lai REAL,
  vc_mdf_ok_phu_mel REAL,
  vc_khac REAL,
  ma_kh TEXT,
  ten_kh TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ck_op2_thang ON ck_theo_thang_op2 (thang, stt);
CREATE INDEX IF NOT EXISTS idx_ck_op2_makh ON ck_theo_thang_op2 (thang, ma_kh);

-- Cấu hình tháng nào dùng OP nào (mỗi tháng chọn 1 OP)
CREATE TABLE IF NOT EXISTS ck_thang_op (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thang TEXT NOT NULL UNIQUE,
  loai_op TEXT NOT NULL DEFAULT 'OP1',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);
