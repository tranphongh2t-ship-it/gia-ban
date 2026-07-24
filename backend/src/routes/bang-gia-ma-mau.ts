import { crudRoutes } from '../helpers/crud'
export const router = crudRoutes({
  table: 'bang_gia_ma_mau',
  searchFields: ['ma_mau', 'ten_mau', 'bang', 'nhom'],
  orderBy: 'bang, tier, nhom, id',
})
