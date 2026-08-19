-- 0043: Khóa toàn bộ 12 nhóm bảng trong "Bảng Tính Giá"
-- Công tắc an toàn chỉ dành cho Admin:
--   - locked = 0 (MẶC ĐỊNH, sau deploy): mở khóa, mọi phân quyền ghi tay hoạt động bình thường.
--   - locked = 1: chặn MỌI thay đổi tay trên UI (thêm/sửa/xóa dòng, gán mã, xóa mã)
--     cho các bảng nhỏ (bang_gia_chuan_*) và bảng giá gốc (bang_gia_chuan_tinh_gia_*).
--     Các luồng TỰ ĐỘNG (tinh-toan, auto-assign, auto-generate, đồng bộ MISA, auto-xu-ly import) vẫn chạy.
CREATE TABLE IF NOT EXISTS bang_gia_lock (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  locked INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT,
  updated_at TEXT DEFAULT (datetime('now','+7 hours'))
);

INSERT OR IGNORE INTO bang_gia_lock (id, locked) VALUES (1, 0);
