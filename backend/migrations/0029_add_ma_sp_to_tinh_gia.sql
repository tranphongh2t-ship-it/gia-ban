-- Thêm cột ma_sp, ten_sp vào các bảng tính giá để gán mã MISA
-- Migration 0029

-- Tinh gia VDO
ALTER TABLE bang_gia_chuan_tinh_gia_vdo ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_chuan_tinh_gia_vdo ADD COLUMN ten_sp TEXT DEFAULT '';

-- Tinh gia VMH
ALTER TABLE bang_gia_chuan_tinh_gia_vmh ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_chuan_tinh_gia_vmh ADD COLUMN ten_sp TEXT DEFAULT '';

-- Tinh gia GG
ALTER TABLE bang_gia_chuan_tinh_gia_gg ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_chuan_tinh_gia_gg ADD COLUMN ten_sp TEXT DEFAULT '';

-- Tinh gia VE
ALTER TABLE bang_gia_chuan_tinh_gia_ve ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_chuan_tinh_gia_ve ADD COLUMN ten_sp TEXT DEFAULT '';

-- Tinh gia OSB
ALTER TABLE bang_gia_chuan_tinh_gia_osb ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_chuan_tinh_gia_osb ADD COLUMN ten_sp TEXT DEFAULT '';

-- Tinh gia DR
ALTER TABLE bang_gia_chuan_tinh_gia_dr ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_chuan_tinh_gia_dr ADD COLUMN ten_sp TEXT DEFAULT '';

-- Tinh gia PVC/PETG
ALTER TABLE bang_gia_chuan_tinh_gia_pvc_petg ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_chuan_tinh_gia_pvc_petg ADD COLUMN ten_sp TEXT DEFAULT '';

-- Tinh gia Melamine Tong Hop
ALTER TABLE bang_gia_chuan_tinh_gia_melamine_tonghop ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_chuan_tinh_gia_melamine_tonghop ADD COLUMN ten_sp TEXT DEFAULT '';

-- Tinh gia Acrylic
ALTER TABLE bang_gia_chuan_tinh_gia_acrylic ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_chuan_tinh_gia_acrylic ADD COLUMN ten_sp TEXT DEFAULT '';

-- Tinh gia One Laminate
ALTER TABLE bang_gia_chuan_tinh_gia_one_laminate ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_chuan_tinh_gia_one_laminate ADD COLUMN ten_sp TEXT DEFAULT '';

-- Mirror
ALTER TABLE bang_gia_chuan_mirror ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_chuan_mirror ADD COLUMN ten_sp TEXT DEFAULT '';

-- Keo hat
ALTER TABLE bang_gia_chuan_keo_hat ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_chuan_keo_hat ADD COLUMN ten_sp TEXT DEFAULT '';

-- Bang gia chuan acrylic (source, not tinh_gia)
ALTER TABLE bang_gia_chuan_acrylic ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_chuan_acrylic ADD COLUMN ten_sp TEXT DEFAULT '';

-- Bang gia chuan van phu acrylic (source)
ALTER TABLE bang_gia_chuan_van_phu_acrylic ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_chuan_van_phu_acrylic ADD COLUMN ten_sp TEXT DEFAULT '';

-- Bang gia chuan one laminate (source)
ALTER TABLE bang_gia_chuan_one_laminate ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_chuan_one_laminate ADD COLUMN ten_sp TEXT DEFAULT '';

-- Bang gia chuan van nhua phu hpl (source)
ALTER TABLE bang_gia_chuan_van_nhua_phu_hpl ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_chuan_van_nhua_phu_hpl ADD COLUMN ten_sp TEXT DEFAULT '';

-- Bang gia chuan osb ghep ep phu hpl (source)
ALTER TABLE bang_gia_chuan_osb_ghep_ep_phu_hpl ADD COLUMN ma_sp TEXT DEFAULT '';
ALTER TABLE bang_gia_chuan_osb_ghep_ep_phu_hpl ADD COLUMN ten_sp TEXT DEFAULT '';
