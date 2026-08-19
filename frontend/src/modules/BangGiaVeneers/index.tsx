import DataGrid, { Column } from '../../components/DataGrid'

const columns: Column[] = [
  { key: 'loai', label: 'Loại', required: true, filterable: true },
  { key: 'tier', label: 'Tier', type: 'select', options: [
    { value: 'PREMIUM', label: 'PREMIUM' },
    { value: 'BBG PREMIER', label: 'BBG PREMIER' },
  ]},
  { key: 'ten', label: 'Tên sản phẩm', required: true },
  { key: 'gia_1_mat', label: 'Giá 1 mặt', type: 'number' },
  { key: 'gia_2_mat', label: 'Giá 2 mặt', type: 'number' },
  { key: 'ghi_chu', label: 'Ghi chú' },
]

export default function BangGiaVeneersPage() {
  return <DataGrid title="Bảng giá Veneer & Acrylic" columns={columns} apiPath="/bang-gia-veneers" logBang="bang_gia_veneers" />
}
