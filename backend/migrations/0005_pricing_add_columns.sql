-- 0005: Add missing columns to pricing tables (ma_sp, gia_goc)

ALTER TABLE ma_misa ADD COLUMN gia_goc REAL;
ALTER TABLE gia_ban ADD COLUMN gia_goc REAL;

ALTER TABLE bang_gia_veneers ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_chi ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_keo_nong ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_acrylic_foil ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_van_phu_acrylic ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_laminate_one ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_pvc_film ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_van_phu_pvc ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_nhua_phu_mau ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_nhua_laminate ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_osb_laminate ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_mirror ADD COLUMN ma_sp TEXT DEFAULT '';
