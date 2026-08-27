import { Hono } from 'hono'
import { crudRoutes, reqUser, isAdmin } from '../helpers/crud'
import { isMisaSyncLocked } from '../helpers/auditAutoProcess'
import { currentThang, syncMisaToBangsBulk } from '../helpers/giaGocSync'
import { buildLop2Ctx, tinhCKChoDong, layRateTheoKH, invalidateCtxCache } from './chiet-khau'
import * as XLSX from 'xlsx'

type Env = { Bindings: { DB: D1Database } }

const TABLE = 'so_doi_chieu'
// Dữ liệu bảng tạm tự xóa sau 12h (sổ đối chiếu giá gốc + chiết khấu hàng ngày/tuần)
const TTL_HOURS = 12

const router = new Hono<Env>()

// Auto-sync mã MISA mới từ danh sách records (silent — chạy sau import, không cần admin).
async function autoSyncNewMisaCodes(db: D1Database, records: Record<string, any>[]) {
  try {
    const byMa = new Map<string, { ten: string; dvt: string; don_gia: number }>()
    for (const r of records) {
      const ma = String(r.ma_hang || '').trim()
      if (!ma || ma.startsWith('Z')) continue
      const cur = byMa.get(ma)
      const gia = Number(r.don_gia) || 0
      if (!cur) byMa.set(ma, { ten: String(r.ten_hang || '').trim(), dvt: String(r.dvt || '').trim(), don_gia: gia })
      else { if (!cur.ten && r.ten_hang) cur.ten = String(r.ten_hang).trim(); if (!cur.dvt && r.dvt) cur.dvt = String(r.dvt).trim() }
    }
    if (byMa.size === 0) return
    const maList = Array.from(byMa.keys())
    const existing = new Set<string>()
    for (let i = 0; i < maList.length; i += 90) {
      const chunk = maList.slice(i, i + 90)
      const ph = chunk.map(() => '?').join(', ')
      const res = await db.prepare(`SELECT ma_sp FROM ma_misa WHERE UPPER(ma_sp) IN (${ph})`).bind(...chunk.map(m => m.toUpperCase())).all()
      for (const r of (res as any).results || []) existing.add(String(r.ma_sp).toUpperCase())
    }
    const thang = currentThang()
    const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10)
    const maStmts: D1PreparedStatement[] = []
    const histStmts: D1PreparedStatement[] = []
    const gbStmts: D1PreparedStatement[] = []
    for (const ma of maList) {
      if (existing.has(ma.toUpperCase())) continue
      const info = byMa.get(ma)!
      maStmts.push(db.prepare(
        `INSERT INTO ma_misa (ma_sp, ten_sp, dvt, gia_goc, match_status, updated_by, updated_at) VALUES (?, ?, ?, ?, 'pending', 'auto', datetime('now','+7 hours'))`
      ).bind(ma, info.ten || ma, info.dvt || '', info.don_gia > 0 ? info.don_gia : null))
      if (info.don_gia > 0) {
        histStmts.push(db.prepare(
          'INSERT INTO ma_misa_gia_history (ma_sp, thang, gia_cu, gia_goc, nguon, updated_by) VALUES (?, ?, NULL, ?, ?, ?)'
        ).bind(ma, thang, info.don_gia, 'so-doi-chieu-auto', 'auto'))
      }
      gbStmts.push(db.prepare(
        `INSERT INTO gia_ban (ma_sp, ten_sp, hieu_luc_tu, updated_by) VALUES (?, ?, ?, ?)`
      ).bind(ma, info.ten || ma, today, 'auto'))
    }
    if (maStmts.length > 0) {
      for (const arr of [maStmts, gbStmts, histStmts]) {
        for (let i = 0; i < arr.length; i += 100) await db.batch(arr.slice(i, i + 100))
      }
      await recomputeGiaGoc(db)
    }
  } catch (e) { console.error('[autoSyncNewMisaCodes]', e) }
}

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
    const userId = Number(c.req.header('x-user-id'))
    const isAdminUser = userId
      ? await c.env.DB.prepare(`SELECT vai_tro FROM nhan_vien WHERE id = ?`).bind(userId).first() as any
      : null
    if (isAdminUser?.vai_tro === 'admin') {
      await c.env.DB.prepare(`DELETE FROM ${TABLE}`).run()
    } else if (userId) {
      await c.env.DB.prepare(`DELETE FROM ${TABLE} WHERE owner_user_id = ?`).bind(userId).run()
    } else {
      return c.json({ error: 'Bắt buộc đăng nhập' }, 401)
    }
    return c.json({ success: true, message: 'Đã xóa dữ liệu của bạn' })
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

// % thuế thực tế = Thuế GTGT / (Doanh số bán - Chiết khấu) * 100 (mặc định chuẩn 8%)
const THUE_PCT_EXPR = `(CASE WHEN t.doanh_so > t.ck THEN (t.thue / (t.doanh_so - t.ck) * 100) ELSE NULL END)`
// Thuế Đúng/Sai: % thuế xấp xỉ 8% (±0.05) so với base (DS - CK) → Đúng; dòng không có doanh số → NULL
const THUE_DUNG_EXPR = `(CASE WHEN t.doanh_so > t.ck AND ABS(t.thue / (t.doanh_so - t.ck) * 100 - 8) < 0.05 THEN 'dung' WHEN t.doanh_so > t.ck THEN 'sai' ELSE NULL END)`

// CK Đúng/Sai: khớp giữa cột CK thực tế và CK engine (sai số <1) → Đúng; mã Z* / không doanh số → NULL
const CK_KQ_EXPR = `(CASE WHEN t.ma_hang NOT LIKE 'Z%' AND t.don_gia > 0 AND ABS(COALESCE(t.ck, 0) - COALESCE(t.ck_tinh, 0)) < 1 THEN 'dung' WHEN t.ma_hang NOT LIKE 'Z%' AND t.don_gia > 0 THEN 'sai' ELSE NULL END)`

const crud = crudRoutes({
  table: TABLE,
  idField: 'id',
  searchFields: ['ma_hang', 'ten_hang', 'ten_kh', 'so_chung_tu', 'dien_giai', 'ma_kh'],
  orderBy: 't.id DESC',
  listQuery: LIST_QUERY,
  ownerField: 'owner_user_id',
  extraFilterMap: {
    chech_lech: CHENH_LECH_EXPR,
    thue_pct: THUE_PCT_EXPR,
    thue_dung: THUE_DUNG_EXPR,
    ck_kq: CK_KQ_EXPR,
  },
})

// Danh sách các user đang có dữ liệu trong sổ (cho dropdown "Lấy file người khác")
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
  ghi_chu: ['ghi chú'],
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

// Upsert danh sách các dòng vào bảng (dùng chung import-rows / import-excel / import/json).
// Với ownerField: mỗi user chỉ đụng dòng của mình — dòng trùng key thuộc người khác (hoặc dữ liệu cũ) → bỏ qua.
async function upsertRecords(db: D1Database, records: any[], ownerId?: number | null): Promise<{ imported: number; skipped: number }> {
  const isOwned = !!ownerId
  const allExisting = await db.prepare(
    `SELECT id, owner_user_id, ngay_hach_toan, so_chung_tu, ma_hang, ngay_chung_tu FROM ${TABLE} WHERE ma_hang != ''`
  ).all()
  const ownMap = new Map<string, any>()
  for (const r of allExisting.results as any[]) {
    const own = isOwned ? Number(r.owner_user_id) === Number(ownerId) : true
    const key = `${r.ngay_hach_toan}|${r.so_chung_tu}|${r.ma_hang}`
    if (own) ownMap.set(key, r)
  }

  const colNames = COL_ORDER.join(', ')
  const placeholders = COL_ORDER.map(() => '?').join(', ')
  const setClause = COL_ORDER.map(c => `${c} = ?`).join(', ')
  const ownerCols = isOwned
    ? `${colNames}, owner_user_id`
    : colNames
  const ownerPlaceholders = isOwned
    ? `${placeholders}, ?`
    : placeholders
  const ownerSet = `${setClause}, updated_at = datetime('now','+7 hours')`

  const insertStmts: D1PreparedStatement[] = []
  const updateStmts: D1PreparedStatement[] = []
  let imported = 0, skipped = 0

  for (const record of records) {
    const norm = normalizeRecord(record)
    if (!norm.ma_hang) { skipped++; continue }

    const key = `${norm.ngay_hach_toan}|${norm.so_chung_tu}|${norm.ma_hang}`

    const existing = ownMap.get(key)
    if (existing) {
      let changed = false
      for (const c of COL_ORDER) {
        if (String(existing[c] ?? '') !== String(norm[c] ?? '')) { changed = true; break }
      }
      if (changed) {
        updateStmts.push(
          db.prepare(`UPDATE ${TABLE} SET ${ownerSet} WHERE id = ?`)
            .bind(...COL_ORDER.map(c => norm[c]), existing.id)
        )
        imported++
      } else { skipped++ }
    } else {
      insertStmts.push(
        db.prepare(`INSERT INTO ${TABLE} (${ownerCols}) VALUES (${ownerPlaceholders})`)
          .bind(...COL_ORDER.map(c => norm[c]), ...(isOwned ? [ownerId] : []))
      )
      ownMap.set(key, { id: 0 })
      imported++
    }
  }

  const BATCH = 100
  for (let i = 0; i < insertStmts.length; i += BATCH) await db.batch(insertStmts.slice(i, i + BATCH))
  for (let i = 0; i < updateStmts.length; i += BATCH) await db.batch(updateStmts.slice(i, i + BATCH))
  return { imported, skipped }
}

// Tính lại CK engine + giá gốc tham chiếu cho các dòng. ownerId != null → chỉ dòng của user đó.
async function tinhHet(db: D1Database, ownerId?: number | null): Promise<number> {
  const ownerCond = ownerId != null ? ' WHERE owner_user_id = ?' : ''
  const stmt = db.prepare(
    `SELECT id, so_chung_tu AS so_ct, ma_kh, ngay_chung_tu AS ngay, ma_hang, sl_ban, don_gia, doanh_so, ck
     FROM ${TABLE}${ownerCond}`
  )
  const { results: rows } = ownerId != null ? await stmt.bind(ownerId).all() : await stmt.all()
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

// Auto-map tu_lay cho khách hàng dựa trên so sánh CK gốc (ck) vs CK tính (ck_tinh).
// Logic:
//   ck > ck_tinh  → đơn có CKVC (khách tự lấy) → tu_lay = 1
//   ck < ck_tinh  → đơn không CKVC (giao hàng)  → tu_lay = 0
//   ck ≈ ck_tinh  → giữ nguyên
// Chỉ áp dụng cho hàng thường (không phải Melamine), vì Melamine CK2 giờ không phụ thuộc tu_lay.
async function autoMapTuLay(db: D1Database, ownerId?: number | null): Promise<{ updated: number; details: Record<string, string> }> {
  const ownerCond = ownerId != null ? ' AND owner_user_id = ?' : ''
  const params = ownerId != null ? [ownerId] : []
  const { results: rows } = await db.prepare(
    `SELECT ma_kh, doanh_so, ck, ck_tinh, tong_pct
     FROM ${TABLE}
     WHERE ma_kh IS NOT NULL AND ma_kh != '' AND doanh_so > 0
     ${ownerCond}`
  ).bind(...params).all()

  // Aggregate theo ma_kh: đếm số đơn ck > ck_tinh vs ck < ck_tinh
  const stats: Record<string, { coVC: number; khongVC: number; total: number; doanhSo: number }> = {}
  for (const r of rows as any[]) {
    const ma = String(r.ma_kh).trim()
    if (!ma) continue
    if (!stats[ma]) stats[ma] = { coVC: 0, khongVC: 0, total: 0, doanhSo: 0 }
    const s = stats[ma]
    s.total++
    s.doanhSo += Number(r.doanh_so) || 0
    const ckGoc = Number(r.ck) || 0
    const ckTinh = Number(r.ck_tinh) || 0
    // Sai số 1% doanh_so (dung sai cho phép ~0.5%)
    const dungSai = (Number(r.doanh_so) || 0) * 0.005
    if (ckGoc > ckTinh + dungSai) {
      s.coVC++  // CK gốc cao hơn → có CKVC
    } else if (ckGoc < ckTinh - dungSai) {
      s.khongVC++  // CK gốc thấp hơn → không CKVC
    }
  }

  // Quyết định tu_lay cho từng khách:
  //   >50% đơn coVC → tu_lay = 1
  //   >50% đơn khongVC → tu_lay = 0
  //   otherwise → giữ nguyên
  const updates: D1PreparedStatement[] = []
  const details: Record<string, string> = {}
  for (const [ma, s] of Object.entries(stats)) {
    if (s.total < 1) continue
    let newTuLay: number | null = null
    if (s.coVC > s.khongVC && s.coVC >= s.total * 0.5) {
      newTuLay = 1
    } else if (s.khongVC > s.coVC && s.khongVC >= s.total * 0.5) {
      newTuLay = 0
    }
    if (newTuLay !== null) {
      updates.push(
        db.prepare(`UPDATE danh_sach_khach SET tu_lay = ? WHERE ma_kh = ? AND (tu_lay IS NULL OR tu_lay != ?)`)
          .bind(newTuLay, ma, newTuLay)
      )
      details[ma] = newTuLay === 1 ? `Có VC (${s.coVC}/${s.total} đơn)` : `Không VC (${s.khongVC}/${s.total} đơn)`
    }
  }

  const BATCH = 100
  for (let i = 0; i < updates.length; i += BATCH) {
    await db.batch(updates.slice(i, i + BATCH))
  }
  return { updated: updates.length, details }
}

// Auto-sync khách hàng mới từ records → danh_sach_khach + khach_theo_thang (silent — chạy sau import).
async function autoSyncNewCustomers(db: D1Database, records: Record<string, any>[]) {
  try {
    // 1. Thu thập unique ma_kh + ten_kh từ records
    const byMa: Record<string, string> = {}
    for (const r of records) {
      const ma = String(r.ma_kh || '').trim()
      if (!ma) continue
      const ten = String(r.ten_kh || '').trim()
      if (!byMa[ma]) byMa[ma] = ten
      else if (ten && !byMa[ma]) byMa[ma] = ten
    }
    const maKeys = Object.keys(byMa)
    if (maKeys.length === 0) return

    // 2. Kiểm tra khách đã tồn tại trong danh_sach_khach
    const existing = new Set<string>()
    const existingRows: Record<string, any> = {}
    for (let i = 0; i < maKeys.length; i += 90) {
      const chunk = maKeys.slice(i, i + 90)
      const ph = chunk.map(() => '?').join(', ')
      const res = await db.prepare(
        `SELECT ma_kh, vung, doi_tuong, hang, loai_op, ck_ds_98mau_pct, ck_ds_khac_pct, ck_vc_pct
         FROM danh_sach_khach WHERE ma_kh IN (${ph})`
      ).bind(...chunk).all()
      for (const r of (res as any).results || []) {
        const mk = String(r.ma_kh)
        existing.add(mk)
        existingRows[mk] = r
      }
    }

    // 3. Preload ck_op1 rules cho tháng hiện tại (MDFOKAL_MEL cho 98mau/khac, VAN_CHUYEN cho vc)
    const thang = currentThang()
    const [op1Rows, vcRows] = await Promise.all([
      db.prepare(
        `SELECT dieu_kien, dl_tinh, dl_nt, dl_sg, xuong_thuong, xuong_premium
         FROM ck_op1 WHERE thang = ? AND nhom_sp IN ('MDFOKAL_MEL', 'VAN_DAM_OKAL')`
      ).bind(thang).all(),
      db.prepare(
        `SELECT dieu_kien, dl_tinh, dl_nt, dl_sg, xuong_thuong, xuong_premium
         FROM ck_op1 WHERE thang = ? AND nhom_sp = 'VAN_CHUYEN' AND dieu_kien = 'mel'`
      ).bind(thang).all(),
    ])

    // Map rule theo nhom_sp + dieu_kien
    const ruleMap = new Map<string, any>()
    for (const r of (op1Rows as any).results || []) {
      ruleMap.set(`MDFOKAL_MEL|${r.dieu_kien}`, r)
    }
    // VAN_DAM_OKAL dùng chung rule với MDFOKAL_MEL cho 98mau/khac
    for (const r of (op1Rows as any).results || []) {
      if (!ruleMap.has(`VAN_DAM_OKAL|${r.dieu_kien}`)) {
        ruleMap.set(`VAN_DAM_OKAL|${r.dieu_kien}`, r)
      }
    }
    const ruleVC = ((vcRows as any).results || [])[0] || null

    // 4. Tạo khách mới + cập nhật CK cho khách đã có
    const stmts: D1PreparedStatement[] = []
    for (const ma of maKeys) {
      const ten = byMa[ma] || ma
      const cur = existingRows[ma]

      if (!cur) {
        // Khách mới: tạo với defaults + tính CK từ rules
        const doiTuong = 'PREMIER'
        const vung = 'SaiGon'
        const hang = 'OP1'

        // Tính CK từ rules
        const rule98 = ruleMap.get('MDFOKAL_MEL|98mau')
        const ruleKhac = ruleMap.get('MDFOKAL_MEL|khac')
        const ck98 = rule98 ? layRateTheoKH(rule98, doiTuong, vung, hang) : null
        const ckKhac = ruleKhac ? layRateTheoKH(ruleKhac, doiTuong, vung, hang) : null
        const ckVC = ruleVC ? layRateTheoKH(ruleVC, doiTuong, vung, hang) : null

        stmts.push(db.prepare(
          `INSERT OR IGNORE INTO danh_sach_khach (ma_kh, ten_kh, loai_op, vung, doi_tuong, hang, ck_ds_98mau_pct, ck_ds_khac_pct, ck_vc_pct, nguon, created_at)
           VALUES (?, ?, 'OP1', ?, ?, ?, ?, ?, ?, 'so-doi-chieu-auto', datetime('now','+7 hours'))`
        ).bind(ma, ten, vung, doiTuong, hang, ck98, ckKhac, ckVC))
        stmts.push(db.prepare(
          `INSERT OR IGNORE INTO khach_theo_thang (ma_kh, thang, loai_op, vung, doi_tuong, hang, ck_ds_98mau_pct, ck_ds_khac_pct, ck_vc_pct, updated_by, updated_at)
           VALUES (?, ?, 'OP1', ?, ?, ?, ?, ?, ?, 'auto-sync', datetime('now','+7 hours'))`
        ).bind(ma, thang, vung, doiTuong, hang, ck98, ckKhac, ckVC))
      } else {
        // Khách đã có: cập nhật CK nếu các trường CK là NULL
        const vung = cur.vung || 'SaiGon'
        const doiTuong = cur.doi_tuong || 'PREMIER'
        const hang = cur.hang || cur.loai_op || 'OP1'

        // Chỉ cập nhật nếu字段为NULL
        const needUpdate98 = cur.ck_ds_98mau_pct == null
        const needUpdateKhac = cur.ck_ds_khac_pct == null
        const needUpdateVC = cur.ck_vc_pct == null

        if (needUpdate98 || needUpdateKhac || needUpdateVC) {
          const rule98 = ruleMap.get('MDFOKAL_MEL|98mau')
          const ruleKhac = ruleMap.get('MDFOKAL_MEL|khac')
          const ck98 = needUpdate98 && rule98 ? layRateTheoKH(rule98, doiTuong, vung, hang) : null
          const ckKhac = needUpdateKhac && ruleKhac ? layRateTheoKH(ruleKhac, doiTuong, vung, hang) : null
          const ckVC = needUpdateVC && ruleVC ? layRateTheoKH(ruleVC, doiTuong, vung, hang) : null

          if (ck98 != null || ckKhac != null || ckVC != null) {
            const sets: string[] = []
            const vals: any[] = []
            if (ck98 != null) { sets.push('ck_ds_98mau_pct = ?'); vals.push(ck98) }
            if (ckKhac != null) { sets.push('ck_ds_khac_pct = ?'); vals.push(ckKhac) }
            if (ckVC != null) { sets.push('ck_vc_pct = ?'); vals.push(ckVC) }
            vals.push(ma)
            stmts.push(db.prepare(
              `UPDATE danh_sach_khach SET ${sets.join(', ')} WHERE ma_kh = ?`
            ).bind(...vals))
          }
        }

        // Đồng bộ khach_theo_thang nếu chưa có
        stmts.push(db.prepare(
          `INSERT OR IGNORE INTO khach_theo_thang (ma_kh, thang, loai_op, vung, doi_tuong, hang, updated_by, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'auto-sync', datetime('now','+7 hours'))`
        ).bind(ma, thang, cur.loai_op || 'OP1', vung, doiTuong, hang))
      }
    }

    if (stmts.length > 0) {
      for (let i = 0; i < stmts.length; i += 100) {
        await db.batch(stmts.slice(i, i + 100))
      }
    }
  } catch (e) { console.error('[autoSyncNewCustomers]', e) }
}

// POST /import-rows — nhận sẵn mảng dòng JSON (đã parse xlsx bên ngoài), upsert.
// KHÔNG tính lại CK ở đây (file chia chunk, tránh recompute N lần) — frontend gọi /tinh-het sau khi xong toàn bộ file.
router.post('/import-rows', async (c) => {
  try {
    const body = await c.req.json() as any
    const records: any[] = Array.isArray(body.rows) ? body.rows : []
    if (records.length === 0) return c.json({ error: 'Không có dữ liệu' }, 400)
    const ownerId = Number(c.req.header('x-user-id')) || null
    const { imported, skipped } = await upsertRecords(c.env.DB, records, ownerId)
    await autoSyncNewMisaCodes(c.env.DB, records)
    await autoSyncNewCustomers(c.env.DB, records)
    invalidateCtxCache()
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

    const { imported, skipped } = await upsertRecords(c.env.DB, records, Number(c.req.header('x-user-id')) || null)
    await autoSyncNewMisaCodes(c.env.DB, records)
    const reqOwnerId = Number(c.req.header('x-user-id')) || null
    const me = await reqUser(c.env.DB, c)
    const ownerId = me && isAdmin(me) ? null : reqOwnerId
    // Bước 1: Tính CK với tu_lay hiện tại
    const soDongTinh = await tinhHet(c.env.DB, ownerId)
    // Bước 2: Auto-map tu_lay dựa trên CK gốc vs CK tính
    const tuLayResult = await autoMapTuLay(c.env.DB, ownerId)
    // Bước 3: Tính lại CK với tu_lay mới (để CK2 cập nhật đúng)
    const soDongTinh2 = tuLayResult.updated > 0 ? await tinhHet(c.env.DB, ownerId) : 0
    return c.json({
      success: true,
      total: records.length,
      imported,
      skipped,
      so_dong_tinh: soDongTinh + soDongTinh2,
      tu_lay_updated: tuLayResult.updated,
      tu_lay_details: tuLayResult.details,
      message: `Import ${imported} dòng thành công${skipped ? `, bỏ qua ${skipped} dòng (trùng hoặc thiếu mã hàng)` : ''}. Đã tính lại CK cho ${soDongTinh + soDongTinh2} dòng. Auto-map tu_lay: ${tuLayResult.updated} khách.`,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

async function recomputeGiaGoc(db: D1Database, ownerId?: number | null): Promise<number> {
  const ownerCond = ownerId != null ? ' WHERE t.owner_user_id = ?' : ''
  const params = ownerId != null ? [ownerId] : []
  const res = await db.prepare(
    `UPDATE ${TABLE} AS t SET gia_goc = (SELECT m.gia_goc FROM ma_misa m WHERE m.ma_sp = t.ma_hang)${ownerCond}`
  ).bind(...params).run()
  return (res.meta?.changes || 0) as number
}

// POST /recompute-gia-goc — tính lại "giá gốc MISA tham chiếu" theo phạm vi đang xem (admin: toàn bộ)
router.post('/recompute-gia-goc', async (c) => {
  try {
    const me = await reqUser(c.env.DB, c)
    const ownerId = me && !isAdmin(me) ? me.id : null
    const updated = await recomputeGiaGoc(c.env.DB, ownerId)
    return c.json({ success: true, updated })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /auto-map-tu-lay — tự động map tu_lay cho khách hàng dựa trên CK gốc vs CK tính
router.post('/auto-map-tu-lay', async (c) => {
  try {
    const me = await reqUser(c.env.DB, c)
    const ownerId = me && !isAdmin(me) ? me.id : null
    const result = await autoMapTuLay(c.env.DB, ownerId)
    return c.json({
      success: true,
      updated: result.updated,
      details: result.details,
      message: `Đã auto-map tu_lay cho ${result.updated} khách hàng.`,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /tinh-het — tính lại CK engine theo phạm vi đang xem (admin: toàn bộ)
router.post('/tinh-het', async (c) => {
  try {
    const me = await reqUser(c.env.DB, c)
    const ownerId = me && !isAdmin(me) ? me.id : null
    const soDong = await tinhHet(c.env.DB, ownerId)
    const tuLayResult = await autoMapTuLay(c.env.DB, ownerId)
    const soDong2 = tuLayResult.updated > 0 ? await tinhHet(c.env.DB, ownerId) : 0
    return c.json({
      success: true,
      so_dong: soDong + soDong2,
      tu_lay_updated: tuLayResult.updated,
      tu_lay_details: tuLayResult.details,
      message: `Tính lại CK cho ${soDong + soDong2} dòng. Auto-map tu_lay: ${tuLayResult.updated} khách.`,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /tinh-het-chi-tiet/:id — tính lại CK chi tiết cho 1 dòng (sau khi sửa khách / đổi tháng)
router.post('/tinh-het-chi-tiet/:id', async (c) => {
  try {
    const db = c.env.DB
    const id = c.req.param('id')
    const access = await checkOwnerRow(db, c, id, true)
    if (!access.ok) return c.json({ error: access.error! }, access.status)
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
    const db = c.env.DB
    const id = c.req.param('id')
    const access = await checkOwnerRow(db, c, id, false)
    if (!access.ok) return c.json({ error: access.error! }, access.status)
    const logs = await db.prepare(
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
    const access = await checkOwnerRow(db, c, String(id), true)
    if (!access.ok) return c.json({ error: access.error! }, access.status)

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

    // Auto-set updated_by from auth header (không trust frontend)
    const me = await c.env.DB.prepare(`SELECT ten FROM nhan_vien WHERE id = ?`).bind(Number(c.req.header('x-user-id')) || 0).first() as any
    const updatedBy = me?.ten || body.updated_by || null

    await db.prepare(
      `UPDATE ${TABLE} SET
         sua_ck1_pct = ?, sua_ck2_pct = ?, sua_ck3_pct = ?, sua_tong_pct = ?, sua_ck_tinh = ?,
         sua_ghichu = ?, updated_by = ?, updated_at = datetime('now','+7 hours')
       WHERE id = ?`
    ).bind(sua1, sua2, sua3, tong, soTien, body.sua_ghichu || null, updatedBy, id).run()

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
      ).bind(TABLE, id, cot, pctFmt(cu), pctFmt(m), updatedBy, thang).run()
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

// POST /dong-bo-ma-misa — phát hiện mã hàng mới (chưa có trong ma_misa) trong file,
// bổ sung đầy đủ thông tin vào ma_misa (mã, tên, đvt, giá gốc) + gia_ban, rồi tính lại cột Giá gốc (chỉ Admin).
router.post('/dong-bo-ma-misa', async (c) => {
  try {
    const { DB } = c.env
    const userId = c.req.header('x-user-id')
    if (!userId) return c.json({ error: 'Unauthorized' }, 401)
    const user = await DB.prepare(`SELECT id, ten, vai_tro FROM nhan_vien WHERE id = ?`).bind(userId).first() as any
    if (!user) return c.json({ error: 'User not found' }, 404)
    if (user.vai_tro !== 'admin') return c.json({ error: 'Chỉ Admin mới được đồng bộ mã MISA' }, 403)

    const body = (await c.req.json().catch(() => ({}))) as { dryRun?: boolean }
    const dryRun = !!body.dryRun

    const { results: rawRows } = await DB.prepare(
      `SELECT ma_hang, ten_hang, dvt, don_gia, ngay_chung_tu AS ngay
       FROM ${TABLE}
       WHERE ma_hang IS NOT NULL AND ma_hang != '' AND ma_hang NOT LIKE 'Z%'
       ORDER BY rowid ASC`
    ).all()
    const rows = (rawRows || []) as any[]

    const ngayKey = (d: any): string => {
      const s = String(d ?? '').trim()
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
        const [a, b, c] = s.split('/')
        return `${c}${b.padStart(2, '0')}${a.padStart(2, '0')}`
      }
      return '00000000'
    }
    const byMa = new Map<string, { ten: string; dvt: string; rows: { don_gia: number; ngay: string }[] }>()
    for (const r of rows) {
      const ma = String(r.ma_hang).trim()
      if (!byMa.has(ma)) byMa.set(ma, { ten: String(r.ten_hang || '').trim(), dvt: String(r.dvt || '').trim(), rows: [] })
      const info = byMa.get(ma)!
      if (!info.ten && r.ten_hang) info.ten = String(r.ten_hang).trim()
      if (!info.dvt && r.dvt) info.dvt = String(r.dvt).trim()
      info.rows.push({ don_gia: Number(r.don_gia) || 0, ngay: ngayKey(r.ngay) })
    }
    const maList = Array.from(byMa.keys())
    if (maList.length === 0) return c.json({ success: true, message: 'Không có mã hàng nào trong file' })

    // Mã đã tồn tại trong ma_misa (so sánh không phân biệt hoa/thường)
    const existing = new Set<string>()
    const IN_CHUNK = 90
    for (let i = 0; i < maList.length; i += IN_CHUNK) {
      const chunk = maList.slice(i, i + IN_CHUNK)
      const ph = chunk.map(() => '?').join(', ')
      const res = await DB.prepare(`SELECT ma_sp FROM ma_misa WHERE UPPER(ma_sp) IN (${ph})`).bind(...chunk.map(m => m.toUpperCase())).all()
      for (const r of (res as any).results || []) existing.add(String(r.ma_sp).toUpperCase())
    }

    const pickPrice = (info: { rows: { don_gia: number; ngay: string }[] }) => {
      let best = 0, bestKey = ''
      for (const r of info.rows) {
        const g = Number(r.don_gia) || 0
        if (!(g > 0)) continue
        if (r.ngay > bestKey) { best = g; bestKey = r.ngay }
        else if (r.ngay === bestKey && best === 0) best = g
      }
      return best
    }

    const thang = currentThang()
    const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10)
    const newCodes: string[] = []
    const maStmts: D1PreparedStatement[] = []
    const histStmts: D1PreparedStatement[] = []
    const gbStmts: D1PreparedStatement[] = []
    let withPrice = 0

    for (const ma of maList) {
      if (existing.has(ma.toUpperCase())) continue
      const info = byMa.get(ma)!
      const gia = pickPrice(info)
      newCodes.push(ma)
      if (gia > 0) withPrice++
      if (dryRun) continue
      maStmts.push(DB.prepare(
        `INSERT INTO ma_misa (ma_sp, ten_sp, dvt, gia_goc, match_status, updated_by, updated_at)
         VALUES (?, ?, ?, ?, 'pending', ?, datetime('now','+7 hours'))`
      ).bind(ma, info.ten || ma, info.dvt || '', gia > 0 ? gia : null, user.ten || 'auto'))
      if (gia > 0) {
        histStmts.push(DB.prepare(
          'INSERT INTO ma_misa_gia_history (ma_sp, thang, gia_cu, gia_goc, nguon, updated_by) VALUES (?, ?, NULL, ?, ?, ?)'
        ).bind(ma, thang, gia, 'so-doi-chieu-dong-bo-ma', user.ten || 'auto'))
      }
      gbStmts.push(DB.prepare(
        `INSERT INTO gia_ban (ma_sp, ten_sp, hieu_luc_tu, updated_by)
         VALUES (?, ?, ?, ?)`
      ).bind(ma, info.ten || ma, today, user.ten || 'auto'))
    }

    if (!dryRun && newCodes.length > 0) {
      const BATCH = 100
      // ma_misa trước (FK của gia_ban) rồi đến gia_ban, cuối cùng lịch sử giá
      for (const arr of [maStmts, gbStmts, histStmts]) {
        for (let i = 0; i < arr.length; i += BATCH) await DB.batch(arr.slice(i, i + BATCH))
      }
      await recomputeGiaGoc(DB)
    }

    return c.json({
      success: true,
      dryRun,
      new_codes: newCodes,
      inserted: dryRun ? 0 : newCodes.length,
      message: dryRun
        ? `Dự kiến bổ sung ${newCodes.length} mã mới vào Mã MISA + Giá bán (${withPrice} mã có giá gốc): ${newCodes.slice(0, 10).join(', ')}${newCodes.length > 10 ? `…` : ''}`
        : `Đã bổ sung ${newCodes.length} mã mới vào Mã MISA + Giá bán${withPrice ? ` (${withPrice} mã có giá gốc)` : ''}.${newCodes.length ? ' Đã tính lại cột "Giá gốc (MISA)".' : ''} Mã mới: ${newCodes.slice(0, 10).join(', ')}${newCodes.length > 10 ? '…' : ''}`,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default router