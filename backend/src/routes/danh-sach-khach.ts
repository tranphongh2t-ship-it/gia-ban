import { crudRoutes } from '../helpers/crud'
export const router = crudRoutes({ table: 'danh_sach_khach', searchFields: ['ma_kh', 'ten_kh'], orderBy: 'ma_kh ASC' })
