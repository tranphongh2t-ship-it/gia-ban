import { Hono } from 'hono'
import { crudRoutes } from '../helpers/crud'
import { isMisaSyncLocked } from '../helpers/auditAutoProcess'
import { currentThang, syncMisaToBangsBulk } from '../helpers/giaGocSync'
import { buildLop2Ctx, tinhCKChoDong } from './chiet-khau'
import * as XLSX from 'xlsx'

type Env = { Bindings: { DB: D1Database } }

const TABLE = 'so_doi_chieu'
// Dữ liệu bảng tạm tự xóa sau 6h (sổ đối chiếu giá gốc + chiết khấu hàng ngày/tuần)
const TTL_HOURS = 6

const router = new Hono<Env>()

// Xóa dữ liệu quá TTL_HOURS trước mọi request
router.use('*', async (c, next) => {
  try {
    await c.env.DB.prepare(
      `DELETE FROM ${TABLE} WHERE created_at < datetime('now', ?)`
    ).bind(`-${TTL_HOURS} hours`).run()
  } catch {}
  await next()
})

// DELETE /clear must be before CRUD's /:id to avoid conflict
router.delete('/clear', async (c) => {
  try {
    await c.env.DB.prepare(`DELETE FROM ${TABLE}`).run()
    return c.json({ success: true, message: 'Đã xóa toàn bộ dữ liệu' })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /sync-lock — trạng thái khóa đồng bộ giá MISA (mọi người đọc được)
router.get('/sync-lock', async (c) => {
  try {
    const locked = await isMisaSyncLocked(c.env.DB)
    return c.json({ locked })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /sync-lock — bật/tắt khóa đồng bộ giá MISA (chỉ Admin)
router.post('/sync-lock', async (c) => {
  try {
    const { DB } = c.env
    const userId = c.req.header('x-user-id')
    if (!userId) return c.json({ error: 'Unauthorized' }, 401)
    const user = await DB.prepare(`SELECT id, ten, vai_tro FROM nhan_vien WHERE id = ?`).bind(userId).first() as any
    if (!user) return c.json({ error: 'User not found' }, 404)
    if (user.vai_tro !== 'admin') return c.json({ error: 'Chỉ Admin mới được bật/tắt khóa đồng bộ MISA' }, 403)

    const { locked } = await c.req.json()
    if (typeof locked !== 'boolean') return c.json({ error: 'Invalid payload' }, 400)

    await DB.prepare(
      `INSERT INTO misa_sync_lock (id, locked, updated_by, updated_at) VALUES (1, ?, ?, datetime('now','+7 hours'))
       ON CONFLICT(id) DO UPDATE SET locked = excluded.locked, updated_by = excluded.updated_by, updated_at = excluded.updated_at`
    ).bind(locked ? 1 : 0, user.ten || null).run()

    return c.json({ success: true, locked })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Giá gốc MISA tham chiếu cho từng dòng = giá MISA hiện hành (ma_misa.gia_goc)
const LIST_QUERY = `SELECT t.*, m.gia_goc AS gia_goc_misa, g.gia_goc AS gia_goc_by_ma
  FROM ${TABLE} t
  LEFT JOIN ma_misa m ON m.ma_sp = t.ma_hang
  LEFT JOIN gia_goc_by_ma g ON g.ma_sp = t.ma_hang`

// Chênh lệch = Giá gốc MISA - Đơn giá (chỉ tính dòng bán thật: don_gia > 0, khác mã Z*)
const CHENH_LECH_EXPR = `(CASE WHEN t.don_gia > 0 AND t.ma_hang NOT LIKE 'Z%' THEN
  (m.gia_goc - t.don_gia) ELSE NULL END)`

// % thuế thực tế = Thuế GTGT / Doanh số bán * 100 (mặc định chuẩn 8%)
const THUE_PCT_EXPR = `(CASE WHEN t.doanh_so > 0 THEN (t.thue / t.doanh_so * 100) ELSE NULL END)`
// Thuế Đúng/Sai: % thuế xấp xỉ 8% (±0.05) → Đúng; dòng không có doanh số → NULL
const THUE_DUNG_EXPR = `(CASE WHEN t.doanh_so > 0 AND ABS(t.thue / t.doanh_so * 100 - 8) < 0.05 THEN 'dung' WHEN t.doanh_so > 0 THEN 'sai' ELSE NULL END)`

const crud = crudRoutes({
  table: TABLE,
  idField: 'id',
  searchFields: ['ma_hang', 'ten_hang', 'ten_kh', 'so_chung_tu', 'dien_giai', 'ma_kh'],
  orderBy: 't.id DESC',
  listQuery: LIST_QUERY,
  extraFilterMap: {
    chech_lech: CHENH_LECH_EXPR,
    thue_pct: THUE_PCT_EXPR,
    thue_dung: THUE_DUNG_EXPR,
  },
})

router.route('/', crud)

const NUM_FIELDS = ['sl_ban', 'don_gia', 'doanh_so', 'ck', 'sl_tra', 'gt_tra', 'gt_giam', 'thue']

// 23 cột đúng file "Sổ chi tiết bán hàng file mới.xlsx" (theo header tiếng Việt)
const FIELD_ALIASES: Record<string, string[]> = {
  ngay_hach_toan: ['ngày hạch toán'],
  ngay_chung_tu: ['ngày chứng từ', 'ngày c/t'],
  so_chung_tu: ['số chứng từ', 'số c/t', 'số ct'],
  ngay_hoa_don: ['ngày hóa đơn'],
  so_hoa_don: ['số hóa đơn'],
  dien_giai_chung: ['diễn giải chung'],
  dien_giai: ['diễn giải'],
  ma_kh: ['mã khách hàng', 'mã kh'],
  ten_kh: ['tên khách hàng', 'tên kh'],
  ma_nhom_kh: ['mã nhóm khách hàng', 'mã nhóm kh'],
  ten_nhom_kh: ['tên nhóm khách hàng', 'tên nhóm kh'],
  ma_hang: ['mã hàng'],
  ten_hang: ['tên hàng'],
  dvt: ['đvt', 'đơn vị tính'],
  sl_ban: ['số lượng bán', 'tổng số lượng bán'],
  don_gia: ['đơn giá'],
  doanh_so: ['doanh số bán', 'doanh số'],
  ck: ['chiết khấu'],
  sl_tra: ['số lượng trả', 'tổng số lượng trả lại'],
  gt_tra: ['giá trị trả', 'giá trị trả lại'],
  gt_giam: ['giá trị giảm'],
  thue: ['thuế'],
  nv_ban: ['nv bán hàng', 'bán hàng', 'người bán'],
}
function normH(v: any): string {
  return String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
}
function detectCols(headerRow: any[]): Record<string, number> {
  const headers = Array.from({ length: (headerRow || []).length }, (_, i) => normH(headerRow[i]))
  const map: Record<string, number> = {}
  for (const db of Object.keys(FIELD_ALIASES)) {
    for (const alias of FIELD_ALIASES[db]) {
      const idx = headers.findIndex(h => h === alias || (alias.length > 2 && h.includes(alias)))
      if (idx >= 0) { map[db] = idx; break }
    }
  }
  return map
}

const COL_ORDER = Object.keys(FIELD_ALIASES)

const COLLAPSE = [
  { alias: 'dien_giai', into: 'dien_giai_chung' },
  { alias: 'ngay_chung_tu', into: 'ngay_hach_toan' },
]

function toDateStr(v: any): string {
  if (typeof v === 'number') {
    const d = new Date((v - 25569) * 86400 * 1000)
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  }
  const s = String(v ?? '').trim()
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(s)) {
    const [a, b, c] = s.split(/[\/-]/)
    return `${a.padStart(2, '0')}/${b.padStart(2, '0')}/${c.length === 2 ? '20' + c : c}`
  }
  return s
}

// Chuẩn hóa 1 dòng record từ JSON (import-rows / import-excel):
//   - ngày → định dạng dd/mm/yyyy
//   - cột số → number (0 nếu lỗi)
//   - diễn giải: nếu file chỉ có 1 cột diễn giải (chung) thì copy vào dien_giai_chung + dien_giai
function normalizeRecord(record: Record<string, any>): Record<string, any> {
  const norm: Record<string, any> = {}
  for (const db of COL_ORDER) {
    let val = record[db]
    if (['ngay_hach_toan', 'ngay_chung_tu', 'ngay_hoa_don'].includes(db)) {
      norm[db] = toDateStr(val)
    } else if (NUM_FIELDS.includes(db)) {
      norm[db] = typeof val === 'number' ? val : (val === undefined || val === null || val === '' ? 0 : Number(String(val).replace(/[^\d.-]/g, '')) || 0)
    } else {
      norm[db] = val !== undefined && val !== null ? String(val).trim() : ''
    }
  }
  // File chỉ có 1 cột "Diễn giải" → cả chung + chi tiết cùng giá trị
  for (const c of COLLAPSE) {
    if (!norm[c.into] && norm[c.alias]) norm[c.into] = norm[c.alias]
  }
  return norm
}

// Upsert danh sách các dòng vào bảng (dùng chung import-rows / import-excel / import/json)
async function upsertRecords(db: D1Database, records: any[]): Promise<{ imported: number; skipped: number }> {
  const allExisting = await db.prepare(
    `SELECT id, ngay_hach_toan, so_chung_tu, ma_hang, ngay_chung_tu FROM ${TABLE} WHERE ma_hang != ''`
  ).all()
  const existingMap = new Map<string, any>()
  for (const r of allExisting.results as any[]) {
    existingMap.set(`${r.ngay_hach_toan}|${r.so_chung_tu}|${r.ma_hang}`, r)
  }

  const colNames = COL_ORDER.join(', ')
  const placeholders = COL_ORDER.map(() => '?').join(', ')
  const setClause = COL_ORDER.map(c => `${c} = ?`).join(', ')

  const insertStmts: D1PreparedStatement[] = []
  const updateStmts: D1PreparedStatement[] = []
  let imported = 0, skipped = 0

  for (const record of records) {
    const norm = normalizeRecord(record)
    if (!norm.ma_hang) { skipped++; continue }

    const key = `${norm.ngay_hach_toan}|${norm.so_chung_tu}|${norm.ma_hang}`
    const existing = existingMap.get(key)
    if (existing) {
      let changed = false
      for (const c of COL_ORDER) {
        if (String(existing[c] ?? '') !== String(norm[c] ?? '')) { changed = true; break }
      }
      if (changed) {
        updateStmts.push(
          db.prepare(`UPDATE ${TABLE} SET ${setClause}, updated_at = datetime('now','+7 hours') WHERE id = ?`)
            .bind(...COL_ORDER.map(c => norm[c]), existing.id)
        )
        imported++
      } else { skipped++ }
    } else {
      insertStmts.push(
        db.prepare(`INSERT INTO ${TABLE} (${colNames}) VALUES (${placeholders})`)
          .bind(...COL_ORDER.map(c => norm[c]))
      )
      existingMap.set(key, { id: 0 })
      imported++
    }
  }

  const BATCH = 100
  for (let i = 0; i < insertStmts.length; i += BATCH) await db.batch(insertStmts.slice(i, i + BATCH))
  for (let i = 0; i < updateStmts.length; i += BATCH) await db.batch(updateStmts.slice(i, i + BATCH))
  return { imported, skipped }
}

// Tính lại CK engine + giá gốc tham chiếu cho MỌI dòng trong bảng
async function tinhHet(db: D1Database): Promise<number> {
  const { results: rows } = await db.prepare(
    `SELECT id, so_chung_tu AS so_ct, ma_kh, ngay_chung_tu AS ngay, ma_hang, sl_ban, don_gia, doanh_so, ck
     FROM ${TABLE}`
  ).all()
  const ctx = await buildLop2Ctx(db)
  const stmts: D1PreparedStatement[] = []
  for (const r of rows as any[]) {
    const tinh = await tinhCKChoDong(db, { ...r, ngay: r.ngay || '' }, ctx)
    stmts.push(db.prepare(
      `UPDATE ${TABLE} SET
         ck1_pct = ?, ck2_pct = ?, ck3_pct = ?, tong_pct = ?, ck_tinh = ?,
         nhom_mau = ?, dieu_kien = ?, giai_thich = ?, updated_at = datetime('now','+7 hours')
       WHERE id = ?`
    ).bind(
      tinh.ck1_pct ?? 0, tinh.ck2_pct ?? 0, tinh.ck3_pct ?? 0,
      tinh.tong_pct ?? 0, tinh.ck_tinh ?? 0,
      tinh.nhom_mau || null, tinh.dieu_kien || null, tinh.giai_thich || null,
      r.id
    ))
  }
  const BATCH = 100
  for (let i = 0; i < stmts.length; i += BATCH) await db.batch(stmts.slice(i, i + BATCH))
  return stmts.length
}

// POST /import-rows — nhận sẵn mảng dòng JSON (đã parse xlsx bên ngoài), upsert.
// KHÔNG tính lại CK ở đây (file chia chunk, tránh recompute N lần) — frontend gọi /tinh-het sau khi xong toàn bộ file.
router.post('/import-rows', async (c) => {
  try {
    const body = await c.req.json() as any
    const records: any[] = Array.isArray(body.rows) ? body.rows : []
    if (records.length === 0) return c.json({ error: 'Không có dữ liệu' }, 400)
    const { imported, skipped } = await upsertRecords(c.env.DB, records)
    return c.json({
      success: true,
      total: records.length,
      imported,
      skipped,
      message: `Import ${imported} dòng thành công${skipped ? `, bỏ qua ${skipped} dòng (trùng hoặc thiếu mã hàng)` : ''}.`,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /import-excel — nhận file xlsx (server parse)
router.post('/import-excel', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null
    if (!file) return c.json({ error: 'Không có file' }, 400)

    const buf = await file.arrayBuffer()
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    {
      const ref = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      let maxCol = ref.e.c, maxRow = ref.e.r
      for (const key of Object.keys(ws)) {
        if (key.startsWith('!')) continue
        const cell = XLSX.utils.decode_cell(key)
        if (cell.r > maxRow) maxRow = cell.r
        if (cell.c > maxCol) maxCol = cell.c
      }
      ws['!ref'] = XLSX.utils.encode_range({ s: ref.s, e: { r: maxRow, c: maxCol } })
    }
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]
    if (rows.length < 2) return c.json({ error: 'Không đọc được dữ liệu trong file' }, 400)

    const headerIdx = rows.findIndex(r => (r || []).some((cell: any) => normH(cell).includes('mã hàng')))
    if (headerIdx < 0) return c.json({ error: 'Không tìm thấy dòng tiêu đề (thiếu cột "Mã hàng")' }, 400)
    const colMap = detectCols(rows[headerIdx])
    if (colMap.ma_hang === undefined) return c.json({ error: 'Thiếu cột "Mã hàng" trong file' }, 400)

    const dataRows = rows.slice(headerIdx + 1).filter((r: any[]) => {
      if (!r || !r.some(cell => cell !== undefined && cell !== null && cell !== '')) return false
      if (normH(r[colMap.dien_giai] ?? '').startsWith('số dòng') || normH(r[colMap.dien_giai] ?? '').startsWith('tổng')) return false
      return r[colMap.ma_hang] !== undefined && r[colMap.ma_hang] !== null && String(r[colMap.ma_hang]).trim() !== ''
    })

    const records: any[] = []
    for (const row of dataRows) {
      const record: Record<string, any> = {}
      for (const db of COL_ORDER) {
        const idx = colMap[db]
        if (idx === undefined) continue
        record[db] = row[idx]
      }
      if (!record.ma_hang) continue
      records.push(record)
    }
    if (records.length === 0) return c.json({ error: 'Không có dòng dữ liệu hợp lệ trong file' }, 400)

    const { imported, skipped } = await upsertRecords(c.env.DB, records)
    const soDongTinh = await tinhHet(c.env.DB)
    return c.json({
      success: true,
      total: records.length,
      imported,
      skipped,
      so_dong_tinh: soDongTinh,
      message: `Import ${imported} dòng thành công${skipped ? `, bỏ qua ${skipped} dòng (trùng hoặc thiếu mã hàng)` : ''}. Đã tính lại CK cho ${soDongTinh} dòng.`,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

async function recomputeGiaGoc(db: D1Database): Promise<number> {
  const res = await db.prepare(
    `UPDATE ${TABLE} AS t SET gia_goc = (SELECT m.gia_goc FROM ma_misa m WHERE m.ma_sp = t.ma_hang)`
  ).run()
  return (res.meta?.changes || 0) as number
}

// POST /recompute-gia-goc — tính lại "giá gốc MISA tham chiếu" cho toàn bộ dữ liệu hiện có
router.post('/recompute-gia-goc', async (c) => {
  try {
    const updated = await recomputeGiaGoc(c.env.DB)
    return c.json({ success: true, updated })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /tinh-het — tính lại CK engine cho mọi dòng (dùng lại engine chuẩn bang-ck-thang)
router.post('/tinh-het', async (c) => {
  try {
    const soDong = await tinhHet(c.env.DB)
    return c.json({ success: true, so_dong: soDong, message: `Tính lại CK cho ${soDong} dòng theo chuẩn bang-ck-thang.` })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /tinh-het-chi-tiet/:id — tính lại CK chi tiết cho 1 dòng (sau khi sửa khách / đổi tháng)
router.post('/tinh-het-chi-tiet/:id', async (c) => {
  try {
    const db = c.env.DB
    const id = c.req.param('id')
    const row = await db.prepare(
      `SELECT id, so_chung_tu AS so_ct, ma_kh, ngay_chung_tu AS ngay, ma_hang, sl_ban, don_gia, doanh_so, ck FROM ${TABLE} WHERE id = ?`
    ).bind(id).first() as any
    if (!row) return c.json({ error: 'Không tìm thấy dòng' }, 404)
    const ctx = await buildLop2Ctx(db)
    const tinh = await tinhCKChoDong(db, { ...row, ngay: row.ngay || '' }, ctx)
    await db.prepare(
      `UPDATE ${TABLE} SET
         ck1_pct = ?, ck2_pct = ?, ck3_pct = ?, tong_pct = ?, ck_tinh = ?,
         nhom_mau = ?, dieu_kien = ?, giai_thich = ?, updated_at = datetime('now','+7 hours')
       WHERE id = ?`
    ).bind(
      tinh.ck1_pct ?? 0, tinh.ck2_pct ?? 0, tinh.ck3_pct ?? 0,
      tinh.tong_pct ?? 0, tinh.ck_tinh ?? 0,
      tinh.nhom_mau || null, tinh.dieu_kien || null, tinh.giai_thich || null,
      id
    ).run()
    const updated = await db.prepare(`SELECT * FROM ${TABLE} WHERE id = ?`).bind(id).first()
    return c.json({ success: true, data: updated })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /lich-su/:id — lịch sử chỉnh sửa của 1 dòng (log trong thay_doi_log)
router.get('/lich-su/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const logs = await c.env.DB.prepare(
      `SELECT * FROM thay_doi_log WHERE bang = '${TABLE}' AND ref_id = ? ORDER BY created_at DESC, id DESC`
    ).bind(id).all()
    return c.json({ data: logs.results || [] })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /sua-ck — sửa % từng loại CK cho 1 dòng, tự tính lại tổng + số tiền + ghi log
// Body: { id, sua_ck1_pct, sua_ck2_pct, sua_ck3_pct, updated_by? } — null/undefined = giữ nguyên engine
router.post('/sua-ck', async (c) => {
  try {
    const db = c.env.DB
    const body = await c.req.json() as any
    const id = Number(body.id)
    if (!id) return c.json({ error: 'Thiếu id' }, 400)

    const row = await db.prepare(
      `SELECT id, ngay_chung_tu, doanh_so, ck1_pct, ck2_pct, ck3_pct, sua_ck1_pct, sua_ck2_pct, sua_ck3_pct, sua_tong_pct FROM ${TABLE} WHERE id = ?`
    ).bind(id).first() as any
    if (!row) return c.json({ error: 'Không tìm thấy dòng' }, 404)

    const num = (v: any) => (v === null || v === undefined || v === '') ? null : Number(v)
    const sua1 = body.sua_ck1_pct !== undefined ? num(body.sua_ck1_pct) : row.sua_ck1_pct
    const sua2 = body.sua_ck2_pct !== undefined ? num(body.sua_ck2_pct) : row.sua_ck2_pct
    const sua3 = body.sua_ck3_pct !== undefined ? num(body.sua_ck3_pct) : row.sua_ck3_pct

    const tong = (sua1 ?? row.ck1_pct ?? 0) + (sua2 ?? row.ck2_pct ?? 0) + (sua3 ?? row.ck3_pct ?? 0)
    const doanhSo = Number(row.doanh_so) || 0
    const soTien = Math.round(doanhSo * tong)
    const moi = { sua_ck1_pct: sua1, sua_ck2_pct: sua2, sua_ck3_pct: sua3, sua_tong_pct: tong }

    await db.prepare(
      `UPDATE ${TABLE} SET
         sua_ck1_pct = ?, sua_ck2_pct = ?, sua_ck3_pct = ?, sua_tong_pct = ?, sua_ck_tinh = ?,
         sua_ghichu = ?, updated_by = ?, updated_at = datetime('now','+7 hours')
       WHERE id = ?`
    ).bind(sua1, sua2, sua3, tong, soTien, body.sua_ghichu || null, body.updated_by || null, id).run()

    const pctFmt = (v: any) => (v === null || v === undefined || v === '') ? '—' : `${(Number(v) * 100).toFixed(2)}%`
    const cols: Array<[string, any, any]> = [
      ['sua_ck1_pct', row.sua_ck1_pct, sua1],
      ['sua_ck2_pct', row.sua_ck2_pct, sua2],
      ['sua_ck3_pct', row.sua_ck3_pct, sua3],
      ['sua_tong_pct', row.sua_tong_pct, tong],
    ]
    const thang = (() => {
      const m = String(row.ngay_chung_tu || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
      return m ? `${m[3]}-${m[2]}` : ''
    })()
    for (const [cot, cu, m] of cols) {
      if (String(cu ?? '') === String(m ?? '')) continue
      await db.prepare(
        `INSERT INTO thay_doi_log (bang, ref_id, cot, gia_tri_cu, gia_tri_moi, updated_by, thang)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(TABLE, id, cot, pctFmt(cu), pctFmt(m), body.updated_by || null, thang).run()
    }

    const updated = await db.prepare(`SELECT * FROM ${TABLE} WHERE id = ?`).bind(id).first()
    return c.json({ success: true, data: updated })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /dong-bo-tat-ca — đồng bộ giá MISA = giá bán (đơn giá mới nhất) cho TẤT CẢ mã trong file (chỉ Admin).
// Bỏ qua quy tắc "lần đầu/lần sau" và trạng thái khóa — ép đồng bộ thủ công.
router.post('/dong-bo-tat-ca', async (c) => {
  try {
    const { DB } = c.env
    const userId = c.req.header('x-user-id')
    if (!userId) return c.json({ error: 'Unauthorized' }, 401)
    const user = await DB.prepare(`SELECT id, ten, vai_tro FROM nhan_vien WHERE id = ?`).bind(userId).first() as any
    if (!user) return c.json({ error: 'User not found' }, 404)
    if (user.vai_tro !== 'admin') return c.json({ error: 'Chỉ Admin mới được đồng bộ tất cả' }, 403)

    const body = (await c.req.json().catch(() => ({}))) as { dryRun?: boolean }
    const dryRun = !!body.dryRun

    const { results: rawRows } = await DB.prepare(
      `SELECT ma_hang, ten_hang, don_gia, sl_ban, ngay_chung_tu AS ngay
       FROM ${TABLE}
       WHERE ma_hang IS NOT NULL AND ma_hang != '' AND ma_hang NOT LIKE 'Z%' AND don_gia > 0
       ORDER BY rowid ASC`
    ).all()
    const rows = (rawRows || []) as any[]

    const ngayKey = (d: any): string => {
      const s = String(d ?? '').trim()
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
        const [a, b, c] = s.split('/')
        return c + b.padStart(2, '0') + a.padStart(2, '0')
      }
      return '00000000'
    }
    const byMa = new Map<string, { ten: string; rows: { don_gia: number; ngay: string }[] }>()
    for (const r of rows) {
      const ma = String(r.ma_hang).trim()
      if (!byMa.has(ma)) byMa.set(ma, { ten: String(r.ten_hang || '').trim(), rows: [] })
      byMa.get(ma)!.rows.push({ don_gia: Number(r.don_gia) || 0, ngay: r.ngay })
    }
    const maList = Array.from(byMa.keys())
    if (maList.length === 0) return c.json({ success: true, message: 'Không có mã hàng nào để đồng bộ' })

    const misaByMa = new Map<string, { gia_goc: number }>()
    const IN_CHUNK = 90
    for (let i = 0; i < maList.length; i += IN_CHUNK) {
      const chunk = maList.slice(i, i + IN_CHUNK)
      const ph = chunk.map(() => '?').join(', ')
      const res = await DB.prepare(`SELECT ma_sp, gia_goc FROM ma_misa WHERE ma_sp IN (${ph})`).bind(...chunk).all()
      for (const r of (res as any).results || []) misaByMa.set(String(r.ma_sp).toUpperCase(), { gia_goc: Number(r.gia_goc) || 0 })
    }
    const pickPrice = (info: { rows: { don_gia: number; ngay: string }[] }) => {
      let best = 0, bestKey = '00000000'
      for (const r of info.rows) {
        const g = Number(r.don_gia) || 0
        if (!(g > 0)) continue
        const k = ngayKey(r.ngay)
        if (k > bestKey) { best = g; bestKey = k }
        else if (k === bestKey && best === 0) best = g
      }
      return best
    }

    const thang = currentThang()
    const insertStmts: D1PreparedStatement[] = []
    const histStmts: D1PreparedStatement[] = []
    const tuDong: any[] = []
    let daKhop = 0
    for (const ma of maList) {
      const gia = pickPrice(byMa.get(ma)!)
      if (!Number.isInteger(gia) || !(gia > 0)) continue
      const misa = misaByMa.get(ma.toUpperCase())
      if (!misa || Math.abs(misa.gia_goc - gia) < 1) {
        if (misa) daKhop++
        continue
      }
      tuDong.push({ ma_sp: ma, gia_cu: misa.gia_goc, gia_moi: gia })
      if (dryRun) continue
      insertStmts.push(DB.prepare(
        `UPDATE ma_misa SET gia_goc = ?, updated_at = datetime('now','+7 hours'), updated_by = 'so-doi-chieu' WHERE ma_sp = ?`
      ).bind(gia, ma))
      histStmts.push(DB.prepare(
        'INSERT INTO ma_misa_gia_history (ma_sp, thang, gia_cu, gia_goc, nguon, updated_by) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(ma, thang, misa.gia_goc, gia, 'so-doi-chieu', user.ten || 'auto'))
    }

    if (!dryRun) {
      const BATCH = 100
      for (const arr of [insertStmts, histStmts]) {
        for (let i = 0; i < arr.length; i += BATCH) await DB.batch(arr.slice(i, i + BATCH))
      }
      if (tuDong.length) {
        await syncMisaToBangsBulk(DB, tuDong.map(v => ({ ma_sp: v.ma_sp, gia_moi: v.gia_moi })), 'so-doi-chieu')
        await recomputeGiaGoc(DB)
      }
    }

    return c.json({
      success: true,
      dryRun,
      message: `${dryRun ? 'Dự kiến đồng bộ' : 'Đã đồng bộ'} giá MISA = đơn giá bán mới nhất: đổi ${tuDong.length} mã, khớp ${daKhop}.`,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default router