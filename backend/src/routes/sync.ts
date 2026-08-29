import { Hono } from 'hono'

type Env = { Bindings: { DB: D1Database } }

const router = new Hono<Env>()

const SYNC_TABLES = [
  'gia_ban', 'gia_ban_tier',
  'bang_gia_veneers', 'bang_gia_chi', 'bang_gia_keo_nong',
  'bang_gia_acrylic_foil', 'bang_gia_van_phu_acrylic',
  'bang_gia_laminate_one', 'bang_gia_pvc_film',
  'bang_gia_van_phu_pvc', 'bang_gia_nhua_phu_mau',
  'bang_gia_nhua_laminate', 'bang_gia_osb_laminate',
  'bang_gia_mirror', 'bang_gia_nhua_pvc',
  'ma_misa', 'khach_hang', 'phu_thu', 'phan_bo_kh',
  'bang_gia_ck', 'bang_gia_cot_go', 'bang_gia_nhom_mau',
  'bang_gia_ma_mau', 'so_chi_tiet_ban_hang', 'don_hang_excel',
]

// Tạo index updated_at cho các bảng sync (chạy 1 lần, rẻ khi đã tồn tại)
let indexEnsured = false
async function ensureSyncIndexes(db: D1Database) {
  if (indexEnsured) return
  for (const table of SYNC_TABLES) {
    try {
      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_${table}_updated ON ${table}(updated_at)`).run()
    } catch { /* bảng không có cột updated_at */ }
  }
  indexEnsured = true
}

router.post('/push', async (c) => {
  try {
    const { changes, user_id, device_id } = await c.req.json() as {
      changes: { table: string; action: string; row_id?: number; payload: Record<string, any>; updated_at: string; updated_by: string }[]
      user_id: number; device_id: string
    }

    const applied: number[] = []
    const conflicts: any[] = []
    const errors: any[] = []

    for (let i = 0; i < changes.length; i++) {
      const ch = changes[i]
      try {
        if (!SYNC_TABLES.includes(ch.table)) {
          errors.push({ index: i, error: `Table ${ch.table} not in sync list` })
          continue
        }

        if (ch.action === 'delete') {
          if (!ch.row_id) { errors.push({ index: i, error: 'Missing row_id for delete' }); continue }
          const existing = await c.env.DB.prepare(
            `SELECT updated_at FROM ${ch.table} WHERE id = ?`
          ).bind(ch.row_id).first() as any
          if (existing && existing.updated_at && existing.updated_at > ch.updated_at) {
            conflicts.push({ index: i, table: ch.table, row_id: ch.row_id, reason: 'remote_newer', remote_updated_at: existing.updated_at })
            continue
          }
          await c.env.DB.prepare(`DELETE FROM ${ch.table} WHERE id = ?`).bind(ch.row_id).run()
          applied.push(i)
        } else {
          const keys = Object.keys(ch.payload)
          const values = Object.values(ch.payload)
          if (!ch.row_id) {
            const placeholders = keys.map(() => '?').join(', ')
            const cols = keys.join(', ')
            const result = await c.env.DB.prepare(
              `INSERT INTO ${ch.table} (${cols}) VALUES (${placeholders})`
            ).bind(...values).run()
            applied.push(i)
          } else {
            const existing = await c.env.DB.prepare(
              `SELECT id, updated_at FROM ${ch.table} WHERE id = ?`
            ).bind(ch.row_id).first() as any
            if (existing && existing.updated_at && existing.updated_at > ch.updated_at) {
              conflicts.push({ index: i, table: ch.table, row_id: ch.row_id, reason: 'remote_newer', remote_updated_at: existing.updated_at })
              continue
            }
            const setClause = keys.map(k => `${k} = ?`).join(', ')
            const result = await c.env.DB.prepare(
              `UPDATE ${ch.table} SET ${setClause} WHERE id = ?`
            ).bind(...values, ch.row_id).run()
            applied.push(i)
          }
        }
      } catch (e: any) {
        errors.push({ index: i, error: e.message })
      }
    }

    return c.json({ applied: applied.length, conflicts, errors })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

router.get('/pull', async (c) => {
  try {
    const since = c.req.query('since') || '1970-01-01'
    const userId = parseInt(c.req.query('user_id') || '0')
    const limit = Math.min(parseInt(c.req.query('limit') || '5000'), 50000)
    await ensureSyncIndexes(c.env.DB)

    // Giới hạn mỗi bảng để tránh query khổng lồ làm quá tải D1 (internal error)
    const perTable = Math.max(50, Math.min(Math.floor(limit / SYNC_TABLES.length), 2000))

    const allChanges: any[] = []
    // Batch all 25 table SELECTs (independent — avoids 25 sequential round-trips)
    const pullStmts = SYNC_TABLES.map(table =>
      c.env.DB.prepare(
        `SELECT *, 'update' as sync_action FROM ${table}
         WHERE updated_at IS NOT NULL AND updated_at > ?
         AND (updated_by IS NULL OR updated_by != ?)
         ORDER BY updated_at ASC LIMIT ?`
      ).bind(since, String(userId), perTable)
    )
    const pullResults = await c.env.DB.batch(pullStmts)
    for (let i = 0; i < SYNC_TABLES.length; i++) {
      const rows = (pullResults[i] as any)
      if (rows?.results?.length > 0) {
        for (const row of rows.results) {
          allChanges.push({ table: SYNC_TABLES[i], action: 'update', row })
        }
      }
    }

    allChanges.sort((a: any, b: any) => (a.row.updated_at || '').localeCompare(b.row.updated_at || ''))

    return c.json({
      changes: allChanges.slice(0, limit),
      total: allChanges.length,
      server_time: new Date().toISOString(),
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

router.get('/status', async (c) => {
  try {
    const info: Record<string, number> = {}
    // Batch all 25 COUNT queries (independent — avoids 25 sequential round-trips)
    const countStmts = SYNC_TABLES.map(table =>
      c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM ${table}`)
    )
    const countResults = await c.env.DB.batch(countStmts)
    for (let i = 0; i < SYNC_TABLES.length; i++) {
      info[SYNC_TABLES[i]] = (countResults[i] as any)?.results?.[0]?.cnt || 0
    }
    return c.json({ tables: info, server_time: new Date().toISOString() })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default router
