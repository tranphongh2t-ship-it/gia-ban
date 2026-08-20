import { Hono } from 'hono'

type Env = { Bindings: { DB: D1Database } }

const app = new Hono<Env>()

// GET /api/user-prefs/cols?page=<key>  ->  { data: { colKey: width }, default: { colKey: width } }
// Trả về: default (admin/global) + data (riêng của user). Frontend ưu tiên data > default > auto.
// Hỗ trợ ẩn cột: blob.json chứa khóa "__hidden": ["colKey", ...] → tách riêng thành hidden/defaultHidden.
app.get('/cols', async (c) => {
  try {
    const userId = parseInt(c.req.query('user_id') || '')
    const page = c.req.query('page') || ''
    if (!page) return c.json({ data: {}, default: {}, hidden: [], defaultHidden: [] })
    const parseBlob = (raw: any): Record<string, any> => {
      if (!raw) return {}
      try { const d = JSON.parse(raw); return typeof d === 'object' ? d : {} } catch { return {} }
    }
    const extract = (blob: Record<string, any>) => {
      const widths: Record<string, number> = {}
      let hidden: string[] = []
      for (const [k, v] of Object.entries(blob)) {
        if (k === '__hidden') {
          if (Array.isArray(v)) hidden = v.filter(x => typeof x === 'string')
        } else if (typeof v === 'number') {
          widths[k] = v
        }
      }
      return { widths, hidden }
    }
    const dflt = await c.env.DB.prepare(
      'SELECT col_widths FROM user_column_prefs WHERE user_id = 0 AND page_key = ?'
    ).bind(page).first()
    const defBlob = parseBlob(dflt ? (dflt as any).col_widths : null)
    const d = extract(defBlob)
    let dat: any = {}
    if (userId) {
      const row = await c.env.DB.prepare(
        'SELECT col_widths FROM user_column_prefs WHERE user_id = ? AND page_key = ?'
      ).bind(userId, page).first()
      dat = extract(parseBlob(row ? (row as any).col_widths : null))
    }
    const effHidden = dat.hidden.length ? dat.hidden : d.hidden
    return c.json({
      data: dat.widths,
      default: d.widths,
      hidden: effHidden,
      defaultHidden: d.hidden,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// PUT /api/user-prefs/cols  body { user_id, page, data: { colKey: width }, is_default? }
// data có thể chứa "__hidden": ["colKey", ...] → lưu chung vào blob (ẩn cột).
// is_default=true → lưu vào user_id=0 (mặc định toàn cục, quản trị viên)
app.put('/cols', async (c) => {
  try {
    const body = await c.req.json()
    const userId = body?.is_default ? 0 : parseInt(body?.user_id)
    const page = String(body?.page || '')
    const data = body?.data || {}
    if (!userId && !body?.is_default) return c.json({ error: 'Thiếu user_id' }, 400)
    if (!page) return c.json({ error: 'Thiếu page' }, 400)
    if (typeof data !== 'object' || Object.keys(data).length === 0) return c.json({ success: true, cleared: true })
    await c.env.DB.prepare(
      'INSERT INTO user_column_prefs (user_id, page_key, col_widths, updated_at) VALUES (?, ?, ?, datetime(\'now\',\'+7 hours\')) ' +
      'ON CONFLICT(user_id, page_key) DO UPDATE SET col_widths = excluded.col_widths, updated_at = datetime(\'now\',\'+7 hours\')'
    ).bind(userId, page, JSON.stringify(data)).run()
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default app