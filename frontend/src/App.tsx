import { HashRouter, BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './modules/Dashboard'
import Welcome from './modules/Welcome'
import DanhMucKhachPage from './modules/DanhMucKhach'
import MaMisaPage from './modules/MaMisa'
import PhuThuPage from './modules/PhuThu'
import PhanBoKHPage from './modules/PhanBoKH'
import DanhSachKhachPage from './modules/DanhSachKhach'
import BangGiaCKPage from './modules/BangGiaCK'
import SoChiTietBanHangPage from './modules/SoChiTietBanHang'
import AuditGiaCKPage from './modules/AuditGiaCK'
import DonHangExcelPage from './modules/DonHangExcel'
import ImportExportPage from './modules/ImportExport'
import TinhGiaGocPage from './modules/TinhGiaGoc'
import SoSanhGiaGocPage from './modules/SoSanhGiaGoc'
import TraCuuGiaGocPage from './modules/TraCuuGiaGoc'

import BangGiaCotGoPage from './modules/BangGiaCotGo'
import BangGiaNhomMauPage from './modules/BangGiaNhomMau'
import BangGiaMaMauPage from './modules/BangGiaMaMau'
import BangGiaNewPage from './modules/BangGiaNew'
import GiaVanTronPage from './modules/GiaVanTron'
import GiaBanMisaPage from './modules/GiaBanMisa'
import PhanQuyenPage from './modules/PhanQuyen'
import CheckGiaGocPage from './modules/CheckGiaGoc'

import BangTinhGiaPage from './modules/BangTinhGia'
import DanhSachKhachNhomPage from './modules/DanhSachKhachNhom'
import LogThayDoiPage from './modules/LogThayDoi'
import BangKhachThangPage from './modules/BangKhachThang'
import QuanLyThangPage from './modules/QuanLyThang'
import CheckChietKhauPage from './modules/CheckChietKhau'
import SoDoiChieuPage from './modules/SoDoiChieu'
import TinhGiaVDOPage from './modules/TinhGiaVDO'
import TinhGiaVMHPage from './modules/TinhGiaVMH'
import TinhGiaGGPage from './modules/TinhGiaGG'
import TinhGiaVEPage from './modules/TinhGiaVE'
import TinhGiaOSBPage from './modules/TinhGiaOSB'
import TinhGiaDRPage from './modules/TinhGiaDR'
import TinhGiaPvcPetgPage from './modules/TinhGiaPvcPetg'
import TinhGiaMelamineTonghopPage from './modules/TinhGiaMelamineTonghop'
import TinhGiaVeneerMatPhuKhacPage from './modules/TinhGiaVeneerMatPhuKhac'
import TinhGiaChiNepKeoHatPage from './modules/TinhGiaChiNepKeoHat'
import TinhGiaAcrylicPage from './modules/TinhGiaAcrylic'
import TinhGiaOneLaminatePage from './modules/TinhGiaOneLaminate'
import TinhGiaMirrorPage from './modules/TinhGiaMirror'
import GiaGocTongHopPage from './modules/GiaGocTongHop'
import KiemTraBangTinhGiaPage from './modules/KiemTraBangTinhGia'
import Profile from './modules/Profile'
import QuanLyTaiKhoan from './modules/QuanLyTaiKhoan'
import NhatKyThietBi from './modules/NhatKyThietBi'
import { AuthProvider } from './lib/auth'
import { LockProvider } from './lib/lock'
import UpdatePrompt from './components/UpdatePrompt'
import { initOfflineListener } from './lib/api'

const isElectron = navigator.userAgent.includes('Electron')
const isTauri = !!(window as any).__TAURI_INTERNALS__
const Router = (isElectron || isTauri) ? HashRouter : BrowserRouter

function App() {
  // Initialize offline listener for Tauri
  if (isTauri) initOfflineListener()

  return (
    <AuthProvider>
      <LockProvider>
        <Router>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Welcome />} />
              <Route path="/check-gia-goc" element={<CheckGiaGocPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/khach-hang" element={<DanhMucKhachPage />} />
              <Route path="/ma-misa" element={<MaMisaPage />} />
              <Route path="/gia-ban-misa" element={<GiaBanMisaPage />} />
              <Route path="/phu-thu" element={<PhuThuPage />} />
              <Route path="/phan-bo-kh" element={<PhanBoKHPage />} />
              <Route path="/danh-sach-khach" element={<DanhSachKhachPage />} />
              <Route path="/bang-gia-ck" element={<BangGiaCKPage />} />
              
              <Route path="/so-chi-tiet-ban-hang" element={<SoChiTietBanHangPage />} />
              <Route path="/audit-gia-ck" element={<AuditGiaCKPage />} />
              <Route path="/so-doi-chieu" element={<SoDoiChieuPage />} />
              <Route path="/check-chiet-khau" element={<CheckChietKhauPage />} />
              <Route path="/bang-khach-thang" element={<BangKhachThangPage />} />
              <Route path="/don-hang-excel" element={<DonHangExcelPage />} />
              <Route path="/tinh-gia-goc" element={<TinhGiaGocPage />} />
              <Route path="/so-sanh-gia-goc" element={<SoSanhGiaGocPage />} />
              <Route path="/tinh-gia-8-nhom-nho/:slug" element={<TraCuuGiaGocPage />} />

              <Route path="/import-export" element={<ImportExportPage />} />
              <Route path="/phan-quyen" element={<PhanQuyenPage />} />
              <Route path="/bang-gia-cot-go" element={<BangGiaCotGoPage />} />
              <Route path="/bang-gia-new/veneer" element={<BangGiaNewPage />} />
              <Route path="/bang-gia-new/chi" element={<BangGiaNewPage />} />
              <Route path="/bang-gia-new/keo-nong" element={<BangGiaNewPage />} />
              <Route path="/bang-gia-new/acrylic-foil" element={<BangGiaNewPage />} />
              <Route path="/bang-gia-new/van-phu-acrylic" element={<BangGiaNewPage />} />
              <Route path="/bang-gia-new/laminate-one" element={<BangGiaNewPage />} />
              <Route path="/bang-gia-new/nhua-pvc" element={<BangGiaNewPage />} />
              <Route path="/bang-gia-new/pvc-film" element={<BangGiaNewPage />} />
              <Route path="/bang-gia-new/van-phu-pvc" element={<BangGiaNewPage />} />
              <Route path="/bang-gia-new/nhua-phu-mau" element={<BangGiaNewPage />} />
              <Route path="/bang-gia-new/nhua-laminate" element={<BangGiaNewPage />} />
              <Route path="/bang-gia-new/osb-laminate" element={<BangGiaNewPage />} />
              <Route path="/bang-gia-new/mirror" element={<BangGiaNewPage />} />
              <Route path="/bang-gia-nhom-mau" element={<BangGiaNhomMauPage />} />
              <Route path="/bang-gia-ma-mau" element={<BangGiaMaMauPage />} />
              <Route path="/gia-van-tron" element={<GiaVanTronPage />} />
              <Route path="/bang-tinh-gia/:slug" element={<BangTinhGiaPage />} />
              <Route path="/chiet-khau" element={<Navigate to="/check-chiet-khau" replace />} />
              <Route path="/bang-ck-thang" element={<Navigate to="/quan-ly-thang" replace />} />
              <Route path="/quan-ly-thang" element={<QuanLyThangPage />} />
              <Route path="/danh-sach-khach-nhom" element={<DanhSachKhachNhomPage />} />
              <Route path="/log-thay-doi" element={<LogThayDoiPage />} />
              <Route path="/tinh-gia-vdo" element={<TinhGiaVDOPage />} />
              <Route path="/tinh-gia-vmh" element={<TinhGiaVMHPage />} />
              <Route path="/tinh-gia-gg" element={<TinhGiaGGPage />} />
              <Route path="/tinh-gia-ve" element={<TinhGiaVEPage />} />
              <Route path="/tinh-gia-osb" element={<TinhGiaOSBPage />} />
              <Route path="/tinh-gia-dr" element={<TinhGiaDRPage />} />
              <Route path="/tinh-gia-pvc-petg" element={<TinhGiaPvcPetgPage />} />
              <Route path="/tinh-gia-melamine-tonghop" element={<TinhGiaMelamineTonghopPage />} />
              <Route path="/tinh-gia-veneer-mat-phu-khac" element={<TinhGiaVeneerMatPhuKhacPage />} />
              <Route path="/tinh-gia-chi-nep-keo-hat" element={<TinhGiaChiNepKeoHatPage />} />
              <Route path="/tinh-gia-acrylic" element={<TinhGiaAcrylicPage />} />
              <Route path="/tinh-gia-one-laminate" element={<TinhGiaOneLaminatePage />} />
              <Route path="/tinh-gia-mirror" element={<TinhGiaMirrorPage />} />
              <Route path="/gia-goc-tong-hop" element={<GiaGocTongHopPage />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/quan-ly-tai-khoan" element={<QuanLyTaiKhoan />} />
              <Route path="/nhat-ky-thiet-bi" element={<NhatKyThietBi />} />
              <Route path="/kiem-tra-bang-tinh-gia" element={<KiemTraBangTinhGiaPage />} />
            </Route>
          </Routes>
        </Router>
        <UpdatePrompt />
      </LockProvider>
    </AuthProvider>
  )
}

export default App
