import { crudRoutes } from '../helpers/crud'

const app = crudRoutes({
  table: 'ma_misa',
  searchFields: ['ma_sp', 'ten_sp'],
  priceHistory: { historyTable: 'ma_misa_gia_history', priceCol: 'gia_goc', refCol: 'ma_sp' },
})

const today = new Date()
const HCM = new Date(today.getTime() + 7 * 3600 * 1000)
const currentThang = `${HCM.getUTCFullYear()}-${String(HCM.getUTCMonth() + 1).padStart(2, '0')}`

// POST /api/ma-misa/doi-gia  body: { ma_sp, gia_goc, thang?, nguon?, updated_by? }
// Cập nhật giá hiện hành + thêm dòng lịch sử theo tháng.
app.post('/doi-gia', async (c) => {
  try {
    const body = await c.req.json()
    const ma_sp = String(body.ma_sp || '').trim()
    const gia = Number(body.gia_goc)
    if (!ma_sp || isNaN(gia)) return c.json({ error: 'Thiếu ma_sp hoặc gia_goc' }, 400)

    const thang = /^\d{4}-\d{2}$/.test(body.thang || '') ? String(body.thang) : currentThang

    const existing = await c.env.DB.prepare('SELECT id, gia_goc FROM ma_misa WHERE ma_sp = ?').bind(ma_sp).first()
    if (!existing) return c.json({ error: `Không tìm thấy mã ${ma_sp}` }, 404)

    const giaCu = existing.gia_goc
    if (giaCu === gia) {
      return c.json({ success: true, changed: false, message: 'Giá không đổi' })
    }

    await c.env.DB.prepare(
      "UPDATE ma_misa SET gia_goc = ?, updated_at = datetime('now','+7 hours'), updated_by = ? WHERE ma_sp = ?"
    ).bind(gia, body.updated_by || null, ma_sp).run()

    await c.env.DB.prepare(
      'INSERT INTO ma_misa_gia_history (ma_sp, thang, gia_cu, gia_goc, nguon, updated_by) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(ma_sp, thang, giaCu, gia, body.nguon || 'manual', body.updated_by || null).run()

    return c.json({ success: true, changed: true, ma_sp, thang, gia_cu: giaCu, gia_goc: gia })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/ma-misa/lich-su/:ma_sp
app.get('/lich-su/:ma_sp', async (c) => {
  try {
    const ma_sp = c.req.param('ma_sp')
    const history = await c.env.DB.prepare(
      'SELECT id, ma_sp, thang, gia_cu, gia_goc, nguon, updated_by, created_at FROM ma_misa_gia_history WHERE ma_sp = ? ORDER BY thang DESC, id DESC'
    ).bind(ma_sp).all()
    const current = await c.env.DB.prepare('SELECT gia_goc FROM ma_misa WHERE ma_sp = ?').bind(ma_sp).first()
    return c.json({ data: history.results, current: current?.gia_goc ?? null })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/ma-misa/lich-su (toàn bộ, lọc theo thang tùy chọn)
app.get('/lich-su', async (c) => {
  try {
    const thang = c.req.query('thang') || ''
    const limit = Math.min(parseInt(c.req.query('limit') || '100'), 500)
    const offset = parseInt(c.req.query('offset') || '0')
    let where = ''
    const params: any[] = []
    if (/^\d{4}-\d{2}$/.test(thang)) { where = 'WHERE thang = ?'; params.push(thang) }
    const history = await c.env.DB.prepare(
      `SELECT id, ma_sp, thang, gia_cu, gia_goc, nguon, updated_by, created_at FROM ma_misa_gia_history ${where} ORDER BY thang DESC, id DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all()
    const total = await c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM ma_misa_gia_history ${where}`).bind(...params).first()
    return c.json({ data: history.results, total: (total as any)?.cnt || 0 })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export const router = app
