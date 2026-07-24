import { crudRoutes } from '../helpers/crud'
export const router = crudRoutes({
  table: 'bang_gia_nhom_mau',
  searchFields: ['bang', 'nhom'],
  orderBy: 'bang, tier, nhom',
})
