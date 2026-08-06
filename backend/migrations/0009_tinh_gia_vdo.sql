-- 0009: Bảng tính giá gốc VÁN DĂM OKAL (tổng hợp từ 3 bảng)
CREATE TABLE IF NOT EXISTS bang_gia_chuan_tinh_gia_vdo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_quy_cach TEXT,
  board_loai TEXT,
  board_gia REAL,
  color_nhom TEXT,
  color_loai TEXT,
  so_mat INTEGER,
  phu_thu_loai TEXT,      -- basic, eco, standard, premium_wa, premium_mau, superb, superb_dacbiet
  phu_thu_gia REAL,
  tong_gia REAL,
  created_at TEXT DEFAULT (datetime('now'))
);
