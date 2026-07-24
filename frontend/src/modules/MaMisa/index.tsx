import DataGrid, { Column } from '../../components/DataGrid'

const columns: Column[] = [
  { key: 'ma_sp', label: 'Mã SP', required: true },
  { key: 'ten_sp', label: 'Tên sản phẩm' },
  { key: 'dvt', label: 'ĐVT' },
]

export default function MaMisaPage() {
  return <DataGrid title="Mã MISA" columns={columns} apiPath="/ma-misa" />
}
