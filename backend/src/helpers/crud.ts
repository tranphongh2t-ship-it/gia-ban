import { Hono } from 'hono'

type Env = { Bindings: { DB: D1Database } }

interface CrudOptions {
  table: string
  idField?: string
  searchFields?: string[]
  orderBy?: string
  listQuery?: string
  extraFilterMap?: Record<string, string>
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
      const countFrom = listQuery ? listQuery.replace(/^SELECT\s+.*?\s+FROM\s+/i, '') : table
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
          } else {
            conditions.push(`${col} LIKE ?`)
            params.push(`%${val}%`)
          }
        }
      }

      if (search && searchFields.length > 0) {
        const searchConds = searchFields.map(f => `${pfx(f)} LIKE ?`)
        conditions.push(`(${searchConds.join(' OR ')})`)
        searchFields.forEach(() => params.push(`%${search}%`))
      }

      if (conditions.length > 0) {
        const whereClause = ` WHERE ${conditions.join(' AND ')}`
        dataSql += whereClause
        countSql += whereClause
      }

      dataSql += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`
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
      return c.json(result)
    } catch (e: any) {
      return c.json({ error: e.message }, 500)
    }
  })

  router.post('/', async (c) => {
    try {
      const body = await c.req.json()
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
      const id = c.req.param('id')
      const body = await c.req.json()
      const keys = Object.keys(body)
      if (keys.length === 0) return c.json({ error: 'No fields to update' }, 400)
      const values = Object.values(body)
      const setClause = keys.map(k => `${k} = ?`).join(', ')
      const result = await c.env.DB.prepare(`UPDATE ${table} SET ${setClause} WHERE ${idField} = ?`).bind(...values, id).run()
      if (result.meta.changes === 0) return c.json({ error: 'Not found' }, 404)
      return c.json({ success: true })
    } catch (e: any) {
      return c.json({ error: e.message }, 500)
    }
  })

  router.put('/:id', async (c) => {
    try {
      const id = c.req.param('id')
      const body = await c.req.json()
      const keys = Object.keys(body)
      if (keys.length === 0) return c.json({ error: 'Empty body' }, 400)
      const values = Object.values(body)
      const setClause = keys.map(k => `${k} = ?`).join(', ')
      const result = await c.env.DB.prepare(`UPDATE ${table} SET ${setClause} WHERE ${idField} = ?`).bind(...values, id).run()
      if (result.meta.changes === 0) return c.json({ error: 'Not found' }, 404)
      return c.json({ success: true })
    } catch (e: any) {
      return c.json({ error: e.message }, 500)
    }
  })

  router.delete('/:id', async (c) => {
    try {
      const id = c.req.param('id')
      const result = await c.env.DB.prepare(`DELETE FROM ${table} WHERE ${idField} = ?`).bind(id).run()
      if (result.meta.changes === 0) return c.json({ error: 'Not found' }, 404)
      return c.json({ success: true })
    } catch (e: any) {
      return c.json({ error: e.message }, 500)
    }
  })

  return router
}
