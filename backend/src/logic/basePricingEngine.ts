// basePricingEngine.ts — Tính giá gốc: Giá cốt gỗ + Giá bề mặt phủ × số mặt

type DB = D1Database

export interface BasePriceInput {
  loai_cot_go?: string
  do_day: string
  cap?: string
  tier: string
  bang_be_mat?: string
  ma_mau?: string
  so_mat: number
}

export interface BasePriceResult {
  gia_cot_go: number | null
  cot_go_match?: { loai: string; do_day: string; cap: string; gia: number }
  gia_be_mat: number | null
  be_mat_match?: { bang: string; nhom: string; gia_1_mat: number; gia_2_mat: number; so_mat: number }
  tong_gia: number | null
  loi?: string
}

const TIERS = ['PREMIUM', 'BBG PREMIER']

function normalizeTier(t: string): string {
  const u = t.toUpperCase().trim()
  if (u.includes('PREMIER')) return 'BBG PREMIER'
  return 'PREMIUM'
}

async function firstRow(db: DB, sql: string, ...params: any[]): Promise<any | null> {
  const r = await db.prepare(sql).bind(...params).first()
  return r || null
}

// Tìm giá cốt gỗ — chỉ exact match, không fuzzy
async function lookupCotGo(
  db: DB, loai: string, do_day: string, cap: string | undefined, tier: string
): Promise<{ cap: string; gia: number } | null> {
  const tiers = [tier, ...TIERS.filter(t => t !== tier)]

  for (const t of tiers) {
    if (cap) {
      const r = await firstRow(db,
        `SELECT cap, gia FROM bang_gia_cot_go
         WHERE loai = ? AND tier = ? AND do_day = ? AND cap = ?
         LIMIT 1`,
        loai, t, do_day, cap)
      if (r) return r as any
    } else {
      const r = await firstRow(db,
        `SELECT cap, gia FROM bang_gia_cot_go
         WHERE loai = ? AND tier = ? AND do_day = ?
         LIMIT 1`,
        loai, t, do_day)
      if (r) return r as any
    }
  }
  return null
}

// Tìm nhóm màu từ mã màu — chỉ exact match
async function lookupColorNhom(
  db: DB, bang: string, maMau: string, tier: string
): Promise<{ nhom: string; tier: string } | null> {
  const tiers = [tier, ...TIERS.filter(t => t !== tier)]

  for (const t of tiers) {
    const r = await firstRow(db,
      `SELECT nhom FROM bang_gia_ma_mau
       WHERE bang = ? AND tier = ? AND ma_mau = ?
       LIMIT 1`,
      bang, t, maMau)
    if (r) return { nhom: (r as any).nhom, tier: t }
  }

  const r = await firstRow(db,
    `SELECT nhom, tier FROM bang_gia_ma_mau
     WHERE bang = ? AND ma_mau = ?
     LIMIT 1`,
    bang, maMau)
  if (r) return { nhom: (r as any).nhom, tier: (r as any).tier }
  return null
}

// Tìm giá bề mặt từ nhóm — chỉ exact match
async function lookupSurfacePrice(
  db: DB, bang: string, nhom: string, tier: string
): Promise<{ gia_1_mat: number; gia_2_mat: number; tier: string } | null> {
  const tiers = [tier, ...TIERS.filter(t => t !== tier)]

  for (const t of tiers) {
    const r = await firstRow(db,
      `SELECT gia_1_mat, gia_2_mat FROM bang_gia_nhom_mau
       WHERE bang = ? AND tier = ? AND nhom = ?
       LIMIT 1`,
      bang, t, nhom)
    if (r) return { ...(r as any), tier: t }
  }
  return null
}

export async function calculateBasePrice(
  db: DB,
  input: BasePriceInput,
): Promise<BasePriceResult> {
  const do_day = input.do_day.trim()
  const tier = normalizeTier(input.tier)
  const result: BasePriceResult = { gia_cot_go: null, gia_be_mat: null, tong_gia: null }

  // ---- 1. Core wood lookup ----
  if (input.loai_cot_go) {
    const match = await lookupCotGo(db, input.loai_cot_go, do_day, input.cap, tier)
    if (match) {
      result.gia_cot_go = match.gia
      result.cot_go_match = {
        loai: input.loai_cot_go,
        do_day,
        cap: match.cap,
        gia: match.gia,
      }
    } else {
      result.loi = `Không tìm thấy giá cốt gỗ: ${input.loai_cot_go} / ${do_day} / ${input.cap || '?'}`
    }
  }

  // ---- 2. Surface coating lookup ----
  if (input.bang_be_mat && input.ma_mau) {
    const colorInfo = await lookupColorNhom(db, input.bang_be_mat, input.ma_mau, tier)
    if (colorInfo) {
      const priceInfo = await lookupSurfacePrice(db, input.bang_be_mat, colorInfo.nhom, colorInfo.tier)
      if (priceInfo) {
        const matPrice = input.so_mat === 2 ? priceInfo.gia_2_mat : priceInfo.gia_1_mat
        result.gia_be_mat = matPrice
        result.be_mat_match = {
          bang: input.bang_be_mat,
          nhom: colorInfo.nhom,
          gia_1_mat: priceInfo.gia_1_mat,
          gia_2_mat: priceInfo.gia_2_mat,
          so_mat: input.so_mat,
        }
      } else {
        result.loi = (result.loi ? result.loi + '; ' : '') +
          `Không tìm thấy giá cho nhóm: ${colorInfo.nhom} / ${colorInfo.tier}`
      }
    } else {
      result.loi = (result.loi ? result.loi + '; ' : '') +
        `Không tìm thấy mã màu ${input.ma_mau} trong ${input.bang_be_mat}`
    }
  }

  // ---- 3. Calculate total ----
  if (result.gia_cot_go !== null || result.gia_be_mat !== null) {
    result.tong_gia = (result.gia_cot_go ?? 0) + (result.gia_be_mat ?? 0)
  }

  return result
}
