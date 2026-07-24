import { crudRoutes } from '../helpers/crud'
export const router = crudRoutes({
  table: 'bang_gia_nhua_pvc',
  searchFields: ['loai', 'do_day', 'ma_sp'],
  orderBy: 'loai, tier, do_day',
})
