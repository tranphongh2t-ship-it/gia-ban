import type { D1Database } from '@cloudflare/workers-types'
import { currentThang, syncMisaToBangsBulk } from './giaGocSync'

// ============================================================
// Luồng "Phân tích & Tự xử lý file audit" (Audit Giá Gốc)
// Sau khi import, với từng mã hàng trong file:
//   A. THIẾU MÃ HÀNG      → tự động thêm mã mới vào ma_misa + bảng giá gốc theo đúng nhóm
//   B. GIÁ MISA KHÁC AUDIT→ đổi giá MISA theo giá audit:
//        - Chỉ tự đổi khi KHÔNG bị khóa (misa_sync_lock) VÀ lần đầu mã xuất hiện trong file audit.
//        - Bị khóa hoặc lần sau → KHÔNG tự đổi, chỉ đánh dấu cần Quản trị viên.
//        - forceAll (nút Admin "Đồng bộ tất cả") → tự đổi toàn bộ, bỏ qua khóa + lần đầu/lần sau.
//   C. ĐÃ KHỢP GIÁ        → không làm gì
// ============================================================

// 13 bảng giá gốc có cột ma_sp tham gia đồng bộ với MISA.
// Mỗi bảng định nghĩa: cột mã, cột giá, cột insert tối thiểu khi thêm mã mới.
interface BaseTableDef {
  table: string
  maCol: string
  priceCol: string
  insertCols: string[] // [ma, ten, price] — cột được ghi khi tự động thêm mã mới
  keywords: string[]   // từ khoá trong tên hàng → ưu tiên nhận diện nhóm
  prefixes: string[]   // tiền tố mã hàng → nhận diện nhóm khi thiếu tên
  // Tiền tố "tin cậy cao" (khớp dài nhất giữa các bảng): kiểm tra TRƯỚC keyword.
  // Dùng cho các tiền tố tuyệt đối không thể thuộc nhóm khác (vd: MEVN→melamine,
  // NL/OL/VL→one_laminate, ME17LMRD→vdo) — tránh keyword chung chung 'kháng ẩm'
  // (vmh) nuốt mã "Dạt kháng ẩm", hay 'melamine' nuốt mã "One Laminate".
  highPrefixes?: string[]
  // Các cột bổ sung được suy ra từ tên hàng khi thêm mã mới (ván trơn board_*)
  boardFromTen?: boolean
}

export const AUDIT_BASE_TABLES: BaseTableDef[] = [
  {
    table: 'bang_gia_chuan_chi_nep', maCol: 'ma_sp', priceCol: 'gia',
    insertCols: ['ma_sp', 'ten_sp', 'gia'],
    keywords: ['chỉ', 'nẹp'], prefixes: ['CHI'],
  },
  {
    table: 'bang_gia_chuan_keo_hat', maCol: 'ma_sp', priceCol: 'gia_1kg',
    insertCols: ['ma_sp', 'ten_sp', 'gia_1kg'],
    keywords: ['keo hạt', 'keohạt'], prefixes: ['ZKEO', 'KEO'],
  },
  {
    table: 'bang_gia_chuan_veneer', maCol: 'ma_sp', priceCol: 'gia_2m',
    insertCols: ['ma_sp', 'ten_sp', 'gia_2m'],
    keywords: ['veneer', 'ván veneer'], prefixes: ['VN', 'VNG'],
  },
  {
    table: 'bang_gia_chuan_mat_phu_khac', maCol: 'ma_sp', priceCol: 'gia_2m',
    insertCols: ['ma_sp', 'ten_sp', 'gia_2m'],
    keywords: ['mặt phủ', 'phủ khác'], prefixes: ['GT', 'GVN'],
  },
  {
    table: 'bang_gia_chuan_mirror', maCol: 'ma_sp', priceCol: 'gia_2m',
    insertCols: ['ma_sp', 'ten_sp', 'gia_2m'],
    keywords: ['gương', 'mirror', 'bóng gương', 'siêu bóng gương'], prefixes: ['MIR'],
  },
  {
    table: 'bang_gia_chuan_tinh_gia_acrylic', maCol: 'ma_sp', priceCol: 'gia',
    insertCols: ['ma_sp', 'ten_sp', 'gia'],
    keywords: ['acrylic'], prefixes: ['AC'],
  },
  {
    table: 'bang_gia_chuan_tinh_gia_pvc_petg', maCol: 'ma_sp', priceCol: 'gia',
    insertCols: ['ma_sp', 'ten_sp', 'gia'],
    keywords: ['pvc', 'petg'], prefixes: ['PVC', 'PETG'],
  },
  // MELAMINE TỔNG HỢP ĐỨNG SAU vdo/vmh, TRƯỚC ve/dr/gg/osb. Thứ tự này để:
  //   - "Okal/ván dăm… kháng ẩm HMR" khớp vdo TRƯỚC 'kháng ẩm' của vmh
  //   - "Dạt MEL" khớp vdo TRƯỚC prefix ME1x của vmh
  //   - "… KT MEL"/"… MEL" (ván ép/nhựa/gỗ ghép/OSB phủ) vào melamine TRƯỚC khi rơi vào ván trơn
  {
    table: 'bang_gia_chuan_tinh_gia_vdo', maCol: 'ma_sp', priceCol: 'tong_gia',
    insertCols: ['ma_sp', 'ten_sp', 'tong_gia'],
    // LƯU Ý: KHÔNG dùng prefix ME17D/ME17LMRD cho vdo vì trùng "ME17DEN/ME17LMRDEN"
    // (MK MEL ĐEN / kháng ẩm LMR … MEL ĐEN = MDF đen → vmh). Phân biệt bằng keyword 'dạt'
    // (vdo đứng trước vmh nên "Dạt kháng ẩm MEL" khớp 'dạt' trước 'kháng ẩm').
    keywords: ['okal', 'ván dăm', 'dạt', 'vdo'], prefixes: ['MEOK', 'MDO'],
    highPrefixes: ['MEOK', 'MDO'],
    boardFromTen: true,
  },
  {
    table: 'bang_gia_chuan_tinh_gia_vmh', maCol: 'ma_sp', priceCol: 'tong_gia',
    insertCols: ['ma_sp', 'ten_sp', 'tong_gia'],
    keywords: ['ván nhựa hpl', 'vmh', 'nhựa hpl', 'mdf', 'hdf', 'ldf', 'kháng ẩm', 'khang am', 'hardboard', 'dw mel', 'dwmel'],
    // M* / MP* = MDF/HDF phủ (Pu, DW Trắng TT, HMR, giấy keo …) — tên không có từ khoá
    // đặc trưng nên chỉ phân biệt được bằng prefix M{SỐ}/MP.
    prefixes: ['VMH', 'MEVMH', 'MDF', 'MHF', 'M17', 'ME0', 'ME1', 'ME2', 'ME3', 'ME4', 'ME5', 'ME6', 'ME7', 'ME8', 'ME9', 'MEBI', 'T0', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'MP'],
    highPrefixes: ['VMH', 'MEVMH', 'MDF', 'MHF'],
    boardFromTen: true,
  },
  {
    table: 'bang_gia_chuan_tinh_gia_melamine_tonghop', maCol: 'ma_sp', priceCol: 'gia',
    insertCols: ['ma_sp', 'ten_sp', 'gia'],
    keywords: ['melamine', 'phủ melamine', 'giấy mel', 'phủ mel', 'kt mel', 'ktmel'],
    prefixes: ['MEVE', 'MEVN', 'MEGG', 'MEOSB', 'MEDR', 'GM', 'GKT'],
    highPrefixes: ['MEVE', 'MEVN', 'MEGG', 'MEOSB', 'MEDR'],
  },
  {
    table: 'bang_gia_chuan_tinh_gia_osb', maCol: 'ma_sp', priceCol: 'gia',
    insertCols: ['ma_sp', 'ten_sp', 'gia'],
    keywords: ['osb', 'ván dăm định hướng', 'dăm định hướng'], prefixes: ['OSB', 'TOSB'],
    highPrefixes: ['OSB', 'TOSB'],
  },
  {
    table: 'bang_gia_chuan_tinh_gia_one_laminate', maCol: 'ma_sp', priceCol: 'gia',
    insertCols: ['ma_sp', 'ten_sp', 'gia'],
    // ĐỨNG TRƯỚC dr/gg/ve: "… One Laminate" (Ván nhựa/ván ép/gỗ ghép phủ) phải khớp
    // keyword 'one laminate' TRƯỚC 'ván nhựa'/'ván ép' khi rơi vào nhóm ván trơn cùng tên.
    keywords: ['one laminate', 'laminate', 'lamine'], prefixes: ['LP', 'LE', 'NL', 'OL', 'GL', 'VL'],
    highPrefixes: ['LP', 'LE', 'NL', 'OL', 'GL', 'VL'],
  },
  {
    table: 'bang_gia_chuan_tinh_gia_dr', maCol: 'ma_sp', priceCol: 'gia',
    insertCols: ['ma_sp', 'ten_sp', 'gia'],
    keywords: ['durabo', 'nhựa dra', 'ván nhựa 3 lớp', 'ván nhựa'], prefixes: ['NT', 'NP'],
    highPrefixes: ['NT'],
  },
  {
    table: 'bang_gia_chuan_tinh_gia_gg', maCol: 'ma_sp', priceCol: 'gia',
    insertCols: ['ma_sp', 'ten_sp', 'gia'],
    keywords: ['gỗ ghép', 'go ghep', 'gg cao su', 'cao su'], prefixes: ['GG', 'TGG'],
  },
  {
    table: 'bang_gia_chuan_tinh_gia_ve', maCol: 'ma_sp', priceCol: 'gia',
    insertCols: ['ma_sp', 'ten_sp', 'gia'],
    keywords: ['ván ép', 'van ep'], prefixes: ['V2M', 'VNV', 'TVE'],
  },
]

// Suy luận cột mô tả ván trơn (board_*) từ tên hàng khi thêm mã mới.
// Quy cách: số mm/ly đầu tiên trong tên; Loại ván: phần còn lại trước x1220x2440.
export function deriveBoardCols(tenSp: string, gia: number): { board_quy_cach: string; board_loai: string; board_gia: number; so_mat: number } {
  const t = String(tenSp || '').trim().replace(/\s+/g, ' ')
  const mmMatch = t.match(/(\d+(?:[.,]\d+)?)\s*(?:mm|ly)/i)
  const quyCach = mmMatch ? `${mmMatch[1]}mm` : ''
  let loai = t
    .replace(/\d+(?:[.,]\d+)?\s*(?:mm|ly)\s*x?\s*1220\s*x\s*2440\b/gi, '')
    .replace(/\s+x\s+1220\s+x\s+2440\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  if (!loai) loai = (mmMatch ? t.replace(/\d+(?:[.,]\d+)?\s*(?:mm|ly)/i, '') : t).replace(/\s+/g, ' ').trim()
  return {
    board_quy_cach: quyCach,
    board_loai: loai || 'Ván trơn',
    board_gia: Number(gia) || 0,
    so_mat: 1,
  }
}

// Build INSERT dòng mới vào bảng giá gốc, tự điền cột board_* nếu bảng yêu cầu.
function buildBaseInsert(db: D1Database, def: BaseTableDef, ma: string, ten: string, gia: number): D1PreparedStatement {
  const cols = [...def.insertCols]
  const vals: any[] = [ma, ten, gia]
  if (def.boardFromTen) {
    const b = deriveBoardCols(ten, gia)
    cols.push('board_quy_cach', 'board_loai', 'board_gia', 'so_mat')
    vals.push(b.board_quy_cach, b.board_loai, b.board_gia, b.so_mat)
  }
  return db.prepare(
    `INSERT OR IGNORE INTO ${def.table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
  ).bind(...vals)
}

// Nhận diện nhóm (bảng giá gốc) cho một mã hàng.
// Ưu tiên: tiền tố tin cậy cao (khớp dài nhất) → từ khoá tên hàng → tiền tố mã (mã dài ưu tiên hơn).
export function detectBaseTable(ma: string, tenSp: string): BaseTableDef | null {
  const maU = String(ma || '').toUpperCase().trim()
  // Mã Z* = phụ phí/mẫu/bộ mẫu (không phải hàng bán thật) → không thuộc bảng giá gốc nào
  if (!maU || maU.startsWith('Z')) return null
  const tenU = String(tenSp || '').toUpperCase()
  let best: { def: BaseTableDef; len: number } | null = null
  for (const def of AUDIT_BASE_TABLES) {
    for (const p of def.highPrefixes || []) {
      if (!p) continue
      if (maU.startsWith(p.toUpperCase()) && (!best || p.length > best.len)) best = { def, len: p.length }
    }
  }
  if (best) return best.def
  for (const def of AUDIT_BASE_TABLES) {
    for (const kw of def.keywords) {
      if (tenU.includes(kw.toUpperCase())) return def
    }
  }
  best = null
  for (const def of AUDIT_BASE_TABLES) {
    for (const p of def.prefixes) {
      if (!p) continue
      if (maU.startsWith(p.toUpperCase()) && (!best || p.length > best.len)) best = { def, len: p.length }
    }
  }
  return best ? best.def : null
}

// Đọc toàn bộ mã đã có trong một bảng giá gốc (batch theo bảng).
// Dùng khớp CHÍNH XÁC (giữ case): mã chỉ khác chữ hoa/thường là sản phẩm khác nhau.
async function loadExistingMa(db: D1Database, defs: BaseTableDef[]): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>()
  const stmts = defs.map(d => {
    map.set(d.table, new Set<string>())
    return db.prepare(`SELECT DISTINCT ${d.maCol} AS ma FROM ${d.table} WHERE ${d.maCol} IS NOT NULL AND ${d.maCol} != ''`)
  })
  const results = await db.batch(stmts)
  results.forEach((res, i) => {
    const def = defs[i]
    const set = map.get(def.table)!
    for (const r of (res as any).results || []) if (r.ma) set.add(String(r.ma))
  })
  return map
}

// Lấy "giá audit" cho một mã = đơn giá của LẦN BÁN GẦN ĐÂY NHẤT (theo ngày).
// Cùng ngày có nhiều giá thì lấy giá đầu tiên xuất hiện trong file đợt đó.
function pickPrice(rows: { don_gia: number; ngay: string }[]): number {
  const ngayKey = (d: any): string => {
    const s = String(d ?? '').trim()
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
      const [a, b, c] = s.split('/')
      return c + b.padStart(2, '0') + a.padStart(2, '0')
    }
    return '00000000'
  }
  let best = 0, bestKey = '00000000'
  for (const r of rows) {
    const g = Number(r.don_gia) || 0
    if (!(g > 0)) continue
    const k = ngayKey(r.ngay)
    if (k > bestKey) { best = g; bestKey = k }
    else if (k === bestKey && best === 0) best = g
  }
  return best
}

// Đọc các mã đã từng xuất hiện trong file audit trước (audit_ma_seen)
async function loadSeenSet(db: D1Database): Promise<Set<string>> {
  const res = await db.prepare('SELECT ma_sp FROM audit_ma_seen').all()
  const set = new Set<string>()
  for (const r of res.results as any[]) if (r.ma_sp) set.add(String(r.ma_sp).toUpperCase())
  return set
}

// Ghi nhận mã đã xuất hiện trong file audit (lần đầu / lặp lại)
export interface AuditAutoResult {
  tong_ma: number
  // Đơn giá là SỐ LẺ (có phần thập phân, vd 320.435) → loại trừ, không đồng bộ giá MISA
  loai_don_gia_le: number
  thieu_ma_hang: {
    them_moi: number
    them_ma_misa: number
    them_bang_gia: number
    khong_xac_dinh_nhom: string[]
  }
  doi_gia_misa: {
    tu_dong: { ma_sp: string; gia_cu: number; gia_moi: number }[]
    can_admin: { ma_sp: string; gia_misa: number; gia_audit: number }[]
  }
  da_khop: number
}

// Trạng thái khóa đồng bộ MISA (từ file audit). locked=1 → KHÔNG tự đồng bộ giá MISA.
export async function isMisaSyncLocked(db: D1Database): Promise<boolean> {
  try {
    const row = await db.prepare('SELECT locked FROM misa_sync_lock WHERE id = 1').first() as any
    return row ? row.locked === 1 : true
  } catch {
    return true
  }
}

export async function runAuditAutoProcess(db: D1Database, opts: { dryRun?: boolean; forceAll?: boolean; ownerId?: number | null } = {}): Promise<AuditAutoResult> {
  const dryRun = !!opts.dryRun
  // forceAll: đồng bộ TẤT CẢ mã (bỏ qua quy tắc "lần đầu/lần sau" + bỏ qua khóa) — dùng cho nút Admin "Đồng bộ tất cả".
  const forceAll = !!opts.forceAll
  const locked = forceAll ? false : await isMisaSyncLocked(db)
  // ownerId != null → chỉ phân tích dữ liệu của user đó (mỗi account 1 file), mặc định toàn bộ (admin).
  const ownerCond = opts.ownerId != null ? ` AND owner_user_id = ?` : ''
  const ownerParams = opts.ownerId != null ? [opts.ownerId] : []
  // 1) Gom các mã hàng thật trong file (bỏ mã Z*, đơn giá <= 0)
  const { results: rawRows } = await db.prepare(
    `SELECT ma_hang, ten_hang, don_gia, sl_ban, ngay
     FROM check_gia_goc_ck
     WHERE ma_hang IS NOT NULL AND ma_hang != '' AND ma_hang NOT LIKE 'Z%' AND don_gia > 0${ownerCond}
     ORDER BY rowid ASC`
  ).bind(...ownerParams).all()
  const rows = (rawRows || []) as any[]

  const byMa = new Map<string, { ten: string; rows: { don_gia: number; ngay: string }[] }>()
  for (const r of rows) {
    const ma = String(r.ma_hang).trim()
    if (!byMa.has(ma)) byMa.set(ma, { ten: String(r.ten_hang || '').trim(), rows: [] })
    byMa.get(ma)!.rows.push({ don_gia: Number(r.don_gia) || 0, ngay: r.ngay })
  }
  const maList = Array.from(byMa.keys())
  if (maList.length === 0) return {
    tong_ma: 0, loai_don_gia_le: 0, thieu_ma_hang: { them_moi: 0, them_ma_misa: 0, them_bang_gia: 0, khong_xac_dinh_nhom: [] },
    doi_gia_misa: { tu_dong: [], can_admin: [] }, da_khop: 0,
  }

  // 2) Tra ma_misa (có hay không + giá hiện tại)
  const misaByMa = new Map<string, { gia_goc: number }>()
  const IN_CHUNK = 90
  for (let i = 0; i < maList.length; i += IN_CHUNK) {
    const chunk = maList.slice(i, i + IN_CHUNK)
    const ph = chunk.map(() => '?').join(', ')
    const res = await db.prepare(`SELECT ma_sp, gia_goc FROM ma_misa WHERE ma_sp IN (${ph})`).bind(...chunk).all()
    for (const r of (res as any).results || []) misaByMa.set(String(r.ma_sp).toUpperCase(), { gia_goc: Number(r.gia_goc) || 0 })
  }

  // 3) Danh mục mã đã có trong từng bảng giá gốc
  const existingByTable = await loadExistingMa(db, AUDIT_BASE_TABLES)
  const seenSet = await loadSeenSet(db)

  const result: AuditAutoResult = {
    tong_ma: maList.length,
    loai_don_gia_le: 0,
    thieu_ma_hang: { them_moi: 0, them_ma_misa: 0, them_bang_gia: 0, khong_xac_dinh_nhom: [] },
    doi_gia_misa: { tu_dong: [], can_admin: [] },
    da_khop: 0,
  }

  const insertStmts: D1PreparedStatement[] = []
  const histStmts: D1PreparedStatement[] = []
  const addBangStmts: D1PreparedStatement[] = []
  const seenStmts: D1PreparedStatement[] = []
  const tuDongMap = new Map<string, { gia_cu: number; gia_moi: number }>()
  const thang = currentThang()

  for (const ma of maList) {
    const info = byMa.get(ma)!
    const giaAudit = pickPrice(info.rows)
    if (!(giaAudit > 0)) continue
    // Đơn giá là số lẻ (có phần thập phân, vd 320.435) → LOẠI TRỪ: không đồng bộ giá MISA, để nguyên.
    // Chỉ đồng bộ khi đơn giá là số nguyên (vd 32000). Áp dụng cho cả chênh lệch dương lẫn âm.
    if (!Number.isInteger(giaAudit)) {
      result.loai_don_gia_le++
      continue
    }
    const misa = misaByMa.get(ma.toUpperCase())
    const ten = info.ten

    let daThemMisa = false
    if (!misa) {
      // ---- A. THIẾU MÃ HÀNG ----
      result.thieu_ma_hang.them_moi++
      insertStmts.push(db.prepare(
        `INSERT OR IGNORE INTO ma_misa (ma_sp, ten_sp, gia_goc, updated_at, updated_by)
         VALUES (?, ?, ?, datetime('now','+7 hours'), 'audit-auto')`
      ).bind(ma, ten, giaAudit))
      result.thieu_ma_hang.them_ma_misa++
      daThemMisa = true

      // Nhận diện nhóm → thêm vào bảng giá gốc tương ứng
      const def = detectBaseTable(ma, ten)
      if (def) {
        const existing = existingByTable.get(def.table)!
        if (!existing.has(ma)) {
          addBangStmts.push(buildBaseInsert(db, def, ma, ten, giaAudit))
          result.thieu_ma_hang.them_bang_gia++
          existing.add(ma)
        }
      } else {
        result.thieu_ma_hang.khong_xac_dinh_nhom.push(ma)
      }
    } else {
      // ---- B / C. mã đã có trong MISA ----
      const giaMisa = misa.gia_goc
      if (Math.abs(giaMisa - giaAudit) < 1) {
        result.da_khop++ // C. ĐÃ KHỢP GIÁ → không làm gì
      } else {
        // B. GIÁ MISA KHÁC GIÁ AUDIT
        const lanDau = !seenSet.has(ma.toUpperCase())
        // Chỉ tự đổi khi: (forceAll) HOẶC (chưa khóa VÀ lần đầu).
        const shouldAuto = forceAll ? true : (!locked && lanDau)
        if (shouldAuto) {
          // Tự động đổi giá MISA theo giá audit
          tuDongMap.set(ma, { gia_cu: giaMisa, gia_moi: giaAudit })
          result.doi_gia_misa.tu_dong.push({ ma_sp: ma, gia_cu: giaMisa, gia_moi: giaAudit })
          insertStmts.push(db.prepare(
            `UPDATE ma_misa SET gia_goc = ?, updated_at = datetime('now','+7 hours'), updated_by = 'audit-auto' WHERE ma_sp = ?`
          ).bind(giaAudit, ma))
          histStmts.push(db.prepare(
            'INSERT INTO ma_misa_gia_history (ma_sp, thang, gia_cu, gia_goc, nguon, updated_by) VALUES (?, ?, ?, ?, ?, ?)'
          ).bind(ma, thang, giaMisa, giaAudit, 'audit-auto', 'auto'))
        } else {
          // Bị khóa hoặc lần sau → KHÔNG tự đổi, cần Quản trị viên hoặc sửa tay
          result.doi_gia_misa.can_admin.push({ ma_sp: ma, gia_misa: giaMisa, gia_audit: giaAudit })
        }
      }
    }
    // Ghi nhận đã xuất hiện trong file audit
    seenStmts.push(db.prepare(
      `INSERT INTO audit_ma_seen (ma_sp, first_seen_at, last_seen_at, auto_changed, so_lan)
       VALUES (?, datetime('now','+7 hours'), datetime('now','+7 hours'), CASE WHEN ? THEN 1 ELSE 0 END, 1)
       ON CONFLICT(ma_sp) DO UPDATE SET
         last_seen_at = datetime('now','+7 hours'),
         so_lan = audit_ma_seen.so_lan + 1,
         auto_changed = MAX(audit_ma_seen.auto_changed, excluded.auto_changed)`
    ).bind(ma, daThemMisa || tuDongMap.has(ma) ? 1 : 0))
  }

  // 4) Áp dụng các thao tác tự động (batch) — bỏ qua khi dry-run
  if (!dryRun) {
    const BATCH = 100
    for (const arr of [insertStmts, addBangStmts, histStmts, seenStmts]) {
      for (let i = 0; i < arr.length; i += BATCH) await db.batch(arr.slice(i, i + BATCH))
    }

    // 5) Đẩy giá MISA vừa đổi xuống các bảng giá gốc cùng mã (Chiều B)
    if (tuDongMap.size > 0) {
      const changes = Array.from(tuDongMap.entries()).map(([ma_sp, v]) => ({ ma_sp, gia_moi: v.gia_moi }))
      await syncMisaToBangsBulk(db, changes, 'audit-auto')
    }
  }

  return result
}

// Bổ sung mã ĐANG BÁN (trong file audit) còn thiếu vào bảng giá gốc theo đúng nhóm.
// Chỉ thêm MÃ MỚI (INSERT OR IGNORE), không đụng dòng giá đã có. Trả về số đã thêm theo bảng.
export interface FillBaseResult {
  them: number
  theo_bang: Record<string, number>
  khong_xac_dinh: string[]
}

export async function fillMissingBasePrices(db: D1Database, opts: { source?: 'audit' | 'misa'; dryRun?: boolean } = {}): Promise<FillBaseResult> {
  const source = opts.source || 'audit'
  const dryRun = !!opts.dryRun
  const res: FillBaseResult = { them: 0, theo_bang: {}, khong_xac_dinh: [] }
  const defs = AUDIT_BASE_TABLES

  // 1) Mã đang bán + giá MISA > 0.
  //    Nguồn 'audit' = chỉ mã xuất hiện trong file audit (check_gia_goc_ck, TTL 6h).
  //    Nguồn 'misa' = toàn bộ danh mục MISA đang bán (không phụ thuộc file audit).
  const notInClauses = defs.map(d => `ma_hang NOT IN (SELECT ${d.maCol} FROM ${d.table} WHERE ${d.maCol} IS NOT NULL AND ${d.maCol} != '')`).join(' AND ')
  const rows = source === 'misa'
    ? (await db.prepare(
        `SELECT ma_sp AS ma_hang, ten_sp AS ten_hang, gia_goc
         FROM ma_misa
         WHERE ma_sp IS NOT NULL AND ma_sp != '' AND ma_sp NOT LIKE 'Z%' AND COALESCE(gia_goc, 0) > 0`
      ).all()).results as any[]
    : (await db.prepare(
        `SELECT DISTINCT t.ma_hang, CASE WHEN trim(t.ten_hang) = '' THEN m.ten_sp ELSE t.ten_hang END AS ten_hang, m.gia_goc
         FROM check_gia_goc_ck t
         JOIN ma_misa m ON m.ma_sp = t.ma_hang
         WHERE t.don_gia > 0 AND t.ma_hang NOT LIKE 'Z%' AND COALESCE(m.gia_goc, 0) > 0 AND ${notInClauses}`
      ).all()).results as any[]
  if (rows.length === 0) return res

  // 2) Tải mã đã có trong từng bảng để tránh trùng.
  //    Dùng so khớp CHÍNH XÁC (BINARY, không normalize chữ hoa) vì SQLite mặc định
  //    phân biệt chữ hoa/thường: "NP1706sS382" ≠ "NP1706SS382" là 2 sản phẩm khác nhau.
  //    Normalize toUpperCase ở đây sẽ nuốt mất mã có case khác (vd SS38 giá 591k).
  const stmts = defs.map(d => db.prepare(`SELECT DISTINCT ${d.maCol} AS ma FROM ${d.table} WHERE ${d.maCol} IS NOT NULL AND ${d.maCol} != ''`))
  const batch = await db.batch(stmts)
  const existing = new Map<string, Set<string>>()
  batch.forEach((r, i) => {
    const set = new Set<string>()
    for (const row of (r as any).results || []) if (row.ma) set.add(String(row.ma))
    existing.set(defs[i].table, set)
  })

  // 3) Dò nhóm & gom INSERT OR IGNORE
  const stmts2: D1PreparedStatement[] = []
  for (const r of rows) {
    const ma = String(r.ma_hang).trim()
    const def = detectBaseTable(ma, r.ten_hang)
    if (!def) { res.khong_xac_dinh.push(ma); continue }
    const set = existing.get(def.table)!
    if (set.has(ma)) continue
    set.add(ma)
    const gia = Number(r.gia_goc) || 0
    if (!(gia > 0)) continue
    stmts2.push(buildBaseInsert(db, def, ma, r.ten_hang, gia))
    res.theo_bang[def.table] = (res.theo_bang[def.table] || 0) + 1
  }

  // 4) Batch thực thi (bỏ qua khi dry-run)
  if (!dryRun) {
    const BATCH = 100
    for (let i = 0; i < stmts2.length; i += BATCH) {
      await db.batch(stmts2.slice(i, i + BATCH))
    }
  }
  res.them = stmts2.length
  return res
}

// Chuyển mã đang nằm ở BẢNG SAI về đúng nhóm theo detectBaseTable.
// Với mỗi mã trong mỗi bảng: nếu detect ra bảng khác và bảng đúng chưa có mã →
//   INSERT OR IGNORE (giá gia_goc MISA) vào bảng đúng, rồi DELETE khỏi bảng sai.
// Chỉ xóa khỏi bảng sai khi chắc chắn mã đã nằm ở bảng đúng (có sẵn hoặc vừa chèn).
export interface ChuyenMaResult {
  da_chuyen: number
  da_insert: number
  da_xoa: number
  theo_bang: Record<string, { chuyen: number; xoa: number; insert: number }>
  khong_xac_dinh: string[]
  loi: string[]
}

export async function chuyenMaDungNhom(db: D1Database, opts: { dryRun?: boolean } = {}): Promise<ChuyenMaResult> {
  const dryRun = !!opts.dryRun
  const defs = AUDIT_BASE_TABLES
  const res: ChuyenMaResult = { da_chuyen: 0, da_insert: 0, da_xoa: 0, theo_bang: {}, khong_xac_dinh: [], loi: [] }

  // 1) ma_misa → ten + gia (để điền đúng thông tin khi chuyển).
  //    Dùng key CHÍNH XÁC (giữ nguyên case) vì mã chỉ khác nhau chữ hoa/thường là
  //    sản phẩm khác nhau (vd NP1706sS382 vs NP1706SS382). Lookup uppercase sẽ trả
  //    nhầm ten/giá của mã kia → detect sai nhóm → xóa nhầm mã khỏi bảng đúng.
  const misaRes = await db.prepare('SELECT ma_sp, ten_sp, gia_goc FROM ma_misa').all()
  const misa = new Map<string, { ten: string; gia: number }>()
  for (const r of misaRes.results as any[]) {
    misa.set(String(r.ma_sp), { ten: String(r.ten_sp || ''), gia: Number(r.gia_goc) || 0 })
  }
  // Tìm mã trong ma_misa: ưu tiên khớp chính xác; chỉ fallback theo uppercase khi
  // có đúng 1 ứng viên (tránh nhầm khi 2 mã chỉ khác case cùng tồn tại).
  const upperIndex = new Map<string, { ten: string; gia: number }[]>()
  for (const [k, v] of misa) {
    const up = k.toUpperCase()
    const arr = upperIndex.get(up)
    if (arr) arr.push(v)
    else upperIndex.set(up, [v])
  }
  const misaLookup = (ma: string) => {
    const exact = misa.get(ma)
    if (exact) return exact
    const arr = upperIndex.get(ma.toUpperCase())
    return arr && arr.length === 1 ? arr[0] : null
  }

  // 2) Load mã (kèm ten trong bảng) theo từng bảng
  const rowsByTable = new Map<string, any[]>()
  const existingByTable = new Map<string, Set<string>>()
  for (const def of defs) {
    const rr = await db.prepare(
      `SELECT ${def.maCol} AS ma, ten_sp, ${def.priceCol} AS gia FROM ${def.table}
       WHERE ${def.maCol} IS NOT NULL AND ${def.maCol} != ''`
    ).all()
    const rows = (rr.results as any[]) || []
    rowsByTable.set(def.table, rows)
    // Khớp CHÍNH XÁC (giữ case) — mã chỉ khác case là sản phẩm khác, không được
    // coi là trùng để chèn/xóa nhầm.
    const s = new Set<string>()
    for (const r of rows) s.add(String(r.ma))
    existingByTable.set(def.table, s)
  }

  const ins: D1PreparedStatement[] = []
  const dels: D1PreparedStatement[] = []
  const chuyenSet = new Set<string>()

  for (const def of defs) {
    const rows = rowsByTable.get(def.table) || []
    for (const r of rows) {
      const ma = String(r.ma || '').trim()
      if (!ma) continue
      const tenInBang = String(r.ten_sp || '')
      const m = misaLookup(ma)
      const ten = (m && m.ten) || tenInBang
      const d2 = detectBaseTable(ma, ten)
      if (!d2) { res.khong_xac_dinh.push(ma); continue }
      if (d2.table === def.table) continue // đang ở đúng nhóm

      const targetSet = existingByTable.get(d2.table)!
      if (!targetSet.has(ma)) {
        const gia = (m && m.gia) || Number(r.gia) || 0
        if (gia > 0) {
          ins.push(buildBaseInsert(db, d2, ma, ten, gia))
          targetSet.add(ma)
          res.da_insert++
        }
      }
      if (targetSet.has(ma)) {
        dels.push(db.prepare(`DELETE FROM ${def.table} WHERE ${def.maCol} = ?`).bind(ma))
        res.da_xoa++
        chuyenSet.add(ma)
        const st = res.theo_bang[def.table] || (res.theo_bang[def.table] = { chuyen: 0, xoa: 0, insert: 0 })
        st.chuyen++; st.xoa++
      } else {
        res.loi.push(`${ma}: không có giá để chuyển sang ${d2.table}`)
      }
    }
  }

  if (!dryRun) {
    for (const arr of [ins, dels]) {
      for (let i = 0; i < arr.length; i += 100) await db.batch(arr.slice(i, i + 100))
    }
  }
  res.da_chuyen = chuyenSet.size
  return res
}