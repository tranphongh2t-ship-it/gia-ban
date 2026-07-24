import { crudRoutes } from '../helpers/crud'
export const router = crudRoutes({ table: 'khach_hang', searchFields: ['ma_kh', 'ten_kh', 'dien_thoai'] })
