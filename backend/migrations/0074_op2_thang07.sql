-- 0074: OP2 bậc tháng 07 = tháng 06 (CK file), riêng Quốc Tuấn 24/13 và Ngọc Thơm 25/14 đổi trước.
-- Đối chiếu CK áp dụng theo tháng (T6): TOANPHAT 25/14, SG còn lại 26/15, 2 khách top 27/16,
-- Tỉnh còn lại 23/12 — giống hệt chuẩn tháng 08 (0070) vì giữa 6→8 chỉ 2 khách này đổi.
-- Vì vậy tháng 07 = tháng 08; sao chép từ op2_bac_thang tháng 08.
INSERT OR REPLACE INTO op2_bac_thang (ma_kh, thang, pct_98mau, pct_khac)
SELECT ma_kh, '2026-07', pct_98mau, pct_khac
FROM op2_bac_thang
WHERE thang = '2026-08';