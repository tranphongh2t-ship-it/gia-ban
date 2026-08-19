-- 0055: Gộp CK vận chuyển Tinh (4%) vào Lớp 3 — vì không có cột "tự lấy/giao hàng" riêng.
-- ĐL Tinh = 24%/13% (20/9 + 4% VC cố định). SG/NT/PREMIUM giữ mức gốc.
UPDATE policy_revenue_tiers SET pct_98mau = 0.24, pct_khac = 0.13
WHERE vung = 'Tinh' AND hang = 'OP1' AND bac_tu = 0;
