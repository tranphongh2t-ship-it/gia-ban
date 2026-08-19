import { Hono } from 'hono'
import { isBangGiaLocked } from '../helpers/bangGiaLock'

const router = new Hono<{ Bindings: { DB: D1Database } }>()

// GET /api/bang-gia-lock — trạng thái khóa hiện tại (mọi người đọc được)
router.get('/', async (c) => {
  try {
    const locked = await isBangGiaLocked(c.env.DB)
    return c.json({ locked })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/bang-gia-lock — bật/tắt khóa (chỉ Admin)
router.post('/', async (c) => {
  try {
    const { DB } = c.env
    const userId = c.req.header('x-user-id')
    if (!userId) return c.json({ error: 'Unauthorized' }, 401)

    const user = await DB.prepare(`SELECT id, ten, vai_tro FROM nhan_vien WHERE id = ?`).bind(userId).first() as any
    if (!user) return c.json({ error: 'User not found' }, 404)
    if (user.vai_tro !== 'admin') return c.json({ error: 'Chỉ Admin mới được bật/tắt khóa' }, 403)

    const { locked } = await c.req.json()
    if (typeof locked !== 'boolean') return c.json({ error: 'Invalid payload' }, 400)

    await DB.prepare(
      `INSERT INTO bang_gia_lock (id, locked, updated_by, updated_at) VALUES (1, ?, ?, datetime('now','+7 hours'))
       ON CONFLICT(id) DO UPDATE SET locked = excluded.locked, updated_by = excluded.updated_by, updated_at = excluded.updated_at`
    ).bind(locked ? 1 : 0, user.ten || null).run()

    return c.json({ success: true, locked })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default router
