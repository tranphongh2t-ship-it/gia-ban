// ============================================================
// pricingEngine.ts — Cột AD (chiết khấu đúng) + helper columns
// SPEC mục 4.1-4.3
// ============================================================

import { getNhomSP, getLoaiKH, getCotCKOP2, lookupOP1, lookupOP2, getCKTheoNhomGia } from './discountLookup'

type DB = D1Database

export interface CalculateInput {
  maKH: string
  maSP: string
  ngay: string       // ISO date string: '2026-07-21'
  phanLoaiKH: string // từ khach_hang.phan_loai
  nhomGia?: string   // cột P (DON_GIA_BAN/nhom_gia)
  hk?: string        // cột AH (HK)
  ckVanChuyen?: number  // cột AJ
  soLuong?: number
}

export interface CalculateResult {
  nhomSP: string        // BE
  loaiKH: string | null // BF
  cotCKOP2: number      // BG
  loaiOP: string        // OP1 or OP2
  ckDung: number        // AD — chiết khấu đúng
  ckDungDonVi: string   // 'percent' | 'fixed'
  ckVanChuyen: number   // AJ
  ckTong: number        // AD + AJ
}

function parseDate(ngay: string): { month: number; year: number } {
  const d = new Date(ngay)
  return { month: d.getMonth() + 1, year: d.getFullYear() }
}

export async function calculateDiscount(
  db: DB,
  input: CalculateInput,
): Promise<CalculateResult> {
  const { month, year } = parseDate(input.ngay)
  const nhomSP = getNhomSP(input.maSP)
  const loaiKH = getLoaiKH(input.phanLoaiKH)
  const cotCKOP2 = getCotCKOP2(nhomSP)

  // Xác định OP1/OP2 từ phan_bo_kh
  const pb = await db.prepare(
    `SELECT loai_op FROM phan_bo_kh WHERE ma_kh = ? AND thang = ? AND nam = ? LIMIT 1`
  ).bind(input.maKH, month, year).first() as { loai_op?: string } | null

  const loaiOP = pb?.loai_op || 'OP1'

  let ckDung = 0
  let ckDungDonVi = 'percent'
  let ckVanChuyen = input.ckVanChuyen || 0

  // Thử tier-specific formula trước (SPEC 4.4)
  const ckTier = getCKTheoNhomGia(input.nhomGia || '', input.maSP, input.hk || '')
  if (ckTier !== null) {
    ckDung = ckTier
  } else {
    // Fallback: OP1/OP2
    if (loaiOP === 'OP1') {
      const op1 = await lookupOP1(db, month, year, nhomSP, loaiKH)
      ckDung = op1.value
      ckDungDonVi = op1.unit
    } else {
      const op2 = await lookupOP2(db, month, year, input.maKH, cotCKOP2)
      ckDung = op2.value
      ckDungDonVi = op2.unit
    }
  }

  // Cộng thêm CK vận chuyển (SPEC 4.3: IFERROR(VALUE(AJ),0))
  const ckTong = ckDung + ckVanChuyen

  return {
    nhomSP,
    loaiKH,
    cotCKOP2,
    loaiOP,
    ckDung,
    ckDungDonVi,
    ckVanChuyen,
    ckTong,
  }
}
