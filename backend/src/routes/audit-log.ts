import { crudRoutes } from '../helpers/crud'
export const router = crudRoutes({
  table: 'audit_log',
  searchFields: ['nhan_vien', 'bang', 'hanh_dong'],
  orderBy: 'thoi_gian DESC',
})
