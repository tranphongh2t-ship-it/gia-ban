DROP TABLE IF EXISTS bang_gia_chuan_mirror;
CREATE TABLE bang_gia_chuan_mirror (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER NOT NULL DEFAULT 0,
  nguon TEXT NOT NULL DEFAULT '',
  loai TEXT NOT NULL DEFAULT '',
  quy_cach TEXT NOT NULL DEFAULT '',
  gia_1m INTEGER DEFAULT NULL,
  gia_2m INTEGER DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now','+7 hours')),
  updated_at TEXT DEFAULT NULL,
  updated_by TEXT DEFAULT NULL
);

INSERT INTO bang_gia_chuan_mirror (stt, nguon, loai, quy_cach, gia_1m, gia_2m) VALUES
(1,'MDF-VÁN NHỰA MIRROR','MDF kháng ẩm','LMR 17 mm KG',859000,NULL),
(2,'MDF-VÁN NHỰA MIRROR','MDF kháng ẩm','LMR 8mm KG',686000,NULL),
(3,'MDF-VÁN NHỰA MIRROR','Ván nhựa','17mm 0.55',1041000,1412000),
(4,'MDF-VÁN NHỰA MIRROR','Ván nhựa','17mm 0.6',1106000,1477000),
(5,'MDF-VÁN NHỰA MIRROR','Ván nhựa','17mm lõi đen 0.65',1061000,1432000),
(6,'SIÊU BÓNG GƯƠNG','Tấm siêu bóng gương','Kháng ẩm 17mm LMR KG/DW',818000,NULL),
(7,'SIÊU BÓNG GƯƠNG','Tấm siêu bóng gương','Kháng ẩm 17mm MMR TL metro',929000,NULL);