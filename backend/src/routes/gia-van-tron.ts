import { Hono } from 'hono'

type Env = { Bindings: { DB: D1Database } }

const router = new Hono<Env>()

// Get distinct values for filter dropdowns
router.get('/distinct', async (c) => {
  try {
    const { table, field } = c.req.query()
    if (!table || !field) return c.json({ error: 'Missing table or field' }, 400)
    const allowed = ['bang_gia_cot_go', 'bang_gia_nhom_mau', 'bang_gia_ma_mau']
    if (!allowed.includes(table)) return c.json({ error: 'Invalid table' }, 400)
    const result = await c.env.DB.prepare(`SELECT DISTINCT ${field} FROM ${table} WHERE ${field} IS NOT NULL AND ${field} != '' ORDER BY ${field}`).all()
    return c.json({ data: result.results.map((r: any) => r[field]) })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Lookup: find matching records across all 3 tables
router.get('/lookup', async (c) => {
  try {
    const q = c.req.query()
    const results: any = {}

    // Search bang_gia_cot_go
    if (q.loai || q.do_day || q.cap || q.tier) {
      let sql = 'SELECT * FROM bang_gia_cot_go WHERE 1=1'
      const params: any[] = []
      if (q.loai) { sql += ' AND loai = ?'; params.push(q.loai) }
      if (q.do_day) { sql += ' AND do_day = ?'; params.push(q.do_day) }
      if (q.cap) { sql += ' AND cap = ?'; params.push(q.cap) }
      if (q.tier) { sql += ' AND tier = ?'; params.push(q.tier) }
      const r = await c.env.DB.prepare(sql).bind(...params).all()
      results.cot_go = r.results
    }

    // Search bang_gia_nhom_mau
    if (q.bang || q.nhom || q.bmtier) {
      let sql = 'SELECT * FROM bang_gia_nhom_mau WHERE 1=1'
      const params: any[] = []
      if (q.bang) { sql += ' AND bang = ?'; params.push(q.bang) }
      if (q.nhom) { sql += ' AND nhom = ?'; params.push(q.nhom) }
      if (q.bmtier) { sql += ' AND tier = ?'; params.push(q.bmtier) }
      const r = await c.env.DB.prepare(sql).bind(...params).all()
      results.be_mat = r.results
    }

    // Search bang_gia_ma_mau
    if (q.ma_mau || q.mabang || q.matier || q.manhom) {
      let sql = 'SELECT * FROM bang_gia_ma_mau WHERE 1=1'
      const params: any[] = []
      if (q.ma_mau) { sql += ' AND ma_mau LIKE ?'; params.push(`%${q.ma_mau}%`) }
      if (q.mabang) { sql += ' AND bang = ?'; params.push(q.mabang) }
      if (q.matier) { sql += ' AND tier = ?'; params.push(q.matier) }
      if (q.manhom) { sql += ' AND nhom = ?'; params.push(q.manhom) }
      const r = await c.env.DB.prepare(sql).bind(...params).all()
      results.ma_mau = r.results
    }

    return c.json(results)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Quick calculate: total price from components
router.get('/calc', async (c) => {
  try {
    const { loai, do_day, cap, tier, bang, nhom, so_mat } = c.req.query()
    if (!loai || !do_day || !cap || !tier || !bang || !nhom || !so_mat) {
      return c.json({ error: 'Missing required params: loai, do_day, cap, tier, bang, nhom, so_mat' }, 400)
    }

    const core = await c.env.DB.prepare(
      'SELECT gia FROM bang_gia_cot_go WHERE loai = ? AND do_day = ? AND cap = ? AND tier = ?'
    ).bind(loai, do_day, cap, tier).first()

    const surface = await c.env.DB.prepare(
      `SELECT ${so_mat === '1' ? 'gia_1_mat' : 'gia_2_mat'} as gia FROM bang_gia_nhom_mau WHERE bang = ? AND nhom = ? AND tier = ?`
    ).bind(bang, nhom, tier).first()

    return c.json({
      core: (core as any)?.gia || null,
      surface: (surface as any)?.gia || null,
      total: ((core as any)?.gia || 0) + ((surface as any)?.gia || 0),
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export { router }
