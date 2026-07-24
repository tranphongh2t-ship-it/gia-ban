import { crudRoutes } from '../helpers/crud'
export const router = crudRoutes({ table: 'phu_thu', searchFields: ['loai_phu_phi', 'ma_hang', 'ten'] })
