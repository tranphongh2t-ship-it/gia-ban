import DataGrid, { Column } from '../../components/DataGrid'

const columns: Column[] = [
  { key: 'ma_kh', label: 'Mã KH', required: true },
  { key: 'thang', label: 'Tháng', type: 'number', required: true },
  { key: 'nam', label: 'Năm', type: 'number', required: true, render: (v) => (v == null || v === '' ? '' : String(v)) },
  { key: 'loai_op', label: 'Loại OP', type: 'select', options: [
    { value: 'OP1', label: 'OP1' },
    { value: 'OP2', label: 'OP2' },
  ], required: true },
]

export default function PhanBoKHPage() {
  return <DataGrid title="Phân bổ khách hàng" columns={columns} apiPath="/phan-bo-kh" />
}
