// ─── CK Engine: Offline CK calculation (ported from backend) ────
// Pure business logic — no database calls. Data passed via Lop2Ctx.

// ─── Types ──────────────────────────────────────────────────────
export type DongBan = {
  ma_hang: string
  ma_kh: string
  ngay: string
  so_ct: string
  ten_kh?: string
  sl_ban: number
  don_gia: number
  doanh_so: number
  ck: number
  hinh_thuc_giao?: string
  ds_mel_running?: number
  la_khuyen_mai?: number
  la_thanh_ly?: number
  [key: string]: any
}

export type Lop2Ctx = {
  coVC: Set<string>
  totalSl: Map<string, number>
  totalSlAll: Map<string, number>
  totalChiThung: Map<string, number>
  bacThang: Map<string, { pct98: number; pctKhac: number }>
  khachMap: Map<string, any>
  khachThangMap: Map<string, any[]>
  policyRules: any[]
  ckVanChuyen: any[]
  nhomMauMap: Map<string, string>
  revenueTiers: any[]
  monthlyDs: Map<string, number>
  ckOp1: Map<string, any[]>
  ckOp2: Map<string, any[]>
  ckOp1Thangs: string[]
}

// ─── Date helpers ───────────────────────────────────────────────
function isoNgay(ngay: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(ngay)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return ngay
}

function thangTuNgay(ngay: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(ngay)
  if (m) return `${m[3]}-${m[2]}`
  const m2 = /^(\d{4})-(\d{2})/.exec(ngay)
  if (m2) return `${m2[1]}-${m2[2]}`
  return ngay.slice(0, 7)
}

function normPct(v: any): number {
  const n = Number(v)
  if (isNaN(n) || n === 0) return 0
  return n > 1 ? n / 100 : n
}

function doDayTuMaHang(maHang: string): number | null {
  const m = /^(?:ME|T|NT|NL|NP|ML|LP|LE|DR|VE|VL|GG|OSB)(\d+(?:\.\d+)?)/i.exec(maHang)
  if (!m) return null
  const d = parseFloat(m[1])
  return d > 0 && d < 100 ? d : null
}

// ─── Product classification ─────────────────────────────────────
const NHOM_SP_POLICY: [string, string][] = [
  ['MEVE', 'MELAMINE_PLYWOOD'],
  ['MEGG', 'MEL_NHUA_OSB_GO_GHEP'],
  ['MEVN', 'MAT_PHU_MELAMINE'],
  ['TOK', 'VAN_DAM_OKAL'],
  ['TOSB', 'OSB'],
  ['TGG', 'GO_GHEP'],
  ['TVE', 'VAN_EP'],
  ['TDR', 'DURABO'],
  ['VNGG', 'GO_GHEP'],
  ['VNVE', 'VENEER_MAT_PHU_KHAC'],
  ['NT', 'DURABO'],
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
  ['NL', 'MEL_NHUA_OSB_GO_GHEP'],
  ['LE', 'ONE_LAMINATE'],
  ['LP', 'ONE_LAMINATE'],
  ['GL', 'ONE_LAMINATE'],
  ['ML', 'MDF_HDF'],
  ['HL', 'MDF_HDF'],
  ['GC', 'VENEER_MAT_PHU_KHAC'],
  ['M0', 'MAT_PHU_MELAMINE'],
  ['M1', 'MAT_PHU_MELAMINE'],
  ['ME', 'MDFOKAL_MEL_REG'],
  ['T', 'MDF_HDF'],
]

export function getNhomSPPolicy(maSP: string): string {
  if (!maSP) return ''
  const upper = maSP.toUpperCase()
  for (const [prefix, nhom] of NHOM_SP_POLICY) {
    if (upper.startsWith(prefix)) return nhom
  }
  return ''
}

export function laMelPhu(maSP: string): boolean {
  const upper = maSP.toUpperCase()
  if (!upper.startsWith('ME')) return false
  if (upper.startsWith('MEVE')) return false
  if (upper.startsWith('MEGG')) return false
  if (upper.startsWith('MEVN')) return false
  return true
}

// ─── Customer resolution ────────────────────────────────────────
function mergeKhachTheoThang(base: any, ov: any): any {
  const out = { ...base }
  if (ov) {
    for (const k of Object.keys(ov)) {
      if (ov[k] !== null && ov[k] !== undefined) out[k] = ov[k]
    }
  }
  return out
}

function resolveKhach(ctx: Lop2Ctx, maKh: string, thang: string): any | null {
  const cur = ctx.khachMap.get(maKh) || null
  const rows = ctx.khachThangMap.get(maKh) || null
  if (!rows || rows.length === 0) return cur
  for (const r of rows) {
    if (String(r.thang || '') <= thang) return cur ? mergeKhachTheoThang(cur, r) : r
  }
  return cur
}

// ─── Condition determination ────────────────────────────────────
function thungCuaDong(maHang: string, sl: number): number {
  const u = String(maHang || '').toUpperCase()
  if (u.includes('43-1')) return sl / 5
  return sl / 10
}

function xacDinhDieuKien(nhomSP: string, sl: number, orderSl: number, thungLine = sl): string {
  switch (nhomSP) {
    case 'VAN_DAM_OKAL':
    case 'MDF_HDF':
    case 'OSB':
    case 'VAN_EP':
      return sl >= 65 ? 'kien' : 'le'
    case 'DURABO':
      return sl >= 10 ? 'kien' : 'le'
    case 'GO_GHEP':
      return sl >= 20 ? 'gt20' : 'lt20'
    case 'MELAMINE_PLYWOOD':
      if (sl >= 500) return 'gt500'
      if (sl >= 50) return 'gt50'
      return 'co_don'
    case 'CHI_NEP':
      if (orderSl >= 100) return '100_thung'
      if (orderSl >= 10) return '10_thung'
      if (thungLine >= 1) return '1_thung'
      return 'co_don'
    case 'KEO_HAT':
      if (sl >= 10) return '10_bao'
      if (sl >= 1) return '1_bao'
      return 'co_don'
    default:
      return 'co_don'
  }
}

// ─── OP1 rule matching ──────────────────────────────────────────
function findCkOp1Rule(ctx: Lop2Ctx, nhomSp: string, dieuKien: string, thang: string): any | null {
  const rows = ctx.ckOp1.get(`${nhomSp}|${dieuKien}`)
  if (!rows || rows.length === 0) return null
  for (const r of rows) {
    const rt = String(r.thang || '')
    if (!rt || rt <= thang) return r
  }
  return rows[rows.length - 1]
}

function layRateTheoKH(rule: any, doiTuong: string, vung: string, hang: string): number | null {
  if (doiTuong === 'PREMIER') {
    if (vung === 'Tinh') return rule.dl_tinh ?? null
    if (vung === 'NgoaiThanh') return rule.dl_nt ?? null
    return rule.dl_sg ?? null
  }
  if (hang === 'Premium') return rule.xuong_premium ?? null
  return rule.xuong_thuong ?? null
}

// ─── Transport CK ───────────────────────────────────────────────
function findCkVanChuyen(vcs: any[] | undefined, doiTuong: string, vung: string): any | null {
  if (!vcs) return null
  let all: any = null
  for (const vc of vcs) {
    if (vc.doi_tuong !== doiTuong) continue
    if (vc.vung === vung) return vc
    if (vc.vung === 'ALL') all = vc
  }
  return all
}

// ─── Color group ────────────────────────────────────────────────
function xacDinhNhomMauLocal(nhomMauMap: Map<string, string>, maHang: string): '98_pho_thong' | 'khac' {
  const upper = maHang.toUpperCase()
  const mapped = nhomMauMap.get(upper)
  if (mapped) return mapped as '98_pho_thong' | 'khac'
  return 'khac'
}

// ─── Layer 3 (OP2 revenue-based) ────────────────────────────────
function traL3(ctx: Lop2Ctx, vung: string, hang: string, maKh: string, thang: string, nhomMau: '98_pho_thong' | 'khac', dsMelRunning = 0): number {
  const col = nhomMau === '98_pho_thong' ? 'pct_98mau' : 'pct_khac'
  const tiers = ctx.revenueTiers || []

  if (hang === 'OP2') {
    let ds = dsMelRunning
    if (!ds) ds = ctx.monthlyDs.get(`${maKh}|${thang}`) || 0
    let bestCk2: any = null
    for (const [key, arr] of ctx.ckOp2) {
      const [v, bac] = key.split('|')
      if (v !== vung) continue
      const bacN = Number(bac) || 0
      if (bacN > ds) continue
      let row = null
      for (const r of arr) {
        if (String(r.thang || '') <= thang) { row = r; break }
      }
      if (row && (!bestCk2 || bacN > Number(bestCk2.bac_tu || 0))) bestCk2 = row
    }
    if (bestCk2 && Number(bestCk2[col]) != null) {
      return Number(bestCk2[col]) || 0
    }
    let best: any = null
    for (const t of tiers) {
      if (t.vung === vung && t.hang === 'OP2' && Number(t.bac_tu || 0) <= ds) {
        if (!best || Number(t.bac_tu || 0) > Number(best.bac_tu || 0)) best = t
      }
    }
    if (best) return Number(best[col]) || 0
  }

  let base: any = null
  for (const t of tiers) {
    if (t.hang === hang && (t.vung === vung || t.vung == null) && Number(t.bac_tu || 0) === 0) {
      if (!base) base = t
      else if (t.vung === vung && base.vung == null) base = t
    }
  }
  if (base) return Number(base[col]) || 0
  return 0
}

// ─── MAIN: tinhCKChoDong ────────────────────────────────────────
export function tinhCKChoDong(row: DongBan, ctx: Lop2Ctx): any {
  const maHang = String(row.ma_hang || '')
  const maKh = String(row.ma_kh || '')
  const ngay = String(row.ngay || '')
  const doanhSo = Number(row.doanh_so) || (Number(row.sl_ban) || 0) * (Number(row.don_gia) || 0)
  const sl = Number(row.sl_ban) || 0
  const thang = thangTuNgay(ngay)

  const upper = maHang.toUpperCase()
  const isMelPhu = laMelPhu(maHang)
  const laPhuPhi = upper.startsWith('Z') && !upper.startsWith('ZKEO')
  const nhomSP = getNhomSPPolicy(maHang)
  const laKhuyenMai = Number(row.la_khuyen_mai) === 1
  const laThanhLy = Number(row.la_thanh_ly) === 1

  const chiTiet: any = { ma_hang: maHang, nhom_sp: nhomSP, doanh_so: doanhSo, sl }

  if (laPhuPhi || laKhuyenMai || laThanhLy) {
    chiTiet.loai_tru = laPhuPhi ? 'phu_phi' : (laThanhLy ? 'thanh_ly' : 'khuyen_mai')
    chiTiet.ck1 = 0; chiTiet.ck2 = 0; chiTiet.ck3 = 0
    chiTiet.tong_pct = 0; chiTiet.ck_tinh = 0
    chiTiet.giai_thich = 'Phu phi/khuyen mai/thanh ly — loai khoi moi chiet khau'
    return chiTiet
  }

  const kh = resolveKhach(ctx, maKh, thang)
  const doiTuong = kh?.doi_tuong || 'PREMIER'
  const vung = kh?.vung || 'SaiGon'
  const hang = kh?.hang || kh?.loai_op || 'OP1'

  let ck1 = 0, ck3 = 0, ck1Fixed = 0
  let ck1Override = false

  if (isMelPhu) {
    const nhomMau = xacDinhNhomMauLocal(ctx.nhomMauMap, maHang)
    const dsMelRunning = Number(row.ds_mel_running) || 0
    const pct = traL3(ctx, vung, hang, maKh, thang, nhomMau, dsMelRunning)
    ck3 = pct
    chiTiet.nhom_mau = nhomMau
    chiTiet.ck3 = pct
  } else {
    const soCt = String(row.so_ct || '').trim()
    const thungLine = nhomSP === 'CHI_NEP' ? thungCuaDong(maHang, sl) : sl
    const orderSl = nhomSP === 'CHI_NEP' ? (ctx.totalChiThung.get(soCt) || thungLine) : sl
    const dieuKien = xacDinhDieuKien(nhomSP, sl, orderSl, thungLine)
    const rule = findCkOp1Rule(ctx, nhomSP, dieuKien, thang)

    let ovrdMap: Record<string, number> | null = null
    const ovrdRaw = kh?.ck_ct_pct
    if (ovrdRaw) {
      try { const p = JSON.parse(String(ovrdRaw)); if (p && typeof p === 'object') ovrdMap = p as Record<string, number> } catch {}
    }
    const keyNhomBac = `${nhomSP}|${dieuKien}`
    const hasNhomBac = !!(ovrdMap && keyNhomBac in ovrdMap)
    const hasDieuKien = !!(ovrdMap && dieuKien in ovrdMap)
    const hasFlat = !!(ovrdMap && 'flat_pct' in ovrdMap)
    const ovrdRate = ovrdMap
      ? (hasNhomBac ? Number(ovrdMap[keyNhomBac])
        : hasDieuKien ? Number(ovrdMap[dieuKien])
        : hasFlat ? Number(ovrdMap.flat_pct) : null)
      : null
    const isFixedAmountRule = rule?.loai_don_vi === 'fixed_amount'

    if (ovrdRate != null && !isFixedAmountRule) {
      ck1Override = true
      ck1 = ovrdRate
      chiTiet.dieu_kien = dieuKien
      chiTiet.nguon_ck1 = hasNhomBac || hasDieuKien ? 'khach_ovrd' : 'khach_flat'
    } else if (rule) {
      const rate = layRateTheoKH(rule, doiTuong, vung, hang)
      if (rate != null) {
        if (rule.loai_don_vi === 'fixed_amount') {
          ck1Fixed = rate * sl
          chiTiet.ck1_fixed = ck1Fixed
          chiTiet.ck1_don_vi = rule.don_vi_tinh
        } else {
          ck1 = rate
        }
        chiTiet.dieu_kien = dieuKien
      }
    }
    chiTiet.ck1 = ck1
  }

  let ck2 = 0
  const vc = ck1Override ? null : findCkVanChuyen(ctx.ckVanChuyen, doiTuong, vung)
  const khTuLay = Number(kh?.tu_lay) === 1
  if (isMelPhu) {
    if (vc && khTuLay) {
      const nguongCoSo = Number(vc.nguong_kien) || 0
      const doDay = doDayTuMaHang(maHang)
      const nguong = doDay && nguongCoSo > 0 ? Math.round(nguongCoSo * 17 / doDay) : 0
      const soCtVC = String(row.so_ct || '').trim()
      const totalSl = ctx.totalSl.get(soCtVC) || 0
      const duDK = nguong === 0 || totalSl >= nguong
      if (duDK) {
        ck2 = vc.pct_mdf_mel ?? 0
        chiTiet.ck2 = ck2
        chiTiet.ck2_du_dieu_kien = true
      }
    } else if (!khTuLay) {
      chiTiet.ck2 = 0
      chiTiet.ck2_ghi_chu = 'Khach giao hang (khong tu lay) — khong CK van chuyen'
    }
  } else {
    if (vc && doiTuong === 'PREMIER' && khTuLay && vc.pct_khac) {
      ck2 = vc.pct_khac
      chiTiet.ck2 = ck2
    }
  }
  if (ck1Override) {
    chiTiet.ck2_ghi_chu = 'Muc CK rieng khach (da bao gom van chuyen)'
  }

  let kh98 = kh?.ck_ds_98mau_pct
  let khKhac = kh?.ck_ds_khac_pct
  const khVc = kh?.ck_vc_pct
  const bacKey = `${maKh}|${thang}`
  const bacThang = ctx.bacThang.get(bacKey)
  if (bacThang) {
    kh98 = bacThang.pct98
    khKhac = bacThang.pctKhac
  }
  if (isMelPhu && (kh98 != null || khKhac != null)) {
    const nhomMau = chiTiet.nhom_mau || 'khac'
    ck3 = nhomMau === '98_pho_thong' && kh98 != null ? kh98 : (khKhac != null ? khKhac : ck3)
    chiTiet.ck3 = ck3
  }
  if (khVc != null && ck2 > 0 && !ck1Override) {
    ck2 = khVc
    chiTiet.ck2 = ck2
  }

  const tongPct = ck1 + ck2 + ck3
  const ckTinh = Math.round(doanhSo * tongPct + ck1Fixed)

  chiTiet.ck1_pct = ck1
  chiTiet.ck2_pct = ck2
  chiTiet.ck3_pct = ck3
  chiTiet.ck1_fixed = ck1Fixed
  chiTiet.tong_pct = tongPct
  chiTiet.pct_tinh = tongPct * 100
  chiTiet.ck_tinh = ckTinh
  chiTiet.ck_thuc_te = Number(row.ck) || 0
  chiTiet.chenh_lech = ckTinh - (Number(row.ck) || 0)
  chiTiet.pct_thuc_te = (Number(row.ck) || 0) / (doanhSo || 1) * 100
  chiTiet.sai_so = Math.abs(chiTiet.chenh_lech) > 1

  return chiTiet
}

// ─── Build context from raw table data ──────────────────────────
export function buildLop2CtxFromData(tables: {
  soChiTiet: any[]
  khachHang: any[]
  khachTheoThang: any[]
  ckOp1: any[]
  ckOp2: any[]
  op2BacThang: any[]
  policyRules: any[]
  ckVanChuyen: any[]
  nhomMau: any[]
  revenueTiers: any[]
  monthlySummary: any[]
}): Lop2Ctx {
  const coVC = new Set<string>()
  const totalSl = new Map<string, number>()
  const totalSlAll = new Map<string, number>()
  const totalChiThung = new Map<string, number>()
  const bacThang = new Map<string, { pct98: number; pctKhac: number }>()
  const khachMap = new Map<string, any>()
  const khachThangMap = new Map<string, any[]>()
  const nhomMauMap = new Map<string, string>()
  const ckOp1 = new Map<string, any[]>()
  const ckOp2 = new Map<string, any[]>()
  const monthlyDs = new Map<string, number>()

  for (const r of tables.soChiTiet) {
    if (r.ma_hang === 'ZVC') coVC.add(r.so_ct)
  }

  const slBySoCt = new Map<string, number>()
  const slAllBySoCt = new Map<string, number>()
  const chiThungBySoCt = new Map<string, number>()
  for (const r of tables.soChiTiet) {
    const soCt = r.so_ct || ''
    const maHang = String(r.ma_hang || '').toUpperCase()
    const sl = Number(r.sl_ban) || 0
    if (maHang.startsWith('ME') && !maHang.startsWith('MEVE')) {
      slBySoCt.set(soCt, (slBySoCt.get(soCt) || 0) + sl)
    }
    if (!maHang.startsWith('Z')) {
      slAllBySoCt.set(soCt, (slAllBySoCt.get(soCt) || 0) + sl)
    }
    if (maHang.startsWith('CHI') && !maHang.startsWith('CHIA')) {
      const thung = maHang.includes('43-1') ? sl / 5 : sl / 10
      chiThungBySoCt.set(soCt, (chiThungBySoCt.get(soCt) || 0) + thung)
    }
  }
  for (const [k, v] of slBySoCt) totalSl.set(k, v)
  for (const [k, v] of slAllBySoCt) totalSlAll.set(k, v)
  for (const [k, v] of chiThungBySoCt) totalChiThung.set(k, v)

  for (const r of tables.op2BacThang) {
    bacThang.set(`${r.ma_kh}|${r.thang}`, {
      pct98: normPct(r.pct_98mau),
      pctKhac: normPct(r.pct_khac),
    })
  }

  for (const r of tables.khachHang) khachMap.set(String(r.ma_kh), r)

  for (const r of tables.khachTheoThang) {
    const mk = String(r.ma_kh)
    if (!khachThangMap.has(mk)) khachThangMap.set(mk, [])
    khachThangMap.get(mk)!.push(r)
  }
  for (const [, arr] of khachThangMap) {
    arr.sort((a, b) => String(b.thang || '').localeCompare(String(a.thang || '')))
  }

  for (const r of tables.nhomMau) {
    const maHang = String(r.ma_hang || '').toUpperCase()
    const nhom = String(r.nhom_mau || r.nhom || '')
    if (nhom === '98_pho_thong' || nhom === 'khac') nhomMauMap.set(maHang, nhom)
  }

  for (const r of tables.ckOp1) {
    const key = `${r.nhom_sp}|${r.dieu_kien}`
    if (!ckOp1.has(key)) ckOp1.set(key, [])
    ckOp1.get(key)!.push(r)
  }
  for (const [, arr] of ckOp1) {
    arr.sort((a, b) => String(b.thang || '').localeCompare(String(a.thang || '')))
  }

  for (const r of tables.ckOp2) {
    const key = `${r.vung}|${r.bac_tu}`
    if (!ckOp2.has(key)) ckOp2.set(key, [])
    ckOp2.get(key)!.push(r)
  }
  for (const [, arr] of ckOp2) {
    arr.sort((a, b) => String(b.thang || '').localeCompare(String(a.thang || '')))
  }

  const ckOp1Thangs = [...new Set(tables.ckOp1.map(r => String(r.thang || '')))].sort().reverse()

  for (const r of tables.monthlySummary) {
    monthlyDs.set(`${r.ma_kh}|${r.thang}`, Number(r.tong_doanh_so_mel) || 0)
  }

  return {
    coVC, totalSl, totalSlAll, totalChiThung, bacThang,
    khachMap, khachThangMap, policyRules: tables.policyRules,
    ckVanChuyen: tables.ckVanChuyen, nhomMauMap,
    revenueTiers: tables.revenueTiers, monthlyDs,
    ckOp1, ckOp2, ckOp1Thangs,
  }
}
