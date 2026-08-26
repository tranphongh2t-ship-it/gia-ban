import { Hono } from 'hono'
import { crudRoutes } from '../helpers/crud'
import { tinhCKChoDong, buildLop2Ctx, invalidateCtxCache } from './chiet-khau'
import * as XLSX from 'xlsx'

type Env = { Bindings: { DB: D1Database } }

const router = new Hono<Env>()

// DELETE /clear must be before CRUD's /:id to avoid conflict
router.delete('/clear', async (c) => {
  try {
    await c.env.DB.prepare('DELETE FROM so_chi_tiet_ban_hang').run()
    return c.json({ success: true, message: 'Đã xóa toàn bộ dữ liệu' })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Bảng giá gốc của từng module (map sang cột giá dùng để so sánh)
const MODULE_GIA_GOC: { table: string; cols: string[] }[] = [
  { table: 'bang_gia_chuan_tinh_gia_vdo', cols: ['tong_gia'] },
  { table: 'bang_gia_chuan_tinh_gia_vmh', cols: ['tong_gia'] },
  { table: 'bang_gia_chuan_tinh_gia_gg', cols: ['gia'] },
  { table: 'bang_gia_chuan_tinh_gia_ve', cols: ['gia'] },
  { table: 'bang_gia_chuan_tinh_gia_osb', cols: ['gia'] },
  { table: 'bang_gia_chuan_tinh_gia_dr', cols: ['gia'] },
  { table: 'bang_gia_chuan_tinh_gia_pvc_petg', cols: ['gia'] },
  { table: 'bang_gia_chuan_tinh_gia_melamine_tonghop', cols: ['gia'] },
  { table: 'bang_gia_chuan_tinh_gia_acrylic', cols: ['gia'] },
  { table: 'bang_gia_chuan_tinh_gia_one_laminate', cols: ['gia'] },
  { table: 'bang_gia_chuan_veneer', cols: ['gia_2m', 'gia_1m_a', 'gia_1m_b'] },
  { table: 'bang_gia_chuan_mat_phu_khac', cols: ['gia_2m', 'gia_1m'] },
  { table: 'bang_gia_chuan_chi_nep', cols: ['gia'] },
  { table: 'bang_gia_chuan_keo_hat', cols: ['gia_25kg', 'gia_1kg'] },
  { table: 'bang_gia_chuan_mirror', cols: ['gia_2m', 'gia_1m'] },
]

// List query: thêm cột Giá MISA (ma_misa.gia_goc) và Giá gốc (từ bảng index gia_goc_by_ma)
// Chỉ join 2 bảng nhẹ để không vượt CPU limit trên Workers
const LIST_QUERY = `SELECT t.*, m.gia_goc AS gia_misa, g.gia_goc AS gia_goc
  FROM so_chi_tiet_ban_hang t
  LEFT JOIN ma_misa m ON m.ma_sp = t.ma_hang
  LEFT JOIN gia_goc_by_ma g ON g.ma_sp = t.ma_hang`

const crud = crudRoutes({
  table: 'so_chi_tiet_ban_hang',
  idField: 'id',
  searchFields: ['ma_hang', 'ten_hang', 'ten_kh', 'so_ct', 'dien_giai'],
  orderBy: 't.id DESC',
  listQuery: LIST_QUERY,
})

// GET /api/so-chi-tiet-ban-hang/doi-chieu — đối chiếu CK thực tế vs CK tính (5 lớp)
router.get('/doi-chieu', async (c) => {
  try {
    const db = c.env.DB
    const limit = Math.min(parseInt(c.req.query('limit') || '200'), 2000)
    const offset = parseInt(c.req.query('offset') || '0')
    const search = (c.req.query('search') || '').trim()

    let where = 'WHERE 1=1'
    const params: any[] = []
    if (search) {
      where += ' AND (t.ma_kh LIKE ? OR t.ten_kh LIKE ? OR t.ma_hang LIKE ? OR t.so_ct LIKE ?)'
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
    }

    const { results: rows } = await db.prepare(
      `${LIST_QUERY} ${where} ORDER BY t.id DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all()

    const { results: cnt } = await db.prepare(
      `SELECT COUNT(*) as total FROM so_chi_tiet_ban_hang t ${where}`
    ).bind(...params).all()

    const out: any[] = []
    const ctx = await buildLop2Ctx(db)
    for (const row of rows as any[]) {
      const tinh = await tinhCKChoDong(db, row, ctx)
      out.push({ ...row, ...tinh })
    }

    return c.json({ data: out, total: (cnt as any)?.[0]?.total || 0, limit, offset })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
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

// Sau import: tự thêm khách mới vào bảng chiết khấu (danh_sach_khach) nếu chưa có
// — mặc định Xưởng thường (PREMIUM/Thuong/XUONG_THUONG, CK 20%/7%) theo chính sách 2026.
async function themKhachMoiVaoBangCK(db: D1Database): Promise<number> {
  const { results } = await db.prepare(
    `SELECT t.ma_kh, MAX(t.ten_kh) AS ten_kh
     FROM so_chi_tiet_ban_hang t
     WHERE t.ma_kh IS NOT NULL AND t.ma_kh != ''
       AND t.ma_kh NOT IN (SELECT ma_kh FROM danh_sach_khach)
     GROUP BY t.ma_kh`
  ).all()
  let so = 0
  for (const r of results as any[]) {
    await db.prepare(
      `INSERT INTO danh_sach_khach (ma_kh, ten_kh, doi_tuong, hang, nhom, ck_ds_98mau_pct, ck_ds_khac_pct)
       VALUES (?, ?, 'PREMIUM', 'Thuong', 'XUONG_THUONG', 0.20, 0.07)`
    ).bind(String(r.ma_kh), String(r.ten_kh || '')).run()
    so++
  }
  return so
}

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

    // Tự thêm khách mới vào bảng chiết khấu
    const soKhachMoi = await themKhachMoiVaoBangCK(c.env.DB)
    if (soKhachMoi > 0) invalidateCtxCache()

    return c.json({
      success: true,
      total: records.length,
      imported,
      skipped,
      so_khach_moi: soKhachMoi,
      message: `Import ${imported} dòng thành công${skipped ? `, bỏ qua ${skipped} dòng` : ''}. Tự thêm ${soKhachMoi} khách mới vào bảng chiết khấu.`,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/so-chi-tiet-ban-hang/import-rows — nhận sẵn mảng dòng JSON (đã parse xlsx bên ngoài)
// để tránh CPU limit trên Workers khi file lớn. Body: { rows: [{ngay,so_ct,...,thue}] }
router.post('/import-rows', async (c) => {
  try {
    const body = await c.req.json() as any
    const records: any[] = Array.isArray(body.rows) ? body.rows : []
    if (records.length === 0) return c.json({ error: 'Không có dữ liệu' }, 400)

    // Load existing rows (chunk này có thể có trùng key)
    const allExisting = await c.env.DB.prepare(
      `SELECT id, ngay, so_ct, ma_hang FROM so_chi_tiet_ban_hang WHERE ma_hang != ''`
    ).all()
    const existingMap = new Map<string, any>()
    for (const r of allExisting.results as any[]) {
      existingMap.set(`${r.ngay}|${r.so_ct}|${r.ma_hang}`, r)
    }

    const colNames = COL_MAP.map(m => m.db).join(', ')
    const placeholders = COL_MAP.map(() => '?').join(', ')
    const setClause = COL_MAP.map(m => `${m.db} = ?`).join(', ')

    const insertStmts: D1PreparedStatement[] = []
    const updateStmts: D1PreparedStatement[] = []
    let imported = 0, skipped = 0

    for (const record of records) {
      const norm: Record<string, any> = {}
      for (const m of COL_MAP) {
        let val = record[m.db]
        if (m.db === 'ngay' && typeof val === 'number') {
          const d = new Date((val - 25569) * 86400 * 1000)
          norm.ngay = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
          continue
        }
        if (['sl_ban', 'don_gia', 'doanh_so', 'ck', 'sl_tra', 'gt_tra', 'gt_giam', 'thue'].includes(m.db)) {
          norm[m.db] = typeof val === 'number' ? val : 0
        } else {
          norm[m.db] = val !== undefined && val !== null ? String(val).trim() : ''
        }
      }
      if (!norm.ma_hang) { skipped++; continue }

      const key = `${norm.ngay}|${norm.so_ct}|${norm.ma_hang}`
      const existing = existingMap.get(key)
      if (existing) { skipped++ }
      else {
        insertStmts.push(
          c.env.DB.prepare(`INSERT INTO so_chi_tiet_ban_hang (${colNames}) VALUES (${placeholders})`)
            .bind(...COL_MAP.map(m => norm[m.db]))
        )
        existingMap.set(key, { id: 0 }) // tránh trùng trong cùng chunk
        imported++
      }
    }

    const BATCH = 100
    for (let i = 0; i < insertStmts.length; i += BATCH) {
      await c.env.DB.batch(insertStmts.slice(i, i + BATCH))
    }

    // Tự thêm khách mới vào bảng chiết khấu
    const soKhachMoi = await themKhachMoiVaoBangCK(c.env.DB)

    return c.json({
      success: true,
      total: records.length,
      imported,
      skipped,
      so_khach_moi: soKhachMoi,
      message: `Import ${imported} dòng thành công${skipped ? `, bỏ qua ${skipped} dòng` : ''}. Tự thêm ${soKhachMoi} khách mới vào bảng chiết khấu.`,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default router
