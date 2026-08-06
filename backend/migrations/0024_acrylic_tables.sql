-- Migration: Acrylic pricing tables
DROP TABLE IF EXISTS bang_gia_chuan_tinh_gia_acrylic;
DROP TABLE IF EXISTS bang_gia_chuan_van_phu_acrylic;
DROP TABLE IF EXISTS bang_gia_chuan_acrylic;

CREATE TABLE bang_gia_chuan_acrylic (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER NOT NULL DEFAULT 0,
  series TEXT NOT NULL DEFAULT '',
  ma_mau TEXT NOT NULL DEFAULT '',
  loai_mau TEXT NOT NULL DEFAULT '',
  gia INTEGER DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now','+7 hours')),
  updated_at TEXT DEFAULT NULL,
  updated_by TEXT DEFAULT NULL
);

INSERT INTO bang_gia_chuan_acrylic (stt, series, ma_mau, loai_mau, gia) VALUES
(1,'ULTRA','US 105-SLATE','Đơn sắc',620000),
(2,'ULTRA','UM 107-GRAPHITE','Ánh kim',720000),
(3,'ULTRA','US 101-ARCTICWHITE','Đơn sắc',620000),
(4,'ULTRA','US 104-MOCHA','Đơn sắc',620000),
(5,'ULTRA','US 106-JETBLACK','Đơn sắc',620000),
(6,'ULTRA','US 102-VANILLA','Đơn sắc',620000),
(7,'ULTRA','US 103-SAHARA','Đơn sắc',620000),
(8,'GLASS','AS 402','Đơn sắc',680000),
(9,'GLASS','AS 301','Đơn sắc',680000),
(10,'GLASS','AM 208','Ánh kim',780000),
(11,'GLASS','AS 403','Đơn sắc',680000),
(12,'GLASS','AS 204','Đơn sắc',680000),
(13,'GLASS','AM 403','Ánh kim',780000),
(14,'GLASS','AW 0503','Vân gỗ',880000),
(15,'GLASS','AS 205','Đơn sắc',680000),
(16,'GLASS','AS 701','Đơn sắc',680000),
(17,'GLASS','AM 204','Ánh kim',780000),
(18,'GLASS','AW 1102','Vân gỗ',880000),
(19,'GLASS','AS 203','Đơn sắc',680000),
(20,'GLASS','AS 101','Đơn sắc',680000),
(21,'GLASS','AM 903','Ánh kim',780000),
(22,'GLASS','AW 0901','Vân gỗ',880000),
(23,'GLASS','AS 702','Đơn sắc',680000),
(24,'GLASS','AS 904','Đơn sắc',680000),
(25,'GLASS','AM 603','Ánh kim',780000),
(26,'GLASS','AW 1601','Vân gỗ',880000),
(27,'GLASS','AS 801','Đơn sắc',680000),
(28,'GLASS','AS 501','Đơn sắc',680000);

CREATE TABLE bang_gia_chuan_van_phu_acrylic (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER NOT NULL DEFAULT 0,
  series TEXT NOT NULL DEFAULT '',
  phu TEXT NOT NULL DEFAULT '',
  board_type TEXT NOT NULL DEFAULT '',
  gia_ds INTEGER DEFAULT NULL,
  gia_ak INTEGER DEFAULT NULL,
  gia_vg INTEGER DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now','+7 hours')),
  updated_at TEXT DEFAULT NULL,
  updated_by TEXT DEFAULT NULL
);

INSERT INTO bang_gia_chuan_van_phu_acrylic (stt, series, phu, board_type, gia_ds, gia_ak, gia_vg) VALUES
(1,'ULTRA','Acrylic/ Mel 100T','MMR 17mm Metro',1377000,1477000,NULL),
(2,'ULTRA','Acrylic/ ABS backer','MMR 17mm Metro',1737000,1837000,NULL),
(3,'ULTRA','Acrylic/ ABS backer','Durabo 17mm 0.55D',1880000,1980000,NULL),
(4,'ULTRA','Acrylic/ ABS backer','Nhựa 17mm 3 lớp lõi đen 0.65D',1900000,2000000,NULL),
(5,'ULTRA','Acrylic/ Acrylic','MMR 17mm Metro',2067000,2267000,NULL),
(6,'ULTRA','Acrylic/ Acrylic','Durabo 17mm 0.55D',2210000,2410000,NULL),
(7,'ULTRA','Acrylic/ Acrylic','Nhựa 17mm 3 lớp lõi đen 0.65D',2230000,2430000,NULL),
(8,'GLASS','Acrylic/ Mel 100T','MMR 17mm Metro',1437000,1537000,1637000),
(9,'GLASS','Acrylic/ ABS backer','MMR 17mm Metro',1797000,1897000,1997000),
(10,'GLASS','Acrylic/ ABS backer','Durabo 17mm 0.55D',1940000,2040000,2140000),
(11,'GLASS','Acrylic/ ABS backer','Nhựa 17mm 3 lớp lõi đen 0.65D',1960000,2060000,2160000),
(12,'GLASS','Acrylic/ Acrylic','MMR 17mm Metro',2187000,2387000,3627000),
(13,'GLASS','Acrylic/ Acrylic','Durabo 17mm 0.55D',2330000,2530000,2730000),
(14,'GLASS','Acrylic/ Acrylic','Nhựa 17mm 3 lớp lõi đen 0.65D',2350000,2550000,2750000);

CREATE TABLE bang_gia_chuan_tinh_gia_acrylic (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_mau TEXT NOT NULL DEFAULT '',
  series TEXT NOT NULL DEFAULT '',
  loai_mau TEXT NOT NULL DEFAULT '',
  phu TEXT NOT NULL DEFAULT '',
  board_type TEXT NOT NULL DEFAULT '',
  gia INTEGER DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now','+7 hours')),
  updated_at TEXT DEFAULT NULL,
  updated_by TEXT DEFAULT NULL
);
