import { Hono } from 'hono'
import { crudRoutes } from '../helpers/crud'

type Env = { Bindings: { DB: D1Database } }

const router = new Hono<Env>()

const crud = crudRoutes({
  table: 'don_hang_excel',
  idField: 'id',
  searchFields: ['so_dh', 'ten_kh', 'chi_tiet', 'dien_giai', 'nv_sale'],
  orderBy: 'id DESC',
})

router.route('/', crud)

export default router
