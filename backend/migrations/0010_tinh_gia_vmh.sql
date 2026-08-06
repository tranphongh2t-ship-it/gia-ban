-- 0010: Bảng tính giá gốc VÁN MDF HDF
CREATE TABLE IF NOT EXISTS bang_gia_chuan_tinh_gia_vmh (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_quy_cach TEXT,
  board_loai TEXT,
  board_gia REAL,
  color_nhom TEXT,
  color_loai TEXT,
  so_mat INTEGER,
  phu_thu_loai TEXT,
  phu_thu_gia REAL,
  tong_gia REAL,
  created_at TEXT DEFAULT (datetime('now'))
);
