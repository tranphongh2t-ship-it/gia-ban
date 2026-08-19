import { Hono } from 'hono'
import * as XLSX from 'xlsx'
import { getNhomSPPolicy, laMelPhu } from '../logic/discountLookup'

type Env = { Bindings: { DB: D1Database } }

// ============ Chuẩn hóa ngày ============
// DB lưu ngay dạng 'dd/MM/yyyy'; policy_rules/monthly_summary dùng 'yyyy-MM-dd' / 'yyyy-MM'.

// 'dd/MM/yyyy' -> 'yyyy-MM-dd' (giữ nguyên nếu đã là ISO)
function isoNgay(ngay: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(ngay)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return ngay
}

// 'dd/MM/yyyy' -> 'yyyy-MM'
function thangTuNgay(ngay: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(ngay)
  if (m) return `${m[3]}-${m[2]}`
  const m2 = /^(\d{4})-(\d{2})/.exec(ngay)
  if (m2) return `${m2[1]}-${m2[2]}`
  return ngay.slice(0, 7)
}

// 'yyyy-MM-dd' -> 'dd/MM/yyyy' (dùng cho filter ngày từ frontend)
function isoToDDMMyyyy(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  return iso
}

// Chuẩn hóa % về dạng REAL (0..1): op2_bac_thang nhập lẫn 26 (đơn vị %) và 0.26 (REAL).
function normPct(v: any): number | null {
  const n = Number(v)
  if (isNaN(n) || n === 0) return 0
  return n > 1 ? n / 100 : n
}

// Trích độ dày (mm) từ mã hàng — dùng quy đổi ngưỡng "1 kiện" (Lớp 2).
// Chuẩn 1 kiện ≈ 65 tấm @ 17mm → nguong = 65 * 17 / doDay.
function doDayTuMaHang(maHang: string): number | null {
  const m = /^(?:ME|T|NT|NL|NP|ML|LP|LE|DR|VE|VL|GG|OSB)(\d+(?:\.\d+)?)/i.exec(maHang)
  if (!m) return null
  const d = parseFloat(m[1])
  return d > 0 && d < 100 ? d : null
}

const router = new Hono<Env>()

// ============ NHÓM KHÁCH (5 nhóm) ============
// GET /api/chiet-khau/nhom — danh sách 5 nhóm + đếm khách
router.get('/nhom', async (c) => {
  try {
    const db = c.env.DB
    const { results: nhoms } = await db.prepare(
      `SELECT n.*, (SELECT COUNT(*) FROM danh_sach_khach d WHERE d.nhom = n.key) as so_khach
       FROM khach_nhom n ORDER BY n.stt`
    ).all()
    return c.json({ data: nhoms })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/chiet-khau/khach — danh sách khách theo nhóm
// ?nhom=DL_SAI_GON | all | chua-phan-nhom
router.get('/khach', async (c) => {
  try {
    const db = c.env.DB
    const nhom = c.req.query('nhom') || 'all'
    const search = (c.req.query('search') || '').trim()
    const limit = Math.min(parseInt(c.req.query('limit') || '200'), 1000)
    const offset = parseInt(c.req.query('offset') || '0')

    let where = 'WHERE 1=1'
    const params: any[] = []
    if (nhom === 'chua-phan-nhom') {
      where += ' AND (nhom IS NULL AND (vung IS NULL OR doi_tuong IS NULL))'
    } else if (nhom && nhom !== 'all') {
      where += ' AND nhom = ?'
      params.push(nhom)
    }
    if (search) {
      where += ' AND (ma_kh LIKE ? OR ten_kh LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    const { results: rows } = await db.prepare(
      `SELECT id, ma_kh, ten_kh, loai_op, vung, doi_tuong, hang, nhom, ck_vc_pct, ck_ds_98mau_pct, ck_ds_khac_pct, tu_lay, ghi_chu
       FROM danh_sach_khach ${where} ORDER BY ma_kh LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all()

    // CK vận chuyển động mặc định theo đối tượng/vùng (từ ck_van_chuyen) — chỉ hiển thị, không ghi đè
    const vcRows = (await db.prepare('SELECT doi_tuong, vung, pct_mdf_mel, pct_khac FROM ck_van_chuyen').all()).results as any[]
    const vcMap = new Map<string, any>()
    for (const v of vcRows) {
      const key = `${v.doi_tuong}|${v.vung}`
      if (!vcMap.has(key)) vcMap.set(key, v)
    }
    const vcOf = (doiTuong: string, vung: string) => {
      const v = vcMap.get(`${doiTuong}|${vung}`) || vcMap.get(`${doiTuong}|ALL`)
      return v ? { mel: Number(v.pct_mdf_mel) || 0, khac: Number(v.pct_khac) || 0 } : { mel: 0, khac: 0 }
    }
    const rowsOut = (rows as any[]).map(r => {
      const vc = vcOf(r.doi_tuong || 'PREMIER', r.vung || 'SaiGon')
      return { ...r, ck_vc_mel_dong: vc.mel, ck_vc_khac_dong: vc.khac }
    })

    const { results: cnt } = await db.prepare(
      `SELECT COUNT(*) as total FROM danh_sach_khach ${where}`
    ).bind(...params).all()

    return c.json({ data: rowsOut, total: (cnt as any)?.[0]?.total || 0, limit, offset })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/chiet-khau/khach/:id — cập nhật phân nhóm + mức CK của 1 khách
router.patch('/khach/:id', async (c) => {
  try {
    const db = c.env.DB
    const id = parseInt(c.req.param('id'))
    const body = await c.req.json() as any

    const sets: string[] = []
    const vals: any[] = []
    const numericCols = ['ck_vc_pct', 'ck_ds_98mau_pct', 'ck_ds_khac_pct', 'tu_lay']
    for (const k of ['nhom', 'vung', 'doi_tuong', 'hang', 'loai_op', 'ghi_chu']) {
      if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(body[k]) }
    }
    for (const k of numericCols) {
      if (body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(k === 'tu_lay' ? (body[k] ? 1 : 0) : (body[k] === '' ? null : Number(body[k]))) }
    }
    if (sets.length === 0) return c.json({ error: 'Không có gì để cập nhật' }, 400)

    // Tự suy nhom nếu chỉ set vung/doi_tuong/hang
    if (body.nhom === undefined) {
      const cur = await db.prepare('SELECT vung, doi_tuong, hang FROM danh_sach_khach WHERE id = ?').bind(id).first() as any
      const vung = body.vung ?? cur?.vung
      const doiTuong = body.doi_tuong ?? cur?.doi_tuong
      const hang = body.hang ?? cur?.hang
      const nhom = suyNhom(vung, doiTuong, hang)
      if (nhom) { sets.push('nhom = ?'); vals.push(nhom) }
    }

    vals.push(id)
    await db.prepare(`UPDATE danh_sach_khach SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run()
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/chiet-khau/khach/phan-loat — gán nhóm hàng loạt theo danh sách id
router.post('/khach/phan-loat', async (c) => {
  try {
    const db = c.env.DB
    const { ids, nhom } = await c.req.json() as any
    if (!Array.isArray(ids) || ids.length === 0 || !nhom) return c.json({ error: 'Thiếu ids hoặc nhom' }, 400)
    const n = await db.prepare('SELECT * FROM khach_nhom WHERE key = ?').bind(nhom).first() as any
    if (!n) return c.json({ error: 'Nhóm không tồn tại' }, 404)

    const stmts = ids.map((id: number) =>
      db.prepare(`UPDATE danh_sach_khach SET nhom = ?, vung = ?, doi_tuong = ?, hang = COALESCE(hang, 'OP1') WHERE id = ?`)
        .bind(nhom, n.vung || null, n.doi_tuong, id)
    )
    await db.batch(stmts)
    return c.json({ success: true, count: ids.length })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

function suyNhom(vung?: string, doiTuong?: string, hang?: string): string | null {
  if (doiTuong === 'PREMIER') {
    if (vung === 'Tinh') return 'DL_TINH'
    if (vung === 'NgoaiThanh') return 'DL_NGOAI_THANH'
    if (vung === 'SaiGon') return 'DL_SAI_GON'
  }
  if (doiTuong === 'PREMIUM') {
    return hang === 'Premium' ? 'XUONG_PREMIUM' : 'XUONG_THUONG'
  }
  return null
}

// ============ TÍNH CHIẾT KHẤU 5 LỚP ============
// GET /api/chiet-khau/doi-chieu — đối chiếu so_chi_tiet_ban_hang: ck (thực tế) vs ck_tinh (5 lớp) + %
// ?limit=&offset=&nhom=&search=&ngay_tu=&ngay_den=&sai_so=0|1  (0=đúng, 1=sai, bỏ= tất cả)
router.get('/doi-chieu', async (c) => {
  try {
    const db = c.env.DB
    const limit = Math.min(parseInt(c.req.query('limit') || '200'), 2000)
    const offset = parseInt(c.req.query('offset') || '0')
    const search = (c.req.query('search') || '').trim()
    const ngayTu = c.req.query('ngay_tu') || ''
    const ngayDen = c.req.query('ngay_den') || ''
    const saiSo = c.req.query('sai_so') || ''

    let where = 'WHERE 1=1'
    const params: any[] = []
    if (search) { where += ' AND (t.ma_kh LIKE ? OR t.ten_kh LIKE ? OR t.ma_hang LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
    if (ngayTu) { where += ' AND t.ngay >= ?'; params.push(isoToDDMMyyyy(ngayTu)) }
    if (ngayDen) { where += ' AND t.ngay <= ?'; params.push(isoToDDMMyyyy(ngayDen)) }
    // Bộ lọc đúng/sai dựa trên ck_tinh (đã được /tinh-het ghi lại), loại trừ phụ phí/khuyến mãi/thanh lý như engine
    if (saiSo === '1' || saiSo === '0') {
      where += ' AND (t.ma_hang NOT LIKE \'Z%\' OR t.ma_hang LIKE \'ZKEO%\')'
      where += ' AND COALESCE(t.la_khuyen_mai,0) = 0 AND COALESCE(t.la_thanh_ly,0) = 0'
      where += saiSo === '1'
        ? ' AND ABS(t.ck - COALESCE(t.ck_tinh, 0)) > 1'
        : ' AND ABS(t.ck - COALESCE(t.ck_tinh, 0)) <= 1'
    }

    const { results: rows } = await db.prepare(
      `SELECT t.*, (t.ck / NULLIF(t.doanh_so, 0)) * 100 AS pct_thuc_te,
              d.vung, d.doi_tuong, d.nhom, d.hang, d.tu_lay
       FROM so_chi_tiet_ban_hang t
       LEFT JOIN danh_sach_khach d ON d.ma_kh = t.ma_kh
       ${where}
       ORDER BY t.id DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all()

    const { results: cnt } = await db.prepare(
      `SELECT COUNT(*) as total FROM so_chi_tiet_ban_hang t ${where}`
    ).bind(...params).all()

    // Tính ck_tinh cho từng dòng (batch, theo công thức 5 lớp)
    const ctx = await buildLop2Ctx(db)
    const rowsOut: any[] = []
    for (const row of rows as any[]) {
      const tinh = await tinhCKChoDong(db, row, ctx)
      rowsOut.push({ ...row, ...tinh })
    }

    return c.json({ data: rowsOut, total: (cnt as any)?.[0]?.total || 0, limit, offset })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/chiet-khau/thong-ke — thống kê tổng đối chiếu (toàn bộ dữ liệu, dùng ck_tinh đã ghi bởi /tinh-het)
// Trả về tổng dòng đối chiếu, số đúng, số sai, tổng chênh lệch + tỷ lệ pass. Loại trừ phụ phí/khuyến mãi/thanh lý như engine.
router.get('/thong-ke', async (c) => {
  try {
    const db = c.env.DB
    const where = `WHERE (t.ma_hang NOT LIKE 'Z%' OR t.ma_hang LIKE 'ZKEO%')
                   AND COALESCE(t.la_khuyen_mai,0) = 0 AND COALESCE(t.la_thanh_ly,0) = 0`
    const { results: rows } = await db.prepare(
      `SELECT COUNT(*) AS tong,
              SUM(CASE WHEN ABS(t.ck - COALESCE(t.ck_tinh,0)) <= 1 THEN 1 ELSE 0 END) AS dung,
              SUM(CASE WHEN ABS(t.ck - COALESCE(t.ck_tinh,0)) > 1 THEN 1 ELSE 0 END) AS sai,
              SUM(ABS(t.ck - COALESCE(t.ck_tinh,0))) AS sai_lech
       FROM so_chi_tiet_ban_hang t ${where}`
    ).all()
    const r = (rows as any)?.[0] || {}
    const tong = Number(r.tong) || 0
    const dung = Number(r.dung) || 0
    const sai = Number(r.sai) || 0
    return c.json({ tong, dung, sai, sai_lech: Number(r.sai_lech) || 0, pass_pct: tong > 0 ? Math.round(dung / tong * 10000) / 100 : 0 })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/chiet-khau/tinh-ck — tính CK cho 1 dòng đơn hàng (test)
// Body: { thang:'YYYY-MM', ma_kh, ma_hang, sl, don_gia, hinh_thuc_giao?, nhom_mau? }
router.post('/tinh-ck', async (c) => {
  try {
    const body = await c.req.json() as any
    const thang = String(body.thang || '').trim()
    const maKh = String(body.ma_kh || '').trim()
    const maHang = String(body.ma_hang || '').trim()
    const sl = Number(body.sl) || 0
    const donGia = Number(body.don_gia) || 0
    if (!/^\d{4}-\d{2}$/.test(thang) || !maKh || !maHang) {
      return c.json({ error: 'Cần thang (YYYY-MM), ma_kh, ma_hang' }, 400)
    }

    const row = {
      ngay: `${thang}-01`,
      so_ct: 'TEST',
      ma_kh: maKh,
      ten_kh: '',
      ma_hang: maHang,
      ten_hang: body.ten_hang || '',
      sl_ban: sl,
      don_gia: donGia,
      doanh_so: sl * donGia,
      ck: Number(body.ck) || 0,
      hinh_thuc_giao: body.hinh_thuc_giao || '',
    }

    const ctx = await buildLop2Ctx(c.env.DB)
    const tinh = await tinhCKChoDong(c.env.DB, row, ctx)
    return c.json({ input: { thang, ma_kh: maKh, ma_hang: maHang, sl, donGia }, ...tinh })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/chiet-khau/tinh-luy-tien — tính doanh số Mel lũy tiến (tại thời điểm giao dịch)
// cho bậc OP2 (lũy tiến theo doanh số tháng, không phải tổng cuối tháng).
router.post('/tinh-luy-tien', async (c) => {
  try {
    const db = c.env.DB
    const { results: rows } = await db.prepare(
      `SELECT id, ma_kh, ngay, ma_hang, doanh_so, gt_tra, gt_giam
       FROM so_chi_tiet_ban_hang
       ORDER BY ma_kh, SUBSTR(ngay,7,4) || SUBSTR(ngay,4,2) || SUBSTR(ngay,1,2), id`
    ).all()

    const running = new Map<string, number>()
    const stmts: D1PreparedStatement[] = []
    for (const r of rows as any[]) {
      const maKh = String(r.ma_kh || '')
      const ngay = String(r.ngay || '')
      const yyyymm = ngay.length >= 10 ? `${ngay.slice(6, 10)}-${ngay.slice(3, 5)}` : ''
      const key = `${maKh}|${yyyymm}`
      const ma = String(r.ma_hang || '')
      const isMel = ma.startsWith('ME') && !ma.startsWith('MEVE') && !ma.startsWith('MEOK') && !ma.startsWith('MEGG') && !ma.startsWith('MEVN')
      const ds = Number(r.doanh_so || 0) - Number(r.gt_tra || 0) - Number(r.gt_giam || 0)
      if (isMel && ds > 0) {
        const cur = (running.get(key) || 0) + ds
        running.set(key, cur)
        stmts.push(db.prepare(`UPDATE so_chi_tiet_ban_hang SET ds_mel_running = ? WHERE id = ?`).bind(cur, r.id))
      }
    }

    const BATCH = 100
    for (let i = 0; i < stmts.length; i += BATCH) {
      await db.batch(stmts.slice(i, i + BATCH))
    }
    return c.json({ success: true, so_dong: stmts.length })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/chiet-khau/tinh-het — tính & ghi ck_tinh / ck_tinh_pct / ck_tinh_detail cho MỌI dòng
// (cần để bộ lọc đúng/sai ở /doi-chieu dùng kết quả engine mới nhất, không phải cột cũ)
router.post('/tinh-het', async (c) => {
  try {
    const db = c.env.DB
    const { results: rows } = await db.prepare(
      `SELECT id, so_ct, ma_kh, ngay, ma_hang, sl_ban, don_gia, doanh_so, ck, hinh_thuc_giao, la_khuyen_mai, la_thanh_ly, ds_mel_running
       FROM so_chi_tiet_ban_hang`
    ).all()
    const ctx = await buildLop2Ctx(db)
    const stmts: D1PreparedStatement[] = []
    for (const r of (rows as any[])) {
      const tinh = await tinhCKChoDong(db, r, ctx)
      stmts.push(db.prepare(
        `UPDATE so_chi_tiet_ban_hang SET ck_tinh = ?, ck_tinh_pct = ?, ck_tinh_detail = ? WHERE id = ?`
      ).bind(
        tinh.ck_tinh ?? 0,
        tinh.pct_tinh ?? 0,
        JSON.stringify({ loai_tru: tinh.loai_tru || null, nhom_sp: tinh.nhom_sp || null, dieu_kien: tinh.dieu_kien || null, nhom_mau: tinh.nhom_mau || null, ck1: tinh.ck1, ck2: tinh.ck2, ck3: tinh.ck3, tong_pct: tinh.tong_pct, giai_thich: tinh.giai_thich || null }),
        r.id
      ))
    }
    const BATCH = 100
    for (let i = 0; i < stmts.length; i += BATCH) {
      await db.batch(stmts.slice(i, i + BATCH))
    }
    return c.json({ success: true, so_dong: stmts.length })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ---------- Lõi: tính CK 5 lớp cho 1 dòng ----------
export type DongBan = any

// Ngữ cảnh Lớp 2 + bậc OP2 theo tháng + lookup tables (preload 1 lần tránh N+1 query)
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

export async function buildLop2Ctx(db: D1Database): Promise<Lop2Ctx> {
  const coVC = new Set<string>()
  const totalSl = new Map<string, number>()
  const totalSlAll = new Map<string, number>()
  const totalChiThung = new Map<string, number>()
  const bacThang = new Map<string, { pct98: number; pctKhac: number }>()
  const zvc = await db.prepare(
    `SELECT DISTINCT so_ct FROM so_chi_tiet_ban_hang WHERE ma_hang = 'ZVC'`
  ).all()
  for (const r of zvc.results as any[]) coVC.add(r.so_ct)
  const tot = await db.prepare(
    `SELECT so_ct, SUM(sl_ban) AS t FROM so_chi_tiet_ban_hang
     WHERE ma_hang LIKE 'ME%' AND ma_hang NOT LIKE 'MEVE%' AND ma_hang NOT LIKE 'MEOK%'
       AND ma_hang NOT LIKE 'MEGG%' AND ma_hang NOT LIKE 'MEVN%'
     GROUP BY so_ct`
  ).all()
  for (const r of tot.results as any[]) totalSl.set(r.so_ct, Number(r.t) || 0)
  // Tổng số lượng TẤT CẢ hàng (không phụ phí) theo đơn — dùng nhận diện "xe tới lấy hàng > 2 tấn" (≈ ≥ 65 tấm ván quy đổi 17mm)
  const totAll = await db.prepare(
    `SELECT so_ct, SUM(sl_ban) AS t FROM so_chi_tiet_ban_hang
     WHERE ma_hang NOT LIKE 'Z%' GROUP BY so_ct`
  ).all()
  for (const r of totAll.results as any[]) totalSlAll.set(r.so_ct, Number(r.t) || 0)
  // Tổng thùng chỉ nẹp theo đơn: khổ 21 = 10 cuộn/thùng, khổ 43 = 5 cuộn/thùng (21/43 là khổ, xác nhận 08/2026)
  const totChi = await db.prepare(
    `SELECT so_ct, SUM(
       CASE WHEN ma_hang LIKE '%43-1%' THEN sl_ban / 5.0
            WHEN ma_hang LIKE '%21-1%' THEN sl_ban / 10.0
            ELSE sl_ban / 10.0 END
     ) AS t FROM so_chi_tiet_ban_hang
     WHERE ma_hang LIKE 'CHI%' AND ma_hang NOT LIKE 'CHIA%'
     GROUP BY so_ct`
  ).all()
  for (const r of totChi.results as any[]) totalChiThung.set(r.so_ct, Number(r.t) || 0)
  const bac = await db.prepare(`SELECT ma_kh, thang, pct_98mau, pct_khac FROM op2_bac_thang`).all()
  for (const r of bac.results as any[]) {
    bacThang.set(`${r.ma_kh}|${r.thang}`, { pct98: normPct(r.pct_98mau) ?? 0, pctKhac: normPct(r.pct_khac) ?? 0 })
  }

  // Preload toàn bộ lookup (thay thế query theo từng dòng → giảm N+1)
  const khachMap = new Map<string, any>()
  const khachRows = await db.prepare('SELECT * FROM danh_sach_khach').all()
  for (const r of khachRows.results as any[]) khachMap.set(String(r.ma_kh), r)

  // Khách theo tháng (khach_theo_thang) — override các thuộc tính theo tháng, fallback danh_sach_khach
  const khachThangMap = new Map<string, any[]>()
  const khachThangRows = await db.prepare(
    `SELECT ma_kh, thang, loai_op, vung, doi_tuong, hang, nhom, tu_lay,
            ck_vc_pct, ck_ds_98mau_pct, ck_ds_khac_pct, ck_ct_pct
     FROM khach_theo_thang ORDER BY ma_kh, thang DESC`
  ).all()
  for (const r of khachThangRows.results as any[]) {
    const key = String(r.ma_kh)
    if (!khachThangMap.has(key)) khachThangMap.set(key, [])
    khachThangMap.get(key)!.push(r)
  }

  const policyRules = (await db.prepare('SELECT * FROM policy_rules').all()).results as any[]

  const ckVanChuyen = (await db.prepare('SELECT * FROM ck_van_chuyen').all()).results as any[]

  const nhomMauMap = new Map<string, string>()
  const nhomMauRows = await db.prepare('SELECT ma_hang, nhom_mau FROM ma_hang_nhom_mau').all()
  for (const r of nhomMauRows.results as any[]) nhomMauMap.set(String(r.ma_hang).toUpperCase(), String(r.nhom_mau))

  const revenueTiers = (await db.prepare('SELECT * FROM policy_revenue_tiers').all()).results as any[]

  const monthlyDs = new Map<string, number>()
  const monthlyRows = await db.prepare('SELECT ma_kh, thang, ds_mel_thang FROM monthly_summary').all()
  for (const r of monthlyRows.results as any[]) monthlyDs.set(`${r.ma_kh}|${r.thang}`, Number(r.ds_mel_thang) || 0)

  const ckOp1 = new Map<string, any[]>()
  const ckOp1Rows = await db.prepare('SELECT * FROM ck_op1 ORDER BY thang DESC, id').all()
  const ckOp1ThangsSet = new Set<string>()
  for (const r of ckOp1Rows.results as any[]) {
    const key = `${r.nhom_sp}|${r.dieu_kien}`
    if (!ckOp1.has(key)) ckOp1.set(key, [])
    ckOp1.get(key)!.push(r)
    ckOp1ThangsSet.add(String(r.thang))
  }
  const ckOp1Thangs = [...ckOp1ThangsSet].sort().reverse()

  const ckOp2 = new Map<string, any[]>()
  const ckOp2Rows = await db.prepare('SELECT * FROM ck_op2').all()
  for (const r of ckOp2Rows.results as any[]) {
    const key = `${r.vung}|${Number(r.bac_tu) || 0}`
    if (!ckOp2.has(key)) ckOp2.set(key, [])
    ckOp2.get(key)!.push(r)
  }
  for (const arr of ckOp2.values()) arr.sort((a, b) => String(b.thang).localeCompare(String(a.thang)))

  return { coVC, totalSl, totalSlAll, totalChiThung, bacThang, khachMap, khachThangMap, policyRules, ckVanChuyen, nhomMauMap, revenueTiers, monthlyDs, ckOp1, ckOp2, ckOp1Thangs }
}

// Khách theo tháng: overlay bản khach_theo_thang có thang <= tháng dòng lên nền danh_sach_khach
// (rows đã ORDER BY thang DESC → dòng đầu tiên thỏa thang <= thang dòng là hợp lệ).
function resolveKhach(ctx: Lop2Ctx | undefined, maKh: string, thang: string): any | null {
  const cur = ctx?.khachMap.get(maKh) || null
  const rows = ctx?.khachThangMap.get(maKh) || null
  if (!rows || rows.length === 0) return cur
  for (const r of rows) {
    if (String(r.thang || '') <= thang) return cur ? mergeKhachTheoThang(cur, r) : r
  }
  return cur
}

// Merge override (chỉ cột khác NULL/undefined mới ghi đè) — tránh NULL làm mất giá trị nền
function mergeKhachTheoThang(base: any, ov: any): any {
  const out = { ...base }
  if (ov) {
    for (const k of Object.keys(ov)) {
      if (ov[k] !== null && ov[k] !== undefined) out[k] = ov[k]
    }
  }
  return out
}

export async function tinhCKChoDong(db: D1Database, row: DongBan, ctx?: Lop2Ctx) {
  const maHang = String(row.ma_hang || '')
  const maKh = String(row.ma_kh || '')
  const ngay = String(row.ngay || '')
  const ngayISO = isoNgay(ngay)
  const doanhSo = Number(row.doanh_so) || (Number(row.sl_ban) || 0) * (Number(row.don_gia) || 0)
  const sl = Number(row.sl_ban) || 0
  const thang = thangTuNgay(ngay)

  // Phân loại mã hàng theo đặc tả: ME=Mel phủ, CHI=chỉ nẹp, Z*=phụ phí
  const upper = maHang.toUpperCase()
  const isMelPhu = laMelPhu(maHang)
  // Mọi mã Z* là phụ phí (bao bì, vận chuyển, điều chỉnh...), trừ ZKEO (keo)
  const laPhuPhi = upper.startsWith('Z') && !upper.startsWith('ZKEO')
  const nhomSP = getNhomSPPolicy(maHang)
  const laKhuyenMai = Number(row.la_khuyen_mai) === 1
  const laThanhLy = Number(row.la_thanh_ly) === 1

  const chiTiet: any = { ma_hang: maHang, nhom_sp: nhomSP, doanh_so: doanhSo, sl }

  // Loại trừ phụ phí / khuyến mãi / thanh lý: không chịu CK, không tính doanh số CK
  if (laPhuPhi || laKhuyenMai || laThanhLy) {
    chiTiet.loai_tru = laPhuPhi ? 'phu_phi' : (laThanhLy ? 'thanh_ly' : 'khuyen_mai')
    chiTiet.ck1 = 0; chiTiet.ck2 = 0; chiTiet.ck3 = 0
    chiTiet.tong_pct = 0; chiTiet.ck_tinh = 0
    chiTiet.giai_thich = 'Phụ phí/khuyến mãi/thanh lý — loại trừ khỏi mọi chiết khấu'
    return chiTiet
  }

  // Tra khách hàng: vùng/đối tượng/hạng + mức CK riêng (từ preload map, version theo tháng)
  const kh = ctx ? resolveKhach(ctx, maKh, thang) : null

  const doiTuong = kh?.doi_tuong || 'PREMIER'
  const vung = kh?.vung || 'SaiGon'
  const hang = kh?.hang || kh?.loai_op || 'OP1'

  // ---------- Lớp 1 HOẶC Lớp 3 (thay thế nhau) ----------
  let ck1 = 0, ck3 = 0, ck1Fixed = 0
  let ck1Override = false

  if (isMelPhu) {
    // Lớp 3: CK doanh số Melamine theo nhóm màu + OP1/OP2
    const nhomMau = await xacDinhNhomMau(db, ctx, maHang)
    const dsMelRunning = Number(row.ds_mel_running) || 0
    const pct = traL3(ctx, vung, hang, maKh, thang, nhomMau, dsMelRunning)
    ck3 = pct
    chiTiet.nhom_mau = nhomMau
    chiTiet.ck3 = pct
  } else {
    // Lớp 1: CK theo bảng ck_op1 (Bảng chiết khấu theo tháng)
    const soCt = String(row.so_ct || '').trim()
    // Chỉ nẹp: bậc 1_thung theo thùng của DÒNG (khổ 21=10 cuộn, 43=5 cuộn), bậc 10/100_thung theo tổng thùng cả ĐƠN
    const thungLine = nhomSP === 'CHI_NEP' ? thungCuaDong(maHang, sl) : sl
    const orderSl = nhomSP === 'CHI_NEP' ? (ctx?.totalChiThung.get(soCt) || thungLine) : sl
    const dieuKien = xacDinhDieuKien(nhomSP, sl, orderSl, thungLine)
    // Lớp 1 đọc theo tháng: ưu tiên rule đúng tháng, fallback tháng gần nhất <= tháng dòng
    const rule = ctx ? findCkOp1Rule(ctx, nhomSP, dieuKien, thang) : null

    // Mức CK riêng của khách (cột ck_ct_pct, JSON) — ưu tiên cao nhất, thay thế toàn bộ Lớp 1:
    //   "<nhomSP>|<dieuKien>" -> mức riêng cho nhóm + bậc (vd "CHI_NEP|1_thung")
    //   "<dieuKien>"          -> mức riêng theo bậc, áp cho mọi nhóm Lớp 1 (vd "1_thung", "co_don")
    //   "flat_pct"            -> mức cố định áp cho mọi nhóm Lớp 1
    // Giá trị đã là mức CUỐI CÙNG (đã bao gồm vận chuyển) nên không cộng thêm Lớp 2.
    let ovrdMap: Record<string, number> | null = null
    const ovrdRaw = kh?.ck_ct_pct
    if (ovrdRaw) {
      try {
        const p = JSON.parse(String(ovrdRaw))
        if (p && typeof p === 'object') ovrdMap = p as Record<string, number>
      } catch { /* bỏ qua JSON lỗi */ }
    }
    const keyNhomBac = `${nhomSP}|${dieuKien}`
    const hasNhomBac = !!(ovrdMap && keyNhomBac in ovrdMap)
    const hasDieuKien = !!(ovrdMap && dieuKien in ovrdMap)
    const hasFlat = !!(ovrdMap && 'flat_pct' in ovrdMap)
    const ovrdRate = ovrdMap
      ? (hasNhomBac ? Number(ovrdMap[keyNhomBac])
        : hasDieuKien ? Number(ovrdMap[dieuKien])
        : hasFlat ? Number(ovrdMap.flat_pct)
        : null)
      : null
    const isFixedAmountRule = rule?.loai_don_vi === 'fixed_amount'

    if (ovrdRate != null && !isFixedAmountRule) {
      ck1Override = true
      ck1 = ovrdRate
      chiTiet.dieu_kien = dieuKien
      chiTiet.rule = null
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
        chiTiet.rule = { thang: rule.thang, nhom_sp: nhomSP, dieu_kien: dieuKien, loai_don_vi: rule.loai_don_vi, don_vi_tinh: rule.don_vi_tinh, dl_tinh: rule.dl_tinh, dl_nt: rule.dl_nt, dl_sg: rule.dl_sg, xuong_thuong: rule.xuong_thuong, xuong_premium: rule.xuong_premium }
      }
    }
    chiTiet.ck1 = ck1
  }

  // ---------- Lớp 2: CK vận chuyển (theo BẢNG TỔNG HỢP OP1) ----------
  // MDF/Okal phủ Mel: Tinh 4% (luôn), NT/SG/Xưởng 1% (≥1 kiện).
  // Hàng còn lại (chỉ nẹp, ván trơn, keo...): 1% khi khách TỰ LẤY tại kho.
  //   Dữ kiện 08/2026: khách tự cho xe tới lấy hàng (SG) cũng hưởng 1% — được đánh dấu bằng cờ tu_lay=1.
  let ck2 = 0
  // Mức CK riêng khách đã bao gồm vận chuyển -> không cộng thêm Lớp 2
  const vc = ck1Override ? null : findCkVanChuyen(ctx?.ckVanChuyen, doiTuong, vung)
  const khTuLay = Number(kh?.tu_lay) === 1
  if (isMelPhu) {
    if (vc && khTuLay) {
      const nguongCoSo = Number(vc.nguong_kien) || 0
      const doDay = doDayTuMaHang(maHang)
      const nguong = doDay && nguongCoSo > 0 ? Math.round(nguongCoSo * 17 / doDay) : 0
      const soCtVC = String(row.so_ct || '').trim()
      const totalSl = ctx ? (ctx.totalSl.get(soCtVC) || 0) : sl
      const duDK = nguong === 0 || totalSl >= nguong
      if (duDK) {
        ck2 = vc.pct_mdf_mel ?? 0
        chiTiet.ck2 = ck2
        chiTiet.ck2_du_dieu_kien = true
      } else {
        chiTiet.ck2_du_dieu_kien = false
        chiTiet.ck2_ghi_chu = `Chưa đủ ${nguong} tấm (1 kiện)`
      }
    } else if (!khTuLay) {
      chiTiet.ck2 = 0
      chiTiet.ck2_ghi_chu = 'Khách giao hàng (không tự lấy) — không CK vận chuyển'
    }
  } else {
    // Hàng còn lại: CK vận chuyển 1% (tự lấy) — theo cờ tu_lay của từng khách
    if (vc && doiTuong === 'PREMIER' && khTuLay && vc.pct_khac) {
      ck2 = vc.pct_khac
      chiTiet.ck2 = ck2
      chiTiet.nguon_ck2 = 'khach_tu_lay'
    }
  }
  if (ck1Override) {
    chiTiet.ck2_ghi_chu = 'Mức CK riêng khách (đã bao gồm vận chuyển)'
  }

  // Ưu tiên mức CK riêng của khách (nếu có gán tay) + bậc OP2 theo tháng
  let kh98 = kh?.ck_ds_98mau_pct
  let khKhac = kh?.ck_ds_khac_pct
  const khVc = kh?.ck_vc_pct
  const bacKey = `${maKh}|${thang}`
  const bacThang = ctx?.bacThang.get(bacKey)
  if (bacThang) {
    kh98 = bacThang.pct98
    khKhac = bacThang.pctKhac
  }
  if (isMelPhu && (kh98 != null || khKhac != null)) {
    const nhomMau = chiTiet.nhom_mau || 'khac'
    ck3 = nhomMau === '98_pho_thong' && kh98 != null ? kh98 : (khKhac != null ? khKhac : ck3)
    chiTiet.ck3 = ck3
    chiTiet.nguon_ck3 = bacThang ? 'op2_bac_thang' : 'khach'
  }
  if (khVc != null && ck2 > 0 && !ck1Override) {
    ck2 = khVc
    chiTiet.ck2 = ck2
    chiTiet.nguon_ck2 = 'khach'
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

// Tìm rule Lớp 1 theo tháng: tháng khớp nhất <= thang dòng (fallback tháng nhỏ nhất)
function findCkOp1Rule(ctx: Lop2Ctx, nhomSp: string, dieuKien: string, thang: string): any | null {
  const rows = ctx.ckOp1.get(`${nhomSp}|${dieuKien}`)
  if (!rows || rows.length === 0) return null
  // rows đã ORDER BY thang DESC → dòng đầu tiên có thang <= thang dòng là hợp lệ
  for (const r of rows) {
    const rt = String(r.thang || '')
    if (!rt || rt <= thang) return r
  }
  return rows[rows.length - 1]
}

// Tìm rule Lớp 1 trong policy_rules (đã preload) — mirror SQL:
// WHERE nhom_sp=?, doi_tuong=?, (tu_ngay IS NULL OR <= ngay), (den_ngay IS NULL OR >= ngay)
// ORDER BY (tu_ngay IS NULL) ASC, tu_ngay DESC LIMIT 1
function findPolicyRule(rules: any[] | undefined, nhomSp: string, doiTuong: string, ngayISO: string): any | null {
  if (!rules) return null
  let bestNonNull: any = null
  let bestNull: any = null
  for (const r of rules) {
    if (r.nhom_sp !== nhomSp || r.doi_tuong !== doiTuong) continue
    if (r.tu_ngay && r.tu_ngay > ngayISO) continue
    if (r.den_ngay && r.den_ngay < ngayISO) continue
    if (r.tu_ngay) {
      if (!bestNonNull || r.tu_ngay > bestNonNull.tu_ngay) bestNonNull = r
    } else {
      if (!bestNull) bestNull = r
    }
  }
  return bestNonNull || bestNull
}

// Tìm CK vận chuyển (đã preload) — mirror SQL:
// WHERE doi_tuong=? AND (vung=? OR 'ALL') ORDER BY (vung='ALL') ASC LIMIT 1
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

// Số thùng của một dòng chỉ nẹp: khổ 21 = 10 cuộn/thùng, khổ 43 = 5 cuộn/thùng; mã khác mặc định 10 cuộn/thùng
function thungCuaDong(maHang: string, sl: number): number {
  const u = String(maHang || '').toUpperCase()
  if (u.includes('43-1')) return sl / 5
  return sl / 10
}

// Xác định điều kiện (dieu_kien) của bảng ck_op1 dựa trên nhóm SP + số lượng
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
      // 10/100_thung theo tổng thùng cả đơn; 1_thung khi dòng tự đạt 1 thùng (khổ 21=10 cuộn, 43=5 cuộn)
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

// Lấy mức CK theo loại khách (doiTuong + vung + hang)
function layRateTheoKH(rule: any, doiTuong: string, vung: string, hang: string): number | null {
  if (doiTuong === 'PREMIER') {
    if (vung === 'Tinh') return rule.dl_tinh ?? null
    if (vung === 'NgoaiThanh') return rule.dl_nt ?? null
    return rule.dl_sg ?? null
  }
  if (hang === 'Premium') return rule.xuong_premium ?? null
  return rule.xuong_thuong ?? null
}

// Xác định nhóm màu: 98 phổ thông hay khác
// Ưu tiên tra bảng map mã hàng (từ reverse-engineering); không có mới parse + tra bang_gia_chuan_98_mau.
async function xacDinhNhomMau(db: D1Database, ctx: Lop2Ctx | undefined, maHang: string): Promise<'98_pho_thong' | 'khac'> {
  const upper = maHang.toUpperCase()
  const mapped = ctx?.nhomMauMap.get(upper)
  if (mapped) return mapped as '98_pho_thong' | 'khac'

  // Fallback: mã dạng ME + độ dày + [lõi] + mã màu số.
  const mm = /^ME\d+(?:\.\d+)?[A-Z]*(\d{3,4})/.exec(upper)
  if (!mm) return 'khac'
  const code = mm[1]
  const found = await db.prepare(
    `SELECT 1 FROM bang_gia_chuan_98_mau
     WHERE color_code = ? OR wood_1 = ? OR wood_2 = ? OR wood_3 = ? OR wood_4 = ?
        OR wood_5 = ? OR wood_6 = ? OR wood_7 = ? OR art = ?
        OR color_name LIKE '%' || ? || '%'
     LIMIT 1`
  ).bind(code, code, code, code, code, code, code, code, code, code).first()
  return found ? '98_pho_thong' : 'khac'
}

// Tra Lớp 3: OP1 mức chung / OP2 theo bậc doanh số tháng (lũy tiến tại thời điểm giao dịch)
function traL3(ctx: Lop2Ctx | undefined, vung: string, hang: string, maKh: string, thang: string, nhomMau: '98_pho_thong' | 'khac', dsMelRunning = 0): number {
  const col = nhomMau === '98_pho_thong' ? 'pct_98mau' : 'pct_khac'
  const tiers = ctx?.revenueTiers || []

  // OP2: theo bậc doanh số lũy tiến (ưu tiên ds_mel_running của dòng; fallback monthly_summary)
  if (hang === 'OP2') {
    let ds = dsMelRunning
    if (!ds) ds = ctx?.monthlyDs.get(`${maKh}|${thang}`) || 0
    // Bảng OP2 theo tháng (ck_op2): tháng gần nhất <= thang
    const op2Tiers = ctx?.ckOp2 || new Map()
    let bestCk2: any = null
    for (const [key, arr] of op2Tiers) {
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

  // OP1 / Thuong / Premium: mức chung — mirror SQL:
  // WHERE hang=? AND (vung=? OR vung IS NULL) AND bac_tu=0 ORDER BY (vung IS NULL) ASC LIMIT 1
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

// ============ TỔNG HỢP DOANH SỐ THEO THÁNG (Lớp 4 + 5) ============
// POST /api/chiet-khau/chot-thang — tính monthly_summary cho 1 tháng
router.post('/chot-thang', async (c) => {
  try {
    const db = c.env.DB
    const thang = String((await c.req.json() as any).thang || '').trim()
    if (!/^\d{4}-\d{2}$/.test(thang)) return c.json({ error: 'thang phải YYYY-MM' }, 400)
    const nam = parseInt(thang.slice(0, 4))
    const thangSo = parseInt(thang.slice(5, 7))

    // Doanh số Mel phủ theo tháng/khách (loại trừ phụ phí, hàng trả/giam giá, khuyến mãi/thanh lý)
    const { results: rows } = await db.prepare(
      `SELECT t.ma_kh,
              SUM(t.doanh_so - t.gt_tra - t.gt_giam) AS ds_mel
       FROM so_chi_tiet_ban_hang t
       WHERE t.ma_hang LIKE 'ME%' AND t.ma_hang NOT LIKE 'MEVE%'
         AND t.ma_hang NOT LIKE 'MEOK%' AND t.ma_hang NOT LIKE 'MEGG%'
         AND COALESCE(t.la_khuyen_mai,0) = 0 AND COALESCE(t.la_thanh_ly,0) = 0
         AND CAST(SUBSTR(t.ngay, 7, 4) AS INTEGER) = ? AND CAST(SUBSTR(t.ngay, 4, 2) AS INTEGER) = ?
       GROUP BY t.ma_kh`
    ).bind(nam, thangSo).all()

    const stmts: D1PreparedStatement[] = []
    for (const r of rows as any[]) {
      const ds = Number(r.ds_mel) || 0
      const ckThang = ds >= 400000000 ? 0.03 : 0

      // Lũy kế năm từ 2026-03 đến thang hiện tại
      // ngay lưu dạng dd/MM/yyyy → chuẩn hóa thành yyyyMM để so sánh đúng thứ tự thời gian
      const yyyymm = thang.replace('-', '')
      const { results: luyKe } = await db.prepare(
        `SELECT SUM(doanh_so - gt_tra - gt_giam) AS lk
         FROM so_chi_tiet_ban_hang
         WHERE ma_kh = ? AND ma_hang LIKE 'ME%' AND ma_hang NOT LIKE 'MEVE%'
           AND ma_hang NOT LIKE 'MEOK%' AND ma_hang NOT LIKE 'MEGG%'
           AND COALESCE(la_khuyen_mai,0) = 0 AND COALESCE(la_thanh_ly,0) = 0
           AND (SUBSTR(ngay,7,4) || SUBSTR(ngay,4,2)) >= '202603'
           AND (SUBSTR(ngay,7,4) || SUBSTR(ngay,4,2)) <= ?`
      ).bind(r.ma_kh, yyyymm).all()
      const dsNam = Number((luyKe as any)?.[0]?.lk) || 0

      const an = await db.prepare(
        `SELECT pct FROM policy_annual_tiers WHERE bac_tu <= ? ORDER BY bac_tu DESC LIMIT 1`
      ).bind(dsNam).first() as any
      const ckNam = an ? Number(an.pct) : 0

      stmts.push(db.prepare(
        `INSERT INTO monthly_summary (ma_kh, thang, ds_mel_thang, ds_mel_luy_ke_nam, ck_thang_pct, ck_nam_pct, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now','+7 hours'))
         ON CONFLICT(ma_kh, thang) DO UPDATE SET
           ds_mel_thang = excluded.ds_mel_thang,
           ds_mel_luy_ke_nam = excluded.ds_mel_luy_ke_nam,
           ck_thang_pct = excluded.ck_thang_pct,
           ck_nam_pct = excluded.ck_nam_pct,
           updated_at = excluded.updated_at`
      ).bind(r.ma_kh, thang, ds, dsNam, ckThang, ckNam))
    }

    for (let i = 0; i < stmts.length; i += 100) {
      await db.batch(stmts.slice(i, i + 100))
    }

    return c.json({ success: true, thang, so_khach: stmts.length })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/chiet-khau/tong-hop — tổng hợp tháng/năm theo khách
router.get('/tong-hop', async (c) => {
  try {
    const db = c.env.DB
    const thang = c.req.query('thang') || ''
    const search = (c.req.query('search') || '').trim()
    let where = 'WHERE 1=1'
    const params: any[] = []
    if (thang) { where += ' AND m.thang = ?'; params.push(thang) }
    if (search) { where += ' AND (m.ma_kh LIKE ? OR d.ten_kh LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }

    const { results: rows } = await db.prepare(
      `SELECT m.*, d.ten_kh, d.nhom, d.vung, d.hang
       FROM monthly_summary m LEFT JOIN danh_sach_khach d ON d.ma_kh = m.ma_kh
       ${where} ORDER BY m.ds_mel_thang DESC LIMIT 500`
    ).bind(...params).all()
    return c.json({ data: rows })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/chiet-khau/ap-dung-thang — upsert bảng CK theo tháng (ck_op1/ck_op2) + ghi thay_doi_log
// body: { bang: 'ck_op1'|'ck_op2', thang: 'YYYY-MM', rows: [{...key + value cols}], updated_by }
router.post('/ap-dung-thang', async (c) => {
  try {
    const db = c.env.DB
    const body = await c.req.json() as any
    const bang = String(body.bang || '').trim()
    const thang = String(body.thang || '').trim()
    const rows: any[] = Array.isArray(body.rows) ? body.rows : []
    const updatedBy = (body.updated_by || '').trim()
    if (bang !== 'ck_op1' && bang !== 'ck_op2') return c.json({ error: 'bang phải là ck_op1 hoặc ck_op2' }, 400)
    if (!/^\d{4}-\d{2}$/.test(thang)) return c.json({ error: 'thang phải YYYY-MM' }, 400)
    if (rows.length === 0) return c.json({ error: 'rows rỗng' }, 400)

    const keyCols = bang === 'ck_op1' ? ['nhom_sp', 'dieu_kien'] : ['vung', 'bac_tu']
    const valueCols = bang === 'ck_op1'
      ? ['dl_tinh', 'dl_nt', 'dl_sg', 'xuong_thuong', 'xuong_premium', 'loai_don_vi', 'don_vi_tinh', 'nguong', 'ghi_chu']
      : ['pct_98mau', 'pct_khac', 'pct_vc_mel', 'pct_vc_khac']

    let soLog = 0
    for (const r of rows) {
      const keyVals = keyCols.map(k => String(r[k] ?? '').trim())
      if (keyVals.some(v => !v)) continue

      // dòng hiện hữu theo UNIQUE(thang, key...)
      const { results: existing } = await db.prepare(
        `SELECT id FROM ${bang} WHERE thang = ? AND ${keyCols.map(k => `${k} = ?`).join(' AND ')}`
      ).bind(thang, ...keyVals).all()

      const updates: Record<string, any> = {}
      for (const col of valueCols) {
        if (r[col] !== undefined && r[col] !== null) updates[col] = r[col]
      }
      if (Object.keys(updates).length === 0) continue

      const prev = (existing as any)?.[0] || null
      if (prev) {
        await db.prepare(
          `UPDATE ${bang} SET ${Object.keys(updates).map(col => `${col} = ?`).join(', ')} WHERE id = ?`
        ).bind(...Object.values(updates), prev.id).run()
        if (updatedBy && prev.id != null) {
          const oldRow = await db.prepare(
            `SELECT ${Object.keys(updates).join(', ')} FROM ${bang} WHERE id = ?`
          ).bind(prev.id).first() as any
          if (oldRow) {
            for (const col of Object.keys(updates)) {
              const oldVal = (oldRow as any)?.[col]
              const newVal = updates[col]
              if (String(oldVal ?? '') === String(newVal ?? '')) continue
              await db.prepare(
                `INSERT INTO thay_doi_log (bang, ref_id, cot, gia_tri_cu, gia_tri_moi, updated_by, thang, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now','+7 hours'))`
              ).bind(bang, prev.id, col,
                oldVal === null || oldVal === undefined ? '' : String(oldVal),
                newVal === null || newVal === undefined ? '' : String(newVal),
                updatedBy, thang
              ).run()
              soLog++
            }
          }
        }
      } else {
        const cols = ['thang', ...keyCols, ...Object.keys(updates)]
        const vals = [thang, ...keyVals, ...Object.values(updates)]
        const r2 = await db.prepare(
          `INSERT INTO ${bang} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
        ).bind(...vals).run()
        if (updatedBy && r2.meta?.last_row_id != null) {
          for (const col of Object.keys(updates)) {
            await db.prepare(
              `INSERT INTO thay_doi_log (bang, ref_id, cot, gia_tri_cu, gia_tri_moi, updated_by, thang, created_at)
               VALUES (?, ?, ?, '', ?, ?, ?, datetime('now','+7 hours'))`
            ).bind(bang, r2.meta.last_row_id, col, String(updates[col]), updatedBy, thang).run()
            soLog++
          }
        }
      }
    }

    return c.json({ success: true, thang, bang, so_dong: rows.length, so_log: soLog })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/chiet-khau/bang-thang?bang=ck_op1|ck_op2&thang=YYYY-MM
router.get('/bang-thang', async (c) => {
  try {
    const db = c.env.DB
    const bang = (c.req.query('bang') || '').trim()
    const thang = (c.req.query('thang') || '').trim()
    if (bang !== 'ck_op1' && bang !== 'ck_op2') return c.json({ error: 'bang phải là ck_op1 hoặc ck_op2' }, 400)
    if (!/^\d{4}-\d{2}$/.test(thang)) return c.json({ error: 'thang phải YYYY-MM' }, 400)

    const { results: rows } = await db.prepare(
      `SELECT * FROM ${bang} WHERE thang = ? ORDER BY id`
    ).bind(thang).all()

    // danh sách tháng đã có dữ liệu (để dropdown)
    const { results: thangs } = await db.prepare(
      `SELECT DISTINCT thang FROM ${bang} ORDER BY thang DESC`
    ).all()

    return c.json({ data: rows, thangs: (thangs as any[]).map(r => String(r.thang)) })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/chiet-khau/import-bang-thang — import file "CK áp dụng theo tháng.xlsx"
// multipart: file, thang (YYYY-MM), updated_by
router.post('/import-bang-thang', async (c) => {
  try {
    const db = c.env.DB
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null
    if (!file) return c.json({ error: 'Không có file' }, 400)
    const thang = String(formData.get('thang') || '').trim()
    if (!/^\d{4}-\d{2}$/.test(thang)) return c.json({ error: 'thang phải YYYY-MM' }, 400)
    const updatedBy = String(formData.get('updated_by') || '').trim()

    const buf = await file.arrayBuffer()
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]

    // ---------- PHÁT HIỆN FORMAT: chuẩn (OP1 theo Loại Ván + OP2 có MÃ KH)
    // hay mới "OP tháng" (OP1/OP2 theo TÊN đại lý, không mã KH, cột TRỢ GIÁ/CÒN LẠI)
    const isDealerFormat = rows.some(r =>
      String(r[2] || '').includes('TRỢ GIÁ') || String(r[9] || '').includes('TRỢ GIÁ')
    )

    // ---------- OP1: BẢNG TỔNG HỢP OP1 ----------
    // Header dòng: Loại Ván | Tên áp dụng | ĐẠI LÝ TỈNH | NGOẠI THÀNH | SÀI GÒN | XƯỞNG THƯỜNG | XƯỞNG PREMIUM
    const op1Rows: any[] = []
    let inOp1 = false
    let lastLoai = ''
    for (const r of rows) {
      const c0 = String(r[0] || '').trim()
      if (c0.startsWith('BẢNG TỔNG HỢP OP1')) { inOp1 = true; continue }
      if (c0.startsWith('BẢNG TỔNG HỢP OP2')) break
      if (!inOp1 || c0 === 'Loại Ván') continue
      // fill-down: dòng con (ô Loại Ván bị merged, rỗng) kế thừa loại của dòng trên
      if (c0) lastLoai = c0
      const ten = String(r[1] || '').trim()
      if (!ten) continue
      const g = (v: any) => { const s = String(v ?? '').trim(); if (!s) return null; const n = parseFloat(s.replace(/\./g, '').replace(',', '.')); return isNaN(n) ? null : n }
      op1Rows.push({
        nhom: lastLoai, ten,
        dl_tinh: g(r[2]), dl_nt: g(r[3]), dl_sg: g(r[4]),
        xuong_thuong: g(r[5]), xuong_premium: g(r[6]),
      })
    }

    // Ánh xạ tên nhóm trong Excel -> cột nhom_sp / dieu_kien trong ck_op1
    const norm = (s: string) => String(s || '').toLowerCase()
      .replace(/đ/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    const OP1_MAP: Array<{ loai: string[]; ten?: string; nhom_sp: string; dieu_kien: string; loai_don_vi?: string; don_vi_tinh?: string }> = [
      { loai: ['mdf,'], ten: '98 mau', nhom_sp: 'MDFOKAL_MEL', dieu_kien: '98mau' },
      { loai: ['mdf,'], ten: 'khac', nhom_sp: 'MDFOKAL_MEL', dieu_kien: 'khac' },
      { loai: ['van chuyen'], ten: 'mel', nhom_sp: 'VAN_CHUYEN', dieu_kien: 'mel' },
      { loai: ['van chuyen'], nhom_sp: 'VAN_CHUYEN', dieu_kien: 'khac' },
      { loai: ['van tron'], ten: 'le', nhom_sp: 'VAN_DAM_OKAL', dieu_kien: 'le' },
      { loai: ['van tron'], ten: 'le', nhom_sp: 'MDF_HDF', dieu_kien: 'le' },
      { loai: ['van tron'], ten: 'kien', nhom_sp: 'VAN_DAM_OKAL', dieu_kien: 'kien' },
      { loai: ['van tron'], ten: 'kien', nhom_sp: 'MDF_HDF', dieu_kien: 'kien' },
      { loai: ['go ghep'], ten: '>20', nhom_sp: 'GO_GHEP', dieu_kien: 'gt20' },
      { loai: ['go ghep'], ten: '<20', nhom_sp: 'GO_GHEP', dieu_kien: 'lt20', loai_don_vi: 'fixed_amount', don_vi_tinh: 'đ/tấm' },
      { loai: ['go ghep'], ten: 'phu keo', nhom_sp: 'GO_GHEP', dieu_kien: 'phu_keo', loai_don_vi: 'fixed_amount', don_vi_tinh: 'đ/mặt' },
      { loai: ['van ep'], ten: 'le', nhom_sp: 'VAN_EP', dieu_kien: 'le' },
      { loai: ['van ep'], ten: 'kien', nhom_sp: 'VAN_EP', dieu_kien: 'kien' },
      { loai: ['osb'], ten: 'le', nhom_sp: 'OSB', dieu_kien: 'le' },
      { loai: ['osb'], ten: 'kien', nhom_sp: 'OSB', dieu_kien: 'kien' },
      { loai: ['nhua tron'], ten: 'le', nhom_sp: 'DURABO', dieu_kien: 'le' },
      { loai: ['nhua tron'], ten: 'kien', nhom_sp: 'DURABO', dieu_kien: 'kien' },
      { loai: ['pvc film'], nhom_sp: 'PVC_PETG', dieu_kien: 'co_don' },
      { loai: ['plywood'], ten: '>50', nhom_sp: 'MELAMINE_PLYWOOD', dieu_kien: 'gt50' },
      { loai: ['plywood'], ten: '>500', nhom_sp: 'MELAMINE_PLYWOOD', dieu_kien: 'gt500' },
      { loai: ['plywood'], nhom_sp: 'MELAMINE_PLYWOOD', dieu_kien: 'co_don' },
      { loai: ['nhua, osb'], nhom_sp: 'MEL_NHUA_OSB_GO_GHEP', dieu_kien: 'co_don' },
      { loai: ['veneer'], nhom_sp: 'VENEER_MAT_PHU_KHAC', dieu_kien: 'co_don' },
      { loai: ['chi nep'], ten: '1 thung', nhom_sp: 'CHI_NEP', dieu_kien: '1_thung' },
      { loai: ['chi nep'], ten: '10 thung', nhom_sp: 'CHI_NEP', dieu_kien: '10_thung' },
      { loai: ['chi nep'], ten: '100 thung', nhom_sp: 'CHI_NEP', dieu_kien: '100_thung' },
      { loai: ['chi nep'], nhom_sp: 'CHI_NEP', dieu_kien: 'co_don' },
      { loai: ['keo hat'], ten: '1 bao', nhom_sp: 'KEO_HAT', dieu_kien: '1_bao' },
      { loai: ['keo hat'], ten: '10 bao', nhom_sp: 'KEO_HAT', dieu_kien: '10_bao' },
      { loai: ['acrylic', 'arcylic'], nhom_sp: 'ACRYLIC', dieu_kien: 'co_don' },
      { loai: ['laminate'], ten: 'keo', nhom_sp: 'KEO_DAN_LAMINATE', dieu_kien: 'co_don', loai_don_vi: 'fixed_amount', don_vi_tinh: 'đ/mặt' },
      { loai: ['laminate'], nhom_sp: 'HPL_LAMINATE', dieu_kien: 'co_don' },
      { loai: ['mirro'], nhom_sp: 'MIRROR', dieu_kien: 'co_don' },
      { loai: ['van hb'], nhom_sp: 'VAN_HB', dieu_kien: 'co_don' },
    ]

    let op1Upsert = 0, op1Skip = 0, op1Log = 0
    for (const row of op1Rows) {
      const nLoai = norm(row.nhom)
      const nTen = norm(row.ten)
      let matched = 0
      for (const m of OP1_MAP) {
        if (!m.loai.some(l => nLoai.includes(l))) continue
        if (m.ten && !nTen.includes(norm(m.ten))) continue
        matched++
        const cols = ['dl_tinh', 'dl_nt', 'dl_sg', 'xuong_thuong', 'xuong_premium']
        const vals = cols.map(col => row[col])
        const { results: ex } = await db.prepare(
          `SELECT id FROM ck_op1 WHERE thang=? AND nhom_sp=? AND dieu_kien=?`
        ).bind(thang, m.nhom_sp, m.dieu_kien).all()
        const prev = (ex as any)?.[0] || null
        const ins: Record<string, any> = { thang, nhom_sp: m.nhom_sp, dieu_kien: m.dieu_kien }
        cols.forEach((col, i) => { if (vals[i] !== null) ins[col] = vals[i] })
        ins.loai_don_vi = m.loai_don_vi || 'percent'
        if (m.don_vi_tinh) ins.don_vi_tinh = m.don_vi_tinh
        const insCols = Object.keys(ins)
        const insVals = insCols.map(k => ins[k])
        if (prev) {
          await db.prepare(
            `UPDATE ck_op1 SET ${insCols.map(k => `${k} = ?`).join(', ')} WHERE id = ?`
          ).bind(...insVals, prev.id).run()
        } else {
          await db.prepare(
            `INSERT INTO ck_op1 (${insCols.join(', ')}) VALUES (${insCols.map(() => '?').join(', ')})`
          ).bind(...insVals).run()
        }
        op1Upsert++
        if (updatedBy && prev) {
          const oldRow = await db.prepare(
            `SELECT ${cols.join(', ')} FROM ck_op1 WHERE id = ?`
          ).bind(prev.id).first() as any
          if (oldRow) {
            for (const col of cols) {
              const oldVal = (oldRow as any)?.[col]
              const newVal = ins[col]
              if (String(oldVal ?? '') === String(newVal ?? '')) continue
              await db.prepare(
                `INSERT INTO thay_doi_log (bang, ref_id, cot, gia_tri_cu, gia_tri_moi, updated_by, thang, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now','+7 hours'))`
              ).bind('ck_op1', prev.id, col,
                oldVal === null || oldVal === undefined ? '' : String(oldVal),
                newVal === null || newVal === undefined ? '' : String(newVal),
                updatedBy, thang
              ).run()
              op1Log++
            }
          }
        }
      }
      if (matched === 0) op1Skip++
    }

    // ---------- OP2: BẢNG TỔNG HỢP OP2 (theo đại lý -> op2_bac_thang) ----------
    // Header: TÊN ĐẠI LÝ THEO VÙNG | Tên | MDF,OK PHỦ MEL | CÒN LẠI | VC MDF | VC KHÁC | MÃ KH | TÊN KH
    let op2Upsert = 0, op2Log = 0, op2Skip = 0
    let inOp2 = false
    for (const r of rows) {
      const c0 = String(r[0] || '').trim()
      if (c0.startsWith('BẢNG TỔNG HỢP OP2')) { inOp2 = true; continue }
      if (!inOp2) continue
      const maKh = String(r[6] || '').trim()
      if (!maKh) continue
      const g = (v: any) => { const s = String(v ?? '').trim(); if (!s) return null; const n = parseFloat(s.replace(/\./g, '').replace(',', '.')); return isNaN(n) ? null : n }
      const p98 = g(r[2]), pk = g(r[3])
      if (p98 == null && pk == null) continue
      const ins: Record<string, any> = { ma_kh: maKh, thang }
      if (p98 != null) ins.pct_98mau = p98
      if (pk != null) ins.pct_khac = pk
      const { results: ex } = await db.prepare(
        `SELECT * FROM op2_bac_thang WHERE ma_kh=? AND thang=?`
      ).bind(maKh, thang).all()
      const prev = (ex as any)?.[0] || null
      if (prev) {
        await db.prepare(
          `UPDATE op2_bac_thang SET pct_98mau=?, pct_khac=? WHERE ma_kh=? AND thang=?`
        ).bind(p98 ?? prev.pct_98mau, pk ?? prev.pct_khac, maKh, thang).run()
      } else {
        await db.prepare(
          `INSERT INTO op2_bac_thang (ma_kh, thang, pct_98mau, pct_khac) VALUES (?, ?, ?, ?)`
        ).bind(maKh, thang, p98, pk).run()
      }
      op2Upsert++
      if (updatedBy && prev) {
        for (const [col, nv] of [['pct_98mau', p98], ['pct_khac', pk]] as [string, number | null][]) {
          const oldVal = (prev as any)?.[col]
          if (nv == null || String(oldVal ?? '') === String(nv)) continue
          await db.prepare(
            `INSERT INTO thay_doi_log (bang, ref_id, cot, gia_tri_cu, gia_tri_moi, updated_by, thang, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now','+7 hours'))`
          ).bind('op2_bac_thang', (prev as any).id ?? 0, col,
            oldVal === null || oldVal === undefined ? '' : String(oldVal), String(nv), updatedBy, thang
          ).run()
          op2Log++
        }
      }
    }

    // ---------- FORMAT MỚI "OP tháng": OP2 theo TÊN đại lý (không mã KH) ----------
    // OP1 block (cột A-E) là đại lý OP1 theo vùng → khớp bảng MDFOKAL_MEL hiện có, KHÔNG cần nhập.
    // OP2 block (cột G-K): KHÁCH | CK VC | MỨC CK TRỢ GIÁ | MỨC CK CÒN LẠI | [vùng]
    if (isDealerFormat) {
      const DEALER_OP2_MAP: Record<string, string> = {
        'quoc tuan': 'QUOCTUANDL',
        'toan phat': 'TOANPHAT',
        'c nhung': 'CNHUNG',
        'thien nhan cm': 'THIENNHANCM',
        'ngoc thom': 'NGOCTHOMGL',
        'phu my dt': 'PHUMY',
        'tu nguyen': 'GGTUNGUYEN',
        'phuc khang': 'PHUCKHANG',
        'khai vinh': 'KHAIVINH',
        'phuc thai tong': 'PHUCTHAITONG',
        'phu phu gia': 'PHUPHUGIA',
        'nhat tin phat': 'CHUTOAN',
        'duc quan': 'AKHANHBH',
        'tung phat': 'CHTUNGPHAT',
        'tam son': 'TAMSON',
        'quang minh': 'QUANGMINH',
        'a cung': 'ACUNG',
        'gia thinh': 'GIATHINH',
        'phu phu cuong': 'CH55BH',
        'go van mien nam': 'CHOAPVH',
      }
      const g2 = (v: any) => { const s = String(v ?? '').trim(); if (!s) return null; const n = parseFloat(s.replace(/\./g, '').replace(',', '.')); return isNaN(n) ? null : n }
      for (const r of rows) {
        const ten = String(r[6] || '').trim()
        if (!ten || ten === 'KHÁCH') continue
        const nTen = norm(ten)
        const maKh = DEALER_OP2_MAP[nTen]
        if (!maKh) { op2Skip++; continue }
        const p98 = g2(r[8]), pk = g2(r[9])
        if (p98 == null && pk == null) { op2Skip++; continue }
        const ins: Record<string, any> = { ma_kh: maKh, thang }
        if (p98 != null) ins.pct_98mau = p98
        if (pk != null) ins.pct_khac = pk
        const { results: ex } = await db.prepare(
          `SELECT * FROM op2_bac_thang WHERE ma_kh=? AND thang=?`
        ).bind(maKh, thang).all()
        const prev = (ex as any)?.[0] || null
        if (prev) {
          await db.prepare(
            `UPDATE op2_bac_thang SET pct_98mau=?, pct_khac=? WHERE ma_kh=? AND thang=?`
          ).bind(p98 ?? prev.pct_98mau, pk ?? prev.pct_khac, maKh, thang).run()
        } else {
          await db.prepare(
            `INSERT INTO op2_bac_thang (ma_kh, thang, pct_98mau, pct_khac) VALUES (?, ?, ?, ?)`
          ).bind(maKh, thang, p98, pk).run()
        }
        op2Upsert++
        if (updatedBy && prev) {
          for (const [col, nv] of [['pct_98mau', p98], ['pct_khac', pk]] as [string, number | null][]) {
            const oldVal = (prev as any)?.[col]
            if (nv == null || String(oldVal ?? '') === String(nv)) continue
            await db.prepare(
              `INSERT INTO thay_doi_log (bang, ref_id, cot, gia_tri_cu, gia_tri_moi, updated_by, thang, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now','+7 hours'))`
            ).bind('op2_bac_thang', (prev as any).id ?? 0, col,
              oldVal === null || oldVal === undefined ? '' : String(oldVal), String(nv), updatedBy, thang
            ).run()
            op2Log++
          }
        }
      }
    }

    return c.json({ success: true, thang, format: isDealerFormat ? 'op_dealer' : 'chuan', op1: { upsert: op1Upsert, skip: op1Skip, log: op1Log }, op2: { upsert: op2Upsert, skip: op2Skip, log: op2Log } })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/chiet-khau/log — log tổng hợp thay đổi theo user
// ?user= &bang= &thang= &limit= &offset=
router.get('/log', async (c) => {
  try {
    const db = c.env.DB
    const user = (c.req.query('user') || '').trim()
    const bang = (c.req.query('bang') || '').trim()
    const thang = (c.req.query('thang') || '').trim()
    const limit = Math.min(parseInt(c.req.query('limit') || '200'), 1000)
    const offset = parseInt(c.req.query('offset') || '0')

    let where = 'WHERE 1=1'
    const params: any[] = []
    if (user) { where += ' AND updated_by LIKE ?'; params.push(`%${user}%`) }
    if (bang) { where += ' AND bang = ?'; params.push(bang) }
    if (/^\d{4}-\d{2}$/.test(thang)) { where += ' AND thang = ?'; params.push(thang) }

    // Thống kê theo user (top)
    const { results: byUser } = await db.prepare(
      `SELECT updated_by, COUNT(*) as so_lan, COUNT(DISTINCT bang) as so_bang
       FROM thay_doi_log ${where}
       GROUP BY updated_by ORDER BY so_lan DESC LIMIT 20`
    ).bind(...params).all()

    const { results: rows } = await db.prepare(
      `SELECT * FROM thay_doi_log ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all()

    const { results: cnt } = await db.prepare(
      `SELECT COUNT(*) as total FROM thay_doi_log ${where}`
    ).bind(...params).all()

    return c.json({ data: rows, by_user: byUser, total: (cnt as any)?.[0]?.total || 0, limit, offset })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ============ QUẢN LÝ THÁNG — cấu trúc nhập dữ liệu theo tháng ============

// GET /api/chiet-khau/quan-ly-thang/thangs — danh sách tháng đã có dữ liệu
router.get('/quan-ly-thang/thangs', async (c) => {
  try {
    const db = c.env.DB
    const set = new Set<string>()
    for (const bang of ['ck_op1', 'ck_op2', 'op2_bac_thang', 'khach_theo_thang', 'monthly_summary']) {
      const { results } = await db.prepare(`SELECT DISTINCT thang FROM ${bang}`).all()
      for (const r of results as any[]) if (r.thang) set.add(String(r.thang))
    }
    return c.json({ thangs: [...set].sort().reverse() })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/chiet-khau/quan-ly-thang/xoa-thang — xóa toàn bộ dữ liệu của một tháng
// (ck_op1, ck_op2, op2_bac_thang, khach_theo_thang, monthly_summary) — dùng khi tạo nhầm tháng.
// Không đụng tới sổ chi tiết bán hàng và danh_sach_khach.
router.post('/quan-ly-thang/xoa-thang', async (c) => {
  try {
    const db = c.env.DB
    const body = await c.req.json().catch(() => ({})) as any
    const thang = String(body.thang || '').trim()
    if (!/^\d{4}-\d{2}$/.test(thang)) return c.json({ error: 'thang phải YYYY-MM' }, 400)

    const bang = ['ck_op1', 'ck_op2', 'op2_bac_thang', 'khach_theo_thang', 'monthly_summary']
    const out: Record<string, number> = {}
    for (const b of bang) {
      const { meta } = await db.prepare(`DELETE FROM ${b} WHERE thang = ?`).bind(thang).run()
      out[b] = Number((meta as any)?.changes) || 0
    }
    return c.json({ success: true, thang, xoa: out })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Tháng gần nhất có dữ liệu (<= nguon) trong bảng
async function thangGanNhat(db: D1Database, bang: string, nguon: string): Promise<string | null> {
  const { results } = await db.prepare(
    `SELECT DISTINCT thang FROM ${bang} WHERE thang <= ? ORDER BY thang DESC LIMIT 1`
  ).bind(nguon).all()
  const r = (results as any[])?.[0]
  return r ? String(r.thang) : null
}

// POST /api/chiet-khau/quan-ly-thang/tao-thang — tạo tháng mới bằng cách copy từ tháng nguồn
// body: { thang_moi, nguon?, copy_op1, copy_op2, copy_bac_thang, copy_khach, updated_by }
router.post('/quan-ly-thang/tao-thang', async (c) => {
  try {
    const db = c.env.DB
    const body = await c.req.json() as any
    const thangMoi = String(body.thang_moi || '').trim()
    if (!/^\d{4}-\d{2}$/.test(thangMoi)) return c.json({ error: 'thang_moi phải YYYY-MM' }, 400)
    const nguon = /^\d{4}-\d{2}$/.test(String(body.nguon || '')) ? String(body.nguon) : null
    const cb = (v: any) => v === true || v === 1 || String(v).toLowerCase() === 'true'
    const copyOp1 = cb(body.copy_op1)
    const copyOp2 = cb(body.copy_op2)
    const copyBac = cb(body.copy_bac_thang)
    const copyKhach = cb(body.copy_khach)
    const updatedBy = String(body.updated_by || '').trim()
    if (!copyOp1 && !copyOp2 && !copyBac && !copyKhach) {
      return c.json({ error: 'Chọn ít nhất một phần cần sao chép' }, 400)
    }

    const out: Record<string, { over: (string | null) | undefined; so_dong: number }> = {}

    // ---- copy OP1 (nhóm SP + điều kiện) ----
    if (copyOp1) {
      const src = nguon || await thangGanNhat(db, 'ck_op1', thangMoi)
      let soDong = 0
      if (src) {
        const { results } = await db.prepare('SELECT * FROM ck_op1 WHERE thang = ?').bind(src).all()
        for (const r of results as any[]) {
          await db.prepare(
            `INSERT OR REPLACE INTO ck_op1
             (thang, nhom_sp, dieu_kien, dl_tinh, dl_nt, dl_sg, xuong_thuong, xuong_premium, loai_don_vi, don_vi_tinh, nguong, ghi_chu)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(thangMoi, r.nhom_sp, r.dieu_kien, r.dl_tinh, r.dl_nt, r.dl_sg,
            r.xuong_thuong, r.xuong_premium, r.loai_don_vi, r.don_vi_tinh, r.nguong, r.ghi_chu).run()
          soDong++
        }
      }
      out.ck_op1 = { over: src, so_dong: soDong }
    }

    // ---- copy OP2 (bậc doanh số theo vùng) ----
    if (copyOp2) {
      const src = nguon || await thangGanNhat(db, 'ck_op2', thangMoi)
      let soDong = 0
      if (src) {
        const { results } = await db.prepare('SELECT * FROM ck_op2 WHERE thang = ?').bind(src).all()
        for (const r of results as any[]) {
          await db.prepare(
            `INSERT OR REPLACE INTO ck_op2
             (thang, vung, bac_tu, pct_98mau, pct_khac, pct_vc_mel, pct_vc_khac)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).bind(thangMoi, r.vung, r.bac_tu, r.pct_98mau, r.pct_khac, r.pct_vc_mel, r.pct_vc_khac).run()
          soDong++
        }
      }
      out.ck_op2 = { over: src, so_dong: soDong }
    }

    // ---- copy bậc đại lý theo tháng (op2_bac_thang) ----
    if (copyBac) {
      const src = nguon || await thangGanNhat(db, 'op2_bac_thang', thangMoi)
      let soDong = 0
      if (src) {
        const { results } = await db.prepare('SELECT * FROM op2_bac_thang WHERE thang = ?').bind(src).all()
        for (const r of results as any[]) {
          await db.prepare(
            `INSERT OR REPLACE INTO op2_bac_thang (ma_kh, thang, pct_98mau, pct_khac) VALUES (?, ?, ?, ?)`
          ).bind(r.ma_kh, thangMoi, r.pct_98mau, r.pct_khac).run()
          soDong++
        }
      }
      out.op2_bac_thang = { over: src, so_dong: soDong }
    }

    // ---- copy khách theo tháng (override đã có ở tháng nguồn) ----
    if (copyKhach) {
      const src = nguon || await thangGanNhat(db, 'khach_theo_thang', thangMoi)
      let soDong = 0
      if (src) {
        const { results } = await db.prepare('SELECT * FROM khach_theo_thang WHERE thang = ?').bind(src).all()
        for (const r of results as any[]) {
          await db.prepare(
            `INSERT OR REPLACE INTO khach_theo_thang
             (ma_kh, thang, loai_op, vung, doi_tuong, hang, nhom, tu_lay, ck_vc_pct, ck_ds_98mau_pct, ck_ds_khac_pct, ck_ct_pct, ghi_chu, updated_at, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','+7 hours'), ?)`
          ).bind(r.ma_kh, thangMoi, r.loai_op, r.vung, r.doi_tuong, r.hang, r.nhom,
            r.tu_lay, r.ck_vc_pct, r.ck_ds_98mau_pct, r.ck_ds_khac_pct, r.ck_ct_pct, r.ghi_chu, updatedBy || null).run()
          soDong++
        }
      }
      out.khach_theo_thang = { over: src, so_dong: soDong }
    }

    return c.json({ success: true, thang_moi: thangMoi, nguon, ket_qua: out })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/chiet-khau/quan-ly-thang/khach-thang?thang=YYYY-MM
// Trả về thuộc tính hiệu dụng của từng khách cho tháng chọn + tháng liền trước (để highlight khác biệt)
router.get('/quan-ly-thang/khach-thang', async (c) => {
  try {
    const db = c.env.DB
    const thang = (c.req.query('thang') || '').trim()
    if (!/^\d{4}-\d{2}$/.test(thang)) return c.json({ error: 'thang phải YYYY-MM' }, 400)
    // mode = rieng (mặc định, đúng minmap: chỉ khách có mức riêng) | gd (khách có giao dịch) | all
    const mode = (c.req.query('mode') || (c.req.query('chi_gd') === '1' ? 'gd' : 'rieng')).trim()

    const prev = (() => {
      const y = parseInt(thang.slice(0, 4)), m = parseInt(thang.slice(5, 7))
      if (m === 1) return `${y - 1}-12`
      return `${y}-${String(m - 1).padStart(2, '0')}`
    })()

    const { results: khRows } = await db.prepare('SELECT * FROM danh_sach_khach').all()
    const { results: ovRows } = await db.prepare(
      'SELECT * FROM khach_theo_thang ORDER BY thang DESC'
    ).all()
    const ovMap = new Map<string, any[]>()
    for (const r of ovRows as any[]) {
      const key = String(r.ma_kh)
      if (!ovMap.has(key)) ovMap.set(key, [])
      ovMap.get(key)!.push(r)
    }

    // Tập khách có giao dịch trong tháng (theo sổ chi tiết bán hàng, ngay = DD/MM/YYYY) + override đúng tháng
    // — dùng cho mode 'gd' và để giữ khách Premium thực sự mua hàng trong mode 'rieng'.
    const gdSet = new Set<string>()
    {
      const { results: gd } = await db.prepare(
        `SELECT DISTINCT ma_kh FROM so_chi_tiet_ban_hang
         WHERE substr(ngay,7,4) || '-' || substr(ngay,4,2) = ?
           AND ma_kh IS NOT NULL AND ma_kh != ''`
      ).bind(thang).all()
      for (const r of gd as any[]) gdSet.add(String(r.ma_kh))
      for (const [maKh, arr] of ovMap) {
        if (arr.some(r => String(r.thang || '') === thang)) gdSet.add(maKh)
      }
      // Gộp cả khách có giao dịch trong file Check chiết khấu vừa upload (bảng test, TTL 6h)
      const { results: gdTest } = await db.prepare(
        `SELECT DISTINCT ma_kh FROM check_chiet_khau_test
         WHERE substr(ngay,7,4) || '-' || substr(ngay,4,2) = ?
           AND ma_kh IS NOT NULL AND ma_kh != '' AND ma_hang != ''`
      ).bind(thang).all()
      for (const r of gdTest as any[]) gdSet.add(String(r.ma_kh))
    }

    // ck_op1 cho mức hiển thị OP1 (mức chung theo vùng): MDFOKAL_MEL 98mau/khac + VAN_CHUYEN mel
    const op1Rows = (await db.prepare(
      `SELECT * FROM ck_op1 WHERE nhom_sp IN ('MDFOKAL_MEL', 'VAN_CHUYEN') ORDER BY thang DESC`
    ).all()).results as any[]
    const op1Rule = (nhomSp: string, dieuKien: string): any | null => {
      for (const r of op1Rows) {
        if (r.nhom_sp === nhomSp && r.dieu_kien === dieuKien && String(r.thang || '') <= thang) return r
      }
      return null
    }
    const vcMelRule = op1Rule('VAN_CHUYEN', 'mel')

    // Bậc OP2 theo tháng (op2_bac_thang) — khách có mức riêng theo tháng
    const bacRows = (await db.prepare(
      'SELECT ma_kh, thang, pct_98mau, pct_khac FROM op2_bac_thang ORDER BY thang DESC'
    ).all()).results as any[]
    const bacMap = new Map<string, { pct98: number | null; pctKhac: number | null }>()
    for (const r of bacRows) {
      const key = String(r.ma_kh)
      if (!bacMap.has(key)) {
        bacMap.set(key, {
          pct98: r.pct_98mau != null ? normPct(r.pct_98mau) : null,
          pctKhac: r.pct_khac != null ? normPct(r.pct_khac) : null,
        })
      }
    }

    const diffCols = ['loai_op', 'vung', 'doi_tuong', 'hang', 'nhom', 'tu_lay', 'ck_vc_pct', 'ck_ds_98mau_pct', 'ck_ds_khac_pct', 'ck_ct_pct']
    const eff = (base: any, target: string): any => {
      const rows = ovMap.get(String(base.ma_kh)) || []
      let ov: any = null
      for (const r of rows) {
        if (String(r.thang || '') <= target) { ov = r; break }
      }
      return ov ? mergeKhachTheoThang(base, ov) : base
    }

    const data = (khRows as any[]).map((base: any) => {
      const maKh = String(base.ma_kh)
      const cur = eff(base, thang)
      const pre = eff(base, prev)
      const thayDoi = diffCols.filter(col => String(cur[col] ?? '') !== String(pre[col] ?? ''))

      // Mức hiển thị hiệu dụng: OP1 dùng mức chung ck_op1 theo vùng; OP2/Premium dùng mức ghi tay của khách
      const doiTuong = cur.doi_tuong || 'PREMIER'
      const vung = cur.vung || 'SaiGon'
      const hang = cur.hang || cur.loai_op || 'OP1'
      let hd98: number | null = cur.ck_ds_98mau_pct ?? null
      let hdKhac: number | null = cur.ck_ds_khac_pct ?? null
      let hdVc: number | null = cur.ck_vc_pct ?? null
      if (hd98 == null) { const r = op1Rule('MDFOKAL_MEL', '98mau'); if (r) hd98 = layRateTheoKH(r, doiTuong, vung, hang) }
      if (hdKhac == null) { const r = op1Rule('MDFOKAL_MEL', 'khac'); if (r) hdKhac = layRateTheoKH(r, doiTuong, vung, hang) }
      if (hdVc == null && vcMelRule) hdVc = layRateTheoKH(vcMelRule, doiTuong, vung, hang)

      // Bậc OP2 theo tháng (op2_bac_thang) được ưu tiên trên mức ghi tay
      const bac = bacMap.get(maKh)
      if (bac) {
        if (bac.pct98 != null) hd98 = bac.pct98
        if (bac.pctKhac != null) hdKhac = bac.pctKhac
      }

      // mode = rieng: giữ khách có mức riêng = override (nguồn khach_theo_thang), OP2 (loai_op hoặc có bậc tháng),
    // hoặc Premium có giao dịch tháng này — minmap mục 3, không liệt kê 5000+ khách mức chung.
    if (mode === 'rieng') {
      const isPremium = String(hang || '').toLowerCase() === 'premium'
      const isOP2 = String(cur.loai_op || '').toUpperCase() === 'OP2'
      const hasBac = !!bac
      const hasOverride = ovMap.get(maKh)?.some(r => String(r.thang || '') <= thang) || false
      if (!(hasOverride || isOP2 || hasBac || (isPremium && gdSet.has(maKh)))) return null
    } else if (mode === 'gd' && !gdSet.has(maKh)) {
      return null
    }

      return {
        ma_kh: maKh, ten_kh: base.ten_kh,
        loai_op: cur.loai_op, vung: cur.vung, doi_tuong: cur.doi_tuong, hang: cur.hang, nhom: cur.nhom,
        tu_lay: cur.tu_lay, ck_vc_pct: cur.ck_vc_pct, ck_ds_98mau_pct: cur.ck_ds_98mau_pct,
        ck_ds_khac_pct: cur.ck_ds_khac_pct, ck_ct_pct: cur.ck_ct_pct,
        hd_98: hd98, hd_khac: hdKhac, hd_vc: hdVc, co_bac: !!bac,
        nguon: ovMap.get(maKh)?.find(r => String(r.thang) <= thang) ? 'khach_theo_thang' : 'danh_sach_khach',
        thang_override: ovMap.get(maKh)?.find(r => String(r.thang) <= thang)?.thang || null,
        thay_doi: thayDoi,
        prev: pre,
      }
    }).filter((r: any) => r !== null)

    return c.json({ thang, prev, data })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/chiet-khau/quan-ly-thang/khach-thang — upsert thuộc tính khách theo tháng
// body: { thang, rows: [{ ma_kh, [loai_op|vung|doi_tuong|hang|nhom|tu_lay|ck_vc_pct|ck_ds_98mau_pct|ck_ds_khac_pct|ck_ct_pct], delete? }], updated_by }
router.post('/quan-ly-thang/khach-thang', async (c) => {
  try {
    const db = c.env.DB
    const body = await c.req.json() as any
    const thang = String(body.thang || '').trim()
    const rows: any[] = Array.isArray(body.rows) ? body.rows : []
    const updatedBy = String(body.updated_by || '').trim()
    if (!/^\d{4}-\d{2}$/.test(thang)) return c.json({ error: 'thang phải YYYY-MM' }, 400)
    if (rows.length === 0) return c.json({ error: 'rows rỗng' }, 400)

    const cols = ['loai_op', 'vung', 'doi_tuong', 'hang', 'nhom', 'tu_lay', 'ck_vc_pct', 'ck_ds_98mau_pct', 'ck_ds_khac_pct', 'ck_ct_pct']
    let soUpsert = 0, soDelete = 0, soLog = 0

    for (const r of rows) {
      const maKh = String(r.ma_kh || '').trim()
      if (!maKh) continue
      if (r.delete === true || r.delete === 1 || String(r.delete).toLowerCase() === 'true') {
        const { meta } = await db.prepare(`DELETE FROM khach_theo_thang WHERE ma_kh = ? AND thang = ?`).bind(maKh, thang).run()
        if (Number((meta as any)?.changes) > 0) {
          soDelete++
          if (updatedBy) {
            await db.prepare(
              `INSERT INTO thay_doi_log (bang, ref_id, cot, gia_tri_cu, gia_tri_moi, updated_by, thang, created_at)
               VALUES ('khach_theo_thang', ?, 'override', 'co', '', ?, ?, datetime('now','+7 hours'))`
            ).bind(maKh, updatedBy, thang).run()
            soLog++
          }
        }
        continue
      }

      const updates: Record<string, any> = { thang }
      for (const col of cols) {
        if (r[col] !== undefined && r[col] !== null) updates[col] = col === 'tu_lay' ? (r[col] ? 1 : 0) : r[col]
      }
      if (Object.keys(updates).length === 1) continue

      const existing = await db.prepare(
        `SELECT * FROM khach_theo_thang WHERE ma_kh = ? AND thang = ?`
      ).bind(maKh, thang).first() as any

      if (existing) {
        const sets = Object.keys(updates).map(col => `${col} = ?`)
        await db.prepare(
          `UPDATE khach_theo_thang SET ${sets.join(', ')}, updated_at = datetime('now','+7 hours'), updated_by = ? WHERE ma_kh = ? AND thang = ?`
        ).bind(...Object.values(updates), updatedBy || null, maKh, thang).run()
        soUpsert++
        if (updatedBy) {
          for (const col of Object.keys(updates)) {
            const oldVal = (existing as any)?.[col]
            const newVal = updates[col]
            if (String(oldVal ?? '') === String(newVal ?? '')) continue
            await db.prepare(
              `INSERT INTO thay_doi_log (bang, ref_id, cot, gia_tri_cu, gia_tri_moi, updated_by, thang, created_at)
               VALUES ('khach_theo_thang', ?, ?, ?, ?, ?, ?, datetime('now','+7 hours'))`
            ).bind(maKh, col,
              oldVal === null || oldVal === undefined ? '' : String(oldVal),
              newVal === null || newVal === undefined ? '' : String(newVal),
              updatedBy, thang).run()
            soLog++
          }
        }
      } else {
        const insCols = ['ma_kh', ...Object.keys(updates)]
        await db.prepare(
          `INSERT INTO khach_theo_thang (${insCols.join(', ')}, updated_at, updated_by)
           VALUES (${insCols.map(() => '?').join(', ')}, datetime('now','+7 hours'), ?)`
        ).bind(maKh, ...Object.values(updates), updatedBy || null).run()
        soUpsert++
        if (updatedBy) {
          for (const col of Object.keys(updates)) {
            await db.prepare(
              `INSERT INTO thay_doi_log (bang, ref_id, cot, gia_tri_cu, gia_tri_moi, updated_by, thang, created_at)
               VALUES ('khach_theo_thang', ?, ?, '', ?, ?, ?, datetime('now','+7 hours'))`
            ).bind(maKh, col, String(updates[col]), updatedBy, thang).run()
            soLog++
          }
        }
      }
    }

    return c.json({ success: true, thang, so_dong: rows.length, so_upsert: soUpsert, so_delete: soDelete, so_log: soLog })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/chiet-khau/quan-ly-thang/fill-mau — đóng băng map màu cho mã ME* mới chưa có trong ma_hang_nhom_mau
router.post('/quan-ly-thang/fill-mau', async (c) => {
  try {
    const db = c.env.DB
    const { results: bang98 } = await db.prepare(
      `SELECT color_code, wood_1, wood_2, wood_3, wood_4, wood_5, wood_6, wood_7, art FROM bang_gia_chuan_98_mau`
    ).all()
    const codes = new Set<string>()
    for (const r of (bang98 as any[])) {
      for (const col of ['color_code', 'wood_1', 'wood_2', 'wood_3', 'wood_4', 'wood_5', 'wood_6', 'wood_7', 'art']) {
        const v = String(r?.[col] ?? '').trim().toUpperCase()
        if (v) codes.add(v)
      }
    }

    const { results: missingRows } = await db.prepare(
      `SELECT DISTINCT ma_hang FROM so_chi_tiet_ban_hang
       WHERE ma_hang LIKE 'ME%'
         AND ma_hang NOT IN (SELECT ma_hang FROM ma_hang_nhom_mau)`
    ).all()

    const re = /^ME\d+(?:\.\d+)?[A-Z]*(\d{3,4})/
    let filled = 0, p98 = 0, khac = 0
    const ins = db.prepare(
      `INSERT OR REPLACE INTO ma_hang_nhom_mau (ma_hang, nhom_mau) VALUES (?, ?)`
    )
    for (const r of (missingRows as any[])) {
      const maHang = String(r.ma_hang || '').trim().toUpperCase()
      if (!maHang) continue
      let cls = 'khac'
      const mm = re.exec(maHang)
      if (mm && codes.has(mm[1])) { cls = '98_pho_thong'; p98++ } else { khac++ }
      await ins.bind(maHang, cls).run()
      filled++
    }

    return c.json({ success: true, filled, p98_pho_thong: p98, khac })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default router
