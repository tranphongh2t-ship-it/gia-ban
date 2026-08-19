-- 0052: Sửa lại Lớp 2 (CK vận chuyển) — Tinh 4% là điều kiện (tự lấy hàng), không gộp cố định vào Lớp 3.
-- Đảo lại migration 0049: Lớp 3 Tinh trở về 20%/9%, CK vận chuyển Tinh trở về 4%/1%.

UPDATE policy_revenue_tiers SET pct_98mau = 0.20, pct_khac = 0.09
WHERE vung = 'Tinh' AND hang = 'OP1' AND bac_tu = 0;

UPDATE ck_van_chuyen SET pct_mdf_mel = 0.04, pct_khac = 0.01 WHERE vung = 'Tinh';
