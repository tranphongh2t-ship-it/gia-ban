import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { colors } from '../theme'
import { useAuth } from '../lib/auth'
import { isOnline, isLocalReady, isTauriApp, checkLocalDataReady } from '../lib/api'
import LoginOverlay from './LoginOverlay'
import BangGiaLockToggle from './BangGiaLockToggle'

const sidebarW = 260
const sidebarWCollapsed = 58
const sectionColors: Record<string, string> = {
  'Check Giá Gốc': '#1ABB9C',
  'Tổng quan': '#4299e1',
  'Danh mục': '#2fb344',
  'Bảng Tính Giá Chi Tiết': '#f59f00',
  'Bảng Tính Giá': '#ae3ec9',
  'Đối chiếu MISA': '#17a2b8',
  'Chiết khấu': '#d6336c',
  'Dữ liệu': '#4263eb',
  'Công cụ': '#f76707',
}

const PATH_ICONS: Record<string, string> = {
  '/check-gia-goc': '⌕', '/dashboard': '⌂',
  '/ma-misa': '☰', '/gia-ban-misa': '₫',
  '/gia-van-tron': '▤', '/bang-gia-cot-go': '▦',
  '/bang-gia-nhom-mau': '◐', '/bang-gia-ma-mau': '●',
  '/tinh-gia-8-nhom-nho/veneer': '▥', '/tinh-gia-8-nhom-nho/chi': '❘',
  '/tinh-gia-8-nhom-nho/keo-nong': '✦', '/tinh-gia-8-nhom-nho/van-phu-acrylic': '✧',
  '/tinh-gia-8-nhom-nho/van-phu-pvc': '▣', '/tinh-gia-8-nhom-nho/nhua-phu-mau': '▧',
  '/tinh-gia-8-nhom-nho/nhua-laminate': '▩',
  '/bang-tinh-gia/osb': '▧', '/tinh-gia-osb': '⌬',
  '/bang-tinh-gia/pvc-film-dura': '▣', '/bang-tinh-gia/van-phu-pvc-petg': '▭', '/tinh-gia-pvc-petg': '⌬',
  '/bang-tinh-gia/durabo': '▢', '/tinh-gia-dr': '⌬',
  '/bang-tinh-gia/mau-melamine-2': '◧', '/bang-tinh-gia/melamine-plywood': '◨',
  '/bang-tinh-gia/melamine-nhua-osb-ghep': '◫', '/tinh-gia-melamine-tonghop': '⌬',
  '/bang-tinh-gia/van-ep': '▭', '/bang-tinh-gia/van-ep-khac': '▯', '/tinh-gia-ve': '⌬',
  '/bang-tinh-gia/go-ghep': '▯', '/bang-tinh-gia/phu-veneer': '▰', '/tinh-gia-gg': '⌬',
  '/bang-tinh-gia/van-dam-okal': '▬', '/bang-tinh-gia/van-mdf-hdf': '▬',
  '/bang-tinh-gia/phu-thu-melamine': '⊕', '/bang-tinh-gia/mau-melamine': '◍',
  '/bang-tinh-gia/98-mau-melamine': '◔', '/tinh-gia-vdo': '⌬', '/tinh-gia-vmh': '⌬',
  '/bang-tinh-gia/veneer': '▥', '/bang-tinh-gia/mat-phu-khac': '◪',
  '/tinh-gia-veneer-mat-phu-khac': '⌬',
  '/bang-tinh-gia/chi-nep': '─', '/bang-tinh-gia/keo-hat': '●',
  '/tinh-gia-chi-nep-keo-hat': '⌬',
  '/bang-tinh-gia/acrylic': '✧', '/bang-tinh-gia/van-phu-acrylic': '✦', '/tinh-gia-acrylic': '⌬',
  '/bang-tinh-gia/one-laminate': '▩', '/bang-tinh-gia/van-nhua-phu-hpl': '▨',
  '/bang-tinh-gia/osb-ghep-ep-phu-hpl': '▦', '/tinh-gia-one-laminate': '⌬',
  '/bang-tinh-gia/mirror': '◮', '/tinh-gia-mirror': '⌬',
  '/gia-goc-tong-hop': '⇆', '/kiem-tra-bang-tinh-gia': '⇄',
  '/bang-gia-ck': '⌗', '/phan-bo-kh': '⇋', '/danh-sach-khach': '☰',
  '/so-sanh-gia-goc': '⇵', '/so-chi-tiet-ban-hang': '▤', '/audit-gia-ck': '☑', '/so-doi-chieu': '☑', '/check-chiet-khau': '☑', '/bang-khach-thang': '☑', '/don-hang-excel': '▣',
  '/tinh-gia-goc': '¤',
  '/import-export': '⇅', '/phu-thu': '⊕',   '/phan-quyen': '☷', '/quan-ly-tai-khoan': '☰', '/nhat-ky-thiet-bi': '▤',
  '/chiet-khau': '⌗', '/bang-ck-thang': '▤', '/quan-ly-thang': '◫', '/danh-sach-khach-nhom': '☰', '/log-thay-doi': '▤',
}

const getIcon = (path: string): string => {
  if (PATH_ICONS[path]) return PATH_ICONS[path]
  if (path.startsWith('/tinh-gia-8-nhom-nho/')) return '▸'
  if (path.startsWith('/bang-tinh-gia/')) return '▸'
  return '▸'
}

const sidebarStyle: React.CSSProperties = {
  width: sidebarW, background: colors.sidebar, color: '#fff',
  display: 'flex', flexDirection: 'column', position: 'fixed',
  top: 0, left: 0, bottom: 0, overflow: 'hidden', zIndex: 100,
  borderRight: `1px solid ${colors.sidebarBorder}`,
}

const brandStyle: React.CSSProperties = {
  height: 58, padding: '0 18px', display: 'flex', alignItems: 'center',
  gap: 10, borderBottom: `1px solid ${colors.sidebarBorder}`, flexShrink: 0,
  position: 'relative',
}

const brandIcon: React.CSSProperties = {
  width: 30, height: 30, background: `linear-gradient(135deg, ${colors.primary}, #0d6a5c)`,
  borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#fff', fontWeight: 800, fontSize: 15, boxShadow: '0 2px 8px rgba(26,187,156,0.35)',
}

const brandName: React.CSSProperties = {
  fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: -0.2, whiteSpace: 'nowrap',
}

const brandSub: React.CSSProperties = {
  fontSize: 10, color: 'rgba(123,143,163,0.6)', letterSpacing: 0.5, whiteSpace: 'nowrap',
}

const navStyle: React.CSSProperties = {
  flex: 1, overflowY: 'auto', padding: '6px 0',
}

const sectionLabel: React.CSSProperties = {
  padding: '18px 20px 6px', fontSize: 12.5, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: 0.8,
  color: 'rgba(190,202,216,0.85)', display: 'flex', alignItems: 'center', gap: 8,
}

const sectionDot: React.CSSProperties = {
  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
}

const linkBase: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '5px 14px', fontSize: 13, fontWeight: 400,
  color: colors.sidebarText, textDecoration: 'none',
  borderRadius: 6, margin: '1px 8px', minHeight: 34,
  transition: 'background 120ms, color 120ms, transform 120ms',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
}

const linkBaseCollapsed: React.CSSProperties = {
  ...linkBase,
  padding: '5px 0', margin: '1px 8px', justifyContent: 'center',
}

const activeStyle: React.CSSProperties = {
  ...linkBase,
  color: '#fff', background: colors.sidebarActive, fontWeight: 600,
}

const activeStyleCollapsed: React.CSSProperties = {
  ...linkBaseCollapsed,
  color: '#fff', background: colors.sidebarActive, fontWeight: 600,
}

const iconStyle: React.CSSProperties = {
  width: 22, height: 22, fontSize: 12, flexShrink: 0, textAlign: 'center' as const,
  lineHeight: '22px', borderRadius: 5,
  background: 'rgba(255,255,255,0.05)',
  color: colors.sidebarText,
}

const iconActiveStyle: React.CSSProperties = {
  ...iconStyle,
  background: colors.primaryLight,
  color: colors.primary,
}

const contentStyle: React.CSSProperties = {
  marginLeft: sidebarW, flex: 1, background: colors.body,
  minHeight: '100vh', minWidth: 0,
}

const footerStyle: React.CSSProperties = {
  padding: '14px 16px', borderTop: `1px solid ${colors.sidebarBorder}`,
  fontSize: 11, color: 'rgba(123,143,163,0.45)', flexShrink: 0,
  display: 'flex', flexDirection: 'column', gap: 4,
}

const userBadge: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
  fontSize: 12, color: 'rgba(123,143,163,0.85)', cursor: 'pointer',
  borderRadius: 6, transition: 'background 120ms',
}

const userAvatar: React.CSSProperties = {
  width: 24, height: 24, borderRadius: '50%', background: colors.primary,
  color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex',
  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}

type NavItem = { label: string; path: string; perm?: string }
type NavSubGroup = { label: string; items: NavItem[] }
type NavGroup = { section: string; items?: NavItem[]; subGroups?: NavSubGroup[] }

const subLabel: React.CSSProperties = {
  padding: '10px 20px 2px 26px', fontSize: 10.5, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: 0.5,
  color: 'rgba(123,143,163,0.45)',
}

export default function Layout() {
  const { user, loading, hasPermission, logout } = useAuth()
  const loc = useLocation()
  const nav = useNavigate()

  const [collapsed, setCollapsed] = useState(false)
  const [localDataInfo, setLocalDataInfo] = useState<{ ready: boolean; total: number }>({ ready: true, total: 0 })
  useEffect(() => {
    try {
      const v = localStorage.getItem('tt_sidebar_collapsed')
      if (v) setCollapsed(v === '1')
    } catch { /* ignore */ }
  }, [])
  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem('tt_sidebar_collapsed', next ? '1' : '0') } catch { /* ignore */ }
      return next
    })
  }

  // Check local data readiness when offline
  useEffect(() => {
    if (isTauriApp()) {
      checkLocalDataReady().then(r => {
        setLocalDataInfo({ ready: r.ready, total: Object.values(r.details).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0) })
      }).catch(() => {})
    }
  }, [])

  const curSidebarW = collapsed ? sidebarWCollapsed : sidebarW

  if (loading) return null
  if (!user) return <LoginOverlay />

  const navGroups: NavGroup[] = [
    { section: 'Tổng quan', items: [
      { label: 'Dashboard', path: '/dashboard', perm: 'menu:/dashboard' },
      { label: 'Sổ đối chiếu Giá Gốc - CK - VAT', path: '/so-doi-chieu', perm: 'menu:/so-doi-chieu' },
    ]},
    { section: 'Danh mục', items: [
      { label: 'Mã MISA', path: '/ma-misa', perm: 'menu:/ma-misa' },
      { label: 'Giá bán (MISA)', path: '/gia-ban-misa', perm: 'menu:/gia-ban-misa' },
    ]},
    { section: 'Check Giá Gốc', items: [
      { label: 'Check Giá Gốc', path: '/check-gia-goc', perm: 'menu:/check-gia-goc' },
      { label: 'Máy tính giá', path: '/tinh-gia-goc', perm: 'menu:/tinh-gia-goc' },
      { label: 'Audit Giá Gốc', path: '/audit-gia-ck', perm: 'menu:/audit-gia-ck' },
    ]},
    { section: 'Chiết khấu', items: [
      { label: 'Audit Chiết Khấu', path: '/check-chiet-khau', perm: 'menu:/check-chiet-khau' },
      { label: 'Khách hàng theo tháng (minmap)', path: '/bang-khach-thang', perm: 'menu:/bang-khach-thang' },
      { label: 'Tạo tháng & Bảng CK (OP1/OP2)', path: '/quan-ly-thang', perm: 'menu:/quan-ly-thang' },
      { label: 'Nền 5 nhóm khách', path: '/danh-sach-khach-nhom', perm: 'menu:/danh-sach-khach-nhom' },
    ]},
    { section: 'Bảng Tính Giá', subGroups: [
      { label: 'Tính Giá OSB', items: [
        { label: 'OSB', path: '/bang-tinh-gia/osb', perm: 'menu:/bang-tinh-gia' },
        { label: 'Giá gốc OSB', path: '/tinh-gia-osb', perm: 'menu:/bang-tinh-gia' },
      ]},
      { label: 'Tính Giá Ván Phủ PVC FILM - PETG', items: [
        { label: 'PVC FILM - DURA+', path: '/bang-tinh-gia/pvc-film-dura', perm: 'menu:/bang-tinh-gia' },
        { label: 'VÁN PHỦ PVC FILM - PETG', path: '/bang-tinh-gia/van-phu-pvc-petg', perm: 'menu:/bang-tinh-gia' },
        { label: 'Giá gốc PVC FILM - PETG', path: '/tinh-gia-pvc-petg', perm: 'menu:/bang-tinh-gia' },
      ]},
      { label: 'Tính Giá Ván Nhựa DURABO', items: [
        { label: 'Ván nhựa DURABO', path: '/bang-tinh-gia/durabo', perm: 'menu:/bang-tinh-gia' },
        { label: 'Giá gốc Ván nhựa DURABO', path: '/tinh-gia-dr', perm: 'menu:/bang-tinh-gia' },
      ]},
      { label: 'Tính Giá VÁN NHỰA- PLYWOOD-OSB- GỖ GHÉP', items: [
        { label: 'Bảng màu Melamine (mới)', path: '/bang-tinh-gia/mau-melamine-2', perm: 'menu:/bang-tinh-gia' },
        { label: 'Melamine Plywood', path: '/bang-tinh-gia/melamine-plywood', perm: 'menu:/bang-tinh-gia' },
        { label: 'Ván nhựa/OSB/Gỗ ghép phủ Melamine', path: '/bang-tinh-gia/melamine-nhua-osb-ghep', perm: 'menu:/bang-tinh-gia' },
        { label: 'Giá gốc Melamine tổng hợp', path: '/tinh-gia-melamine-tonghop', perm: 'menu:/bang-tinh-gia' },
      ]},
      { label: 'Tính Giá Ván Ép', items: [
        { label: 'Ván Ép Thanh Thùy', path: '/bang-tinh-gia/van-ep', perm: 'menu:/bang-tinh-gia' },
        { label: 'Ván Ép Khác', path: '/bang-tinh-gia/van-ep-khac', perm: 'menu:/bang-tinh-gia' },
        { label: 'Giá gốc Ván Ép', path: '/tinh-gia-ve', perm: 'menu:/bang-tinh-gia' },
      ]},
      { label: 'Tính Giá Gỗ Ghép', items: [
        { label: 'Gỗ Trơn', path: '/bang-tinh-gia/go-ghep', perm: 'menu:/bang-tinh-gia' },
        { label: 'Phủ Veneer', path: '/bang-tinh-gia/phu-veneer', perm: 'menu:/bang-tinh-gia' },
        { label: 'Giá gốc Gỗ Ghép', path: '/tinh-gia-gg', perm: 'menu:/bang-tinh-gia' },
      ]},
      { label: 'Tính Giá Ván Trơn', items: [
        { label: 'VÁN DĂM OKAL', path: '/bang-tinh-gia/van-dam-okal', perm: 'menu:/bang-tinh-gia' },
        { label: 'VÁN MDF HDF', path: '/bang-tinh-gia/van-mdf-hdf', perm: 'menu:/bang-tinh-gia' },
        { label: 'Phụ thu Melamine', path: '/bang-tinh-gia/phu-thu-melamine', perm: 'menu:/bang-tinh-gia' },
        { label: 'Nhóm màu Melamine 220', path: '/bang-tinh-gia/mau-melamine', perm: 'menu:/bang-tinh-gia' },
        { label: '98 Màu Melamine', path: '/bang-tinh-gia/98-mau-melamine', perm: 'menu:/bang-tinh-gia' },
        { label: 'Giá gốc VÁN DĂM OKAL', path: '/tinh-gia-vdo', perm: 'menu:/bang-tinh-gia' },
        { label: 'Giá gốc VÁN MDF HDF', path: '/tinh-gia-vmh', perm: 'menu:/bang-tinh-gia' },
      ]},
      { label: 'Tính Giá VENEER & MẶT PHỦ KHÁC', items: [
        { label: 'VENEER', path: '/bang-tinh-gia/veneer', perm: 'menu:/bang-tinh-gia' },
        { label: 'Mặt phủ khác', path: '/bang-tinh-gia/mat-phu-khac', perm: 'menu:/bang-tinh-gia' },
        { label: 'Giá gốc VENEER & Mặt phủ khác', path: '/tinh-gia-veneer-mat-phu-khac', perm: 'menu:/bang-tinh-gia' },
      ]},
      { label: 'Tính Giá CHỈ NẸP & KEO HẠT', items: [
        { label: 'Chỉ Nẹp', path: '/bang-tinh-gia/chi-nep', perm: 'menu:/bang-tinh-gia' },
        { label: 'Keo Hạt', path: '/bang-tinh-gia/keo-hat', perm: 'menu:/bang-tinh-gia' },
        { label: 'Giá gốc CHỈ NẸP & KEO HẠT', path: '/tinh-gia-chi-nep-keo-hat', perm: 'menu:/bang-tinh-gia' },
      ]},
      { label: 'Tính Giá VÁN NHỰA-MDF MR PHỦ ACRYLIC', items: [
        { label: 'Acrylic Mã màu', path: '/bang-tinh-gia/acrylic', perm: 'menu:/bang-tinh-gia' },
        { label: 'Ván phủ Acrylic', path: '/bang-tinh-gia/van-phu-acrylic', perm: 'menu:/bang-tinh-gia' },
        { label: 'Tính giá gốc Acrylic', path: '/tinh-gia-acrylic', perm: 'menu:/bang-tinh-gia' },
      ]},
      { label: 'Tính Giá ONE LAMINATE', items: [
        { label: 'One Laminate Mã màu', path: '/bang-tinh-gia/one-laminate', perm: 'menu:/bang-tinh-gia' },
        { label: 'Ván nhựa phủ HPL', path: '/bang-tinh-gia/van-nhua-phu-hpl', perm: 'menu:/bang-tinh-gia' },
        { label: 'OSB/Gỗ ghép/Ván ép phủ HPL', path: '/bang-tinh-gia/osb-ghep-ep-phu-hpl', perm: 'menu:/bang-tinh-gia' },
        { label: 'Tính giá gốc One Laminate', path: '/tinh-gia-one-laminate', perm: 'menu:/bang-tinh-gia' },
      ]},
      { label: 'Tính Giá MIRROR', items: [
        { label: 'Mirror', path: '/bang-tinh-gia/mirror', perm: 'menu:/bang-tinh-gia' },
        { label: 'Tính giá gốc Mirror', path: '/tinh-gia-mirror', perm: 'menu:/bang-tinh-gia' },
      ]},
    ]},
    { section: 'Bảng Tính Giá Chi Tiết', subGroups: [
      { label: 'Tính Giá Ván Phủ', items: [
        { label: 'Giá Ván Trơn', path: '/gia-van-tron', perm: 'menu:/gia-van-tron' },
        { label: 'Cốt gỗ', path: '/bang-gia-cot-go', perm: 'menu:/bang-gia-cot-go' },
        { label: 'Nhóm màu', path: '/bang-gia-nhom-mau', perm: 'menu:/bang-gia-nhom-mau' },
        { label: 'Mã màu', path: '/bang-gia-ma-mau', perm: 'menu:/bang-gia-ma-mau' },
      ]},
      { label: 'Tính Giá 8 Nhóm Nhỏ', items: [
        { label: 'Veneer', path: '/tinh-gia-8-nhom-nho/veneer', perm: 'menu:/veneer' },
        { label: 'Chỉ', path: '/tinh-gia-8-nhom-nho/chi', perm: 'menu:/chi' },
        { label: 'Keo dán chỉ', path: '/tinh-gia-8-nhom-nho/keo-nong', perm: 'menu:/keo-nong' },
        { label: 'Ván phủ Acrylic', path: '/tinh-gia-8-nhom-nho/van-phu-acrylic', perm: 'menu:/van-phu-acrylic' },
        { label: 'Ván phủ PVC', path: '/tinh-gia-8-nhom-nho/van-phu-pvc', perm: 'menu:/van-phu-pvc' },
        { label: 'Ván phủ Melamine', path: '/tinh-gia-8-nhom-nho/nhua-phu-mau', perm: 'menu:/nhua-phu-mau' },
        { label: 'Ván phủ Laminate', path: '/tinh-gia-8-nhom-nho/nhua-laminate', perm: 'menu:/nhua-laminate' },

      ]},
    ]},

    { section: 'Đối chiếu MISA', items: [
      { label: 'Giá gốc tổng hợp', path: '/gia-goc-tong-hop', perm: 'menu:/gia-goc-tong-hop' },
      { label: 'Kiểm tra Bảng Tính Giá', path: '/kiem-tra-bang-tinh-gia', perm: 'menu:/kiem-tra-bang-tinh-gia' },
    ]},
    { section: 'Chiết khấu', items: [
      { label: 'Bảng giá CK', path: '/bang-gia-ck', perm: 'menu:/bang-gia-ck' },
      { label: 'Phân bổ KH', path: '/phan-bo-kh', perm: 'menu:/phan-bo-kh' },
      { label: 'Danh sách KH', path: '/danh-sach-khach', perm: 'menu:/danh-sach-khach' },
    ]},
    { section: 'Dữ liệu', items: [
      { label: 'So sánh giá gốc', path: '/so-sanh-gia-goc', perm: 'menu:/so-sanh-gia-goc' },
      { label: 'Sổ chi tiết bán hàng', path: '/so-chi-tiet-ban-hang', perm: 'menu:/so-chi-tiet-ban-hang' },
      { label: 'Đơn hàng', path: '/don-hang-excel', perm: 'menu:/don-hang-excel' },
    ]},
    { section: 'Công cụ', items: [
      { label: 'Import/Export', path: '/import-export', perm: 'menu:/import-export' },
      { label: 'Phụ thu', path: '/phu-thu', perm: 'menu:/phu-thu' },
      { label: 'Phân quyền', path: '/phan-quyen', perm: 'menu:/phan-quyen' },
      { label: 'Quản lý tài khoản', path: '/quan-ly-tai-khoan', perm: 'menu:/quan-ly-tai-khoan' },
      { label: 'Nhật ký thiết bị', path: '/nhat-ky-thiet-bi', perm: 'menu:/nhat-ky-thiet-bi' },
      { label: 'Log lịch sử thay đổi', path: '/log-thay-doi', perm: 'menu:/log-thay-doi' },
    ]},
  ]

  const hasAnyInSection = (items: NavItem[]) => items.some(i => hasPermission(i.perm!))
  const hasAnyInSubGroup = (sg: NavSubGroup) => sg.items.some(i => hasPermission(i.perm!))

  // Build path → perm map
  const allNavItems: NavItem[] = []
  navGroups.forEach(g => {
    g.items?.forEach(i => allNavItems.push(i))
    g.subGroups?.forEach(sg => sg.items.forEach(i => allNavItems.push(i)))
  })
  const pathPermMap = Object.fromEntries(allNavItems.map(i => [i.path, i.perm!]))
  // Also handle /tinh-gia-8-nhom-nho/:slug → extract the slug part
  const currentPath = loc.pathname
  let currentPerm = pathPermMap[currentPath]
  // Dynamic route: /tinh-gia-8-nhom-nho/veneer → strip prefix
  if (!currentPerm && currentPath.startsWith('/tinh-gia-8-nhom-nho/')) {
    const slug = currentPath.replace('/tinh-gia-8-nhom-nho/', '')
    currentPerm = `menu:/${slug}`
  }
  // Dynamic route: /bang-tinh-gia/van-dam-okal → use parent perm
  if (!currentPerm && currentPath.startsWith('/bang-tinh-gia/')) {
    currentPerm = 'menu:/bang-tinh-gia'
  }
  if (!currentPerm && (currentPath === '/tinh-gia-vdo' || currentPath === '/tinh-gia-vmh' || currentPath === '/tinh-gia-dr' || currentPath === '/tinh-gia-pvc-petg' || currentPath === '/tinh-gia-melamine-tonghop' || currentPath === '/tinh-gia-veneer-mat-phu-khac' || currentPath === '/tinh-gia-chi-nep-keo-hat' || currentPath === '/tinh-gia-acrylic' || currentPath === '/tinh-gia-one-laminate' || currentPath === '/tinh-gia-mirror')) {
    currentPerm = 'menu:/bang-tinh-gia'
  }
  const canAccess = !currentPerm || hasPermission(currentPerm)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      <nav style={{ ...sidebarStyle, width: curSidebarW, transition: 'width 160ms ease' }}>
        <div style={{ ...brandStyle, padding: collapsed ? '0 8px' : '0 18px', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <div style={brandIcon}>
            <img src="/logo.svg" alt="logo" style={{ width: 30, height: 30, borderRadius: 8 }} />
          </div>
          {!collapsed && (
            <div>
              <div style={brandName}>THANH THUY PRICE</div>
              <div style={brandSub}>HỆ THỐNG GIÁ</div>
            </div>
          )}
        </div>
        <div style={navStyle}>
          {navGroups.map((group) => {
            const visibleSubGroups = group.subGroups?.filter(hasAnyInSubGroup)
            const visibleItems = group.items?.filter(i => hasPermission(i.perm!))
            if ((!group.subGroups && (!visibleItems || visibleItems.length === 0)) ||
                (group.subGroups && (!visibleSubGroups || visibleSubGroups.length === 0))) {
              return null
            }
            const secColor = sectionColors[group.section] || colors.primary
            return (
              <div key={group.section}>
                <div style={{ ...sectionLabel, padding: collapsed ? '14px 0 6px' : '18px 20px 6px', justifyContent: collapsed ? 'center' : 'flex-start' }}>
                  <span style={{ ...sectionDot, background: secColor, boxShadow: `0 0 6px ${secColor}` }} />
                  {!collapsed && group.section}
                </div>
                {group.subGroups ? visibleSubGroups!.map((sg) => (
                  <div key={sg.label}>
                    {!collapsed && <div style={subLabel}>{sg.label}</div>}
                    {sg.items.filter(i => hasPermission(i.perm!)).map((item) => (
                      <NavLink key={item.path} to={item.path} end={item.path === '/'}
                        title={collapsed ? item.label : undefined}
                        style={({ isActive }) => collapsed ? (isActive ? activeStyleCollapsed : linkBaseCollapsed) : (isActive ? activeStyle : linkBase)}>
                        {({ isActive }) => (
                          <>
                            <span style={isActive ? iconActiveStyle : iconStyle}>{getIcon(item.path)}</span>
                            {!collapsed && item.label}
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )) : visibleItems!.map((item) => (
                  <NavLink key={item.path} to={item.path} end={item.path === '/'}
                    title={collapsed ? item.label : undefined}
                    style={({ isActive }) => collapsed ? (isActive ? activeStyleCollapsed : linkBaseCollapsed) : (isActive ? activeStyle : linkBase)}>
                    {({ isActive }) => (
                      <>
                        <span style={isActive ? iconActiveStyle : iconStyle}>{getIcon(item.path)}</span>
                        {!collapsed && item.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            )
          })}
        </div>
        <div style={{ ...footerStyle, alignItems: collapsed ? 'center' : 'stretch' }}>
          <div style={{ ...userBadge, justifyContent: collapsed ? 'center' : 'flex-start' }} onClick={() => nav('/profile')} title="Quản lý tài khoản">
            <span style={userAvatar}>{(user.ten || '?').slice(0, 1).toUpperCase()}</span>
            {!collapsed && (
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.ten} {user.is_admin ? <span style={{ color: colors.primary, fontWeight: 600 }}>· Admin</span> : ''}
              </span>
            )}
            {!collapsed && (
              <span onClick={e => { e.stopPropagation(); logout() }} title="Đăng xuất"
                style={{ cursor: 'pointer', fontSize: 16, color: '#999', padding: '2px 4px', borderRadius: 4 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                onMouseLeave={e => (e.currentTarget.style.color = '#999')}>
                ⏻
              </span>
            )}
          </div>
          {!collapsed && <div>v0.4.7</div>}
        </div>
      </nav>
      <button onClick={toggleCollapsed} title={collapsed ? 'Xổ menu ra (mở rộng)' : 'Thu menu vào (gọn)'}
        style={{
          position: 'absolute',
          left: collapsed ? curSidebarW - 2 : curSidebarW - 16,
          top: 16, width: 28, height: 28,
          border: 'none', background: collapsed ? colors.sidebar : 'transparent', cursor: 'pointer',
          color: '#ffd60a', fontSize: 22, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 105, transition: 'left 160ms ease', borderRadius: 6,
        }}>{collapsed ? '⮞' : '⮜'}</button>
      <main className="main-content" style={{ ...contentStyle, marginLeft: curSidebarW, transition: 'margin-left 160ms ease' }}>
        {isTauriApp() && !isOnline() && (
          <div style={{ padding: '6px 20px', background: localDataInfo.ready ? 'rgba(245,159,0,0.15)' : 'rgba(220,53,69,0.15)', borderBottom: `1px solid ${localDataInfo.ready ? colors.warning : colors.danger}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: localDataInfo.ready ? colors.warning : colors.danger, fontWeight: 600 }}>
              {localDataInfo.ready ? '⚡ Mất kết nối internet - Đang dùng dữ liệu ngoại tuyến' : '⚠ Chưa có dữ liệu tham chiếu offline - Cần kết nối internet 1 lần để tải dữ liệu'}
            </span>
            {localDataInfo.ready && localDataInfo.total > 0 && <span style={{ fontSize: 11, color: colors.textMuted }}>({localDataInfo.total} dòng dữ liệu nền)</span>}
          </div>
        )}
        {currentPerm === 'menu:/bang-tinh-gia' && (
          <div style={{ padding: '10px 20px', background: colors.card, borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 12.5, color: colors.textSecondary }}>Công tắc an toàn Bảng Tính Giá (12 nhóm)</span>
            <BangGiaLockToggle />
          </div>
        )}
        {canAccess ? <Outlet /> : (
          <div style={{ textAlign: 'center', padding: 80, color: colors.textMuted }}>
            <div style={{ fontSize: 48, opacity: 0.2, marginBottom: 16 }}>🔒</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: '0 0 8px' }}>Không có quyền truy cập</p>
            <p style={{ fontSize: 13, margin: 0 }}>Bạn không được phân quyền xem trang này.</p>
          </div>
        )}
      </main>
    </div>
  )
}