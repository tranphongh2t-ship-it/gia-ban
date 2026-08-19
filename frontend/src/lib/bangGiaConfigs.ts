import { Column } from '../components/DataGrid'

// apiPath → tên bảng thật để xem lịch sử sửa theo account (thay_doi_log)
export const BANG_MAP: Record<string, string> = {
  '/bang-gia-new/veneer': 'bang_gia_veneers',
  '/bang-gia-new/chi': 'bang_gia_chi',
  '/bang-gia-new/keo-nong': 'bang_gia_keo_nong',
  '/bang-gia-new/acrylic-foil': 'bang_gia_acrylic_foil',
  '/bang-gia-new/van-phu-acrylic': 'bang_gia_van_phu_acrylic',
  '/bang-gia-new/laminate-one': 'bang_gia_laminate_one',
  '/bang-gia-new/nhua-pvc': 'bang_gia_nhua_pvc',
  '/bang-gia-new/pvc-film': 'bang_gia_pvc_film',
  '/bang-gia-new/van-phu-pvc': 'bang_gia_van_phu_pvc',
  '/bang-gia-new/nhua-phu-mau': 'bang_gia_nhua_phu_mau',
  '/bang-gia-new/nhua-laminate': 'bang_gia_nhua_laminate',
  '/bang-gia-new/osb-laminate': 'bang_gia_osb_laminate',
  '/bang-gia-new/mirror': 'bang_gia_mirror',
}

interface BangGiaViewConfig {
  title: string
  columns: Column[]
  apiPath: string
  logBang?: string
}

const configs: BangGiaViewConfig[] = [
  {
    title: 'Bảng giá Veneer',
    apiPath: '/bang-gia-new/veneer',
    columns: [
      { key: 'loai', label: 'Loại' },
      { key: 'tier', label: 'Tier' },
      { key: 'ten', label: 'Tên' },
      { key: 'gia_1_mat', label: 'Giá 1 mặt', type: 'number' },
      { key: 'gia_2_mat', label: 'Giá 2 mặt', type: 'number' },
      { key: 'ghi_chu', label: 'Ghi chú' },
    ],
  },
  {
    title: 'Bảng giá Chỉ (Edge Banding)',
    apiPath: '/bang-gia-new/chi',
    columns: [
      { key: 'loai', label: 'Loại' },
      { key: 'ten', label: 'Tên' },
      { key: 'quy_cach', label: 'Quy cách' },
      { key: 'gia', label: 'Giá', type: 'number' },
      { key: 'don_vi', label: 'Đơn vị' },
    ],
  },
  {
    title: 'Bảng giá Keo Nóng',
    apiPath: '/bang-gia-new/keo-nong',
    columns: [
      { key: 'ma', label: 'Mã' },
      { key: 'nhiet_do', label: 'Nhiệt độ' },
      { key: 'mau_sac', label: 'Màu sắc' },
      { key: 'don_gia_kg', label: 'Đơn giá/kg', type: 'number' },
      { key: 'don_gia_bao25', label: 'Giá bao 25kg', type: 'number' },
    ],
  },
  {
    title: 'Bảng giá Acrylic Foil',
    apiPath: '/bang-gia-new/acrylic-foil',
    columns: [
      { key: 'series', label: 'Series' },
      { key: 'loai', label: 'Loại' },
      { key: 'gia_tot', label: 'Giá/tờ', type: 'number' },
      { key: 'ma_mau', label: 'Mã màu' },
    ],
  },
  {
    title: 'Bảng giá Ván Phủ Acrylic',
    apiPath: '/bang-gia-new/van-phu-acrylic',
    columns: [
      { key: 'series', label: 'Series' },
      { key: 'phu', label: 'Phủ' },
      { key: 'loai_cot', label: 'Loại cốt' },
      { key: 'gia_don_sac', label: 'Đơn sắc', type: 'number' },
      { key: 'gia_anh_kim', label: 'Ánh kim', type: 'number' },
      { key: 'gia_van_go', label: 'Vân gỗ', type: 'number' },
    ],
  },
  {
    title: 'Bảng giá Laminate One',
    apiPath: '/bang-gia-new/laminate-one',
    columns: [
      { key: 'nhom', label: 'Nhóm' },
      { key: 'gia_foil', label: 'Giá foil', type: 'number' },
      { key: 'ma_mau', label: 'Mã màu' },
    ],
  },
  {
    title: 'Bảng giá Ván Nhựa / PVC',
    apiPath: '/bang-gia-new/nhua-pvc',
    columns: [
      { key: 'loai', label: 'Loại' },
      { key: 'do_day', label: 'Độ dày' },
      { key: 'ma_sp', label: 'Mã SP' },
      { key: 'gia', label: 'Giá', type: 'number' },
    ],
  },
  {
    title: 'Bảng giá PVC Film',
    apiPath: '/bang-gia-new/pvc-film',
    columns: [
      { key: 'loai', label: 'Loại' },
      { key: 'nhom_mau', label: 'Nhóm màu' },
      { key: 'ma_so', label: 'Mã số' },
      { key: 'thong_so_film', label: 'Thông số film' },
      { key: 'gia_1_mat', label: 'Giá 1 mặt', type: 'number' },
      { key: 'gia_2_mat', label: 'Giá 2 mặt', type: 'number' },
    ],
  },
  {
    title: 'Bảng giá Ván Phủ PVC',
    apiPath: '/bang-gia-new/van-phu-pvc',
    columns: [
      { key: 'loai_cot', label: 'Loại cốt' },
      { key: 'do_day', label: 'Độ dày' },
      { key: 'pvc_uu_dai_1m', label: 'PVC ƯĐ 1m', type: 'number' },
      { key: 'pvc_uu_dai_2m', label: 'PVC ƯĐ 2m', type: 'number' },
      { key: 'pvc_standard_1m', label: 'PVC Std 1m', type: 'number' },
      { key: 'pvc_standard_2m', label: 'PVC Std 2m', type: 'number' },
      { key: 'pvc_premium_1m', label: 'PVC Prem 1m', type: 'number' },
      { key: 'pvc_premium_2m', label: 'PVC Prem 2m', type: 'number' },
      { key: 'petg_1m', label: 'PETG 1m', type: 'number' },
      { key: 'petg_2m', label: 'PETG 2m', type: 'number' },
    ],
  },
  {
    title: 'Bảng giá Ván Nhựa Phủ Màu',
    apiPath: '/bang-gia-new/nhua-phu-mau',
    columns: [
      { key: 'loai_cot', label: 'Loại cốt' },
      { key: 'do_day', label: 'Độ dày' },
      { key: 'nhom_sang_trung', label: 'Sáng + Trung', type: 'number' },
      { key: 'nhom_toi_don_sac', label: 'Tối + Đơn sắc', type: 'number' },
      { key: 'mau_106', label: 'Màu 106', type: 'number' },
    ],
  },
  {
    title: 'Bảng giá Ván Nhựa Laminate',
    apiPath: '/bang-gia-new/nhua-laminate',
    columns: [
      { key: 'loai_cot', label: 'Loại cốt' },
      { key: 'do_day', label: 'Độ dày' },
      { key: 'do_day_thanh_pham', label: 'Dày TP' },
      { key: 'le1_backer', label: 'LE1+Backer', type: 'number' },
      { key: 'le2_backer', label: 'LE2+Backer', type: 'number' },
      { key: 'lp1_backer', label: 'LP1+Backer', type: 'number' },
      { key: 'lp2_backer', label: 'LP2+Backer', type: 'number' },
      { key: 'lp3_backer', label: 'LP3+Backer', type: 'number' },
      { key: 'le1_2mat', label: 'LE1 2 mặt', type: 'number' },
      { key: 'le2_2mat', label: 'LE2 2 mặt', type: 'number' },
      { key: 'lp1_2mat', label: 'LP1 2 mặt', type: 'number' },
      { key: 'lp2_2mat', label: 'LP2 2 mặt', type: 'number' },
      { key: 'lp3_2mat', label: 'LP3 2 mặt', type: 'number' },
    ],
  },
  {
    title: 'Bảng giá OSB Laminate',
    apiPath: '/bang-gia-new/osb-laminate',
    columns: [
      { key: 'loai_cot', label: 'Loại cốt' },
      { key: 'do_day', label: 'Độ dày' },
      { key: 'do_day_thanh_pham', label: 'Dày TP' },
      { key: 'le1_backer', label: 'LE1+Backer', type: 'number' },
      { key: 'le2_backer', label: 'LE2+Backer', type: 'number' },
      { key: 'lp1_backer', label: 'LP1+Backer', type: 'number' },
      { key: 'lp2_backer', label: 'LP2+Backer', type: 'number' },
      { key: 'lp3_backer', label: 'LP3+Backer', type: 'number' },
      { key: 'le1_2mat', label: 'LE1 2 mặt', type: 'number' },
      { key: 'le2_2mat', label: 'LE2 2 mặt', type: 'number' },
      { key: 'lp1_2mat', label: 'LP1 2 mặt', type: 'number' },
      { key: 'lp2_2mat', label: 'LP2 2 mặt', type: 'number' },
      { key: 'lp3_2mat', label: 'LP3 2 mặt', type: 'number' },
    ],
  },
  {
    title: 'Bảng giá Mirror & Siêu Bóng Gương',
    apiPath: '/bang-gia-new/mirror',
    columns: [
      { key: 'loai', label: 'Loại' },
      { key: 'ten', label: 'Tên' },
      { key: 'gia', label: 'Giá', type: 'number' },
    ],
  },
]

export default configs
