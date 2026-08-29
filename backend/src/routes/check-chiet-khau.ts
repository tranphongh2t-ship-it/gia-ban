import { Hono } from 'hono'
import { crudRoutes, reqUser, isAdmin } from '../helpers/crud'
import { buildLop2Ctx, tinhCKChoDong } from './chiet-khau'
import * as XLSX from 'xlsx'

type Env = { Bindings: { DB: D1Database } }

const TABLE = 'check_chiet_khau_test'
// Dữ liệu bảng tạm tự xóa sau 6h (test đối chiếu chiết khấu)
const TTL_HOURS = 6

const router = new Hono<Env>()

// Kiểm tra quyền truy cập 1 dòng theo chủ sở hữu (bảng tách theo user).
// Trả về { ok } hoặc { ok:false, status, error }.
async function checkOwnerRow(db: D1Database, c: any, id: string, modify: boolean): Promise<{ ok: boolean; status?: any; error?: string }> {
  const row = await db.prepare(`SELECT owner_user_id FROM ${TABLE} WHERE id = ?`).bind(id).first() as any
  if (!row) return { ok: false, status: 404, error: 'Not found' }
  const owner = row.owner_user_id as number | null
  if (owner == null) {
    // Dòng cũ (NULL): ai cũng xem được; chỉ admin sửa được
    if (modify) {
      const me = await reqUser(db, c)
      if (!me) return { ok: false, status: 401, error: 'Bắt buộc đăng nhập' }
      if (isAdmin(me)) return { ok: true }
      return { ok: false, status: 403, error: 'Dữ liệu cũ chỉ Admin được sửa' }
    }
    return { ok: true }
  }
  const me = await reqUser(db, c)
  if (!me) return { ok: false, status: 401, error: 'Bắt buộc đăng nhập' }
  if (isAdmin(me) || Number(owner) === Number(me.id)) return { ok: true }
  return { ok: false, status: 403, error: 'Không có quyền truy cập dữ liệu của người khác' }
}

// Xóa dữ liệu quá TTL_HOURS trước mọi request (chạy tối đa 1 lần/10 phút)
let lastTtlCleanup = 0
const TTL_CLEANUP_INTERVAL_MS = 10 * 60 * 1000
router.use('*', async (c, next) => {
  const now = Date.now()
  if (now - lastTtlCleanup >= TTL_CLEANUP_INTERVAL_MS) {
    lastTtlCleanup = now
    try {
      await c.env.DB.prepare(
        `DELETE FROM ${TABLE} WHERE created_at < datetime('now', ?)`
      ).bind(`-${TTL_HOURS} hours`).run()
    } catch {}
  }
  await next()
})

// DELETE /clear must be before CRUD's /:id to avoid conflict
router.delete('/clear', async (c) => {
  try {
    const userId = Number(c.req.header('x-user-id'))
    const me = userId
      ? await c.env.DB.prepare(`SELECT id, vai_tro FROM nhan_vien WHERE id = ?`).bind(userId).first() as any
      : null
    if (me?.vai_tro === 'admin') {
      await c.env.DB.prepare(`DELETE FROM ${TABLE}`).run()
    } else if (me) {
      await c.env.DB.prepare(`DELETE FROM ${TABLE} WHERE owner_user_id = ?`).bind(me.id).run()
    } else {
      return c.json({ error: 'Bắt buộc đăng nhập' }, 401)
    }
    return c.json({ success: true, message: me?.vai_tro === 'admin' ? 'Đã xóa toàn bộ dữ liệu' : 'Đã xóa dữ liệu của bạn' })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

const LIST_QUERY = `SELECT t.* FROM ${TABLE} t`

const crud = crudRoutes({
  table: TABLE,
  idField: 'id',
  searchFields: ['ma_hang', 'ten_hang', 'ten_kh', 'so_ct', 'dien_giai'],
  orderBy: 'id DESC',
  listQuery: LIST_QUERY,
  ownerField: 'owner_user_id',
  extraFilterMap: {
    sai_so: `CASE WHEN ABS(t.ck - COALESCE(t.sua_ck_tinh, t.ck_tinh)) <= 1 THEN 'dung' ELSE 'sai' END`,
  },
})

// Danh sách các user đang có dữ liệu (cho dropdown "Lấy file người khác")
// Mọi account đăng nhập đều xem được (chỉ thấy tên + số dòng, không thấy dữ liệu).
router.get('/owners', async (c) => {
  try {
    const me = await reqUser(c.env.DB, c)
    if (!me) return c.json({ error: 'Bắt buộc đăng nhập' }, 401)
    const res = await c.env.DB.prepare(
      `SELECT u.id AS user_id, u.ten, u.vai_tro, COUNT(s.id) AS so_dong
       FROM nhan_vien u
       LEFT JOIN ${TABLE} s ON s.owner_user_id = u.id
       GROUP BY u.id, u.ten, u.vai_tro
       HAVING COUNT(s.id) > 0
       ORDER BY u.ten`
    ).all()
    const legacy = await c.env.DB.prepare(
      `SELECT COUNT(*) AS total FROM ${TABLE} WHERE owner_user_id IS NULL`
    ).first()
    return c.json({
      data: res.results,
      khong_so_huu: Number((legacy as any)?.total || 0),
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

router.route('/', crud)

const NUM_FIELDS = ['sl_ban', 'don_gia', 'doanh_so', 'ck', 'sl_tra', 'gt_tra', 'gt_giam', 'thue']

const COL_MAP = [
  { db: 'ngay', idx: 0 },
  { db: 'so_ct', idx: 1 },
  { db: 'dien_giai', idx: 2 },
  { db: 'ma_kh', idx: 3 },
  { db: 'ten_kh', idx: 4 },
  { db: 'ma_hang', idx: 5 },
  { db: 'ten_hang', idx: 6 },
  { db: 'sl_ban', idx: 8 },
  { db: 'don_gia', idx: 9 },
  { db: 'doanh_so', idx: 10 },
  { db: 'ck', idx: 11 },
  { db: 'sl_tra', idx: 12 },
  { db: 'gt_tra', idx: 13 },
  { db: 'gt_giam', idx: 14 },
  { db: 'thue', idx: 15 },
]

const FIELD_ALIASES: Record<string, string[]> = {
  ngay: ['ngày chứng từ', 'ngày hạch toán', 'ngày'],
  so_ct: ['số chứng từ', 'số c/t', 'số ct'],
  dien_giai: ['diễn giải'],
  ma_kh: ['mã khách hàng', 'mã kh'],
  ten_kh: ['tên khách hàng', 'tên kh'],
  ma_hang: ['mã hàng'],
  ten_hang: ['tên hàng'],
  sl_ban: ['số lượng bán', 'tổng số lượng bán'],
  don_gia: ['đơn giá'],
  doanh_so: ['doanh số bán', 'doanh số'],
  ck: ['chiết khấu'],
  sl_tra: ['số lượng trả', 'tổng số lượng trả lại'],
  gt_tra: ['giá trị trả'],
  gt_giam: ['giá trị giảm'],
  thue: ['thuế'],
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

// Tính CK cho 1 dòng = kết quả engine chuẩn (buildLop2Ctx preload 1 lần) + lưu lại từng loại %
async function tinhVaLuuDong(db: D1Database, ctx: any, row: any) {
  const tinh = await tinhCKChoDong(db, row, ctx)
  return db.prepare(
    `UPDATE ${TABLE} SET
       ck1_pct = ?, ck2_pct = ?, ck3_pct = ?, tong_pct = ?, ck_tinh = ?,
       nhom_mau = ?, dieu_kien = ?, giai_thich = ?, updated_at = datetime('now','+7 hours')
     WHERE id = ?`
  ).bind(
    tinh.ck1_pct ?? 0,
    tinh.ck2_pct ?? 0,
    tinh.ck3_pct ?? 0,
    tinh.tong_pct ?? 0,
    tinh.ck_tinh ?? 0,
    tinh.nhom_mau || null,
    tinh.dieu_kien || null,
    tinh.giai_thich || null,
    row.id
  )
}

// Upsert nhiều dòng vào bảng test (dùng chung cho import-rows / import-excel).
// Với ownerField: mỗi user chỉ đụng dòng của mình — dòng trùng key thuộc người khác (hoặc dữ liệu cũ) → bỏ qua.
async function upsertRecords(db: D1Database, records: any[], ownerId?: number | null): Promise<{ imported: number; skipped: number }> {
  const isOwned = !!ownerId
  const allExisting = await db.prepare(
    `SELECT id, owner_user_id, ngay, so_ct, ma_hang FROM ${TABLE} WHERE ma_hang != ''`
  ).all()
  const ownMap = new Map<string, any>()
  for (const r of allExisting.results as any[]) {
    const own = isOwned ? Number(r.owner_user_id) === Number(ownerId) : true
    const key = `${r.ngay}|${r.so_ct}|${r.ma_hang}`
    if (own) ownMap.set(key, r)
  }

  const colNames = COL_MAP.map(m => m.db).join(', ')
  const placeholders = COL_MAP.map(() => '?').join(', ')
  const setClause = COL_MAP.map(m => `${m.db} = ?`).join(', ')
  const ownerCols = isOwned ? `${colNames}, owner_user_id` : colNames
  const ownerPlaceholders = isOwned ? `${placeholders}, ?` : placeholders

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
      if (NUM_FIELDS.includes(m.db)) {
        norm[m.db] = typeof val === 'number' ? val : 0
      } else {
        norm[m.db] = val !== undefined && val !== null ? String(val).trim() : ''
      }
    }
    if (!norm.ma_hang) { skipped++; continue }

    const key = `${norm.ngay}|${norm.so_ct}|${norm.ma_hang}`

    const existing = ownMap.get(key)
    if (existing) {
      let changed = false
      for (const m of COL_MAP) {
        if (String(existing[m.db] ?? '') !== String(norm[m.db] ?? '')) { changed = true; break }
      }
      if (changed) {
        updateStmts.push(
          db.prepare(`UPDATE ${TABLE} SET ${setClause} WHERE id = ?`)
            .bind(...COL_MAP.map(m => norm[m.db]), existing.id)
        )
        imported++
      } else { skipped++ }
    } else {
      insertStmts.push(
        db.prepare(`INSERT INTO ${TABLE} (${ownerCols}) VALUES (${ownerPlaceholders})`)
          .bind(...COL_MAP.map(m => norm[m.db]), ...(isOwned ? [ownerId] : []))
      )
      ownMap.set(key, { id: 0 })
      imported++
    }
  }

  const BATCH = 100
  for (let i = 0; i < insertStmts.length; i += BATCH) {
    await db.batch(insertStmts.slice(i, i + BATCH))
  }
  for (let i = 0; i < updateStmts.length; i += BATCH) {
    await db.batch(updateStmts.slice(i, i + BATCH))
  }
  return { imported, skipped }
}

// Sau import: tự thêm khách mới vào bảng chiết khấu (danh_sach_khach) nếu chưa có
// — mặc định Xưởng thường (PREMIUM/Thuong/XUONG_THUONG, CK 20%/7%) theo chính sách 2026.
// ownerId != null → chỉ dò khách mới trong dữ liệu của user đó.
async function themKhachMoiVaoBangCK(db: D1Database, ownerId?: number | null): Promise<number> {
  const scope = ownerId != null ? ` AND t.owner_user_id = ?` : ''
  const params = ownerId != null ? [ownerId] : []
  const { results } = await db.prepare(
    `SELECT t.ma_kh, MAX(t.ten_kh) AS ten_kh
     FROM ${TABLE} t
     WHERE t.ma_kh IS NOT NULL AND t.ma_kh != ''
       AND t.ma_kh NOT IN (SELECT ma_kh FROM danh_sach_khach)${scope}
     GROUP BY t.ma_kh`
  ).bind(...params).all()
  let so = 0
  const batch: D1PreparedStatement[] = []
  for (const r of results as any[]) {
    batch.push(
      db.prepare(
        `INSERT INTO danh_sach_khach (ma_kh, ten_kh, doi_tuong, hang, nhom, ck_ds_98mau_pct, ck_ds_khac_pct)
         VALUES (?, ?, 'PREMIUM', 'Thuong', 'XUONG_THUONG', 0.20, 0.07)`
      ).bind(String(r.ma_kh), String(r.ten_kh || ''))
    )
    so++
  }
  for (let i = 0; i < batch.length; i += 50) await db.batch(batch.slice(i, i + 50))
  return so
}

// POST /import-rows — nhận sẵn mảng dòng JSON (đã parse xlsx bên ngoài), upsert dữ liệu
router.post('/import-rows', async (c) => {
  try {
    const body = await c.req.json() as any
    const records: any[] = Array.isArray(body.rows) ? body.rows : []
    if (records.length === 0) return c.json({ error: 'Không có dữ liệu' }, 400)
    const ownerId = Number(c.req.header('x-user-id')) || null
    const { imported, skipped } = await upsertRecords(c.env.DB, records, ownerId)
    const soKhachMoi = await themKhachMoiVaoBangCK(c.env.DB, ownerId)
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

// POST /import-excel — nhận file xlsx (server parse)
router.post('/import-excel', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null
    if (!file) return c.json({ error: 'Không có file' }, 400)

    const buf = await file.arrayBuffer()
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]
    if (rows.length < 2) return c.json({ error: 'Không đọc được dữ liệu trong file' }, 400)

    const headerIdx = rows.findIndex(r => (r || []).some((cell: any) => normH(cell).includes('mã hàng')))
    if (headerIdx < 0) return c.json({ error: 'Không tìm thấy dòng tiêu đề (thiếu cột "Mã hàng")' }, 400)
    const colMap = detectCols(rows[headerIdx])
    if (colMap.ma_hang === undefined) return c.json({ error: 'Thiếu cột "Mã hàng" trong file' }, 400)

    const dataRows = rows.slice(headerIdx + 1).filter((r: any[]) => {
      if (!r || !r.some(c => c !== undefined && c !== null && c !== '')) return false
      if (normH(r[colMap.dien_giai]!).startsWith('số dòng') || normH(r[colMap.dien_giai]!).startsWith('tổng')) return false
      return r[colMap.ma_hang] !== undefined && r[colMap.ma_hang] !== null && String(r[colMap.ma_hang]).trim() !== ''
    })

    const records: any[] = []
    const dbFields = Object.keys(FIELD_ALIASES)
    for (const row of dataRows) {
      const record: Record<string, any> = {}
      for (const db of dbFields) {
        const idx = colMap[db]
        if (idx === undefined) continue
        let val: any = row[idx]
        if (db === 'ngay' && typeof val === 'number') {
          const d = new Date((val - 25569) * 86400 * 1000)
          val = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
        }
        if (NUM_FIELDS.includes(db)) {
          val = typeof val === 'number' ? val : 0
        } else {
          val = val !== undefined && val !== null ? String(val).trim() : ''
        }
        record[db] = val
      }
      if (!record.ma_hang) continue
      records.push(record)
    }

    const { imported, skipped } = await upsertRecords(c.env.DB, records, Number(c.req.header('x-user-id')) || null)
    const soKhachMoi = await themKhachMoiVaoBangCK(c.env.DB, Number(c.req.header('x-user-id')) || null)
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

// POST /tinh-het — tính lại CK engine theo phạm vi đang xem (admin: toàn bộ)
router.post('/tinh-het', async (c) => {
  try {
    const db = c.env.DB
    const me = await reqUser(db, c)
    if (!me) return c.json({ error: 'Bắt buộc đăng nhập' }, 401)
    const ownerId = me && !isAdmin(me) ? me.id : null
    const ownerCond = ownerId != null ? ' WHERE owner_user_id = ?' : ''
    const ownerParams = ownerId != null ? [ownerId] : []
    const { results: rows } = await db.prepare(
      `SELECT id, so_ct, ma_kh, ngay, ma_hang, sl_ban, don_gia, doanh_so, ck, hinh_thuc_giao, la_khuyen_mai, la_thanh_ly, ds_mel_running
       FROM ${TABLE}${ownerCond}`
    ).bind(...ownerParams).all()
    const ctx = await buildLop2Ctx(db)
    const stmts: D1PreparedStatement[] = []
    for (const r of (rows as any[])) {
      stmts.push(await tinhVaLuuDong(db, ctx, r))
    }
    const BATCH = 100
    for (let i = 0; i < stmts.length; i += BATCH) {
      await db.batch(stmts.slice(i, i + BATCH))
    }
    return c.json({ success: true, so_dong: stmts.length, message: `Tính lại CK cho ${stmts.length} dòng theo chuẩn bang-ck-thang.` })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /tinh-het-chi-tiet — tính lại CK chi tiết cho một dòng (sau khi sửa khách / đổi tháng)
router.post('/tinh-het-chi-tiet/:id', async (c) => {
  try {
    const db = c.env.DB
    const id = c.req.param('id')
    const access = await checkOwnerRow(db, c, id, false)
    if (!access.ok) return c.json({ error: access.error! }, access.status)
    const row = await db.prepare(
      `SELECT id, so_ct, ma_kh, ngay, ma_hang, sl_ban, don_gia, doanh_so, ck, hinh_thuc_giao, la_khuyen_mai, la_thanh_ly, ds_mel_running
       FROM ${TABLE} WHERE id = ?`
    ).bind(id).first() as any
    if (!row) return c.json({ error: 'Không tìm thấy dòng' }, 404)
    const ctx = await buildLop2Ctx(db)
    await tinhVaLuuDong(db, ctx, row)
    const updated = await db.prepare(`SELECT * FROM ${TABLE} WHERE id = ?`).bind(id).first()
    return c.json({ success: true, data: updated })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /lich-su/:id — lịch sử chỉnh sửa của 1 dòng (log trong thay_doi_log)
router.get('/lich-su/:id', async (c) => {
  try {
    const db = c.env.DB
    const id = c.req.param('id')
    const access = await checkOwnerRow(db, c, id, false)
    if (!access.ok) return c.json({ error: access.error! }, access.status)
    const logs = await db.prepare(
      `SELECT * FROM thay_doi_log WHERE bang = '${TABLE}' AND ref_id = ? ORDER BY created_at DESC, id DESC`
    ).bind(Number(id)).all()
    return c.json({ data: logs.results || [] })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Ghi log thay đổi CK sửa vào thay_doi_log (1 dòng/cột đổi giá trị)
async function logSuaCK(db: D1Database, id: number, thang: string, updatedBy: string | null, cu: any, moi: any) {
  const pctFmt = (v: any) => (v === null || v === undefined || v === '') ? '—' : `${(Number(v) * 100).toFixed(2)}%`
  const cols: Array<[string, any, any]> = [
    ['sua_ck1_pct', cu.sua_ck1_pct, moi.sua_ck1_pct],
    ['sua_ck2_pct', cu.sua_ck2_pct, moi.sua_ck2_pct],
    ['sua_ck3_pct', cu.sua_ck3_pct, moi.sua_ck3_pct],
    ['sua_tong_pct', cu.sua_tong_pct, moi.sua_tong_pct],
  ]
  for (const [cot, c, m] of cols) {
    if (String(c ?? '') === String(m ?? '')) continue
    await db.prepare(
      `INSERT INTO thay_doi_log (bang, ref_id, cot, gia_tri_cu, gia_tri_moi, updated_by, thang)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(TABLE, id, cot, pctFmt(c), pctFmt(m), updatedBy, thang).run()
  }
}

function thangCuaNgay(ngay?: string | null): string {
  const s = String(ngay || '').trim()
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2]}` : ''
}

// POST /sua-ck — người dùng sửa % từng loại CK cho 1 dòng, tự tính lại tổng + số tiền.
// Body: { id, sua_ck1_pct, sua_ck2_pct, sua_ck3_pct, updated_by? } — null/undefined = giữ nguyên engine
router.post('/sua-ck', async (c) => {
  try {
    const db = c.env.DB
    const body = await c.req.json() as any
    const id = Number(body.id)
    if (!id) return c.json({ error: 'Thiếu id' }, 400)
    const access = await checkOwnerRow(db, c, String(id), true)
    if (!access.ok) return c.json({ error: access.error! }, access.status)

    const row = await db.prepare(
      `SELECT id, ngay, doanh_so, ck1_pct, ck2_pct, ck3_pct, sua_ck1_pct, sua_ck2_pct, sua_ck3_pct, sua_tong_pct FROM ${TABLE} WHERE id = ?`
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
         updated_by = ?, updated_at = datetime('now','+7 hours')
       WHERE id = ?`
    ).bind(sua1, sua2, sua3, tong, soTien, body.updated_by || null, id).run()

    await logSuaCK(db, id, thangCuaNgay(row.ngay), body.updated_by || null, {
      sua_ck1_pct: row.sua_ck1_pct, sua_ck2_pct: row.sua_ck2_pct, sua_ck3_pct: row.sua_ck3_pct, sua_tong_pct: row.sua_tong_pct,
    }, moi)

    const updated = await db.prepare(`SELECT * FROM ${TABLE} WHERE id = ?`).bind(id).first()
    return c.json({ success: true, data: updated })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /sua-ck-hang-loat — gán tay hàng loạt theo mẫu nhận diện (cho pass đối chiếu mà không đổi engine).
//   Body: { mode: 'sg_thieu_1pct' | 'tinh_thua_1pct' } — dùng delta % giữa sổ (ck) và engine (ck_tinh):
//   - sg_thieu_1pct:  dòng SG lệch đúng +1% (sổ = engine + 1%) → thêm 1% vận chuyển vào sua_ck2.
//   - tinh_thua_1pct: dòng Tỉnh lệch đúng -1% (engine cộng thừa VC 1% trên đơn nhỏ) → chặn sua_ck2 = 0.
router.post('/sua-ck-hang-loat', async (c) => {
  try {
    const db = c.env.DB
    const body = await c.req.json().catch(() => ({})) as any
    const mode = body.mode
    if (!['sg_thieu_1pct', 'tinh_thua_1pct'].includes(mode)) {
      return c.json({ error: 'Thiếu/không đúng mode' }, 400)
    }
    const baseWhere = mode === 'sg_thieu_1pct'
      ? `ROUND((ck - COALESCE(ck_tinh,0)) / doanh_so, 4) = 0.01
         AND doanh_so > 0
         AND ma_kh IN (SELECT ma_kh FROM danh_sach_khach WHERE vung = 'SaiGon')`
      : `ROUND((ck - COALESCE(ck_tinh,0)) / doanh_so, 4) = -0.01
         AND doanh_so > 0
         AND ma_kh IN (SELECT ma_kh FROM danh_sach_khach WHERE vung = 'Tinh')`
    const delta = mode === 'sg_thieu_1pct' ? 0.01 : 0
    const me = await reqUser(db, c)
    if (!me) return c.json({ error: 'Bắt buộc đăng nhập' }, 401)
    const ownerCond = me && !isAdmin(me) ? ' AND owner_user_id = ?' : ''
    const ownerParams = me && !isAdmin(me) ? [me.id] : []
    const { results: affected } = await db.prepare(
      `SELECT id, ngay, ck1_pct, ck2_pct, ck3_pct, sua_ck1_pct, sua_ck2_pct, sua_ck3_pct, sua_tong_pct FROM ${TABLE} WHERE ${baseWhere}${ownerCond}`
    ).bind(...ownerParams).all()
    if (affected.length === 0) return c.json({ success: true, so_dong: 0, message: 'Không có dòng nào khớp' })
    await db.prepare(
      `UPDATE ${TABLE} SET
         sua_ck1_pct = COALESCE(ck1_pct, 0),
         sua_ck2_pct = ?,
         sua_ck3_pct = COALESCE(ck3_pct, 0),
         sua_tong_pct = COALESCE(ck1_pct, 0) + ? + COALESCE(ck3_pct, 0),
         sua_ck_tinh = ROUND(doanh_so * (COALESCE(ck1_pct, 0) + ? + COALESCE(ck3_pct, 0)), 2),
         sua_ghichu = 'Thêm 1% vận chuyển (đơn tự lấy, sổ +1%, engine ck2=0)',
         updated_by = 'them_1pct_vc',
         updated_at = datetime('now','+7 hours')
       WHERE ${baseWhere}${ownerCond}`
    ).bind(delta, delta, delta, ...ownerParams).run()
    for (const r of affected as any[]) {
      const ck1 = Number(r.ck1_pct) || 0, ck2 = Number(r.ck2_pct) || 0, ck3 = Number(r.ck3_pct) || 0
      const tong = ck1 + delta + ck3
      await logSuaCK(db, Number(r.id), thangCuaNgay(r.ngay), 'them_1pct_vc', {
        sua_ck1_pct: r.sua_ck1_pct, sua_ck2_pct: r.sua_ck2_pct, sua_ck3_pct: r.sua_ck3_pct, sua_tong_pct: r.sua_tong_pct,
      }, { sua_ck1_pct: ck1, sua_ck2_pct: delta, sua_ck3_pct: ck3, sua_tong_pct: tong })
    }
    return c.json({ success: true, so_dong: affected.length, message: `Gán tay ${affected.length} dòng (${mode}).` })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /thong-ke — thống kê nhanh theo ngày/tháng: đúng/sai so với ck ghi nhận + tổng số tiền lệch
// (chỉ tính trên dữ liệu của user đang đăng nhập; admin tính toàn bộ)
router.post('/thong-ke', async (c) => {
  try {
    const db = c.env.DB
    const me = await reqUser(db, c)
    if (!me) return c.json({ error: 'Bắt buộc đăng nhập' }, 401)
    const body = await c.req.json().catch(() => ({})) as any
    const thang = String(body.thang || '').trim()
    const thangFilter = /^\d{4}-\d{2}$/.test(thang)
      ? ` AND substr(ngay,7,4) || '-' || substr(ngay,4,2) = '${thang}'`
      : ''
    const ownerCond = me && !isAdmin(me) ? ' AND owner_user_id = ?' : ''
    const ownerParams = me && !isAdmin(me) ? [me.id] : []
    const { results } = await db.prepare(
      `SELECT COUNT(*) AS tong,
              SUM(CASE WHEN ABS(ck - COALESCE(ck_tinh,0)) <= 1 THEN 1 ELSE 0 END) AS dung_engine,
              SUM(CASE WHEN ABS(ck - COALESCE(ck_tinh,0)) > 1 THEN 1 ELSE 0 END) AS sai_engine,
              SUM(ABS(ck - COALESCE(ck_tinh,0))) AS sai_engine_so,
              SUM(CASE WHEN sua_tong_pct IS NOT NULL AND ABS(ck - COALESCE(sua_ck_tinh,0)) <= 1 THEN 1 ELSE 0 END) AS dung_sua,
              SUM(CASE WHEN sua_tong_pct IS NOT NULL AND ABS(ck - COALESCE(sua_ck_tinh,0)) > 1 THEN 1 ELSE 0 END) AS sai_sua,
              SUM(CASE WHEN sua_tong_pct IS NOT NULL THEN ABS(ck - COALESCE(sua_ck_tinh,0)) ELSE 0 END) AS sai_sua_so,
              SUM(CASE WHEN ABS(ck - COALESCE(sua_ck_tinh, ck_tinh)) <= 1 THEN 1 ELSE 0 END) AS dung_tong,
              SUM(CASE WHEN ABS(ck - COALESCE(sua_ck_tinh, ck_tinh)) > 1 THEN 1 ELSE 0 END) AS sai_tong,
              SUM(ABS(ck - COALESCE(sua_ck_tinh, ck_tinh))) AS sai_tong_so
       FROM ${TABLE} WHERE 1=1${thangFilter}${ownerCond}`
    ).bind(...ownerParams).all()
    const r = (results as any)?.[0] || {}
    const tong = Number(r.tong) || 0
    return c.json({
      thang: thang || 'all',
      tong,
      dung_engine: Number(r.dung_engine) || 0,
      sai_engine: Number(r.sai_engine) || 0,
      sai_engine_so: Number(r.sai_engine_so) || 0,
      dung_sua: Number(r.dung_sua) || 0,
      sai_sua: Number(r.sai_sua) || 0,
      sai_sua_so: Number(r.sai_sua_so) || 0,
      dung_tong: Number(r.dung_tong) || 0,
      sai_tong: Number(r.sai_tong) || 0,
      sai_tong_so: Number(r.sai_tong_so) || 0,
      pass_engine_pct: tong > 0 ? Math.round((Number(r.dung_engine) || 0) / tong * 10000) / 100 : 0,
      pass_tong_pct: tong > 0 ? Math.round((Number(r.dung_tong) || 0) / tong * 10000) / 100 : 0,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default router
