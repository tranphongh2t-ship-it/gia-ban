-- 0049: Áp dụng ground-truth từ reverse-engineering Sổ chi tiết bán hàng (6).xlsx
-- Rate thực tế: ĐL Tinh = 24%/13% (20/9 + 4% VC cố định), ĐL SG = 23%/12%,
-- ĐL Ngoại thành = 21%/10%, Premium = 20%/9%, Thường = 20%/7%, OP2 SG = 26-29%/15-18%.

-- ============ 1. Lớp 3: ĐL Tinh = 24%/13% (gộp 4% VC cố định) ============
UPDATE policy_revenue_tiers SET pct_98mau = 0.24, pct_khac = 0.13
WHERE vung = 'Tinh' AND hang = 'OP1' AND bac_tu = 0;

-- ============ 2. Lớp 2: bỏ VC riêng cho Tinh (đã gộp vào Lớp 3) ============
UPDATE ck_van_chuyen SET pct_mdf_mel = 0, pct_khac = 0 WHERE vung = 'Tinh';

-- ============ 3. Gán vùng/hạng cho khách PREMIER theo rate thực tế ============
-- ĐL Tỉnh OP1 (24%/13%)
UPDATE danh_sach_khach SET vung='Tinh', hang='OP1', nhom='DL_TINH'
WHERE ma_kh IN ('ACONGDL','ATHAINT','ATRUCBMT','BAOHUYBL','COTUDL','VANGOSONGCHI');

-- ĐL Sài Gòn OP1 (23%/12%)
UPDATE danh_sach_khach SET vung='SaiGon', hang='OP1', nhom='DL_SAI_GON'
WHERE ma_kh IN ('HSLQ9','HSLCN2','HSLTD','LONGMY','NGOCHUE','THUANTHANHPHATJSC');

-- ĐL Ngoại thành OP1 (21%/10%)
UPDATE danh_sach_khach SET vung='NgoaiThanh', hang='OP1', nhom='DL_NGOAI_THANH'
WHERE ma_kh IN ('MYXUANVT');

-- OP2 Sài Gòn (bậc tính động theo doanh số tháng)
UPDATE danh_sach_khach SET vung='SaiGon', hang='OP2', nhom='DL_SAI_GON'
WHERE ma_kh IN ('ACUNG','AKHANHBH','CH55BH','CHOAPVH','CHTUNGPHAT','CHUTOAN','GIATHINH',
  'KHAIVINH','LEBAO','QUANGMINH','TAMSON','CNHUNG','GGTUNGUYEN','PHUCKHANG','PHUCTHAITONG',
  'PHUPHUGIA','THIENNHANCM','NGOCTHOMGL','QUOCTUANDL','TOANPHAT');

-- ============ 4. Bổ sung Premium thực tế (20%/9%) ============
UPDATE danh_sach_khach SET doi_tuong='PREMIUM', hang='Premium', nhom='XUONG_PREMIUM'
WHERE ma_kh IN ('NTTHIETMOC','XDTANADONG');
