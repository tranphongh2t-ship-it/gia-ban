-- 0097: Thêm indexes để giảm D1 rows read (free tier safety)
-- Mỗi index giúp query skip full table scan → giảm 90%+ rows read
-- Chi tiết phân tích: xem README.md phần "D1 Index Guidelines"

-- === LARGE TABLES (10K+ rows) — highest impact ===

-- so_chi_tiet_ban_hang (16K rows): lookup theo ma_hang (most common filter)
CREATE INDEX IF NOT EXISTS idx_sctbh_ma_hang ON so_chi_tiet_ban_hang(ma_hang);

-- so_chi_tiet_ban_hang: lookup theo ma_kh cho CK calculation
CREATE INDEX IF NOT EXISTS idx_sctbh_ma_kh ON so_chi_tiet_ban_hang(ma_kh);

-- so_chi_tiet_ban_hang: composite index cho luy-tien (progressive revenue)
CREATE INDEX IF NOT EXISTS idx_sctbh_kh_ngay ON so_chi_tiet_ban_hang(ma_kh, ngay);

-- === MEDIUM TABLES (3K-6K rows) ===

-- danh_sach_khach: filter theo nhom cho CK condition matching
CREATE INDEX IF NOT EXISTS idx_dskh_nhom ON danh_sach_khach(nhom);

-- danh_sach_khach: filter theo vung cho regional discount
CREATE INDEX IF NOT EXISTS idx_dskh_vung ON danh_sach_khach(vung);

-- khach_hang: lookup theo sales_phu_trach_id (phan-quyen cleanup)
CREATE INDEX IF NOT EXISTS idx_kh_sales_phu_trach ON khach_hang(sales_phu_trach_id);

-- === AUDIT / TTL TABLES ===

-- check_chiet_khau_test: composite cho CK calculation (ma_hang + ngay)
CREATE INDEX IF NOT EXISTS idx_cck_ma_ngay ON check_chiet_khau_test(ma_hang, ngay);

-- check_chiet_khau_test: TTL cleanup cần lookup theo created_at + owner
CREATE INDEX IF NOT EXISTS idx_cck_created_owner ON check_chiet_khau_test(created_at, owner_user_id);

-- so_doi_chieu: composite cho sync lookup (ma_hang + ngay + so_ct)
CREATE INDEX IF NOT EXISTS idx_sdc_ma_ngay_ct ON so_doi_chieu(ma_hang, ngay_chung_tu, so_chung_tu);

-- so_doi_chieu: TTL cleanup
CREATE INDEX IF NOT EXISTS idx_sdc_created_owner ON so_doi_chieu(created_at, owner_user_id);

-- === PRAGMA optimize để D1 cập nhật query planner statistics ===
PRAGMA optimize;
