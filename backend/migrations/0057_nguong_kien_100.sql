-- 0057: Ngưỡng "1 kiện" thực tế = ~100 tấm (quy đổi 17mm), theo reverse-engineering dữ liệu.
UPDATE ck_van_chuyen SET nguong_kien = 100 WHERE nguong_kien IS NOT NULL AND nguong_kien != 0;
