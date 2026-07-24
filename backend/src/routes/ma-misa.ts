import { crudRoutes } from '../helpers/crud'
export const router = crudRoutes({ table: 'ma_misa', searchFields: ['ma_sp', 'ten_sp'] })
