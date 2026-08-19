import DataGrid, { Column } from '../../components/DataGrid'

const columns: Column[] = [
  { key: 'ma_kh', label: 'Mã KH', required: true, width: '120px' },
  { key: 'ten_kh', label: 'Tên khách hàng', width: '200px' },
  { key: 'phan_loai', label: 'Phân loại', type: 'select', options: [
    { value: 'OP1', label: 'OP1' }, { value: 'OP2', label: 'OP2' }, { value: 'OP3', label: 'OP3' },
  ]},
  { key: 'nhom_kh_ncc', label: 'Nhóm KH/NCC' },
  { key: 'dia_chi', label: 'Địa chỉ' },
  { key: 'dien_thoai', label: 'Điện thoại' },
  { key: 'ma_so_thue', label: 'Mã số thuế' },
  { key: 'phu_thu', label: 'Phụ thu', type: 'number', unit: 'VNĐ' },
  { key: 'ck_phu_thu', label: 'CK phụ thu', type: 'number', unit: '%' },
  { key: 'hoa_don', label: 'Hoá đơn' },
  { key: 'chi_nhanh', label: 'Chi nhánh' },
  { key: 't6_2025', label: 'T6.2025' },
  { key: 'sales_phu_trach_id', label: 'Sales ID', type: 'number' },
]

export default function DanhMucKhachPage() {
  return <DataGrid title="Danh mục khách hàng" columns={columns} apiPath="/khach-hang" logBang="khach_hang" />
}
