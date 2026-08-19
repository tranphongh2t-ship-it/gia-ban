-- 0090: Hoàn tác 0089 — quy tắc "SG xe > 2 tấn" triển khai bằng cờ tu_lay thay vì suy đoán khối lượng đơn.
-- Đưa ck_van_chuyen SG/NT về mức cũ (Mel 0%, ngưỡng 100).

UPDATE ck_van_chuyen SET pct_mdf_mel = 0, nguong_kien = 100
WHERE doi_tuong = 'PREMIER' AND vung IN ('SaiGon', 'NgoaiThanh');
