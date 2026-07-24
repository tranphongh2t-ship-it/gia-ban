import DataGrid, { Column } from '../../components/DataGrid'

const columns: Column[] = [
  { key: 'loai', label: 'Loại cốt gỗ', required: true, filterable: true },
  { key: 'tier', label: 'Tier', type: 'select', options: [
    { value: 'PREMIUM', label: 'PREMIUM' },
    { value: 'BBG PREMIER', label: 'BBG PREMIER' },
  ]},
  { key: 'do_day', label: 'Độ dày', required: true },
  { key: 'cap', label: 'Cấp', required: true },
  { key: 'gia', label: 'Giá', type: 'number' },
  { key: 'gia_phu', label: 'Giá phụ' },
]

export default function BangGiaCotGoPage() {
  return <DataGrid title="Bảng giá cốt gỗ" columns={columns} apiPath="/bang-gia-cot-go" />
}
