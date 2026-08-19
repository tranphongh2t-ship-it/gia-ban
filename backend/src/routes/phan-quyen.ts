import { Hono } from 'hono'

const router = new Hono<{ Bindings: { DB: D1Database } }>()

const ALL_MENU_ITEMS = [
  { key: 'menu:/', label: 'Dashboard', group: 'Tổng quan' },
  { key: 'menu:/dashboard', label: 'Dashboard (route)', group: 'Tổng quan' },
  { key: 'menu:/check-gia-goc', label: 'Check Giá Gốc', group: 'Check Giá Gốc' },
  { key: 'menu:/tinh-gia-goc', label: 'Tính giá gốc', group: 'Check Giá Gốc' },
  { key: 'menu:/audit-gia-ck', label: 'Check giá gốc - CK', group: 'Check Giá Gốc' },
  { key: 'menu:/ma-misa', label: 'Mã MISA', group: 'Danh mục' },
  { key: 'menu:/gia-ban-misa', label: 'Giá bán (MISA)', group: 'Danh mục' },
  { key: 'menu:/bang-tinh-gia', label: 'Bảng Tính Giá', group: 'Bảng Tính Giá' },
  { key: 'menu:/gia-van-tron', label: 'Giá Ván Trơn', group: 'Bảng Tính Giá' },
  { key: 'menu:/bang-gia-cot-go', label: 'Cốt gỗ', group: 'Bảng Tính Giá' },
  { key: 'menu:/bang-gia-nhom-mau', label: 'Nhóm màu', group: 'Bảng Tính Giá' },
  { key: 'menu:/bang-gia-ma-mau', label: 'Mã màu', group: 'Bảng Tính Giá' },
  { key: 'menu:/veneer', label: 'Veneer', group: '8 Nhóm Nhỏ' },
  { key: 'menu:/chi', label: 'Chỉ', group: '8 Nhóm Nhỏ' },
  { key: 'menu:/keo-nong', label: 'Keo dán chỉ', group: '8 Nhóm Nhỏ' },
  { key: 'menu:/van-phu-acrylic', label: 'Ván phủ Acrylic', group: '8 Nhóm Nhỏ' },
  { key: 'menu:/van-phu-pvc', label: 'Ván phủ PVC', group: '8 Nhóm Nhỏ' },
  { key: 'menu:/nhua-phu-mau', label: 'Melamine', group: '8 Nhóm Nhỏ' },
  { key: 'menu:/nhua-laminate', label: 'Ván phủ Laminate', group: '8 Nhóm Nhỏ' },

  { key: 'menu:/bang-gia-ck', label: 'Bảng giá CK', group: 'Chiết khấu' },
  { key: 'menu:/phan-bo-kh', label: 'Phân bổ KH', group: 'Chiết khấu' },
  { key: 'menu:/danh-sach-khach', label: 'Danh sách KH', group: 'Chiết khấu' },
  { key: 'menu:/chiet-khau', label: 'Đối chiếu chiết khấu', group: 'Chiết khấu' },
  { key: 'menu:/danh-sach-khach-nhom', label: 'Danh sách KH 5 nhóm', group: 'Chiết khấu' },
  { key: 'menu:/quan-ly-thang', label: 'Quản lý tháng', group: 'Chiết khấu' },
  { key: 'menu:/check-chiet-khau', label: 'Check chiết khấu (test)', group: 'Chiết khấu' },
  { key: 'menu:/bang-khach-thang', label: 'Khách hàng theo tháng', group: 'Chiết khấu' },
  { key: 'menu:/so-sanh-gia-goc', label: 'So sánh giá gốc', group: 'Dữ liệu' },
  { key: 'menu:/gia-goc-tong-hop', label: 'Đối chiếu MISA · Giá gốc tổng hợp', group: 'Đối chiếu MISA' },
  { key: 'menu:/kiem-tra-bang-tinh-gia', label: 'Đối chiếu MISA · Kiểm tra Bảng Tính Giá', group: 'Đối chiếu MISA' },
  { key: 'menu:/so-chi-tiet-ban-hang', label: 'Sổ chi tiết bán hàng', group: 'Dữ liệu' },
  { key: 'menu:/don-hang-excel', label: 'Đơn hàng', group: 'Dữ liệu' },
  { key: 'menu:/import-export', label: 'Import/Export', group: 'Công cụ' },
  { key: 'menu:/phu-thu', label: 'Phụ thu', group: 'Công cụ' },
  { key: 'menu:/phan-quyen', label: 'Phân quyền', group: 'Công cụ' },
  { key: 'menu:/log-thay-doi', label: 'Log lịch sử thay đổi', group: 'Công cụ' },
]

const ALL_FEATURES = [
  { key: 'feature:import-export', label: 'Import/Export dữ liệu' },
  { key: 'feature:dong-bo-gia-goc', label: 'Đồng bộ giá gốc ← Đơn giá' },
  { key: 'feature:edit-data', label: 'Được chỉnh sửa dữ liệu (Thêm/Sửa/Xoá/Tính toán/Đồng bộ)' },
]

async function hashPass(pass: string): Promise<string> {
  const enc = new TextEncoder().encode(pass)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function ensureTables(db: D1Database) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS phan_quyen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nguoi_dung_id INTEGER NOT NULL REFERENCES nhan_vien(id),
      permission TEXT NOT NULL,
      UNIQUE(nguoi_dung_id, permission)
    )`
  ).run()

  // Add mat_khau column if missing
  try { await db.prepare(`ALTER TABLE nhan_vien ADD COLUMN mat_khau TEXT`).run() } catch {}
  // Add last_seen_at column if missing (trạng thái online/offline)
  try { await db.prepare(`ALTER TABLE nhan_vien ADD COLUMN last_seen_at TEXT`).run() } catch {}
}

// User được xem là ONLINE nếu có tín hiệu trong vòng 2 phút (heartbeat mỗi 30 giây)
const ONLINE_WINDOW_SECONDS = 120

function onlineExpr(): string {
  return `CASE WHEN last_seen_at IS NOT NULL
    AND (julianday(datetime('now','+7 hours')) - julianday(last_seen_at)) * 86400 < ${ONLINE_WINDOW_SECONDS}
    THEN 1 ELSE 0 END`
}

async function seedAdmin(db: D1Database) {
  // Check if "Admin" user exists
  const existing = await db.prepare(`SELECT id FROM nhan_vien WHERE ten = 'Admin'`).first() as any
  if (existing) {
    // Ensure password is set
    const hash = await hashPass('Bangdang190891')
    await db.prepare(`UPDATE nhan_vien SET mat_khau = ?, vai_tro = 'admin' WHERE id = ?`).bind(hash, existing.id).run()
    return existing.id
  }
  // Create admin
  const hash = await hashPass('Bangdang190891')
  const result = await db.prepare(
    `INSERT INTO nhan_vien (ten, email, vai_tro, trang_thai, mat_khau) VALUES ('Admin', 'admin@bangdang.com', 'admin', 'dang_lam_viec', ?)`
  ).bind(hash).run()
  return Number(result.meta.last_row_id)
}

// GET /api/auth/users — danh sách người dùng
router.get('/users', async (c) => {
  const { DB } = c.env
  await ensureTables(DB)
  await seedAdmin(DB)
  const users = await DB.prepare(
    `SELECT id, ten, email, vai_tro, trang_thai, last_seen_at, ${onlineExpr()} AS online FROM nhan_vien ORDER BY ten`
  ).all()
  return c.json(users.results || [])
})

// POST /api/auth/heartbeat — cập nhật last_seen_at của user đang đăng nhập
router.post('/heartbeat', async (c) => {
  const { DB } = c.env
  const userId = c.req.header('x-user-id')
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)
  await ensureTables(DB)
  await DB.prepare(
    `UPDATE nhan_vien SET last_seen_at = datetime('now','+7 hours') WHERE id = ?`
  ).bind(userId).run()
  return c.json({ success: true })
})

// GET /api/auth/menu-items — danh sách menu + features
router.get('/menu-items', (c) => {
  return c.json({ menu_items: ALL_MENU_ITEMS, features: ALL_FEATURES })
})

// POST /api/auth/login — đăng nhập bằng username + password
router.post('/login', async (c) => {
  const { DB } = c.env
  await ensureTables(DB)
  const adminId = await seedAdmin(DB)

  const { username, password } = await c.req.json()
  if (!username || !password) return c.json({ error: 'Missing username or password' }, 400)

  const user = await DB.prepare(
    `SELECT id, ten, email, vai_tro, trang_thai, mat_khau FROM nhan_vien WHERE ten = ?`
  ).bind(username).first() as any
  if (!user) return c.json({ error: 'Sai tên đăng nhập hoặc mật khẩu' }, 401)
  if (user.trang_thai === 'da_nghi_viec') return c.json({ error: 'Tài khoản đã ngừng hoạt động' }, 403)

  const hash = await hashPass(password)
  if (user.mat_khau !== hash) return c.json({ error: 'Sai tên đăng nhập hoặc mật khẩu' }, 401)

  const permRows = await DB.prepare(
    `SELECT permission FROM phan_quyen WHERE nguoi_dung_id = ?`
  ).bind(user.id).all()
  const permissions = (permRows.results || []).map((r: any) => r.permission)

  const isAdmin = user.vai_tro === 'admin'
  // Đánh dấu online ngay khi đăng nhập
  await DB.prepare(
    `UPDATE nhan_vien SET last_seen_at = datetime('now','+7 hours') WHERE id = ?`
  ).bind(user.id).run()
  return c.json({
    id: user.id, ten: user.ten, email: user.email,
    vai_tro: user.vai_tro, is_admin: isAdmin,
    permissions: isAdmin ? ['*'] : permissions,
  })
})

// GET /api/auth/me — lấy thông tin user hiện tại + permissions
router.get('/me', async (c) => {
  const { DB } = c.env
  const userId = c.req.header('x-user-id')
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)

  const user = await DB.prepare(
    `SELECT id, ten, email, vai_tro FROM nhan_vien WHERE id = ?`
  ).bind(userId).first() as any
  if (!user) return c.json({ error: 'User not found' }, 404)

  const permRows = await DB.prepare(
    `SELECT permission FROM phan_quyen WHERE nguoi_dung_id = ?`
  ).bind(user.id).all()
  const permissions = (permRows.results || []).map((r: any) => r.permission)

  const isAdmin = user.vai_tro === 'admin'
  // Đánh dấu online khi mở lại app / xác thực lại
  await DB.prepare(
    `UPDATE nhan_vien SET last_seen_at = datetime('now','+7 hours') WHERE id = ?`
  ).bind(user.id).run()
  return c.json({
    id: user.id, ten: user.ten, email: user.email,
    vai_tro: user.vai_tro, is_admin: isAdmin,
    permissions: isAdmin ? ['*'] : permissions,
  })
})

// GET /api/auth/permissions/:id — lấy permissions của user
router.get('/permissions/:id', async (c) => {
  const { DB } = c.env
  await ensureTables(DB)
  const id = parseInt(c.req.param('id'))
  if (!id) return c.json({ error: 'Invalid id' }, 400)

  const user = await DB.prepare(
    `SELECT id, ten, vai_tro FROM nhan_vien WHERE id = ?`
  ).bind(id).first() as any
  if (!user) return c.json({ error: 'User not found' }, 404)

  const permRows = await DB.prepare(
    `SELECT permission FROM phan_quyen WHERE nguoi_dung_id = ?`
  ).bind(id).all()
  const permissions = (permRows.results || []).map((r: any) => r.permission)

  return c.json({
    user: { id: user.id, ten: user.ten, vai_tro: user.vai_tro },
    is_admin: user.vai_tro === 'admin',
    permissions,
  })
})

// PUT /api/auth/permissions/:id — cập nhật permissions
router.put('/permissions/:id', async (c) => {
  const { DB } = c.env
  await ensureTables(DB)
  const id = parseInt(c.req.param('id'))
  if (!id) return c.json({ error: 'Invalid id' }, 400)

  const { permissions } = await c.req.json() as { permissions: string[] }
  if (!Array.isArray(permissions)) return c.json({ error: 'Invalid permissions' }, 400)

  const user = await DB.prepare(`SELECT id, vai_tro FROM nhan_vien WHERE id = ?`).bind(id).first() as any
  if (!user) return c.json({ error: 'User not found' }, 404)

  if (user.vai_tro === 'admin') {
    return c.json({ success: true, message: 'Admin always has all permissions' })
  }

  await DB.prepare(`DELETE FROM phan_quyen WHERE nguoi_dung_id = ?`).bind(id).run()
  const stmts = permissions.map(p => DB.prepare(
    `INSERT INTO phan_quyen (nguoi_dung_id, permission) VALUES (?, ?)`
  ).bind(id, p))
  if (stmts.length > 0) await DB.batch(stmts)

  return c.json({ success: true, count: permissions.length })
})

// POST /api/auth/users — tạo người dùng mới
router.post('/users', async (c) => {
  const { DB } = c.env
  await ensureTables(DB)
  const { ten, password, vai_tro } = await c.req.json()
  if (!ten || !password) return c.json({ error: 'Missing name or password' }, 400)

  const existing = await DB.prepare(`SELECT id FROM nhan_vien WHERE ten = ?`).bind(ten).first()
  if (existing) return c.json({ error: `User "${ten}" already exists` }, 409)

  const hash = await hashPass(password)
  const result = await DB.prepare(
    `INSERT INTO nhan_vien (ten, email, vai_tro, trang_thai, mat_khau) VALUES (?, ?, ?, 'dang_lam_viec', ?)`
  ).bind(ten, `${ten.toLowerCase()}@bangdang.com`, vai_tro || 'user', hash).run()

  return c.json({ id: Number(result.meta.last_row_id), ten, vai_tro: vai_tro || 'user' }, 201)
})

// PUT /api/auth/users/:id — cập nhật người dùng
router.put('/users/:id', async (c) => {
  const { DB } = c.env
  await ensureTables(DB)
  const id = parseInt(c.req.param('id'))
  if (!id) return c.json({ error: 'Invalid id' }, 400)

  const user = await DB.prepare(`SELECT id, ten FROM nhan_vien WHERE id = ?`).bind(id).first() as any
  if (!user) return c.json({ error: 'User not found' }, 404)
  if (user.ten === 'Admin') return c.json({ error: 'Cannot modify Admin' }, 403)

  const { ten, password, vai_tro } = await c.req.json()
  const updates: string[] = []
  const vals: any[] = []
  if (ten) { updates.push('ten = ?'); vals.push(ten) }
  if (password) { updates.push('mat_khau = ?'); vals.push(await hashPass(password)) }
  if (vai_tro) { updates.push('vai_tro = ?'); vals.push(vai_tro) }
  if (updates.length === 0) return c.json({ error: 'Nothing to update' }, 400)

  vals.push(id)
  await DB.prepare(`UPDATE nhan_vien SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run()
  return c.json({ success: true })
})

// DELETE /api/auth/users/:id — xoá người dùng
router.delete('/users/:id', async (c) => {
  const { DB } = c.env
  await ensureTables(DB)
  const id = parseInt(c.req.param('id'))
  if (!id) return c.json({ error: 'Invalid id' }, 400)

  const user = await DB.prepare(`SELECT id, ten FROM nhan_vien WHERE id = ?`).bind(id).first() as any
  if (!user) return c.json({ error: 'User not found' }, 404)
  if (user.ten === 'Admin') return c.json({ error: 'Cannot delete Admin' }, 403)

  try {
    // Nullify FK references before deleting
    await DB.prepare(`UPDATE khach_hang SET sales_phu_trach_id = NULL WHERE sales_phu_trach_id = ?`).bind(id).run()
    await DB.prepare(`UPDATE don_hang SET sales_id = NULL WHERE sales_id = ?`).bind(id).run()
    await DB.prepare(`UPDATE ban SET sales_id = NULL WHERE sales_id = ?`).bind(id).run()
    await DB.prepare(`DELETE FROM phan_quyen WHERE nguoi_dung_id = ?`).bind(id).run()
    await DB.prepare(`DELETE FROM nhan_vien WHERE id = ?`).bind(id).run()
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: `Cannot delete "${user.ten}": ${e.message}` }, 400)
  }
})

// POST /api/auth/xoa-hang-loat — xoá hàng loạt user theo danh sách id
router.post('/xoa-hang-loat', async (c) => {
  const { DB } = c.env
  await ensureTables(DB)
  const { ids } = await c.req.json() as { ids: number[] }
  if (!Array.isArray(ids) || ids.length === 0) return c.json({ error: 'No ids' }, 400)

  const admin = await DB.prepare(`SELECT id FROM nhan_vien WHERE ten = 'Admin'`).first() as any
  const safeIds = admin ? ids.filter(i => i !== admin.id) : ids

  let deleted = 0; const errors: string[] = []
  for (const id of safeIds) {
    try {
      await DB.prepare(`UPDATE khach_hang SET sales_phu_trach_id = NULL WHERE sales_phu_trach_id = ?`).bind(id).run()
      await DB.prepare(`UPDATE don_hang SET sales_id = NULL WHERE sales_id = ?`).bind(id).run()
      await DB.prepare(`UPDATE ban SET sales_id = NULL WHERE sales_id = ?`).bind(id).run()
      await DB.prepare(`DELETE FROM phan_quyen WHERE nguoi_dung_id = ?`).bind(id).run()
      await DB.prepare(`DELETE FROM nhan_vien WHERE id = ?`).bind(id).run()
      deleted++
    } catch (e: any) {
      errors.push(`id ${id}: ${e.message}`)
    }
  }
  return c.json({ success: true, deleted, errors: errors.length > 0 ? errors : undefined })
})

// DELETE /api/auth/xoa-tat-ca — xoá tất cả người dùng trừ Admin
router.delete('/xoa-tat-ca', async (c) => {
  const { DB } = c.env
  await ensureTables(DB)
  const admin = await DB.prepare(`SELECT id FROM nhan_vien WHERE ten = 'Admin'`).first() as any
  if (admin) {
    await DB.prepare(`UPDATE khach_hang SET sales_phu_trach_id = NULL WHERE sales_phu_trach_id != ?`).bind(admin.id).run()
    await DB.prepare(`UPDATE don_hang SET sales_id = NULL WHERE sales_id != ?`).bind(admin.id).run()
    await DB.prepare(`UPDATE ban SET sales_id = NULL WHERE sales_id != ?`).bind(admin.id).run()
    await DB.prepare(`DELETE FROM phan_quyen WHERE nguoi_dung_id != ?`).bind(admin.id).run()
    await DB.prepare(`DELETE FROM nhan_vien WHERE id != ?`).bind(admin.id).run()
  }
  return c.json({ success: true })
})

export default router