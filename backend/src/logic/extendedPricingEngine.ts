import { calculateBasePrice, BasePriceInput, BasePriceResult } from './basePricingEngine'

type DB = D1Database

export interface PricingPreload {
  nhuaPvc: any[]       // bang_gia_nhua_pvc rows
  laminateOne: any[]   // bang_gia_laminate_one rows
}

export interface ExtendedPriceResult {
  gia_goc_tinh: number | null
  gia_chi_tiet?: string
  chech_lech?: number | null
  loi_tinh?: string
  parse_info?: Record<string, any>
  cot_go_match?: string | null
  be_mat_match?: string | null
  loai_sp?: string
}

// Preload small lookup tables once per request to avoid N+1 queries per product
export async function preloadPricingData(db: DB): Promise<PricingPreload> {
  const [pvc, lam] = await db.batch([
    db.prepare('SELECT loai, do_day, tier, gia FROM bang_gia_nhua_pvc'),
    db.prepare('SELECT ma_mau, tier, gia_foil FROM bang_gia_laminate_one WHERE gia_foil IS NOT NULL'),
  ])
  return {
    nhuaPvc: (pvc as any)?.results || [],
    laminateOne: (lam as any)?.results || [],
  }
}

// Look up Chỉ nẹp price from bang_gia_chi
async function lookupChi(db: DB, maHang: string, tenHang: string): Promise<ExtendedPriceResult> {
  try {
    // Extract size from ten_hang: "Chỉ nẹp 106T 21 x 0.8" or "Chỉ W.oak 20mm"
    const sizeMatch = tenHang.match(/(\d+)\s*x\s*([\d.]+)/)
  const size = sizeMatch ? `${sizeMatch[1]} x ${sizeMatch[2]}` : null
  
  // Extract first color code from ten_hang
  const colorMatch = tenHang.match(/(?:nẹp\s+)(\S+)/)
  const colorCode = colorMatch ? colorMatch[1] : null

  // Determine if it's a basic white color or woodgrain/special color
  // White/basic: 100, 101, 104, 106 (T/SH), SB
  // Others: wood grain, special effects
  const isBasicColor = colorCode ? /^\d{3}(T|SH|G)?$/.test(colorCode) && !colorCode?.includes('SB') : false
  const isSBMau = colorCode ? /^SB\d{3}/.test(colorCode) : false

  // Map to pricing groups
  let pricingGroup: string
  if (isBasicColor) {
    pricingGroup = 'Chỉ PVC Trắng 100/101/104 (T/SH)'
  } else if (isSBMau) {
    pricingGroup = 'Chỉ PVC SB 001-009'
  } else if (tenHang.includes('Acrylic') || tenHang.includes('ACRYLIC')) {
    pricingGroup = 'Chỉ Acrylic'
  } else if (tenHang.includes('veneer') || tenHang.includes('VENEER')) {
    pricingGroup = 'Chỉ veneer'
  } else {
    pricingGroup = 'Chỉ PVC Vân gỗ, Đơn sắc hiệu ứng khác'  // default: wood grain
  }

  if (pricingGroup === 'Chỉ PVC Trắng 100/101/104 (T/SH)') {
    if (size) {
      const r = await db.prepare(
        `SELECT gia FROM bang_gia_chi WHERE loai = 'Chỉ PVC' AND INSTR(ten, ?) > 0 AND INSTR(quy_cach, ?) > 0 LIMIT 1`
      ).bind(pricingGroup, size).first()
      if (r) return { gia_goc_tinh: (r as any).gia, parse_info: { loai: 'Chỉ PVC', ten: pricingGroup, quy_cach: size } }
    }
  } else if (pricingGroup === 'Chỉ PVC SB 001-009') {
    const r = await db.prepare(
      `SELECT gia FROM bang_gia_chi WHERE loai = 'Chỉ ABS/PVC' AND INSTR(ten, 'SB') > 0 LIMIT 1`
    ).first()
    if (r) return { gia_goc_tinh: (r as any).gia, parse_info: { loai: 'Chỉ', ten: 'Chỉ PVC SB 001-009' } }
  } else if (pricingGroup === 'Chỉ Acrylic') {
    const r = await db.prepare(
      `SELECT gia FROM bang_gia_chi WHERE loai = 'Chỉ Acrylic NK' AND INSTR(quy_cach, ?) > 0 LIMIT 1`
    ).bind(size || '22 x 1').first()
    if (r) return { gia_goc_tinh: (r as any).gia, parse_info: { loai: 'Chỉ Acrylic NK', quy_cach: size } }
  } else if (pricingGroup === 'Chỉ veneer') {
    const woodMatch = tenHang.match(/(Xoan|Sồi|Walnut|Oak|Soi|W\.)/i)
    const wood = woodMatch ? woodMatch[1] : null
    const hasKeo = tenHang.includes('có keo') || tenHang.includes('Keo')
    if (wood) {
      const qc = size ? `${size}${hasKeo ? ' có keo' : ' không keo'}` : (hasKeo ? '20mm có keo' : '20mm không keo')
      const r = await db.prepare(
        `SELECT gia FROM bang_gia_chi WHERE loai = 'Chỉ veneer' AND INSTR(ten, ?) > 0 AND INSTR(quy_cach, ?) > 0 LIMIT 1`
      ).bind(wood, qc).first()
      if (r) return { gia_goc_tinh: (r as any).gia, parse_info: { loai: 'Chỉ veneer', ten: wood, quy_cach: qc } }
    }
  } else {
    // Default: PVC vân gỗ / đơn sắc hiệu ứng
    if (size) {
      const r = await db.prepare(
        `SELECT gia FROM bang_gia_chi WHERE loai = 'Chỉ PVC' AND INSTR(ten, ?) > 0 AND INSTR(quy_cach, ?) > 0 LIMIT 1`
      ).bind(pricingGroup, size).first()
      if (r) return { gia_goc_tinh: (r as any).gia, parse_info: { loai: 'Chỉ PVC', ten: pricingGroup, quy_cach: size } }
    }
  }

  // Last resort: match by size only
  if (size) {
    const r = await db.prepare(
      `SELECT gia FROM bang_gia_chi WHERE INSTR(quy_cach, ?) > 0 LIMIT 1`
    ).bind(size).first()
    if (r) return { gia_goc_tinh: (r as any).gia, parse_info: { size } }
  }

  return { gia_goc_tinh: null, loi_tinh: `Không tìm thấy chỉ: size=${size} color=${colorCode}` }
  } catch (e: any) {
    return { gia_goc_tinh: null, loi_tinh: `Lỗi tra cứu chỉ: ${e.message}` }
  }
}

// Look up Laminate from bang_gia_laminate_one
async function lookupLaminate(_db: DB, maHang: string, tenHang: string): Promise<ExtendedPriceResult> {
  const isLP = tenHang.toUpperCase().includes('LP ') || maHang.startsWith('LP')
  const isLE = tenHang.toUpperCase().includes('LE ') || maHang.startsWith('LE')

  const colorMatch = tenHang.match(/\b(LP|LE)\s+([A-Za-z0-9\/_À-ỹ]+)/i)
  let rawCode = colorMatch ? colorMatch[2].toUpperCase() : null

  let colorCode: string | null = null

  if (rawCode) {
    if (rawCode.includes('/')) {
      // Composite color: 104/101T → 101-104
      const [a, rest] = rawCode.split('/')
      const b = rest.replace(/(EV|WN|SH|MM|BH|BK|G|T|SN|SL|MW|NT|S|PL)$/, '').trim()
      const numA = parseInt(a, 10), numB = parseInt(b, 10)
      if (!isNaN(numA) && !isNaN(numB)) {
        const sorted = [numA, numB].sort()
        colorCode = `${sorted[0]}-${sorted[1]}`
      }
    } else {
      // Handle Vietnamese colors without space: ĐENG, ĐENMM, ĐENPL, ĐENT
      const vnMatch = rawCode.match(/^(ĐEN|CHÌ)(G|MM|PL|T)$/i)
      if (vnMatch) {
        const base = vnMatch[1].toUpperCase()
        const eff = vnMatch[2]
        colorCode = base + (eff === 'G' || eff === 'PL' ? ' G' : eff === 'MM' ? ' MM' : ' T')
      } else {
        // Strip film effect suffix
        colorCode = rawCode.replace(/-(SN|SL|MW|NT|S|PL)$/, '').replace(/(EV|WN|SH|MM|BH|BK|G|T|SN|SL|MW|NT|S|PL)$/, '').trim()
      }
    }
  }

  const colorToNhom: Record<string, string> = {
    '004': 'LE1', '101': 'LE1', '203': 'LE1', '204': 'LE1', '012': 'LE1',
    '019': 'LE1', '023': 'LE1', '025': 'LE1', '027': 'LE1', '029': 'LE1',
    '030': 'LE1', '033': 'LE1', '034': 'LE1', '039': 'LE1',
    '036': 'LE2', '388': 'LE2', '402': 'LE2', '412': 'LE2', '503': 'LE2', '613': 'LE2',
    '102': 'LP1', '209': 'LP1', '240': 'LP1', '335': 'LP1', '413': 'LP1',
    '426': 'LP1', '428': 'LP1', '431': 'LP1', '436': 'LP1', '502': 'LP1',
    '668': 'LP1', '701': 'LP1', '702': 'LP1',
    'D1': 'LP2', 'D2': 'LP2', 'D3': 'LP2', 'D5': 'LP2',
    '319': 'LP2', '332': 'LP2', '333': 'LP2', '387': 'LP2', '389': 'LP2',
    '404': 'LP2', '421': 'LP2', '434': 'LP2', '444': 'LP2', '445': 'LP2',
    '447': 'LP2', '448': 'LP2', '611': 'LP2', '612': 'LP2', '681': 'LP2',
    '682': 'LP2', '684': 'LP2',
    '101-104': 'LP3', 'LATTE': 'LP3',
  }

  let targetNhom: string | null = null

  if (colorCode && colorToNhom[colorCode]) {
    targetNhom = colorToNhom[colorCode]
  }

  // Override 388 → LP2 when prefix is LP (388EV is LP2, 388T is LE2)
  if (targetNhom === 'LE2' && isLP && colorCode === '388') targetNhom = 'LP2'

  if (!targetNhom && rawCode) {
    if (/^ĐEN\s*G$/i.test(rawCode) || /^ĐEN\s*PL$/i.test(rawCode)) targetNhom = 'LP2'
    else if (/^ĐEN\s*MM$/i.test(rawCode) || /^CHÌ\s*MM$/i.test(rawCode)) targetNhom = 'LP3'
    else if (/^ĐEN\s*T$/i.test(rawCode) || /^CHÌ\s*T$/i.test(rawCode)) targetNhom = 'LP1'
    else if (/^LATTE/i.test(rawCode)) targetNhom = 'LP3'
    else if (/^METAL\s*GOLD/i.test(rawCode)) targetNhom = 'LP4'
    else if (/^MIRROR/i.test(rawCode)) targetNhom = 'LP5'
  // If no color match, use default by prefix
  } else if (!targetNhom) {
    if (isLE) targetNhom = 'LE1'
    else targetNhom = 'LP1'
  }

  const nhomFullName: Record<string, string> = {
    'LE1': 'Laminate Economy 1 (LE1)', 'LE2': 'Laminate Economy 2 (LE2)',
    'LP1': 'Laminate Premium 1 (LP1)', 'LP2': 'Laminate Premium 2 (LP2)',
    'LP3': 'Laminate Premium 3 (LP3)', 'LP4': 'Laminate Premium 4 (LP4)',
    'LP5': 'Laminate Premium 5 (LP5)',
  }
  const correctPrices: Record<string, number> = {
    'Laminate Economy 1 (LE1)': 170000,
    'Laminate Economy 2 (LE2)': 190000,
    'Laminate Premium 1 (LP1)': 330000,
    'Laminate Premium 2 (LP2)': 360000,
    'Laminate Premium 3 (LP3)': 390000,
    'Laminate Premium 4 (LP4)': 830000,
    'Laminate Premium 5 (LP5)': 2670000,
  }

  const fullNhom = targetNhom ? nhomFullName[targetNhom] : null
  return {
    gia_goc_tinh: fullNhom ? correctPrices[fullNhom] : null,
    parse_info: { nhom: fullNhom, color: colorCode }
  }
}

// Look up Nhựa Laminate from bang_gia_nhua_laminate
async function lookupNhuaLaminate(db: DB, maHang: string, tenHang: string, preload?: PricingPreload): Promise<ExtendedPriceResult> {
  // ma_hang: "NL17055101SH2"
  // Extract độ dày from ma_hang: chars 2-3 = "17"
  const doDayMatch = maHang.match(/^NL(\d{2})/)
  const doDayRaw = doDayMatch ? doDayMatch[1] : null
  const doDay = doDayRaw ? parseInt(doDayRaw) + 'mm' : null

  // Check if "One Laminate" 9mm product — use PVC core + Laminate One foil
  // (Only 9mm has large gap; other thicknesses use standard laminate pricing)
  const isOneLaminate = /\bOne\s+Laminate\b/i.test(tenHang) || /\bFoil\s+One\b/i.test(tenHang)
  if (isOneLaminate && doDay === '9mm') {
    return await lookupOneLaminate(db, maHang, tenHang, doDay, preload)
  }

  // Map to exact loai_cot in DB
  let loaiCot = 'DURABO 0.5- 0.55'
  if (tenHang.includes('0.6g') || tenHang.includes('0.6')) loaiCot = 'DURABO 0.6'
  if (tenHang.includes('3 lớp') || tenHang.includes('0.65')) loaiCot = 'Ván nhựa than tre 0.65'

  if (doDay) {
    let row = await db.prepare(
      `SELECT le1_backer, le2_backer, lp1_backer, lp2_backer, le1_2mat, le2_2mat, lp1_2mat, lp2_2mat, do_day FROM bang_gia_nhua_laminate
       WHERE loai_cot = ? AND do_day = ? AND tier = 'PREMIUM' LIMIT 1`
    ).bind(loaiCot, doDay).first()
    if (!row) {
      row = await db.prepare(
        `SELECT le1_backer, le2_backer, lp1_backer, lp2_backer, le1_2mat, le2_2mat, lp1_2mat, lp2_2mat, do_day FROM bang_gia_nhua_laminate
         WHERE loai_cot = ? AND do_day = ? AND tier = 'BBG PREMIER' LIMIT 1`
      ).bind(loaiCot, doDay).first()
    }
    if (row) {
      const r = row as any
      const isLE = /\bLE\s/.test(tenHang) || /\bLE$/.test(tenHang)
      const is2Mat = tenHang.includes('2 mặt') || maHang.endsWith('2')
      let price: number | null = null
      if (isLE) {
        price = is2Mat ? (r.le1_2mat || r.le2_2mat) : (r.le1_backer || r.le2_backer)
      } else {
        price = is2Mat ? (r.lp1_2mat || r.lp2_2mat) : (r.lp1_backer || r.lp2_backer || r.le1_backer)
      }
      return { gia_goc_tinh: price, parse_info: { loai_cot: loaiCot, do_day: doDay, le: isLE, so_mat: is2Mat ? 2 : 1 } }
    }
  }

  return { gia_goc_tinh: null, loi_tinh: `Không tìm thấy nhựa Laminate: ${loaiCot}/${doDay}` }
}

// "One Laminate" / "Foil One" products: PVC core + Laminate One foil + margin
async function lookupOneLaminate(db: DB, maHang: string, tenHang: string, doDay: string, preload?: PricingPreload): Promise<ExtendedPriceResult> {
  // Determine PVC core type from product name
  let pvcLoai = 'Durabo 0.55D'
  if (tenHang.includes('0.5g') || tenHang.includes('0.5 ly')) pvcLoai = 'Durabo 0.5D'
  if (tenHang.includes('0.6g') || tenHang.includes('0.6')) pvcLoai = 'Durabo 0.6D'
  if (tenHang.includes('3 lớp') || tenHang.includes('0.65')) pvcLoai = 'Ván nhựa than tre 0.65'

  // Get PVC core price — use preload cache or DB
  let giaPVC: number | null = null
  if (preload) {
    // In-memory lookup: match loai + do_day + tier (BBG PREMIER first, then PREMIUM, then fallback)
    const pvcRows = preload.nhuaPvc
    const match = pvcRows.find((r: any) => r.loai === pvcLoai && r.do_day === doDay && r.tier === 'BBG PREMIER')
      || pvcRows.find((r: any) => r.loai === pvcLoai && r.do_day === doDay && r.tier === 'PREMIUM')
      || pvcRows.find((r: any) => ['Durabo 0.55D','Durabo 0.5D','Durabo 0.6D'].includes(r.loai) && r.do_day === doDay)
    if (match) giaPVC = match.gia
  } else {
    let pvcRow = await db.prepare(
      'SELECT gia FROM bang_gia_nhua_pvc WHERE loai = ? AND do_day = ? AND tier = ? LIMIT 1'
    ).bind(pvcLoai, doDay, 'BBG PREMIER').first()
    if (!pvcRow) {
      pvcRow = await db.prepare(
        'SELECT gia FROM bang_gia_nhua_pvc WHERE loai = ? AND do_day = ? AND tier = ? LIMIT 1'
      ).bind(pvcLoai, doDay, 'PREMIUM').first()
    }
    if (!pvcRow) {
      pvcRow = await db.prepare(
        "SELECT gia FROM bang_gia_nhua_pvc WHERE loai IN ('Durabo 0.55D','Durabo 0.5D','Durabo 0.6D') AND do_day = ? LIMIT 1"
      ).bind(doDay).first()
    }
    if (pvcRow) giaPVC = (pvcRow as any).gia
  }
  if (giaPVC === null) {
    return { gia_goc_tinh: null, loi_tinh: `Không tìm thấy PVC core: ${pvcLoai}/${doDay}` }
  }

  // Extract LE/LP type and color code
  const isLE = /\bLE\s/.test(tenHang) || /\bLE$/.test(tenHang)
  const is2Mat = tenHang.includes('2 mặt') || maHang.endsWith('2')

  // Extract color code after LE/LP: "LE 012 T" → "012T"
  const colorMatch = tenHang.match(/(?:LE|LP)\s+(\S+)\s*(\S+)?/)
  const colorCode = colorMatch ? (colorMatch[1] + (colorMatch[2] || '')).trim() : null

  // Look up foil price from bang_gia_laminate_one by ma_mau
  let giaFoil: number | null = null
  if (colorCode) {
    if (preload) {
      // In-memory lookup: exact match first, then partial match
      const lamRows = preload.laminateOne
      const exact = lamRows.find((r: any) => r.ma_mau === colorCode && (r.tier === 'PREMIUM' || r.tier === 'BBG PREMIER'))
      if (exact) {
        giaFoil = exact.gia_foil
      } else {
        const colorBase = colorCode.replace(/[A-Z].*$/, '')
        if (colorBase && colorBase !== colorCode) {
          const partial = lamRows.find((r: any) => r.ma_mau?.startsWith(colorBase) && (r.tier === 'PREMIUM' || r.tier === 'BBG PREMIER'))
          if (partial) giaFoil = partial.gia_foil
        }
      }
    } else {
      for (const tier of ['PREMIUM', 'BBG PREMIER']) {
        const foilRow = await db.prepare(
          'SELECT nhom, gia_foil FROM bang_gia_laminate_one WHERE ma_mau = ? AND tier = ? AND gia_foil IS NOT NULL LIMIT 1'
        ).bind(colorCode, tier).first() as any
        if (foilRow) {
          giaFoil = foilRow.gia_foil as number
          break
        }
      }
      if (!giaFoil) {
        const colorBase = colorCode.replace(/[A-Z].*$/, '')
        if (colorBase && colorBase !== colorCode) {
          for (const tier of ['PREMIUM', 'BBG PREMIER']) {
            const foilRow = await db.prepare(
              "SELECT nhom, gia_foil FROM bang_gia_laminate_one WHERE ma_mau LIKE ? AND tier = ? AND gia_foil IS NOT NULL LIMIT 1"
            ).bind(colorBase + '%', tier).first() as any
            if (foilRow) {
              giaFoil = foilRow.gia_foil as number
              break
            }
          }
        }
      }
    }
  }

  // Default foil prices if not found in DB
  if (giaFoil === null) {
    giaFoil = isLE ? 170000 : 330000
  }

  // Margin (manufacturing/packaging overhead)
  const margin = 80000

  // For 2 mặt, double the foil cost
  const totalFoil = is2Mat ? giaFoil * 2 : giaFoil
  const total = giaPVC + totalFoil + margin

  return {
    gia_goc_tinh: total,
    parse_info: {
      loai: 'One Laminate',
      do_day: doDay,
      le: isLE,
      so_mat: is2Mat ? 2 : 1,
      gia_pvc: giaPVC,
      gia_foil: giaFoil,
      margin,
      color_code: colorCode
    }
  }
}

// Look up Nhựa thường from bang_gia_nhua_pvc (Durabo base prices)
async function lookupNhuaThuong(db: DB, maHang: string, tenHang: string): Promise<ExtendedPriceResult> {
  // ma_hang: "NT080551" → Nhựa + 08mm + 0.55
  const doDayMatch = maHang.match(/^NT(\d{2})/)
  const doDayRaw = doDayMatch ? doDayMatch[1] : null
  const doDay = doDayRaw ? parseInt(doDayRaw) + 'mm' : null

  let loaiCandidates: string[] = ['Durabo 0.55D']
  if (tenHang.includes('3 lớp') || tenHang.includes('than tre')) loaiCandidates = ['WPC Shield Board']
  else if (tenHang.includes('Siêu bóng') || tenHang.includes('super')) loaiCandidates = ['Durabo Siêu bóng']
  else if (tenHang.includes('Lõi đen')) loaiCandidates = ['Durabo Lõi đen']
  else if (tenHang.includes('ECO')) loaiCandidates = ['Durabo ECO']
  else if (tenHang.includes('0.5g') || tenHang.includes('0.5 ly')) loaiCandidates = ['Durabo 0.5D', 'Durabo 0.55D']
  else if (tenHang.includes('0.6g') || tenHang.includes('0.6')) loaiCandidates = ['Durabo 0.6D']

  if (doDay) {
    for (const loaiCot of loaiCandidates) {
      for (const tier of ['PREMIUM', 'BBG PREMIER']) {
        const row = await db.prepare(
          `SELECT gia FROM bang_gia_nhua_pvc WHERE loai = ? AND do_day = ? AND tier = ? LIMIT 1`
        ).bind(loaiCot, doDay, tier).first()
        if (row) {
          const gia = (row as any).gia
          return { gia_goc_tinh: gia, parse_info: { loai_cot: loaiCot, do_day: doDay, bang: 'nhua_pvc' } }
        }
      }
    }
  }

  return { gia_goc_tinh: null, loi_tinh: `Không tìm thấy Nhựa thường: ${loaiCandidates[0]}/${doDay}` }
}

// Map MEVE color codes to IPLY Melamine Plywood nhom
const TOTI_COLORS = new Set(['CHÌ', 'KEM', 'X.BIỂN', 'X.BĂNG', 'X.CHUỐI', 'X.DƯƠNG', 'ĐEN', 'ĐEN-1', 'ĐỎ', 'HỒNG', 'VÀNG', 'CAM', 'VIOLET', 'LATTE'])

async function lookupIPLYNhom(db: DB, colorCode: string, doDay: string): Promise<string | null> {
  if (colorCode === '01') return `ĐƠN SẮC 101 ${doDay}`
  if (colorCode === '106') return `ĐƠN SẮC 106 ${doDay}`
  if (TOTI_COLORS.has(colorCode)) return `TỐI ${doDay}`
  // Check existing nhom in 220 MÀU MELAMINE for guidance
  const row = await db.prepare(
    "SELECT nhom FROM bang_gia_ma_mau WHERE bang = '220 MÀU MELAMINE' AND ma_mau = ? LIMIT 1"
  ).bind(colorCode).first() as any
  if (row && String(row.nhom).includes('PREMIUM COLOR')) return `TỐI ${doDay}`
  return `SÁNG + TRUNG ${doDay}`
}

// Main entry point
export async function calculateAnyBasePrice(
  db: DB,
  maHang: string,
  tenHang: string,
  donGia: number | null,
  preload?: PricingPreload
): Promise<ExtendedPriceResult> {
  if (!maHang || !tenHang) {
    return { gia_goc_tinh: null, loi_tinh: 'Thiếu thông tin sản phẩm' }
  }

  let result: ExtendedPriceResult | null = null

  if (maHang.startsWith('ME')) {
    // Delegate to Melamine engine
    const name = tenHang
    const mmMatch = name.match(/(\d+(?:\.\d+)?)\s*mm/)
    const do_day = mmMatch ? mmMatch[1] + 'mm' : null
    const matMatch = name.match(/(\d+)\s*mặt/)
    let so_mat = matMatch ? parseInt(matMatch[1]) : null
    if (so_mat !== 1 && so_mat !== 2) so_mat = 2
    let colorCode = null
    const cMatch = name.match(/MEL\s+(\S+)/)
    if (cMatch) colorCode = cMatch[1]
    let loai_cot_go = null
    let cap = null
    const upper = name.toUpperCase()

    // ---- Ván Ép phủ Melamine (MEVE) — IPLY all-inclusive pricing ----
    if (maHang.startsWith('MEVE') && do_day && colorCode) {
      const iplyNhom = await lookupIPLYNhom(db, colorCode, do_day)
      if (iplyNhom) {
        for (const t of ['BBG PREMIER', 'PREMIUM']) {
          const row = await db.prepare(
            "SELECT gia_1_mat FROM bang_gia_nhom_mau WHERE bang = 'IPLY Melamine Plywood' AND nhom = ? AND tier = ? LIMIT 1"
          ).bind(iplyNhom, t).first() as any
          if (row) {
            result = {
              gia_goc_tinh: row.gia_1_mat,
              be_mat_match: iplyNhom,
              chech_lech: donGia !== null ? donGia - row.gia_1_mat : null,
              parse_info: { loai: 'Ván Ép phủ Melamine (IPLY)', do_day, colorCode, nhom: iplyNhom, gia: row.gia_1_mat }
            }
            break
          }
        }
      }
    }

    if (maHang.startsWith('MEVE') || name.includes('Ván ép')) {
      loai_cot_go = 'Ván Ép'
    } else if (maHang.startsWith('MEOK')) {
      loai_cot_go = 'Ván Dăm - Okal'
    } else if (name.includes('kháng ẩm') || name.includes('chống ẩm')) {
      loai_cot_go = 'Ván MDF-HDF'
    } else if (name.includes('Durabo') || name.includes('Nhựa')) {
      loai_cot_go = null
    } else if (maHang.startsWith('ME')) {
      loai_cot_go = 'Ván MDF-HDF'
    }

    if (upper.includes('HDF HMR')) cap = 'HDF HMR E2/E1'
    else if (upper.includes('HMR E2')) cap = 'HMR E2'
    else if (upper.includes('HMR E1')) cap = 'HMR E1'
    else if (upper.includes('HMR CP2')) cap = 'HMR CP2'
    else if (upper.includes('HMR')) cap = 'HDF HMR E2/E1'
    else if (upper.includes('MMR MK') || upper.includes('MMR TT') || maHang.endsWith('MK') || maHang.endsWith('TTD')) cap = 'LMR/MMR E2'
    else if (upper.includes('MMR')) cap = 'MMR E2'
    else if (upper.includes('LMR')) cap = 'LMR/MMR E2'
    else if (upper.includes('KG')) cap = 'LMR/MMR E2'
    else if (maHang.startsWith('MEVE')) cap = 'Mặt Ash/ mỡ CD'
    else if (maHang.startsWith('MEOK')) cap = 'E2'
    else cap = 'MDF E2'

    let tier = 'BBG PREMIER'

    // Try standard Melamine pricing (wood core + surface) — skip if already resolved (e.g., IPLY)
    async function tryMelamine(beMatBang: string, c: string, lcg: string, d: string): Promise<BasePriceResult | null> {
      const r = await calculateBasePrice(db, { loai_cot_go: lcg, do_day: d, cap: c, tier, bang_be_mat: beMatBang, ma_mau: colorCode!, so_mat: so_mat || 1 })
      if (r.tong_gia) return r
      return null
    }

    if (!result && do_day && colorCode && loai_cot_go) {
      // Try primary cap, then fallback caps if core not found
      const fallbackCapsMap: Record<string, string[]> = {
        'HDF HMR E2/E1': ['HMR E1', 'LMR/MMR E2', 'MDF E2'],
        'HMR E2': ['HMR E1', 'LMR/MMR E2', 'MDF E2'],
        'HMR E1': ['LMR/MMR E2', 'MDF E2'],
        'MMR E2': ['LMR/MMR E2', 'MDF E2'],
        'LMR/MMR E2': ['MDF E2'],
      }
      const capsToTry = [cap, ...(fallbackCapsMap[cap] || [])]
      let triedCaps: string[] = []

      for (const c of capsToTry) {
        if (triedCaps.includes(c)) continue
        triedCaps.push(c)
        for (const bang of ['220 MÀU MELAMINE', '98 MÀU MELAMINE']) {
          const bp = await tryMelamine(bang, c, loai_cot_go, do_day)
          if (bp && bp.cot_go_match) {
            result = {
              gia_goc_tinh: bp.tong_gia,
              cot_go_match: bp.cot_go_match?.cap || null,
              be_mat_match: bp.be_mat_match?.nhom || null,
              chech_lech: donGia !== null && bp.tong_gia != null ? donGia - bp.tong_gia : null,
              parse_info: { loai_cot_go, do_day, cap, tier, colorCode, so_mat: so_mat || 1 }
            }
            break
          }
        }
        if (result) break
      }

      if (!result) {
        // Last resort: use any result that has at least surface price
        for (const c of capsToTry) {
          for (const bang of ['220 MÀU MELAMINE', '98 MÀU MELAMINE']) {
            const bp = await tryMelamine(bang, c, loai_cot_go, do_day)
            if (bp) {
              result = {
                gia_goc_tinh: bp.tong_gia,
                cot_go_match: bp.cot_go_match?.cap || null,
                be_mat_match: bp.be_mat_match?.nhom || null,
                chech_lech: donGia !== null && bp.tong_gia != null ? donGia - bp.tong_gia : null,
                parse_info: { loai_cot_go, do_day, cap, tier, colorCode, so_mat: so_mat || 1 }
              }
              break
            }
          }
          if (result) break
        }
      }

      if (!result) {
        result = { gia_goc_tinh: null, loi_tinh: `Không tính được giá Melamine: ${loai_cot_go}/${do_day}/${cap}` }
      }
    }

    // Hybrid: Ván Nhựa + bề mặt Melamine (ME-prefixed but Nhựa/Durabo base)
    if (!result && do_day && colorCode && name.includes('Nhựa')) {
      // Look up nhựa base price
      let loaiCot = 'Durabo 0.55D'
      if (name.includes('0.5g') || name.includes('0.5 ly')) loaiCot = 'Durabo 0.5D'
      if (name.includes('0.6g') || name.includes('0.6')) loaiCot = 'Durabo 0.6D'
      if (name.includes('3 lớp') || name.includes('0.65')) loaiCot = 'Ván nhựa than tre 0.65'

      let nhuaRow = await db.prepare(
        `SELECT gia, loai FROM bang_gia_nhua_pvc
         WHERE loai = ? AND do_day = ? AND tier = ? LIMIT 1`
      ).bind(loaiCot, do_day, tier).first()
      // Fallback: try other Durabo variants for this do_day
      if (!nhuaRow) {
        nhuaRow = await db.prepare(
          `SELECT gia, loai FROM bang_gia_nhua_pvc
           WHERE loai IN ('Durabo 0.55D', 'Durabo 0.6D', 'Durabo 0.5D') AND do_day = ? AND tier = ? LIMIT 1`
        ).bind(do_day, tier).first()
      }
      // Fallback: try other tier
      if (!nhuaRow) {
        const otherTier = tier === 'PREMIUM' ? 'BBG PREMIER' : 'PREMIUM'
        nhuaRow = await db.prepare(
          `SELECT gia, loai FROM bang_gia_nhua_pvc
           WHERE loai IN ('Durabo 0.55D', 'Durabo 0.6D', 'Durabo 0.5D') AND do_day = ? AND tier = ? LIMIT 1`
        ).bind(do_day, otherTier).first()
      }

      if (nhuaRow) {
        loaiCot = (nhuaRow as any).loai
        const giaNhua = (nhuaRow as any).gia
        // Xác định nhóm màu Ván Nhựa phủ Melamine (PDF page 15)
        // Nhóm Sáng+Trung: đa số (~90%), Nhóm Tối+Đơn sắc, Nhóm 104-106
        let nhomNhua = 'SANG_TRUNG'
        const cc = (colorCode || '').trim()
        if (cc === '104' || cc === '106') nhomNhua = 'NHOM_104_106'
        // Tra add-on từ bảng giá thành phẩm Ván Nhựa phủ Melamine
        const addOnMap: Record<string, Record<string, number>> = {
          'SANG_TRUNG': { '1': 220000, '2': 440000 },
          'TOI_DON_SAC': { '1': 320000, '2': 640000 },
          'NHOM_104_106': { '1': 370000, '2': 740000 },
        }
        const addOn = addOnMap[nhomNhua]?.[String(so_mat || 2)] || 440000
        const total = giaNhua + addOn
        result = {
          gia_goc_tinh: total,
          cot_go_match: `Nhựa: ${loaiCot}`,
          be_mat_match: nhomNhua,
          chech_lech: donGia !== null ? donGia - total : null,
          parse_info: { loai: 'Ván Nhựa phủ Melamine (TP)', loai_cot: loaiCot, do_day, colorCode, so_mat: so_mat || 1, gia_nhua: giaNhua, add_on: addOn, nhom_nhua: nhomNhua }
        }
      } else {
        result = { gia_goc_tinh: null, loi_tinh: `Không tìm thấy giá Nhựa: ${loaiCot}/${do_day}` }
      }
    }

    if (!result) {
      result = { gia_goc_tinh: null, loi_tinh: `Thiếu dữ liệu: do_day=${do_day} color=${colorCode} loai=${loai_cot_go}` }
    }
  } else if (maHang.startsWith('CH')) {
    result = await lookupChi(db, maHang, tenHang)
    if (result.gia_goc_tinh !== null && donGia !== null) {
      result.chech_lech = donGia - result.gia_goc_tinh
    }
  } else if (maHang.startsWith('LP') || maHang.startsWith('LE')) {
    result = await lookupLaminate(db, maHang, tenHang)
    if (result.gia_goc_tinh !== null && donGia !== null) {
      result.chech_lech = donGia - result.gia_goc_tinh
    }
  } else if (maHang.startsWith('NL')) {
    result = await lookupNhuaLaminate(db, maHang, tenHang, preload)
    if (result.gia_goc_tinh !== null && donGia !== null) {
      result.chech_lech = donGia - result.gia_goc_tinh
    }
  } else if (maHang.startsWith('NT')) {
    result = await lookupNhuaThuong(db, maHang, tenHang)
    if (result.gia_goc_tinh !== null && donGia !== null) {
      result.chech_lech = donGia - result.gia_goc_tinh
    }
  } else {
    result = { gia_goc_tinh: null, loai_sp: maHang.replace(/[^A-Za-z]/g, '').substring(0, 5) }
  }

  return result
}
