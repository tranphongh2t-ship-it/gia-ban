import { Hono } from 'hono'
import * as XLSX from 'xlsx'

const router = new Hono<{ Bindings: { DB: D1Database } }>()

interface TableMeta {
  table: string
  label: string
  group: string
  columns: string[]
  allColumns: string[]
  keyFields: string[]
  salesField?: string
  exportQuery?: string
  exportColumns?: string[]
  exportAllColumns?: string[]
}

const DB_TABLES: TableMeta[] = [
  // ===== Danh mục =====
  { table: 'khach_hang', label: 'Khách hàng', group: 'Danh mục',
    columns: ['ma_kh', 'ten_kh', 'dia_chi', 'nhom_kh_ncc', 'ma_so_thue', 'dien_thoai', 'hoa_don', 'chi_nhanh', 't6_2025', 'phan_loai', 'phu_thu', 'ck_phu_thu'],
    allColumns: ['id', 'ma_kh', 'ten_kh', 'dia_chi', 'nhom_kh_ncc', 'ma_so_thue', 'dien_thoai', 'hoa_don', 'chi_nhanh', 't6_2025', 'phan_loai', 'phu_thu', 'ck_phu_thu', 'sales_phu_trach_id', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['ma_kh'], salesField: 'sales_phu_trach_id' },
  { table: 'ma_misa', label: 'Mã MISA', group: 'Danh mục',
    columns: ['ma_sp', 'ten_sp', 'dvt'],
    allColumns: ['id', 'ma_sp', 'ten_sp', 'dvt', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['ma_sp'] },
  { table: 'nhan_vien', label: 'Nhân viên', group: 'Danh mục',
    columns: ['ten', 'email', 'vai_tro', 'trang_thai'],
    allColumns: ['id', 'ten', 'email', 'vai_tro', 'trang_thai', 'ngay_bat_dau', 'ngay_nghi_viec', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['email'] },
  { table: 'phu_thu', label: 'Phụ thu', group: 'Danh mục',
    columns: ['loai_phu_phi', 'ma_hang', 'ten', 'phi', 'ghi_chu'],
    allColumns: ['id', 'loai_phu_phi', 'ma_hang', 'ten', 'phi', 'ghi_chu', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['loai_phu_phi', 'ma_hang'] },

  // ===== Chiết khấu =====
  { table: 'bang_gia_ck', label: 'Bảng giá CK', group: 'Chiết khấu',
    columns: ['loai', 'key_match', 'loai_kh', 'cot_index', 'gia_tri', 'loai_don_vi', 'ghi_chu'],
    allColumns: ['id', 'loai', 'key_match', 'loai_kh', 'cot_index', 'gia_tri', 'loai_don_vi', 'ghi_chu', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['loai', 'key_match', 'loai_kh', 'cot_index'] },
  { table: 'phan_bo_kh', label: 'Phân bổ KH', group: 'Chiết khấu',
    columns: ['ma_kh', 'thang', 'nam', 'loai_op'],
    allColumns: ['id', 'ma_kh', 'thang', 'nam', 'loai_op', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['ma_kh', 'thang', 'nam'] },
  { table: 'danh_sach_khach', label: 'Danh sách khách', group: 'Chiết khấu',
    columns: ['ma_kh', 'ten_kh', 'loai_op', 'vung', 'doi_tuong', 'hang', 'nhom', 'tu_lay', 'ck_vc_pct', 'ck_ds_98mau_pct', 'ck_ds_khac_pct', 'ghi_chu'],
    allColumns: ['id', 'ma_kh', 'ten_kh', 'loai_op', 'nguon', 'vung', 'doi_tuong', 'hang', 'nhom', 'tu_lay', 'ck_vc_pct', 'ck_ds_98mau_pct', 'ck_ds_khac_pct', 'ghi_chu', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['ma_kh'] },
  { table: 'policy_rules', label: 'Lớp 1 - CK bảng giá', group: 'Chiết khấu',
    columns: ['nhom_sp', 'doi_tuong', 'tu_ngay', 'den_ngay', 'nguong_kien', 'pct_le', 'pct_kien', 'nguong_tier2', 'pct_tier2', 'nguong_tier3', 'pct_tier3', 'ghi_chu'],
    allColumns: ['id', 'nhom_sp', 'doi_tuong', 'tu_ngay', 'den_ngay', 'nguong_kien', 'pct_le', 'pct_kien', 'nguong_tier2', 'pct_tier2', 'nguong_tier3', 'pct_tier3', 'ghi_chu'],
    keyFields: ['nhom_sp', 'doi_tuong', 'tu_ngay'] },
  { table: 'ck_van_chuyen', label: 'Lớp 2 - CK vận chuyển', group: 'Chiết khấu',
    columns: ['doi_tuong', 'vung', 'pct_mdf_mel', 'pct_khac', 'nguong_kien', 'tu_ngay', 'den_ngay'],
    allColumns: ['id', 'doi_tuong', 'vung', 'pct_mdf_mel', 'pct_khac', 'nguong_kien', 'tu_ngay', 'den_ngay'],
    keyFields: ['doi_tuong', 'vung'] },
  { table: 'policy_revenue_tiers', label: 'Lớp 3 - CK doanh số Mel', group: 'Chiết khấu',
    columns: ['vung', 'hang', 'bac_tu', 'pct_98mau', 'pct_khac', 'tu_ngay', 'den_ngay'],
    allColumns: ['id', 'vung', 'hang', 'bac_tu', 'pct_98mau', 'pct_khac', 'tu_ngay', 'den_ngay'],
    keyFields: ['vung', 'hang', 'bac_tu'] },
  { table: 'policy_annual_tiers', label: 'Lớp 5 - CK năm', group: 'Chiết khấu',
    columns: ['bac_tu', 'pct', 'tu_ngay', 'den_ngay'],
    allColumns: ['id', 'bac_tu', 'pct', 'tu_ngay', 'den_ngay'],
    keyFields: ['bac_tu'] },
  { table: 'op2_bac_thang', label: 'OP2 - bậc theo tháng', group: 'Chiết khấu',
    columns: ['ma_kh', 'thang', 'pct_98mau', 'pct_khac'],
    allColumns: ['ma_kh', 'thang', 'pct_98mau', 'pct_khac'],
    keyFields: ['ma_kh', 'thang'] },
  { table: 'ck_op1', label: 'Bảng CK OP1 theo tháng', group: 'Chiết khấu',
    columns: ['thang', 'nhom_sp', 'dieu_kien', 'dl_tinh', 'dl_nt', 'dl_sg', 'xuong_thuong', 'xuong_premium', 'loai_don_vi', 'don_vi_tinh', 'nguong', 'ghi_chu'],
    allColumns: ['id', 'thang', 'nhom_sp', 'dieu_kien', 'dl_tinh', 'dl_nt', 'dl_sg', 'xuong_thuong', 'xuong_premium', 'loai_don_vi', 'don_vi_tinh', 'nguong', 'ghi_chu', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['thang', 'nhom_sp', 'dieu_kien'] },
  { table: 'ck_op2', label: 'Bảng CK OP2 theo tháng', group: 'Chiết khấu',
    columns: ['thang', 'vung', 'bac_tu', 'pct_98mau', 'pct_khac', 'pct_vc_mel', 'pct_vc_khac'],
    allColumns: ['id', 'thang', 'vung', 'bac_tu', 'pct_98mau', 'pct_khac', 'pct_vc_mel', 'pct_vc_khac', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['thang', 'vung', 'bac_tu'] },
  { table: 'monthly_summary', label: 'Tổng hợp tháng (Lớp 4+5)', group: 'Chiết khấu',
    columns: ['ma_kh', 'thang', 'ds_mel_thang', 'ds_mel_luy_ke_nam', 'ck_thang_pct', 'ck_nam_pct'],
    allColumns: ['ma_kh', 'thang', 'ds_mel_thang', 'ds_mel_luy_ke_nam', 'ck_thang_pct', 'ck_nam_pct', 'updated_at'],
    keyFields: ['ma_kh', 'thang'] },
  { table: 'ma_hang_nhom_mau', label: 'Mã hàng - nhóm màu', group: 'Chiết khấu',
    columns: ['ma_hang', 'nhom_mau'],
    allColumns: ['ma_hang', 'nhom_mau'],
    keyFields: ['ma_hang'] },

  // ===== Bảng Tính Giá Chi Tiết - Ván Phủ =====
  { table: 'bang_gia_cot_go', label: 'Cốt gỗ', group: 'Bảng giá ván phủ',
    columns: ['loai', 'tier', 'do_day', 'cap', 'gia', 'gia_phu'],
    allColumns: ['id', 'loai', 'tier', 'do_day', 'cap', 'gia', 'gia_phu', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['loai', 'tier', 'do_day', 'cap'] },
  { table: 'bang_gia_nhom_mau', label: 'Nhóm màu', group: 'Bảng giá ván phủ',
    columns: ['bang', 'tier', 'nhom', 'loai_mau', 'gia_1_mat', 'gia_2_mat'],
    allColumns: ['id', 'bang', 'tier', 'nhom', 'loai_mau', 'gia_1_mat', 'gia_2_mat', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['bang', 'tier', 'nhom'] },
  { table: 'bang_gia_ma_mau', label: 'Mã màu', group: 'Bảng giá ván phủ',
    columns: ['bang', 'tier', 'nhom', 'ma_mau', 'ten_mau'],
    allColumns: ['id', 'bang', 'tier', 'nhom', 'ma_mau', 'ten_mau', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['bang', 'tier', 'ma_mau'] },
  { table: 'gia_ban', label: 'Giá bán', group: 'Bảng giá ván phủ',
    columns: ['ma_sp', 'ten_sp', 'do_day', 'ma_giay', 'nhom', 'loai_giay', 'loai_phim', 'so_luong', 'van_tron', 'dg_giay', 'dg_vt', 'hieu_luc_tu', 'hieu_luc_den'],
    allColumns: ['id', 'ma_sp', 'ten_sp', 'do_day', 'ma_giay', 'nhom', 'loai_giay', 'loai_phim', 'so_luong', 'van_tron', 'dg_giay', 'dg_vt', 'hieu_luc_tu', 'hieu_luc_den', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['ma_sp'] },
  { table: 'gia_ban_tier', label: 'Giá bán Tier', group: 'Bảng giá ván phủ',
    columns: ['gia_ban_id', 'tier', 'don_gia', 'dg_giay', 'dg_vt'],
    allColumns: ['id', 'gia_ban_id', 'tier', 'don_gia', 'dg_giay', 'dg_vt'],
    keyFields: ['gia_ban_id', 'tier'] },

  // ===== Bảng Tính Giá Chi Tiết - 8 Nhóm Nhỏ =====
  { table: 'bang_gia_veneers', label: 'Veneer', group: '8 nhóm nhỏ',
    columns: ['loai', 'tier', 'ten', 'gia_1_mat', 'gia_2_mat', 'ghi_chu'],
    allColumns: ['id', 'loai', 'tier', 'ten', 'gia_1_mat', 'gia_2_mat', 'ghi_chu', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['loai', 'tier', 'ten'] },
  { table: 'bang_gia_chi', label: 'Chỉ', group: '8 nhóm nhỏ',
    columns: ['loai', 'tier', 'ten', 'quy_cach', 'gia', 'don_vi', 'ghi_chu'],
    allColumns: ['id', 'loai', 'tier', 'ten', 'quy_cach', 'gia', 'don_vi', 'ghi_chu', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['id'] },
  { table: 'bang_gia_keo_nong', label: 'Keo dán chỉ', group: '8 nhóm nhỏ',
    columns: ['ma', 'tier', 'nhiet_do', 'mau_sac', 'don_gia_kg', 'don_gia_bao25'],
    allColumns: ['id', 'ma', 'tier', 'nhiet_do', 'mau_sac', 'don_gia_kg', 'don_gia_bao25', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['id'] },
  { table: 'bang_gia_acrylic_foil', label: 'Acrylic Foil', group: '8 nhóm nhỏ',
    columns: ['series', 'tier', 'loai', 'gia_tot', 'ma_mau'],
    allColumns: ['id', 'series', 'tier', 'loai', 'gia_tot', 'ma_mau', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['id'] },
  { table: 'bang_gia_van_phu_acrylic', label: 'Ván phủ Acrylic', group: '8 nhóm nhỏ',
    columns: ['series', 'tier', 'phu', 'loai_cot', 'gia_don_sac', 'gia_anh_kim', 'gia_van_go'],
    allColumns: ['id', 'series', 'tier', 'phu', 'loai_cot', 'gia_don_sac', 'gia_anh_kim', 'gia_van_go', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['id'] },
  { table: 'bang_gia_laminate_one', label: 'Laminate One', group: '8 nhóm nhỏ',
    columns: ['nhom', 'tier', 'gia_foil', 'ma_mau'],
    allColumns: ['id', 'nhom', 'tier', 'gia_foil', 'ma_mau', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['id'] },
  { table: 'bang_gia_nhua_pvc', label: 'Nhựa PVC', group: '8 nhóm nhỏ',
    columns: ['loai', 'tier', 'do_day', 'ma_sp', 'gia', 'gia_phu', 'ghi_chu'],
    allColumns: ['id', 'loai', 'tier', 'do_day', 'ma_sp', 'gia', 'gia_phu', 'ghi_chu', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['id'] },
  { table: 'bang_gia_pvc_film', label: 'PVC Film', group: '8 nhóm nhỏ',
    columns: ['loai', 'tier', 'nhom_mau', 'ma_so', 'thong_so_film', 'gia_1_mat', 'gia_2_mat'],
    allColumns: ['id', 'loai', 'tier', 'nhom_mau', 'ma_so', 'thong_so_film', 'gia_1_mat', 'gia_2_mat', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['id'] },
  { table: 'bang_gia_van_phu_pvc', label: 'Ván phủ PVC', group: '8 nhóm nhỏ',
    columns: ['loai_cot', 'tier', 'do_day', 'pvc_uu_dai_1m', 'pvc_uu_dai_2m', 'pvc_standard_1m', 'pvc_standard_2m', 'pvc_premium_1m', 'pvc_premium_2m', 'petg_1m', 'petg_2m'],
    allColumns: ['id', 'loai_cot', 'tier', 'do_day', 'pvc_uu_dai_1m', 'pvc_uu_dai_2m', 'pvc_standard_1m', 'pvc_standard_2m', 'pvc_premium_1m', 'pvc_premium_2m', 'petg_1m', 'petg_2m', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['id'] },
  { table: 'bang_gia_nhua_phu_mau', label: 'Melamine', group: '8 nhóm nhỏ',
    columns: ['loai_cot', 'tier', 'do_day', 'nhom_sang_trung', 'nhom_toi_don_sac', 'mau_106'],
    allColumns: ['id', 'loai_cot', 'tier', 'do_day', 'nhom_sang_trung', 'nhom_toi_don_sac', 'mau_106', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['id'] },
  { table: 'bang_gia_nhua_laminate', label: 'Ván phủ Laminate', group: '8 nhóm nhỏ',
    columns: ['loai_cot', 'tier', 'do_day', 'do_day_thanh_pham', 'le1_backer', 'le2_backer', 'lp1_backer', 'lp2_backer', 'lp3_backer', 'le1_2mat', 'le2_2mat', 'lp1_2mat', 'lp2_2mat', 'lp3_2mat'],
    allColumns: ['id', 'loai_cot', 'tier', 'do_day', 'do_day_thanh_pham', 'le1_backer', 'le2_backer', 'lp1_backer', 'lp2_backer', 'lp3_backer', 'le1_2mat', 'le2_2mat', 'lp1_2mat', 'lp2_2mat', 'lp3_2mat', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['id'] },
  { table: 'bang_gia_osb_laminate', label: 'OSB Laminate', group: '8 nhóm nhỏ',
    columns: ['loai_cot', 'tier', 'do_day', 'do_day_thanh_pham', 'le1_backer', 'le2_backer', 'lp1_backer', 'lp2_backer', 'lp3_backer', 'le1_2mat', 'le2_2mat', 'lp1_2mat', 'lp2_2mat', 'lp3_2mat'],
    allColumns: ['id', 'loai_cot', 'tier', 'do_day', 'do_day_thanh_pham', 'le1_backer', 'le2_backer', 'lp1_backer', 'lp2_backer', 'lp3_backer', 'le1_2mat', 'le2_2mat', 'lp1_2mat', 'lp2_2mat', 'lp3_2mat', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['id'] },


  // ===== Dữ liệu =====
  { table: 'so_chi_tiet_ban_hang', label: 'Sổ chi tiết bán hàng', group: 'Dữ liệu',
    columns: ['ngay', 'so_ct', 'dien_giai', 'ma_kh', 'ten_kh', 'ma_hang', 'ten_hang', 'sl_ban', 'don_gia', 'doanh_so', 'ck', 'sl_tra', 'gt_tra', 'gt_giam', 'thue'],
    allColumns: ['id', 'ngay', 'so_ct', 'dien_giai', 'ma_kh', 'ten_kh', 'ma_hang', 'ten_hang', 'sl_ban', 'don_gia', 'doanh_so', 'ck', 'sl_tra', 'gt_tra', 'gt_giam', 'thue', 'created_at'],
    keyFields: ['id'] },
  { table: 'check_gia_goc_ck', label: 'Check giá gốc - CK', group: 'Dữ liệu',
    columns: ['ngay', 'so_ct', 'dien_giai', 'ma_kh', 'ten_kh', 'ma_hang', 'ten_hang', 'sl_ban', 'don_gia', 'doanh_so', 'ck', 'sl_tra', 'gt_tra', 'gt_giam', 'thue'],
    allColumns: ['id', 'ngay', 'so_ct', 'dien_giai', 'ma_kh', 'ten_kh', 'ma_hang', 'ten_hang', 'sl_ban', 'don_gia', 'doanh_so', 'ck', 'sl_tra', 'gt_tra', 'gt_giam', 'thue', 'created_at'],
    exportColumns: ['ngay', 'so_ct', 'dien_giai', 'ma_kh', 'ten_kh', 'ma_hang', 'ten_hang', 'sl_ban', 'don_gia', 'gia_goc', 'gia_goc_ngay', 'gia_misa', 'chech_lech', 'doanh_so', 'ck', 'sl_tra', 'gt_tra', 'gt_giam', 'thue'],
    exportAllColumns: ['id', 'ngay', 'so_ct', 'dien_giai', 'ma_kh', 'ten_kh', 'ma_hang', 'ten_hang', 'sl_ban', 'don_gia', 'gia_goc', 'gia_goc_ngay', 'gia_misa', 'chech_lech', 'doanh_so', 'ck', 'sl_tra', 'gt_tra', 'gt_giam', 'thue', 'created_at'],
    exportQuery: `SELECT t.*,
        m.gia_goc AS gia_goc,
        t.gia_goc_ngay,
        m.gia_goc AS gia_misa,
        (COALESCE(t.gia_goc_ngay, m.gia_goc, 0) - t.don_gia) AS chech_lech
      FROM check_gia_goc_ck t
      LEFT JOIN ma_misa m ON m.ma_sp = t.ma_hang`,
    keyFields: ['id'] },
  { table: 'check_chiet_khau_test', label: 'Check chiết khấu', group: 'Dữ liệu',
    columns: ['ngay', 'so_ct', 'dien_giai', 'ma_kh', 'ten_kh', 'ma_hang', 'ten_hang', 'sl_ban', 'don_gia', 'doanh_so', 'ck', 'ck1_pct', 'ck2_pct', 'ck3_pct', 'tong_pct', 'ck_tinh', 'dieu_kien', 'updated_by'],
    allColumns: ['id', 'ngay', 'so_ct', 'dien_giai', 'ma_kh', 'ten_kh', 'ma_hang', 'ten_hang', 'sl_ban', 'don_gia', 'doanh_so', 'ck', 'sl_tra', 'gt_tra', 'gt_giam', 'thue', 'ck1_pct', 'ck2_pct', 'ck3_pct', 'tong_pct', 'ck_tinh', 'nhom_mau', 'dieu_kien', 'giai_thich', 'sua_ck1_pct', 'sua_ck2_pct', 'sua_ck3_pct', 'sua_tong_pct', 'sua_ck_tinh', 'sua_ghichu', 'updated_by', 'created_at', 'updated_at'],
    keyFields: ['id'] },
  { table: 'don_hang', label: 'Đơn hàng', group: 'Dữ liệu',
    columns: ['nv_sale', 'dh', 'kho', 'ngay', 'tinh_hinh', 'ma_kh', 'khach', 'ma_hang', 'dien_giai', 'sl_dat', 'tien_ck', 'dso', 'ty_le_ck', 'don_gia_ban', 'nhom_gia', 'es', 'hang_khach', 'giay', 'phim', 'mau', 'sl_mat', 'van_tron_chi', 'con_lai', 'gia_dung_kiem_lai', 'cl_sai_tam', 'tong_cl', 'dh_chieu', 'ck_dung', 'pt', 'cl_ck', 'hk', 'n', 'ck_vc', 'khach_text', 'kln', 'cl_ck2', 'gia_dh', 'cl', 'ghi_chu', 'mau_sang_trung_toi', 'vt', 'sai_ma', 'ten_hang', 'dd_chung', 'so_ct', 'dvt', 'sl_tra', 'gt_tra', 'gt_giam'],
    allColumns: ['id', 'nv_sale', 'dh', 'kho', 'ngay', 'tinh_hinh', 'ma_kh', 'khach', 'ma_hang', 'dien_giai', 'sl_dat', 'tien_ck', 'dso', 'ty_le_ck', 'don_gia_ban', 'nhom_gia', 'es', 'hang_khach', 'giay', 'phim', 'mau', 'sl_mat', 'van_tron_chi', 'con_lai', 'gia_dung_kiem_lai', 'cl_sai_tam', 'tong_cl', 'dh_chieu', 'ck_dung', 'pt', 'cl_ck', 'hk', 'n', 'ck_vc', 'khach_text', 'kln', 'cl_ck2', 'gia_dh', 'cl', 'ghi_chu', 'mau_sang_trung_toi', 'vt', 'sai_ma', 'ten_hang', 'dd_chung', 'so_ct', 'dvt', 'sl_tra', 'gt_tra', 'gt_giam', 'sales_id', 'created_at', 'updated_at', 'updated_by'],
    keyFields: ['id'] },
  { table: 'don_hang_excel', label: 'Đơn hàng (Excel)', group: 'Dữ liệu',
    columns: ['tinh_trang', 'ngay_dh', 'so_dh', 'phe_duyet', 'ngay_hen_giao', 'ten_kh', 'chi_tiet', 'tong_sl', 'gia_tri_dh', 'chung_tu', 'dien_giai', 'nv_sale', 'dia_chi'],
    allColumns: ['id', 'tinh_trang', 'ngay_dh', 'so_dh', 'phe_duyet', 'ngay_hen_giao', 'ten_kh', 'chi_tiet', 'tong_sl', 'gia_tri_dh', 'chung_tu', 'dien_giai', 'nv_sale', 'dia_chi', 'created_at'],
    keyFields: ['id'] },
]

const TABLE_META = Object.fromEntries(DB_TABLES.map(t => [t.table.replaceAll('_', '-'), t]))

// URL tiền tuyến dùng apiPath="/check-chiet-khau" nhưng bảng thật named "check_chiet_khau_test"
const checkCkMeta = TABLE_META['check-chiet-khau-test']
if (checkCkMeta) TABLE_META['check-chiet-khau'] = checkCkMeta

// Resolve sales name → sales_id
async function resolveSalesId(db: D1Database, salesName: string): Promise<number | null> {
  if (!salesName || !salesName.trim()) return null
  const nv = await db.prepare(
    `SELECT id FROM nhan_vien WHERE ten LIKE ? OR email LIKE ? LIMIT 1`
  ).bind(`%${salesName.trim()}%`, `%${salesName.trim()}%`).first() as any
  return nv?.id || null
}

// ============ TABLES LIST ============

router.get('/tables', (c) => {
  const list = Object.entries(TABLE_META).map(([key, meta]) => ({
    key, label: meta.label, group: meta.group,
    columns: meta.columns,
    allColumns: meta.allColumns,
    keyFields: meta.keyFields,
  }))
  return c.json(list)
})

// ============ TEMPLATE DOWNLOAD ============

router.get('/template/:table', async (c) => {
  try {
    const { table } = c.req.param()
    const meta = TABLE_META[table]
    if (!meta) return c.json({ error: `Unknown table: ${table}` }, 400)

    const headerRow = meta.columns.map(c => {
      const labels: Record<string, string> = {
        ma_kh: 'Mã KH *', ten_kh: 'Tên KH', dia_chi: 'Địa chỉ',
        phan_loai: 'Phân loại *', ma_sp: 'Mã SP *', ten_sp: 'Tên SP',
        loai: 'Loại *', key_match: 'Key *', loai_kh: 'Loại KH',
        cot_index: 'Cột CK', gia_tri: 'Giá trị *', loai_don_vi: 'Đơn vị',
        thang: 'Tháng *', nam: 'Năm *', loai_op: 'Loại OP *',
        nguon: 'Nguồn',
        ma_hang: 'Mã hàng *', ten_hang: 'Tên hàng', phi: 'Phí',
        ma_mau: 'Mã màu', ten_mau: 'Tên màu', ma_vt: 'Mã ván trơn',
        ten_vt: 'Tên ván trơn', email: 'Email *', ten: 'Tên *',
        vai_tro: 'Vai trò', trang_thai: 'Trạng thái',
        nv_sale: 'NV Sale', sales_phu_trach_id: 'Mã NV phụ trách',
        ngay: 'Ngày', so_ct: 'Số CT', dien_giai: 'Diễn giải',
        sl_ban: 'SL bán', don_gia: 'Đơn giá', doanh_so: 'Doanh số',
        ck: 'CK', sl_tra: 'SL trả', gt_tra: 'GT trả', gt_giam: 'GT giảm', thue: 'Thuế',
        tier: 'Tier', do_day: 'Độ dày', cap: 'Cap',
        gia: 'Giá', gia_phu: 'Giá phụ', nhom: 'Nhóm',
        loai_mau: 'Loại màu', gia_1_mat: 'Giá 1 mặt', gia_2_mat: 'Giá 2 mặt',
        quy_cach: 'Quy cách', don_vi: 'Đơn vị', ghi_chu: 'Ghi chú',
        ma: 'Mã', nhiet_do: 'Nhiệt độ', mau_sac: 'Màu sắc',
        don_gia_kg: 'Đơn giá/kg', don_gia_bao25: 'Đơn giá/bao 25kg',
        series: 'Series', gia_tot: 'Giá tốt', phu: 'Phủ',
        loai_cot: 'Loại cốt', gia_don_sac: 'Giá đơn sắc',
        gia_anh_kim: 'Giá ánh kim', gia_van_go: 'Giá vân gỗ',
        gia_foil: 'Giá Foil', nhom_mau: 'Nhóm màu', ma_so: 'Mã số',
        thong_so_film: 'Thông số film',
        nhom_sang_trung: 'Nhóm sáng trung',
        nhom_toi_don_sac: 'Nhóm tối đơn sắc', mau_106: 'Màu 106',
        do_day_thanh_pham: 'Độ dày thành phẩm',
        le1_backer: 'LE1 Backer', le2_backer: 'LE2 Backer',
        lp1_backer: 'LP1 Backer', lp2_backer: 'LP2 Backer', lp3_backer: 'LP3 Backer',
        le1_2mat: 'LE1 2 mặt', le2_2mat: 'LE2 2 mặt',
        lp1_2mat: 'LP1 2 mặt', lp2_2mat: 'LP2 2 mặt', lp3_2mat: 'LP3 2 mặt',
        pvc_uu_dai_1m: 'PVC ưu đãi 1m', pvc_uu_dai_2m: 'PVC ưu đãi 2m',
        pvc_standard_1m: 'PVC Standard 1m', pvc_standard_2m: 'PVC Standard 2m',
        pvc_premium_1m: 'PVC Premium 1m', pvc_premium_2m: 'PVC Premium 2m',
        petg_1m: 'PETG 1m', petg_2m: 'PETG 2m',
        vung: 'Vùng', doi_tuong: 'Đối tượng', hang: 'Hạng', nhom_sp: 'Nhóm SP',
        tu_lay: 'Tự lấy', tu_ngay: 'Từ ngày', den_ngay: 'Đến ngày',
        pct_le: 'CK lẻ', pct_kien: 'CK kiện', pct_tier2: 'CK bậc 2', pct_tier3: 'CK bậc 3',
        nguong_kien: 'Ngưỡng kiện', nguong_tier2: 'Ngưỡng bậc 2', nguong_tier3: 'Ngưỡng bậc 3',
        pct_mdf_mel: 'CK MDF/Mel', pct_khac: 'CK khác', bac_tu: 'Bậc từ',
        pct_98mau: 'CK 98 màu', ck_vc_pct: 'CK vận chuyển',
        ck_ds_98mau_pct: 'CK DS 98 màu', ck_ds_khac_pct: 'CK DS màu khác',
        ds_mel_thang: 'DS Mel tháng', ds_mel_luy_ke_nam: 'DS Mel lũy kế năm',
        ck_thang_pct: 'CK tháng', ck_nam_pct: 'CK năm',
      }
      return labels[c] || c
    })

    const ws = XLSX.utils.aoa_to_sheet([headerRow])
    ws['!cols'] = meta.columns.map(() => ({ wch: 20 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, meta.label)

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="mau_import_${meta.table}.xlsx"`,
      },
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ============ IMPORT PREVIEW ============

interface PreviewRow {
  index: number
  status: 'new' | 'unchanged' | 'changed' | 'error'
  errors: string[]
  data: Record<string, any>
  changes?: Record<string, { old: any; new: any }>
}

const HEADER_LABELS: Record<string, string> = {
  'Mã KH *': 'ma_kh', 'Mã KH': 'ma_kh', 'Tên KH': 'ten_kh', 'Địa chỉ': 'dia_chi',
  'Phân loại *': 'phan_loai', 'Phân loại': 'phan_loai',
  'Mã SP *': 'ma_sp', 'Mã SP': 'ma_sp', 'Tên SP': 'ten_sp',
  'Loại *': 'loai', 'Loại': 'loai',
  'Key *': 'key_match', 'Key': 'key_match',
  'Loại KH': 'loai_kh', 'Cột CK': 'cot_index',
  'Giá trị *': 'gia_tri', 'Giá trị': 'gia_tri',
  'Đơn vị': 'loai_don_vi',
  'Tháng *': 'thang', 'Tháng': 'thang',
  'Năm *': 'nam', 'Năm': 'nam',
  'Loại OP *': 'loai_op', 'Loại OP': 'loai_op',
  'Nguồn': 'nguon',
  'Mã hàng *': 'ma_hang', 'Mã hàng': 'ma_hang',
  'Phí': 'phi', 'Mã màu': 'ma_mau', 'Tên màu': 'ten_mau',
  'Mã ván trơn': 'ma_vt', 'Tên ván trơn': 'ten_vt',
  'Email *': 'email', 'Email': 'email',
  'Tên *': 'ten', 'Tên': 'ten',
  'Vai trò': 'vai_tro', 'Trạng thái': 'trang_thai',
  'NV Sale': 'nv_sale', 'Mã NV phụ trách': 'sales_phu_trach_id',
  'Ghi chú': 'ghi_chu', 'Nhóm': 'nhom', 'Độ dày': 'do_day',
  'Loại giấy': 'loai_giay', 'Loại phim': 'loai_phim',
  'Ngày': 'ngay', 'Số CT': 'so_ct', 'Diễn giải': 'dien_giai',
  'Tên hàng': 'ten_hang', 'SL bán': 'sl_ban', 'Đơn giá': 'don_gia',
  'Doanh số': 'doanh_so', 'CK': 'ck', 'SL trả': 'sl_tra',
  'GT trả': 'gt_tra', 'GT giảm': 'gt_giam', 'Thuế': 'thue',
  'Vùng': 'vung', 'Đối tượng': 'doi_tuong', 'Hạng': 'hang', 'Nhóm SP': 'nhom_sp',
  'Tự lấy': 'tu_lay', 'Từ ngày': 'tu_ngay', 'Đến ngày': 'den_ngay',
  'CK lẻ': 'pct_le', 'CK kiện': 'pct_kien', 'CK bậc 2': 'pct_tier2', 'CK bậc 3': 'pct_tier3',
  'Ngưỡng kiện': 'nguong_kien', 'Ngưỡng bậc 2': 'nguong_tier2', 'Ngưỡng bậc 3': 'nguong_tier3',
  'CK MDF/Mel': 'pct_mdf_mel', 'CK khác': 'pct_khac', 'Bậc từ': 'bac_tu',
  'CK 98 màu': 'pct_98mau', 'CK vận chuyển': 'ck_vc_pct',
  'CK DS 98 màu': 'ck_ds_98mau_pct', 'CK DS màu khác': 'ck_ds_khac_pct',
  'DS Mel tháng': 'ds_mel_thang', 'DS Mel lũy kế năm': 'ds_mel_luy_ke_nam',
  'CK tháng': 'ck_thang_pct', 'CK năm': 'ck_nam_pct',
}

router.post('/preview', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null
    const tableKey = formData.get('table') as string || ''
    const overrideSales = formData.get('override_sales') as string || ''

    if (!file) return c.json({ error: 'No file uploaded' }, 400)
    const meta = TABLE_META[tableKey]
    if (!meta) return c.json({ error: `Unknown table: ${tableKey}` }, 400)

    const buf = await file.arrayBuffer()
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array' })
    const sheetName = wb.SheetNames[0]
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 }) as any[][]

    if (rows.length < 2) return c.json({ error: 'File phải có header + ít nhất 1 dòng dữ liệu' }, 400)

    const excelHeaders = (rows[0] || []).map((h: any) => String(h || '').trim()).filter(Boolean)

    const colMap: Record<string, number> = {}
    const unknownHeaders: string[] = []
    const unmatchedRequired: string[] = []

    for (let ci = 0; ci < excelHeaders.length; ci++) {
      const h = excelHeaders[ci]
      const dbCol = HEADER_LABELS[h] || null
      if (dbCol && meta.columns.includes(dbCol)) {
        colMap[dbCol] = ci
      } else if (dbCol) {
        unknownHeaders.push(`${h} (→ ${dbCol}) không thuộc bảng ${meta.table}`)
      } else if (!h.includes('*')) {
        unknownHeaders.push(`${h} — không xác định được cột`)
      }
    }

    for (const col of meta.columns) {
      if (colMap[col] === undefined) {
        unmatchedRequired.push(col)
      }
    }

    let resolvedSalesId: number | null = null
    if (overrideSales) {
      resolvedSalesId = await resolveSalesId(c.env.DB, overrideSales)
    }

    const dataRows = rows.slice(1).filter((r: any[]) => r.some((v: any) => v !== undefined && v !== null && v !== ''))

    const previewRows: PreviewRow[] = []
    let newCount = 0, unchangedCount = 0, changedCount = 0, errorCount = 0

    for (let ri = 0; ri < dataRows.length; ri++) {
      const rowData: Record<string, any> = {}
      const errors: string[] = []

      for (const col of meta.columns) {
        const ci = colMap[col]
        if (ci !== undefined) {
          rowData[col] = dataRows[ri][ci] ?? null
        }
      }

      if (resolvedSalesId && meta.salesField) {
        rowData[meta.salesField] = resolvedSalesId
      }

      const keyConds = meta.keyFields.map(k => `${k} = ?`).join(' AND ')
      const keyVals = meta.keyFields.map(k => rowData[k])

      if (keyVals.some(v => v === null || v === undefined || v === '')) {
        errors.push(`Thiếu giá trị khoá chính (${meta.keyFields.join(', ')})`)
      }

      if (errors.length > 0) {
        previewRows.push({ index: ri + 2, status: 'error', errors, data: rowData })
        errorCount++
        continue
      }

      const existing = await c.env.DB.prepare(
        `SELECT * FROM ${meta.table} WHERE ${keyConds} LIMIT 1`
      ).bind(...keyVals).first() as Record<string, any> | null

      if (!existing) {
        previewRows.push({ index: ri + 2, status: 'new', errors: [], data: rowData })
        newCount++
      } else {
        const changes: Record<string, { old: any; new: any }> = {}
        for (const col of meta.columns) {
          const newVal = rowData[col]
          const oldVal = existing[col]
          const strNew = newVal === null || newVal === undefined ? '' : String(newVal).trim()
          const strOld = oldVal === null || oldVal === undefined ? '' : String(oldVal).trim()
          if (strNew !== '' && strNew !== strOld) {
            changes[col] = { old: oldVal, new: newVal }
          }
        }

        if (Object.keys(changes).length === 0) {
          previewRows.push({ index: ri + 2, status: 'unchanged', errors: [], data: rowData })
          unchangedCount++
        } else {
          previewRows.push({ index: ri + 2, status: 'changed', errors: [], data: rowData, changes })
          changedCount++
        }
      }
    }

    return c.json({
      table: tableKey,
      meta: { columns: meta.columns, keyFields: meta.keyFields },
      totalRows: dataRows.length,
      columnMap: colMap,
      unmatchedColumns: unmatchedRequired,
      unknownHeaders,
      summary: { new: newCount, unchanged: unchangedCount, changed: changedCount, errors: errorCount },
      rows: previewRows,
      salesResolved: resolvedSalesId ? true : false,
      salesName: overrideSales || null,
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ============ IMPORT CONFIRM ============

router.post('/confirm', async (c) => {
  try {
    const body = await c.req.json() as {
      table: string
      rows: { index: number; status: string; data: Record<string, any>; changes?: Record<string, { old: any; new: any }> }[]
      nhan_vien?: string
    }

    const meta = TABLE_META[body.table]
    if (!meta) return c.json({ error: `Unknown table: ${body.table}` }, 400)

    const db = c.env.DB
    const nguoiImport = body.nhan_vien || 'system'
    let inserted = 0, updated = 0, skipped = 0
    const auditEntries: any[] = []

    for (const row of body.rows) {
      if (row.status === 'unchanged' || row.status === 'error') { skipped++; continue }

      const keyVals = meta.keyFields.map(k => row.data[k])
      const keyConds = meta.keyFields.map(k => `${k} = ?`).join(' AND ')

      if (row.status === 'new') {
        const cols = meta.columns.filter(c => row.data[c] !== null && row.data[c] !== undefined && row.data[c] !== '')
        if (cols.length === 0) { skipped++; continue }
        const vals = cols.map(c => row.data[c])
        await db.prepare(
          `INSERT OR IGNORE INTO ${meta.table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
        ).bind(...vals).run()
        inserted++
        auditEntries.push({
          nhan_vien: nguoiImport, bang: meta.table, dong_id: null,
          hanh_dong: 'INSERT', gia_tri_cu: null, gia_tri_moi: JSON.stringify(row.data),
        })
      } else if (row.status === 'changed' && row.changes) {
        const changedCols = Object.keys(row.changes)
        const setClause = changedCols.map(c => `${c} = ?`).join(', ')
        const newVals = changedCols.map(c => row.data[c])
        await db.prepare(
          `UPDATE ${meta.table} SET ${setClause} WHERE ${keyConds}`
        ).bind(...newVals, ...keyVals).run()
        updated++
        for (const [col, { old: oldVal, new: newVal }] of Object.entries(row.changes)) {
          auditEntries.push({
            nhan_vien: nguoiImport, bang: meta.table, dong_id: null,
            hanh_dong: 'UPDATE', gia_tri_cu: `${col}: ${oldVal ?? 'NULL'}`,
            gia_tri_moi: `${col}: ${newVal ?? 'NULL'}`,
          })
        }
      }
    }

    for (const entry of auditEntries) {
      await db.prepare(
        `INSERT INTO audit_log (nhan_vien, bang, dong_id, hanh_dong, gia_tri_cu, gia_tri_moi) VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(entry.nhan_vien, entry.bang, entry.dong_id, entry.hanh_dong, entry.gia_tri_cu, entry.gia_tri_moi).run()
    }

    return c.json({
      success: true, table: body.table,
      results: { inserted, updated, skipped, audit_entries: auditEntries.length },
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ============ EXPORT ============

// ============ IMPORT JSON ============
// Upsert dữ liệu JSON (array các object) vào bảng theo keyFields.
// Body: { rows: [ { col: val, ... }, ... ] } — nếu keyFields tồn tại trong row → UPDATE, ngược lại INSERT.
router.post('/json/:table', async (c) => {
  try {
    const { table } = c.req.param()
    const meta = TABLE_META[table]
    if (!meta) return c.json({ error: `Unknown table: ${table}` }, 400)

    const body = await c.req.json() as any
    const rows: any[] = Array.isArray(body.rows) ? body.rows : (Array.isArray(body) ? body : [])
    if (rows.length === 0) return c.json({ error: 'Không có dữ liệu' }, 400)

    const db = c.env.DB
    const allowed = new Set(meta.allColumns)
    let inserted = 0, updated = 0, skipped = 0

    for (const row of rows) {
      const data: Record<string, any> = {}
      for (const [k, v] of Object.entries(row)) {
        if (allowed.has(k) && v !== undefined && v !== null && v !== '') data[k] = v
      }
      if (Object.keys(data).length === 0) { skipped++; continue }

      // keyFields có giá trị trong row → tìm bản ghi cũ để UPDATE, ngược lại INSERT
      const keyVals = meta.keyFields.map(k => data[k])
      const hasKey = keyVals.every(v => v !== undefined && v !== null && v !== '')

      let exists = null
      if (hasKey) {
        const keyConds = meta.keyFields.map(k => `${k} = ?`).join(' AND ')
        exists = await db.prepare(`SELECT ${meta.keyFields.join(', ')} FROM ${meta.table} WHERE ${keyConds} LIMIT 1`).bind(...keyVals).first()
      }

      if (exists) {
        const updateKeys = Object.keys(data).filter(k => !meta.keyFields.includes(k))
        if (updateKeys.length === 0) { skipped++; continue }
        const setClause = updateKeys.map(k => `${k} = ?`).join(', ')
        await db.prepare(`UPDATE ${meta.table} SET ${setClause} WHERE ${meta.keyFields.map(k => `${k} = ?`).join(' AND ')}`)
          .bind(...updateKeys.map(k => data[k]), ...keyVals).run()
        updated++
      } else {
        const cols = Object.keys(data).filter(k => !meta.allColumns.includes('id') || k !== 'id')
        const insCols = cols.filter(k => allowed.has(k))
        if (insCols.length === 0) { skipped++; continue }
        await db.prepare(
          `INSERT OR IGNORE INTO ${meta.table} (${insCols.join(', ')}) VALUES (${insCols.map(() => '?').join(', ')})`
        ).bind(...insCols.map(k => data[k])).run()
        inserted++
      }
    }

    return c.json({ success: true, table, results: { inserted, updated, skipped } })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

router.get('/excel/:table', async (c) => {
  try {
    const { table } = c.req.param()
    const meta = TABLE_META[table]
    if (!meta) return c.json({ error: `Unknown table: ${table}` }, 400)

    const colsParam = c.req.query('columns') || ''
    const defCols = meta.exportColumns || meta.columns
    const exportCols = colsParam ? colsParam.split(',').filter(Boolean) : defCols
    const allowedCols = meta.exportAllColumns || meta.allColumns

    // Validate requested columns
    const validCols = exportCols.filter((col: string) => allowedCols.includes(col))
    if (validCols.length === 0) return c.json({ error: 'No valid columns selected' }, 400)

    const selectCols = validCols.join(', ')
    const fromSql = meta.exportQuery ? `(${meta.exportQuery})` : meta.table
    const result = await c.env.DB.prepare(`SELECT ${selectCols} FROM ${fromSql} ORDER BY id`).all()
    const rows = result.results || []

    // Resolve sales_id → name if applicable
    if (meta.salesField && rows.length > 0 && validCols.includes(meta.salesField)) {
      const salesIds = [...new Set(rows.map((r: any) => r[meta.salesField as string]).filter(Boolean))]
      if (salesIds.length > 0) {
        const nvMap: Record<number, string> = {}
        for (const sid of salesIds) {
          const nv = await c.env.DB.prepare(`SELECT ten FROM nhan_vien WHERE id = ?`).bind(sid).first() as any
          if (nv) nvMap[sid] = nv.ten
        }
        ;(rows as any[]).forEach((r: any) => {
          if (r[meta.salesField as string]) r['ten_sale'] = nvMap[r[meta.salesField as string]] || ''
        })
      }
    }

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows as Record<string, any>[])
    XLSX.utils.book_append_sheet(wb, ws, meta.label)
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${meta.label}_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

router.get('/json/:table', async (c) => {
  try {
    const { table } = c.req.param()
    const meta = TABLE_META[table]
    if (!meta) return c.json({ error: `Unknown table: ${table}` }, 400)

    const colsParam = c.req.query('columns') || ''
    const defCols = meta.exportColumns || meta.columns
    const exportCols = colsParam ? colsParam.split(',').filter(Boolean) : defCols
    const allowedCols = meta.exportAllColumns || meta.allColumns

    const validCols = exportCols.filter((col: string) => allowedCols.includes(col))
    if (validCols.length === 0) return c.json({ error: 'No valid columns selected' }, 400)

    const selectCols = validCols.join(', ')
    const fromSql = meta.exportQuery ? `(${meta.exportQuery})` : meta.table
    const result = await c.env.DB.prepare(`SELECT ${selectCols} FROM ${fromSql} ORDER BY id`).all()

    return c.json({ data: result.results || [], total: (result.results || []).length })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default router