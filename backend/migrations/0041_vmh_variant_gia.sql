-- 0041: Giá VMH chuẩn (tong_gia) cho TẤT CẢ mã biến thể cùng một line ván.
-- Sync đồng loạt: mỗi key (board_loai|dd|mau|so) trong VMH_SP_MAP ứng với 1 mã đại diện,
-- nhưng thực tế MISA có nhiều mã biến thể (T/SH/MW/SN/G/PL/... x DW/KG) cùng line.
-- Bảng này ghi (variant_ma -> tong_gia) để:
--   - tinh-gia-vmh/tinh-toan: đẩy giá VMH lên MISA cho mọi biến thể
--   - recompute gia_goc_ngay: dùng giá VMH chuẩn làm ưu tiên số 0 cho audit
CREATE TABLE IF NOT EXISTS vmh_variant_gia (
  variant_ma TEXT PRIMARY KEY,
  tong_gia REAL NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now','+7 hours'))
);