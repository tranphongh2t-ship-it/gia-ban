import { Hono } from 'hono'
import { getNhomSP, getLoaiKH, getCotCKOP2 } from '../logic/discountLookup'
import { calculateAll, RevenueInput } from '../logic/revenueCalc'
import { calculateDiscount, CalculateInput } from '../logic/pricingEngine'
import { calculateBasePrice, BasePriceInput } from '../logic/basePricingEngine'
import { calculateAnyBasePrice } from '../logic/extendedPricingEngine'

const router = new Hono<{ Bindings: { DB: D1Database } }>()

// POST /api/pricing/calculate — Tính chiết khấu (cột AD)
router.post('/calculate', async (c) => {
  try {
    const body = await c.req.json() as CalculateInput
    const result = await calculateDiscount(c.env.DB, body)
    return c.json(result)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/pricing/calculate-revenue — Tính doanh thu (cột Z)
router.post('/calculate-revenue', async (c) => {
  try {
    const body = await c.req.json() as RevenueInput
    const result = calculateAll(body)
    return c.json(result)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/pricing/calculate-ban — Tính toàn bộ cho 1 dòng Bán
router.post('/calculate-ban', async (c) => {
  try {
    const body = await c.req.json() as {
      maKH: string
      maSP: string
      ngay: string
      phanLoaiKH: string
      ckVanChuyen?: number
      // Revenue inputs
      X?: number; Y?: number; AE?: number; AH?: number
      P?: number; U?: number; V?: number; AC?: number
    }

    const discount = await calculateDiscount(c.env.DB, {
      maKH: body.maKH,
      maSP: body.maSP,
      ngay: body.ngay,
      phanLoaiKH: body.phanLoaiKH,
      ckVanChuyen: body.ckVanChuyen,
    })

    const revenue = calculateAll({
      X: body.X ?? 0, Y: body.Y ?? 0,
      AE: body.AE ?? 0, AH: body.AH ?? 0,
      P: body.P ?? 0, U: body.U ?? 0,
      V: body.V ?? 0, AC: body.AC ?? 0,
    })

    return c.json({ discount, revenue })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/pricing/classify — Tra cứu nhóm SP + loại KH
router.get('/classify', async (c) => {
  try {
    const maSP = c.req.query('maSP') || ''
    const phanLoai = c.req.query('phanLoai') || ''

    const nhomSP = getNhomSP(maSP)
    const loaiKH = getLoaiKH(phanLoai)
    const cotCKOP2 = getCotCKOP2(nhomSP)

    return c.json({ maSP, nhomSP, loaiKH, cotCKOP2 })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// === QUẢN LÝ THÁNG (SPEC 4.9) ===

// GET /api/pricing/months — danh sách tháng có dữ liệu
router.get('/months', async (c) => {
  try {
    const [bgckMonths, pbMonths] = await Promise.all([
      c.env.DB.prepare(
        `SELECT DISTINCT SUBSTR(key_match, 1, 7) as mm_yyyy FROM bang_gia_ck ORDER BY mm_yyyy`
      ).all(),
      c.env.DB.prepare(
        `SELECT DISTINCT thang, nam FROM phan_bo_kh ORDER BY nam, thang`
      ).all(),
    ])

    const bgckList = (bgckMonths.results || []).map((r: any) => r.mm_yyyy)
    const pbList = (pbMonths.results || []).map((r: any) =>
      `${String(r.thang).padStart(2, '0')}/${r.nam}`
    )

    const allMonths = [...new Set([...bgckList, ...pbList])].sort()

    return c.json({
      bang_gia_ck: bgckList,
      phan_bo_kh: pbList,
      all_months: allMonths,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/pricing/clone-preview — xem trước số dòng sẽ clone
router.post('/clone-preview', async (c) => {
  try {
    const { source, target, tables } = await c.req.json() as {
      source: string // "MM/YYYY"
      target: string // "MM/YYYY"
      tables: string[] // ['bang_gia_ck_op1', 'bang_gia_ck_op2', 'phan_bo_kh']
    }

    const [sMonth, sYear] = source.split('/')
    const [tMonth, tYear] = target.split('/')

    if (!sMonth || !sYear || !tMonth || !tYear) {
      return c.json({ error: 'Định dạng tháng không hợp lệ (MM/YYYY)' }, 400)
    }

    const preview: any = {}

    if (tables.includes('bang_gia_ck_op1')) {
      const src = await c.env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM bang_gia_ck WHERE loai = 'OP1' AND key_match LIKE ?`
      ).bind(`${sMonth}/${sYear}|%`).first()
      const dst = await c.env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM bang_gia_ck WHERE loai = 'OP1' AND key_match LIKE ?`
      ).bind(`${tMonth}/${tYear}|%`).first()
      preview.bang_gia_ck_op1 = {
        source: (src as any)?.cnt || 0,
        target_existing: (dst as any)?.cnt || 0,
      }
    }

    if (tables.includes('bang_gia_ck_op2')) {
      const src = await c.env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM bang_gia_ck WHERE loai = 'OP2' AND key_match LIKE ?`
      ).bind(`${sMonth}/${sYear}|%`).first()
      const dst = await c.env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM bang_gia_ck WHERE loai = 'OP2' AND key_match LIKE ?`
      ).bind(`${tMonth}/${tYear}|%`).first()
      preview.bang_gia_ck_op2 = {
        source: (src as any)?.cnt || 0,
        target_existing: (dst as any)?.cnt || 0,
      }
    }

    if (tables.includes('phan_bo_kh')) {
      const src = await c.env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM phan_bo_kh WHERE thang = ? AND nam = ?`
      ).bind(Number(sMonth), Number(sYear)).first()
      const dst = await c.env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM phan_bo_kh WHERE thang = ? AND nam = ?`
      ).bind(Number(tMonth), Number(tYear)).first()
      preview.phan_bo_kh = {
        source: (src as any)?.cnt || 0,
        target_existing: (dst as any)?.cnt || 0,
      }
    }

    return c.json(preview)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/pricing/clone-execute — thực hiện clone
router.post('/clone-execute', async (c) => {
  try {
    const { source, target, tables } = await c.req.json() as {
      source: string
      target: string
      tables: string[]
    }

    const [sMonth, sYear] = source.split('/')
    const [tMonth, tYear] = target.split('/')

    if (!sMonth || !sYear || !tMonth || !tYear) {
      return c.json({ error: 'Định dạng tháng không hợp lệ (MM/YYYY)' }, 400)
    }

    const results: any = { bang_gia_ck_op1: 0, bang_gia_ck_op2: 0, phan_bo_kh: 0 }

    if (tables.includes('bang_gia_ck_op1')) {
      const rows = await c.env.DB.prepare(
        `SELECT * FROM bang_gia_ck WHERE loai = 'OP1' AND key_match LIKE ?`
      ).bind(`${sMonth}/${sYear}|%`).all()

      for (const row of (rows.results || [])) {
        const newKey = `${tMonth}/${tYear}|${(row as any).key_match.split('|')[1]}`
        const exists = await c.env.DB.prepare(
          `SELECT id FROM bang_gia_ck WHERE loai = 'OP1' AND key_match = ? AND loai_kh = ?`
        ).bind(newKey, (row as any).loai_kh).first()

        if (!exists) {
          await c.env.DB.prepare(
            `INSERT INTO bang_gia_ck (loai, key_match, loai_kh, gia_tri, loai_don_vi, ghi_chu)
             VALUES ('OP1', ?, ?, ?, ?, ?)`
          ).bind(
            newKey,
            (row as any).loai_kh,
            (row as any).gia_tri,
            (row as any).loai_don_vi,
            (row as any).ghi_chu || `Clone từ ${source}`,
          ).run()
          results.bang_gia_ck_op1++
        }
      }
    }

    if (tables.includes('bang_gia_ck_op2')) {
      const rows = await c.env.DB.prepare(
        `SELECT * FROM bang_gia_ck WHERE loai = 'OP2' AND key_match LIKE ?`
      ).bind(`${sMonth}/${sYear}|%`).all()

      for (const row of (rows.results || [])) {
        const newKey = `${tMonth}/${tYear}|${(row as any).key_match.split('|')[1]}`
        const exists = await c.env.DB.prepare(
          `SELECT id FROM bang_gia_ck WHERE loai = 'OP2' AND key_match = ? AND cot_index = ?`
        ).bind(newKey, (row as any).cot_index).first()

        if (!exists) {
          await c.env.DB.prepare(
            `INSERT INTO bang_gia_ck (loai, key_match, cot_index, gia_tri, loai_don_vi, ghi_chu)
             VALUES ('OP2', ?, ?, ?, ?, ?)`
          ).bind(
            newKey,
            (row as any).cot_index,
            (row as any).gia_tri,
            (row as any).loai_don_vi,
            (row as any).ghi_chu || `Clone từ ${source}`,
          ).run()
          results.bang_gia_ck_op2++
        }
      }
    }

    if (tables.includes('phan_bo_kh')) {
      const rows = await c.env.DB.prepare(
        `SELECT * FROM phan_bo_kh WHERE thang = ? AND nam = ?`
      ).bind(Number(sMonth), Number(sYear)).all()

      for (const row of (rows.results || [])) {
        const exists = await c.env.DB.prepare(
          `SELECT id FROM phan_bo_kh WHERE ma_kh = ? AND thang = ? AND nam = ?`
        ).bind((row as any).ma_kh, Number(tMonth), Number(tYear)).first()

        if (!exists) {
          await c.env.DB.prepare(
            `INSERT INTO phan_bo_kh (ma_kh, thang, nam, loai_op)
             VALUES (?, ?, ?, ?)`
          ).bind(
            (row as any).ma_kh, Number(tMonth), Number(tYear), (row as any).loai_op
          ).run()
          results.phan_bo_kh++
        }
      }
    }

    return c.json({
      success: true,
      message: `Clone từ ${source} → ${target} hoàn tất`,
      results,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/pricing/calculate-base-price — Tính giá gốc (cốt gỗ + bề mặt)
router.post('/calculate-base-price', async (c) => {
  try {
    const body = await c.req.json() as BasePriceInput
    if (!body.do_day || !body.tier) {
      return c.json({ error: 'Thiếu do_day hoặc tier' }, 400)
    }
    const result = await calculateBasePrice(c.env.DB, body)
    return c.json(result)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/pricing/cot-go-tree — Danh sách loại cốt gỗ
router.get('/cot-go-tree', async (c) => {
  try {
    const rows = await c.env.DB.prepare(
      `SELECT DISTINCT loai FROM bang_gia_cot_go ORDER BY loai`
    ).all()
    return c.json(rows.results)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/pricing/cot-go-caps — Caps + độ dày theo loại
// Query params: loai (required), tier (default PREMIUM), cap (optional filter), do_day (optional filter)
router.get('/cot-go-caps', async (c) => {
  try {
    const loai = c.req.query('loai') || ''
    const tier = c.req.query('tier') || 'PREMIUM'
    const capFilter = c.req.query('cap') || ''
    const doDayFilter = c.req.query('do_day') || ''
    if (!loai) return c.json({ error: 'Thiếu loai' }, 400)

    let where = 'WHERE loai = ? AND tier = ?'
    const params: any[] = [loai, tier]
    if (capFilter) { where += ' AND cap = ?'; params.push(capFilter) }
    if (doDayFilter) { where += ' AND do_day = ?'; params.push(doDayFilter) }

    const distinct = await c.env.DB.prepare(
      `SELECT DISTINCT cap, do_day FROM bang_gia_cot_go ${where} ORDER BY do_day, cap`
    ).bind(...params).all()

    const caps = [...new Set<string>(distinct.results.map((r: any) => r.cap))]
    const doDays = [...new Set<string>(distinct.results.map((r: any) => r.do_day))]

    return c.json({ caps, do_days: doDays })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/pricing/bang-be-mat — Danh sách bảng bề mặt
router.get('/bang-be-mat', async (c) => {
  try {
    const rows = await c.env.DB.prepare(
      `SELECT DISTINCT bang FROM bang_gia_nhom_mau ORDER BY bang`
    ).all()
    return c.json(rows.results)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/pricing/ma-mau-by-bang — Mã màu theo bảng
router.get('/ma-mau-by-bang', async (c) => {
  try {
    const bang = c.req.query('bang') || ''
    const tier = c.req.query('tier') || 'PREMIUM'
    if (!bang) return c.json({ error: 'Thiếu bang' }, 400)
    const rows = await c.env.DB.prepare(
      `SELECT DISTINCT ma_mau, nhom FROM bang_gia_ma_mau
       WHERE bang = ? AND tier = ? ORDER BY ma_mau`
    ).bind(bang, tier).all()
    return c.json(rows.results)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/pricing/so-sanh — So sánh giá gốc vs đơn giá thực tế
router.get('/so-sanh', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1')
    const limit = Math.min(parseInt(c.req.query('limit') || '500'), 50000)
    const offset = (page - 1) * limit
    const loai = c.req.query('loai') || ''
    const q = c.req.query('q') || ''
    const diffFilter = c.req.query('diff') || 'all'
    const filters: Record<string, string> = JSON.parse(c.req.query('filters') || '{}')

    let where = "WHERE s.ma_hang IS NOT NULL AND s.ma_hang != ''"
    const params: any[] = []
    if (loai) { where += ' AND s.ma_hang LIKE ?'; params.push(`${loai}%`) }
    if (q) { where += ' AND (s.ma_hang LIKE ? OR s.ten_hang LIKE ?)'; params.push(`%${q}%`, `%${q}%`) }
    if (diffFilter === 'bang') { where += ' AND g.gia_goc IS NOT NULL AND g.gia_goc > 0 AND s.don_gia = g.gia_goc' }
    else if (diffFilter === 'thap') { where += ' AND g.gia_goc IS NOT NULL AND g.gia_goc > 0 AND s.don_gia > g.gia_goc' }
    else if (diffFilter === 'cao') { where += ' AND g.gia_goc IS NOT NULL AND g.gia_goc > 0 AND s.don_gia < g.gia_goc' }
    else if (diffFilter === 'khong') { where += ' AND (g.gia_goc IS NULL OR g.gia_goc = 0)' }
    for (const [k, v] of Object.entries(filters)) {
      if (!v) continue
      if (k === 'ngay_from') {
        where += ` AND (substr(s.ngay, 7, 4) || substr(s.ngay, 4, 2) || substr(s.ngay, 1, 2)) >= ?`
        params.push(v.split('/').reverse().join(''))
      } else if (k === 'ngay_to') {
        where += ` AND (substr(s.ngay, 7, 4) || substr(s.ngay, 4, 2) || substr(s.ngay, 1, 2)) <= ?`
        params.push(v.split('/').reverse().join(''))
      } else if (['don_gia', 'sl_ban'].includes(k)) { where += ` AND s.${k} = ?`; params.push(parseFloat(v) || 0) }
      else { where += ` AND s.${k} LIKE ?`; params.push(`%${v}%`) }
    }

    const subG = `(SELECT DISTINCT ma_sp, gia_goc FROM gia_ban WHERE gia_goc IS NOT NULL AND gia_goc > 0)`

    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM so_chi_tiet_ban_hang s
       LEFT JOIN ${subG} g ON s.ma_hang = g.ma_sp ${where}`
    ).bind(...params).first()
    const total = (countResult as any)?.total || 0

    const statsResult = await c.env.DB.prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN g.gia_goc IS NOT NULL AND g.gia_goc > 0 THEN 1 ELSE 0 END) as co_gia_goc,
         SUM(CASE WHEN g.gia_goc IS NOT NULL AND g.gia_goc > 0 AND s.don_gia = g.gia_goc THEN 1 ELSE 0 END) as bang,
         SUM(CASE WHEN g.gia_goc IS NOT NULL AND g.gia_goc > 0 AND s.don_gia > g.gia_goc THEN 1 ELSE 0 END) as thap,
         SUM(CASE WHEN g.gia_goc IS NOT NULL AND g.gia_goc > 0 AND s.don_gia < g.gia_goc THEN 1 ELSE 0 END) as cao,
         SUM(CASE WHEN g.gia_goc IS NULL OR g.gia_goc = 0 THEN 1 ELSE 0 END) as khong
       FROM so_chi_tiet_ban_hang s
       LEFT JOIN ${subG} g ON s.ma_hang = g.ma_sp ${where}`
    ).bind(...params).first() as any

    const rows = await c.env.DB.prepare(
      `SELECT s.id, s.ngay, s.so_ct, s.ma_hang, s.ten_hang, s.don_gia, s.sl_ban,
              g.gia_goc AS gia_goc_stored
       FROM so_chi_tiet_ban_hang s
       LEFT JOIN ${subG} g ON s.ma_hang = g.ma_sp
       ${where}
       ORDER BY s.ngay DESC, s.id ASC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all()

    const results = []
    for (const row of rows.results as any[]) {
      const item: any = {
        id: row.id,
        ngay: row.ngay, so_ct: row.so_ct,
        ma_hang: row.ma_hang, ten_hang: row.ten_hang,
        don_gia_thuc_te: row.don_gia,
        sl_ban: row.sl_ban,
      }

      if (row.gia_goc_stored !== null && row.gia_goc_stored > 0) {
        item.gia_goc = row.gia_goc_stored
        item.gia_goc_tinh = row.gia_goc_stored
        item.loai_sp = row.ma_hang?.replace(/[^A-Za-z]/g, '').substring(0, 5) || '?'
        item.chech_lech = row.don_gia ? row.gia_goc_stored - row.don_gia : null
        item.source = 'stored'
      } else if (row.ma_hang && row.ten_hang) {
        const bp = await calculateAnyBasePrice(c.env.DB, row.ma_hang, row.ten_hang, row.don_gia)
        Object.assign(item, bp)
        item.source = 'computed'
      } else {
        item.loai_sp = row.ma_hang?.replace(/[^A-Za-z]/g, '').substring(0, 5) || '?'
      }

      results.push(item)
    }

    return c.json({
      data: results, total, page, limit,
      total_pages: Math.ceil(total / limit),
      total_stats: statsResult || { total: 0, co_gia_goc: 0, bang: 0, thap: 0, cao: 0, khong: 0 },
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/pricing/tim-gia-goc — Reverse lookup: tìm sp trong gia_ban có gia_goc khớp với don_gia
router.get('/tim-gia-goc', async (c) => {
  try {
    const donGia = parseFloat(c.req.query('don_gia') || '0')
    if (!donGia) return c.json({ error: 'Nhập đơn giá cần tra' }, 400)

    const matched = await c.env.DB.prepare(
      `SELECT ma_sp, ten_sp, do_day, nhom, loai_giay, loai_phim, dg_vt, dg_giay, gia_goc
       FROM gia_ban
       WHERE gia_goc = ? AND gia_goc > 0
       ORDER BY ma_sp`
    ).bind(donGia).all()

    const results: any[] = []
    for (const row of matched.results as any[]) {
      const item: any = {
        ma_sp: row.ma_sp,
        ten_sp: row.ten_sp,
        do_day: row.do_day,
        nhom: row.nhom,
        loai_giay: row.loai_giay,
        loai_phim: row.loai_phim,
        dg_vt: row.dg_vt,
        dg_giay: row.dg_giay,
        gia_goc: row.gia_goc,
        tong_dg: (row.dg_vt || 0) + (row.dg_giay || 0),
      }

      // Tra bảng giá cốt gỗ
      if (row.do_day && row.nhom) {
        const cotGo = await c.env.DB.prepare(
          `SELECT loai, tier, do_day, cap, gia FROM bang_gia_cot_go
           WHERE do_day = ? AND (loai LIKE ? OR loai LIKE ?)
           LIMIT 1`
        ).bind(row.do_day, `%${row.nhom}%`, `%${row.nhom.replace(/ .*/, '')}%`).first() as any
        if (cotGo) {
          item.cot_go_loai = cotGo.loai
          item.cot_go_cap = cotGo.cap
          item.cot_go_gia = cotGo.gia
        }
      }

      // Tra bảng giá nhóm màu
      if (row.loai_giay || row.loai_phim) {
        const nhomMau = await c.env.DB.prepare(
          `SELECT bang, tier, nhom, gia_1_mat, gia_2_mat FROM bang_gia_nhom_mau
           WHERE (nhom LIKE ? OR nhom LIKE ?)
           LIMIT 1`
        ).bind(`%${row.loai_giay || ''}%`, `%${row.loai_phim || ''}%`).first() as any
        if (nhomMau) {
          item.nhom_mau_bang = nhomMau.bang
          item.nhom_mau_nhom = nhomMau.nhom
          item.nhom_mau_gia_1m = nhomMau.gia_1_mat
          item.nhom_mau_gia_2m = nhomMau.gia_2_mat
        }
      }

      results.push(item)
    }

    return c.json({ don_gia: donGia, total: results.length, data: results })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/pricing/tim-gia-goc/text — Output TSV
router.get('/tim-gia-goc/text', async (c) => {
  try {
    const donGia = parseFloat(c.req.query('don_gia') || '0')
    if (!donGia) return c.json({ error: 'Nhập đơn giá cần tra' }, 400)

    const matched = await c.env.DB.prepare(
      `SELECT ma_sp, ten_sp, do_day, nhom, loai_giay, loai_phim, dg_vt, dg_giay, gia_goc
       FROM gia_ban
       WHERE gia_goc = ? AND gia_goc > 0
       ORDER BY ma_sp`
    ).bind(donGia).all()

    const lines: string[] = []
    lines.push('Mã SP\tTên SP\tĐộ dày\tNhóm\tLoại giấy\tLoại phim\tDG ván trơn\tDG giấy\tGiá gốc\tTổng DG\tCốt gỗ loại\tCốt gỗ cấp\tCốt gỗ giá\tNhóm màu bảng\tNhóm màu nhóm\tGiá 1 mặt\tGiá 2 mặt')

    for (const row of matched.results as any[]) {
      let cotGo = null
      if (row.do_day && row.nhom) {
        cotGo = await c.env.DB.prepare(
          `SELECT loai, cap, gia FROM bang_gia_cot_go
           WHERE do_day = ? AND (loai LIKE ? OR loai LIKE ?)
           LIMIT 1`
        ).bind(row.do_day, `%${row.nhom}%`, `%${row.nhom.replace(/ .*/, '')}%`).first() as any
      }

      let nhomMau = null
      if (row.loai_giay || row.loai_phim) {
        nhomMau = await c.env.DB.prepare(
          `SELECT bang, nhom, gia_1_mat, gia_2_mat FROM bang_gia_nhom_mau
           WHERE (nhom LIKE ? OR nhom LIKE ?)
           LIMIT 1`
        ).bind(`%${row.loai_giay || ''}%`, `%${row.loai_phim || ''}%`).first() as any
      }

      lines.push([
        row.ma_sp, row.ten_sp, row.do_day, row.nhom, row.loai_giay, row.loai_phim,
        row.dg_vt ?? '', row.dg_giay ?? '', row.gia_goc ?? '',
        ((row.dg_vt || 0) + (row.dg_giay || 0)),
        cotGo?.loai ?? '', cotGo?.cap ?? '', cotGo?.gia ?? '',
        nhomMau?.bang ?? '', nhomMau?.nhom ?? '', nhomMau?.gia_1_mat ?? '', nhomMau?.gia_2_mat ?? '',
      ].join('\t'))
    }

    const content = lines.join('\n')
    return new Response(content, {
      headers: {
        'Content-Type': 'text/tab-separated-values; charset=utf-8',
        'Content-Disposition': `attachment; filename="tim_gia_goc_${donGia}.tsv"`,
      },
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/pricing/cap-nhat-gia-goc — Copy don_gia từ sổ chi tiết → gia_ban.gia_goc
router.post('/cap-nhat-gia-goc', async (c) => {
  try {
    // Step 1: find most common don_gia per product
    const modeResult = await c.env.DB.prepare(
      `SELECT s.ma_hang, s.don_gia, COUNT(*) as cnt
       FROM so_chi_tiet_ban_hang s
       WHERE s.ma_hang IS NOT NULL AND s.ma_hang != '' AND s.don_gia > 0
       GROUP BY s.ma_hang, s.don_gia
       ORDER BY s.ma_hang, cnt DESC`
    ).all()

    // Step 2: keep only the top frequency row per product
    const bestMap = new Map<string, number>()
    for (const row of modeResult.results as any[]) {
      if (!bestMap.has(row.ma_hang)) {
        bestMap.set(row.ma_hang, row.don_gia)
      }
    }

    // Step 3: update gia_ban
    let updated = 0
    let skipped = 0
    let errors = 0

    for (const [ma_hang, don_gia] of bestMap) {
      try {
        const existing = await c.env.DB.prepare(
          `SELECT id, gia_goc FROM gia_ban WHERE ma_sp = ? LIMIT 1`
        ).bind(ma_hang).first() as any

        if (!existing) { skipped++; continue }
        if (existing.gia_goc === don_gia) { skipped++; continue }

        await c.env.DB.prepare(
          `UPDATE gia_ban SET gia_goc = ? WHERE id = ?`
        ).bind(don_gia, existing.id).run()
        updated++
      } catch {
        errors++
      }
    }

    return c.json({
      success: true,
      total_products: bestMap.size,
      updated,
      skipped,
      errors,
      message: `Đã cập nhật ${updated} sản phẩm, bỏ qua ${skipped}, lỗi ${errors}`,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/pricing/them-ma-thieu-8-nhom — Tìm & thêm mã hàng còn thiếu trong 8 nhóm nhỏ
router.get('/them-ma-thieu-8-nhom', async (c) => {
  try {
    const groups = [
      { name: 'Veneer', table: 'bang_gia_veneers', keywords: ['VENEER', 'VEN'], prefixes: ['VNGG', 'GG'] },
      { name: 'Chỉ', table: 'bang_gia_chi', keywords: ['CHI'], prefixes: ['CHI'] },
      { name: 'Keo nóng', table: 'bang_gia_keo_nong', keywords: ['KEODC', 'KEO'], prefixes: ['ZKEODC'] },
      { name: 'Ván phủ Acrylic', table: 'bang_gia_van_phu_acrylic', keywords: ['ACRYLIC', 'FOIL'], prefixes: [] },
      { name: 'Ván phủ PVC', table: 'bang_gia_van_phu_pvc', keywords: ['PVC', 'PETG'], prefixes: [] },
      { name: 'Nhựa phủ màu', table: 'bang_gia_nhua_phu_mau', keywords: ['NHUA', 'PLASTIC'], prefixes: [] },
      { name: 'Nhựa Laminate', table: 'bang_gia_nhua_laminate', keywords: ['LAMINATE', 'LAMINE'], prefixes: [] },
      { name: 'Mirror', table: 'bang_gia_mirror', keywords: ['MIRROR', 'GUONG', 'SIEU BONG'], prefixes: [] },
    ]

    // 1. Xây dựng prefix pattern từ hard-coded + auto-detect
    const patterns: { name: string; table: string; prefix: string }[] = []
    const allGroupMaSP = new Set<string>()

    for (const g of groups) {
      const rows = await c.env.DB.prepare(
        `SELECT DISTINCT ma_sp FROM ${g.table} WHERE ma_sp IS NOT NULL AND ma_sp != ''`
      ).all()
      const codes = (rows.results || []).map((r: any) => r.ma_sp)
      codes.forEach((c: string) => allGroupMaSP.add(c))

      // Dùng hard-coded prefix nếu có, fallback auto-detect threshold thấp
      const hardPrefix = g.prefixes.length > 0 ? g.prefixes[0] : null
      if (hardPrefix) {
        patterns.push({ name: g.name, table: g.table, prefix: hardPrefix })
      } else {
        const prefixCounts: Record<string, number> = {}
        for (const code of codes) {
          if (code.length < 4) continue
          const alpha = code.replace(/[^A-Za-z]/g, '')
          for (let len = Math.min(6, alpha.length); len >= 2; len--) {
            const p = alpha.substring(0, len).toUpperCase()
            if (code.toUpperCase().startsWith(p)) prefixCounts[p] = (prefixCounts[p] || 0) + 1
          }
        }
        const sorted = Object.entries(prefixCounts).sort((a, b) => b[0].length - a[0].length || b[1] - a[1])
        const best = sorted.find(([, cnt]) => cnt >= Math.max(3, codes.length * 0.12))
        if (best) patterns.push({ name: g.name, table: g.table, prefix: best[0] })
      }
    }

    // 2. Lấy ma_sp từ so_chi_tiet_ban_hang (bảng So sánh giá gốc) chưa có trong nhóm
    const salesRows = await c.env.DB.prepare(
      `SELECT DISTINCT s.ma_hang, MAX(m.ten_sp) as ten_sp
       FROM so_chi_tiet_ban_hang s
       LEFT JOIN ma_misa m ON s.ma_hang = m.ma_sp
       WHERE s.ma_hang IS NOT NULL AND s.ma_hang != ''
       GROUP BY s.ma_hang
       ORDER BY s.ma_hang`
    ).all()

    const missing: { ma_sp: string; ten_sp: string | null; match: string; table: string }[] = []
    const noMatch: { ma_sp: string; ten_sp: string | null }[] = []

    for (const row of (salesRows.results || []) as any[]) {
      if (allGroupMaSP.has(row.ma_hang)) continue

      const code = row.ma_hang
      const name = (row.ten_sp || '').toUpperCase()
      let matched = false

      // Ưu tiên: keyword trong tên sản phẩm trước
      for (const g of groups) {
        for (const kw of g.keywords) {
          if (name.includes(kw)) {
            missing.push({ ma_sp: code, ten_sp: row.ten_sp, match: g.name, table: g.table })
            matched = true
            break
          }
        }
        if (matched) break
      }
      if (matched) continue

      // Sau đó: prefix pattern
      for (const p of patterns) {
        if (code.toUpperCase().startsWith(p.prefix)) {
          missing.push({ ma_sp: code, ten_sp: row.ten_sp, match: p.name, table: p.table })
          matched = true
          break
        }
      }
      if (!matched) {
        noMatch.push({ ma_sp: code, ten_sp: row.ten_sp })
      }
    }

    return c.json({
      matched_count: missing.length,
      unmatched_count: noMatch.length,
      patterns,
      matched_sample: missing.slice(0, 100),
      unmatched_sample: noMatch.slice(0, 100),
      total_sales: (salesRows.results || []).length,
      total_in_groups: allGroupMaSP.size,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/pricing/them-ma-thieu-8-nhom — Thêm mã thiếu vào các bảng nhóm (auto)
router.post('/them-ma-thieu-8-nhom', async (c) => {
  try {
    const body = await c.req.json() as { mode?: 'preview' | 'insert'; items?: { ma_sp: string; table: string }[] }
    const mode = body.mode || 'insert'

    const groups = [
      { name: 'Veneer', table: 'bang_gia_veneers', keywords: ['VENEER', 'VEN'], prefixes: ['VNGG', 'GG'] },
      { name: 'Chỉ', table: 'bang_gia_chi', keywords: ['CHI'], prefixes: ['CHI'] },
      { name: 'Keo nóng', table: 'bang_gia_keo_nong', keywords: ['KEODC', 'KEO'], prefixes: ['ZKEODC'] },
      { name: 'Ván phủ Acrylic', table: 'bang_gia_van_phu_acrylic', keywords: ['ACRYLIC', 'FOIL'], prefixes: [] },
      { name: 'Ván phủ PVC', table: 'bang_gia_van_phu_pvc', keywords: ['PVC', 'PETG'], prefixes: [] },
      { name: 'Nhựa phủ màu', table: 'bang_gia_nhua_phu_mau', keywords: ['NHUA', 'PLASTIC'], prefixes: [] },
      { name: 'Nhựa Laminate', table: 'bang_gia_nhua_laminate', keywords: ['LAMINATE', 'LAMINE'], prefixes: [] },
      { name: 'Mirror', table: 'bang_gia_mirror', keywords: ['MIRROR', 'GUONG', 'SIEU BONG'], prefixes: [] },
    ]

    // Xây pattern từ dữ liệu có sẵn, kết hợp với hard-coded prefixes
    const patterns: { name: string; table: string; prefix: string }[] = []
    const allGroupMaSP = new Set<string>()

    for (const g of groups) {
      const rows = await c.env.DB.prepare(
        `SELECT DISTINCT ma_sp FROM ${g.table} WHERE ma_sp IS NOT NULL AND ma_sp != ''`
      ).all()
      const codes = (rows.results || []).map((r: any) => r.ma_sp)
      codes.forEach((c: string) => allGroupMaSP.add(c))

      // Auto-detect prefix từ dữ liệu gốc (chỉ xét mã có độ dài >=4 để tránh nhiễu)
      const prefixCounts: Record<string, number> = {}
      for (const code of codes) {
        if (code.length < 4) continue
        const alpha = code.replace(/[^A-Za-z]/g, '')
        for (let len = Math.min(6, alpha.length); len >= 2; len--) {
          const p = alpha.substring(0, len).toUpperCase()
          if (code.toUpperCase().startsWith(p)) prefixCounts[p] = (prefixCounts[p] || 0) + 1
        }
      }
      const sorted = Object.entries(prefixCounts).sort((a, b) => b[0].length - a[0].length || b[1] - a[1])
      // Dùng hard-coded nếu có, nếu không auto-detect với threshold thấp hơn
      const hardPrefix = g.prefixes.length > 0 ? g.prefixes[0] : null
      if (hardPrefix) {
        patterns.push({ name: g.name, table: g.table, prefix: hardPrefix })
      } else {
        const best = sorted.find(([, cnt]) => cnt >= Math.max(3, codes.length * 0.12))
        if (best) patterns.push({ name: g.name, table: g.table, prefix: best[0] })
      }
    }

    // Lấy mã từ sales + gia_ban (để bắt được cả mã chưa bán)
    const salesRows = await c.env.DB.prepare(
      `SELECT DISTINCT s.ma_hang, MAX(m.ten_sp) as ten_sp
       FROM so_chi_tiet_ban_hang s
       LEFT JOIN ma_misa m ON s.ma_hang = m.ma_sp
       WHERE s.ma_hang IS NOT NULL AND s.ma_hang != ''
       GROUP BY s.ma_hang
       ORDER BY s.ma_hang`
    ).all()

    const toInsert: { ma_sp: string; table: string }[] = []

    for (const row of (salesRows.results || []) as any[]) {
      if (allGroupMaSP.has(row.ma_hang)) continue
      const code = row.ma_hang
      const name = (row.ten_sp || '').toUpperCase()
      let matched = false
      // Keyword match
      for (const g of groups) {
        for (const kw of g.keywords) {
          if (name.includes(kw)) {
            toInsert.push({ ma_sp: code, table: g.table })
            matched = true; break
          }
        }
        if (matched) break
      }
      if (matched) continue
      // Prefix match
      for (const p of patterns) {
        if (code.toUpperCase().startsWith(p.prefix)) {
          toInsert.push({ ma_sp: code, table: p.table })
          break
        }
      }
    }

    if (mode === 'preview') {
      return c.json({ total_to_insert: toInsert.length, items: toInsert })
    }

    // Insert
    let added = 0
    for (const item of toInsert) {
      const existing = await c.env.DB.prepare(`SELECT 1 FROM ${item.table} WHERE ma_sp = ? LIMIT 1`).bind(item.ma_sp).first()
      if (existing) continue

      // Lấy gia_goc từ ma_misa nếu có
      const maInfo = await c.env.DB.prepare(`SELECT gia_goc FROM ma_misa WHERE ma_sp = ?`).bind(item.ma_sp).first() as any

      // Mỗi bảng có NOT NULL khác nhau, cần default values
      let sql: string
      let params: any[]
      if (item.table === 'bang_gia_chi') {
        sql = `INSERT INTO bang_gia_chi (ma_sp, loai, ten, gia) VALUES (?, '', '', ?)`
        params = [item.ma_sp, maInfo?.gia_goc || null]
      } else if (item.table === 'bang_gia_mirror') {
        sql = `INSERT INTO bang_gia_mirror (ma_sp, loai, gia) VALUES (?, '', ?)`
        params = [item.ma_sp, maInfo?.gia_goc || null]
      } else if (item.table === 'bang_gia_veneers') {
        sql = `INSERT INTO bang_gia_veneers (ma_sp, loai, ten) VALUES (?, '', ?)`
        params = [item.ma_sp, item.ma_sp]
      } else if (item.table === 'bang_gia_keo_nong') {
        sql = `INSERT INTO bang_gia_keo_nong (ma_sp, ma) VALUES (?, '')`
        params = [item.ma_sp]
      } else if (item.table === 'bang_gia_van_phu_acrylic') {
        sql = `INSERT INTO bang_gia_van_phu_acrylic (ma_sp, series, phu) VALUES (?, '', '')`
        params = [item.ma_sp]
      } else if (item.table === 'bang_gia_van_phu_pvc') {
        sql = `INSERT INTO bang_gia_van_phu_pvc (ma_sp, loai_cot) VALUES (?, '')`
        params = [item.ma_sp]
      } else if (item.table === 'bang_gia_nhua_phu_mau') {
        sql = `INSERT INTO bang_gia_nhua_phu_mau (ma_sp, loai_cot) VALUES (?, '')`
        params = [item.ma_sp]
      } else if (item.table === 'bang_gia_nhua_laminate') {
        sql = `INSERT INTO bang_gia_nhua_laminate (ma_sp, loai_cot) VALUES (?, '')`
        params = [item.ma_sp]
      } else continue

      await c.env.DB.prepare(sql).bind(...params).run()
      added++
    }

    return c.json({ success: true, added, total_found: toInsert.length })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/pricing/xoa-trung-gia-ban — Xoá dòng trùng trong gia_ban
router.post('/xoa-trung-gia-ban', async (c) => {
  try {
    // Lấy danh sách ID cần giữ (row đầu tiên trong mỗi nhóm)
    let keepResult: any
    let useGiaGoc = true
    try {
      keepResult = await c.env.DB.prepare(
        `SELECT MIN(id) as keep_id FROM gia_ban
         WHERE ma_sp IS NOT NULL AND ma_sp != ''
         GROUP BY ma_sp, COALESCE(gia_goc, -1)`
      ).all()
    } catch {
      useGiaGoc = false
    }

    if (!useGiaGoc) {
      keepResult = await c.env.DB.prepare(
        `SELECT MIN(id) as keep_id FROM gia_ban
         WHERE ma_sp IS NOT NULL AND ma_sp != ''
         GROUP BY ma_sp, COALESCE(do_day,''), COALESCE(ma_giay,''), COALESCE(nhom,''),
                  COALESCE(dg_giay,0), COALESCE(dg_vt,0)`
      ).all()
    }

    const keepIds = new Set((keepResult.results || []).map((r: any) => r.keep_id))

    // Lấy tất cả ID
    const allResult = await c.env.DB.prepare(
      `SELECT id FROM gia_ban WHERE ma_sp IS NOT NULL AND ma_sp != ''`
    ).all()
    const deleteIds = (allResult.results || []).map((r: any) => r.id).filter((id: number) => !keepIds.has(id))

    if (deleteIds.length === 0) {
      return c.json({ success: true, deleted: 0, message: 'Không tìm thấy dòng trùng nào' })
    }

    // Xoá child (gia_ban_tier) trước, rồi parent (gia_ban)
    const CHUNK = 100
    for (let i = 0; i < deleteIds.length; i += CHUNK) {
      const chunk = deleteIds.slice(i, i + CHUNK)
      const ph = chunk.map(() => '?').join(',')
      await c.env.DB.prepare(`DELETE FROM gia_ban_tier WHERE gia_ban_id IN (${ph})`).bind(...chunk).run()
      await c.env.DB.prepare(`DELETE FROM gia_ban WHERE id IN (${ph})`).bind(...chunk).run()
    }

    return c.json({
      success: true, deleted: deleteIds.length,
      message: `Đã xoá ${deleteIds.length} dòng trùng`,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/pricing/seed-van-phu-missing — Bổ sung dữ liệu thiếu cho Tính Giá Ván Phủ
const MISSING_SQL = [
  // 1. PREMIUM tier cho 220 MÀU MELAMINE (nhom_mau)
  "INSERT OR IGNORE INTO bang_gia_nhom_mau (bang, tier, nhom, loai_mau, gia_1_mat, gia_2_mat) VALUES ('220 MÀU MELAMINE', 'PREMIUM', 'BASIC', NULL, 80000, 120000)",
  "INSERT OR IGNORE INTO bang_gia_nhom_mau (bang, tier, nhom, loai_mau, gia_1_mat, gia_2_mat) VALUES ('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', NULL, 90000, 130000)",
  "INSERT OR IGNORE INTO bang_gia_nhom_mau (bang, tier, nhom, loai_mau, gia_1_mat, gia_2_mat) VALUES ('220 MÀU MELAMINE', 'PREMIUM', 'STANDARD', NULL, 90000, 130000)",
  "INSERT OR IGNORE INTO bang_gia_nhom_mau (bang, tier, nhom, loai_mau, gia_1_mat, gia_2_mat) VALUES ('220 MÀU MELAMINE', 'PREMIUM', 'PREMIUM WOOD + ART', NULL, 90000, 130000)",
  "INSERT OR IGNORE INTO bang_gia_nhom_mau (bang, tier, nhom, loai_mau, gia_1_mat, gia_2_mat) VALUES ('220 MÀU MELAMINE', 'PREMIUM', 'PREMIUM COLOR', NULL, 100000, 150000)",
  "INSERT OR IGNORE INTO bang_gia_nhom_mau (bang, tier, nhom, loai_mau, gia_1_mat, gia_2_mat) VALUES ('220 MÀU MELAMINE', 'PREMIUM', 'SUPERB', NULL, 110000, 160000)",
  // 2. MÀU TỐI nhom cho NHÓM MÀU VÁN NHỰA
  "INSERT OR IGNORE INTO bang_gia_nhom_mau (bang, tier, nhom, loai_mau, gia_1_mat, gia_2_mat) VALUES ('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', NULL, NULL, NULL)",
  "INSERT OR IGNORE INTO bang_gia_nhom_mau (bang, tier, nhom, loai_mau, gia_1_mat, gia_2_mat) VALUES ('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', NULL, NULL, NULL)",
]

// 3. PREMIUM mã màu cho 220 MÀU MELAMINE (copy từ BBG PREMIER)
const PREMIUM_MA_MAU_220 = [
  "INSERT OR IGNORE INTO bang_gia_ma_mau (bang, tier, nhom, ma_mau, ten_mau) VALUES",
  "('220 MÀU MELAMINE', 'PREMIUM', 'BASIC', '108', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'BASIC', '29', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '303', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '385', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '402', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '425', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '444', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '501', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '601', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '725', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', 'Đ5', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'BASIC', '109', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'BASIC', '439', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '320', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '386', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '403', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '426', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '445', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '502', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '609', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '737', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', 'Đ8', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'BASIC', '388-2', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'BASIC', '161', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '325', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '388', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '404', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '427', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '447', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '503', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '611', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '740', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '901', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'BASIC', '184', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '330', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '389', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '405', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '428', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '448', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '530', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '612', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '741', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '430', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '331', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '407', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '429', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '460', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '577', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '613', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '750', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '431', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'BASIC', '201', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '332', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '412', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '432', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '467', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '614', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '771', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'BASIC', '209', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '333', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '413', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '434', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '469', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '622', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '786', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'BASIC', '212', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '335', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '414', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '435', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '471', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '642', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'BASIC', '217', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '337', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '416', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '436', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '473', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '668', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '803', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'BASIC', '240', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '338', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '421', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '440', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '474', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '809', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '340', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '423', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '442', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '861', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '376', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '424', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '443', NULL),",
  "('220 MÀU MELAMINE', 'PREMIUM', 'ECONOMY', '862', NULL),",
]

const TOI_MA_MAU = [
  "INSERT OR IGNORE INTO bang_gia_ma_mau (bang, tier, nhom, ma_mau, ten_mau) VALUES",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '132', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '414', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', 'D4', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '702', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '136', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '423', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', 'D8', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '139', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '442', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '161', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '530', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '268', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '556', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '303', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '590', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '312', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '601', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '302', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '613', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '322', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '614', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '329', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '719', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '333', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '725', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '336', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '735', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '338', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '743', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '370', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '744', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '376', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '803', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'PREMIUM', 'MÀU TỐI', '861', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '132', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '414', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', 'D4', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '702', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '136', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '423', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', 'D8', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '139', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '442', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '161', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '530', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '268', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '556', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '303', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '590', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '312', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '601', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '302', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '613', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '322', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '614', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '329', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '719', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '333', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '725', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '336', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '735', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '338', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '743', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '370', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '744', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '376', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '803', NULL),",
  "('NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP', 'BBG PREMIER', 'MÀU TỐI', '861', NULL),",
]

router.post('/seed-van-phu-missing', async (c) => {
  try {
    const stmts: D1PreparedStatement[] = []
    const db = c.env.DB

    // nhom_mau inserts
    for (const sql of MISSING_SQL) {
      stmts.push(db.prepare(sql))
    }

    // ma_mau 220 PREMIUM - batch multi-row INSERT
    const batchSize = 50
    for (let i = 1; i < PREMIUM_MA_MAU_220.length; i += batchSize) {
      const chunk = PREMIUM_MA_MAU_220.slice(i, i + batchSize)
      const header = PREMIUM_MA_MAU_220[0]
      // last tuple: remove trailing comma
      chunk[chunk.length - 1] = chunk[chunk.length - 1].replace(/,$/, '')
      stmts.push(db.prepare(header + '\n' + chunk.join('\n')))
    }

    // ma_mau MÀU TỐI - batch multi-row INSERT
    for (let i = 1; i < TOI_MA_MAU.length; i += batchSize) {
      const chunk = TOI_MA_MAU.slice(i, i + batchSize)
      const header = TOI_MA_MAU[0]
      chunk[chunk.length - 1] = chunk[chunk.length - 1].replace(/,$/, '')
      stmts.push(db.prepare(header + '\n' + chunk.join('\n')))
    }

    // Execute in batches of 20
    const BATCH = 20
    let executed = 0
    for (let i = 0; i < stmts.length; i += BATCH) {
      const batch = stmts.slice(i, i + BATCH)
      await db.batch(batch)
      executed += batch.length
    }

    return c.json({
      success: true,
      inserted: executed,
      message: `Đã bổ sung ${executed} bản ghi (nhóm màu: ${MISSING_SQL.length}, mã màu 220 PREMIUM: ${PREMIUM_MA_MAU_220.length - 1}, mã màu MÀU TỐI: ${TOI_MA_MAU.length - 1})`,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/pricing/dashboard — Dashboard tổng quan
router.get('/dashboard', async (c) => {
  try {
    const ngayFrom = c.req.query('ngay_from') || ''
    const ngayTo = c.req.query('ngay_to') || ''

    let where = "WHERE s.ma_hang IS NOT NULL AND s.ma_hang != ''"
    const params: any[] = []
    if (ngayFrom) {
      where += ' AND (substr(s.ngay, 7, 4) || substr(s.ngay, 4, 2) || substr(s.ngay, 1, 2)) >= ?'
      params.push(ngayFrom.split('/').reverse().join(''))
    }
    if (ngayTo) {
      where += ' AND (substr(s.ngay, 7, 4) || substr(s.ngay, 4, 2) || substr(s.ngay, 1, 2)) <= ?'
      params.push(ngayTo.split('/').reverse().join(''))
    }

    const subG = `(SELECT DISTINCT ma_sp, gia_goc FROM gia_ban WHERE gia_goc IS NOT NULL AND gia_goc > 0)`

    const totalRow = await c.env.DB.prepare(
      `SELECT
         COUNT(*) as tong_so_dong,
         COUNT(DISTINCT s.so_ct) as tong_don_hang,
         SUM(COALESCE(s.doanh_so, 0)) as tong_doanh_so,
         SUM(CASE WHEN g.gia_goc IS NOT NULL AND g.gia_goc > 0 THEN 1 ELSE 0 END) as co_gia_goc,
         SUM(CASE WHEN g.gia_goc IS NOT NULL AND g.gia_goc > 0 AND s.don_gia = g.gia_goc THEN 1 ELSE 0 END) as bang,
         SUM(CASE WHEN g.gia_goc IS NOT NULL AND g.gia_goc > 0 AND s.don_gia > g.gia_goc THEN 1 ELSE 0 END) as thap,
         SUM(CASE WHEN g.gia_goc IS NOT NULL AND g.gia_goc > 0 AND s.don_gia < g.gia_goc THEN 1 ELSE 0 END) as cao,
         SUM(CASE WHEN g.gia_goc IS NULL OR g.gia_goc = 0 THEN 1 ELSE 0 END) as khong
       FROM so_chi_tiet_ban_hang s
       LEFT JOIN ${subG} g ON s.ma_hang = g.ma_sp ${where}`
    ).bind(...params).first() as any

    const dailyRows = await c.env.DB.prepare(
      `SELECT s.ngay,
              COUNT(*) as tong,
              SUM(CASE WHEN g.gia_goc IS NOT NULL AND g.gia_goc > 0 AND s.don_gia = g.gia_goc THEN 1 ELSE 0 END) as bang,
              SUM(CASE WHEN g.gia_goc IS NOT NULL AND g.gia_goc > 0 AND s.don_gia > g.gia_goc THEN 1 ELSE 0 END) as thap,
              SUM(CASE WHEN g.gia_goc IS NOT NULL AND g.gia_goc > 0 AND s.don_gia < g.gia_goc THEN 1 ELSE 0 END) as cao,
              SUM(CASE WHEN g.gia_goc IS NULL OR g.gia_goc = 0 THEN 1 ELSE 0 END) as khong,
              SUM(COALESCE(s.doanh_so, 0)) as doanh_so
       FROM so_chi_tiet_ban_hang s
       LEFT JOIN ${subG} g ON s.ma_hang = g.ma_sp
       ${where}
       GROUP BY s.ngay
       ORDER BY s.ngay DESC`
    ).bind(...params).all()

    const r = totalRow || { tong_so_dong: 0, tong_don_hang: 0, tong_doanh_so: 0, co_gia_goc: 0, bang: 0, thap: 0, cao: 0, khong: 0 }
    const total = r.tong_so_dong || 0

    return c.json({
      tong_don_hang: r.tong_don_hang || 0,
      tong_so_dong: total,
      tong_doanh_so: r.tong_doanh_so || 0,
      stats: {
        co_gia_goc: r.co_gia_goc || 0,
        bang: { count: r.bang || 0, pct: total ? Math.round((r.bang / total) * 10000) / 100 : 0 },
        thap: { count: r.thap || 0, pct: total ? Math.round((r.thap / total) * 10000) / 100 : 0 },
        cao: { count: r.cao || 0, pct: total ? Math.round((r.cao / total) * 10000) / 100 : 0 },
        khong: { count: r.khong || 0, pct: total ? Math.round((r.khong / total) * 10000) / 100 : 0 },
      },
      daily: (dailyRows.results || [])
        .sort((a: any, b: any) => a.ngay.localeCompare(b.ngay)),
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default router
