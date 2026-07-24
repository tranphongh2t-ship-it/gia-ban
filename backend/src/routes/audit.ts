import { Hono } from 'hono'
import { calculateDiscount } from '../logic/pricingEngine'

const router = new Hono<{ Bindings: { DB: D1Database } }>()

// GET /api/audit/compare
router.get('/compare', async (c) => {
  const db = c.env.DB

  const limit = Math.min(Number(c.req.query('limit')) || 50, 500)
  const offset = Number(c.req.query('offset')) || 0
  const search = c.req.query('search') || ''
  const ngayTu = c.req.query('ngay_tu') || ''
  const ngayDen = c.req.query('ngay_den') || ''
  const filterMaKH = c.req.query('filter_ma_kh') || ''
  const filterKhach = c.req.query('filter_khach') || ''
  const filterMaHang = c.req.query('filter_ma_hang') || ''
  const filterNote = c.req.query('filter_note') || ''
  const filterChenhMin = c.req.query('filter_chenh_min') || ''
  const filterChenhMax = c.req.query('filter_chenh_max') || ''

  const conditions = [`b.ck_dung IS NOT NULL`, `b.ck_sai IS NOT NULL`]
  const binds: any[] = []

  if (search) {
    conditions.push(`(b.ma_kh LIKE ? OR b.khach LIKE ? OR b.ma_hang LIKE ?)`)
    const s = `%${search}%`
    binds.push(s, s, s)
  }
  if (ngayTu) { conditions.push(`b.ngay >= ?`); binds.push(ngayTu) }
  if (ngayDen) { conditions.push(`b.ngay <= ?`); binds.push(ngayDen) }
  if (filterMaKH) { conditions.push(`b.ma_kh LIKE ?`); binds.push(`%${filterMaKH}%`) }
  if (filterKhach) { conditions.push(`b.khach LIKE ?`); binds.push(`%${filterKhach}%`) }
  if (filterMaHang) { conditions.push(`b.ma_hang LIKE ?`); binds.push(`%${filterMaHang}%`) }
  if (filterNote) { conditions.push(`b.note LIKE ?`); binds.push(`%${filterNote}%`) }
  if (filterChenhMin) { conditions.push(`(COALESCE(b.ck_sai,0) - COALESCE(b.ck_dung,0)) >= ?`); binds.push(Number(filterChenhMin)) }
  if (filterChenhMax) { conditions.push(`(COALESCE(b.ck_sai,0) - COALESCE(b.ck_dung,0)) <= ?`); binds.push(Number(filterChenhMax)) }

  const where = conditions.join(' AND ')
  const sqlBase = `FROM ban b LEFT JOIN khach_hang kh ON b.ma_kh = kh.ma_kh WHERE ${where}`

  const countRow = await db.prepare(`SELECT COUNT(*) as total ${sqlBase}`).bind(...binds).first()
  const total = (countRow as any)?.total || 0

  const rows = await db.prepare(
    `SELECT b.*, kh.phan_loai ${sqlBase} ORDER BY b.ngay DESC LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all()

  const results = (rows.results || []).map((row: any) => {
    const ckDung = Number(row.ck_dung) || 0
    const ckSai = Number(row.ck_sai) || 0
    const chenhLech = ckSai - ckDung
    const saiSo = Math.abs(chenhLech) > 0.001
    const saiSoPhanTram = ckDung !== 0 ? Math.abs(chenhLech / ckDung) * 100 : (ckSai !== 0 ? 100 : 0)
    return {
      ...row,
      ck_dung: ckDung,
      ck_sai: ckSai,
      chenh_lech: Math.round(chenhLech * 100) / 100,
      sai_so: saiSo,
      sai_so_phan_tram: Math.round(saiSoPhanTram * 100) / 100,
    }
  })

  const soSai = results.filter((r: any) => r.sai_so).length
  const tongChenhLech = results.reduce((s: number, r: any) => s + Math.abs(r.chenh_lech), 0)

  return c.json({
    total,
    limit,
    offset,
    data: results,
    stats: {
      tong_so: results.length,
      so_sai: soSai,
      so_dung: results.length - soSai,
      tong_chenh_lech: Math.round(tongChenhLech * 100) / 100,
    },
  })
})

// POST /api/audit/recalculate — tính lại CK cho 1 dòng ban
router.post('/recalculate', async (c) => {
  const db = c.env.DB
  const { id } = await c.req.json() as { id: number }

  const row = await db.prepare(
    `SELECT b.*, kh.phan_loai FROM ban b LEFT JOIN khach_hang kh ON b.ma_kh = kh.ma_kh WHERE b.id = ?`
  ).bind(id).first() as any

  if (!row) return c.json({ error: 'Không tìm thấy dòng' }, 404)

  try {
    const result = await calculateDiscount(db, {
      maKH: row.ma_kh,
      maSP: row.ma_hang,
      ngay: row.ngay,
      phanLoaiKH: row.phan_loai || '',
      nhomGia: row.nhom_gia || '',
      hk: row.hk || '',
      ckVanChuyen: Number(row.ck_vc) || 0,
    })

    return c.json({
      id: row.id,
      ma_kh: row.ma_kh,
      ma_hang: row.ma_hang,
      ngay: row.ngay,
      old_ck_dung: row.ck_dung,
      new_ck_dung: result.ckDung,
      ck_sai: row.ck_sai,
      nhomSP: result.nhomSP,
      loaiKH: result.loaiKH,
      loaiOP: result.loaiOP,
      ckDungDonVi: result.ckDungDonVi,
      ckVanChuyen: result.ckVanChuyen,
      ckTong: result.ckTong,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/audit/stats — tổng quan toàn bộ
router.get('/stats', async (c) => {
  const db = c.env.DB

  const total = await db.prepare(`SELECT COUNT(*) as total FROM ban`).first() as any
  const coCK = await db.prepare(
    `SELECT COUNT(*) as total FROM ban WHERE ck_dung IS NOT NULL AND ck_sai IS NOT NULL`
  ).first() as any
  const saiLech = await db.prepare(
    `SELECT COUNT(*) as total FROM ban WHERE ck_dung IS NOT NULL AND ck_sai IS NOT NULL AND ABS(COALESCE(ck_dung,0) - COALESCE(ck_sai,0)) > 0.001`
  ).first() as any

  const topSai = await db.prepare(
    `SELECT b.ma_kh, b.khach, COUNT(*) as so_lan, ROUND(AVG(ABS(COALESCE(b.ck_dung,0) - COALESCE(b.ck_sai,0))), 2) as tb_chenh_lech
     FROM ban b WHERE b.ck_dung IS NOT NULL AND b.ck_sai IS NOT NULL AND ABS(COALESCE(b.ck_dung,0) - COALESCE(b.ck_sai,0)) > 0.001
     GROUP BY b.ma_kh ORDER BY so_lan DESC LIMIT 10`
  ).all()

  const topSP = await db.prepare(
    `SELECT b.ma_hang, COUNT(*) as so_lan, ROUND(AVG(ABS(COALESCE(b.ck_dung,0) - COALESCE(b.ck_sai,0))), 2) as tb_chenh_lech
     FROM ban b WHERE b.ck_dung IS NOT NULL AND b.ck_sai IS NOT NULL AND ABS(COALESCE(b.ck_dung,0) - COALESCE(b.ck_sai,0)) > 0.001
     GROUP BY b.ma_hang ORDER BY so_lan DESC LIMIT 10`
  ).all()

  return c.json({
    tong_so_dong: total?.total || 0,
    co_ck: coCK?.total || 0,
    sai_lech: saiLech?.total || 0,
    ty_le_sai: coCK?.total > 0 ? Math.round((saiLech?.total || 0) / coCK.total * 10000) / 100 : 0,
    top_khach_hang: topSai.results || [],
    top_san_pham: topSP.results || [],
  })
})

export default router
