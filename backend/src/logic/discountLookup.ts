// ============================================================
// discountLookup.ts — Mapping tables + OP1/OP2 discount lookup
// SPEC mục 4.4 (BE), 4.5 (BF), 4.6 (BG), 4.3 (AD)
// ============================================================

type DB = D1Database

// ---- 4.4: Mã SP → Nhóm SP (cột BE) ----
// Thứ tự quan trọng: prefix dài hơn kiểm tra trước
const NHOM_SP_MAP: [string, string][] = [
  ['MEVE', 'MEVE_CO_DON'],
  ['MEGG', 'MDFOKAL_REG'],
  ['MEVN', 'MDFOKAL_REG'],
  ['CHIA', 'CHINEP'],
  ['CHI',  'CHINEP'],
  ['VNGG', 'GOGHEP_GT20'],
  ['GG',   'GOGHEP_GT20'],
  ['VL',   'VANEP_LE'],
  ['NP',   'NHUA_TROM_LT10'],
  ['NL',   'NHUA_TROM_LT10'],
  ['OSB',  'OSB_LE'],
  ['PV',   'PVC_FILM'],
  ['ZPP',  'VANTRON_LE'],
  ['ZVC',  'VANTRON_LE'],
  ['MA',   'ACRYLIC'],
  ['NA',   'VANEP_PHUMEL'],
  ['V1',   'VANTRON_LE'],
  ['V2',   'VANTRON_LE'],
  ['ML',   'MDFOKAL_MEL_REG'],
  ['MP',   'MDFOKAL_MEL_REG'],
  ['ME',   'MDFOKAL_MEL_REG'],
]

const DEFAULT_NHOM = 'MDFOKAL_MEL_REG'

export function getNhomSP(maSP: string): string {
  if (!maSP) return DEFAULT_NHOM
  const upper = maSP.toUpperCase()
  for (const [prefix, nhom] of NHOM_SP_MAP) {
    if (upper.startsWith(prefix)) return nhom
  }
  return DEFAULT_NHOM
}

// ---- 4.4: Tier-specific discount (PREMIERDL / PREMIUM) ----
// Công thức từ file Excel gốc, SPEC mục 4.4 (BE)

export function getCKTheoNhomGia(
  nhomGia: string,
  maSP: string,
  hk: string,
): number | null {
  const ng = (nhomGia || '').toUpperCase().trim()
  const upperSP = (maSP || '').toUpperCase().trim()
  const upperHK = (hk || '').toUpperCase().trim()

  // ---- PREMIERDL tier ----
  if (ng.startsWith('PREMIERDL')) {
    // Mã hàng KHÔNG bắt đầu bằng Z (trừ ZK)
    if (upperSP.startsWith('Z') && !upperSP.startsWith('ZK')) {
      return 0
    }
    // ME (không phải MEVE)
    if (upperSP.startsWith('ME') && !upperSP.startsWith('MEVE')) {
      if (['DM', 'VIP', 'VVIP', 'DLVIP'].includes(upperHK)) {
        return 12.04
      }
      if (['PRI', 'DLND'].includes(upperHK)) {
        return 9.26
      }
    }
    return 0
  }

  // ---- PREMIUM tier ----
  if (ng.startsWith('PREMIUM')) {
    const isME = upperSP.startsWith('ME') && !upperSP.startsWith('MEVE')
    const isCHI = upperSP.startsWith('CHI') && !upperSP.startsWith('CHIA')
    if (isME || isCHI) {
      // AC="ECO" check skipped — column "73 MÀU" không có trong DB
      if (upperHK === 'PREMIUM') {
        return 9.26
      }
      return 7.4
    }
    return 0
  }

  return null // không phải tier-specific, dùng OP1/OP2
}

// ---- 4.5: Phân loại KH → Loại KH cho OP1 (cột BF) ----

const LOAI_KH_MAP: Record<string, string> = {
  DL: 'ĐL Tỉnh',
  DLVIP: 'ĐL Tỉnh',
  DLND: 'ĐL Ngoại thành',
  DM: 'ĐL Sài Gòn',
  VIP: 'Xưởng thường',
  PREMIUM: 'Xưởng premium',
  PRI: 'Xưởng premium',
}

export function getLoaiKH(phanLoai: string): string | null {
  if (!phanLoai) return null
  const upper = phanLoai.toUpperCase().trim()
  if (upper === 'R') return null
  return LOAI_KH_MAP[upper] ?? null
}

// ---- 4.6: Nhóm SP → Cột CK OP2 (cột BG) ----

export function getCotCKOP2(nhomSP: string): number {
  if (!nhomSP) return 2
  const upper = nhomSP.toUpperCase()
  if (upper.startsWith('MDFOKAL_')) return 1
  if (upper.startsWith('VANTRON_')) return 3
  return 2
}

// ---- 4.3: OP1 lookup ----
// bang_gia_ck rows with loai='OP1', key_match='MM/YYYY|NhomSP', loai_kh=loaiKH

export async function lookupOP1(
  db: DB,
  month: number,
  year: number,
  nhomSP: string,
  loaiKH: string | null,
): Promise<{ value: number; unit: string }> {
  if (!loaiKH) return { value: 0, unit: 'percent' }

  const mm = String(month).padStart(2, '0')
  const key = `${mm}/${year}|${nhomSP}`

  const result = await db.prepare(
    `SELECT gia_tri, loai_don_vi FROM bang_gia_ck
     WHERE loai = 'OP1' AND key_match = ? AND loai_kh = ?
     LIMIT 1`
  ).bind(key, loaiKH).first()

  if (!result) return { value: 0, unit: 'percent' }
  return {
    value: (result as any).gia_tri as number,
    unit: (result as any).loai_don_vi as string,
  }
}

// ---- 4.3: OP2 lookup ----
// bang_gia_ck rows with loai='OP2', key_match='MM/YYYY|MaKH', cot_index=cotCK

export async function lookupOP2(
  db: DB,
  month: number,
  year: number,
  maKH: string,
  cotIndex: number,
): Promise<{ value: number; unit: string }> {
  const mm = String(month).padStart(2, '0')
  const key = `${mm}/${year}|${maKH}`

  const result = await db.prepare(
    `SELECT gia_tri, loai_don_vi FROM bang_gia_ck
     WHERE loai = 'OP2' AND key_match = ? AND cot_index = ?
     LIMIT 1`
  ).bind(key, cotIndex).first()

  if (!result) return { value: 0, unit: 'percent' }
  return {
    value: (result as any).gia_tri as number,
    unit: (result as any).loai_don_vi as string,
  }
}
