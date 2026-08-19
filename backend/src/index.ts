import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { router as khachHangRouter } from './routes/khach-hang'
import { router as maMisaRouter } from './routes/ma-misa'
import { router as phuThuRouter } from './routes/phu-thu'
import { router as phanBoKhRouter } from './routes/phan-bo-kh'
import { router as danhSachKhachRouter } from './routes/danh-sach-khach'
import { router as bangGiaCkRouter } from './routes/bang-gia-ck'
import { router as auditLogRouter } from './routes/audit-log'
import { router as bangGiaCotGoRouter } from './routes/bang-gia-cot-go'
import bangGiaNewRouter from './routes/bang-gia-new'
import { router as bangGiaNhomMauRouter } from './routes/bang-gia-nhom-mau'
import { router as bangGiaMaMauRouter } from './routes/bang-gia-ma-mau'
import pricingRouter from './routes/pricing'
import importExportRouter from './routes/import-export'
import soChiTietBanHangRouter from './routes/so-chi-tiet-ban-hang'
import checkGiaGocCkRouter from './routes/check-gia-goc-ck'
import checkChietKhauRouter from './routes/check-chiet-khau'
import donHangExcelRouter from './routes/don-hang-excel'
import { router as giaVanTronRouter } from './routes/gia-van-tron'

import phanQuyenRouter from './routes/phan-quyen'
import syncRouter from './routes/sync'
import giaChuanRouter from './routes/gia-chuan'
import userPrefsRouter from './routes/user-prefs'
import bangGiaLockRouter from './routes/bang-gia-lock'
import chietKhauRouter from './routes/chiet-khau'

type Bindings = {
  DB: D1Database
  APP_VERSION?: string
  APP_INSTALLER_URL?: string
  APP_UPDATE_NOTES?: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors())

app.get('/api/health', (c) => c.json({ status: 'ok', version: '0.1.0', timestamp: new Date().toISOString() }))

// Endpoint cấp phần mềm desktop: trả về version mới nhất + link download installer.
// Cấu hình qua biến môi trường (vars) trong wrangler.toml:
//   APP_VERSION, APP_INSTALLER_URL, APP_UPDATE_NOTES
app.get('/api/app/update', (c) => {
  const version = c.env.APP_VERSION || '0.1.0'
  const url = c.env.APP_INSTALLER_URL || ''
  const notes = c.env.APP_UPDATE_NOTES || ''
  return c.json({ version, url, notes })
})

app.get('/api/db-check', async (c) => {
  try {
    const result = await c.env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()
    return c.json({ tables: result.results })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.route('/api/khach-hang', khachHangRouter)
app.route('/api/ma-misa', maMisaRouter)
app.route('/api/phu-thu', phuThuRouter)
app.route('/api/phan-bo-kh', phanBoKhRouter)
app.route('/api/danh-sach-khach', danhSachKhachRouter)
app.route('/api/bang-gia-ck', bangGiaCkRouter)
app.route('/api/audit-log', auditLogRouter)
app.route('/api/pricing', pricingRouter)
app.route('/api/import', importExportRouter)
app.route('/api/export', importExportRouter)
app.route('/api/bang-gia-cot-go', bangGiaCotGoRouter)
app.route('/api/bang-gia-new', bangGiaNewRouter)
app.route('/api/bang-gia-nhom-mau', bangGiaNhomMauRouter)
app.route('/api/bang-gia-ma-mau', bangGiaMaMauRouter)
app.route('/api/so-chi-tiet-ban-hang', soChiTietBanHangRouter)
app.route('/api/check-gia-goc-ck', checkGiaGocCkRouter)
app.route('/api/check-chiet-khau', checkChietKhauRouter)
app.route('/api/don-hang-excel', donHangExcelRouter)
app.route('/api/gia-van-tron', giaVanTronRouter)
app.route('/api/auth', phanQuyenRouter)
app.route('/api/sync', syncRouter)
app.route('/api/gia-chuan', giaChuanRouter)
app.route('/api/user-prefs', userPrefsRouter)
app.route('/api/bang-gia-lock', bangGiaLockRouter)
app.route('/api/chiet-khau', chietKhauRouter)

export default app


