import DataGrid, { Column } from '../../components/DataGrid'

const columns: Column[] = [
  { key: 'loai_phu_phi', label: 'Loại phụ phí', required: true },
  { key: 'ma_hang', label: 'Mã hàng', required: true },
  { key: 'ten', label: 'Tên' },
  { key: 'phi', label: 'Phí', type: 'number', required: true, unit: 'VNĐ' },
  { key: 'ghi_chu', label: 'Ghi chú' },
]

export default function PhuThuPage() {
  return <DataGrid title="Phụ thu" columns={columns} apiPath="/phu-thu" />
}
