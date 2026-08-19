import DataGrid, { Column } from '../../components/DataGrid'

const columns: Column[] = [
  { key: 'bang', label: 'Bảng', required: true, filterable: true },
  { key: 'tier', label: 'Tier', type: 'select', options: [
    { value: 'PREMIUM', label: 'PREMIUM' },
    { value: 'BBG PREMIER', label: 'BBG PREMIER' },
  ]},
  { key: 'nhom', label: 'Nhóm', required: true },
  { key: 'loai_mau', label: 'Loại màu' },
  { key: 'gia_1_mat', label: 'Giá 1 mặt', type: 'number' },
  { key: 'gia_2_mat', label: 'Giá 2 mặt', type: 'number' },
]

export default function BangGiaNhomMauPage() {
  return <DataGrid title="Bảng giá nhóm màu" columns={columns} apiPath="/bang-gia-nhom-mau" logBang="bang_gia_nhom_mau" />
}
