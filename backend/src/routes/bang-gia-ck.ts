import { crudRoutes } from '../helpers/crud'
export const router = crudRoutes({ table: 'bang_gia_ck', searchFields: ['loai', 'key_match', 'ghi_chu'] })
