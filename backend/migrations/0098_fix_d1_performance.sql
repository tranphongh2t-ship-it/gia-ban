-- 0098: Fix D1 free tier performance (5M reads/day limit)
-- Root cause analysis from D1 dashboard:
-- 1. SELECT * FROM danh_sach_khach: 21.4% (619K rows, 112 calls) → reduce to specific columns
-- 2. SELECT DISTINCT ma_kh WHERE substr(ngay,...): 6.48% (981K rows, 122 calls) → add expression index
-- 3. SELECT COUNT(*) FROM gia_ban JOIN ma_misa: 2.38% (883K rows, 11 calls) → add index
-- 4. SELECT * FROM bang_gia_chuan_tinh_gia_vmh: 2.24% (130K rows, 2 calls) → add sort index
-- 5. Complex stats query on so_chi_tiet_ban_hang: 7.02% (704K rows, 7 calls) → already indexed

-- === HIGH IMPACT: Expression index for month extraction ===
-- The query `WHERE substr(ngay,7,4) || '-' || substr(ngay,4,2) = ?` cannot use ngay index
-- This expression index lets SQLite pre-compute the YYYY-MM for each row
CREATE INDEX IF NOT EXISTS idx_sctbh_thang ON so_chi_tiet_ban_hang(substr(ngay, 7, 4) || '-' || substr(ngay, 4, 2));

-- === MEDIUM IMPACT: Index for bang_gia_chuan_tinh_gia_vmh ORDER BY ===
-- Query: ORDER BY board_quy_cach, board_loai, ma_mau, so_mat (130K rows, no index)
CREATE INDEX IF NOT EXISTS idx_vmh_sort ON bang_gia_chuan_tinh_gia_vmh(board_quy_cach, board_loai, ma_mau, so_mat);

-- === MEDIUM IMPACT: Index for gia_ban LEFT JOIN ma_misa count ===
-- Query: SELECT COUNT(*) FROM gia_ban t LEFT JOIN ma_misa m ON t.ma_sp = m.ma_sp (883K rows)
-- gia_ban already has idx_gb_ma on ma_sp, but LEFT JOIN reads all rows
-- Adding a composite index helps the join avoid scanning all gia_ban rows
CREATE INDEX IF NOT EXISTS idx_gb_gia_goc ON gia_ban(ma_sp, gia_goc) WHERE gia_goc IS NOT NULL AND gia_goc > 0;

-- === LOW IMPACT: Index for bang_gia_chuan_tinh_gia_vmh ma_sp lookup ===
-- Used in giaGocSync.ts for price sync
CREATE INDEX IF NOT EXISTS idx_vmh_ma_sp ON bang_gia_chuan_tinh_gia_vmh(ma_sp) WHERE ma_sp IS NOT NULL AND ma_sp != '';

-- === PRAGMA optimize ===
PRAGMA optimize;
