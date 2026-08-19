// Trạng thái khóa Bảng Tính Giá (12 nhóm)
// - locked = 1: chặn MỌI ghi tay (thêm/sửa/xóa dòng, gán mã, xóa mã).
//   Các luồng tự động (tinh-toan, auto-assign, auto-generate, đồng bộ MISA, auto-xu-ly import) VẪN chạy.
// - locked = 0 (mặc định): phân quyền ghi tay hoạt động bình thường.

export async function isBangGiaLocked(db: D1Database): Promise<boolean> {
  try {
    const row = await db.prepare('SELECT locked FROM bang_gia_lock WHERE id = 1').first() as any
    return row ? row.locked === 1 : false
  } catch {
    return false
  }
}
