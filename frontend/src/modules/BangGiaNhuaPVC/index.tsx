import DataGrid, { Column } from '../../components/DataGrid'

const columns: Column[] = [
  { key: 'loai', label: 'Loại', required: true, filterable: true },
  { key: 'tier', label: 'Tier', type: 'select', options: [
    { value: 'PREMIUM', label: 'PREMIUM' },
    { value: 'BBG PREMIER', label: 'BBG PREMIER' },
  ]},
  { key: 'do_day', label: 'Độ dày' },
  { key: 'ma_sp', label: 'Mã SP' },
  { key: 'gia', label: 'Giá', type: 'number' },
  { key: 'gia_phu', label: 'Giá phụ' },
  { key: 'ghi_chu', label: 'Ghi chú' },
]

export default function BangGiaNhuaPVCPage() {
  return <DataGrid title="Bảng giá Ván Nhựa PVC & Tấm Phủ" columns={columns} apiPath="/bang-gia-nhua-pvc" logBang="bang_gia_nhua_pvc" />
}
