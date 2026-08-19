import type { D1Database } from '@cloudflare/workers-types'

export function currentThang(): string {
  const d = new Date(Date.now() + 7 * 3600 * 1000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

// Bảng giá gốc → ma_misa: mỗi bảng dùng cột giá nào để ghi vào ma_misa.gia_goc
export interface GiaGocSyncTable {
  table: string
  maCol: string
  priceCol: string
}

// Đăng ký các bảng "giá gốc" tham gia đồng bộ 2 chiều với MISA (có cột ma_sp + cột giá)
export const GIA_GOC_SYNC_TABLES: GiaGocSyncTable[] = [
  { table: 'bang_gia_chuan_tinh_gia_vdo', maCol: 'ma_sp', priceCol: 'tong_gia' },
  { table: 'bang_gia_chuan_tinh_gia_vmh', maCol: 'ma_sp', priceCol: 'tong_gia' },
  { table: 'bang_gia_chuan_tinh_gia_gg', maCol: 'ma_sp', priceCol: 'gia' },
  { table: 'bang_gia_chuan_tinh_gia_ve', maCol: 'ma_sp', priceCol: 'gia' },
  { table: 'bang_gia_chuan_tinh_gia_osb', maCol: 'ma_sp', priceCol: 'gia' },
  { table: 'bang_gia_chuan_tinh_gia_dr', maCol: 'ma_sp', priceCol: 'gia' },
  { table: 'bang_gia_chuan_tinh_gia_pvc_petg', maCol: 'ma_sp', priceCol: 'gia' },
  { table: 'bang_gia_chuan_tinh_gia_melamine_tonghop', maCol: 'ma_sp', priceCol: 'gia' },
  { table: 'bang_gia_chuan_tinh_gia_acrylic', maCol: 'ma_sp', priceCol: 'gia' },
  { table: 'bang_gia_chuan_tinh_gia_one_laminate', maCol: 'ma_sp', priceCol: 'gia' },
  { table: 'bang_gia_chuan_mirror', maCol: 'ma_sp', priceCol: 'gia_2m' },
  { table: 'bang_gia_chuan_keo_hat', maCol: 'ma_sp', priceCol: 'gia_1kg' },
  { table: 'bang_gia_chuan_veneer', maCol: 'ma_sp', priceCol: 'gia_2m' },
  { table: 'bang_gia_chuan_mat_phu_khac', maCol: 'ma_sp', priceCol: 'gia_2m' },
  { table: 'bang_gia_chuan_chi_nep', maCol: 'ma_sp', priceCol: 'gia' },
]

// Chiều A: sau khi THAY ĐỔI GIÁ ở bảng giá gốc → push lên ma_misa.gia_goc + lịch sử (nguon='sync')
// Trả về số mã đã đồng bộ (0 = không có mã nào đổi)
export async function syncBangToMisa(db: D1Database, cfg: GiaGocSyncTable, refId: number): Promise<number> {
  const row = await db.prepare(`SELECT ${cfg.maCol} AS ma, ${cfg.priceCol} AS gia FROM ${cfg.table} WHERE id = ?`).bind(refId).first()
  if (!row) return 0
  const ma = (row as any).ma
  const gia = Number((row as any).gia)
  if (!ma || !(gia > 0)) return 0

  const misa = await db.prepare('SELECT gia_goc FROM ma_misa WHERE ma_sp = ?').bind(ma).first()
  if (!misa) return 0
  const giaCu = Number((misa as any).gia_goc)
  if (giaCu === gia) return 0

  await db.prepare(`UPDATE ma_misa SET gia_goc = ?, updated_at = datetime('now','+7 hours') WHERE ma_sp = ?`).bind(gia, ma).run()
  await db.prepare(
    'INSERT INTO ma_misa_gia_history (ma_sp, thang, gia_cu, gia_goc, nguon, updated_by) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(ma, currentThang(), giaCu, gia, 'sync', 'auto').run()
  return 1
}

// Chiều B: sau khi THAY ĐỔI GIÁ ở ma_misa → đẩy xuống TẤT CẢ bảng giá gốc có cùng ma_sp + lịch sử
// Trả về số dòng bảng giá gốc đã cập nhật
export async function syncMisaToBangs(db: D1Database, maSp: string, giaMoi: number, updatedBy?: string | null): Promise<number> {
  if (!maSp || !(giaMoi > 0)) return 0
  let changed = 0
  const thang = currentThang()
  for (const cfg of GIA_GOC_SYNC_TABLES) {
    const rows = await db.prepare(
      `SELECT id, ${cfg.priceCol} AS gia FROM ${cfg.table} WHERE ${cfg.maCol} = ? AND COALESCE(${cfg.priceCol}, 0) != ?`
    ).bind(maSp, giaMoi).all()
    for (const r of (rows.results || []) as any[]) {
      const giaCu = Number(r.gia ?? 0)
      await db.prepare(`UPDATE ${cfg.table} SET ${cfg.priceCol} = ? WHERE id = ?`).bind(giaMoi, r.id).run()
      await db.prepare(
        'INSERT INTO gia_chuan_gia_history (bang, ref_id, cot, thang, gia_cu, gia_moi, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(cfg.table, r.id, cfg.priceCol, thang, giaCu, giaMoi, updatedBy || 'sync').run()
      changed++
    }
  }
  return changed
}

// Chiều A*: đồng loạt rà cả bảng giá gốc → đẩy toàn bộ giá (khác ma_misa) lên MISA + lịch sử
// Được gọi sau mỗi lần "Tính toán" để giá gốc mới nhất tự lên MISA
// Chiều B*: đồng loạt (sau khi ma_misa bị đổi hàng loạt, ví dụ cap-nhat-gia-goc từ Sổ chi tiết)
// Đẩy giá mới xuống mọi bảng giá gốc có cùng ma_sp + lịch sử. Trả về số dòng bảng giá gốc đã cập nhật.
export async function syncMisaToBangsBulk(db: D1Database, changes: { ma_sp: string; gia_moi: number }[], updatedBy?: string | null): Promise<number> {
  const list = changes.filter(x => x.ma_sp && x.gia_moi > 0)
  if (list.length === 0) return 0
  const thang = currentThang()
  let changed = 0
  const IN_CHUNK = 90
  const updateStmts: D1PreparedStatement[] = []
  const histStmts: D1PreparedStatement[] = []
  for (const cfg of GIA_GOC_SYNC_TABLES) {
    for (let i = 0; i < list.length; i += IN_CHUNK) {
      const chunk = list.slice(i, i + IN_CHUNK)
      const ph = chunk.map(() => '?').join(',')
      const rows = await db.prepare(
        `SELECT id, ${cfg.maCol} AS ma, ${cfg.priceCol} AS gia FROM ${cfg.table} WHERE ${cfg.maCol} IN (${ph})`
      ).bind(...chunk.map(x => x.ma_sp)).all()
      const byMa = new Map(chunk.map(x => [x.ma_sp, x.gia_moi]))
      for (const r of (rows.results || []) as any[]) {
        const giaMoi = byMa.get(r.ma)
        if (giaMoi == null) continue
        if (Number(r.gia ?? 0) === giaMoi) continue
        updateStmts.push(db.prepare(`UPDATE ${cfg.table} SET ${cfg.priceCol} = ? WHERE id = ?`).bind(giaMoi, r.id))
        histStmts.push(db.prepare(
          'INSERT INTO gia_chuan_gia_history (bang, ref_id, cot, thang, gia_cu, gia_moi, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(cfg.table, r.id, cfg.priceCol, thang, r.gia ?? 0, giaMoi, updatedBy || 'sync'))
        changed++
      }
    }
  }
  const BATCH = 100
  for (let i = 0; i < updateStmts.length; i += BATCH) {
    await db.batch(updateStmts.slice(i, i + BATCH))
  }
  for (let i = 0; i < histStmts.length; i += BATCH) {
    await db.batch(histStmts.slice(i, i + BATCH))
  }
  return changed
}

// Chiều A**: đồng loạt rà bảng tinh_gia_vmh sau khi "Tính toán" → đẩy giá VMH lên MISA
// cho TẤT CẢ mã biến thể cùng một line ván (không chỉ mã đại diện).
// Key của VMH_SP_MAP/VMH_VARIANT_MAP: `${board_loai}|${dd}|${mau}|${so_mat}`.
// Trả về { variants: số mã (kể cả đại diện + biến thể) trong MISA đã đổi giá }
// Cách tối ưu D1: chỉ 1 SELECT + vài batch INSERT đa dòng + 1 UPDATE + 1 INSERT..SELECT.
export async function syncVmhVariantsToMisa(
  db: D1Database,
  repMap: Record<string, [string, string]>,
  variantMap: Record<string, [string, string][]>,
): Promise<{ synced: number; variants: number }> {
  const thang = currentThang()

  function normColorKey(s: string): string {
    return String(s || '').trim().toUpperCase().replace(/[\s\-\.'’]/g, '')
  }

  // 1) Tải mọi dòng VMH đã tính → map key → tong_gia
  const { results } = await db.prepare(
    `SELECT board_quy_cach, board_loai, ma_mau, so_mat, ma_sp, tong_gia
     FROM bang_gia_chuan_tinh_gia_vmh
     WHERE ma_sp IS NOT NULL AND ma_sp != '' AND tong_gia > 0`
  ).all()
  const rows = (results || []) as any[]
  if (rows.length === 0) return { synced: 0, variants: 0 }

  // 2) Gộp toàn bộ mã cần sync: mã đại diện + mọi biến thể (map chỉ chứa key tìm thấy trong DB)
  const giaByKey = new Map<string, number>()
  for (const r of rows) {
    const key = `${r.board_loai}|${String(r.board_quy_cach).replace(/mm/gi, '').trim()}|${normColorKey(r.ma_mau)}|${r.so_mat}`
    giaByKey.set(key, Number(r.tong_gia))
  }
  const targets = new Map<string, number>()
  for (const [key, gia] of giaByKey) {
    if (repMap[key]) targets.set(repMap[key][0], gia)
    for (const [ma] of variantMap[key] || []) targets.set(ma, gia)
  }
  if (targets.size === 0) return { synced: 0, variants: 0 }
  const targetList = [...targets.entries()]

  // 3) Ghi map (mã -> tong_gia) vào bảng chuẩn cho recompute audit bằng INSERT đa dòng
  //    (D1 giới hạn ~100 SQL vars/statement → gộp 30 dòng/statement để giảm số lệnh).
  //    Xóa hết dòng cũ trước để tránh sót mã đã đổi family/giá từ lần chạy trước.
  await db.prepare('DELETE FROM vmh_variant_gia').run()

  const upsertStmts: D1PreparedStatement[] = []
  const ROWSPER = 30
  for (let i = 0; i < targetList.length; i += ROWSPER) {
    const chunk = targetList.slice(i, i + ROWSPER)
    const vals = chunk.map(() => '(?, ?, datetime(\'now\',\'+7 hours\'))').join(',')
    upsertStmts.push(db.prepare(
      `INSERT INTO vmh_variant_gia (variant_ma, tong_gia, updated_at) VALUES ${vals}
       ON CONFLICT(variant_ma) DO UPDATE SET tong_gia = excluded.tong_gia, updated_at = excluded.updated_at`
    ).bind(...chunk.flatMap(([ma, gia]) => [ma, gia])))
  }
  const BATCH = 100
  for (let i = 0; i < upsertStmts.length; i += BATCH) {
    await db.batch(upsertStmts.slice(i, i + BATCH))
  }

  // 4) Push giá VMH lên MISA cho mọi mã đã map (1 UPDATE có subquery — tổng hợp cả đại diện + biến thể)
  const upd = await db.prepare(
    `UPDATE ma_misa
     SET gia_goc = (SELECT v.tong_gia FROM vmh_variant_gia v WHERE v.variant_ma = ma_misa.ma_sp),
         updated_at = datetime('now','+7 hours')
     WHERE ma_sp IN (SELECT variant_ma FROM vmh_variant_gia)
       AND COALESCE(gia_goc, -1) != (SELECT v.tong_gia FROM vmh_variant_gia v WHERE v.variant_ma = ma_misa.ma_sp)`
  ).run()
  const variants = (upd.meta?.changes || 0) as number

  // 5) Lịch sử cho các mã vừa đổi (1 INSERT..SELECT đọc giá cũ từ ma_misa)
  await db.prepare(
    `INSERT INTO ma_misa_gia_history (ma_sp, thang, gia_cu, gia_goc, nguon, updated_by)
     SELECT m.ma_sp, ?, m.gia_goc, v.tong_gia, 'sync', 'auto'
     FROM ma_misa m JOIN vmh_variant_gia v ON v.variant_ma = m.ma_sp
     WHERE m.gia_goc != v.tong_gia`
  ).bind(thang).run()

  return { synced: variants, variants }
}

export async function syncTableToMisaBulk(db: D1Database, cfg: GiaGocSyncTable): Promise<number> {
  const thang = currentThang()
  const rows = await db.prepare(
    `SELECT t.id, t.${cfg.maCol} AS ma, t.${cfg.priceCol} AS gia, m.gia_goc AS gia_cu
     FROM ${cfg.table} t JOIN ma_misa m ON t.${cfg.maCol} = m.ma_sp
     WHERE t.${cfg.maCol} IS NOT NULL AND t.${cfg.maCol} != '' AND t.${cfg.priceCol} IS NOT NULL AND t.${cfg.priceCol} > 0
       AND COALESCE(m.gia_goc, -1) != COALESCE(t.${cfg.priceCol}, -1)`
  ).all()
  const list = (rows.results || []) as any[]
  if (list.length === 0) return 0

  const updateStmts = list.map(c =>
    db.prepare(`UPDATE ma_misa SET gia_goc = ?, updated_at = datetime('now','+7 hours') WHERE ma_sp = ?`).bind(c.gia, c.ma)
  )
  const BATCH = 100
  for (let i = 0; i < updateStmts.length; i += BATCH) {
    await db.batch(updateStmts.slice(i, i + BATCH))
  }

  const stmts = list.map(c =>
    db.prepare(
      'INSERT INTO ma_misa_gia_history (ma_sp, thang, gia_cu, gia_goc, nguon, updated_by) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(c.ma, thang, c.gia_cu === null ? 0 : c.gia_cu, c.gia, 'sync', 'auto')
  )
  for (let i = 0; i < stmts.length; i += BATCH) {
    await db.batch(stmts.slice(i, i + BATCH))
  }
  return list.length
}