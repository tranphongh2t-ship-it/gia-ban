import { Hono } from 'hono'

const router = new Hono<{ Bindings: { DB: D1Database } }>()

async function ensureTable(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS device_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      user_name TEXT,
      user_id INTEGER,
      action TEXT NOT NULL,
      detail TEXT,
      app_version TEXT,
      created_at TEXT DEFAULT (datetime('now','+7 hours'))
    )
  `).run()
  try { await db.prepare(`CREATE INDEX IF NOT EXISTS idx_device_logs_device_id ON device_logs(device_id)`).run() } catch {}
  try { await db.prepare(`CREATE INDEX IF NOT EXISTS idx_device_logs_created_at ON device_logs(created_at)`).run() } catch {}
  try { await db.prepare(`CREATE INDEX IF NOT EXISTS idx_device_logs_action ON device_logs(action)`).run() } catch {}
}

// POST /api/device-logs — Ghi nhật ký hoạt động từ app desktop
router.post('/', async (c) => {
  const { DB } = c.env
  await ensureTable(DB)

  const body = await c.req.json() as {
    device_id: string
    user_name?: string
    user_id?: number
    action: string
    detail?: string
    app_version?: string
  }

  if (!body.device_id || !body.action) {
    return c.json({ error: 'Missing device_id or action' }, 400)
  }

  const result = await DB.prepare(
    `INSERT INTO device_logs (device_id, user_name, user_id, action, detail, app_version)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    body.device_id,
    body.user_name || null,
    body.user_id || null,
    body.action,
    body.detail || null,
    body.app_version || null
  ).run()

  return c.json({ id: Number(result.meta.last_row_id), success: true }, 201)
})

// POST /api/device-logs/batch — Ghi nhiều log cùng lúc
router.post('/batch', async (c) => {
  const { DB } = c.env
  await ensureTable(DB)

  const { logs } = await c.req.json() as {
    logs: Array<{
      device_id: string
      user_name?: string
      user_id?: number
      action: string
      detail?: string
      app_version?: string
    }>
  }

  if (!Array.isArray(logs) || logs.length === 0) {
    return c.json({ error: 'No logs' }, 400)
  }

  const stmts = logs.map(l => DB.prepare(
    `INSERT INTO device_logs (device_id, user_name, user_id, action, detail, app_version)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(l.device_id, l.user_name || null, l.user_id || null, l.action, l.detail || null, l.app_version || null))

  await DB.batch(stmts)
  return c.json({ success: true, count: logs.length }, 201)
})

// GET /api/device-logs — Danh sách log (admin query)
router.get('/', async (c) => {
  const { DB } = c.env
  await ensureTable(DB)

  const userId = c.req.header('x-user-id')
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)

  const user = await DB.prepare(`SELECT vai_tro FROM nhan_vien WHERE id = ?`).bind(userId).first() as any
  if (!user || user.vai_tro !== 'admin') return c.json({ error: 'Admin only' }, 403)

  const url = new URL(c.req.url)
  const deviceId = url.searchParams.get('device_id')
  const action = url.searchParams.get('action')
  const limit = Math.min(Number(url.searchParams.get('limit') || 200), 1000)
  const offset = Number(url.searchParams.get('offset') || 0)
  const from = url.searchParams.get('from')   // ISO date
  const to = url.searchParams.get('to')       // ISO date

  let sql = `SELECT * FROM device_logs WHERE 1=1`
  const params: any[] = []

  if (deviceId) { sql += ` AND device_id = ?`; params.push(deviceId) }
  if (action) { sql += ` AND action = ?`; params.push(action) }
  if (from) { sql += ` AND created_at >= ?`; params.push(from) }
  if (to) { sql += ` AND created_at <= ?`; params.push(to) }

  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
  params.push(limit, offset)

  const rows = await DB.prepare(sql).bind(...params).all()

  // Count total
  let countSql = `SELECT COUNT(*) as total FROM device_logs WHERE 1=1`
  const countParams: any[] = []
  if (deviceId) { countSql += ` AND device_id = ?`; countParams.push(deviceId) }
  if (action) { countSql += ` AND action = ?`; countParams.push(action) }
  if (from) { countSql += ` AND created_at >= ?`; countParams.push(from) }
  if (to) { countSql += ` AND created_at <= ?`; countParams.push(to) }
  const countRow = await DB.prepare(countSql).bind(...countParams).first() as any

  return c.json({
    logs: rows.results || [],
    total: countRow?.total || 0,
    limit,
    offset,
  })
})

// GET /api/device-logs/devices — Danh sách các thiết bị đã ghi log
router.get('/devices', async (c) => {
  const { DB } = c.env
  await ensureTable(DB)

  const userId = c.req.header('x-user-id')
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)
  const user = await DB.prepare(`SELECT vai_tro FROM nhan_vien WHERE id = ?`).bind(userId).first() as any
  if (!user || user.vai_tro !== 'admin') return c.json({ error: 'Admin only' }, 403)

  const rows = await DB.prepare(`
    SELECT device_id,
           MIN(user_name) as user_name,
           MIN(app_version) as app_version,
           COUNT(*) as log_count,
           MAX(created_at) as last_seen
    FROM device_logs
    GROUP BY device_id
    ORDER BY last_seen DESC
  `).all()

  return c.json(rows.results || [])
})

// GET /api/device-logs/actions — Danh sách các action types
router.get('/actions', async (c) => {
  const { DB } = c.env
  await ensureTable(DB)

  const rows = await DB.prepare(`
    SELECT action, COUNT(*) as count
    FROM device_logs
    GROUP BY action
    ORDER BY count DESC
  `).all()

  return c.json(rows.results || [])
})

// DELETE /api/device-logs/cleanup — Xóa log cũ hơn N ngày (admin only)
router.delete('/cleanup', async (c) => {
  const { DB } = c.env
  await ensureTable(DB)

  const userId = c.req.header('x-user-id')
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)
  const user = await DB.prepare(`SELECT vai_tro FROM nhan_vien WHERE id = ?`).bind(userId).first() as any
  if (!user || user.vai_tro !== 'admin') return c.json({ error: 'Admin only' }, 403)

  const url = new URL(c.req.url)
  const days = Number(url.searchParams.get('days') || 90)

  const result = await DB.prepare(
    `DELETE FROM device_logs WHERE created_at < datetime('now','+7 hours','-${days} days')`
  ).run()

  return c.json({ success: true, deleted: result.meta.changes })
})

export default router
