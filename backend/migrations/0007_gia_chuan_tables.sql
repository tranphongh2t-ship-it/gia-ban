-- 0007: Bảng giá chuẩn (Excel FILE GIÁ CHUẨN.xlsx) - cô lập, không liên quan bảng khác

-- 1. VÁN DĂM OKAL
CREATE TABLE IF NOT EXISTS bang_gia_chuan_dam_okal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER,
  quy_cach TEXT,
  e2 REAL,
  veco_e1 REAL,
  veco_cp2 REAL,
  veco_f4s REAL,
  hmr_e1 REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);

-- 2. VÁN MDF HDF
CREATE TABLE IF NOT EXISTS bang_gia_chuan_mdf_hdf (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER,
  quy_cach TEXT,
  vn_ldf_e2 REAL,
  vn_mdf_e2 REAL,
  vn_mdf_cp2 REAL,
  vn_hdf_hmr_e2 REAL,
  vn_hdf_hmr_e1 REAL,
  th_mdf_e2 REAL,
  th_hdf_hmr_e2 REAL,
  vn_lmr_e2 REAL,
  vn_mmr_e2 REAL,
  vn_hmr_e2 REAL,
  vn_hmr_e1 REAL,
  vn_hmr_cp2 REAL,
  th_mmr_e2 REAL,
  th_hmr_v313_e1 REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  updated_by TEXT
);
