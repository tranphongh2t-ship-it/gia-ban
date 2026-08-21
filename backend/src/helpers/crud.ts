import { Hono } from 'hono'
import { syncBangToMisa, syncMisaToBangs, type GiaGocSyncTable } from './giaGocSync'
import { isBangGiaLocked } from './bangGiaLock'

type Env = { Bindings: { DB: D1Database } }

interface CrudOptions {
  table: string
  idField?: string
  searchFields?: string[]
  orderBy?: string
  listQuery?: string
  extraFilterMap?: Record<string, string>
  defaultFilters?: Record<string, string>
  // Bảng thuộc 12 nhóm "Bảng Tính Giá" — chặn ghi tay khi khóa được bật
  lockable?: boolean
  // Phân tách dữ liệu theo user (vd so_doi_chieu: mỗi người 1 file).
  // Xem: mặc định dữ liệu của mình + dòng cũ (NULL); param ?owner_user_id=X để xem file người khác (mọi account).
  // Sửa/xóa/thêm: chỉ chủ sở hữu hoặc admin (dòng NULL chỉ admin).
  ownerField?: string
  priceHistory?: {
    historyTable: string
    priceCol: string
    refCol: string
  }
  numericHistory?: {
    historyTable: string
    bang: string
  }
  // Chiều A: bảng giá gốc (có ma_sp + cột giá) → tự push lên ma_misa.gia_goc + lịch sử
  giaGocSync?: GiaGocSyncTable
  // Chiều B: bảng ma_misa → đổi giá tự push xuống tất cả bảng giá gốc cùng mã + lịch sử
  misaGiaSync?: boolean
}

const LOCKED_ERROR = 'Bảng Tính Giá đang bị KHÓA. Luồng tự động vẫn chạy, nhưng chỉnh sửa tay đã bị chặn — hãy liên hệ Admin.'

function currentThang(): string {
  const d = new Date(Date.now() + 7 * 3600 * 1000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

// Đọc user hiện tại từ header x-user-id (null nếu chưa đăng nhập / không tìm thấy)
async function reqUser(db: D1Database, c: any): Promise<{ id: number; ten: string; vai_tro: string } | null> {
  const idStr = c.req?.header?.('x-user-id')
  const id = Number(idStr)
  if (!idStr || !Number.isFinite(id)) return null
  const user = await db.prepare('SELECT id, ten, vai_tro FROM nhan_vien WHERE id = ?').bind(id).first() as any
  return user ? { id: Number(user.id), ten: user.ten || '', vai_tro: user.vai_tro || '' } : null
}

const isAdmin = (u: { vai_tro: string } | null) => !!u && u.vai_tro === 'admin'

// Kiểm tra quyền sửa/xóa theo chủ sở hữu (chỉ áp dụng cho bảng có ownerField).
// Trả về { ok, status, error }.
async function ownerCanModify(db: D1Database, c: any, opts: CrudOptions, id: string): Promise<{ ok: boolean; status?: any; error?: string }> {
  if (!opts.ownerField) return { ok: true }
  const me = await reqUser(db, c)
  if (!me) return { ok: false, status: 401, error: 'Bắt buộc đăng nhập' }
  if (isAdmin(me)) return { ok: true }
  const row = await db.prepare(`SELECT ${opts.ownerField} FROM ${opts.table} WHERE ${opts.idField || 'id'} = ?`).bind(id).first() as any
  if (!row) return { ok: false, status: 404, error: 'Not found' }
  const owner = (row as any)[opts.ownerField]
  // Dòng cũ (NULL) chỉ admin được sửa/xóa
  if (owner == null || owner === me.id) return { ok: true }
  return { ok: false, status: 403, error: 'Không có quyền sửa/xóa dữ liệu của người khác' }
}

export function crudRoutes(opts: CrudOptions) {
  const { table, idField = 'id', searchFields = [], orderBy = `${idField} DESC`, listQuery, extraFilterMap = {} } = opts
  const router = new Hono<Env>()

  router.get('/', async (c) => {
    try {
      const query = c.req.query()
      const { search, limit = '100', offset = '0' } = query
      const limitNum = Math.min(parseInt(limit) || 100, 1000)
      const offsetNum = parseInt(offset) || 0

      let dataSql = listQuery || `SELECT * FROM ${table}`
      const countFrom = listQuery ? listQuery.replace(/^SELECT\b[\s\S]*?\bFROM\b\s+/i, '') : table
      let countSql = `SELECT COUNT(*) as total FROM ${countFrom}`
      const params: any[] = []
      const conditions: string[] = []

      const useAlias = !!listQuery
      const pfx = (col: string) => useAlias && !col.includes('.') ? `t.${col}` : col

      // Column-level filters: filter_ma_kh=ABC, filter_ten_sp=xyz
      // Special values: __null → IS NULL, __notnull → IS NOT NULL, __empty → IS NULL OR =0 OR =''
      for (const [key, val] of Object.entries(query)) {
        if (key.startsWith('filter_') && val) {
          let col = key.replace('filter_', '')
          col = extraFilterMap[col] || pfx(col)
          if (val === '__null') {
            conditions.push(`${col} IS NULL`)
          } else if (val === '__notnull') {
            conditions.push(`${col} IS NOT NULL`)
          } else if (val === '__empty') {
            conditions.push(`(${col} IS NULL OR ${col} = 0 OR ${col} = '')`)
          } else if (val === '__gt0') {
            conditions.push(`${col} > 0`)
          } else if (val === '__gte0') {
            conditions.push(`${col} >= 0`)
          } else if (val === '__lt0') {
            conditions.push(`${col} < 0`)
          } else if (val === '__lte0') {
            conditions.push(`${col} <= 0`)
          } else if (val === '__eq0') {
            conditions.push(`${col} = 0`)
          } else if (val === '__ne0') {
            conditions.push(`${col} != 0`)
          } else if (val.startsWith('=')) {
            conditions.push(`${col} = ?`)
            params.push(val.slice(1))
          } else if (val.includes('|')) {
            const [from, to] = val.split('|')
            if (from !== '') { conditions.push(`${col} >= ?`); params.push(Number(from) || 0) }
            if (to !== '') { conditions.push(`${col} <= ?`); params.push(Number(to) || 0) }
          } else {
            conditions.push(`LOWER(COALESCE(CAST(${col} AS TEXT),'')) LIKE ?`)
            params.push(`%${val.toLowerCase()}%`)
          }
        }
      }

      // Default filters (always applied)
      // Supports: { ma_sp: 'VN%' } → AND; { ma_sp: 'LP%|LE%' } → OR (pipe = OR)
      const defaultFilters = (opts as any).defaultFilters
      if (defaultFilters) {
        for (const [col, val] of Object.entries(defaultFilters)) {
          const vals = String(val).split('|')
          if (vals.length === 1) {
            conditions.push(`${pfx(col)} LIKE ?`)
            params.push(vals[0])
          } else {
            conditions.push(`(${vals.map(() => `${pfx(col)} LIKE ?`).join(' OR ')})`)
            params.push(...vals)
          }
        }
      }

      // Owner scoping: bảng phân tách theo user (vd so_doi_chieu — mỗi người 1 file).
      // Mặc định: dòng của mình + dòng cũ (owner NULL). Muốn xem file người khác: ?owner_user_id=X (mọi account được phép).
      if (opts.ownerField) {
        const ownerCol = pfx(opts.ownerField)
        const explicit = query['owner_user_id']
        const me = await reqUser(c.env.DB, c)
        if (explicit && typeof explicit === 'string' && explicit !== '') {
          if (explicit === '__null') conditions.push(`${ownerCol} IS NULL`)
          else if (explicit === '__all') {
            if (!isAdmin(me)) return c.json({ error: 'Chỉ Admin mới xem được toàn bộ' }, 403)
            /* bỏ lọc owner */
          }
          else {
            const n = Number(explicit)
            if (Number.isFinite(n)) { conditions.push(`${ownerCol} = ?`); params.push(n) }
          }
        } else {
          if (!me) return c.json({ error: 'Bắt buộc đăng nhập' }, 401)
          conditions.push(`(${ownerCol} IS NULL OR ${ownerCol} = ?)`)
          params.push(me.id)
        }
      }

      if (search && searchFields.length > 0) {
        const q = search.toLowerCase()
        const searchConds = searchFields.map(f => `LOWER(COALESCE(CAST(${pfx(f)} AS TEXT),'')) LIKE ?`)
        conditions.push(`(${searchConds.join(' OR ')})`)
        searchFields.forEach(() => params.push(`%${q}%`))
      }

      if (conditions.length > 0) {
        const whereClause = ` WHERE ${conditions.join(' AND ')}`
        dataSql += whereClause
        countSql += whereClause
      }

      const sortCol = (query.sort_col as string) || null
      const sortDirSql = query.sort_dir === 'asc' ? 'ASC' : (query.sort_dir === 'desc' ? 'DESC' : null)
      const orderSql = (sortCol && /^[a-zA-Z0-9_.]+$/.test(sortCol))
        ? ` ORDER BY ${pfx(sortCol)} ${sortDirSql || 'DESC'}`
        : ` ORDER BY ${orderBy}`

      dataSql += orderSql + ' LIMIT ? OFFSET ?'
      const [data, total] = await Promise.all([
        c.env.DB.prepare(dataSql).bind(...params, limitNum, offsetNum).all(),
        c.env.DB.prepare(countSql).bind(...params).first(),
      ])

      return c.json({
        data: data.results,
        total: (total as any)?.total || 0,
        limit: limitNum,
        offset: offsetNum,
      })
    } catch (e: any) {
      return c.json({ error: e.message }, 500)
    }
  })

  router.get('/:id', async (c) => {
    try {
      const id = c.req.param('id')
      const result = await c.env.DB.prepare(`SELECT * FROM ${table} WHERE ${idField} = ?`).bind(id).first()
      if (!result) return c.json({ error: 'Not found' }, 404)
      if (opts.ownerField) {
        const me = await reqUser(c.env.DB, c)
        const owner = (result as any)[opts.ownerField] as number | null
        if (!isAdmin(me) && owner != null && owner !== (me?.id ?? null)) {
          return c.json({ error: 'Không có quyền truy cập dữ liệu của người khác' }, 403)
        }
      }
      return c.json(result)
    } catch (e: any) {
      return c.json({ error: e.message }, 500)
    }
  })

  router.post('/', async (c) => {
    try {
      if (opts.lockable && await isBangGiaLocked(c.env.DB)) {
        return c.json({ error: LOCKED_ERROR }, 423)
      }
      let body = await c.req.json()
      if (opts.ownerField) {
        const me = await reqUser(c.env.DB, c)
        if (!me) return c.json({ error: 'Bắt buộc đăng nhập' }, 401)
        body = { ...body, [opts.ownerField]: me.id }
      }
      const keys = Object.keys(body)
      if (keys.length === 0) return c.json({ error: 'Empty body' }, 400)
      const values = Object.values(body)
      const cols = keys.join(', ')
      const placeholders = keys.map(() => '?').join(', ')
      const result = await c.env.DB.prepare(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`).bind(...values).run()
      return c.json({ id: Number(result.meta.last_row_id) }, 201)
    } catch (e: any) {
      return c.json({ error: e.message }, 500)
    }
  })

  router.patch('/:id', async (c) => {
    try {
      if (opts.lockable && await isBangGiaLocked(c.env.DB)) {
        return c.json({ error: LOCKED_ERROR }, 423)
      }
      const id = c.req.param('id')
      const access = await ownerCanModify(c.env.DB, c, opts, id)
      if (!access.ok) return c.json({ error: access.error! }, access.status)
      const body = await c.req.json()
      const keys = Object.keys(body)
      if (keys.length === 0) return c.json({ error: 'No fields to update' }, 400)

      // Auto-set updated_by from auth header (không trust frontend)
      if (opts.ownerField && !body.updated_by) {
        const me = await reqUser(c.env.DB, c)
        if (me?.ten) body.updated_by = me.ten
      }

      const values = Object.values(body)

      const ph = opts.priceHistory
      let oldRow: any = null
      if (ph && body[ph.priceCol] !== undefined) {
        oldRow = await c.env.DB.prepare(`SELECT ${ph.refCol}, ${ph.priceCol} FROM ${table} WHERE ${idField} = ?`).bind(id).first()
        if (oldRow) {
          const oldVal = (oldRow as any)[ph.priceCol]
          const newVal = Number(body[ph.priceCol])
          const refVal = (oldRow as any)[ph.refCol]
          if (refVal != null && Number(oldVal) !== newVal) {
            await c.env.DB.prepare(
              `INSERT INTO ${ph.historyTable} (${ph.refCol}, thang, gia_cu, gia_goc, nguon, updated_by) VALUES (?, ?, ?, ?, ?, ?)`
            ).bind(refVal, currentThang(), oldVal, newVal, 'manual', body.updated_by || null).run()
          }
        }
      }

      const nh = opts.numericHistory
      if (nh) {
        const oldRow = await c.env.DB.prepare(`SELECT * FROM ${table} WHERE ${idField} = ?`).bind(id).first()
        if (oldRow) {
          for (const [col, newVal] of Object.entries(body)) {
            if (col === idField || col === 'updated_by') continue
            const oldVal = (oldRow as any)[col]
            const isNum = (v: any) => v !== null && v !== undefined && v !== '' && !isNaN(Number(v))
            if (isNum(oldVal) || isNum(newVal)) {
              const oldNum = isNum(oldVal) ? Number(oldVal) : null
              const newNum = isNum(newVal) ? Number(newVal) : null
              if (oldNum !== newNum) {
                await c.env.DB.prepare(
                  `INSERT INTO ${nh.historyTable} (bang, ref_id, cot, thang, gia_cu, gia_moi, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)`
                ).bind(nh.bang, Number(id), col, currentThang(), oldNum, newNum, body.updated_by || null).run()
              }
            }
          }
        }
      }

      const setClause = keys.map(k => `${k} = ?`).join(', ')
      const result = await c.env.DB.prepare(`UPDATE ${table} SET ${setClause} WHERE ${idField} = ?`).bind(...values, id).run()
      if (result.meta.changes === 0) return c.json({ error: 'Not found' }, 404)

      // Chiều B: đổi giá trên ma_misa → đẩy xuống tất cả bảng giá gốc cùng mã + lịch sử
      if (opts.misaGiaSync && opts.priceHistory && body[opts.priceHistory.priceCol] !== undefined) {
        const newVal = Number(body[opts.priceHistory.priceCol])
        const refVal = oldRow ? (oldRow as any)[opts.priceHistory.refCol] : null
        if (refVal != null && newVal > 0) {
          await syncMisaToBangs(c.env.DB, String(refVal), newVal, body.updated_by || null)
        }
      }

      // Chiều A: đổi giá ở bảng giá gốc → push lên ma_misa.gia_goc + lịch sử
      if (opts.giaGocSync && body[opts.giaGocSync.priceCol] !== undefined) {
        await syncBangToMisa(c.env.DB, opts.giaGocSync, Number(id))
      }

      // Ghi log tổng hợp theo user (chỉ khi có updated_by)
      await logThayDoi(c.env.DB, {
        bang: table, ref_id: Number(id), body, tableOpts: opts,
      })

      return c.json({ success: true })
    } catch (e: any) {
      return c.json({ error: e.message }, 500)
    }
  })

  router.put('/:id', async (c) => {
    try {
      if (opts.lockable && await isBangGiaLocked(c.env.DB)) {
        return c.json({ error: LOCKED_ERROR }, 423)
      }
      const id = c.req.param('id')
      const access = await ownerCanModify(c.env.DB, c, opts, id)
      if (!access.ok) return c.json({ error: access.error! }, access.status)
      const body = await c.req.json()
      const keys = Object.keys(body)
      if (keys.length === 0) return c.json({ error: 'Empty body' }, 400)

      // Auto-set updated_by from auth header (không trust frontend)
      if (opts.ownerField && !body.updated_by) {
        const me = await reqUser(c.env.DB, c)
        if (me?.ten) body.updated_by = me.ten
      }

      const values = Object.values(body)
      const setClause = keys.map(k => `${k} = ?`).join(', ')
      const result = await c.env.DB.prepare(`UPDATE ${table} SET ${setClause} WHERE ${idField} = ?`).bind(...values, id).run()
      if (result.meta.changes === 0) return c.json({ error: 'Not found' }, 404)

      await logThayDoi(c.env.DB, {
        bang: table, ref_id: Number(id), body, tableOpts: opts,
      })

      return c.json({ success: true })
    } catch (e: any) {
      return c.json({ error: e.message }, 500)
    }
  })

  router.delete('/:id', async (c) => {
    try {
      if (opts.lockable && await isBangGiaLocked(c.env.DB)) {
        return c.json({ error: LOCKED_ERROR }, 423)
      }
      const id = c.req.param('id')
      const access = await ownerCanModify(c.env.DB, c, opts, id)
      if (!access.ok) return c.json({ error: access.error! }, access.status)
      const result = await c.env.DB.prepare(`DELETE FROM ${table} WHERE ${idField} = ?`).bind(id).run()
      if (result.meta.changes === 0) return c.json({ error: 'Not found' }, 404)
      return c.json({ success: true })
    } catch (e: any) {
      return c.json({ error: e.message }, 500)
    }
  })

  return router
}

// Ghi log tổng hợp mọi thay đổi theo user (bảng thay_doi_log)
// Chỉ ghi khi body có updated_by — tránh nhiễu từ các cập nhật tự động.
interface LogInput {
  bang: string
  ref_id: number
  body: Record<string, any>
  tableOpts: CrudOptions
}

async function logThayDoi(db: D1Database, input: LogInput) {
  try {
    const { bang, ref_id, body, tableOpts } = input
    const updatedBy = body.updated_by || null
    if (!updatedBy) return

    // Lấy giá trị cũ trước khi ghi (nếu có priceCol hoặc numericHistory thì đã biết)
    const cols = Object.keys(body).filter(k => k !== 'updated_by' && k !== 'id')
    if (cols.length === 0) return

    const selectCols = cols.map(c => c).join(', ')
    const oldRow = await db.prepare(
      `SELECT ${selectCols} FROM ${bang} WHERE ${tableOpts.idField || 'id'} = ?`
    ).bind(ref_id).first() as any
    if (!oldRow) return

    const thang = currentThang()
    for (const col of cols) {
      const oldVal = (oldRow as any)[col]
      const newVal = body[col]
      if (String(oldVal ?? '') === String(newVal ?? '')) continue
      await db.prepare(
        `INSERT INTO thay_doi_log (bang, ref_id, cot, gia_tri_cu, gia_tri_moi, updated_by, thang, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now','+7 hours'))`
      ).bind(
        bang, ref_id, col,
        oldVal === null || oldVal === undefined ? '' : String(oldVal),
        newVal === null || newVal === undefined ? '' : String(newVal),
        updatedBy, thang,
      ).run()
    }
  } catch {
    // Log lỗi không được phép làm hỏng thao tác chính
  }
}

export { reqUser, isAdmin, currentThang }
