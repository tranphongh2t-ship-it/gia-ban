import { Hono } from 'hono'

type Bindings = { DB: D1Database }

const app = new Hono<{ Bindings: Bindings }>()

app.post('/api/seed', async (c) => {
  const db = c.env.DB

  // Seed phu_thu (từ dữ liệu Excel đã sửa)
  const phuthuRows = [
    { loai: 'Phụ phí phim', ma: 'ZPPMDUPLUSPHIM', ten: 'Durabo Plus - Phụ phí phim khác (WN/PL)', phi: 200000, note: 'Test' },
    { loai: 'Phụ phí phim', ma: 'ZPPMPLYPHIM', ten: 'Melamine plywood - Phụ Phí Phim', phi: 10000, note: 'Test' },
    { loai: 'Phụ phí số lượng', ma: 'ZPPDUPLUSSL', ten: 'Durabo Plus - Phụ Phỉ Số lượng < 10 tấm', phi: 1000000, note: 'Test' },
    { loai: 'Phụ phí số lượng', ma: 'ZPPMPLYSL', ten: 'Melamine plywood - Phụ Phí Số lượng < 10 tấm', phi: 1000000, note: 'Test' },
  ]

  for (const r of phuthuRows) {
    await db.prepare(
      'INSERT OR REPLACE INTO phu_thu (loai_phu_phi, ma_hang, ten, phi, ghi_chu) VALUES (?, ?, ?, ?, ?)'
    ).bind(r.loai, r.ma, r.ten, r.phi, r.note).run()
  }

  return c.json({ status: 'ok', phu_thu: phuthuRows.length })
})

// Seed OP1 discount table (từ CHIẾT KHẤU sheet - rows 13-47)
app.post('/api/seed/op1', async (c) => {
  const db = c.env.DB
  const thang = '06'
  const nam = '2026'

  const op1Data = [
    { nhom: 'MDFOKAL_98MAU', tinh: 0.2, ngoaithanh: 0.21, saigon: 0.23, xuongthuong: 0.2, xuongpremium: 0.2 },
    { nhom: 'MDFOKAL_REG', tinh: 0.09, ngoaithanh: 0.1, saigon: 0.12, xuongthuong: 0.07, xuongpremium: 0.09 },
    { nhom: 'MDFOKAL_MEL_VC', tinh: 0.04, ngoaithanh: 0.01, saigon: 0.01, xuongthuong: 0.01, xuongpremium: 0.01 },
    { nhom: 'MDFOKAL_MEL_REG', tinh: 0.01, ngoaithanh: 0.01, saigon: 0.01, xuongthuong: 0.0, xuongpremium: 0.0 },
    { nhom: 'CK_THANG_400TR', tinh: 0.03, ngoaithanh: 0.03, saigon: 0.03, xuongthuong: 0.0, xuongpremium: 0.0 },
    { nhom: 'VANTRON_LE', tinh: 0.1, ngoaithanh: 0.1, saigon: 0.1, xuongthuong: 0.0, xuongpremium: 0.0 },
    { nhom: 'VANTRON_KIEN', tinh: 0.15, ngoaithanh: 0.15, saigon: 0.15, xuongthuong: 0.1, xuongpremium: 0.1 },
    { nhom: 'GOGHEP_GT20', tinh: 0.03, ngoaithanh: 0.03, saigon: 0.03, xuongthuong: 0.0, xuongpremium: 0.0 },
  ]

  for (const r of op1Data) {
    const key = `${thang}/${nam}|${r.nhom}`
    const mappings = [
      { loai_kh: 'ĐẠI LÝ TỈNH', gt: r.tinh },
      { loai_kh: 'ĐẠI LÝ NGOẠI THÀNH', gt: r.ngoaithanh },
      { loai_kh: 'ĐẠI LÝ SÀI GÒN', gt: r.saigon },
      { loai_kh: 'XƯỞNG THƯỜNG', gt: r.xuongthuong },
      { loai_kh: 'XƯỞNG PREMIUM', gt: r.xuongpremium },
    ]
    for (const m of mappings) {
      await db.prepare(
        'INSERT OR REPLACE INTO bang_gia_ck (loai, key_match, loai_kh, gia_tri, loai_don_vi) VALUES (?, ?, ?, ?, ?)'
      ).bind('OP1', key, m.loai_kh, m.gt, 'percent').run()
    }
  }

  return c.json({ status: 'ok', op1_count: op1Data.length * 5 })
})

export default app
