import { HashRouter, BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './modules/Dashboard'
import Welcome from './modules/Welcome'
import DanhMucKhachPage from './modules/DanhMucKhach'
import MaMisaPage from './modules/MaMisa'
import PhuThuPage from './modules/PhuThu'
import PhanBoKHPage from './modules/PhanBoKH'
import BangGiaCKPage from './modules/BangGiaCK'
import SoChiTietBanHangPage from './modules/SoChiTietBanHang'
import DonHangExcelPage from './modules/DonHangExcel'
import TinhGiaPage from './modules/TinhGia'
import ImportExportPage from './modules/ImportExport'
import TinhGiaGocPage from './modules/TinhGiaGoc'
import SoSanhGiaGocPage from './modules/SoSanhGiaGoc'
import TraCuuGiaGocPage from './modules/TraCuuGiaGoc'

import BangGiaCotGoPage from './modules/BangGiaCotGo'
import BangGiaNhomMauPage from './modules/BangGiaNhomMau'
import BangGiaMaMauPage from './modules/BangGiaMaMau'
import BangGiaNewPage from './modules/BangGiaNew'
import AuditPage from './modules/Audit'
import QuanLyThangPage from './modules/QuanLyThang'
import GiaVanTronPage from './modules/GiaVanTron'
import GiaBanMisaPage from './modules/GiaBanMisa'
import PhanQuyenPage from './modules/PhanQuyen'
import TinhTonKhoPage from './modules/TinhTonKho'
import BangTinhGiaPage from './modules/BangTinhGia'
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
import { AuthProvider } from './lib/auth'

const isElectron = navigator.userAgent.includes('Electron')
const Router = isElectron ? HashRouter : BrowserRouter

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Welcome />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/khach-hang" element={<DanhMucKhachPage />} />
            <Route path="/ma-misa" element={<MaMisaPage />} />
            <Route path="/gia-ban-misa" element={<GiaBanMisaPage />} />
            <Route path="/phu-thu" element={<PhuThuPage />} />
            <Route path="/phan-bo-kh" element={<PhanBoKHPage />} />
            <Route path="/bang-gia-ck" element={<BangGiaCKPage />} />
            
            <Route path="/so-chi-tiet-ban-hang" element={<SoChiTietBanHangPage />} />
            <Route path="/don-hang-excel" element={<DonHangExcelPage />} />
            <Route path="/tinh-gia" element={<TinhGiaPage />} />
            <Route path="/tinh-gia-goc" element={<TinhGiaGocPage />} />
            <Route path="/so-sanh-gia-goc" element={<SoSanhGiaGocPage />} />
            <Route path="/tinh-gia-8-nhom-nho/:slug" element={<TraCuuGiaGocPage />} />

            <Route path="/import-export" element={<ImportExportPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/quan-ly-thang" element={<QuanLyThangPage />} />
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
            <Route path="/tinh-ton-kho" element={<TinhTonKhoPage />} />
            <Route path="/bang-tinh-gia/:slug" element={<BangTinhGiaPage />} />
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
            <Route path="/kiem-tra-bang-tinh-gia" element={<KiemTraBangTinhGiaPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
