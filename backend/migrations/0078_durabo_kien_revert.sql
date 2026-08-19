-- 0078: Hoàn tác 0077 — giữ DURABO kiện theo mức thực tế đang áp dụng từng tháng.
-- Đối chiếu 08/2026: đa số dòng Durabo kiện thực nhận 5-6% (HSD/OP2 theo hợp đồng riêng),
-- chỉ 2-3 khách nhận 10-11%. Giữ ck_op1 = 5% để khớp thực tế (policy_rules giữ 10% cho trường
-- hợp áp theo chính sách 2026 mới). 0077 làm pass hệ thống tụt 812→853 sai.
UPDATE ck_op1
SET dl_tinh = 0.05, dl_nt = 0.05, dl_sg = 0.05,
    xuong_thuong = 0, xuong_premium = 0
WHERE nhom_sp = 'DURABO' AND dieu_kien = 'kien';