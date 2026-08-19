import DataGrid, { Column } from '../../components/DataGrid'

const columns: Column[] = [
  { key: 'ma_kh', label: 'Mã KH', required: true, width: '110' },
  { key: 'ten_kh', label: 'Tên khách hàng', width: '230' },
  { key: 'loai_op', label: 'Loại OP', type: 'select', options: [
    { value: 'OP1', label: 'OP1' },
    { value: 'OP2', label: 'OP2' },
  ], required: true, width: '80' },
  { key: 'nguon', label: 'Nguồn', width: '90', render: (v) => v || <span style={{ color: '#9aa8b8' }}>—</span> },
]

export default function DanhSachKhachPage() {
  return <DataGrid title="Danh sách khách hàng" columns={columns} apiPath="/danh-sach-khach" defaultLimit={500} columnsPerRow={2} logBang="danh_sach_khach" />
}
