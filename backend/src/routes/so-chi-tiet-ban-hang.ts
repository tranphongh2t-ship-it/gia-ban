import { Hono } from 'hono'
import { crudRoutes } from '../helpers/crud'
import * as XLSX from 'xlsx'

type Env = { Bindings: { DB: D1Database } }

const router = new Hono<Env>()

const crud = crudRoutes({
  table: 'so_chi_tiet_ban_hang',
  idField: 'id',
  searchFields: ['ma_hang', 'ten_hang', 'ten_kh', 'so_ct', 'dien_giai'],
  orderBy: 'id DESC',
})

router.route('/', crud)

const COL_MAP = [
  { db: 'ngay', idx: 0 },
  { db: 'so_ct', idx: 1 },
  { db: 'dien_giai', idx: 2 },
  { db: 'ma_kh', idx: 3 },
  { db: 'ten_kh', idx: 4 },
  { db: 'ma_hang', idx: 5 },
  { db: 'ten_hang', idx: 6 },
  { db: 'sl_ban', idx: 7 },
  { db: 'don_gia', idx: 8 },
  { db: 'doanh_so', idx: 9 },
  { db: 'ck', idx: 10 },
  { db: 'sl_tra', idx: 11 },
  { db: 'gt_tra', idx: 12 },
  { db: 'gt_giam', idx: 13 },
  { db: 'thue', idx: 14 },
]

// POST /api/so-chi-tiet-ban-hang/import-excel
router.post('/import-excel', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null
    if (!file) return c.json({ error: 'Không có file' }, 400)

    const buf = await file.arrayBuffer()
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]

    // Fix range nếu !ref không khớp với dữ liệu thực tế (lỗi Excel range)
    {
      const ref = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      let maxCol = ref.e.c, maxRow = ref.e.r
      for (const key of Object.keys(ws)) {
        if (key.startsWith('!')) continue
        const c = XLSX.utils.decode_cell(key)
        if (c.r > maxRow) maxRow = c.r
        if (c.c > maxCol) maxCol = c.c
      }
      ws['!ref'] = XLSX.utils.encode_range({ s: ref.s, e: { r: maxRow, c: maxCol } })
    }

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]

    const dataRows = rows.slice(2).filter((r: any[]) => {
      if (!r[0] || typeof r[0] !== 'string') return false
      if (r[0].startsWith('Số dòng') || r[0].startsWith('Tổng')) return false
      return r[5] || r[6]
    })

    // Load ALL existing rows into memory (1 query thay vì 1 query/dòng)
    const allExisting = await c.env.DB.prepare(
      `SELECT id, ngay, so_ct, ma_hang, dien_giai, ma_kh, ten_kh, ten_hang,
              sl_ban, don_gia, doanh_so, ck, sl_tra, gt_tra, gt_giam, thue
       FROM so_chi_tiet_ban_hang`
    ).all()
    const existingMap = new Map<string, any>()
    for (const r of allExisting.results as any[]) {
      existingMap.set(`${r.ngay}|${r.so_ct}|${r.ma_hang}`, r)
    }

    // Parse records in memory
    const records: any[] = []
    let parseSkipped = 0
    for (const row of dataRows) {
      const record: Record<string, any> = {}
      for (const m of COL_MAP) {
        let val: any = row[m.idx]
        if (m.db === 'ngay' && typeof val === 'number') {
          const d = new Date((val - 25569) * 86400 * 1000)
          const dd = String(d.getDate()).padStart(2, '0')
          const mm = String(d.getMonth() + 1).padStart(2, '0')
          const yyyy = d.getFullYear()
          val = `${dd}/${mm}/${yyyy}`
        }
        if (['sl_ban', 'don_gia', 'doanh_so', 'ck', 'sl_tra', 'gt_tra', 'gt_giam', 'thue'].includes(m.db)) {
          val = typeof val === 'number' ? val : 0
        } else {
          val = val !== undefined && val !== null ? String(val).trim() : ''
        }
        record[m.db] = val
      }
      if (!record.ma_hang) { parseSkipped++; continue }
      records.push(record)
    }

    // Build batch statements
    const colNames = COL_MAP.map(m => m.db).join(', ')
    const placeholders = COL_MAP.map(() => '?').join(', ')
    const setClause = COL_MAP.map(m => `${m.db} = ?`).join(', ')

    const insertStmts: D1PreparedStatement[] = []
    const updateStmts: D1PreparedStatement[] = []
    let skipped = parseSkipped
    let imported = 0

    for (const record of records) {
      const key = `${record.ngay}|${record.so_ct}|${record.ma_hang}`
      const existing = existingMap.get(key)

      if (existing) {
        let changed = false
        for (const m of COL_MAP) {
          if (String(existing[m.db] ?? '') !== String(record[m.db] ?? '')) { changed = true; break }
        }
        if (changed) {
          updateStmts.push(
            c.env.DB.prepare(`UPDATE so_chi_tiet_ban_hang SET ${setClause} WHERE id = ?`)
              .bind(...COL_MAP.map(m => record[m.db]), existing.id)
          )
          imported++
        } else { skipped++ }
      } else {
        insertStmts.push(
          c.env.DB.prepare(`INSERT INTO so_chi_tiet_ban_hang (${colNames}) VALUES (${placeholders})`)
            .bind(...COL_MAP.map(m => record[m.db]))
        )
        imported++
      }
    }

    // Batch execute (D1 cho phép tối đa 100 stmts/batch)
    const BATCH = 100
    for (let i = 0; i < insertStmts.length; i += BATCH) {
      await c.env.DB.batch(insertStmts.slice(i, i + BATCH))
    }
    for (let i = 0; i < updateStmts.length; i += BATCH) {
      await c.env.DB.batch(updateStmts.slice(i, i + BATCH))
    }

    return c.json({
      success: true,
      total: records.length,
      imported,
      skipped,
      message: `Import ${imported} dòng thành công${skipped ? `, bỏ qua ${skipped} dòng` : ''}`,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default router
