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

// ============================================================
// Phân loại mã SP → nhóm sản phẩm theo CHÍNH SÁCH 2026 (5 lớp)
// Tên nhóm khớp 1:1 với cột `nhom_sp` của bảng policy_rules
// (đặc tả mục 5 — 18 nhóm, seed ở migration 0045).
// ============================================================
// Thứ tự quan trọng: prefix dài/cụ thể hơn kiểm tra trước.
const NHOM_SP_POLICY: [string, string][] = [
  ['MEVE', 'MELAMINE_PLYWOOD'],        // Plywood phủ mel (EV PLY MEL)
  ['MEGG', 'MEL_NHUA_OSB_GO_GHEP'],    // Gỗ ghép phủ melamine
  ['MEVN', 'MAT_PHU_MELAMINE'],        // MDF vân (10% cố định)
  ['TOK', 'VAN_DAM_OKAL'],             // Okal ván trơn
  ['TOSB', 'OSB'],
  ['TGG', 'GO_GHEP'],
  ['TVE', 'VAN_EP'],
  ['TDR', 'DURABO'],
  ['VNGG', 'GO_GHEP'],
  ['VNVE', 'VENEER_MAT_PHU_KHAC'],
  ['NT', 'DURABO'],                    // Ván Nhựa Durabo (NT17...)
  ['OSB', 'OSB'],
  ['GG', 'GO_GHEP'],
  ['VE', 'VAN_EP'],
  ['VL', 'VAN_EP'],
  ['DR', 'DURABO'],
  ['PETG', 'PVC_PETG'],
  ['PVC', 'PVC_PETG'],
  ['NP', 'PVC_PETG'],
  ['MP', 'PVC_PETG'],
  ['CHI', 'CHI_NEP'],
  ['ZKEO', 'KEO_HAT'],
  ['AC', 'ACRYLIC'],
  ['NA', 'ACRYLIC'],
  ['MA', 'ACRYLIC'],
  // NL = Ván Nhựa phủ One Laminate — thực tế flat 10% ≈ nhóm nhựa/OSB/gỗ ghép (không phải 2%)
  ['NL', 'MEL_NHUA_OSB_GO_GHEP'],
  // LE/LP/GL = tấm Foil One Laminate (bán vật liệu cuộn/tấm) — giữ nhóm laminate
  ['LE', 'ONE_LAMINATE'],
  ['LP', 'ONE_LAMINATE'],
  ['GL', 'ONE_LAMINATE'],
  // ML/HL = MDF/HDF kháng ẩm phủ One Laminate — xử lý như ván MDF/HDF
  ['ML', 'MDF_HDF'],
  ['HL', 'MDF_HDF'],
  ['GC', 'VENEER_MAT_PHU_KHAC'],
  // M0*/M1* = Melamine giấy keo (ten_hang "TL giấy keo") — giống MEVN: mức cố định 10%
  ['M0', 'MAT_PHU_MELAMINE'],
  ['M1', 'MAT_PHU_MELAMINE'],
  // ME chung = MDF/Okal phủ Melamine (danh mục chính) — cần trước 'T' nhưng sau các biến thể MEVE/MEGG/MEVN
  ['ME', 'MDFOKAL_MEL_REG'],
  ['T', 'MDF_HDF'],                    // Ván trơn MDF/HDF (T17HDF, T17MDF, T08HDF, T08LDF...)
]

export function getNhomSPPolicy(maSP: string): string {
  if (!maSP) return ''
  const upper = maSP.toUpperCase()
  for (const [prefix, nhom] of NHOM_SP_POLICY) {
    if (upper.startsWith(prefix)) return nhom
  }
  return ''
}

// Mã hàng chịu Lớp 3 (CK doanh số MDF/Okal phủ Melamine)?
// MDF/Okal phủ Melamine (ME, MEOK) → Lớp 3. Các biến thể ME đặc biệt
// (MEVE=Plywood, MEGG=gỗ ghép, MEVN=vân 10%) → Lớp 1.
export function laMelPhu(maSP: string): boolean {
  const upper = maSP.toUpperCase()
  if (!upper.startsWith('ME')) return false
  if (upper.startsWith('MEVE')) return false
  if (upper.startsWith('MEGG')) return false
  if (upper.startsWith('MEVN')) return false
  return true
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
