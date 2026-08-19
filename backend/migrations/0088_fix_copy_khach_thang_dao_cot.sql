-- 0088: Sửa bug tao-thang copy khach_theo_thang bị đảo (ma_kh, thang).
-- Dọn các dòng rác (ma_kh = tên tháng) do bug tạo ra cho tháng 2026-09 và tháng test 2099-01.
DELETE FROM khach_theo_thang WHERE ma_kh IN ('2026-09', '2099-01');

-- Copy lại override khách tháng 2026-08 → 2026-09 đúng chuẩn (INSERT OR REPLACE)
INSERT OR REPLACE INTO khach_theo_thang
  (ma_kh, thang, loai_op, vung, doi_tuong, hang, nhom, tu_lay, ck_vc_pct, ck_ds_98mau_pct, ck_ds_khac_pct, ck_ct_pct, ghi_chu, updated_at, updated_by)
SELECT ma_kh, '2026-09', loai_op, vung, doi_tuong, hang, nhom, tu_lay, ck_vc_pct, ck_ds_98mau_pct, ck_ds_khac_pct, ck_ct_pct, ghi_chu, datetime('now','+7 hours'), updated_by
FROM khach_theo_thang WHERE thang = '2026-08';
