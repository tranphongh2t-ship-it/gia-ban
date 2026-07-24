import { crudRoutes } from '../helpers/crud'
export const router = crudRoutes({
  table: 'bang_gia_cot_go',
  searchFields: ['loai', 'do_day', 'cap'],
  orderBy: 'loai, tier, do_day, cap',
})
