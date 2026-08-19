-- 0089: Dữ kiện 08/2026 — đại lý Sài Gòn/Ngoại thành cho xe tới lấy hàng > 2 tấn được +1% CK vận chuyển.
-- Mel: SG/NT pct_mdf_mel 0 -> 1%, ngưỡng 65 tấm 17mm (xe 2,5 tấn). Tỉnh giữ 4% (ngưỡng 0). PREMIUM giữ 0.

UPDATE ck_van_chuyen SET pct_mdf_mel = 0.01, nguong_kien = 65
WHERE doi_tuong = 'PREMIER' AND vung IN ('SaiGon', 'NgoaiThanh');
