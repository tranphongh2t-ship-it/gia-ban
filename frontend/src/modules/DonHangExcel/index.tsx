import DataGrid, { Column } from '../../components/DataGrid'

const columns: Column[] = [
  { key: 'tinh_trang', label: 'Tình trạng' },
  { key: 'ngay_dh', label: 'Ngày ĐH' },
  { key: 'so_dh', label: 'Số ĐH' },
  { key: 'phe_duyet', label: 'Phê duyệt' },
  { key: 'ngay_hen_giao', label: 'Ngày hẹn giao' },
  { key: 'ten_kh', label: 'Khách hàng' },
  { key: 'chi_tiet', label: 'Chi tiết ĐH' },
  { key: 'tong_sl', label: 'Tổng SL', type: 'number' },
  { key: 'gia_tri_dh', label: 'Giá trị ĐH', type: 'number' },
  { key: 'chung_tu', label: 'Chứng từ' },
  { key: 'dien_giai', label: 'Diễn giải' },
  { key: 'nv_sale', label: 'NV Sale' },
  { key: 'dia_chi', label: 'Địa chỉ' },
]

export default function DonHangExcelPage() {
  return (
    <DataGrid
      title="Đơn hàng"
      columns={columns}
      apiPath="/don-hang-excel"
      searchable
      defaultSort="id"
      exportable
      defaultLimit={500}
    />
  )
}
