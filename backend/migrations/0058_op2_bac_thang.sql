-- 0058: Lịch sử bậc OP2 theo tháng (bậc cập nhật hàng tháng theo doanh số).
CREATE TABLE IF NOT EXISTS op2_bac_thang (
  ma_kh TEXT NOT NULL,
  thang TEXT NOT NULL,  -- 'YYYY-MM'
  pct_98mau REAL,
  pct_khac REAL,
  PRIMARY KEY (ma_kh, thang)
);

-- NGOCTHOMGL: tháng 07 bậc 2 tỷ (28%/17%), tháng 08 bậc 5 tỷ (29%/18%).
INSERT OR REPLACE INTO op2_bac_thang (ma_kh, thang, pct_98mau, pct_khac) VALUES
  ('NGOCTHOMGL', '2026-07', 0.28, 0.17),
  ('NGOCTHOMGL', '2026-08', 0.29, 0.18);
