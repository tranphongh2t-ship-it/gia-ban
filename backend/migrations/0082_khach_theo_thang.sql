-- 0082: Bảng "khách theo tháng" — version hóa thuộc tính khách theo tháng để nhập dữ liệu hàng tháng không phải viết SQL.
-- Giải quyết: vung/hang/nhom/loai_op/ck_ds_*/ck_ct_pct/tu_lay trước đây nằm trên dòng hiện hành danh_sach_khach,
-- mỗi tháng phải UPDATE đè nên hỏng lịch sử. Bảng này lưu bản khác biệt theo (ma_kh, thang).
-- Rỗng = không có override → engine fallback danh_sach_khach (không đổi kết quả hiện tại).

CREATE TABLE IF NOT EXISTS khach_theo_thang (
  ma_kh           TEXT NOT NULL,
  thang           TEXT NOT NULL,           -- YYYY-MM
  loai_op         TEXT,
  vung            TEXT,
  doi_tuong       TEXT,
  hang            TEXT,
  nhom            TEXT,
  tu_lay          INTEGER,                 -- 0/1
  ck_vc_pct       REAL,
  ck_ds_98mau_pct REAL,
  ck_ds_khac_pct  REAL,
  ck_ct_pct       TEXT,                    -- JSON override (mức cuối cùng, đã gồm vận chuyển)
  ghi_chu         TEXT,
  updated_at      TEXT,
  updated_by      TEXT,
  PRIMARY KEY (ma_kh, thang)
);

CREATE INDEX IF NOT EXISTS idx_khach_theo_thang_thang ON khach_theo_thang (thang);