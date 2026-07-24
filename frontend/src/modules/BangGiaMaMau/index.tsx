import DataGrid, { Column } from '../../components/DataGrid'

const columns: Column[] = [
  { key: 'bang', label: 'Bảng', required: true, filterable: true },
  { key: 'tier', label: 'Tier', type: 'select', options: [
    { value: 'PREMIUM', label: 'PREMIUM' },
    { value: 'BBG PREMIER', label: 'BBG PREMIER' },
  ]},
  { key: 'nhom', label: 'Nhóm', required: true },
  { key: 'ma_mau', label: 'Mã màu', required: true },
  { key: 'ten_mau', label: 'Tên màu' },
]

export default function BangGiaMaMauPage() {
  return <DataGrid title="Bảng giá mã màu" columns={columns} apiPath="/bang-gia-ma-mau" />
}
