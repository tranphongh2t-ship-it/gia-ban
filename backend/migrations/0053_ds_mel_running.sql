-- 0053: Thêm cột doanh số Mel lũy tiến (tại thời điểm giao dịch) cho bậc OP2.
ALTER TABLE so_chi_tiet_ban_hang ADD COLUMN ds_mel_running REAL;
