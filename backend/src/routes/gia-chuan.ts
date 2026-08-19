import { Hono } from 'hono'
import { crudRoutes } from '../helpers/crud'
import { removeAccents } from '../helpers/removeAccents'
import { isBangGiaLocked } from '../helpers/bangGiaLock'
import { currentThang, GIA_GOC_SYNC_TABLES, syncTableToMisaBulk, syncVmhVariantsToMisa } from '../helpers/giaGocSync'
import { MELAMINE_SP_INDEX } from '../data/melamine-sp-index'
import { MELAMINE_EFFECT_RULES, MELAMINE_GKT_RULES, MELAMINE_MISSING_COLORS } from '../data/melamine-gen-rules'
import { MELAMINE_220 } from '../data/melamine-220'
import { MEOK_SP_INDEX } from '../data/meok-sp-index'
import { VMH_SP_MAP } from '../data/vmh-sp-map'
import { VMH_VARIANT_MAP } from '../data/vmh-variant-map'

type Env = { Bindings: { DB: D1Database } }

const app = new Hono<Env>()

const tables = [
  {
    path: 'van-dam-okal',
    table: 'bang_gia_chuan_dam_okal',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'stt', label: 'STT' },
      { key: 'quy_cach', label: 'Quy cách 1220x2440 (mm)' },
      { key: 'e2', label: 'E2', type: 'number' },
      { key: 'veco_e1', label: 'VECO E1', type: 'number' },
      { key: 'veco_cp2', label: 'VECO CP2', type: 'number' },
      { key: 'veco_f4s', label: 'VECO F4S', type: 'number' },
      { key: 'hmr_e1', label: 'HMR E1', type: 'number' },
    ],
    searchFields: ['quy_cach'],
  },
  {
    path: 'van-mdf-hdf',
    table: 'bang_gia_chuan_mdf_hdf',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'stt', label: 'STT' },
      { key: 'quy_cach', label: 'Quy cách 1220x2440 (mm)' },
      { key: 'vn_ldf_e2', label: 'VN LDF E2', type: 'number' },
      { key: 'vn_mdf_e2', label: 'VN MDF E2', type: 'number' },
      { key: 'vn_mdf_cp2', label: 'VN MDF CP2', type: 'number' },
      { key: 'vn_hdf_hmr_e2', label: 'VN HDF HMR E2', type: 'number' },
      { key: 'vn_hdf_hmr_e1', label: 'VN HDF HMR E1', type: 'number' },
      { key: 'th_mdf_e2', label: 'TH MDF E2', type: 'number' },
      { key: 'th_hdf_hmr_e2', label: 'TH HDF HMR E2', type: 'number' },
      { key: 'vn_lmr_e2', label: 'VN LMR E2', type: 'number' },
      { key: 'vn_mmr_e2', label: 'VN MMR E2', type: 'number' },
      { key: 'vn_hmr_e2', label: 'VN HMR E2', type: 'number' },
      { key: 'vn_hmr_e1', label: 'VN HMR E1', type: 'number' },
      { key: 'vn_hmr_cp2', label: 'VN HMR CP2', type: 'number' },
      { key: 'th_mmr_e2', label: 'TH MMR E2', type: 'number' },
      { key: 'th_hmr_v313_e1', label: 'TH HMR V313 E1', type: 'number' },
    ],
    searchFields: ['quy_cach'],
  },
  {
    path: 'phu-thu-melamine',
    table: 'bang_gia_chuan_phu_thu_melamine',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'stt', label: 'STT' },
      { key: 'mo_ta', label: 'Mô tả' },
      { key: 'basic_1m', label: 'Basic 1 mặt', type: 'number' },
      { key: 'basic_2m', label: 'Basic 2 mặt', type: 'number' },
      { key: 'eco_1m', label: 'Eco 1 mặt', type: 'number' },
      { key: 'eco_2m', label: 'Eco 2 mặt', type: 'number' },
      { key: 'standard_1m', label: 'Standard 1 mặt', type: 'number' },
      { key: 'standard_2m', label: 'Standard 2 mặt', type: 'number' },
      { key: 'premium_wood_art_1m', label: 'Premium (Wood/Art) 1 mặt', type: 'number' },
      { key: 'premium_wood_art_2m', label: 'Premium (Wood/Art) 2 mặt', type: 'number' },
      { key: 'premium_color_1m', label: 'Premium (Màu) 1 mặt', type: 'number' },
      { key: 'premium_color_2m', label: 'Premium (Màu) 2 mặt', type: 'number' },
      { key: 'superb_1m', label: 'Superb 1 mặt' },
      { key: 'superb_2m', label: 'Superb 2 mặt' },
    ],
    searchFields: ['mo_ta'],
  },
  {
    path: 'mau-melamine',
    table: 'bang_gia_chuan_mau_melamine',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'stt', label: 'STT' },
      { key: 'nguon', label: 'Nguồn' },
      { key: 'nhom', label: 'Nhóm' },
      { key: 'loai', label: 'Loại' },
      { key: 'ma_mau', label: 'Mã màu' },
      { key: 'vi_tri', label: 'Vị trí' },
    ],
    searchFields: ['ma_mau', 'nhom', 'loai'],
    defaultFilters: { nguon: '220' },
  },
  {
    path: 'osb',
    table: 'bang_gia_chuan_osb',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'stt', label: 'STT' },
      { key: 'mo_ta', label: 'Mô tả' },
      { key: 'do_day', label: 'Độ dày' },
      { key: 'gia', label: 'Giá gốc', type: 'number' },
      { key: 'gia_da_ck_10', label: 'Đã CK 10%', type: 'number' },
      { key: 'gia_da_ck_15', label: 'Đã CK 15%', type: 'number' },
      { key: 'gia_chua_ck_10', label: 'Chưa CK 10%', type: 'number' },
      { key: 'gia_chua_ck_15', label: 'Chưa CK 15%', type: 'number' },
      { key: 'tam_kien', label: 'Tấm/kiện', type: 'number' },
    ],
    searchFields: ['mo_ta', 'do_day'],
  },
  {
    path: 'van-ep',
    table: 'bang_gia_chuan_van_ep',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'stt', label: 'STT' },
      { key: 'quy_cach', label: 'Độ dày' },
      { key: 'kt_1000x2000', label: 'Ash/mỡ CD 1000x2000', type: 'number' },
      { key: 'kt_1220x2440', label: 'Ash/mỡ CD 1220x2440', type: 'number' },
    ],
    searchFields: ['quy_cach'],
  },
  {
    path: 'van-ep-khac',
    table: 'bang_gia_chuan_van_ep_khac',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'stt', label: 'STT' },
      { key: 'quy_cach', label: 'Độ dày' },
      { key: 'loai', label: 'Loại' },
      { key: 'gia', label: 'Giá', type: 'number' },
      { key: 'nhom', label: 'Nhóm' },
    ],
    searchFields: ['quy_cach', 'loai', 'nhom'],
  },
  {
    path: 'go-ghep',
    table: 'bang_gia_chuan_go_ghep',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'stt', label: 'STT' },
      { key: 'quy_cach', label: 'Quy cách 1200x2400 (mm)' },
      { key: 'cao_su_aa_ab', label: 'Cao Su AA/AB', type: 'number' },
      { key: 'cao_su_ac', label: 'Cao Su AC', type: 'number' },
      { key: 'cao_su_bc', label: 'Cao Su BC', type: 'number' },
      { key: 'cao_su_cc', label: 'Cao Su CC', type: 'number' },
      { key: 'thong_nzl_aa', label: 'Thông NZL AA', type: 'number' },
    ],
    searchFields: ['quy_cach'],
  },
  {
    path: 'phu-veneer',
    table: 'bang_gia_chuan_phu_veneer',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'stt', label: 'STT' },
      { key: 'quy_cach', label: 'Quy cách 1220x2440 (mm)' },
      { key: 'xoan_1m', label: 'Xoan 1 mặt', type: 'number' },
      { key: 'xoan_2m', label: 'Xoan 2 mặt', type: 'number' },
      { key: 'soi_1m', label: 'Sồi 1 mặt', type: 'number' },
      { key: 'soi_2m', label: 'Sồi 2 mặt', type: 'number' },
      { key: 'soi_kt_1m', label: 'Sồi KT 1 mặt', type: 'number' },
      { key: 'soi_kt_2m', label: 'Sồi KT 2 mặt', type: 'number' },
      { key: 'oc_cho_kt_1m', label: 'Óc Chó KT 1 mặt', type: 'number' },
      { key: 'oc_cho_kt_2m', label: 'Óc Chó KT 2 mặt', type: 'number' },
    ],
    searchFields: ['quy_cach'],
  },
  {
    path: 'pvc-film-dura',
    table: 'bang_gia_chuan_pvc_film_dura',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'ma_mau', label: 'Mã màu' },
      { key: 'nhom', label: 'Nhóm' },
      { key: 'loai', label: 'Loại' },
      { key: 'thong_so', label: 'Thông số' },
    ],
    searchFields: ['ma_mau', 'nhom', 'loai'],
  },
  {
    path: 'van-phu-pvc-petg',
    table: 'bang_gia_chuan_van_phu_pvc_petg',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'stt', label: 'STT' },
      { key: 'loai_van', label: 'Loại ván' },
      { key: 'do_day', label: 'Độ dày' },
      { key: 'gia_uu_dai_1m', label: 'Ưu đãi 1 mặt', type: 'number' },
      { key: 'gia_uu_dai_2m', label: 'Ưu đãi 2 mặt', type: 'number' },
      { key: 'gia_standard_1m', label: 'Standard 1 mặt', type: 'number' },
      { key: 'gia_standard_2m', label: 'Standard 2 mặt', type: 'number' },
      { key: 'gia_premium_1m', label: 'Premium 1 mặt', type: 'number' },
      { key: 'gia_premium_2m', label: 'Premium 2 mặt', type: 'number' },
      { key: 'gia_petg_1m', label: 'PETG 1 mặt', type: 'number' },
      { key: 'gia_petg_2m', label: 'PETG 2 mặt', type: 'number' },
    ],
    searchFields: ['loai_van', 'do_day'],
  },
  {
    path: 'durabo',
    table: 'bang_gia_chuan_durabo',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'stt', label: 'STT' },
      { key: 'quy_cach', label: 'Quy cách' },
      { key: 'loai', label: 'Loại' },
      { key: 'nhom', label: 'Nhóm' },
      { key: 'gia', label: 'Giá', type: 'number' },
      { key: 'dong_goi', label: 'Đóng gói' },
    ],
    searchFields: ['quy_cach', 'loai', 'nhom'],
  },
  {
    path: 'mau-melamine-2',
    table: 'bang_gia_chuan_mau_melamine_2',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'ma_mau', label: 'Mã màu' },
      { key: 'nhom', label: 'Nhóm' },
      { key: 'phan_nhom', label: 'Phân nhóm' },
    ],
    searchFields: ['ma_mau', 'nhom', 'phan_nhom'],
  },
  {
    path: 'melamine-plywood',
    table: 'bang_gia_chuan_melamine_plywood',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'stt', label: 'STT' },
      { key: 'loai_cot', label: 'Loại cốt' },
      { key: 'do_day', label: 'Độ dày' },
      { key: 'gia_sang_trung', label: 'Giá Sáng/Trung', type: 'number' },
      { key: 'gia_toi', label: 'Giá Tối', type: 'number' },
      { key: 'gia_don_sac_101', label: 'Đơn sắc 101', type: 'number' },
      { key: 'gia_don_sac_khac_da', label: 'Đơn sắc khác đá', type: 'number' },
      { key: 'gia_don_sac_106', label: 'Đơn sắc 106', type: 'number' },
    ],
    searchFields: ['loai_cot', 'do_day'],
  },
  {
    path: 'melamine-nhua-osb-ghep',
    table: 'bang_gia_chuan_melamine_nhua_osb_ghep',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'stt', label: 'STT' },
      { key: 'loai_cot', label: 'Loại cốt' },
      { key: 'do_day', label: 'Độ dày' },
      { key: 'gia_sang_trung', label: 'Giá 2 mặt Sáng/Trung', type: 'number' },
      { key: 'gia_1m_sang_trung', label: 'Giá 1 mặt Sáng/Trung', type: 'number', readOnly: true },
      { key: 'gia_toi_don_sac', label: 'Giá 2 mặt Tối/Đơn sắc', type: 'number' },
      { key: 'gia_1m_toi_don_sac', label: 'Giá 1 mặt Tối/Đơn sắc', type: 'number', readOnly: true },
      { key: 'gia_chum_104_106', label: 'Giá 2 mặt chùm 104/106', type: 'number' },
      { key: 'gia_1m_chum_104_106', label: 'Giá 1 mặt chùm 104/106', type: 'number', readOnly: true },
      { key: 'giam_tru_sang_trung', label: 'Giảm trừ Sáng/Trung', type: 'number', readOnly: true },
      { key: 'giam_tru_toi_don_sac', label: 'Giảm trừ Tối/Đơn sắc', type: 'number', readOnly: true },
      { key: 'giam_tru_chum_104_106', label: 'Giảm trừ chùm 104/106', type: 'number', readOnly: true },
    ],
    searchFields: ['loai_cot', 'do_day'],
    listQuery: `SELECT t.*, t.gia_sang_trung - COALESCE(d.giam_tru_sang_trung, 0) AS gia_1m_sang_trung, t.gia_toi_don_sac - COALESCE(d.giam_tru_toi_don_sac, 0) AS gia_1m_toi_don_sac, t.gia_chum_104_106 - COALESCE(d.giam_tru_chum_104_106, 0) AS gia_1m_chum_104_106 FROM bang_gia_chuan_melamine_nhua_osb_ghep t LEFT JOIN bang_gia_chuan_melamine_nhua_osb_ghep d ON d.loai_cot = 'Phủ 1 mặt giảm trừ'`,
    orderBy: 't.stt ASC, t.id ASC',
  },
  {
    path: '98-mau-melamine',
    table: 'bang_gia_chuan_98_mau',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'stt', label: 'STT' },
      { key: 'wood_1', label: 'Wood 1' },
      { key: 'wood_2', label: 'Wood 2' },
      { key: 'wood_3', label: 'Wood 3' },
      { key: 'wood_4', label: 'Wood 4' },
      { key: 'wood_5', label: 'Wood 5' },
      { key: 'wood_6', label: 'Wood 6' },
      { key: 'wood_7', label: 'Wood 7' },
      { key: 'art', label: 'Art' },
      { key: 'color_code', label: 'Art' },
      { key: 'color_name', label: 'Color' },
    ],
    searchFields: ['color_name', 'color_code'],
  },
  {
    path: 'veneer',
    table: 'bang_gia_chuan_veneer',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'stt', label: 'STT' },
      { key: 'loai', label: 'Loại' },
      { key: 'be_mat', label: 'Bề mặt' },
      { key: 'gia_1m_a', label: 'Giá 1 mặt A', type: 'number' },
      { key: 'gia_1m_b', label: 'Giá 1 mặt B', type: 'number' },
      { key: 'gia_2m', label: 'Giá 2 mặt AB/AA', type: 'number' },
      { key: 'ma_sp', label: 'Mã SP' },
      { key: 'ten_sp', label: 'Mô tả SP' },
    ],
    searchFields: ['be_mat', 'loai', 'ma_sp', 'ten_sp'],
  },
  {
    path: 'mat-phu-khac',
    table: 'bang_gia_chuan_mat_phu_khac',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'stt', label: 'STT' },
      { key: 'ten', label: 'Tên' },
      { key: 'gia_1m', label: 'Giá 1 mặt', type: 'number' },
      { key: 'gia_2m', label: 'Giá 2 mặt', type: 'number' },
      { key: 'ghi_chu', label: 'Ghi chú' },
      { key: 'ma_sp', label: 'Mã SP' },
      { key: 'ten_sp', label: 'Mô tả SP' },
    ],
    searchFields: ['ten', 'ma_sp', 'ten_sp'],
  },
  {
    path: 'acrylic',
    table: 'bang_gia_chuan_acrylic',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'stt', label: 'STT' },
      { key: 'series', label: 'Series' },
      { key: 'ma_mau', label: 'Mã màu' },
      { key: 'loai_mau', label: 'Loại màu' },
      { key: 'gia', label: 'Giá/tờ', type: 'number' },
    ],
    searchFields: ['ma_mau', 'loai_mau', 'series'],
  },
  {
    path: 'van-phu-acrylic',
    table: 'bang_gia_chuan_van_phu_acrylic',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'stt', label: 'STT' },
      { key: 'series', label: 'Series' },
      { key: 'phu', label: 'Phủ' },
      { key: 'board_type', label: 'Loại ván' },
      { key: 'gia_ds', label: 'Giá Đơn sắc', type: 'number' },
      { key: 'gia_ak', label: 'Giá Ánh kim', type: 'number' },
      { key: 'gia_vg', label: 'Giá Vân gỗ', type: 'number' },
    ],
    searchFields: ['phu', 'board_type', 'series'],
  },
  {
    path: 'one-laminate',
    table: 'bang_gia_chuan_one_laminate',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'stt', label: 'STT' },
      { key: 'nhom', label: 'Nhóm' },
      { key: 'ma_mau', label: 'Mã màu' },
      { key: 'gia_foil', label: 'Giá foil', type: 'number' },
    ],
    searchFields: ['ma_mau', 'nhom'],
  },
  {
    path: 'van-nhua-phu-hpl',
    table: 'bang_gia_chuan_van_nhua_phu_hpl',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'stt', label: 'STT' },
      { key: 'loai_van', label: 'Loại ván' },
      { key: 'do_day', label: 'Độ dày' },
      { key: 'do_day_tp', label: 'Độ dày TP' },
      { key: 'gia_1m_le1', label: '1m LE1', type: 'number' },
      { key: 'gia_1m_le2', label: '1m LE2', type: 'number' },
      { key: 'gia_1m_lp1', label: '1m LP1', type: 'number' },
      { key: 'gia_1m_lp2', label: '1m LP2', type: 'number' },
      { key: 'gia_1m_lp3', label: '1m LP3', type: 'number' },
      { key: 'gia_2m_le1', label: '2m LE1', type: 'number' },
      { key: 'gia_2m_le2', label: '2m LE2', type: 'number' },
      { key: 'gia_2m_lp1', label: '2m LP1', type: 'number' },
      { key: 'gia_2m_lp2', label: '2m LP2', type: 'number' },
      { key: 'gia_2m_lp3', label: '2m LP3', type: 'number' },
    ],
    searchFields: ['loai_van'],
  },
  {
    path: 'osb-ghep-ep-phu-hpl',
    table: 'bang_gia_chuan_osb_ghep_ep_phu_hpl',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'stt', label: 'STT' },
      { key: 'loai_van', label: 'Loại ván' },
      { key: 'do_day', label: 'Độ dày' },
      { key: 'do_day_tp', label: 'Độ dày TP' },
      { key: 'gia_1m_le1', label: '1m LE1', type: 'number' },
      { key: 'gia_1m_le2', label: '1m LE2', type: 'number' },
      { key: 'gia_1m_lp1', label: '1m LP1', type: 'number' },
      { key: 'gia_1m_lp2', label: '1m LP2', type: 'number' },
      { key: 'gia_1m_lp3', label: '1m LP3', type: 'number' },
      { key: 'gia_2m_le1', label: '2m LE1', type: 'number' },
      { key: 'gia_2m_le2', label: '2m LE2', type: 'number' },
      { key: 'gia_2m_lp1', label: '2m LP1', type: 'number' },
      { key: 'gia_2m_lp2', label: '2m LP2', type: 'number' },
      { key: 'gia_2m_lp3', label: '2m LP3', type: 'number' },
    ],
    searchFields: ['loai_van'],
  },
  {
    path: 'mirror',
    table: 'bang_gia_chuan_mirror',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'stt', label: 'STT' },
      { key: 'nguon', label: 'Nguồn' },
      { key: 'loai', label: 'Loại' },
      { key: 'quy_cach', label: 'Quy cách' },
      { key: 'gia_1m', label: 'Giá 1 mặt', type: 'number' },
      { key: 'gia_2m', label: 'Giá 2 mặt', type: 'number' },
    ],
    searchFields: ['nguon', 'loai', 'quy_cach'],
  },
  {
    path: 'chi-nep',
    table: 'bang_gia_chuan_chi_nep',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'stt', label: 'STT' },
      { key: 'nhom', label: 'Nhóm' },
      { key: 'ma_sp', label: 'Mã SP' },
      { key: 'kich_thuoc', label: 'Kích thước' },
      { key: 'gia', label: 'Giá', type: 'number' },
    ],
    searchFields: ['ma_sp', 'nhom', 'kich_thuoc'],
  },
  {
    path: 'keo-hat',
    table: 'bang_gia_chuan_keo_hat',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'stt', label: 'STT' },
      { key: 'ma', label: 'Mã' },
      { key: 'nhiet_do', label: 'Nhiệt độ' },
      { key: 'mau', label: 'Màu' },
      { key: 'gia_1kg', label: 'Giá 1 ký', type: 'number' },
      { key: 'gia_25kg', label: 'Giá bao 25 ký', type: 'number' },
    ],
    searchFields: ['ma', 'mau'],
  },
]

tables.forEach(t => {
  const crud = crudRoutes({
    table: t.table,
    searchFields: t.searchFields,
    orderBy: (t as any).orderBy || 'stt ASC, id ASC',
    ...(t as any).listQuery ? { listQuery: (t as any).listQuery } : {},
    lockable: true,
    numericHistory: { historyTable: 'gia_chuan_gia_history', bang: t.table },
    // Chiều A: bảng có ma_sp + cột giá (veneer, mat-phu-khac, mirror, chi-nep, keo-hat)
    // → đổi giá tự push lên ma_misa.gia_goc + lịch sử
    giaGocSync: GIA_GOC_SYNC_TABLES.find(s => s.table === t.table),
  })
  app.route(`/${t.path}`, crud)
})

// Lịch sử giá gia-chuan: ?path=&bang=&ref_id=&cot=&thang=
app.get('/lich-su', async (c) => {
  try {
    const { path, bang, ref_id, cot, thang } = c.req.query()
    let tableBang = bang
    if (path && !tableBang) {
      const t = tables.find(t => t.path === path)
      tableBang = t?.table ?? ''
      if (!tableBang) return c.json({ error: `Không tìm thấy bảng: ${path}` }, 404)
    }
    if (!tableBang) return c.json({ error: 'Thiếu tham số path hoặc bang' }, 400)
    let sql = 'SELECT * FROM gia_chuan_gia_history WHERE bang = ?'
    const params: any[] = [tableBang]
    if (ref_id) { sql += ' AND ref_id = ?'; params.push(Number(ref_id)) }
    if (cot) { sql += ' AND cot = ?'; params.push(cot) }
    if (thang) { sql += ' AND thang = ?'; params.push(thang) }
    sql += ' ORDER BY thang DESC, id DESC LIMIT 200'
    const res = await c.env.DB.prepare(sql).bind(...params).all()
    return c.json({ data: res.results })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.get('/danh-sach', async (c) => {
  return c.json({
    tables: tables.map(t => ({
      path: t.path,
      label: t.table.replace('bang_gia_chuan_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      columns: t.columns,
    })),
  })
})

// ====== Tính giá gốc VÁN DĂM OKAL ======
const BOARD_GRADES = [
  { key: 'e2', label: 'E2' },
  { key: 'veco_e1', label: 'VECO E1' },
  { key: 'veco_cp2', label: 'VECO CP2' },
  { key: 'veco_f4s', label: 'VECO F4S' },
  { key: 'hmr_e1', label: 'HMR E1' },
]

// ====== Normalize mã màu (khớp giữa bảng 220 và tên MISA) ======
function normColorKey(s: string): string {
  return String(s || '').trim().toUpperCase().replace(/[\s\-\.'’]/g, '')
}

// ====== Compute helper: mở rộng theo Nhóm màu Melamine 220 ======
// Mỗi dòng = (độ dày × loại ván × 1 màu 220 × số mặt), giá = board_gia + phụ thu của màu
// plainLabels: các loại ván TRƠN (VD TH-grade HDF HMR) chỉ có 1 dòng/quy cách, không màu, không phụ thu
async function computeTinhGia(
  db: D1Database,
  sourceTable: string,
  destTable: string,
  grades: { key: string; label: string }[],
  plainLabels: string[] = [],
) {
  const [boardRows, phuThuRows] = await Promise.all([
    db.prepare(`SELECT * FROM ${sourceTable} ORDER BY stt`).all(),
    db.prepare('SELECT * FROM bang_gia_chuan_phu_thu_melamine ORDER BY stt').all(),
  ])

  const boards = boardRows.results as any[]
  const phuThus = phuThuRows.results as any[]
  const phuThuDonGia = phuThus.find(r => r.stt === 1)
  const phuThuDacBiet = phuThus.find(r => r.stt === 3)
  const plainSet = new Set(plainLabels)

  // Lưu mã MISA đã gán (ma_sp/ten_sp) trước khi xóa để tái gắn sau khi tính lại giá,
  // tránh việc "Tính toán" xóa sạch mã đã auto-assign.
  const existing = await db.prepare(
    `SELECT board_quy_cach, board_loai, ma_mau, so_mat, ma_sp, ten_sp FROM ${destTable} WHERE ma_sp IS NOT NULL AND ma_sp != ''`
  ).all()
  const spByKey = new Map<string, { ma_sp: string; ten_sp: string }>()
  for (const r of (existing.results || []) as any[]) {
    spByKey.set(`${r.board_quy_cach}|${r.board_loai}|${r.ma_mau}|${r.so_mat}`, { ma_sp: r.ma_sp, ten_sp: r.ten_sp })
  }

  await db.prepare(`DELETE FROM ${destTable}`).run()

  const inserts: any[] = []
  for (const board of boards) {
    for (const grade of grades) {
      const boardGia = board[grade.key]
      if (boardGia === null || boardGia === undefined) continue

      // Ván trơn: 1 dòng/quy cách, không màu, giá gốc = board_gia (không cộng phụ thu màu)
      if (plainSet.has(grade.label)) {
        inserts.push({
          board_quy_cach: board.quy_cach,
          board_loai: grade.label,
          board_gia: boardGia,
          ma_mau: '',
          color_nhom: '',
          color_loai: '',
          so_mat: 1,
          phu_thu_loai: '',
          phu_thu_gia: 0,
          tong_gia: boardGia,
        })
        continue
      }

      for (const color of MELAMINE_220) {
        for (const soMat of [1, 2]) {
          let phuThuGia: number | null = null
          if (color.special) {
            phuThuGia = soMat === 1 ? phuThuDacBiet.superb_1m : phuThuDacBiet.superb_2m
          } else {
            const col1m = `${color.phuThuKey}_1m`
            const col2m = `${color.phuThuKey}_2m`
            if (phuThuDonGia) {
              phuThuGia = soMat === 1 ? phuThuDonGia[col1m] : phuThuDonGia[col2m]
            }
          }

          if (phuThuGia === null || phuThuGia === undefined) continue
          if (typeof phuThuGia !== 'number') continue

          inserts.push({
            board_quy_cach: board.quy_cach,
            board_loai: grade.label,
            board_gia: boardGia,
            ma_mau: color.ma_mau,
            color_nhom: color.nhom,
            color_loai: color.loai,
            so_mat: soMat,
            phu_thu_loai: color.special ? 'superb_dacbiet' : color.phuThuKey,
            phu_thu_gia: phuThuGia,
            tong_gia: boardGia + phuThuGia,
          })
        }
      }
    }
  }

  const batchSize = 100
  for (let i = 0; i < inserts.length; i += batchSize) {
    const batch = inserts.slice(i, i + batchSize)
    const stmts = batch.map(row => {
      const sp = spByKey.get(`${row.board_quy_cach}|${row.board_loai}|${row.ma_mau}|${row.so_mat}`)
      return db.prepare(
        `INSERT INTO ${destTable} (board_quy_cach, board_loai, board_gia, ma_mau, color_nhom, color_loai, so_mat, phu_thu_loai, phu_thu_gia, tong_gia, ma_sp, ten_sp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(row.board_quy_cach, row.board_loai, row.board_gia, row.ma_mau, row.color_nhom, row.color_loai, row.so_mat, row.phu_thu_loai, row.phu_thu_gia, row.tong_gia, sp?.ma_sp || null, sp?.ten_sp || null)
    })
    await db.batch(stmts)
  }

  return inserts.length
}

// ====== VÁN DĂM OKAL ======
// MEOK không có mã riêng cho VECO E1 → bỏ qua (để trống), các loại khác gán đúng
const VDO_LOAI_MAP: Record<string, string> = {
  E2: 'E2',
  'VECO CP2': 'VECO CP2',
  'VECO F4S': 'VECO F4S',
  'HMR E1': 'HMR E1',
}

app.post('/tinh-gia-vdo/tinh-toan', async (c) => {
  try {
    const total = await computeTinhGia(c.env.DB, 'bang_gia_chuan_dam_okal', 'bang_gia_chuan_tinh_gia_vdo', BOARD_GRADES)
    const synced = await syncTableToMisaBulk(c.env.DB, GIA_GOC_SYNC_TABLES.find(s => s.table === 'bang_gia_chuan_tinh_gia_vdo')!)
    return c.json({ success: true, total, synced })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})

// ==== Bộ sinh mã MEOK theo cấu trúc (fallback khi index thiếu) ====
// Cấu trúc: MEOK{độ_dày}{grade}{màu}{hiệu_ứng}{số_mặt}{bề_mặt}
// grade token theo loại ván (CP2/F4S/CT/CTE1 hoặc rỗng cho E2)
const MEOK_GRADE_TOKEN: Record<string, string> = {
  'VECO CP2': 'CP2',
  'VECO F4S': 'F4S',
  'HMR E1': 'CT',
}
// Bề mặt mặc định theo (độ dày, grade) — ước lượng từ index thật
const MEOK_SURFACE: Record<string, string> = {
  '9|': 'VCC', '9|CP2': 'VC', '9|F4S': 'VC', '9|CT': 'VCC',
  '12|': 'VCC', '12|CP2': 'VC', '12|F4S': 'VC', '12|CT': 'VCC',
  '15|': 'TL', '15|CP2': 'VC', '15|F4S': 'VC', '15|CT': 'VCC',
  '16|': 'VCC', '16|CP2': 'VC', '16|F4S': 'VC', '16|CT': 'VCC',
  '17|': 'TL', '17|CP2': 'VC', '17|F4S': 'VC', '17|CT': 'VCC',
  '18|': 'TL', '18|CP2': 'VC', '18|F4S': 'VC', '18|CT': 'VCC',
  '25|': 'ID', '25|CP2': 'VC', '25|F4S': 'VC', '25|CT': 'VCC',
}
// Hiệu ứng thống kê từ index thật theo từng màu (ưu tiên hiệu ứng phổ biến nhất)
const MEOK_EFFECT_BY_COLOR: Record<string, string> = (() => {
  const dist: Record<string, Record<string, number>> = {}
  const res: Record<string, string> = {}
  for (const key of Object.keys(MEOK_SP_INDEX)) {
    const code = MEOK_SP_INDEX[key][0].replace(/^MEOK/, '')
    let rest = code.replace(/^\d{2}/, '')
    if (/^CP2/.test(rest)) rest = rest.slice(3)
    else if (/^F4S/.test(rest)) rest = rest.slice(3)
    else if (/^CTE\d?1/.test(rest)) rest = rest.replace(/^CTE\d?1/, '')
    else if (/^CT/.test(rest)) rest = rest.slice(2)
    const m = rest.match(/^(.*?)(?:\d)([A-Z]{2,})((?:\d)([A-Z]+))?$/)
    if (!m) continue
    const color = m[1]
    const effect = m[2]
    if (!dist[color]) dist[color] = {}
    dist[color][effect] = (dist[color][effect] || 0) + 1
  }
  for (const color of Object.keys(dist)) {
    const top = Object.entries(dist[color]).sort((a, b) => b[1] - a[1])[0]
    if (top) res[color] = top[0]
  }
  return res
})()

function meokColorToken(maMau: string): string {
  // mã màu số giữ nguyên; mã tiếng Việt/Đ-* bỏ dấu, Đ->D, in hoa
  const s = normColorKey(maMau).replace(/Đ/g, 'D')
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
function genMeokCode(doDay: string, loai: string, maMau: string, soMat: number): { ma_sp: string; ten_sp: string } {
  const grade = MEOK_GRADE_TOKEN[loai] || ''
  const color = meokColorToken(maMau)
  const effect = MEOK_EFFECT_BY_COLOR[color] || 'T'
  const surface = MEOK_SURFACE[`${doDay}|${grade}`] || 'VCC'
  const ma_sp = `MEOK${doDay}${grade}${color}${effect}${soMat}${surface}`
  const loaiLabel: Record<string, string> = {
    E2: '', 'VECO CP2': 'Carb P2 VC', 'VECO F4S': 'F4S VC', 'HMR E1': 'kháng ẩm HMR VC',
  }
  const ten_sp = `Okal ${doDay}mm x1220x2440 ${loaiLabel[loai] || loai} MEL ${maMau} ${effect} ${soMat} mặt`
  return { ma_sp, ten_sp }
}

// Auto-assign Mã MISA cho VDO dựa trên MEOK_SP_INDEX (ưu tiên hiệu ứng T), fallback sinh theo cấu trúc
app.post('/tinh-gia-vdo/auto-assign-ma-sp', async (c) => {
  try {
    const db = c.env.DB
    const { results } = await db.prepare('SELECT * FROM bang_gia_chuan_tinh_gia_vdo').all()
    const rows = results as any[]
    const toAssign: { id: number; ma_sp: string; ten_sp: string }[] = []
    const usedMasp = new Set<string>()
    let skipped = 0
    let fromIndex = 0
    let generated = 0

    for (const r of rows) {
      const doDay = String(r.board_quy_cach || '').replace(/mm/gi, '').trim()
      const loai = VDO_LOAI_MAP[r.board_loai] || r.board_loai
      const mauKey = normColorKey(r.ma_mau)
      const key = `${doDay}|${loai}|${mauKey}|${r.so_mat}`
      const hit = MEOK_SP_INDEX[key]
      let result: { ma_sp: string; ten_sp: string } | null = null
      let viaIndex = false
      if (hit) {
        result = { ma_sp: hit[0], ten_sp: hit[1] }
        viaIndex = true
      } else if (loai !== 'VECO E1') {
        // VECO E1 không có mã riêng -> để trống; các loại khác sinh theo cấu trúc
        result = genMeokCode(doDay, loai, r.ma_mau, r.so_mat)
      }
      if (result && !usedMasp.has(result.ma_sp)) {
        usedMasp.add(result.ma_sp)
        toAssign.push({ id: r.id, ma_sp: result.ma_sp, ten_sp: result.ten_sp })
        if (viaIndex) fromIndex++; else generated++
      } else skipped++
    }

    const updChunk = 30
    for (let i = 0; i < toAssign.length; i += updChunk) {
      const chunk = toAssign.slice(i, i + updChunk)
      const stmts = chunk.map(g =>
        db.prepare('UPDATE bang_gia_chuan_tinh_gia_vdo SET ma_sp = ?, ten_sp = ? WHERE id = ?').bind(g.ma_sp, g.ten_sp, g.id)
      )
      await db.batch(stmts)
    }

    return c.json({ success: true, assigned: toAssign.length, skipped, fromIndex, generated })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})

app.get('/tinh-gia-vdo', async (c) => {
  const db = c.env.DB
  const { results } = await db.prepare('SELECT * FROM bang_gia_chuan_tinh_gia_vdo ORDER BY board_quy_cach, board_loai, ma_mau, so_mat').all()
  return c.json({ data: results, total: results.length })
})

// ====== VÁN MDF HDF ======
const MDF_GRADES = [
  { key: 'vn_ldf_e2', label: 'VN LDF E2' },
  { key: 'vn_mdf_e2', label: 'VN MDF E2' },
  { key: 'vn_mdf_cp2', label: 'VN MDF CP2' },
  { key: 'vn_hdf_hmr_e2', label: 'VN HDF HMR E2' },
  { key: 'vn_hdf_hmr_e1', label: 'VN HDF HMR E1' },
  { key: 'th_mdf_e2', label: 'TH MDF E2' },
  { key: 'th_hdf_hmr_e2', label: 'TH HDF HMR E2' },
  { key: 'vn_lmr_e2', label: 'VN LMR E2' },
  { key: 'vn_mmr_e2', label: 'VN MMR E2' },
  { key: 'vn_mmr_e2', label: 'VN MMR MK' },
  { key: 'th_mmr_e2', label: 'VN MMR TL' },
  { key: 'vn_mmr_e2', label: 'VN MMR TT' },
  { key: 'vn_hmr_e2', label: 'VN HMR E2' },
  { key: 'vn_hmr_e1', label: 'VN HMR E1' },
  { key: 'vn_hmr_cp2', label: 'VN HMR CP2' },
  { key: 'th_mmr_e2', label: 'TH MMR E2' },
  { key: 'th_hmr_v313_e1', label: 'TH HMR V313 E1' },
]

// Các loại ván TRƠN (TH-grade) — chỉ 1 dòng/quy cách, không màu, không phụ thu (T-mã ván trơn)
const MDF_PLAIN_LABELS = ['TH MDF E2', 'TH HDF HMR E2', 'TH MMR E2', 'TH HMR V313 E1']

// Tìm T-mã ván trơn theo loại + độ dày (bất kể màu/số mặt) — quét prefix key "loai|dd|" trong VMH_SP_MAP
function findVmhPlain(boardLoai: string, doDay: string): [string, string] | undefined {
  const prefix = `${boardLoai}|${doDay}|`
  for (const [k, v] of Object.entries(VMH_SP_MAP)) {
    if (k.startsWith(prefix)) return v
  }
  return undefined
}

app.post('/tinh-gia-vmh/tinh-toan', async (c) => {
  try {
    const total = await computeTinhGia(c.env.DB, 'bang_gia_chuan_mdf_hdf', 'bang_gia_chuan_tinh_gia_vmh', MDF_GRADES, MDF_PLAIN_LABELS)
    const synced = await syncTableToMisaBulk(c.env.DB, GIA_GOC_SYNC_TABLES.find(s => s.table === 'bang_gia_chuan_tinh_gia_vmh')!)
    const v = await syncVmhVariantsToMisa(c.env.DB, VMH_SP_MAP, VMH_VARIANT_MAP)
    return c.json({ success: true, total, synced, syncedVariants: v.variants })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})

// Auto-assign Mã MISA cho VMH: dùng VMH_SP_MAP (VN → ME-mã exact LINE; TH → T-mã ván trơn)
app.post('/tinh-gia-vmh/auto-assign-ma-sp', async (c) => {
  try {
    const db = c.env.DB
    // Lấp mã từ VMH_SP_MAP (VN → ME-mã exact LINE theo màu; TH → T-mã ván trơn từ VAN TRON).
    // Không xóa mã đã gán của dòng không khớp (tránh mất dữ liệu hiện có).
    const { results } = await db.prepare('SELECT * FROM bang_gia_chuan_tinh_gia_vmh').all()
    const rows = results as any[]
    const toAssign: { id: number; ma_sp: string; ten_sp: string }[] = []
    let skipped = 0

    for (const r of rows) {
      const doDay = String(r.board_quy_cach || '').replace(/mm/gi, '').trim()
      const mauKey = normColorKey(r.ma_mau)
      // Ván trơn (TH-grade): dòng không màu → tìm T-mã theo loại|độ dày (bất kỳ màu đều chung 1 T-mã)
      if (MDF_PLAIN_LABELS.includes(String(r.board_loai || ''))) {
        const hit = findVmhPlain(r.board_loai, doDay)
        if (hit) toAssign.push({ id: r.id, ma_sp: hit[0], ten_sp: hit[1] })
        else skipped++
        continue
      }
      const key = `${r.board_loai}|${doDay}|${mauKey}|${r.so_mat}`
      const hit = VMH_SP_MAP[key]
      if (hit) {
        toAssign.push({ id: r.id, ma_sp: hit[0], ten_sp: hit[1] })
      } else skipped++
    }

    const updChunk = 30
    for (let i = 0; i < toAssign.length; i += updChunk) {
      const chunk = toAssign.slice(i, i + updChunk)
      const stmts = chunk.map(g =>
        db.prepare('UPDATE bang_gia_chuan_tinh_gia_vmh SET ma_sp = ?, ten_sp = ? WHERE id = ?').bind(g.ma_sp, g.ten_sp, g.id)
      )
      await db.batch(stmts)
    }

    return c.json({ success: true, assigned: toAssign.length, skipped })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})

app.get('/tinh-gia-vmh', async (c) => {
  const db = c.env.DB
  const { results } = await db.prepare('SELECT * FROM bang_gia_chuan_tinh_gia_vmh ORDER BY board_quy_cach, board_loai, ma_mau, so_mat').all()
  return c.json({ data: results, total: results.length })
})

// ====== VENEER ======
// Auto-assign Mã MISA cho bảng giá Veneer theo mã GC (Gia Công)
// Map: (loai, be_mat) -> [ma_sp, ten_sp]; các dòng chưa khớp để trống gán tay
const VENEER_SP_MAP: Record<string, [string, string]> = {
  'tu nhien|xoan': ['GCX1', 'GC Xoan 1 mặt'],
  'ky thuat|soi ky thuat': ['GCWOKT1', 'GC W.oak KT 1m'],
  'ky thuat|walnut ky thuat': ['GCWN1', 'GC Walnut 1m'],
}

app.post('/veneer/auto-assign-ma-sp', async (c) => {
  try {
    const db = c.env.DB
    const { results } = await db.prepare('SELECT * FROM bang_gia_chuan_veneer').all()
    const rows = results as any[]
    const toAssign: { id: number; ma_sp: string; ten_sp: string }[] = []
    const usedMasp = new Set<string>()
    let skipped = 0

    for (const r of rows) {
      const key = `${removeAccents(r.loai || '')}|${removeAccents(r.be_mat || '')}`.toLowerCase()
      const hit = VENEER_SP_MAP[key]
      if (hit && !usedMasp.has(hit[0])) {
        usedMasp.add(hit[0])
        toAssign.push({ id: r.id, ma_sp: hit[0], ten_sp: hit[1] })
      } else skipped++
    }

    const updChunk = 30
    for (let i = 0; i < toAssign.length; i += updChunk) {
      const chunk = toAssign.slice(i, i + updChunk)
      const stmts = chunk.map(g =>
        db.prepare('UPDATE bang_gia_chuan_veneer SET ma_sp = ?, ten_sp = ? WHERE id = ?').bind(g.ma_sp, g.ten_sp, g.id)
      )
      await db.batch(stmts)
    }

    return c.json({ success: true, assigned: toAssign.length, skipped })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})

// ====== CHỈ NẸP ======
// Map: (model, kich_thuoc) -> [ma_sp, ten_sp] đối chiếu Mã SP và Mô Tả SP.xlsx (prefix CHI)
// Các dòng chưa có mã chính xác trong danh mục MISA để trống để gán tay qua AssignMisaCode.
const CHI_NEP_SP_MAP: Record<string, [string, string]> = {
  // ===== PVC =====
  'pvc 101 t|21x0.8': ['CHI101T21-1', 'Chỉ nẹp 101 T 21 x 0.8'],
  'pvc 101 t|43x0.8': ['CHI101T43-1', 'Chỉ nẹp 101 T 43 x 0.8'],
  'pvc 101 sh|21x0.8': ['CHI101SH21-1', 'Chỉ nẹp 101 SH 21 x 0.8'],
  'pvc 101 sh|43x0.8': ['CHI101SH43-1', 'Chỉ nẹp 101 SH 43 x 0.8'],
  'pvc 101 sh|21x0.45 (200m)': ['CHI101SH21-045', 'Chỉ nẹp 101 SH 21 x 0.45'],
  'pvc 101 t|21x0.45 (200m)': ['CHI101T21-045', 'Chỉ nẹp 101 T 21 x 0.45'],
  'pvc 100 t|21x0.8': ['CHI100T21-1', 'Chỉ nẹp 100 T 21 x 0.8'],
  'pvc 100 t|43x0.8': ['CHI100T43-1', 'Chỉ nẹp 100 T 43 x 0.8'],
  'pvc 100 sh|21x0.8': ['CHI100SH21-1', 'Chỉ nẹp 100 SH 21 x 0.8'],
  'pvc 100 sh|43x0.8': ['CHI100SH43-1', 'Chỉ nẹp 100 SH 43 x 0.8'],
  'pvc 100 t|21x0.45 (200m)': ['CHI100T21-045', 'Chỉ nẹp 100 T 21 x 0.45'],
  'pvc 100 sh|21x0.45 (200m)': ['CHI100SH21-045', 'Chỉ nẹp 100 SH 21 x 0.45'],
  'pvc 104 t|21x0.8': ['CHI104T21-1', 'Chỉ nẹp 104 T 21 x 0.8'],
  'pvc 104 t|43x0.8': ['CHI104T43-1', 'Chỉ nẹp 104 T 43 x 0.8'],
  'pvc 104 sh|21x0.8': ['CHI104SH21-1', 'Chỉ nẹp 104 SH 21 x 0.8'],
  'pvc 104 sh|43x0.8': ['CHI104SH43-1', 'Chỉ nẹp 104 SH 43 x 0.8'],
  'pvc 104 t|21x0.45 (200m)': ['CHI104T21-045', 'Chỉ nẹp 104 T 21 x 0.45'],
  'pvc 104 sh|21x0.45 (200m)': ['CHI104SH21-045', 'Chỉ nẹp 104 SH 21 x 0.45'],
  'pvc vân gỗ & đơn sắc|21x0.45 (200m)': ['CHIVGNN21-045', 'Chỉ nẹp Vân Gỗ Ngẫu Nhiên 21 x 0.45'],
  // 21x0.8/43x0.8 của Vân gỗ & Đơn sắc + AS&AM 50m + US101/105 + SB008/009: không có mã -> gán tay
  // ===== VENEER =====
  'xoan|có keo 20mm': ['CHIX20K70', 'Chỉ Xoan 20mm (có keo) 70m'],
  'xoan|có keo 40mm': ['CHIX40K', 'Chỉ Xoan 40mm (có keo)'],
  'xoan|không keo 20mm': ['CHIX20', 'Chỉ Xoan 20mm'],
  'xoan|không keo 40mm': ['CHIX40', 'Chỉ Xoan 40mm'],
  'sồi|có keo 20mm': ['CHIWO20K07', 'Chỉ W.oak 20mm (có keo) 70m'],
  'sồi|có keo 40mm': ['CHIWO40K', 'Chỉ W.oak 40mm (có keo)'],
  'sồi|không keo 20mm': ['CHIWO20', 'Chỉ W.Oak 20mm'],
  'sồi|không keo 40mm': ['CHIWO40', 'Chỉ W.Oak 40mm'],
  'walnut kỹ thuật|có keo 20mm': ['CHIWN20K', 'Chỉ Walnut 20mm Keo'],
  'walnut kỹ thuật|có keo 40mm': ['CHIWN40K', 'Chỉ Walnut 40mm Keo'],
  'walnut kỹ thuật|không keo 20mm': ['CHIWN20', 'Chỉ Walnut 20mm'],
  'walnut kỹ thuật|không keo 40mm': ['CHIWN40', 'Chỉ Walnut 40mm'],
  // ===== ACRYLIC =====
  'as & am|22x1 cuộn 55m': ['CHIAM40322-155', 'Chỉ nẹp Acrylic AM 403 22 x 1 (55m)'],
  // AS & AM cuộn 50m: nhiều mã AS/AM -> gán tay
  // ===== ABS_PVC =====
  'ss18|21x0.8 cuộn 100m': ['CHISS1822-1', 'Chỉ ABS SS18 22 x 0.8'],
  'ss28|21x0.8 cuộn 100m': ['CHISS2822-1', 'Chỉ ABS SS28 22 x 0.8'],
  'ss38|21x0.8 cuộn 100m': ['CHISS3822-1', 'Chỉ ABS SS38 22 x 0.8'],
  'ss903|21x0.8 cuộn 100m': ['CHIABS90322-1100', 'Chỉ ABS AS-903 22 x 1 (100m)'],
  'us102|21x0.8 cuộn 50m': ['CHIUS10221-150', 'Chỉ nẹp Acrylic US 102 21 x 1 (50m)'],
  'us103|21x0.8 cuộn 50m': ['CHIUS10321-150', 'Chỉ nẹp Acrylic US 103 21 x 1 (50m)'],
  'us104|21x0.8 cuộn 50m': ['CHIUS10421-150', 'Chỉ nẹp Acrylic US 104 21 x 1 (50m)'],
  'us106|21x0.8 cuộn 50m': ['CHIUS10621-150', 'Chỉ nẹp Acrylic US 106 21 x 1 (50m)'],
  'um107|21x0.8 cuộn 50m': ['CHIUM10721-150', 'Chỉ nẹp Acrylic UM 107 21 x 1 (50m)'],
  'sb001|21x0.8 cuộn 50m': ['CHISB00121-1', 'Chỉ nẹp SB001 21 x 0.8'],
  'sb002|21x0.8 cuộn 50m': ['CHISB00221-1', 'Chỉ nẹp SB002 21 x 0.8'],
  'sb003|21x0.8 cuộn 50m': ['CHISB00321-1', 'Chỉ nẹp SB003 21 x 0.8'],
  'sb004|21x0.8 cuộn 50m': ['CHISB00421-1', 'Chỉ nẹp SB004 21 x 0.8'],
  'sb005|21x0.8 cuộn 50m': ['CHISB00521-1', 'Chỉ nẹp SB005 21 x 0.8'],
  'sb006|21x0.8 cuộn 50m': ['CHISB00621-1', 'Chỉ nẹp SB006 21 x 0.8'],
  'sb007|21x0.8 cuộn 50m': ['CHISB00721-1', 'Chỉ nẹp SB007 21 x 0.8'],
  // US101, US105, SB008, SB009: không có mã CHI trong MISA -> gán tay
}

app.post('/chi-nep/auto-assign-ma-sp', async (c) => {
  try {
    const db = c.env.DB
    const { results } = await db.prepare('SELECT * FROM bang_gia_chuan_chi_nep').all()
    const rows = results as any[]

    const toAssign: { id: number; ma_sp: string; ten_sp: string }[] = []
    let skipped = 0

    for (const r of rows) {
      // Bỏ qua dòng đã gán mã MISA (ma_sp là mã CHI)
      if (String(r.ma_sp || '').toUpperCase().startsWith('CHI')) continue
      const key = `${removeAccents(r.ma_sp || '').toLowerCase()}|${removeAccents(r.kich_thuoc || '').toLowerCase()}`
      const hit = CHI_NEP_SP_MAP[key]
      if (hit) {
        toAssign.push({ id: r.id, ma_sp: hit[0], ten_sp: hit[1] })
      } else skipped++
    }

    const updChunk = 30
    for (let i = 0; i < toAssign.length; i += updChunk) {
      const chunk = toAssign.slice(i, i + updChunk)
      const stmts = chunk.map(g =>
        db.prepare('UPDATE bang_gia_chuan_chi_nep SET ma_sp = ?, ten_sp = ? WHERE id = ?').bind(g.ma_sp, g.ten_sp, g.id)
      )
      await db.batch(stmts)
    }

    return c.json({ success: true, assigned: toAssign.length, skipped })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})


// ====== GỖ GHÉP ======

// Grade columns for Gỗ Trơn → maps column name to display label
// Cao Su AA/AB được tách thành 2 mã riêng (AA, AB) cùng giá theo quyết định user
const GO_GHEP_GRADES = [
  { key: 'cao_su_aa_ab', label: 'Cao Su AA' },
  { key: 'cao_su_aa_ab', label: 'Cao Su AB' },
  { key: 'cao_su_ac', label: 'Cao Su AC' },
  { key: 'cao_su_bc', label: 'Cao Su BC' },
  { key: 'cao_su_cc', label: 'Cao Su CC' },
  { key: 'thong_nzl_aa', label: 'Thông NZL AA' },
]

// Grade columns for Phủ Veneer
const PHU_VENEER_GRADES = [
  { key: 'xoan_1m', label: 'Xoan 1 mặt' },
  { key: 'xoan_2m', label: 'Xoan 2 mặt' },
  { key: 'soi_1m', label: 'Sồi 1 mặt' },
  { key: 'soi_2m', label: 'Sồi 2 mặt' },
  { key: 'soi_kt_1m', label: 'Sồi KT 1 mặt' },
  { key: 'soi_kt_2m', label: 'Sồi KT 2 mặt' },
  { key: 'oc_cho_kt_1m', label: 'Óc Chó KT 1 mặt' },
  { key: 'oc_cho_kt_2m', label: 'Óc Chó KT 2 mặt' },
]

app.post('/tinh-gia-gg/tinh-toan', async (c) => {
  try {
    const db = c.env.DB
    const [goGhepRows, phuVeneerRows] = await Promise.all([
      db.prepare('SELECT * FROM bang_gia_chuan_go_ghep ORDER BY stt').all(),
      db.prepare('SELECT * FROM bang_gia_chuan_phu_veneer ORDER BY stt').all(),
    ])

    const goGheps = goGhepRows.results as any[]
    const phuVeneers = phuVeneerRows.results as any[]

    // Preserve existing ma_sp/ten_sp before delete
    const { results: existing } = await db.prepare(
      "SELECT quy_cach, loai, nhom, ma_sp, ten_sp FROM bang_gia_chuan_tinh_gia_gg WHERE ma_sp IS NOT NULL AND ma_sp != ''"
    ).all()
    const preserved = new Map<string, { ma_sp: string, ten_sp: string }>()
    for (const r of (existing || []) as any[]) {
      const key = `${r.quy_cach}|${r.loai}|${r.nhom}`
      if (!preserved.has(key)) preserved.set(key, { ma_sp: r.ma_sp, ten_sp: r.ten_sp || r.ma_sp })
    }

    await db.prepare('DELETE FROM bang_gia_chuan_tinh_gia_gg').run()

    const inserts: any[] = []
    const pushRow = (quy_cach: string, loai: string, nhom: string, gia: number) => {
      const p = preserved.get(`${quy_cach}|${loai}|${nhom}`)
      inserts.push({ quy_cach, loai, nhom, gia, ma_sp: p?.ma_sp || '', ten_sp: p?.ten_sp || '' })
    }

    // Normalize Gỗ Trơn rows
    for (const row of goGheps) {
      for (const grade of GO_GHEP_GRADES) {
        const gia = row[grade.key]
        if (gia === null || gia === undefined) continue
        if (typeof gia !== 'number') continue
        pushRow(row.quy_cach, grade.label, 'Gỗ Trơn', gia)
      }
    }

    // Normalize Phủ Veneer rows; tách 17–18mm thành 2 dòng riêng (17mm, 18mm)
    for (const row of phuVeneers) {
      for (const grade of PHU_VENEER_GRADES) {
        const gia = row[grade.key]
        if (gia === null || gia === undefined) continue
        if (typeof gia !== 'number') continue
        if (row.quy_cach === '17–18mm' || row.quy_cach === '17-18mm') {
          pushRow('17mm', grade.label, 'Phủ Veneer', gia)
          pushRow('18mm', grade.label, 'Phủ Veneer', gia)
        } else {
          pushRow(row.quy_cach, grade.label, 'Phủ Veneer', gia)
        }
      }
    }

    const batchSize = 100
    for (let i = 0; i < inserts.length; i += batchSize) {
      const batch = inserts.slice(i, i + batchSize)
      const stmts = batch.map(row =>
        db.prepare(
          'INSERT INTO bang_gia_chuan_tinh_gia_gg (quy_cach, loai, nhom, gia, ma_sp, ten_sp) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(row.quy_cach, row.loai, row.nhom, row.gia, row.ma_sp, row.ten_sp)
      )
      await db.batch(stmts)
    }

    const synced = await syncTableToMisaBulk(c.env.DB, GIA_GOC_SYNC_TABLES.find(s => s.table === 'bang_gia_chuan_tinh_gia_gg')!)
    return c.json({ success: true, total: inserts.length, synced })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})

app.get('/tinh-gia-gg', async (c) => {
  const db = c.env.DB
  const { results } = await db.prepare('SELECT * FROM bang_gia_chuan_tinh_gia_gg ORDER BY nhom, loai, quy_cach').all()
  return c.json({ data: results, total: results.length })
})

// ====== GÁN MÃ SP CHO TÍNH GIÁ GỖ GHÉP ======
// Đối chiếu FILE GIÁ CHUẨN.xlsx (sheet GỖ GHÉP) + Mã SP và Mô Tả SP.xlsx:
//  - Gỗ Trơn Cao Su: TGGCS{độ dày}{cấp} (AA/AB tách 2 mã cùng giá)
//  - Gỗ Trơn Thông: TGGTHONG{độ dày}AA
//  - Phủ Veneer: VNGG{độ dày}{loại}{số mặt} (X=Xoan, S=Sồi, SKT=Sồi KT, WN=Óc chó KT)
//    Có mã MISA sẵn thì giữ mã thật; thiếu thì sinh mã theo logic đã chốt.
const GO_GHEP_MA_MAP: Record<string, [string, string]> = {
  // ===== Gỗ Trơn - Cao Su (1200x2400 nhưng MISA đặt tên 1220x2440) =====
  'Gỗ Trơn|Cao Su AA|8mm': ['TGGCS08AA', 'GG Cao su 8mm x1220x2440 AA'],
  'Gỗ Trơn|Cao Su AB|8mm': ['TGGCS08AB', 'GG Cao su 8mm x1220x2440 AB'],
  'Gỗ Trơn|Cao Su AC|8mm': ['TGGCS08AC', 'GG Cao su 8mm x1220x2440 AC'],
  'Gỗ Trơn|Cao Su CC|8mm': ['TGGCS08CC', 'GG Cao su 8mm x1220x2440 CC'],
  'Gỗ Trơn|Cao Su AA|10mm': ['TGGCS10AAL', 'GG Cao su 10mm x1220x2440 AA'],
  'Gỗ Trơn|Cao Su AB|10mm': ['TGGCS10AB', 'GG Cao su 10mm x1220x2440 AB'],
  'Gỗ Trơn|Cao Su AC|10mm': ['TGGCS10ACL', 'GG Cao su 10mm x1220x2440 AC'],
  'Gỗ Trơn|Cao Su BC|10mm': ['TGGCS10BC', 'GG Cao su 10mm x1220x2440 BC'],
  'Gỗ Trơn|Cao Su CC|10mm': ['TGGCS10CC', 'GG Cao su 10mm x1220x2440 CC'],
  'Gỗ Trơn|Cao Su AC|12mm': ['TGGCS12AC', 'GG Cao su 12mm x1220x2440 AC'],
  'Gỗ Trơn|Cao Su BC|17mm': ['TGGCS17BC', 'GG Cao su 17mm x1220x2440 BC'],
  'Gỗ Trơn|Cao Su AC|18mm': ['TGGCS18ACL', 'GG Cao su 18mm x1220x2440 AC'],
  'Gỗ Trơn|Cao Su BC|18mm': ['TGGCS18BC', 'GG Cao su 18mm x1220x2440 BC'],
  'Gỗ Trơn|Cao Su CC|18mm': ['TGGCS18CC', 'GG Cao su 18mm x1220x2440 CC'],
  // ===== Gỗ Trơn - Thông NZL =====
  'Gỗ Trơn|Thông NZL AA|18mm': ['TGGTHONG18AA', 'Gỗ Ghép Thông 18mm x1220x2440 AA'],
  // ===== Phủ Veneer - Xoan =====
  'Phủ Veneer|Xoan 1 mặt|10mm': ['VNGG10X1L', 'Gỗ Ghép 10mm x1220x2440 Xoan 1 mặt (Khổ lớn)'],
  'Phủ Veneer|Xoan 1 mặt|12mm': ['VNGG12X1', 'Gỗ Ghép 12mm x1220x2440 Xoan 1 mặt'],
  'Phủ Veneer|Xoan 1 mặt|17mm': ['VNGG17X1', 'Gỗ Ghép 17mm x1220x2440 Xoan 1 mặt'],
  'Phủ Veneer|Xoan 1 mặt|18mm': ['VNGG18X1', 'Gỗ Ghép 18mm x1220x2440 Xoan 1 mặt'],
  'Phủ Veneer|Xoan 2 mặt|8mm': ['VNGG08X2', 'Gỗ Ghép 8mm x1220x2440 Xoan A/B'],
  'Phủ Veneer|Xoan 2 mặt|10mm': ['VNGG10XABM', 'Gỗ Ghép 10mm x1220x2440 Xoan A/B'],
  'Phủ Veneer|Xoan 2 mặt|17mm': ['VNGG17X2', 'Gỗ Ghép 17mm x1220x2440 Xoan A/B'],
  'Phủ Veneer|Xoan 2 mặt|18mm': ['VNGG18XAB', 'Gỗ Ghép 18mm x1220x2440 Xoan A/B (khổ lớn)'],
  // ===== Phủ Veneer - Sồi (W.Oak) =====
  'Phủ Veneer|Sồi 1 mặt|10mm': ['VNGG10WO1L', 'Gỗ Ghép 10mm x1220x2440 W.Oak tự nhiên 1 mặt (Khổ lớn)'],
  'Phủ Veneer|Sồi 1 mặt|17mm': ['VNGG17S1', 'Gỗ Ghép 17mm x1220x2440 Sồi 1 mặt'],
  'Phủ Veneer|Sồi 1 mặt|18mm': ['VNGG18S1', 'Gỗ Ghép 18mm x1220x2440 Sồi 1 mặt'],
  'Phủ Veneer|Sồi 2 mặt|10mm': ['VNGG10WOABL', 'Gỗ Ghép 10mm x1220x2440 W.Oak tự nhiên A/B (Khổ lớn)'],
  'Phủ Veneer|Sồi 2 mặt|12mm': ['VNGG12WOAB', 'Gỗ Ghép 12mm x1220x2440 W.Oak tự nhiên A/B'],
  'Phủ Veneer|Sồi 2 mặt|17mm': ['VNGG17S2', 'Gỗ Ghép 17mm x1220x2440 Sồi 2 mặt'],
  'Phủ Veneer|Sồi 2 mặt|18mm': ['VNGG18WOABL', 'Gỗ Ghép 18mm x1220x2440 W.Oak tự nhiên A/B (Khổ lớn)'],
  // ===== Phủ Veneer - Sồi Kỹ Thuật =====
  'Phủ Veneer|Sồi KT 1 mặt|10mm': ['VNGG10WOA1KT', 'Gỗ Ghép 10mm x1220x2440 Sồi kỹ thuật A 1 mặt'],
  'Phủ Veneer|Sồi KT 1 mặt|17mm': ['VNGG17SKT1', 'Gỗ Ghép 17mm x1220x2440 Sồi kỹ thuật 1 mặt'],
  'Phủ Veneer|Sồi KT 1 mặt|18mm': ['VNGG18SKT1', 'Gỗ Ghép 18mm x1220x2440 Sồi kỹ thuật 1 mặt'],
  'Phủ Veneer|Sồi KT 2 mặt|10mm': ['VNGG10WOAAKT', 'Gỗ Ghép 10mm x1220x2440 Sồi kỹ thuật A/A'],
  'Phủ Veneer|Sồi KT 2 mặt|17mm': ['VNGG17WOAAKT', 'Gỗ Ghép 17mm x1220x2440 Sồi kỹ thuật A/A'],
  'Phủ Veneer|Sồi KT 2 mặt|18mm': ['VNGG18WOAAKT', 'Gỗ Ghép 18mm x1220x2440 Sồi kỹ thuật A/A'],
  // ===== Phủ Veneer - Óc Chó (Walnut) Kỹ Thuật =====
  'Phủ Veneer|Óc Chó KT 1 mặt|10mm': ['VNGG10WN1KT', 'Gỗ Ghép 10mm x1220x2440 Walnut kỹ thuật 1 mặt'],
  'Phủ Veneer|Óc Chó KT 2 mặt|10mm': ['VNGG10WNAAKT', 'Gỗ Ghép 10mm x1220x2440 Walnut kỹ thuật A/A'],
  'Phủ Veneer|Óc Chó KT 2 mặt|17mm': ['VNGG17WN2KT', 'Gỗ Ghép 17mm x1220x2440 Walnut kỹ thuật 2 mặt'],
  'Phủ Veneer|Óc Chó KT 2 mặt|18mm': ['VNGG18WNAAKT', 'Gỗ Ghép 18mm x1220x2440 Walnut kỹ thuật A/A (khổ lớn)'],
}

app.post('/tinh-gia-gg/auto-assign-ma-sp', async (c) => {
  try {
    const db = c.env.DB

    // Xóa sạch mã SP cũ (mã tự sinh từ hệ match cũ đều sai)
    await db.prepare("UPDATE bang_gia_chuan_tinh_gia_gg SET ma_sp = '', ten_sp = ''").run()

    const { results } = await db.prepare('SELECT * FROM bang_gia_chuan_tinh_gia_gg').all()
    const rows = results as any[]

    const toAssign: { id: number; ma_sp: string; ten_sp: string }[] = []
    let skipped = 0

    for (const r of rows) {
      const key = `${r.nhom}|${r.loai}|${r.quy_cach}`
      const hit = GO_GHEP_MA_MAP[key]
      if (!hit) { skipped++; continue }
      toAssign.push({ id: r.id, ma_sp: hit[0], ten_sp: hit[1] })
    }

    const updChunk = 30
    for (let i = 0; i < toAssign.length; i += updChunk) {
      const chunk = toAssign.slice(i, i + updChunk)
      const idList = chunk.map(g => g.id).join(',')
      const maCases = chunk.map(g => `WHEN ${g.id} THEN ?`).join(' ')
      const tenCases = chunk.map(g => `WHEN ${g.id} THEN ?`).join(' ')
      const params: any[] = []
      for (const g of chunk) params.push(g.ma_sp)
      for (const g of chunk) params.push(g.ten_sp)
      await db.prepare(
        `UPDATE bang_gia_chuan_tinh_gia_gg SET ma_sp = CASE id ${maCases} END, ten_sp = CASE id ${tenCases} END WHERE id IN (${idList})`
      ).bind(...params).run()
    }

    return c.json({ success: true, assigned: toAssign.length, skipped })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})

// ====== VÁN ÉP ======

const VAN_EP_GRADES = [
  { key: 'kt_1000x2000', label: 'Ash/mỡ CD 1000x2000' },
  { key: 'kt_1220x2440', label: 'Ash/mỡ CD 1220x2440' },
]

app.post('/tinh-gia-ve/tinh-toan', async (c) => {
  try {
    const db = c.env.DB
    const [vanEpRows, vanEpKhacRows] = await Promise.all([
      db.prepare('SELECT * FROM bang_gia_chuan_van_ep ORDER BY stt').all(),
      db.prepare('SELECT * FROM bang_gia_chuan_van_ep_khac ORDER BY stt').all(),
    ])

    const vanEps = vanEpRows.results as any[]
    const vanEpKhacs = vanEpKhacRows.results as any[]

    // Preserve existing ma_sp/ten_sp before delete
    const { results: existing } = await db.prepare(
      "SELECT quy_cach, loai, nhom, ma_sp, ten_sp FROM bang_gia_chuan_tinh_gia_ve WHERE ma_sp IS NOT NULL AND ma_sp != ''"
    ).all()
    const preserved = new Map<string, { ma_sp: string, ten_sp: string }>()
    for (const r of (existing || []) as any[]) {
      const key = `${r.quy_cach}|${r.loai}|${r.nhom}`
      if (!preserved.has(key)) preserved.set(key, { ma_sp: r.ma_sp, ten_sp: r.ten_sp || r.ma_sp })
    }

    await db.prepare('DELETE FROM bang_gia_chuan_tinh_gia_ve').run()

    const inserts: any[] = []
    const pushRow = (quy_cach: string, loai: string, nhom: string, gia: number) => {
      const p = preserved.get(`${quy_cach}|${loai}|${nhom}`)
      inserts.push({ quy_cach, loai, nhom, gia, ma_sp: p?.ma_sp || '', ten_sp: p?.ten_sp || '' })
    }

    // Normalize Ván Ép Thanh Thùy rows
    for (const row of vanEps) {
      for (const grade of VAN_EP_GRADES) {
        const gia = row[grade.key]
        if (gia === null || gia === undefined) continue
        if (typeof gia !== 'number') continue
        pushRow(row.quy_cach, grade.label, 'Thanh Thùy', gia)
      }
    }

    // Copy Ván Ép Khác rows directly; tách 17–18mm thành 2 dòng riêng (17mm, 18mm)
    for (const row of vanEpKhacs) {
      if (row.gia === null || row.gia === undefined) continue
      if (typeof row.gia !== 'number') continue
      if (row.quy_cach === '17–18mm' || row.quy_cach === '17-18mm') {
        pushRow('17mm', row.loai, row.nhom, row.gia)
        pushRow('18mm', row.loai, row.nhom, row.gia)
      } else {
        pushRow(row.quy_cach, row.loai, row.nhom, row.gia)
      }
    }

    const batchSize = 100
    for (let i = 0; i < inserts.length; i += batchSize) {
      const batch = inserts.slice(i, i + batchSize)
      const stmts = batch.map(row =>
        db.prepare(
          'INSERT INTO bang_gia_chuan_tinh_gia_ve (quy_cach, loai, nhom, gia, ma_sp, ten_sp) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(row.quy_cach, row.loai, row.nhom, row.gia, row.ma_sp, row.ten_sp)
      )
      await db.batch(stmts)
    }

    const synced = await syncTableToMisaBulk(c.env.DB, GIA_GOC_SYNC_TABLES.find(s => s.table === 'bang_gia_chuan_tinh_gia_ve')!)
    return c.json({ success: true, total: inserts.length, synced })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})

app.get('/tinh-gia-ve', async (c) => {
  const db = c.env.DB
  const { results } = await db.prepare('SELECT * FROM bang_gia_chuan_tinh_gia_ve ORDER BY nhom, loai, quy_cach').all()
  return c.json({ data: results, total: results.length })
})

// ====== GÁN MÃ SP CHO TÍNH GIÁ VÁN ÉP ======
// Mapping đã chốt (đối chiếu FILE GIÁ CHUẨN + Mã SP MISA):
//  - Thanh Thùy: V2M* (2m x ly) / V2M4* (2m4 x ly)
//  - Nhập khẩu BIRCH C/D: TVE0xBI; POPLAR AA: TVE0xBD (3mm tự sinh TVE03BD); EV/EV: TVE0xEV (tự sinh)
//  - Phủ phim Standard: TVE17SD (17mm) / TVE18SD (18mm)
//  - Phủ veneer Sồi KT / Walnut KT: VNVE0xSOIKT2M / VNVE0xWALNUTKT2M
//  - Okume/EV: TVE09OK (8-9mm), TVE18OK (18mm)
const VAN_EP_MA_MAP: Record<string, [string, string]> = {
  // Thanh Thùy 1000x2000 -> V2Mxx (2m x ly)
  'Thanh Thùy|Ash/mỡ CD 1000x2000|4mm': ['V2M04', '2m x 4ly'],
  'Thanh Thùy|Ash/mỡ CD 1000x2000|5mm': ['V2M05', '2m x 5ly'],
  'Thanh Thùy|Ash/mỡ CD 1000x2000|6mm': ['V2M06', '2m x 6ly'],
  'Thanh Thùy|Ash/mỡ CD 1000x2000|8mm': ['V2M08', '2m x 8ly'],
  'Thanh Thùy|Ash/mỡ CD 1000x2000|10mm': ['V2M10', '2m x 10ly'],
  'Thanh Thùy|Ash/mỡ CD 1000x2000|12mm': ['V2M12', '2m x 12ly'],
  'Thanh Thùy|Ash/mỡ CD 1000x2000|14mm': ['V2M14', '2m x 14ly'],
  'Thanh Thùy|Ash/mỡ CD 1000x2000|16mm': ['V2M16', '2m x 16ly'],
  'Thanh Thùy|Ash/mỡ CD 1000x2000|18mm': ['V2M18', '2m x 18ly'],
  // Thanh Thùy 1220x2440 -> V2M4xx (2m4 x ly)
  'Thanh Thùy|Ash/mỡ CD 1220x2440|4mm': ['V2M404', '2m4 x 4ly'],
  'Thanh Thùy|Ash/mỡ CD 1220x2440|5mm': ['V2M405', '2m4 x 5ly'],
  'Thanh Thùy|Ash/mỡ CD 1220x2440|6mm': ['V2M406', '2m4 x 6ly'],
  'Thanh Thùy|Ash/mỡ CD 1220x2440|8mm': ['V2M408', '2m4 x 8ly'],
  'Thanh Thùy|Ash/mỡ CD 1220x2440|10mm': ['V2M410', '2m4 x 10ly'],
  'Thanh Thùy|Ash/mỡ CD 1220x2440|12mm': ['V2M412', '2m4 x 12ly'],
  'Thanh Thùy|Ash/mỡ CD 1220x2440|14mm': ['V2M414', '2m4 x 14ly'],
  'Thanh Thùy|Ash/mỡ CD 1220x2440|16mm': ['V2M416', '2m4 x 16ly'],
  'Thanh Thùy|Ash/mỡ CD 1220x2440|18mm': ['V2M418', '2m4 x 18ly'],
  // Nhập khẩu BIRCH C/D
  'Nhập khẩu|BIRCH C/D|9mm': ['TVE09BI', 'Ván Ép 9mm x1220x2440 Poplar mặt Birch C/D'],
  'Nhập khẩu|BIRCH C/D|12mm': ['TVE12BI', 'Ván Ép 12mm x1220x2440 Poplar mặt Birch C/D'],
  'Nhập khẩu|BIRCH C/D|18mm': ['TVE18BI', 'Ván Ép 18mm x1220x2440 Poplar mặt Birch C/D'],
  // Nhập khẩu POPLAR AA
  'Nhập khẩu|POPLAR AA|3mm': ['TVE03BD', 'Ván Ép 3mm x1220x2440 Bạch Dương AA'],
  'Nhập khẩu|POPLAR AA|5mm': ['TVE05BD', 'Ván Ép 5mm x1220x2440 Bạch Dương AA'],
  'Nhập khẩu|POPLAR AA|9mm': ['TVE09BD', 'Ván Ép 9mm x1220x2440 Bạch Dương AA'],
  'Nhập khẩu|POPLAR AA|12mm': ['TVE12BD', 'Ván Ép 12mm x1220x2440 Bạch Dương AA'],
  'Nhập khẩu|POPLAR AA|15mm': ['TVE15BD', 'Ván Ép 15mm x1220x2440 Bạch Dương AA'],
  'Nhập khẩu|POPLAR AA|18mm': ['TVE18BD', 'Ván Ép 18mm x1220x2440 Bạch Dương AA'],
  // Nhập khẩu EV/EV (tự sinh theo logic TVE0xEV)
  'Nhập khẩu|EV/EV|5mm': ['TVE05EV', 'Ván Ép 5mm x1220x2440 EV/EV'],
  'Nhập khẩu|EV/EV|18mm': ['TVE18EV', 'Ván Ép 18mm x1220x2440 EV/EV'],
  'Nhập khẩu|EV/EV|25mm': ['TVE25EV', 'Ván Ép 25mm x1220x2440 EV/EV'],
  // Phủ phim Standard (tách 17-18 thành 2 mã riêng)
  'Phủ phim|Standard|17mm': ['TVE17SD', 'Ván Ép phủ phim 17mm x1220x2440 Standard'],
  'Phủ phim|Standard|18mm': ['TVE18SD', 'Ván Ép phủ phim 18mm x1220x2440 Standard'],
  // Phủ veneer Sồi KT / Walnut KT
  'Phủ veneer|Sồi KT|9mm': ['VNVE09SOIKT2M', 'Ván Ép 9mm x1220x2440 Sồi Kỹ Thuật 2 mặt'],
  'Phủ veneer|Sồi KT|18mm': ['VNVE18SOIKT2M', 'Ván Ép 18mm x1220x2440 Sồi Kỹ Thuật 2 mặt'],
  'Phủ veneer|Walnut KT|9mm': ['VNVE09WALNUTKT2M', 'Ván Ép 9mm x1220x2440 Walnut Kỹ Thuật 2 mặt'],
  'Phủ veneer|Walnut KT|18mm': ['VNVE18WALNUTKT2M', 'Ván Ép 18mm x1220x2440 Walnut Kỹ Thuật 2 mặt'],
  // Okume/EV (Giá lẻ)
  'Okume/EV|Giá lẻ|8-9mm': ['TVE09OK', 'Ván Ép 9mm x1220x2440 OKume'],
  'Okume/EV|Giá lẻ|18mm': ['TVE18OK', 'Ván Ép 18mm x1220x2440 Okume'],
}

app.post('/tinh-gia-ve/auto-assign-ma-sp', async (c) => {
  try {
    const db = c.env.DB

    // Không xóa sạch mã đã gán — chỉ ghi đè mã khi có match trong mapping.
    // Các dòng không có match (mã tự sinh / gán thủ công) được giữ nguyên.
    const { results } = await db.prepare('SELECT * FROM bang_gia_chuan_tinh_gia_ve').all()
    const rows = results as any[]

    const toAssign: { id: number; ma_sp: string; ten_sp: string }[] = []
    let skipped = 0

    for (const r of rows) {
      const key = `${r.nhom}|${r.loai}|${r.quy_cach}`
      const hit = VAN_EP_MA_MAP[key]
      if (!hit) { skipped++; continue }
      toAssign.push({ id: r.id, ma_sp: hit[0], ten_sp: hit[1] })
    }

    const updChunk = 30
    for (let i = 0; i < toAssign.length; i += updChunk) {
      const chunk = toAssign.slice(i, i + updChunk)
      const idList = chunk.map(g => g.id).join(',')
      const maCases = chunk.map(g => `WHEN ${g.id} THEN ?`).join(' ')
      const tenCases = chunk.map(g => `WHEN ${g.id} THEN ?`).join(' ')
      const params: any[] = []
      for (const g of chunk) params.push(g.ma_sp)
      for (const g of chunk) params.push(g.ten_sp)
      await db.prepare(
        `UPDATE bang_gia_chuan_tinh_gia_ve SET ma_sp = CASE id ${maCases} END, ten_sp = CASE id ${tenCases} END WHERE id IN (${idList})`
      ).bind(...params).run()
    }

    return c.json({ success: true, assigned: toAssign.length, skipped })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})

// ====== OSB ======

const OSB_PRICE_TYPES = [
  { key: 'gia', label: 'Giá gốc' },
  { key: 'gia_da_ck_10', label: 'Đã CK 10%' },
  { key: 'gia_da_ck_15', label: 'Đã CK 15%' },
  { key: 'gia_chua_ck_10', label: 'Chưa CK 10%' },
  { key: 'gia_chua_ck_15', label: 'Chưa CK 15%' },
]

app.post('/tinh-gia-osb/tinh-toan', async (c) => {
  try {
    const db = c.env.DB
    const { results } = await db.prepare('SELECT mo_ta, do_day, MIN(gia) as gia, MIN(gia_da_ck_10) as gia_da_ck_10, MIN(gia_da_ck_15) as gia_da_ck_15, MIN(gia_chua_ck_10) as gia_chua_ck_10, MIN(gia_chua_ck_15) as gia_chua_ck_15 FROM bang_gia_chuan_osb GROUP BY mo_ta, do_day ORDER BY MIN(stt), do_day').all()
    const rows = results as any[]

    // Preserve existing ma_sp/ten_sp before delete
    const { results: existing } = await db.prepare(
      "SELECT loai, do_day, nhom, ma_sp, ten_sp FROM bang_gia_chuan_tinh_gia_osb WHERE ma_sp IS NOT NULL AND ma_sp != ''"
    ).all()
    const maSpMap = new Map()
    for (const r of existing as any[]) {
      maSpMap.set(`${r.loai}|${r.do_day}|${r.nhom}`, { ma_sp: r.ma_sp, ten_sp: r.ten_sp })
    }

    await db.prepare('DELETE FROM bang_gia_chuan_tinh_gia_osb').run()

    const inserts: any[] = []
    for (const row of rows) {
      for (const pt of OSB_PRICE_TYPES) {
        const gia = row[pt.key]
        if (gia === null || gia === undefined) continue
        if (typeof gia !== 'number') continue
        const key = `${row.mo_ta}|${row.do_day}|${pt.label}`
        const saved = maSpMap.get(key)
        inserts.push({
          do_day: row.do_day, loai: row.mo_ta, nhom: pt.label, gia,
          ma_sp: saved?.ma_sp || '', ten_sp: saved?.ten_sp || '',
        })
      }
    }

    const batchSize = 100
    for (let i = 0; i < inserts.length; i += batchSize) {
      const batch = inserts.slice(i, i + batchSize)
      const stmts = batch.map(row =>
        db.prepare(
          'INSERT INTO bang_gia_chuan_tinh_gia_osb (do_day, loai, nhom, gia, ma_sp, ten_sp) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(row.do_day, row.loai, row.nhom, row.gia, row.ma_sp, row.ten_sp)
      )
      await db.batch(stmts)
    }

    const synced = await syncTableToMisaBulk(c.env.DB, GIA_GOC_SYNC_TABLES.find(s => s.table === 'bang_gia_chuan_tinh_gia_osb')!)
    return c.json({ success: true, total: inserts.length, synced })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})

app.get('/tinh-gia-osb', async (c) => {
  const db = c.env.DB
  const { results } = await db.prepare('SELECT * FROM bang_gia_chuan_tinh_gia_osb ORDER BY nhom, loai, do_day').all()
  return c.json({ data: results, total: results.length })
})

// ====== VÁN PHỦ PVC FILM - PETG ======

const PVC_PETG_NHOM_MAP = [
  { nhom: 'Ưu đãi', col1m: 'gia_uu_dai_1m', col2m: 'gia_uu_dai_2m' },
  { nhom: 'Standard', col1m: 'gia_standard_1m', col2m: 'gia_standard_2m' },
  { nhom: 'Premium', col1m: 'gia_premium_1m', col2m: 'gia_premium_2m' },
  { nhom: 'PETG', col1m: 'gia_petg_1m', col2m: 'gia_petg_2m' },
]

app.post('/tinh-gia-pvc-petg/tinh-toan', async (c) => {
  try {
    const db = c.env.DB
    const [mauRows, giaRows] = await Promise.all([
      db.prepare('SELECT * FROM bang_gia_chuan_pvc_film_dura ORDER BY nhom, ma_mau').all(),
      db.prepare('SELECT * FROM bang_gia_chuan_van_phu_pvc_petg ORDER BY stt').all(),
    ])

    const maus = mauRows.results as any[]
    const gias = giaRows.results as any[]

    // Preserve ma_sp/ten_sp before delete
    const { results: existing } = await db.prepare(
      "SELECT nhom, ma_mau, loai_van, do_day, so_mat, ma_sp, ten_sp FROM bang_gia_chuan_tinh_gia_pvc_petg WHERE ma_sp IS NOT NULL AND ma_sp != ''"
    ).all()
    const preserved = new Map<string, { ma_sp: string, ten_sp: string }>()
    for (const r of (existing || []) as any[]) {
      const key = `${r.nhom}|${r.ma_mau}|${r.loai_van}|${r.do_day}|${r.so_mat}`
      if (!preserved.has(key)) preserved.set(key, { ma_sp: r.ma_sp, ten_sp: r.ten_sp || r.ma_sp })
    }

    await db.prepare('DELETE FROM bang_gia_chuan_tinh_gia_pvc_petg').run()

    const inserts: any[] = []
    for (const mau of maus) {
      const nhomMap = PVC_PETG_NHOM_MAP.find(n => n.nhom === mau.nhom)
      if (!nhomMap) continue
      for (const gia of gias) {
        const gia1m = gia[nhomMap.col1m]
        const gia2m = gia[nhomMap.col2m]
        if (gia1m !== null && gia1m !== undefined && typeof gia1m === 'number') {
          const key = `${mau.nhom}|${mau.ma_mau}|${gia.loai_van}|${gia.do_day}|1`
          const p = preserved.get(key)
          inserts.push({ ma_mau: mau.ma_mau, nhom: mau.nhom, loai: mau.loai, loai_van: gia.loai_van, do_day: gia.do_day, so_mat: 1, gia: gia1m, ma_sp: p?.ma_sp || '', ten_sp: p?.ten_sp || '' })
        }
        if (gia2m !== null && gia2m !== undefined && typeof gia2m === 'number') {
          const key = `${mau.nhom}|${mau.ma_mau}|${gia.loai_van}|${gia.do_day}|2`
          const p = preserved.get(key)
          inserts.push({ ma_mau: mau.ma_mau, nhom: mau.nhom, loai: mau.loai, loai_van: gia.loai_van, do_day: gia.do_day, so_mat: 2, gia: gia2m, ma_sp: p?.ma_sp || '', ten_sp: p?.ten_sp || '' })
        }
      }
    }

    const batchSize = 100
    for (let i = 0; i < inserts.length; i += batchSize) {
      const batch = inserts.slice(i, i + batchSize)
      const stmts = batch.map(row =>
        db.prepare(
          'INSERT INTO bang_gia_chuan_tinh_gia_pvc_petg (ma_mau, nhom, loai, loai_van, do_day, so_mat, gia, ma_sp, ten_sp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(row.ma_mau, row.nhom, row.loai, row.loai_van, row.do_day, row.so_mat, row.gia, row.ma_sp, row.ten_sp)
      )
      await db.batch(stmts)
    }

    const synced = await syncTableToMisaBulk(c.env.DB, GIA_GOC_SYNC_TABLES.find(s => s.table === 'bang_gia_chuan_tinh_gia_pvc_petg')!)
    return c.json({ success: true, total: inserts.length, synced })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})

app.get('/tinh-gia-pvc-petg', async (c) => {
  const db = c.env.DB
  const { results } = await db.prepare('SELECT * FROM bang_gia_chuan_tinh_gia_pvc_petg ORDER BY nhom, ma_mau, loai_van, do_day, so_mat').all()
  return c.json({ data: results, total: results.length })
})

// Auto-assign Mã SP & Mô tả SP for PVC Film - PETG
// Quy ước mã:
//   NP + {độ dày 2 số} + {trọng lượng: 05/055/06/065} + {mã màu bỏ khoảng trắng} + {số mặt}
//   Durabo: NP... (vd NP08055NW061); Than tre: NP...065...; MDF thường: MP + độ dày + màu + mặt; MDF kháng ẩm: MP + độ dày + LMR + màu + mặt
const PVC_PETG_DO_DAY_CODE: Record<string, string> = {
  '5mm': '05', '8mm': '08', '9mm': '09', '12mm': '12', '17mm': '17',
}
const PVC_PETG_WEIGHT: Record<string, { code: string; grams: string }> = {
  'DURABO 0.5': { code: '05', grams: '0.5g' },
  'DURABO 0.55': { code: '055', grams: '0.55g' },
  'DURABO 0.6': { code: '06', grams: '0.6g' },
  'Ván nhựa than tre 0.65': { code: '065', grams: '0.65g' },
}

app.post('/tinh-gia-pvc-petg/auto-assign-ma-sp', async (c) => {
  try {
    const db = c.env.DB
    const { results } = await db.prepare(
      "SELECT * FROM bang_gia_chuan_tinh_gia_pvc_petg WHERE ma_sp IS NULL OR ma_sp = ''"
    ).all()
    const rows = results as any[]

    const generated: { id: number; ma_sp: string; ten_sp: string }[] = []
    let skipped = 0

    for (const r of rows) {
      const doDayCode = PVC_PETG_DO_DAY_CODE[r.do_day]
      const maMau = String(r.ma_mau || '').replace(/\s+/g, '')
      if (!doDayCode || !maMau) { skipped++; continue }

      let ma_sp = ''
      let ten_sp = ''

      if (String(r.loai_van).startsWith('DURABO')) {
        const w = PVC_PETG_WEIGHT[r.loai_van]
        if (!w) { skipped++; continue }
        ma_sp = `NP${doDayCode}${w.code}${maMau}${r.so_mat}`
        ten_sp = `Ván Nhựa Durabo phủ PVC Film ${r.do_day} x1220x2440 ${w.grams} ${r.ma_mau} ${r.so_mat} mặt`
      } else if (r.loai_van === 'Ván nhựa than tre 0.65') {
        const w = PVC_PETG_WEIGHT[r.loai_van]
        ma_sp = `NP${doDayCode}${w.code}${maMau}${r.so_mat}`
        ten_sp = `Ván nhựa than tre phủ PVC Film ${r.do_day} x1220x2440 ${r.ma_mau} ${r.so_mat} mặt`
      } else if (r.loai_van === 'MDF thường') {
        ma_sp = `MP${doDayCode}${maMau}${r.so_mat}`
        ten_sp = `MDF thường phủ PVC Film ${r.do_day} x1220x2440 ${r.ma_mau} ${r.so_mat} mặt`
      } else if (r.loai_van === 'MDF kháng ẩm VN') {
        ma_sp = `MP${doDayCode}LMR${maMau}${r.so_mat}`
        ten_sp = `MDF kháng ẩm VN phủ PVC Film ${r.do_day} x1220x2440 ${r.ma_mau} ${r.so_mat} mặt`
      } else {
        skipped++
        continue
      }

      generated.push({ id: r.id, ma_sp, ten_sp })
    }

    // Register into ma_misa so the codes are searchable (multi-row INSERT OR IGNORE, ma_sp UNIQUE)
    const unique = new Map<string, string>()
    for (const g of generated) if (!unique.has(g.ma_sp)) unique.set(g.ma_sp, g.ten_sp)
    const regRows = [...unique.entries()]
    const regChunk = 30
    for (let i = 0; i < regRows.length; i += regChunk) {
      const chunk = regRows.slice(i, i + regChunk)
      const placeholders = chunk.map(() => '(?, ?, ?)').join(', ')
      const params: any[] = []
      for (const [ma, ten] of chunk) params.push(ma, ten, 'manual')
      await db.prepare(
        `INSERT OR IGNORE INTO ma_misa (ma_sp, ten_sp, match_status) VALUES ${placeholders}`
      ).bind(...params).run()
    }

    // Update table (multi-row UPDATE with CASE, ids are integers)
    const updChunk = 30
    for (let i = 0; i < generated.length; i += updChunk) {
      const chunk = generated.slice(i, i + updChunk)
      const idList = chunk.map(g => g.id).join(',')
      const maCases = chunk.map(g => `WHEN ${g.id} THEN ?`).join(' ')
      const tenCases = chunk.map(g => `WHEN ${g.id} THEN ?`).join(' ')
      const params: any[] = []
      for (const g of chunk) { params.push(g.ma_sp); }
      for (const g of chunk) { params.push(g.ten_sp); }
      await db.prepare(
        `UPDATE bang_gia_chuan_tinh_gia_pvc_petg SET ma_sp = CASE id ${maCases} END, ten_sp = CASE id ${tenCases} END WHERE id IN (${idList})`
      ).bind(...params).run()
    }

    return c.json({ success: true, generated: generated.length, skipped })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})

// ====== VÁN NHỰA DURABO ======

app.post('/tinh-gia-dr/tinh-toan', async (c) => {
  try {
    const db = c.env.DB
    const { results } = await db.prepare('SELECT * FROM bang_gia_chuan_durabo WHERE gia IS NOT NULL ORDER BY stt').all()
    const rows = results as any[]

    // Preserve existing ma_sp/ten_sp before delete
    const { results: existing } = await db.prepare(
      "SELECT quy_cach, loai, nhom, ma_sp, ten_sp FROM bang_gia_chuan_tinh_gia_dr WHERE ma_sp IS NOT NULL AND ma_sp != ''"
    ).all()
    const maSpMap = new Map()
    for (const r of existing as any[]) {
      maSpMap.set(`${r.quy_cach}|${r.loai}|${r.nhom}`, { ma_sp: r.ma_sp, ten_sp: r.ten_sp })
    }

    await db.prepare('DELETE FROM bang_gia_chuan_tinh_gia_dr').run()

    const inserts = rows.map(r => {
      const saved = maSpMap.get(`${r.quy_cach}|${r.loai}|${r.nhom}`)
      return {
        quy_cach: r.quy_cach, loai: r.loai, nhom: r.nhom, gia: r.gia,
        ma_sp: saved?.ma_sp || '', ten_sp: saved?.ten_sp || '',
      }
    })

    const batchSize = 100
    for (let i = 0; i < inserts.length; i += batchSize) {
      const batch = inserts.slice(i, i + batchSize)
      const stmts = batch.map(row =>
        db.prepare(
          'INSERT INTO bang_gia_chuan_tinh_gia_dr (quy_cach, loai, nhom, gia, ma_sp, ten_sp) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(row.quy_cach, row.loai, row.nhom, row.gia, row.ma_sp, row.ten_sp)
      )
      await db.batch(stmts)
    }

    const synced = await syncTableToMisaBulk(c.env.DB, GIA_GOC_SYNC_TABLES.find(s => s.table === 'bang_gia_chuan_tinh_gia_dr')!)
    return c.json({ success: true, total: inserts.length, synced })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})

app.get('/tinh-gia-dr', async (c) => {
  const db = c.env.DB
  const { results } = await db.prepare('SELECT * FROM bang_gia_chuan_tinh_gia_dr ORDER BY nhom, loai, quy_cach').all()
  return c.json({ data: results, total: results.length })
})

// ====== MELAMINE TỔNG HỢP (Ván nhựa – Plywood – OSB – Gỗ ghép) ======

function getGiaMelamine(nhom: string, maMau: string, board: any): number | null {
  if (nhom === 'SÁNG' || nhom === 'TRUNG') return board.gia_sang_trung
  if (nhom === 'TỐI') return board.gia_toi ?? board.gia_toi_don_sac
  // ĐƠN SẮC
  if (maMau === '101') return board.gia_don_sac_101 ?? board.gia_toi_don_sac
  if (maMau === '106') return board.gia_don_sac_106 ?? board.gia_toi_don_sac
  if (maMau === '104') return board.gia_chum_104_106 ?? board.gia_toi_don_sac
  return board.gia_don_sac_khac_da ?? board.gia_toi_don_sac
}

function getGiamTru(nhom: string, maMau: string, discount: any): number {
  if (nhom === 'SÁNG' || nhom === 'TRUNG') return discount?.giam_tru_sang_trung ?? 0
  if (nhom === 'TỐI') return discount?.giam_tru_toi_don_sac ?? 0
  if (['101', '104', '106'].includes(maMau)) return discount?.giam_tru_chum_104_106 ?? 0
  return discount?.giam_tru_toi_don_sac ?? 0
}

app.post('/tinh-gia-melamine-tonghop/tinh-toan', async (c) => {
  try {
    const db = c.env.DB
    const [mauRows, plywoodRows, nhuaRows] = await Promise.all([
      db.prepare('SELECT * FROM bang_gia_chuan_mau_melamine_2 ORDER BY ma_mau').all(),
      db.prepare('SELECT * FROM bang_gia_chuan_melamine_plywood ORDER BY stt').all(),
      db.prepare('SELECT * FROM bang_gia_chuan_melamine_nhua_osb_ghep ORDER BY stt').all(),
    ])

    const maus = mauRows.results as any[]
    const plywoods = plywoodRows.results as any[]
    const nhuas = nhuaRows.results as any[]

    // Preserve existing ma_sp/ten_sp before delete
    const { results: existing } = await db.prepare(
      "SELECT ma_mau, bang, loai_cot, do_day, so_mat, ma_sp, ten_sp FROM bang_gia_chuan_tinh_gia_melamine_tonghop WHERE ma_sp IS NOT NULL AND ma_sp != ''"
    ).all()
    const maSpMap = new Map()
    for (const r of existing as any[]) {
      maSpMap.set(`${r.ma_mau}|${r.bang}|${r.loai_cot}|${r.do_day}|${r.so_mat}`, { ma_sp: r.ma_sp, ten_sp: r.ten_sp })
    }

    await db.prepare('DELETE FROM bang_gia_chuan_tinh_gia_melamine_tonghop').run()

    const inserts: any[] = []

    // Melamine Plywood — bảng giá gốc không phân biệt 1 mặt/2 mặt nên chỉ giữ 2 mặt
    for (const mau of maus) {
      for (const board of plywoods) {
        const gia = getGiaMelamine(mau.nhom, mau.ma_mau, board)
        if (gia === null || gia === undefined || typeof gia !== 'number') continue
        const saved = maSpMap.get(`${mau.ma_mau}|Plywood|${board.loai_cot}|${board.do_day}|2`)
        inserts.push({
          ma_mau: mau.ma_mau, nhom: mau.nhom, phan_nhom: mau.phan_nhom,
          bang: 'Plywood', loai_cot: board.loai_cot, do_day: board.do_day,
          so_mat: 2, gia,
          ma_sp: saved?.ma_sp || '', ten_sp: saved?.ten_sp || '',
        })
      }
    }

    // Ván nhựa – OSB – Gỗ ghép
    const discountRow = nhuas.find(r => r.loai_cot === 'Phủ 1 mặt giảm trừ')
    const boardRows = nhuas.filter(r => r.loai_cot !== 'Phủ 1 mặt giảm trừ')

    for (const mau of maus) {
      for (const board of boardRows) {
        const gia2m = getGiaMelamine(mau.nhom, mau.ma_mau, board)
        if (gia2m === null || gia2m === undefined || typeof gia2m !== 'number') continue
        const giamTru = getGiamTru(mau.nhom, mau.ma_mau, discountRow)
        const gia1m = gia2m - giamTru
        const saved2m = maSpMap.get(`${mau.ma_mau}|Ván nhựa/OSB/Gỗ ghép|${board.loai_cot}|${board.do_day}|2`)
        const saved1m = maSpMap.get(`${mau.ma_mau}|Ván nhựa/OSB/Gỗ ghép|${board.loai_cot}|${board.do_day}|1`)
        inserts.push({
          ma_mau: mau.ma_mau, nhom: mau.nhom, phan_nhom: mau.phan_nhom,
          bang: 'Ván nhựa/OSB/Gỗ ghép', loai_cot: board.loai_cot, do_day: board.do_day,
          so_mat: 2, gia: gia2m,
          ma_sp: saved2m?.ma_sp || '', ten_sp: saved2m?.ten_sp || '',
        })
        if (gia1m > 0) {
          inserts.push({
            ma_mau: mau.ma_mau, nhom: mau.nhom, phan_nhom: mau.phan_nhom,
            bang: 'Ván nhựa/OSB/Gỗ ghép', loai_cot: board.loai_cot, do_day: board.do_day,
            so_mat: 1, gia: gia1m,
            ma_sp: saved1m?.ma_sp || '', ten_sp: saved1m?.ten_sp || '',
          })
        }
      }
    }

    const batchSize = 100
    for (let i = 0; i < inserts.length; i += batchSize) {
      const batch = inserts.slice(i, i + batchSize)
      const stmts = batch.map(row =>
        db.prepare(
          'INSERT INTO bang_gia_chuan_tinh_gia_melamine_tonghop (ma_mau, nhom, phan_nhom, bang, loai_cot, do_day, so_mat, gia, ma_sp, ten_sp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(row.ma_mau, row.nhom, row.phan_nhom, row.bang, row.loai_cot, row.do_day, row.so_mat, row.gia, row.ma_sp, row.ten_sp)
      )
      await db.batch(stmts)
    }

    const synced = await syncTableToMisaBulk(c.env.DB, GIA_GOC_SYNC_TABLES.find(s => s.table === 'bang_gia_chuan_tinh_gia_melamine_tonghop')!)
    return c.json({ success: true, total: inserts.length, synced })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})

app.get('/tinh-gia-melamine-tonghop', async (c) => {
  const db = c.env.DB
  const { results } = await db.prepare('SELECT * FROM bang_gia_chuan_tinh_gia_melamine_tonghop ORDER BY bang, loai_cot, do_day, nhom, ma_mau, so_mat').all()
  return c.json({ data: results, total: results.length })
})

// Auto-assign Mã SP cho Melamine tổng hợp từ danh mục MISA (MELAMINE_SP_INDEX)
// Chỉ gán mã có sẵn trong danh mục, không sinh mã mới. Khớp: loại + độ dày + màu + số mặt + trọng lượng.
function melamineClsWeight(loai: string): { cls: string; weight: string } | null {
  const l = loai.trim()
  if (l === 'EV' || l === 'SW Plywood keo Cp2' || l === 'E0') return { cls: 'PLY', weight: '' }
  if (l.includes('lõi đen')) return { cls: 'LD', weight: '0.65' }
  if (l.includes('0.6')) return { cls: 'DURA', weight: '0.6' }
  if (l.includes('0.5')) return { cls: 'DURA', weight: '0.55' }
  if (l.includes('Gỗ ghép')) return { cls: 'GGCS', weight: '' }
  if (l.includes('OSB')) return { cls: 'OSB', weight: '' }
  return null
}

function melamineNormColor(color: any): string {
  const c = String(color || '').toUpperCase().trim()
  if (/^D\d+$/.test(c)) return 'Đ' + c.slice(1)
  if (c === 'DEN' || c === 'DENS' || c === 'DENSN' || c === 'DENWG') return 'Đ' + c
  return c
}

function melamineThick(doDay: any): string | null {
  const m = String(doDay || '').match(/(\d+(?:\.\d+)?)/)
  if (!m) return null
  const n = parseFloat(m[1])
  return Number.isInteger(n) ? n.toFixed(1) : n.toString()
}

app.post('/tinh-gia-melamine-tonghop/auto-assign-ma-sp', async (c) => {
  try {
    const db = c.env.DB

    // Không xóa sạch mã đã gán — chỉ ghi đè mã khi có match trong danh mục MISA.
    // Các dòng không có match (vd 14 màu đã sinh mã tự động) được giữ nguyên mã hiện tại.
    const { results } = await db.prepare('SELECT * FROM bang_gia_chuan_tinh_gia_melamine_tonghop').all()
    const rows = results as any[]

    const toAssign: { id: number; ma_sp: string; ten_sp: string }[] = []
    let skipped = 0

    for (const r of rows) {
      const mw = melamineClsWeight(r.loai_cot)
      if (!mw || mw.cls === 'OSB') { skipped++; continue }
      const thick = melamineThick(r.do_day)
      const color = melamineNormColor(r.ma_mau)
      if (!thick || !color) { skipped++; continue }

      const baseKey = `${mw.cls}|${thick}|${color}|${r.so_mat}`
      const sub = MELAMINE_SP_INDEX[baseKey]
      if (!sub) { skipped++; continue }

      const hit = sub[mw.weight]
      if (!hit) { skipped++; continue }
      toAssign.push({ id: r.id, ma_sp: hit[0], ten_sp: hit[1] })
    }

    // Cập nhật ma_sp + ten_sp (multi-row UPDATE chunk)
    const updChunk = 30
    for (let i = 0; i < toAssign.length; i += updChunk) {
      const chunk = toAssign.slice(i, i + updChunk)
      const idList = chunk.map(g => g.id).join(',')
      const maCases = chunk.map(g => `WHEN ${g.id} THEN ?`).join(' ')
      const tenCases = chunk.map(g => `WHEN ${g.id} THEN ?`).join(' ')
      const params: any[] = []
      for (const g of chunk) params.push(g.ma_sp)
      for (const g of chunk) params.push(g.ten_sp)
      await db.prepare(
        `UPDATE bang_gia_chuan_tinh_gia_melamine_tonghop SET ma_sp = CASE id ${maCases} END, ten_sp = CASE id ${tenCases} END WHERE id IN (${idList})`
      ).bind(...params).run()
    }

    return c.json({ success: true, assigned: toAssign.length, skipped })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})

// ====== SINH MÃ SP CHO MELAMINE TỔNG HỢP (màu còn thiếu tổ hợp) ======
// Chiến lược: giữ nguyên mã đã gán (auto-assign), chỉ sinh mã mới cho dòng còn trống.
// 1. Màu có trong danh mục nhưng thiếu (thick, mat) -> sinh theo hiệu ứng phổ biến của chính màu đó.
// 2. Màu chưa từng xuất hiện cho nhóm -> dùng hiệu ứng mặc định theo phân nhóm (VÂN GỖ→WN, ĐÁ→T, ĐƠN SẮC→T, VẢI→T, ART→WN).
// 3. 14 màu không có bất kỳ mã nào trong danh mục + OSB -> để trống.
// 4. GKT: giữ theo màu gốc (màu có GKT trong danh mục thì mã sinh có GKT, ngược lại không).

function melamineMaColor(color: string): string {
  // Mã SP dùng màu không dấu: Đ1→D1, ĐEN→DEN, ĐỎ→DO
  let c = color.toUpperCase().trim()
  if (c.includes('Đ')) {
    c = c.startsWith('Đ') ? 'D' + c.slice(1) : c.replace('Đ', 'D')
    c = removeAccents(c).toUpperCase()
  }
  return c
}

const MELAMINE_PHAN_DEFAULT: Record<string, string> = {
  'VÂN GỖ': 'WN', 'ĐÁ': 'T', 'ĐƠN SẮC': 'T', 'VẢI': 'T', 'ART': 'WN',
}

function melamineFmtThick(t: number): string {
  return Number.isInteger(t) ? String(t) : String(t)
}

function melamineGenCode(cls: string, thick: number, color: string, mat: number, weight: string, phanNhom: string): [string, string] | null {
  const tc = cls === 'PLY' ? (thick === 1.2 ? '1.2' : (thick < 10 ? `0${Math.round(thick)}` : String(Math.round(thick))))
    : (thick < 10 ? `0${Math.round(thick)}` : String(Math.round(thick)))
  const effKey = `${cls}|${color}|${mat}`
  let base = MELAMINE_EFFECT_RULES[effKey]
  let gkt = MELAMINE_GKT_RULES[effKey] || ''
  if (!base) {
    const altKey = `${cls}|${color}|${mat === 1 ? 2 : 1}`
    base = MELAMINE_EFFECT_RULES[altKey]
    gkt = MELAMINE_GKT_RULES[altKey] || ''
  }
  if (!base) {
    base = MELAMINE_PHAN_DEFAULT[phanNhom] || 'WN'
    gkt = ''
  }
  const mc = melamineMaColor(color)
  const thickLabel = melamineFmtThick(thick)
  if (cls === 'PLY') {
    const line = thick === 1.2 ? 'EV' : 'KT'
    const ma = `MEVE${tc}${mc}${base}${mat}${line}`
    const ten = `Ván ép ${thickLabel}mm x1220x2440 ${line} MEL ${color} ${base} ${mat} mặt`
    return [ma, ten]
  }
  if (cls === 'DURA') {
    const wc = weight === '0.5' ? '05' : weight === '0.55' ? '055' : weight === '0.6' ? '06' : weight === '0.65' ? '065' : ''
    if (!wc) return null
    const ma = `MEVN${tc}${wc}${gkt}${mc}${base}${mat}`
    const ten = `Ván Nhựa Durabo ${thickLabel}mm x1220x2440 ${weight}g MEL ${color} ${base} ${mat} mặt`
    return [ma, ten]
  }
  if (cls === 'LD') {
    const ma = `MEVN${tc}065${mc}${base}${mat}LĐ`
    const ten = `Ván nhựa lõi đen ${thickLabel}mm x1220x2440 0.65g MEL ${color} ${base} ${mat} mặt`
    return [ma, ten]
  }
  if (cls === 'GGCS') {
    const ma = `MEGG${tc}AC${mc}${base}${mat}`
    const ten = `Gỗ Ghép Cao Su ${thickLabel}mm x1220x2440 MEL ${color} ${base} ${mat} mặt`
    return [ma, ten]
  }
  return null
}

app.post('/tinh-gia-melamine-tonghop/auto-generate-ma-sp', async (c) => {
  try {
    const db = c.env.DB
    const { results } = await db.prepare("SELECT * FROM bang_gia_chuan_tinh_gia_melamine_tonghop WHERE ma_sp = '' OR ma_sp IS NULL").all()
    const rows = results as any[]

    // Build tập mã đã tồn tại trong danh mục để tránh sinh trùng
    const existing = new Set<string>()
    for (const k of Object.keys(MELAMINE_SP_INDEX)) {
      for (const w of Object.keys(MELAMINE_SP_INDEX[k])) existing.add(MELAMINE_SP_INDEX[k][w][0])
    }

    const toAssign: { id: number; ma_sp: string; ten_sp: string }[] = []
    let skipped = 0
    let conflict = 0

    for (const r of rows) {
      const mw = melamineClsWeight(r.loai_cot)
      if (!mw || mw.cls === 'OSB') { skipped++; continue }
      const thick = melamineThick(r.do_day)
      const color = melamineNormColor(r.ma_mau)
      if (!thick || !color) { skipped++; continue }
      if (MELAMINE_MISSING_COLORS.includes(color)) { skipped++; continue }

      // Kiểm tra mã thật có sẵn (trường hợp weight thay đổi: DURABO 0.5-0.55 thử cả 0.55 và 0.5)
      const baseKey = `${mw.cls}|${thick}|${color}|${r.so_mat}`
      const sub = MELAMINE_SP_INDEX[baseKey]
      let hit: [string, string] | null = null
      if (sub) {
        const weights = mw.weight ? (mw.cls === 'DURA' && mw.weight === '0.55' ? ['0.55', '0.5'] : [mw.weight]) : ['']
        for (const w of weights) {
          if (sub[w]) { hit = sub[w]; break }
        }
      }
      if (hit) { toAssign.push({ id: r.id, ma_sp: hit[0], ten_sp: hit[1] }); continue }

      const gen = melamineGenCode(mw.cls, parseFloat(thick), color, r.so_mat, mw.weight, r.phan_nhom)
      if (!gen) { skipped++; continue }
      if (existing.has(gen[0])) { conflict++; continue }
      toAssign.push({ id: r.id, ma_sp: gen[0], ten_sp: gen[1] })
    }

    const updChunk = 30
    for (let i = 0; i < toAssign.length; i += updChunk) {
      const chunk = toAssign.slice(i, i + updChunk)
      const idList = chunk.map(g => g.id).join(',')
      const maCases = chunk.map(g => `WHEN ${g.id} THEN ?`).join(' ')
      const tenCases = chunk.map(g => `WHEN ${g.id} THEN ?`).join(' ')
      const params: any[] = []
      for (const g of chunk) params.push(g.ma_sp)
      for (const g of chunk) params.push(g.ten_sp)
      await db.prepare(
        `UPDATE bang_gia_chuan_tinh_gia_melamine_tonghop SET ma_sp = CASE id ${maCases} END, ten_sp = CASE id ${tenCases} END WHERE id IN (${idList})`
      ).bind(...params).run()
    }

    return c.json({ success: true, assigned: toAssign.length, skipped, conflict })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})



const ACRYLIC_COL_MAP: Record<string, string> = {
  'Đơn sắc': 'gia_ds',
  'Ánh kim': 'gia_ak',
  'Vân gỗ': 'gia_vg',
}

app.post('/tinh-gia-acrylic/tinh-toan', async (c) => {
  try {
    const db = c.env.DB
    const [colorRows, boardRows] = await Promise.all([
      db.prepare('SELECT * FROM bang_gia_chuan_acrylic ORDER BY series, ma_mau').all(),
      db.prepare('SELECT * FROM bang_gia_chuan_van_phu_acrylic ORDER BY series, phu, board_type').all(),
    ])
    const colors = colorRows.results as any[]
    const boards = boardRows.results as any[]

    // Preserve existing ma_sp before delete (tinh-gia-acrylic rebuilds this table)
    const { results: existingAcrylic } = await db.prepare(
      "SELECT ma_mau, series, loai_mau, phu, board_type, ma_sp FROM bang_gia_chuan_tinh_gia_acrylic WHERE ma_sp IS NOT NULL AND ma_sp != ''"
    ).all()
    const spByAcrylicKey = new Map<string, string>()
    for (const r of existingAcrylic as any[]) {
      const key = `${r.ma_mau}|${r.series}|${r.loai_mau}|${r.phu}|${r.board_type}`
      if (!spByAcrylicKey.has(key)) spByAcrylicKey.set(key, r.ma_sp)
    }

    await db.prepare('DELETE FROM bang_gia_chuan_tinh_gia_acrylic').run()

    const inserts: any[] = []
    for (const c of colors) {
      const col = ACRYLIC_COL_MAP[c.loai_mau]
      if (!col) continue
      for (const b of boards) {
        if (b.series !== c.series) continue
        const gia = b[col]
        if (gia !== null && gia !== undefined && typeof gia === 'number') {
          const key = `${c.ma_mau}|${c.series}|${c.loai_mau}|${b.phu}|${b.board_type}`
          inserts.push({ ma_mau: c.ma_mau, series: c.series, loai_mau: c.loai_mau, phu: b.phu, board_type: b.board_type, gia, ma_sp: spByAcrylicKey.get(key) || null })
        }
      }
    }

    const batchSize = 100
    for (let i = 0; i < inserts.length; i += batchSize) {
      const batch = inserts.slice(i, i + batchSize)
      const stmts = batch.map(row =>
        db.prepare(
          'INSERT INTO bang_gia_chuan_tinh_gia_acrylic (ma_mau, series, loai_mau, phu, board_type, gia, ma_sp) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(row.ma_mau, row.series, row.loai_mau, row.phu, row.board_type, row.gia, row.ma_sp)
      )
      await db.batch(stmts)
    }

    const synced = await syncTableToMisaBulk(c.env.DB, GIA_GOC_SYNC_TABLES.find(s => s.table === 'bang_gia_chuan_tinh_gia_acrylic')!)
    return c.json({ success: true, total: inserts.length, synced })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})

app.get('/tinh-gia-acrylic', async (c) => {
  const db = c.env.DB
  const { results } = await db.prepare('SELECT * FROM bang_gia_chuan_tinh_gia_acrylic ORDER BY series, loai_mau, ma_mau, phu, board_type').all()
  return c.json({ data: results, total: results.length })
})

// ====== ONE LAMINATE ======

function extractNhomShort(nhom: string): string {
  const m = nhom.match(/\(([^)]+)\)/)
  return m ? m[1] : nhom
}

const ONE_LAM_COL_MAP_1M: Record<string, string> = {
  'LE1': 'gia_1m_le1', 'LE2': 'gia_1m_le2', 'LP1': 'gia_1m_lp1', 'LP2': 'gia_1m_lp2', 'LP3': 'gia_1m_lp3',
}
const ONE_LAM_COL_MAP_2M: Record<string, string> = {
  'LE1': 'gia_2m_le1', 'LE2': 'gia_2m_le2', 'LP1': 'gia_2m_lp1', 'LP2': 'gia_2m_lp2', 'LP3': 'gia_2m_lp3',
}

app.post('/tinh-gia-one-laminate/tinh-toan', async (c) => {
  try {
    const db = c.env.DB
    const [colorRows, vnRows, osbRows] = await Promise.all([
      db.prepare('SELECT * FROM bang_gia_chuan_one_laminate ORDER BY nhom, ma_mau').all(),
      db.prepare('SELECT * FROM bang_gia_chuan_van_nhua_phu_hpl ORDER BY stt').all(),
      db.prepare('SELECT * FROM bang_gia_chuan_osb_ghep_ep_phu_hpl ORDER BY stt').all(),
    ])
    const colors = colorRows.results as any[]
    const vns = vnRows.results as any[]
    const osbs = osbRows.results as any[]

    // Preserve existing ma_sp/ten_sp before delete
    const { results: existing } = await db.prepare(
      "SELECT ma_mau, nhom, nguon, loai_van, do_day, do_day_tp, so_mat, ma_sp, ten_sp FROM bang_gia_chuan_tinh_gia_one_laminate WHERE ma_sp IS NOT NULL AND ma_sp != ''"
    ).all()
    const spByKey = new Map<string, { ma_sp: string; ten_sp: string }>()
    for (const r of existing as any[]) {
      const key = `${r.ma_mau}|${r.nhom}|${r.nguon}|${r.loai_van}|${r.do_day}|${r.do_day_tp}|${r.so_mat}`
      if (!spByKey.has(key)) spByKey.set(key, { ma_sp: r.ma_sp, ten_sp: r.ten_sp || r.ma_sp })
    }

    await db.prepare('DELETE FROM bang_gia_chuan_tinh_gia_one_laminate').run()

    const inserts: any[] = []

    for (const c of colors) {
      const shortNhom = extractNhomShort(c.nhom)
      const col1m = ONE_LAM_COL_MAP_1M[shortNhom]
      const col2m = ONE_LAM_COL_MAP_2M[shortNhom]

      // Ván nhựa phủ HPL
      for (const b of vns) {
        if (col1m && b[col1m] !== null && typeof b[col1m] === 'number') {
          const key = `${c.ma_mau}|${c.nhom}|Ván nhựa|${b.loai_van}|${b.do_day}|${b.do_day_tp}|1`
          const sp = spByKey.get(key)
          inserts.push({ ma_mau: c.ma_mau, nhom: c.nhom, gia_foil: c.gia_foil, nguon: 'Ván nhựa', loai_van: b.loai_van, do_day: b.do_day, do_day_tp: b.do_day_tp, so_mat: 1, gia: b[col1m], ma_sp: sp?.ma_sp || null, ten_sp: sp?.ten_sp || null })
        }
        if (col2m && b[col2m] !== null && typeof b[col2m] === 'number') {
          const key = `${c.ma_mau}|${c.nhom}|Ván nhựa|${b.loai_van}|${b.do_day}|${b.do_day_tp}|2`
          const sp = spByKey.get(key)
          inserts.push({ ma_mau: c.ma_mau, nhom: c.nhom, gia_foil: c.gia_foil, nguon: 'Ván nhựa', loai_van: b.loai_van, do_day: b.do_day, do_day_tp: b.do_day_tp, so_mat: 2, gia: b[col2m], ma_sp: sp?.ma_sp || null, ten_sp: sp?.ten_sp || null })
        }
      }

      // OSB / Gỗ ghép / Ván ép phủ HPL
      for (const b of osbs) {
        if (col1m && b[col1m] !== null && typeof b[col1m] === 'number') {
          const key = `${c.ma_mau}|${c.nhom}|OSB/Gỗ ghép/Ván ép|${b.loai_van}|${b.do_day}|${b.do_day_tp}|1`
          const sp = spByKey.get(key)
          inserts.push({ ma_mau: c.ma_mau, nhom: c.nhom, gia_foil: c.gia_foil, nguon: 'OSB/Gỗ ghép/Ván ép', loai_van: b.loai_van, do_day: b.do_day, do_day_tp: b.do_day_tp, so_mat: 1, gia: b[col1m], ma_sp: sp?.ma_sp || null, ten_sp: sp?.ten_sp || null })
        }
        if (col2m && b[col2m] !== null && typeof b[col2m] === 'number') {
          const key = `${c.ma_mau}|${c.nhom}|OSB/Gỗ ghép/Ván ép|${b.loai_van}|${b.do_day}|${b.do_day_tp}|2`
          const sp = spByKey.get(key)
          inserts.push({ ma_mau: c.ma_mau, nhom: c.nhom, gia_foil: c.gia_foil, nguon: 'OSB/Gỗ ghép/Ván ép', loai_van: b.loai_van, do_day: b.do_day, do_day_tp: b.do_day_tp, so_mat: 2, gia: b[col2m], ma_sp: sp?.ma_sp || null, ten_sp: sp?.ten_sp || null })
        }
      }
    }

    const batchSize = 100
    for (let i = 0; i < inserts.length; i += batchSize) {
      const batch = inserts.slice(i, i + batchSize)
      const stmts = batch.map(row =>
        db.prepare(
          'INSERT INTO bang_gia_chuan_tinh_gia_one_laminate (ma_mau, nhom, gia_foil, nguon, loai_van, do_day, do_day_tp, so_mat, gia, ma_sp, ten_sp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(row.ma_mau, row.nhom, row.gia_foil, row.nguon, row.loai_van, row.do_day, row.do_day_tp, row.so_mat, row.gia, row.ma_sp, row.ten_sp)
      )
      await db.batch(stmts)
    }

    const synced = await syncTableToMisaBulk(c.env.DB, GIA_GOC_SYNC_TABLES.find(s => s.table === 'bang_gia_chuan_tinh_gia_one_laminate')!)
    return c.json({ success: true, total: inserts.length, synced })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})

app.get('/tinh-gia-one-laminate', async (c) => {
  const db = c.env.DB
  const { results } = await db.prepare('SELECT * FROM bang_gia_chuan_tinh_gia_one_laminate ORDER BY nguon, loai_van, do_day, so_mat, nhom, ma_mau').all()
  return c.json({ data: results, total: results.length })
})

// ─── Giá gốc tổng hợp ────────────────────────────────────────

const MODULE_TABLES: Record<string, { table: string, genMoTa: (r: any) => string }> = {
  vdo: {
    table: 'bang_gia_chuan_tinh_gia_vdo',
    genMoTa: r => `${r.board_loai} ${r.board_quy_cach} Melamine ${r.color_nhom} ${r.so_mat} mặt Phụ thu ${r.phu_thu_loai}`,
  },
  vmh: {
    table: 'bang_gia_chuan_tinh_gia_vmh',
    genMoTa: r => `${r.board_loai} ${r.board_quy_cach} Melamine ${r.color_nhom} ${r.so_mat} mặt Phụ thu ${r.phu_thu_loai}`,
  },
  gg: {
    table: 'bang_gia_chuan_tinh_gia_gg',
    genMoTa: r => `${r.loai} ${r.quy_cach} ${r.nhom}`,
  },
  ve: {
    table: 'bang_gia_chuan_tinh_gia_ve',
    genMoTa: r => `${r.loai} ${r.quy_cach} ${r.nhom}`,
  },
  osb: {
    table: 'bang_gia_chuan_tinh_gia_osb',
    genMoTa: r => `${r.loai} ${r.do_day} ${r.nhom}`,
  },
  dr: {
    table: 'bang_gia_chuan_tinh_gia_dr',
    genMoTa: r => `${r.loai} ${r.quy_cach} ${r.nhom}`,
  },
  pvc_petg: {
    table: 'bang_gia_chuan_tinh_gia_pvc_petg',
    genMoTa: r => `${r.loai_van} ${r.do_day} ${r.nhom} ${r.ma_mau} ${r.so_mat} mặt`,
  },
  melamine_tonghop: {
    table: 'bang_gia_chuan_tinh_gia_melamine_tonghop',
    genMoTa: r => `${r.bang} ${r.loai_cot} ${r.do_day} Melamine ${r.ma_mau} ${r.so_mat} mặt`,
  },
  acrylic: {
    table: 'bang_gia_chuan_tinh_gia_acrylic',
    genMoTa: r => `${r.board_type} Acrylic ${r.ma_mau} ${r.loai_mau}`,
  },
  one_laminate: {
    table: 'bang_gia_chuan_tinh_gia_one_laminate',
    genMoTa: r => `${r.loai_van} ${r.do_day} OneLaminate ${r.ma_mau} ${r.so_mat} mặt`,
  },
}

app.post('/gia-goc-tong-hop/populate', async (c) => {
  try {
    const db = c.env.DB
    await db.prepare('DELETE FROM gia_goc_tong_hop').run()

    let total = 0
    for (const [module, cfg] of Object.entries(MODULE_TABLES)) {
      const { results } = await db.prepare(`SELECT * FROM ${cfg.table}`).all()
      const rows = results as any[]
      const batch: any[] = []
      for (const r of rows) {
        const gia = r.tong_gia ?? r.gia ?? 0
        if (!gia) continue
        const mo_ta = cfg.genMoTa(r)
        const mo_ta_search = removeAccents(mo_ta).toLowerCase()
        batch.push({ module, ref_id: r.id, mo_ta, mo_ta_search, gia_goc: gia })
      }
      for (let i = 0; i < batch.length; i += 100) {
        const chunk = batch.slice(i, i + 100)
        const stmts = chunk.map(row =>
          db.prepare(
            'INSERT INTO gia_goc_tong_hop (module, ref_id, mo_ta, mo_ta_search, gia_goc) VALUES (?, ?, ?, ?, ?)'
          ).bind(row.module, row.ref_id, row.mo_ta, row.mo_ta_search, row.gia_goc)
        )
        await db.batch(stmts)
      }
      total += batch.length
    }
    return c.json({ success: true, total })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})

function tokenize(text: string): Set<string> {
  const t = removeAccents(text.toLowerCase())
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const stopwords = new Set([
    'van', 'phu', 'mat', 'mm', 'ly', 'kg', 'dh', 'foil', 'cot', 'loai',
    'nhom', 'bang', 'tam', 'tờ', 'cao', 'ki', 'soi', 'ghep', 'ep',
  ])
  return new Set(t.split(' ').filter(w => w.length > 1 && !stopwords.has(w)))
}

function scoreTokens(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const t of a) if (b.has(t)) inter++
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

app.post('/gia-goc-tong-hop/match', async (c) => {
  try {
    const db = c.env.DB
    const body = await c.req.json().catch(() => ({}))
    const batchSize = Math.min(body.batchSize || 500, 1000)
    const offset = body.offset || 0

    // Load ALL ggth items into memory (20k rows is fine)
    const { results: ggthRows } = await db.prepare(
      'SELECT id, module, mo_ta, mo_ta_search, gia_goc FROM gia_goc_tong_hop'
    ).all()
    const ggthList = ggthRows as any[]
    const ggthTokens: { tokens: Set<string> }[] = []
    for (const g of ggthList) {
      ggthTokens.push({ tokens: tokenize(g.mo_ta_search) })
    }

    // Build token → [ggth indices] map
    const tokenIndex = new Map<string, number[]>()
    for (let i = 0; i < ggthTokens.length; i++) {
      for (const t of ggthTokens[i].tokens) {
        let arr = tokenIndex.get(t)
        if (!arr) { arr = []; tokenIndex.set(t, arr) }
        if (arr[arr.length - 1] !== i) arr.push(i)
      }
    }

    const { results: misaRows } = await db.prepare(
      "SELECT id, ma_sp, ten_sp FROM ma_misa WHERE ten_sp IS NOT NULL AND ten_sp != '' ORDER BY id LIMIT ? OFFSET ?"
    ).bind(batchSize, offset).all()
    const misaList = misaRows as any[]
    if (misaList.length === 0) return c.json({ success: true, done: true, total: 0, matched: 0, unmatched: 0 })

    const updates: { id: number, score: number, module: string, mo_ta: string, gia_goc: number }[] = []
    let matched = 0, unmatched = 0

    for (const m of misaList) {
      const misaTokens = tokenize(m.ten_sp)
      if (misaTokens.size === 0) { unmatched++; continue }

      const candidateSet = new Set<number>()
      for (const t of misaTokens) {
        const indices = tokenIndex.get(t)
        if (indices) for (const idx of indices) candidateSet.add(idx)
      }

      let bestScore = 0
      let best: any = null
      for (const idx of candidateSet) {
        const g = ggthList[idx]
        const score = scoreTokens(misaTokens, ggthTokens[idx].tokens)
        if (score > bestScore) { bestScore = score; best = g }
      }

      if (best && bestScore >= 0.15) {
        updates.push({ id: m.id, score: Math.round(bestScore * 100) / 100, module: best.module, mo_ta: best.mo_ta, gia_goc: best.gia_goc })
        matched++
      } else {
        updates.push({ id: m.id, score: 0, module: '', mo_ta: '', gia_goc: 0 })
        unmatched++
      }
    }

    for (let i = 0; i < updates.length; i += 100) {
      const chunk = updates.slice(i, i + 100)
      const stmts = chunk.map(u =>
        db.prepare(
          "UPDATE ma_misa SET match_status = ?, match_score = ?, match_module = ?, match_mo_ta = ?, gia_goc = ?, match_updated_at = datetime('now','+7 hours') WHERE id = ?"
        ).bind(
          u.score >= 0.15 ? 'matched' : 'unmatched',
          u.score, u.module, u.mo_ta,
          u.score >= 0.15 ? u.gia_goc : null,
          u.id
        )
      )
      await db.batch(stmts)
    }

    return c.json({ success: true, done: false, batch: misaList.length, matched, unmatched, nextOffset: offset + batchSize })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})

app.get('/gia-goc-tong-hop/match', async (c) => {
  const db = c.env.DB
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 2000)
  const offset = parseInt(c.req.query('offset') || '0')
  const status = c.req.query('status') || ''

  let where = ''
  const params: any[] = []
  if (status === 'matched') { where = 'WHERE match_status = ?'; params.push('matched') }
  else if (status === 'unmatched') { where = "WHERE match_status = 'unmatched'" }

  const { results } = await db.prepare(
    `SELECT id, ma_sp, ten_sp, gia_goc, match_status, match_score, match_module, match_mo_ta, match_updated_at
     FROM ma_misa ${where} ORDER BY match_score DESC, ma_sp LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all()

  const { results: countResult } = await db.prepare(
    `SELECT COUNT(*) as cnt FROM ma_misa ${where}`
  ).bind(...params).all()

  return c.json({ data: results, total: (countResult as any[])[0]?.cnt || 0 })
})

app.post('/gia-goc-tong-hop/match/:id/override', async (c) => {
  try {
    const db = c.env.DB
    const id = parseInt(c.req.param('id'))
    const body = await c.req.json()
    if (!body.gia_goc) return c.json({ error: 'Missing gia_goc' }, 400)

    await db.prepare(
      "UPDATE ma_misa SET gia_goc = ?, match_status = 'overridden', match_score = 1, match_module = ?, match_mo_ta = ?, match_updated_at = datetime('now','+7 hours') WHERE id = ?"
    ).bind(body.gia_goc, body.module || 'manual', body.mo_ta || '', id).run()

    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/gia-chuan/gia-goc-tong-hop/restore-unmatched — phục hồi match cho các mã đang
// 'unmatched' (đã bị gỡ) bằng cách chạy lại thuật toán match giống hệt /match.
// Không chạm mã 'manual'/'pending'/'overridden'. Idempotent.
app.post('/gia-goc-tong-hop/restore-unmatched', async (c) => {
  try {
    const db = c.env.DB
    const body = await c.req.json().catch(() => ({}))
    const batchSize = Math.min(body.batchSize || 300, 500)
    const lastId = body.lastId || 0

    const { results: ggthRows } = await db.prepare(
      'SELECT id, module, mo_ta, mo_ta_search, gia_goc FROM gia_goc_tong_hop'
    ).all()
    const ggthList = ggthRows as any[]
    const ggthTokens: { tokens: Set<string> }[] = []
    for (const g of ggthList) ggthTokens.push({ tokens: tokenize(g.mo_ta_search) })

    const tokenIndex = new Map<string, number[]>()
    for (let i = 0; i < ggthTokens.length; i++) {
      for (const t of ggthTokens[i].tokens) {
        let arr = tokenIndex.get(t)
        if (!arr) { arr = []; tokenIndex.set(t, arr) }
        if (arr[arr.length - 1] !== i) arr.push(i)
      }
    }

    const { results: misaRows } = await db.prepare(
      "SELECT id, ma_sp, ten_sp FROM ma_misa WHERE ten_sp IS NOT NULL AND ten_sp != '' AND match_status = 'unmatched' AND id > ? ORDER BY id LIMIT ?"
    ).bind(lastId, batchSize).all()
    const misaList = misaRows as any[]
    if (misaList.length === 0) return c.json({ success: true, total: 0, done: true, matched: 0, unmatched: 0 })

    const updates: { id: number, score: number, module: string, mo_ta: string, gia_goc: number }[] = []
    let matched = 0, unmatched = 0

    for (const m of misaList) {
      const misaTokens = tokenize(m.ten_sp)
      if (misaTokens.size === 0) { unmatched++; continue }

      const candidateSet = new Set<number>()
      for (const t of misaTokens) {
        const indices = tokenIndex.get(t)
        if (indices) for (const idx of indices) candidateSet.add(idx)
      }

      let bestScore = 0
      let best: any = null
      for (const idx of candidateSet) {
        const g = ggthList[idx]
        const score = scoreTokens(misaTokens, ggthTokens[idx].tokens)
        if (score > bestScore) { bestScore = score; best = g }
      }

      if (best && bestScore >= 0.15) {
        updates.push({ id: m.id, score: Math.round(bestScore * 100) / 100, module: best.module, mo_ta: best.mo_ta, gia_goc: best.gia_goc })
        matched++
      } else { unmatched++ }
    }

    for (let i = 0; i < updates.length; i += 100) {
      const chunk = updates.slice(i, i + 100)
      const stmts = chunk.map(u =>
        db.prepare(
          "UPDATE ma_misa SET match_status = ?, match_score = ?, match_module = ?, match_mo_ta = ?, gia_goc = ?, match_updated_at = datetime('now','+7 hours') WHERE id = ?"
        ).bind(
          u.score >= 0.15 ? 'matched' : 'unmatched',
          u.score, u.module, u.mo_ta,
          u.score >= 0.15 ? u.gia_goc : null,
          u.id
        )
      )
      await db.batch(stmts)
    }

    const nextId = misaList[misaList.length - 1].id
    return c.json({ success: true, total: misaList.length, done: false, matched, unmatched, nextId })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})

// POST /api/gia-chuan/gia-goc-tong-hop/unmatch-wrong-material — gỡ match cho mã Melamine
// (ten_sp chứa "MEL") đang match sang module vật liệu khác (ván nhựa PETG, veneer,
// OneLaminate, gỗ ghép, DURABO, Acrylic, OSB). Mã bị gỡ → match_status='unmatched',
// gia_goc=NULL. Idempotent: chạy lại được, chỉ ảnh hưởng mã đang matched sai.
app.post('/gia-goc-tong-hop/unmatch-wrong-material', async (c) => {
  try {
    const db = c.env.DB
    const { results } = await db.prepare(
      "SELECT id, ma_sp, ten_sp, match_module FROM ma_misa WHERE match_status = 'matched'"
    ).all()
    const rows = results as any[]
    const badMods = ['pvc_petg', 've', 'one_laminate', 'gg', 'dr', 'acrylic', 'osb']
    const ids: number[] = []
    for (const r of rows) {
      const ten = String(r.ten_sp || '').toUpperCase()
      if (ten.includes('MEL') && badMods.includes(r.match_module)) ids.push(r.id)
    }
    let updated = 0
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100)
      const stmts = chunk.map(id =>
        db.prepare(
          "UPDATE ma_misa SET match_status = 'unmatched', match_score = 0, match_module = '', match_mo_ta = '', gia_goc = NULL, match_updated_at = datetime('now','+7 hours') WHERE id = ?"
        ).bind(id)
      )
      await db.batch(stmts)
      updated += chunk.length
    }
    return c.json({ success: true, total: ids.length, updated })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})

// Export data for local matching
app.get('/gia-goc-tong-hop/ggth-all', async (c) => {
  const db = c.env.DB
  const { results } = await db.prepare('SELECT id, module, ref_id, mo_ta, mo_ta_search, gia_goc FROM gia_goc_tong_hop').all()
  return c.json(results)
})

app.get('/gia-goc-tong-hop/misa-all', async (c) => {
  const db = c.env.DB
  const { results } = await db.prepare("SELECT id, ma_sp, ten_sp FROM ma_misa WHERE ten_sp IS NOT NULL AND ten_sp != ''").all()
  return c.json(results)
})

app.post('/gia-goc-tong-hop/match-update', async (c) => {
  try {
    const db = c.env.DB
    const { results } = await c.req.json()
    for (let i = 0; i < results.length; i += 100) {
      const chunk = results.slice(i, i + 100)
      const stmts = chunk.map((u: any) =>
        db.prepare(
          "UPDATE ma_misa SET match_status = ?, match_score = ?, match_module = ?, match_mo_ta = ?, gia_goc = ?, match_updated_at = datetime('now','+7 hours') WHERE id = ?"
        ).bind(
          u.matched ? 'matched' : 'unmatched',
          u.score, u.module, u.mo_ta,
          u.matched ? u.gia_goc : null,
          u.id
        )
      )
      await db.batch(stmts)
    }
    return c.json({ success: true, updated: results.length })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Bulk update ma_sp + ten_sp on a pricing table
app.post('/gia-goc-tong-hop/update-ma-sp', async (c) => {
  try {
    const db = c.env.DB
    if (await isBangGiaLocked(db)) {
      return c.json({ error: 'Bảng Tính Giá đang bị KHÓA. Gán mã tay đã bị chặn — hãy liên hệ Admin.' }, 423)
    }
    const { table, rows } = await c.req.json()
    if (!table || !rows || !Array.isArray(rows)) return c.json({ error: 'Invalid payload' }, 400)

    // Validate table name to prevent injection
    const allowed = [
      'bang_gia_chuan_tinh_gia_vdo', 'bang_gia_chuan_tinh_gia_vmh',
      'bang_gia_chuan_tinh_gia_gg', 'bang_gia_chuan_tinh_gia_ve',
      'bang_gia_chuan_tinh_gia_osb', 'bang_gia_chuan_tinh_gia_dr',
      'bang_gia_chuan_tinh_gia_pvc_petg', 'bang_gia_chuan_tinh_gia_melamine_tonghop',
      'bang_gia_chuan_tinh_gia_acrylic', 'bang_gia_chuan_tinh_gia_one_laminate',
      'bang_gia_chuan_mirror', 'bang_gia_chuan_keo_hat',
      'bang_gia_chuan_acrylic', 'bang_gia_chuan_van_phu_acrylic',
      'bang_gia_chuan_one_laminate', 'bang_gia_chuan_van_nhua_phu_hpl',
      'bang_gia_chuan_osb_ghep_ep_phu_hpl',
      'bang_gia_chuan_veneer', 'bang_gia_chuan_mat_phu_khac',
      'bang_gia_chuan_chi_nep',
    ]
    if (!allowed.includes(table)) return c.json({ error: 'Invalid table name' }, 400)

    // Upsert ma_sp into ma_misa (so manually-added codes are searchable)
    const toUpsert = rows.filter((r: any) => r.ma_sp && String(r.ma_sp).trim() !== '')
    if (toUpsert.length > 0) {
      for (const r of toUpsert) {
        const ma = String(r.ma_sp).trim()
        const ten = r.ten_sp ? String(r.ten_sp).trim() : ma
        const existing = await db.prepare('SELECT id FROM ma_misa WHERE ma_sp = ?').bind(ma).first()
        if (!existing) {
          await db.prepare('INSERT INTO ma_misa (ma_sp, ten_sp, match_status) VALUES (?, ?, ?)').bind(ma, ten, 'manual').run()
        }
      }
    }

    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100)
      const stmts = chunk.map((r: any) =>
        db.prepare(
          `UPDATE ${table} SET ma_sp = ?, ten_sp = ? WHERE id = ?`
        ).bind(r.ma_sp, r.ten_sp, r.id)
      )
      await db.batch(stmts)
    }
    return c.json({ success: true, updated: rows.length })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// So sánh Bảng Tính Giá vs Giá gốc MISA
const MODULE_KIEM_TRA = {
  vdo: { table: 'bang_gia_chuan_tinh_gia_vdo', priceCol: 'tong_gia', labelCols: ['board_loai', 'board_quy_cach', 'color_nhom', 'so_mat'] },
  vmh: { table: 'bang_gia_chuan_tinh_gia_vmh', priceCol: 'tong_gia', labelCols: ['board_loai', 'board_quy_cach', 'color_nhom', 'so_mat'] },
  gg: { table: 'bang_gia_chuan_tinh_gia_gg', priceCol: 'gia', labelCols: ['loai', 'quy_cach', 'nhom'] },
  ve: { table: 'bang_gia_chuan_tinh_gia_ve', priceCol: 'gia', labelCols: ['loai', 'quy_cach', 'nhom'] },
  osb: { table: 'bang_gia_chuan_tinh_gia_osb', priceCol: 'gia', labelCols: ['loai', 'do_day', 'nhom'] },
  dr: { table: 'bang_gia_chuan_tinh_gia_dr', priceCol: 'gia', labelCols: ['loai', 'quy_cach', 'nhom'] },
  pvc_petg: { table: 'bang_gia_chuan_tinh_gia_pvc_petg', priceCol: 'gia', labelCols: ['loai_van', 'do_day', 'ma_mau', 'nhom', 'so_mat'] },
  melamine_tonghop: { table: 'bang_gia_chuan_tinh_gia_melamine_tonghop', priceCol: 'gia', labelCols: ['bang', 'loai_cot', 'do_day', 'ma_mau', 'so_mat'] },
  acrylic: { table: 'bang_gia_chuan_tinh_gia_acrylic', priceCol: 'gia', labelCols: ['board_type', 'ma_mau', 'loai_mau'] },
  one_laminate: { table: 'bang_gia_chuan_tinh_gia_one_laminate', priceCol: 'gia', labelCols: ['loai_van', 'do_day', 'ma_mau', 'nhom', 'so_mat'] },
}

app.get('/kiem-tra-bang-tinh-gia', async (c) => {
  try {
    const db = c.env.DB
    const page = parseInt(c.req.query('page') || '1')
    const limit = Math.min(parseInt(c.req.query('limit') || '500'), 2000)
    const offset = (page - 1) * limit
    const mod = c.req.query('module') || ''
    const diffFilter = c.req.query('diff') || ''

    const results: any[] = []
    let total = 0
    const modules = mod ? [mod] : Object.keys(MODULE_KIEM_TRA)

    for (const module of modules) {
      const cfg = MODULE_KIEM_TRA[module as keyof typeof MODULE_KIEM_TRA]
      if (!cfg) continue

      const labelExpr = cfg.labelCols.map(c => `t.${c}`).join(" || ' ' || ")
      const { results: rows } = await db.prepare(
        `SELECT t.id, t.ma_sp, t.ten_sp, t.${cfg.priceCol} AS tong_gia, m.gia_goc AS gia_goc_misa,
                ${labelExpr} AS mo_ta
         FROM ${cfg.table} t
         LEFT JOIN ma_misa m ON t.ma_sp = m.ma_sp
         WHERE t.ma_sp IS NOT NULL AND t.ma_sp != ''
         ORDER BY t.ma_sp
         LIMIT ? OFFSET ?`
      ).bind(limit, offset).all()

      for (const row of rows as any[]) {
        const t = row.tong_gia
        const g = row.gia_goc_misa
        const diff = (t != null && g != null) ? t - g : null
        const pct = (t != null && g != null && g > 0) ? Math.round((t - g) / g * 100) : null

        if (diffFilter === 'bang' && diff !== 0) continue
        if (diffFilter === 'cao' && (diff == null || diff <= 0)) continue
        if (diffFilter === 'thap' && (diff == null || diff >= 0)) continue
        if (diffFilter === 'khong' && g != null) continue

        results.push({
          module, id: row.id, ma_sp: row.ma_sp, ten_sp: row.ten_sp,
          mo_ta: row.mo_ta, tong_gia: t, gia_goc_misa: g, diff, pct,
        })
        total++
      }
    }

    return c.json({
      data: results.slice(0, limit),
      total,
      page, limit,
      total_pages: Math.ceil(total / limit),
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// So sánh Bảng Tính nGiá vs Đơn giá thực tế (Sổ chi tiết bán hàng)
const MODULE_COMPARE = {
  vdo: { table: 'bang_gia_chuan_tinh_gia_vdo', priceCols: ['tong_gia'], labelCols: ['board_loai', 'board_quy_cach', 'color_nhom', 'so_mat'] },
  vmh: { table: 'bang_gia_chuan_tinh_gia_vmh', priceCols: ['tong_gia'], labelCols: ['board_loai', 'board_quy_cach', 'color_nhom', 'so_mat'] },
  gg: { table: 'bang_gia_chuan_tinh_gia_gg', priceCols: ['gia'], labelCols: ['loai', 'quy_cach', 'nhom'] },
  ve: { table: 'bang_gia_chuan_tinh_gia_ve', priceCols: ['gia'], labelCols: ['loai', 'quy_cach', 'nhom'] },
  osb: { table: 'bang_gia_chuan_tinh_gia_osb', priceCols: ['gia'], labelCols: ['loai', 'do_day', 'nhom'] },
  dr: { table: 'bang_gia_chuan_tinh_gia_dr', priceCols: ['gia'], labelCols: ['loai', 'quy_cach', 'nhom'] },
  pvc_petg: { table: 'bang_gia_chuan_tinh_gia_pvc_petg', priceCols: ['gia'], labelCols: ['loai_van', 'do_day', 'ma_mau', 'nhom', 'so_mat'] },
  melamine_tonghop: { table: 'bang_gia_chuan_tinh_gia_melamine_tonghop', priceCols: ['gia'], labelCols: ['bang', 'loai_cot', 'do_day', 'ma_mau', 'so_mat'] },
  acrylic: { table: 'bang_gia_chuan_tinh_gia_acrylic', priceCols: ['gia'], labelCols: ['board_type', 'ma_mau', 'loai_mau'] },
  one_laminate: { table: 'bang_gia_chuan_tinh_gia_one_laminate', priceCols: ['gia'], labelCols: ['loai_van', 'do_day', 'ma_mau', 'nhom', 'so_mat'] },
  veneer: { table: 'bang_gia_chuan_veneer', priceCols: ['gia_2m', 'gia_1m_a', 'gia_1m_b'], labelCols: ['loai', 'be_mat'] },
  mat_phu_khac: { table: 'bang_gia_chuan_mat_phu_khac', priceCols: ['gia_2m', 'gia_1m'], labelCols: ['ten'] },
  chi_nep: { table: 'bang_gia_chuan_chi_nep', priceCols: ['gia'], labelCols: ['nhom', 'kich_thuoc'] },
  keo_hat: { table: 'bang_gia_chuan_keo_hat', priceCols: ['gia_25kg', 'gia_1kg'], labelCols: ['ma', 'mau', 'nhiet_do'] },
  mirror: { table: 'bang_gia_chuan_mirror', priceCols: ['gia_2m', 'gia_1m'], labelCols: ['nguon', 'loai', 'quy_cach'] },
}

app.get('/compare-orders', async (c) => {
  try {
    const db = c.env.DB
    const page = parseInt(c.req.query('page') || '1')
    const limit = Math.min(parseInt(c.req.query('limit') || '500'), 2000)
    const offset = (page - 1) * limit
    const mod = c.req.query('module') || 'melamine_tonghop'
    const diffFilter = c.req.query('diff') || ''

    const cfg = MODULE_COMPARE[mod as keyof typeof MODULE_COMPARE]
    if (!cfg) return c.json({ error: 'Invalid module' }, 400)

    const labelExpr = cfg.labelCols.map(col => `p.${col}`).join(" || ' ' || ")

    // Giá so sánh = cột giá KHÔNG null đầu tiên (ưu tiên theo thứ tự priceCols)
    const priceExpr = cfg.priceCols.length > 1
      ? 'COALESCE(' + cfg.priceCols.map(col => `p.${col}`).join(', ') + ')'
      : `p.${cfg.priceCols[0]}`
    // Trả về tất cả cột giá để frontend hiển thị (giá trị null → rỗng)
    const priceSelect = cfg.priceCols.map(col => `p.${col} AS p_${col}`).join(', ')

    const whereDiff = diffFilter === 'bang' ? `AND ${priceExpr} = o.don_gia` :
      diffFilter === 'cao' ? `AND ${priceExpr} > o.don_gia` :
      diffFilter === 'thap' ? `AND ${priceExpr} < o.don_gia` : ''

    // Get total count
    const countSql = `SELECT COUNT(*) total FROM (SELECT p.id FROM ${cfg.table} p INNER JOIN so_chi_tiet_ban_hang o ON p.ma_sp = o.ma_hang WHERE p.ma_sp IS NOT NULL AND p.ma_sp != '' ${whereDiff} GROUP BY p.id)`
    const countResult = await db.prepare(countSql).all()
    const total = (countResult.results as any[])?.[0]?.total || 0

    // Get paginated data
    const sql = `SELECT p.id, p.ma_sp, p.ten_sp, ${labelExpr} AS mo_ta, ${priceSelect}, ${priceExpr} AS tinh_gia, o.don_gia, o.ngay, o.so_ct, o.ten_kh, o.sl_ban, (${priceExpr} - o.don_gia) AS chenh_lech FROM ${cfg.table} p INNER JOIN so_chi_tiet_ban_hang o ON p.ma_sp = o.ma_hang WHERE p.ma_sp IS NOT NULL AND p.ma_sp != '' ${whereDiff} ORDER BY o.ngay DESC LIMIT ? OFFSET ?`
    const { results: rows } = await db.prepare(sql).bind(limit, offset).all()

    return c.json({
      data: rows,
      total,
      page, limit,
      total_pages: Math.ceil(total / limit),
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Sau khi import Sổ chi tiết bán hàng: chạy so sánh toàn bộ module, trả thống kê + các dòng lệch
app.get('/compare-key', async (c) => {
  try {
    const db = c.env.DB
    const maxRows = Math.min(parseInt(c.req.query('limit') || '300'), 1000)
    const modules: any[] = []
    let totalDiff = 0

    for (const [mod, cfg] of Object.entries<any>(MODULE_COMPARE)) {
      const labelExpr = cfg.labelCols.map((col: string) => `p.${col}`).join(" || ' ' || ")
      const priceExpr = cfg.priceCols.length > 1
        ? 'COALESCE(' + cfg.priceCols.map((col: string) => `p.${col}`).join(', ') + ')'
        : `p.${cfg.priceCols[0]}`
      const priceSelect = cfg.priceCols.map((col: string) => `p.${col} AS p_${col}`).join(', ')

      const statsSql = `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN ${priceExpr} = o.don_gia THEN 1 ELSE 0 END) AS bang,
        SUM(CASE WHEN ${priceExpr} > o.don_gia THEN 1 ELSE 0 END) AS cao,
        SUM(CASE WHEN ${priceExpr} < o.don_gia THEN 1 ELSE 0 END) AS thap
        FROM ${cfg.table} p
        INNER JOIN so_chi_tiet_ban_hang o ON p.ma_sp = o.ma_hang
        WHERE p.ma_sp IS NOT NULL AND p.ma_sp != ''`
      const statRow = (await db.prepare(statsSql).all()).results?.[0] as any
      const total = Number(statRow?.total || 0)
      const bang = Number(statRow?.bang || 0)
      const cao = Number(statRow?.cao || 0)
      const thap = Number(statRow?.thap || 0)

      const diffRows: any[] = []
      if (total > 0 && maxRows > 0) {
        const rowsSql = `SELECT p.id, p.ma_sp, p.ten_sp, ${labelExpr} AS mo_ta, ${priceSelect}, ${priceExpr} AS tinh_gia, o.don_gia, o.ngay, o.so_ct, o.ten_kh, o.sl_ban, (${priceExpr} - o.don_gia) AS chenh_lech
          FROM ${cfg.table} p
          INNER JOIN so_chi_tiet_ban_hang o ON o.ma_hang = p.ma_sp
          WHERE p.ma_sp IS NOT NULL AND p.ma_sp != ''
          ORDER BY o.ngay DESC LIMIT ?`
        const { results: rows } = await db.prepare(rowsSql).bind(maxRows).all()
        for (const r of rows as any[]) {
          if (r.chenh_lech == null || r.chenh_lech === 0) continue
          diffRows.push(r)
        }
      }

      totalDiff += diffRows.length
      modules.push({ module: mod, total, bang, cao, thap, diff: diffRows.slice(0, maxRows) })
    }

    return c.json({ data: modules, total_diff: totalDiff, generated_at: new Date().toLocaleString() })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Tìm MISA products gợi ý để gán ma_sp bằng tay
app.get('/tim-ma-sp', async (c) => {
  try {
    const db = c.env.DB
    const mod = c.req.query('module') || ''
    const q = c.req.query('q') || ''
    if (!mod || !q) return c.json({ data: [] })

    const prefixFilters = {
      vdo: "ma_sp LIKE 'MEOK%'",
      vmh: "(ma_sp LIKE 'ME%HDF%' OR ma_sp LIKE 'ME%MDF%')",
      gg: "(ma_sp LIKE 'GG%' OR ma_sp LIKE 'TGG%' OR ma_sp LIKE 'VNGG%')",
      ve: "(ma_sp LIKE 'VE%' OR ma_sp LIKE 'TVE%')",
      osb: "(ma_sp LIKE 'OSB%' OR ma_sp LIKE 'TOSB%')",
      dr: "(ma_sp LIKE 'DR%' OR ma_sp LIKE 'TDR%')",
      pvc_petg: "(ma_sp LIKE 'NP%' OR ma_sp LIKE 'MP%' OR ma_sp LIKE 'PVC%' OR ma_sp LIKE 'PETG%')",
      melamine_tonghop: "ma_sp LIKE 'ME%'",
      acrylic: "(ma_sp LIKE 'AC%' OR ma_sp LIKE 'NA%' OR ma_sp LIKE 'MA%')",
      one_laminate: "(ma_sp LIKE 'NL%' OR ma_sp LIKE 'LE%' OR ma_sp LIKE 'LP%' OR ma_sp LIKE 'ML%' OR ma_sp LIKE 'HL%' OR ma_sp LIKE 'GL%' OR ma_sp LIKE 'MLOK%')",
      veneer: "(ma_sp LIKE 'GC%')",
      mat_phu_khac: "(ma_sp LIKE 'GC%' OR ma_sp LIKE 'ZPPMPHIM')",
      chi_nep: "(ma_sp LIKE 'CHI%')",
    }

    const filter = prefixFilters[mod as keyof typeof prefixFilters] || ''
    if (!filter) return c.json({ data: [] })

    const searchTokens = q.toLowerCase().replace(/[^a-z0-9àáâãèéêìíòóôõùúăđĩũơư]/g, ' ').split(/\s+/).filter((t: string) => t.length > 1)
    const whereClauses = searchTokens.map((t: string) => `(ma_sp LIKE '%${t}%' OR ten_sp LIKE '%${t}%')`)
    const where = whereClauses.length > 0 ? `AND (${whereClauses.join(' OR ')})` : ''

    const { results } = await db.prepare(
      `SELECT ma_sp, ten_sp, gia_goc FROM ma_misa WHERE ${filter} ${where} AND (gia_goc > 0 OR match_status = 'manual') ORDER BY ma_sp LIMIT 50`
    ).all()

    return c.json({ data: results })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// Clear ma_sp for a table
app.post('/clear-ma-sp', async (c) => {
  try {
    const db = c.env.DB
    if (await isBangGiaLocked(db)) {
      return c.json({ error: 'Bảng Tính Giá đang bị KHÓA. Xóa mã hàng loạt đã bị chặn — hãy liên hệ Admin.' }, 423)
    }
    const { table } = await c.req.json() as any
    if (!table || typeof table !== 'string') return c.json({ error: 'Missing table name' }, 400)
    await db.prepare(`UPDATE ${table} SET ma_sp = '', ten_sp = ''`).run()
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
 }
})

// Check Giá Gốc — tra cứu giá gốc theo mã SP cho Sale
app.get('/check-gia-goc', async (c) => {
  try {
    const db = c.env.DB
    const q = (c.req.query('q') || '').trim().toUpperCase()
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
    if (!q) return c.json({ data: [], total: 0 })

    // 1) Tra c?u bang MISALA (don gia thuc te) + ten hang
    const { results: misaRows } = await db.prepare(
      `SELECT g.ma_sp, m.ten_sp, g.gia_goc
       FROM gia_goc_by_ma g
       LEFT JOIN ma_misa m ON g.ma_sp = m.ma_sp
       WHERE g.ma_sp LIKE ? OR (m.ten_sp IS NOT NULL AND m.ten_sp LIKE ?)
       ORDER BY g.ma_sp
       LIMIT ?`
    ).bind(`%${q}%`, `%${q}%`, limit).all()

    // Union merge theo ma SP: uu tien MISA, bo sung ten/mo ta + gia tu bang tinh gia chi tiet
    const mods = Object.keys(MODULE_COMPARE)
    const moduleByMa: Record<string, string> = {}
    const rows: Record<string, any> = {}

    // (a) gains tu MISA
    for (const r of misaRows as any[]) {
      rows[r.ma_sp] = { ma_sp: r.ma_sp, ten_sp: r.ten_sp ?? null, gia_goc: r.gia_goc ?? null, module: '', src: 'misa' }
    }

    // (b) scan cac bang tinh gia chi tiet theo ma/ten
    for (const mod of mods) {
      const cfg = MODULE_COMPARE[mod as keyof typeof MODULE_COMPARE]
      const priceExpr = cfg.priceCols.length === 1
        ? cfg.priceCols[0]
        : `COALESCE(${cfg.priceCols.join(', ')})`
      const { results: found } = await db.prepare(
        `SELECT ma_sp, ten_sp, ${priceExpr} AS gia_detail
         FROM ${cfg.table}
         WHERE ma_sp LIKE ? OR COALESCE(ten_sp, '') LIKE ?
         ORDER BY ma_sp LIMIT ?`
      ).bind(`%${q}%`, `%${q}%`, limit).all()
      for (const r of ((found || []) as any[])) {
        moduleByMa[r.ma_sp] = mod
        if (!rows[r.ma_sp]) {
          rows[r.ma_sp] = { ma_sp: r.ma_sp, ten_sp: r.ten_sp ?? null, gia_goc: r.gia_detail ?? null, module: mod, src: 'detail' }
        } else {
          if (!rows[r.ma_sp].ten_sp && r.ten_sp) rows[r.ma_sp].ten_sp = r.ten_sp
          if (rows[r.ma_sp].gia_goc == null && r.gia_detail != null) rows[r.ma_sp].gia_goc = r.gia_detail
        }
      }
    }

    // gan module
    for (const [ma, rec] of Object.entries(rows)) {
      if (!rec.module && moduleByMa[ma]) rec.module = moduleByMa[ma]
    }

    const data = Object.values(rows).slice(0, limit)
    return c.json({ data, total: data.length })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})
// Debug: query D1
app.get('/query', async (c) => {
  try {
    const db = c.env.DB
    const sql = c.req.query('sql')
    if (!sql) return c.json({ error: 'Missing sql param' }, 400)
    if (/^(SELECT|PRAGMA)\s/i.test(sql) === false) return c.json({ error: 'Only SELECT allowed' }, 400)
    const { results } = await db.prepare(sql).all()
    return c.json({ results })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ====== BẢNG GIÁ CHỈ NẸP (bang_gia_chi) → MISA ======
// Bảng này chưa nằm trong GIA_GOC_SYNC_TABLES nên chưa từng được đẩy lên ma_misa.
// Dùng syncTableToMisaBulk (không đăng ký vào GIA_GOC_SYNC_TABLES để tránh chiều B ngược).
app.post('/bang-gia-chi/sync-to-misa', async (c) => {
  try {
    const synced = await syncTableToMisaBulk(c.env.DB, { table: 'bang_gia_chi', maCol: 'ma_sp', priceCol: 'gia' })
    return c.json({ success: true, synced })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ====== RESTORE GIÁ GỐC CHO MÃ ME CÒN THIẾU ======
// Chỉ LẤP các mã ma_misa đang NULL (không override giá đã có).
// Tầng 1: khớp ma_sp chính xác trong bang_gia_chuan_tinh_gia_vmh/_vdo (nguồn giá theo nhóm màu/hiệu ứng).
// Tầng 2: "anh em an toàn" — cùng key (mm|loai|mau|soMat), chỉ gán khi key có ĐÚNG 1 giá trong ma_misa.
// Tầng 3: khớp (board_quy_cach, board_loai, ma_mau, so_mat) trong bảng tinh_gia → lấy tong_gia theo nhóm màu.
//   Chỉ áp dụng với key KHÔNG đa giá trong ma_misa (tránh gán sai khi màu cùng hiệu ứng khác nhau có giá khác).
// Trả về số đã gán mỗi tầng + danh sách còn thiếu để gán tay.
function parseMelKey(ten: string | null): string | null {
  if (!ten) return null
  let s = ten.replace(/\(.*?\)/g, ' ').replace(/x1220x2440/g, ' ').replace(/\s+/g, ' ').trim()
  const soM = s.match(/(\d+)\s*(?:mặt|măt|m)\s*$/i)
  if (!soM) return null
  const soMat = soM[1]
  s = s.replace(/(\d+)\s*(?:mặt|măt|m)\s*$/i, ' ').trim()
  const mmM = s.match(/(\d+(?:\.\d+)?)\s*(?:mm|ly|li)/i)
  if (!mmM) return null
  const mm = mmM[1]
  s = s.replace(/(\d+(?:\.\d+)?)\s*(?:mm|ly|li)/i, ' ').trim()
  let loai = 'MDF E2'
  let m = s.match(/kh[aàáảãạ]ng \u1ea9m ([A-Z\u00C0-\u024F]+)/i)
  if (!m) m = s.match(/kh[aàáảãạ]ng \u1eafm ([A-Z\u00C0-\u024F]+)/i)
  if (m) {
    loai = m[1] + ' E2'
    s = s.replace(/kh[aàáảãạ]ng [\u1ea9m\u1eafm]+ [A-Z\u00C0-\u024F]+/i, ' ').trim()
  } else if (/carb p2/i.test(s)) {
    loai = 'CP2'
    s = s.replace(/carb p2/gi, ' ').trim()
  } else if (/okal/i.test(s)) {
    loai = 'OKAL'
    s = s.replace(/okal/gi, ' ').trim()
  } else if (/g\u1ed7 gh/i.test(s)) {
    loai = 'GỖ GHÉP'
    s = s.replace(/g\u1ed7 gh[^ ]*/gi, ' ').trim()
  } else if (/\bLMR\b/i.test(s)) {
    loai = 'LMR E2'
    s = s.replace(/\bLMR\b/gi, ' ').trim()
  } else if (/\bMMR\b/i.test(s)) {
    loai = 'MMR E2'
    s = s.replace(/\bMMR\b/gi, ' ').trim()
  } else if (/\bHMR\b/i.test(s)) {
    loai = 'HMR E2'
    s = s.replace(/\bHMR\b/gi, ' ').trim()
  } else if (/\bLDF\b/i.test(s)) {
    loai = 'LDF E2'
    s = s.replace(/\bLDF\b/gi, ' ').trim()
  }
  s = s.replace(/\b(VC|TL|DW|MK|VCC|KG|TTD|TT|TB|KK|KGL|ECO|GC|2M)\b/g, ' ').trim()
  const melM = s.match(/MEL\s+(.+)$/i)
  let mau: string | null = null
  if (melM) {
    const after = melM[1].trim()
    const m1 = after.match(/^([\w\u00C0-\u024F\u1E00-\u1EFF.][\w\u00C0-\u024F\u1E00-\u1EFF.-]*)\s+(.+)$/i)
    mau = m1 ? m1[1].toUpperCase() : after.toUpperCase()
  } else {
    const parts = s.trim().split(/\s+/)
    mau = parts[0]?.toUpperCase() || null
  }
  if (!mau) return null
  return `${mm}|${loai}|${mau}|${soMat}`
}

// Map loai (từ ten_sp) → board_loai trong bang_gia_chuan_tinh_gia_vmh/_vdo
// LMR/MMR/MDF/HMR thường là VN; Okal phân biệt theo loại ván trong ten_sp
function loaiToBoardLoai(loai: string, ten: string): string | null {
  const okal = /okal/i.test(ten || '')
  if (okal) {
    if (/carb p2/i.test(ten || '') || /cp2/i.test(ten || '')) return 'VECO CP2'
    if (/f4s/i.test(ten || '')) return 'VECO F4S'
    if (/hmr/i.test(ten || '')) return 'HMR E1'
    return 'E2'
  }
  const map: Record<string, string> = {
    'LMR E2': 'VN LMR E2',
    'MMR E2': 'VN MMR E2',
    'MDF E2': 'VN MDF E2',
    'LDF E2': 'VN LDF E2',
    'CP2': 'VN MDF CP2',
    'HMR E2': 'VN HMR E2',
    'HMR E1': 'VN HMR E1',
    'HMR CP2': 'VN HMR CP2',
  }
  return map[loai] || null
}

// Parse ten_sp → { quyCach, boardLoai, mau, soMat } để khớp dòng tinh_gia
function parseTinhGiaRow(ten: string | null): { quyCach: string; boardLoai: string; mau: string; soMat: number } | null {
  if (!ten) return null
  const k = parseMelKey(ten)
  if (!k) return null
  const [mm, loai, mau] = k.split('|')
  const soMat = k.split('|')[3]
  const boardLoai = loaiToBoardLoai(loai, ten)
  if (!boardLoai) return null
  return { quyCach: `${mm}mm`, boardLoai, mau, soMat: Number(soMat) }
}

const RESTORE_SOURCE_TABLES = [
  { table: 'bang_gia_chuan_tinh_gia_vmh', nguon: 'tinh_gia_vmh' },
  { table: 'bang_gia_chuan_tinh_gia_vdo', nguon: 'tinh_gia_vdo' },
]

// ====== FOIL ONE LAMINATE (LP/LE) ======
// Mã LP*/LE* = "Tấm Foil One Laminate 0.7mm". Giá = gia_foil theo màu trong bảng One Laminate.
// LE = LAMINATE ECONOMY, LP = LAMINATE PREMIUM; cùng màu có thể nằm ở cả 2 nhóm với giá khác nhau
// nên phân nhóm theo tiền tố mã. Chuẩn hóa mã màu (bỏ dấu, hoa, bỏ space, ghép dải 104/101→101-104,
// bỏ tail tên tiếng Anh sau '-', bỏ Y thừa) để khớp ma_mau trong bảng giá.
function normFoilsMau(s: string): string {
  return removeAccents(s).toUpperCase().replace(/[^A-Z0-9-]/g, '')
}

function parseFoilsColor(ten: string | null): string | null {
  if (!ten) return null
  const m = ten.match(/(?:LE|LP)\s*([^\s,]+)/i)
  if (!m || m.index === undefined) return null
  let tok = m[1]
  // Màu 2 từ như "Metal goldY" → ghép từ kế tiếp
  if (/^Metal/i.test(tok)) {
    const rest = ten.slice(m.index + m[0].length)
    const n = rest.match(/^\s*([A-Za-z\u00C0-\u024F\u0110\u0111]+)/)
    if (n) tok = tok + n[1]
  }
  // Dải màu "104/101G" → "101-104G" (chuẩn hóa về thứ tự bảng giá)
  const range = tok.match(/^(\d+)[\/-](\d+)([A-Z]{1,2})?$/i)
  if (range) {
    const a = parseInt(range[1]), b = parseInt(range[2])
    tok = `${Math.min(a, b)}-${Math.max(a, b)}${(range[3] || '').toUpperCase()}`
  }
  let c = normFoilsMau(tok)
  // Cắt tên tiếng Anh nối sau '-' (vd "004G-SNOW WHITE" → "004G"; "204-1T-" → "204T")
  if (c.includes('-')) {
    const prefix = c.split('-')[0]
    if (/^\d{2,3}[A-Z]{1,2}$/.test(prefix)) c = prefix
    else if (/^\d+-1[A-Z]{1,2}$/.test(prefix)) c = prefix.replace('-1', '')
  }
  c = c.replace(/-$/, '')
  if (/^\d+-1[A-Z]{1,2}$/.test(c)) c = c.replace('-1', '')
  if (c.length >= 4 && c.endsWith('Y')) c = c.slice(0, -1)
  return /^[A-Z0-9-]+$/.test(c) ? c : null
}

app.post('/restore-gia-goc', async (c) => {
  try {
    const db = c.env.DB
    const body = await c.req.json().catch(() => ({})) as any
    const maxRows = Math.min(parseInt(body.max || '2000'), 10000)

    const { results: missing } = await db.prepare(
      `SELECT ma_sp, ten_sp FROM ma_misa
       WHERE ((ma_sp LIKE 'ME%' OR ma_sp LIKE 'MEOK%')
          OR (ma_sp LIKE 'LP%' OR ma_sp LIKE 'LE%') AND ten_sp LIKE '%Foil%'
          OR ma_sp LIKE 'CHI%')
         AND (gia_goc IS NULL OR gia_goc = 0 OR gia_goc = '')
       ORDER BY ma_sp LIMIT ?`
    ).bind(maxRows).all()
    const rows = (missing || []) as any[]
    if (rows.length === 0) return c.json({ success: true, exact: 0, sibling: 0, byColor: 0, computed: 0, foil: 0, chi: 0, remaining: 0, remainingList: [] })

    // Global map key → tập giá trong ma_misa (để phát hiện key đa giá)
    const { results: pricedRows } = await db.prepare(
      `SELECT ten_sp, gia_goc FROM ma_misa WHERE gia_goc > 0 AND (ma_sp LIKE 'ME%' OR ma_sp LIKE 'MEOK%')`
    ).all()
    const priceByKey: Record<string, Map<number, number>> = {}
    for (const r of (pricedRows || []) as any[]) {
      const k = parseMelKey(r.ten_sp)
      if (!k) continue
      if (!priceByKey[k]) priceByKey[k] = new Map()
      const g = Number(r.gia_goc)
      priceByKey[k].set(g, (priceByKey[k].get(g) || 0) + 1)
    }

    // Tầng 1: exact ma_sp trong các bảng tinh_gia
    const exactHits: { ma_sp: string; gia: number; nguon: string }[] = []
    for (const cfg of RESTORE_SOURCE_TABLES) {
      const IN_CHUNK = 90
      for (let i = 0; i < rows.length; i += IN_CHUNK) {
        const chunk = rows.slice(i, i + IN_CHUNK).map(r => r.ma_sp)
        const ph = chunk.map(() => '?').join(',')
        const { results } = await db.prepare(
          `SELECT ma_sp, tong_gia FROM ${cfg.table} WHERE ma_sp IN (${ph})`
        ).bind(...chunk).all()
        for (const r of (results || []) as any[]) {
          if (r.tong_gia > 0) exactHits.push({ ma_sp: r.ma_sp, gia: r.tong_gia, nguon: cfg.nguon })
        }
      }
    }

    // Tầng 2: anh em an toàn — key có đúng 1 giá
    const afterExact = rows.filter(r => !exactHits.some(h => h.ma_sp === r.ma_sp))
    const siblingHits: { ma_sp: string; gia: number }[] = []
    for (const r of afterExact) {
      const k = parseMelKey(r.ten_sp)
      if (!k) continue
      const m = priceByKey[k]
      if (!m || m.size !== 1) continue
      siblingHits.push({ ma_sp: r.ma_sp, gia: [...m.keys()][0] })
    }

    // Tầng 3: khớp (board_quy_cach, board_loai, ma_mau, so_mat) trong bảng tinh_gia
    // Ghi giá chuẩn từ tinh_gia kể cả khi key đa giá; history lưu để rollback
    const afterSibling = rows.filter(r =>
      !exactHits.some(h => h.ma_sp === r.ma_sp) && !siblingHits.some(h => h.ma_sp === r.ma_sp)
    )
    const byColorHits: { ma_sp: string; gia: number; nguon: string }[] = []
    for (const cfg of RESTORE_SOURCE_TABLES) {
      const { results: tinhRows } = await db.prepare(
        `SELECT board_quy_cach, board_loai, ma_mau, so_mat, tong_gia FROM ${cfg.table} WHERE tong_gia > 0`
      ).all()
      const rowByKey = new Map<string, number>()
      for (const r of (tinhRows || []) as any[]) {
        const key = `${r.board_quy_cach}|${r.board_loai}|${r.ma_mau}|${r.so_mat}`
        if (!rowByKey.has(key)) rowByKey.set(key, r.tong_gia)
      }
      for (const r of afterSibling) {
        const pr = parseTinhGiaRow(r.ten_sp)
        if (!pr) continue
        const tKey = `${pr.quyCach}|${pr.boardLoai}|${pr.mau}|${pr.soMat}`
        const gia = rowByKey.get(tKey)
        if (gia && gia > 0) byColorHits.push({ ma_sp: r.ma_sp, gia, nguon: cfg.nguon })
      }
    }

    // Tầng 4: tính giá = board_gia (mdf_hdf / dam_okal) + phụ thu nhóm màu (phu_thu_melamine)
    // Áp dụng cho màu đặc biệt (KEM/X.BIỂN/...) và loại ván thiếu dòng trực tiếp (15mm LMR)
    const afterByColor = rows.filter(r =>
      !exactHits.some(h => h.ma_sp === r.ma_sp) && !siblingHits.some(h => h.ma_sp === r.ma_sp)
      && !byColorHits.some(h => h.ma_sp === r.ma_sp)
    )
    // màu → (loai Color/Wood/Art, nhom) ưu tiên bảng chuẩn, bổ sung bảng 220 màu
    const colorMap = new Map<string, { loai: string; nhom: string }>()
    {
      const { results: cmRows } = await db.prepare(`SELECT ma_mau, loai, nhom FROM bang_gia_chuan_mau_melamine`).all()
      for (const r of (cmRows || []) as any[]) {
        if (!colorMap.has(r.ma_mau)) colorMap.set(r.ma_mau, { loai: r.loai || '', nhom: r.nhom })
      }
      const { results: cmRows2 } = await db.prepare(`SELECT ma_mau, nhom FROM bang_gia_ma_mau`).all()
      for (const r of (cmRows2 || []) as any[]) {
        if (!colorMap.has(r.ma_mau)) colorMap.set(r.ma_mau, { loai: '', nhom: r.nhom })
      }
    }
    const { results: boardRows } = await db.prepare(
      `SELECT quy_cach, vn_ldf_e2, vn_mdf_e2, vn_mdf_cp2, vn_hdf_hmr_e2, vn_hdf_hmr_e1,
              th_mdf_e2, th_hdf_hmr_e2, vn_lmr_e2, vn_mmr_e2, vn_hmr_e2, vn_hmr_e1, vn_hmr_cp2,
              th_mmr_e2, th_hmr_v313_e1 FROM bang_gia_chuan_mdf_hdf`
    ).all()
    const boardBase = new Map<string, Record<string, number | null>>()
    for (const r of (boardRows || []) as any[]) {
      boardBase.set(r.quy_cach, r)
    }
    const { results: okalRows } = await db.prepare(
      `SELECT quy_cach, e2, veco_e1, veco_cp2, veco_f4s, hmr_e1 FROM bang_gia_chuan_dam_okal`
    ).all()
    const okalBase = new Map<string, Record<string, number | null>>()
    for (const r of (okalRows || []) as any[]) {
      okalBase.set(r.quy_cach, r)
    }
    const { results: ptRows } = await db.prepare(
      `SELECT * FROM bang_gia_chuan_phu_thu_melamine WHERE mo_ta = 'Đơn giá' ORDER BY id LIMIT 1`
    ).all()
    const ptRow = (ptRows || [])[0] as any

    // map nhóm → cột phụ thu
    function phuThuCol(nhom: string, loai: string): string | null {
      const n = (nhom || '').toUpperCase()
      const l = (loai || '').toUpperCase()
      if (n === 'BASIC' || n === 'BBG PREMIER BASIC') return 'basic'
      if (n === 'ECONOMY' || n === 'BBG PREMIER ECONOMY') return 'eco'
      if (n === 'STANDARD' || n === 'BBG PREMIER STANDARD') return 'standard'
      if (n === 'SUPERB' || n === 'SUPERB HEAVY') return 'superb'
      if (n === 'PREMIUM' || n === 'PREMIUM WOOD + ART') return l === 'COLOR' ? 'premium_color' : 'premium_wood_art'
      if (n === 'PREMIUM COLOR') return 'premium_color'
      return null
    }

    const computedHits: { ma_sp: string; gia: number; nguon: string }[] = []
    for (const r of afterByColor) {
      const k = parseMelKey(r.ten_sp)
      if (!k) continue
      const [mm, loai, mau, soMatS] = k.split('|')
      const soMat = Number(soMatS)
      const cm = colorMap.get(mau)
      if (!cm) continue
      const ptCol = phuThuCol(cm.nhom, cm.loai)
      if (!ptCol || !ptRow) continue
      const ptVal = Number(ptRow[`${ptCol}_${soMat}m`])
      if (!ptVal || ptVal <= 0) continue
      // board base: Okal dùng dam_okal, ván VN dùng mdf_hdf
      let base: number | null = null
      const isOkal = /okal/i.test(r.ten_sp || '')
      if (isOkal) {
        const ob = okalBase.get(`${mm}mm`)
        if (!ob) continue
        if (/carb p2|cp2/i.test(r.ten_sp)) base = ob.veco_cp2
        else if (/f4s/i.test(r.ten_sp)) base = ob.veco_f4s
        else if (/hmr/i.test(r.ten_sp)) base = ob.hmr_e1
        else base = ob.e2
      } else {
        const bb = boardBase.get(`${mm}mm`)
        if (!bb) continue
        const colMap: Record<string, string> = {
          'LMR E2': 'vn_lmr_e2', 'MMR E2': 'vn_mmr_e2', 'MDF E2': 'vn_mdf_e2',
          'LDF E2': 'vn_ldf_e2', 'CP2': 'vn_mdf_cp2', 'HMR E2': 'vn_hmr_e2',
          'HMR E1': 'vn_hmr_e1', 'HMR CP2': 'vn_hmr_cp2',
        }
        base = bb[colMap[loai]] ?? null
        // LMR/MMR 15mm không có trong mdf_hdf → fallback TH HDF HMR E2 (theo tinh_gia_vmh)
        if (base == null && (loai === 'LMR E2' || loai === 'MMR E2') && `${mm}mm` === '15mm') {
          base = bb.th_hdf_hmr_e2
        }
      }
      if (!base || base <= 0) continue
      computedHits.push({ ma_sp: r.ma_sp, gia: base + ptVal, nguon: 'tinh_gia_board' })
    }

    // Tầng 5: Foil One Laminate (LP*/LE*) — giá = gia_foil theo màu (khớp qua chuẩn hóa màu)
    const afterComputed = rows.filter(r =>
      !exactHits.some(h => h.ma_sp === r.ma_sp) && !siblingHits.some(h => h.ma_sp === r.ma_sp)
      && !byColorHits.some(h => h.ma_sp === r.ma_sp) && !computedHits.some(h => h.ma_sp === r.ma_sp)
    )
    // Bảng giá foil: màu → (nhóm, gia_foil). Cùng màu có thể ở economy + premium → phân theo tiền tố mã.
    const { results: foilPriceRows } = await db.prepare(
      `SELECT DISTINCT ma_mau, nhom, gia_foil FROM bang_gia_chuan_one_laminate WHERE gia_foil > 0`
    ).all()
    const foilByMau = new Map<string, { nhom: string; gia: number }[]>()
    for (const r of (foilPriceRows || []) as any[]) {
      const key = normFoilsMau(r.ma_mau)
      if (!foilByMau.has(key)) foilByMau.set(key, [])
      foilByMau.get(key)!.push({ nhom: String(r.nhom || ''), gia: Number(r.gia_foil) })
    }
    const foilHits: { ma_sp: string; gia: number; nguon: string }[] = []
    for (const r of afterComputed) {
      const isLe = /^\s*LE/i.test(r.ma_sp)
      const isFoil = /Foil/i.test(r.ten_sp || '') && (isLe || /^\s*LP/i.test(r.ma_sp))
      if (!isFoil) continue
      const color = parseFoilsColor(r.ten_sp)
      if (!color) continue
      const cands = foilByMau.get(color) || []
      // Fallback: lệch hậu tố EV/SN/WN/... (vd LP319SN vs bảng 319EV) — khớp theo số màu
      // nếu trong đúng nhóm LE/LP chỉ có 1 mức giá.
      if (cands.length === 0) {
        const num = (color.match(/^\d+/) || [''])[0]
        if (num) {
          const wantNum = isLe ? /ECONOMY/i : /PREMIUM/i
          const all = new Map<string, number>()
          for (const [key, list] of foilByMau) {
            if (key.startsWith(num)) for (const c of list) if (wantNum.test(c.nhom)) all.set(key + c.nhom, c.gia)
          }
          const uniq = new Set(all.values())
          if (all.size > 0 && uniq.size === 1) {
            foilHits.push({ ma_sp: r.ma_sp, gia: [...uniq][0], nguon: 'one_laminate' })
          }
        }
        continue
      }
      // Chọn nhóm theo tiền tố: LE → economy, LP → premium. Nếu không rõ/không có nhóm tương ứng → 1 giá duy nhất.
      const want = isLe ? /ECONOMY/i : /PREMIUM/i
      const pick = cands.filter(c => want.test(c.nhom))
      const chosen = pick.length > 0 ? pick : cands.length === 1 ? cands : []
      if (chosen.length === 0) continue
      const gia = Math.min(...chosen.map(c => c.gia))
      foilHits.push({ ma_sp: r.ma_sp, gia, nguon: 'one_laminate' })
    }

    // Tầng 6: Chỉ nẹp (CHI*) — khớp ma_sp chính xác trong bang_gia_chuan_chi_nep
    const afterFoil = rows.filter(r =>
      !exactHits.some(h => h.ma_sp === r.ma_sp) && !siblingHits.some(h => h.ma_sp === r.ma_sp)
      && !byColorHits.some(h => h.ma_sp === r.ma_sp) && !computedHits.some(h => h.ma_sp === r.ma_sp)
      && !foilHits.some(h => h.ma_sp === r.ma_sp)
    )
    const { results: chiRowsAll } = await db.prepare(
      `SELECT ma_sp, gia FROM bang_gia_chuan_chi_nep WHERE ma_sp != '' AND gia > 0`
    ).all()
    const chiByMa = new Map<string, number>()
    for (const r of (chiRowsAll || []) as any[]) chiByMa.set(r.ma_sp, Number(r.gia))
    const chiHits: { ma_sp: string; gia: number; nguon: string }[] = []
    for (const r of afterFoil) {
      if (!/^\s*CHI/i.test(r.ma_sp)) continue
      const gia = chiByMa.get(r.ma_sp)
      if (gia && gia > 0) chiHits.push({ ma_sp: r.ma_sp, gia, nguon: 'chi_nep' })
    }

    // Ghi: chỉ khi gia_goc đang NULL
    const writes = [
      ...exactHits.map(h => ({ ...h })),
      ...siblingHits.map(h => ({ ma_sp: h.ma_sp, gia: h.gia, nguon: 'sibling' })),
      ...byColorHits.map(h => ({ ...h })),
      ...computedHits.map(h => ({ ...h })),
      ...foilHits.map(h => ({ ...h })),
      ...chiHits.map(h => ({ ...h })),
    ]
    const seen = new Set<string>()
    const uniqueWrites = writes.filter(w => { if (seen.has(w.ma_sp)) return false; seen.add(w.ma_sp); return true })
    let exactCount = 0
    let siblingCount = 0
    let byColorCount = 0
    let computedCount = 0
    let foilCount = 0
    let chiCount = 0
    const writeChunk = 100
    const updStmts: D1PreparedStatement[] = []
    const histStmts: D1PreparedStatement[] = []
    const thang = currentThang()
    for (const w of uniqueWrites) {
      updStmts.push(
        db.prepare(`UPDATE ma_misa SET gia_goc = ?, updated_at = datetime('now','+7 hours') WHERE ma_sp = ? AND (gia_goc IS NULL OR gia_goc = 0 OR gia_goc = '')`).bind(w.gia, w.ma_sp)
      )
      histStmts.push(
        db.prepare(
          'INSERT INTO ma_misa_gia_history (ma_sp, thang, gia_cu, gia_goc, nguon, updated_by) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(w.ma_sp, thang, 0, w.gia, w.nguon, 'auto')
      )
      if (w.nguon === 'sibling') siblingCount++
      else if (w.nguon === 'tinh_gia_board') computedCount++
      else if (w.nguon === 'one_laminate') foilCount++
      else if (w.nguon === 'chi_nep') chiCount++
      else if (w.nguon === 'tinh_gia_vmh' || w.nguon === 'tinh_gia_vdo') {
        // phân biệt exact vs byColor qua ma_sp có trong bảng tinh_gia hay không
        const isExact = exactHits.some(h => h.ma_sp === w.ma_sp)
        if (isExact) exactCount++; else byColorCount++
      }
    }
    for (let i = 0; i < updStmts.length; i += writeChunk) {
      await db.batch(updStmts.slice(i, i + writeChunk))
    }
    for (let i = 0; i < histStmts.length; i += writeChunk) {
      await db.batch(histStmts.slice(i, i + writeChunk))
    }

    // Còn thiếu sau ghi
    const done = new Set(uniqueWrites.map(w => w.ma_sp))
    const remainingList = rows.filter(r => !done.has(r.ma_sp)).map(r => r.ma_sp)
    return c.json({
      success: true,
      scanned: rows.length,
      exact: exactCount,
      sibling: siblingCount,
      byColor: byColorCount,
      computed: computedCount,
      foil: foilCount,
      chi: chiCount,
      totalWritten: uniqueWrites.length,
      remaining: remainingList.length,
      remainingList,
    })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})

export default app
