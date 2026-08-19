import { Hono } from 'hono'
import { crudRoutes } from '../helpers/crud'

type Env = { Bindings: { DB: D1Database } }

const joinQuery = (table: string) =>
  `SELECT t.*, m.ten_sp AS ma_ten_sp, m.gia_goc AS gia_goc FROM ${table} t LEFT JOIN ma_misa m ON t.ma_sp = m.ma_sp`

const app = new Hono<Env>()

const tables = [
  { path: 'veneer', table: 'bang_gia_veneers', search: ['loai', 'ten', 'ma_sp'], listQuery: joinQuery('bang_gia_veneers'), defaultFilters: { ma_sp: 'VN%' } },
  { path: 'chi', table: 'bang_gia_chi', search: ['loai', 'ten', 'ma_sp'], listQuery: joinQuery('bang_gia_chi'), defaultFilters: { ma_sp: 'CHI%' } },
  { path: 'keo-nong', table: 'bang_gia_keo_nong', search: ['ma', 'ma_sp'], listQuery: joinQuery('bang_gia_keo_nong'), defaultFilters: { ma_sp: 'ZKEO%' } },
  { path: 'acrylic-foil', table: 'bang_gia_acrylic_foil', search: ['series', 'loai', 'ma_sp'], listQuery: joinQuery('bang_gia_acrylic_foil'), defaultFilters: { ma_sp: 'AC%' } },
  { path: 'van-phu-acrylic', table: 'bang_gia_van_phu_acrylic', search: ['series', 'phu', 'ma_sp'], listQuery: joinQuery('bang_gia_van_phu_acrylic'), defaultFilters: { ma_sp: 'AC%' } },
  { path: 'laminate-one', table: 'bang_gia_laminate_one', search: ['nhom', 'ma_mau', 'ma_sp'], listQuery: joinQuery('bang_gia_laminate_one'), defaultFilters: { ma_sp: 'LP%|LE%' } },
  { path: 'nhua-pvc', table: 'bang_gia_nhua_pvc', search: ['loai', 'ma_sp'], listQuery: joinQuery('bang_gia_nhua_pvc') },
  { path: 'pvc-film', table: 'bang_gia_pvc_film', search: ['loai', 'nhom_mau', 'ma_sp'], listQuery: joinQuery('bang_gia_pvc_film'), defaultFilters: { ma_sp: 'PVC%' } },
  { path: 'van-phu-pvc', table: 'bang_gia_van_phu_pvc', search: ['loai_cot', 'ma_sp'], listQuery: joinQuery('bang_gia_van_phu_pvc'), defaultFilters: { ma_sp: 'PVC%' } },
  { path: 'nhua-phu-mau', table: 'bang_gia_nhua_phu_mau', search: ['loai_cot', 'ma_sp'], listQuery: joinQuery('bang_gia_nhua_phu_mau'), defaultFilters: { ma_sp: 'GM%' } },
  { path: 'nhua-laminate', table: 'bang_gia_nhua_laminate', search: ['loai_cot', 'ma_sp'], listQuery: joinQuery('bang_gia_nhua_laminate'), defaultFilters: { ma_sp: 'LP%|LE%' } },
  { path: 'osb-laminate', table: 'bang_gia_osb_laminate', search: ['loai_cot', 'ma_sp'], listQuery: joinQuery('bang_gia_osb_laminate'), defaultFilters: { ma_sp: 'LP%|LE%' } },
  { path: 'mirror', table: 'bang_gia_mirror', search: ['loai', 'ten', 'ma_sp'], listQuery: joinQuery('bang_gia_mirror') },
  { path: 'gia-ban', table: 'gia_ban', search: ['ma_sp', 'ten_sp'], listQuery: `SELECT t.*, m.gia_goc AS gia_goc FROM gia_ban t LEFT JOIN ma_misa m ON t.ma_sp = m.ma_sp` },
  { path: 'ma-misa', table: 'ma_misa', search: ['ma_sp', 'ten_sp'], priceHistory: { historyTable: 'ma_misa_gia_history', priceCol: 'gia_goc', refCol: 'ma_sp' }, misaGiaSync: true },
]

tables.forEach(t => {
  const t2 = t as any
  const crud = crudRoutes({
    table: t2.table, searchFields: t2.search, orderBy: 'id DESC',
    listQuery: t2.listQuery, extraFilterMap: { ten_sp: 'm.ten_sp' },
    defaultFilters: t2.defaultFilters,
    ...(t2.priceHistory ? { priceHistory: t2.priceHistory } : {}),
    ...(t2.misaGiaSync ? { misaGiaSync: true } : {}),
  })
  app.route(`/${t2.path}`, crud)
})

export default app
