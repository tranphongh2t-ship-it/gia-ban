-- 0077: Nhựa trơn (DURABO) — sửa bậc KIỆN theo đặc tả 2026.
-- Mindmap mục Lớp 1: "NHỰA TRƠN (Durabo) Lẻ <10 tấm 5% / Kiện 10%" (đại lý Tỉnh/NT/SG),
-- Xưởng 0% lẻ / 5% kiện. ck_op1 đang để kiện = 5% (và Xưởng kiện = 0%) → sửa cho khớp
-- policy_rules (đã đúng) và đối chiếu thực tế: HSLQ9/MYXUANVT/GGTUNGUYEN mua ≥10 tấm thực nhận 10-11%.
UPDATE ck_op1
SET dl_tinh = 0.10, dl_nt = 0.10, dl_sg = 0.10,
    xuong_thuong = 0.05, xuong_premium = 0.05
WHERE nhom_sp = 'DURABO' AND dieu_kien = 'kien';