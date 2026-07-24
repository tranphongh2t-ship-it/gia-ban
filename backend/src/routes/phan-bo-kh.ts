import { crudRoutes } from '../helpers/crud'
export const router = crudRoutes({ table: 'phan_bo_kh', searchFields: ['ma_kh', 'loai_op'] })
