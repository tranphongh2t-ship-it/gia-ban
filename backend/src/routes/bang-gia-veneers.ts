import { crudRoutes } from '../helpers/crud'
export const router = crudRoutes({
  table: 'bang_gia_veneers',
  searchFields: ['loai', 'ten'],
  orderBy: 'loai, tier, ten',
})
