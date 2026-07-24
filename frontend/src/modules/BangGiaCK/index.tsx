import DataGrid, { Column } from '../../components/DataGrid'

const columns: Column[] = [
  { key: 'loai', label: 'Loại', required: true },
  { key: 'key_match', label: 'Key match', required: true },
  { key: 'loai_kh', label: 'Loại KH', type: 'select', options: [
    { value: 'OP1', label: 'OP1' },
    { value: 'OP2', label: 'OP2' },
    { value: 'OP3', label: 'OP3' },
  ]},
  { key: 'cot_index', label: 'Cột index', type: 'number' },
  { key: 'gia_tri', label: 'Giá trị', type: 'number', required: true, unit: 'VNĐ' },
  { key: 'loai_don_vi', label: 'Đơn vị', type: 'select', options: [
    { value: 'percent', label: '%' },
    { value: 'fixed', label: 'Số tiền' },
  ]},
  { key: 'ghi_chu', label: 'Ghi chú' },
]

export default function BangGiaCKPage() {
  return <DataGrid title="Bảng giá chiết khấu" columns={columns} apiPath="/bang-gia-ck" />
}
