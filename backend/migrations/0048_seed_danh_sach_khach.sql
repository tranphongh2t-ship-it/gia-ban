-- 0048: Phân loại danh_sach_khach theo chính sách 2026
-- Đối chiếu khách theo cột "Mã KH" (code chữ). Nếu mã KH là số điện thoại →
-- đối chiếu qua cột "Khách hàng" (tên khách) để tìm đúng khách trong khach_hang.
-- Mã hoá trong khach_hang.t6_2025:
--   PREMIERDLT05 = PREMIER + ĐL Tỉnh      (vùng tinh chỉnh qua phan_loai)
--   PREMIUMXT05  = PREMIUM + Xưởng thường
-- 7 mã Xưởng Premium (kèm biến thể cùng pháp nhân):
--   YCHI, YCHIKLN, TINHANH, TINHANHCT, NTSTARHOME, NTSTARHOMEJSC, SMLIFE.

-- ============ Bước 0: kế thừa t6_2025/phan_loai cho biến thể KLN/CT/VAT/AKIEN ============
UPDATE khach_hang AS k
SET t6_2025 = p.t6_2025, phan_loai = p.phan_loai
FROM khach_hang AS p
WHERE (k.t6_2025 IS NULL OR k.t6_2025 = '')
  AND p.ma_kh = CASE
    WHEN k.ma_kh LIKE '%AKIEN' THEN SUBSTR(k.ma_kh, 1, LENGTH(k.ma_kh) - 5)
    WHEN k.ma_kh LIKE '%KLN'  THEN SUBSTR(k.ma_kh, 1, LENGTH(k.ma_kh) - 3)
    WHEN k.ma_kh LIKE '%CT'   THEN SUBSTR(k.ma_kh, 1, LENGTH(k.ma_kh) - 2)
    WHEN k.ma_kh LIKE 'VAT%'  THEN SUBSTR(k.ma_kh, 4)
  END
  AND (p.t6_2025 IS NOT NULL AND p.t6_2025 != '');

-- ============ Bước 1: đối chiếu theo Mã KH (code) ============
UPDATE danh_sach_khach AS d
SET doi_tuong = k.doi_tuong, vung = k.vung, hang = k.hang, nhom = k.nhom
FROM (
  SELECT
    ma_kh,
    CASE WHEN t6_2025 LIKE 'PREMIER%' THEN 'PREMIER'
         WHEN t6_2025 LIKE 'PREMIUM%' THEN 'PREMIUM' END AS doi_tuong,
    CASE WHEN t6_2025 LIKE 'PREMIER%' THEN
      CASE WHEN phan_loai = 'DM' THEN 'SaiGon'
           WHEN phan_loai = 'DLND' THEN 'NgoaiThanh'
           ELSE 'Tinh' END
    END AS vung,
    CASE WHEN t6_2025 LIKE 'PREMIUM%' THEN
      CASE WHEN ma_kh IN ('YCHI','YCHIKLN','TINHANH','TINHANHCT','NTSTARHOME','NTSTARHOMEJSC','SMLIFE') THEN 'Premium'
           ELSE 'Thuong' END
    END AS hang,
    CASE
      WHEN t6_2025 LIKE 'PREMIER%' THEN
        CASE WHEN phan_loai = 'DM' THEN 'DL_SAI_GON'
             WHEN phan_loai = 'DLND' THEN 'DL_NGOAI_THANH'
             ELSE 'DL_TINH' END
      WHEN t6_2025 LIKE 'PREMIUM%' THEN
        CASE WHEN ma_kh IN ('YCHI','YCHIKLN','TINHANH','TINHANHCT','NTSTARHOME','NTSTARHOMEJSC','SMLIFE') THEN 'XUONG_PREMIUM'
             ELSE 'XUONG_THUONG' END
    END AS nhom
  FROM khach_hang
  WHERE t6_2025 IS NOT NULL AND t6_2025 != ''
) AS k
WHERE d.ma_kh = k.ma_kh;

-- ============ Bước 2: mã KH là SĐT → đối chiếu theo Tên khách ============
UPDATE danh_sach_khach AS d
SET doi_tuong = k.doi_tuong, vung = k.vung, hang = k.hang, nhom = k.nhom
FROM (
  SELECT
    ten_kh,
    CASE WHEN t6_2025 LIKE 'PREMIER%' THEN 'PREMIER'
         WHEN t6_2025 LIKE 'PREMIUM%' THEN 'PREMIUM' END AS doi_tuong,
    CASE WHEN t6_2025 LIKE 'PREMIER%' THEN
      CASE WHEN phan_loai = 'DM' THEN 'SaiGon'
           WHEN phan_loai = 'DLND' THEN 'NgoaiThanh'
           ELSE 'Tinh' END
    END AS vung,
    CASE WHEN t6_2025 LIKE 'PREMIUM%' THEN
      CASE WHEN ma_kh IN ('YCHI','YCHIKLN','TINHANH','TINHANHCT','NTSTARHOME','NTSTARHOMEJSC','SMLIFE') THEN 'Premium'
           ELSE 'Thuong' END
    END AS hang,
    CASE
      WHEN t6_2025 LIKE 'PREMIER%' THEN
        CASE WHEN phan_loai = 'DM' THEN 'DL_SAI_GON'
             WHEN phan_loai = 'DLND' THEN 'DL_NGOAI_THANH'
             ELSE 'DL_TINH' END
      WHEN t6_2025 LIKE 'PREMIUM%' THEN
        CASE WHEN ma_kh IN ('YCHI','YCHIKLN','TINHANH','TINHANHCT','NTSTARHOME','NTSTARHOMEJSC','SMLIFE') THEN 'XUONG_PREMIUM'
             ELSE 'XUONG_THUONG' END
    END AS nhom
  FROM khach_hang
  WHERE t6_2025 IS NOT NULL AND t6_2025 != ''
) AS k
WHERE d.nhom IS NULL AND d.ten_kh IS NOT NULL AND d.ten_kh != '' AND d.ten_kh = k.ten_kh;

-- ============ Bước 3: bổ sung khách có trong khach_hang nhưng chưa có trong danh_sach_khach ============
INSERT INTO danh_sach_khach (ma_kh, ten_kh, loai_op, doi_tuong, vung, hang, nhom)
SELECT
  k.ma_kh, k.ten_kh, 'OP1', k.doi_tuong, k.vung, k.hang, k.nhom
FROM (
  SELECT
    ma_kh, ten_kh,
    CASE WHEN t6_2025 LIKE 'PREMIER%' THEN 'PREMIER'
         WHEN t6_2025 LIKE 'PREMIUM%' THEN 'PREMIUM' END AS doi_tuong,
    CASE WHEN t6_2025 LIKE 'PREMIER%' THEN
      CASE WHEN phan_loai = 'DM' THEN 'SaiGon'
           WHEN phan_loai = 'DLND' THEN 'NgoaiThanh'
           ELSE 'Tinh' END
    END AS vung,
    CASE WHEN t6_2025 LIKE 'PREMIUM%' THEN
      CASE WHEN ma_kh IN ('YCHI','YCHIKLN','TINHANH','TINHANHCT','NTSTARHOME','NTSTARHOMEJSC','SMLIFE') THEN 'Premium'
           ELSE 'Thuong' END
    END AS hang,
    CASE
      WHEN t6_2025 LIKE 'PREMIER%' THEN
        CASE WHEN phan_loai = 'DM' THEN 'DL_SAI_GON'
             WHEN phan_loai = 'DLND' THEN 'DL_NGOAI_THANH'
             ELSE 'DL_TINH' END
      WHEN t6_2025 LIKE 'PREMIUM%' THEN
        CASE WHEN ma_kh IN ('YCHI','YCHIKLN','TINHANH','TINHANHCT','NTSTARHOME','NTSTARHOMEJSC','SMLIFE') THEN 'XUONG_PREMIUM'
             ELSE 'XUONG_THUONG' END
    END AS nhom
  FROM khach_hang
  WHERE t6_2025 IS NOT NULL AND t6_2025 != ''
) AS k
WHERE NOT EXISTS (SELECT 1 FROM danh_sach_khach d WHERE d.ma_kh = k.ma_kh)
ON CONFLICT(ma_kh) DO UPDATE SET
  ten_kh = excluded.ten_kh,
  doi_tuong = excluded.doi_tuong,
  vung = excluded.vung,
  hang = excluded.hang,
  nhom = excluded.nhom;

-- ============ Bước 4: còn lại chưa phân → mặc định Xưởng thường ============
UPDATE danh_sach_khach
SET doi_tuong = 'PREMIUM',
    hang = 'Thuong',
    nhom = 'XUONG_THUONG'
WHERE nhom IS NULL;
