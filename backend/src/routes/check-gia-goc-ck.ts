import { Hono } from 'hono'
import { crudRoutes, reqUser, isAdmin } from '../helpers/crud'
import { runAuditAutoProcess, fillMissingBasePrices, chuyenMaDungNhom, deriveBoardCols, detectBaseTable, AUDIT_BASE_TABLES, isMisaSyncLocked } from '../helpers/auditAutoProcess'
import * as XLSX from 'xlsx'

type Env = { Bindings: { DB: D1Database } }

const TABLE = 'check_gia_goc_ck'
// Dữ liệu bảng tạm tự xóa sau 6h (check giá gốc & CK hàng ngày/tuần)
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

// POST /dong-bo-tat-ca — đồng bộ giá MISA = giá gốc cho TẤT CẢ sản phẩm trong file (chỉ Admin).
// Bỏ qua quy tắc "lần đầu/lần sau" và trạng thái khóa — đây là thao tác ép đồng bộ thủ công.
// Body: { dryRun?: boolean }
router.post('/dong-bo-tat-ca', async (c) => {
  try {
    const { DB } = c.env
    const userId = c.req.header('x-user-id')
    if (!userId) return c.json({ error: 'Unauthorized' }, 401)
    const user = await DB.prepare(`SELECT id, ten, vai_tro FROM nhan_vien WHERE id = ?`).bind(userId).first() as any
    if (!user) return c.json({ error: 'User not found' }, 404)
    if (user.vai_tro !== 'admin') return c.json({ error: 'Chỉ Admin mới được đồng bộ tất cả' }, 403)

    const body = (await c.req.json().catch(() => ({}))) as { dryRun?: boolean }
    const result = await runAuditAutoProcess(DB, { dryRun: !!body.dryRun, forceAll: true })
    const d = result.doi_gia_misa
    return c.json({
      success: true,
      dryRun: !!body.dryRun,
      ...result,
      message:
        `${body.dryRun ? 'Dự kiến đồng bộ' : 'Đã đồng bộ'} giá MISA = giá gốc: ` +
        `đổi ${d.tu_dong.length} mã, không đổi ${d.can_admin.length}, khớp ${result.da_khop}, loại (đơn giá lẻ) ${result.loai_don_gia_le}.`,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Giá gốc tham chiếu cho từng dòng = giá gốc MISA HIỆU LỰC TẠI THÁNG BÁN:
//   - ưu tiên mức giá từ lịch sử theo tháng (ma_misa_gia_history) có tháng <= tháng bán
//   - mã không có lịch sử đổi giá thì dùng giá MISA hiện hành (ma_misa.gia_goc)
// Column gia_goc_ngay được lưu sẵn khi import (xem recomputeGiaGocNgay) → list không cần subquery.
const LIST_QUERY = `SELECT t.*, m.gia_goc AS gia_misa, g.gia_goc AS gia_goc_latest,
  m.gia_goc AS gia_goc
  FROM ${TABLE} t
  LEFT JOIN ma_misa m ON m.ma_sp = t.ma_hang
  LEFT JOIN gia_goc_by_ma g ON g.ma_sp = t.ma_hang`

// Chênh lệch chỉ tính cho dòng bán hàng thật:
//   - don_gia > 0 (bỏ giá âm/0 của vận chuyển, chiết khấu, điều chỉnh)
//   - không phải mã Z* (mã hệ thống: vận chuyển, phụ phí, swatch, điều chỉnh số lượng)
// Giá tham chiếu = Giá gốc MISA hiện hành (m.gia_goc) — khớp với cột hiển thị ở frontend.
const CHENH_LECH_EXPR = `(CASE WHEN t.don_gia > 0 AND t.ma_hang NOT LIKE 'Z%' THEN
  (m.gia_goc - t.don_gia) ELSE NULL END)`

const crud = crudRoutes({
  table: TABLE,
  idField: 'id',
  searchFields: ['ma_hang', 'ten_hang', 'ten_kh', 'so_ct', 'dien_giai'],
  orderBy: 't.id DESC',
  listQuery: LIST_QUERY,
  ownerField: 'owner_user_id',
  extraFilterMap: { chech_lech: CHENH_LECH_EXPR },
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

// Upsert danh sách các dòng vào bảng (dùng chung import-rows / import-excel).
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
  for (let i = 0; i < insertStmts.length; i += BATCH) await db.batch(insertStmts.slice(i, i + BATCH))
  for (let i = 0; i < updateStmts.length; i += BATCH) await db.batch(updateStmts.slice(i, i + BATCH))
  return { imported, skipped }
}

// Tự đồng bộ mã mới chưa có trong mã gốc → ma_misa + gia_goc_by_ma
// Chỉ INSERT thêm mã chưa tồn tại, KHÔNG ghi đè giá cũ. Giá gốc lấy theo ĐƠN GIÁ MỚI NHẤT trong file.
async function syncNewMasters(db: D1Database, records: any[]): Promise<{ ma_misa: number; gia_goc: number }> {
  const tenMap = new Map<string, string>()
  const priceInfo = new Map<string, Map<number, { cnt: number; qty: number; ngayKey: string }>>()

  const ngayKey = (d: any): string => {
    const s = String(d ?? '').trim()
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
      const [a, b, c] = s.split('/')
      return c + b.padStart(2, '0') + a.padStart(2, '0')
    }
    return '00000000'
  }

  for (const r of records) {
    const ma = String(r.ma_hang ?? '').trim()
    if (!ma) continue
    if (!tenMap.has(ma) && r.ten_hang) tenMap.set(ma, String(r.ten_hang).trim())
    const donGia = Number(r.don_gia) || 0
    const slBan = Number(r.sl_ban) || 0
    const map = priceInfo.get(ma) || new Map<number, { cnt: number; qty: number; ngayKey: string }>()
    const info = map.get(donGia) || { cnt: 0, qty: 0, ngayKey: '00000000' }
    info.cnt++
    info.qty += slBan
    const k = ngayKey(r.ngay)
    if (k > info.ngayKey) info.ngayKey = k
    map.set(donGia, info)
    priceInfo.set(ma, map)
  }
  if (tenMap.size === 0) return { ma_misa: 0, gia_goc: 0 }

  const maList = Array.from(tenMap.keys())

  // D1 giới hạn ~100 biến/prepared statement → chia nhỏ query IN theo chunk
  const IN_CHUNK = 90
  const queryIn = async (table: string) => {
    const found = new Set<string>()
    for (let i = 0; i < maList.length; i += IN_CHUNK) {
      const part = maList.slice(i, i + IN_CHUNK)
      const ph = part.map(() => '?').join(', ')
      const res = await db.prepare(`SELECT ma_sp FROM ${table} WHERE ma_sp IN (${ph})`).bind(...part).all()
      for (const r of res.results as any[]) found.add(r.ma_sp)
    }
    return found
  }

  // ma_sp đã tồn tại → bỏ qua (không ghi đè ma_misa)
  const existingSet = await queryIn('ma_misa')
  const missMisa = maList.filter(m => !existingSet.has(m))

  // Chọn giá mới nhất (giống /pricing/cap-nhat-gia-goc): ưu tiên ngày mới, cùng ngày thì tổng sản lượng cao, trùng thì giá thấp
  const pickPrice = (ma: string) => {
    const map = priceInfo.get(ma)!
    let best = 0, bestC = -1, bestQ = -1, bestKey = '00000000'
    for (const [g, info] of map) {
      if (info.ngayKey > bestKey || (info.ngayKey === bestKey && (info.qty > bestQ || (info.qty === bestQ && (info.cnt > bestC || (info.cnt === bestC && (best === 0 || g < best))))))) {
        best = g; bestC = info.cnt; bestQ = info.qty; bestKey = info.ngayKey
      }
    }
    return bestC > 0 ? best : 0
  }

  let maMisaN = 0
  if (missMisa.length) {
    const stmts = []
    const BATCH = 100
    for (let i = 0; i < missMisa.length; i += BATCH) {
      const chunk = missMisa.slice(i, i + BATCH)
      for (const ma of chunk) {
        const gia = pickPrice(ma)
        stmts.push(db.prepare(
          `INSERT OR IGNORE INTO ma_misa (ma_sp, ten_sp, gia_goc, updated_at, updated_by)
           VALUES (?, ?, ?, datetime('now'), 'import-check-gia-goc-ck')`
        ).bind(ma, tenMap.get(ma) || '', gia))
      }
      if (stmts.length) {
        const batch = stmts.splice(0, BATCH)
        await db.batch(batch)
        maMisaN += batch.length
      }
    }
  }

  // gia_goc_by_ma: UPSERT toàn bộ mã có trong file theo giá mới nhất (giá cũ bị thay bằng đơn giá thực tế mới nhất)
  let giaGocN = 0
  {
    const stmts = []
    const BATCH = 100
    for (let i = 0; i < maList.length; i += BATCH) {
      const chunk = maList.slice(i, i + BATCH)
      for (const ma of chunk) {
        const gia = pickPrice(ma)
        stmts.push(db.prepare(
          `INSERT INTO gia_goc_by_ma (ma_sp, gia_goc, updated_at)
           VALUES (?, ?, datetime('now'))
           ON CONFLICT(ma_sp) DO UPDATE SET gia_goc = excluded.gia_goc, updated_at = excluded.updated_at`
        ).bind(ma, gia))
      }
      if (stmts.length) {
        const batch = stmts.splice(0, BATCH)
        await db.batch(batch)
        giaGocN += batch.length
      }
    }
  }

  return { ma_misa: maMisaN, gia_goc: giaGocN }
}

// Tính "giá gốc tại thời điểm bán" cho mọi dòng của bảng tạm và lưu vào cột gia_goc_ngay.
// Quy tắc: giá MISA hiệu lực tại tháng bán = mức giá mới nhất trong ma_misa_gia_history
// có tháng <= tháng bán; mã chưa có lịch sử đổi giá thì ưu tiên giá bán mới nhất
// (gia_goc_by_ma = đơn giá thực bán gần nhất), còn không có thì dùng gia_goc hiện hành (ma_misa.gia_goc).
// Ưu tiên số 0 (chuẩn audit): với mã thuộc bảng giá VMH, dùng tong_gia VMH (bảng tính giá) làm chuẩn,
// không phụ thuộc tháng sync — đúng chuẩn "giá bán = giá VMH tính".
async function recomputeGiaGocNgay(db: D1Database, ownerId?: number | null): Promise<number> {
  // ownerId != null → chỉ tính cho dòng của user đó (mỗi account 1 file).
  const cond = ownerId != null ? ' WHERE owner_user_id = ?' : ''
  const params = ownerId != null ? [ownerId] : []
  // Bảng phụ: tập (ma_hang, don_gia) đã thực bán (dedup) — dùng để chứng thực gia_cu
  // trong rule 2 mà không cần truy vấn con nặng trên chính bảng đang UPDATE.
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS ${TABLE}_sold (
      ma_hang TEXT NOT NULL, don_gia REAL NOT NULL,
      PRIMARY KEY (ma_hang, don_gia))`),
    db.prepare(`DELETE FROM ${TABLE}_sold`),
    db.prepare(`INSERT OR REPLACE INTO ${TABLE}_sold (ma_hang, don_gia)
                SELECT DISTINCT ma_hang, don_gia FROM ${TABLE} WHERE don_gia > 0${cond}`)
      .bind(...params),
  ])
  const res = await db.prepare(
    `UPDATE ${TABLE} AS t
     SET gia_goc_ngay = COALESCE(
       /* 0) Chuẩn audit: giá VMH (tong_gia bảng tính) cho mã thuộc bảng giá VMH */
       (SELECT vg.tong_gia FROM vmh_variant_gia vg WHERE vg.variant_ma = t.ma_hang),
       /* 1) Giá mới nhất tại/before tháng bán trong lịch sử */
       (SELECT h.gia_goc FROM ma_misa_gia_history h
        WHERE h.ma_sp = t.ma_hang
          AND h.thang <= substr(t.ngay, 7, 4) || '-' || substr(t.ngay, 4, 2)
        ORDER BY h.thang DESC, h.id DESC LIMIT 1),
       /* 2) Chưa có đổi giá tới tháng bán → lấy giá cũ trước lần đổi đầu tiên.
              CHỈ dùng khi giá cũ (gia_cu) được chứng thực bằng giao dịch bán thực tế
              (don_gia == gia_cu tồn tại) — loại nhiễm giá sai lịch sử (VD CHIDENPL*
              gia_cu=930000 nhưng chưa từng bán ở mức đó, thực bán 170000). */
       (SELECT h2.gia_cu FROM ma_misa_gia_history h2
        WHERE h2.ma_sp = t.ma_hang AND h2.gia_cu > 0
          AND EXISTS (SELECT 1 FROM ${TABLE}_sold s
                      WHERE s.ma_hang = t.ma_hang AND s.don_gia = h2.gia_cu)
        ORDER BY h2.thang ASC, h2.id ASC LIMIT 1),
       /* 3) Không có lịch sử → giá bán mới nhất (gia_goc_by_ma = đơn giá thực bán gần nhất) */
       (SELECT g.gia_goc FROM gia_goc_by_ma g WHERE g.ma_sp = t.ma_hang),
       /* 4) Không có giá bán → giá MISA hiện hành (ma_misa.gia_goc) */
       (SELECT m.gia_goc FROM ma_misa m WHERE m.ma_sp = t.ma_hang),
       0
     )${cond}`
  ).bind(...params).run()
  return (res.meta?.changes || 0) as number
}

// POST /import-excel
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
        const c = XLSX.utils.decode_cell(key)
        if (c.r > maxRow) maxRow = c.r
        if (c.c > maxCol) maxCol = c.c
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
      if (!r || !r.some(c => c !== undefined && c !== null && c !== '')) return false
      if (normH(r[colMap.dien_giai]!).startsWith('số dòng') || normH(r[colMap.dien_giai]!).startsWith('tổng')) return false
      return r[colMap.ma_hang] !== undefined && r[colMap.ma_hang] !== null && String(r[colMap.ma_hang]).trim() !== ''
    })

    const records: any[] = []
    let parseSkipped = 0
    const dbFields = Object.keys(FIELD_ALIASES)
    for (const row of dataRows) {
      const record: Record<string, any> = {}
      for (const db of dbFields) {
        const idx = colMap[db]
        if (idx === undefined) continue
        let val: any = row[idx]
        if (db === 'ngay' && typeof val === 'number') {
          const d = new Date((val - 25569) * 86400 * 1000)
          const dd = String(d.getDate()).padStart(2, '0')
          const mm = String(d.getMonth() + 1).padStart(2, '0')
          const yyyy = d.getFullYear()
          val = `${dd}/${mm}/${yyyy}`
        }
        if (NUM_FIELDS.includes(db)) {
          val = typeof val === 'number' ? val : 0
        } else {
          val = val !== undefined && val !== null ? String(val).trim() : ''
        }
        record[db] = val
      }
      if (!record.ma_hang) { parseSkipped++; continue }
      records.push(record)
    }

    const { imported, skipped } = await upsertRecords(c.env.DB, records, Number(c.req.header('x-user-id')) || null)
    const totalSkipped = skipped + parseSkipped

    const sync = await syncNewMasters(c.env.DB, records)
    await recomputeGiaGocNgay(c.env.DB, Number(c.req.header('x-user-id')) || null)

    return c.json({
      success: true,
      total: records.length,
      imported,
      skipped: totalSkipped,
      ma_misa_added: sync.ma_misa,
      gia_goc_added: sync.gia_goc,
      message: `Import ${imported} dòng thành công${totalSkipped ? `, bỏ qua ${totalSkipped} dòng` : ''}. Thêm mới ${sync.ma_misa} mã MISA + ${sync.gia_goc} giá gốc.`,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /import-rows — nhận sẵn mảng dòng JSON (đã parse xlsx bên ngoài)
router.post('/import-rows', async (c) => {
  try {
    const body = await c.req.json() as any
    const records: any[] = Array.isArray(body.rows) ? body.rows : []
    if (records.length === 0) return c.json({ error: 'Không có dữ liệu' }, 400)

    const ownerId = Number(c.req.header('x-user-id')) || null
    const { imported, skipped } = await upsertRecords(c.env.DB, records, ownerId)

    const sync = await syncNewMasters(c.env.DB, records)
    await recomputeGiaGocNgay(c.env.DB, ownerId)

    return c.json({
      success: true,
      total: records.length,
      imported,
      skipped,
      ma_misa_added: sync.ma_misa,
      gia_goc_added: sync.gia_goc,
      message: `Import ${imported} dòng thành công${skipped ? `, bỏ qua ${skipped} dòng (trùng hoặc thiếu mã hàng)` : ''}. Thêm mới ${sync.ma_misa} mã MISA + ${sync.gia_goc} giá gốc.`,
})
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /recompute-gia-goc-ngay — tính lại "giá gốc tại thời điểm bán" theo phạm vi đang xem (admin: toàn bộ)
router.post('/recompute-gia-goc-ngay', async (c) => {
  try {
    const me = await reqUser(c.env.DB, c)
    if (!me) return c.json({ error: 'Bắt buộc đăng nhập' }, 401)
    const ownerId = me && !isAdmin(me) ? me.id : null
    const updated = await recomputeGiaGocNgay(c.env.DB, ownerId)
    return c.json({ success: true, updated })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /auto-xu-ly — Phân tích & tự xử lý file audit:
//   A. THIẾU MÃ HÀNG  → tự thêm mã mới vào ma_misa + bảng giá gốc theo nhóm
//   B. GIÁ MISA KHÁC AUDIT → lần đầu tự đổi giá MISA; lần sau chỉ Quản trị viên
//   C. ĐÃ KHỢP GIÁ → không làm gì
// Body: { dryRun?: boolean } — dryRun=true chỉ tính số liệu, không áp dụng thay đổi
router.post('/auto-xu-ly', async (c) => {
  try {
    const me = await reqUser(c.env.DB, c)
    if (!me) return c.json({ error: 'Bắt buộc đăng nhập' }, 401)
    const body = (await c.req.json().catch(() => ({}))) as { dryRun?: boolean }
    // Chỉ phân tích dữ liệu của user đang xem (mỗi account 1 file) — admin chạy toàn bộ
    const ownerId = me && !isAdmin(me) ? me.id : null
    const result = await runAuditAutoProcess(c.env.DB, { dryRun: !!body.dryRun, ownerId })
    const t = result.thieu_ma_hang
    const d = result.doi_gia_misa
    const locked = await isMisaSyncLocked(c.env.DB)
    return c.json({
      success: true,
      dryRun: !!body.dryRun,
      locked,
      ...result,
      message:
        `Phân tích ${result.tong_ma} mã. ` +
        `Thiếu mã hàng: thêm mới ${t.them_moi} (trong đó ${t.them_ma_misa} vào ma_misa, ${t.them_bang_gia} vào bảng giá gốc` +
        (t.khong_xac_dinh_nhom.length ? `, ${t.khong_xac_dinh_nhom.length} chưa xác định nhóm` : '') +
        `). Giá MISA khác audit: tự đổi ${d.tu_dong.length}, cần Quản trị viên ${d.can_admin.length}${locked ? ' (đang khóa đồng bộ)' : ''}. Khớp giá: ${result.da_khop}. Loại (đơn giá lẻ): ${result.loai_don_gia_le}.`,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /bo-sung-bang-gia-goc — thêm mã đang bán còn thiếu vào bảng giá gốc theo nhóm
// (chỉ INSERT OR IGNORE mã mới, không đụng dòng giá đã có)
// Body: { source?: 'audit'|'misa', dryRun?: boolean } — mặc định source='audit' (chỉ mã trong file audit)
router.post('/bo-sung-bang-gia-goc', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const r = await fillMissingBasePrices(c.env.DB, { source: body.source || 'audit', dryRun: !!body.dryRun })
    const bang = Object.entries(r.theo_bang).sort((a, b) => b[1] - a[1])
      .map(([t, n]) => `${t.split('_').pop()}(${n})`).join(', ')
    return c.json({
      success: true,
      dryRun: !!body.dryRun,
      nguon: body.source || 'audit',
      ...r,
      message: `${body.dryRun ? 'Dự kiến bổ sung' : 'Đã bổ sung'} ${r.them} mã vào bảng giá gốc${bang ? `: ${bang}` : ''}${r.khong_xac_dinh.length ? `, ${r.khong_xac_dinh.length} mã chưa xác định nhóm` : ''}.`,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /chuyen-ma-dung-nhom — di chuyển mã đang nằm ở BẢNG SAI về đúng nhóm theo detectBaseTable.
// INSERT OR IGNORE vào bảng đúng (giá gia_goc MISA) trước, rồi DELETE khỏi bảng sai.
// Body: { dryRun?: boolean }
router.post('/chuyen-ma-dung-nhom', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const r = await chuyenMaDungNhom(c.env.DB, { dryRun: !!body.dryRun })
    const bang = Object.entries(r.theo_bang).sort((a, b) => b[1].chuyen - a[1].chuyen)
      .map(([t, v]) => `${t.split('_').pop()}(${v.chuyen}: +${v.insert}/-${v.xoa})`).join(', ')
    return c.json({
      success: true,
      dryRun: !!body.dryRun,
      ...r,
      message: `${body.dryRun ? 'Dự kiến chuyển' : 'Đã chuyển'} ${r.da_chuyen} mã về đúng nhóm (thêm ${r.da_insert}, xoá ${r.da_xoa})${bang ? ` theo bảng: ${bang}` : ''}${r.khong_xac_dinh.length ? `, ${r.khong_xac_dinh.length} mã không xác định nhóm` : ''}${r.loi.length ? `, ${r.loi.length} lỗi` : ''}.`,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /sua-mo-ta-van-tron — điền cột mô tả ván trơn (Quy cách/Loại ván/Giá phôi/Số mặt)
// cho các dòng đã có ma_sp nhưng chưa có board_quy_cach (thêm tự động trước đây chỉ có ma/ten/giá).
router.post('/sua-mo-ta-van-tron', async (c) => {
  try {
    const db = c.env.DB
    const stmts: D1PreparedStatement[] = []
    const counts: Record<string, number> = {}
    for (const table of ['bang_gia_chuan_tinh_gia_vdo', 'bang_gia_chuan_tinh_gia_vmh']) {
      const rows = await db.prepare(
        `SELECT ma_sp, ten_sp, tong_gia FROM ${table}
         WHERE ma_sp IS NOT NULL AND ma_sp != '' AND (board_quy_cach IS NULL OR board_quy_cach = '')`
      ).all() as any
      for (const r of rows.results || []) {
        const gia = Number(r.tong_gia) || 0
        const b = deriveBoardCols(r.ten_sp, gia)
        stmts.push(db.prepare(
          `UPDATE ${table} SET board_quy_cach = ?, board_loai = ?, board_gia = ?, so_mat = ?
           WHERE ma_sp = ?`
        ).bind(b.board_quy_cach, b.board_loai, b.board_gia, b.so_mat, String(r.ma_sp)))
        counts[table] = (counts[table] || 0) + 1
      }
    }
    for (let i = 0; i < stmts.length; i += 100) await db.batch(stmts.slice(i, i + 100))
    return c.json({
      success: true,
      da_sua: stmts.length,
      theo_bang: counts,
      message: `Điền mô tả ván trơn cho ${stmts.length} dòng${Object.entries(counts).map(([t, n]) => ` ${t.split('_').pop()}:${n}`).join('')}.`,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /ra-soat-bang-gia-goc — rà soát toàn bộ bảng giá gốc:
//   1. THIẾU: mã đang bán (ma_misa, gia>0) đã xác định nhóm nhưng chưa có trong bảng nhóm đó.
//   2. SAI NHÓM: mã đang nằm ở bảng khác với nhóm detectBaseTable phân loại (vd T* nhầm sang vdo).
// Nguồn dò: ma_misa (không phụ thuộc file audit tạm đã hết TTL).
router.post('/ra-soat-bang-gia-goc', async (c) => {
  try {
    const db = c.env.DB
    const defs = AUDIT_BASE_TABLES
    const SAMPLE = 8

    // 1) Tải toàn bộ mã đã có trong từng bảng (theo cột maCol)
    const batch = await db.batch(defs.map(d =>
      db.prepare(`SELECT DISTINCT ${d.maCol} AS ma FROM ${d.table} WHERE ${d.maCol} IS NOT NULL AND ${d.maCol} != ''`)
    ))
    const byTable = new Map<string, Set<string>>()
    batch.forEach((res, i) => {
      const set = new Set<string>()
      for (const r of (res as any).results || []) if (r.ma) set.add(String(r.ma).toUpperCase())
      byTable.set(defs[i].table, set)
    })

    // 2) Thống kê số dòng mỗi bảng
    const countBatch = await db.batch(defs.map(d => db.prepare(`SELECT COUNT(*) AS n FROM ${d.table}`)))
    const sizes: Record<string, number> = {}
    countBatch.forEach((res, i) => { sizes[defs[i].table] = Number((res as any).results?.[0]?.n) || 0 })

    // 3) Dò ma_misa (mã đang bán) → mã thiếu theo nhóm
    const misa = await db.prepare(
      `SELECT ma_sp, ten_sp FROM ma_misa WHERE COALESCE(gia_goc, 0) > 0`
    ).all() as any
    const thieuMap = new Map<string, Map<string, { ma: string; ten: string }>>()
    const getThieu = (table: string) => {
      let m = thieuMap.get(table)
      if (!m) { m = new Map(); thieuMap.set(table, m) }
      return m
    }
    let khongXacDinh = 0
    for (const r of misa.results || []) {
      const ma = String(r.ma_sp || '').trim()
      if (!ma || ma.toUpperCase() === 'MÃ') continue
      const def = detectBaseTable(ma, r.ten_sp)
      if (!def) { khongXacDinh++; continue }
      const set = byTable.get(def.table)!
      if (!set.has(ma.toUpperCase())) {
        getThieu(def.table).set(ma.toUpperCase(), { ma, ten: String(r.ten_sp || '') })
      }
    }

    // 4) Mã hiện tại nằm ở bảng khác với nhóm detectBaseTable (nghi sai nhóm)
    const saiMap = new Map<string, Map<string, { ma: string; ten: string; o_bang: string; nen_bang: string }>>()
    for (const def of defs) {
      const rows = await db.prepare(
        `SELECT DISTINCT ${def.maCol} AS ma, ten_sp AS ten FROM ${def.table} WHERE ${def.maCol} IS NOT NULL AND ${def.maCol} != ''`
      ).all() as any
      for (const r of rows.results || []) {
        const ma = String(r.ma || '').trim()
        if (!ma) continue
        const d2 = detectBaseTable(ma, r.ten)
        if (!d2 || d2.table === def.table) continue
        const target = byTable.get(d2.table)!
        if (target.has(ma.toUpperCase())) {
          let m = saiMap.get(def.table)
          if (!m) { m = new Map(); saiMap.set(def.table, m) }
          if (!m.has(ma.toUpperCase())) m.set(ma.toUpperCase(), { ma, ten: String(r.ten || ''), o_bang: def.table, nen_bang: d2.table })
        } else {
          const nm = getThieu(d2.table)
          if (!nm.has(ma.toUpperCase())) nm.set(ma.toUpperCase(), { ma, ten: String(r.ten || '') })
        }
      }
    }

    const thieu = Object.fromEntries(Array.from(thieuMap.entries()).map(([t, m]) =>
      [t, { total: m.size, mau: Array.from(m.values()).slice(0, SAMPLE) }]))
    const sai = Object.fromEntries(Array.from(saiMap.entries()).map(([t, m]) =>
      [t, { total: m.size, mau: Array.from(m.values()).slice(0, SAMPLE) }]))
    return c.json({
      success: true,
      sizes,
      thieu,
      thieu_total: Array.from(thieuMap.values()).reduce((s, m) => s + m.size, 0),
      sai_nhom: sai,
      sai_total: Array.from(saiMap.values()).reduce((s, m) => s + m.size, 0),
      khong_xac_dinh: khongXacDinh,
    })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})

export default router
