// ─── Local Calculate: read from SQLite, run CK engine ───────────
import { invoke } from '@tauri-apps/api/core'
import { tinhCKChoDong, buildLop2CtxFromData, type DongBan, type Lop2Ctx } from './ck-engine'

// ─── Read table from local SQLite via Tauri command ─────────────
async function readLocalTable(table: string): Promise<any[]> {
  try {
    const r: any = await invoke('local_query', { table, limit: 100000 })
    return r?.rows || []
  } catch {
    return []
  }
}

// ─── Build Lop2Ctx from local SQLite ────────────────────────────
export async function buildLocalCtx(): Promise<Lop2Ctx> {
  const [soChiTiet, khachHang, khachTheoThang, ckOp1, ckOp2, op2BacThang, policyRules, ckVanChuyen, nhomMau, revenueTiers, monthlySummary] = await Promise.all([
    readLocalTable('so-chi-tiet-ban-hang'),
    readLocalTable('danh-sach-khach'),
    readLocalTable('khach-theo-thang'),
    readLocalTable('ck-op1'),
    readLocalTable('ck-op2'),
    readLocalTable('op2-bac-thang'),
    readLocalTable('policy-rules'),
    readLocalTable('ck-van-chuyen'),
    readLocalTable('ma-hang-nhom-mau'),
    readLocalTable('policy-revenue-tiers'),
    readLocalTable('monthly-summary'),
  ])

  return buildLop2CtxFromData({
    soChiTiet, khachHang, khachTheoThang,
    ckOp1, ckOp2, op2BacThang,
    policyRules, ckVanChuyen, nhomMau,
    revenueTiers, monthlySummary,
  })
}

// ─── Calculate CK for a batch of rows ───────────────────────────
export async function tinhHetLocal(rows: DongBan[]): Promise<any[]> {
  const ctx = await buildLocalCtx()
  return rows.map(row => {
    const result = tinhCKChoDong(row, ctx)
    return { ...row, ...result }
  })
}

// ─── Calculate CK for a single row ──────────────────────────────
export async function tinhDonLocal(row: DongBan): Promise<any> {
  const ctx = await buildLocalCtx()
  return tinhCKChoDong(row, ctx)
}

// ─── Calculate pricing: base price lookup from local SQLite ──────
export async function calculateBasePriceLocal(input: {
  loai_cot_go: string
  do_day: number
  cap: string
  tier: string
  bang_be_mat: string
  ma_mau: string
  so_mat: number
}): Promise<{ tong_gia: number; gia_cot_go: number; gia_be_mat: number }> {
  const cotGoRows = await readLocalTable('bang-gia-cot-go')
  const maMauRows = await readLocalTable('bang-gia-ma-mau')
  const nhomMauRows = await readLocalTable('bang-gia-nhom-mau')

  const cotGo = cotGoRows.find((r: any) =>
    r.loai === input.loai_cot_go &&
    r.do_day == String(input.do_day) &&
    r.cap === input.cap &&
    r.tier === input.tier
  )
  const giaCotGo = Number(cotGo?.gia || 0)

  const maMau = maMauRows.find((r: any) =>
    r.bang === input.bang_be_mat &&
    r.tier === input.tier &&
    r.ma_mau === input.ma_mau
  )
  const nhom = maMau?.nhom || maMau?.ma_nhom || ''

  const nhomMau = nhomMauRows.find((r: any) =>
    r.bang === input.bang_be_mat &&
    r.tier === input.tier &&
    r.nhom === nhom
  )
  const giaBeMat = input.so_mat === 1
    ? Number(nhomMau?.gia_1_mat || 0)
    : Number(nhomMau?.gia_2_mat || 0)

  return {
    gia_cot_go: giaCotGo,
    gia_be_mat: giaBeMat,
    tong_gia: giaCotGo + giaBeMat,
  }
}
