import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { colors } from '../theme'
import { useAuth } from '../lib/auth'
import LoginOverlay from './LoginOverlay'

const sidebarW = 252
const sectionIcons: Record<string, string> = { 'Tổng quan': '◈', 'Danh mục': '◈', 'Chiết khấu': '◈', 'Bảng Tính Giá Chi Tiết': '◈', 'Bảng Tính Giá': '◈', 'Dữ liệu': '◈', 'Công cụ': '◈' }

const sidebarStyle: React.CSSProperties = {
  width: sidebarW, background: colors.sidebar, color: '#fff',
  display: 'flex', flexDirection: 'column', position: 'fixed',
  top: 0, left: 0, bottom: 0, overflow: 'hidden', zIndex: 100,
}

const brandStyle: React.CSSProperties = {
  height: 56, padding: '0 16px', display: 'flex', alignItems: 'center',
  gap: 10, borderBottom: `1px solid ${colors.sidebarBorder}`, flexShrink: 0,
}

const brandIcon: React.CSSProperties = {
  width: 28, height: 28, background: colors.primary, borderRadius: 6,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#fff', fontWeight: 700, fontSize: 13,
}

const brandName: React.CSSProperties = {
  fontSize: 15, fontWeight: 600, color: '#fff', letterSpacing: -0.2, whiteSpace: 'nowrap',
}

const navStyle: React.CSSProperties = {
  flex: 1, overflowY: 'auto', padding: '8px 0',
}

const sectionLabel: React.CSSProperties = {
  padding: '16px 20px 4px', fontSize: 10, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: 0.5,
  color: 'rgba(123,143,163,0.5)', display: 'flex', alignItems: 'center', gap: 6,
}

const linkBase: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '6px 20px', fontSize: 13, fontWeight: 400,
  color: colors.sidebarText, textDecoration: 'none',
  borderRadius: 4, marginBottom: 1, minHeight: 32,
  transition: 'background 120ms, color 120ms',
}

const activeStyle: React.CSSProperties = {
  ...linkBase,
  color: '#fff', background: colors.sidebarActive, fontWeight: 500,
}

const iconStyle: React.CSSProperties = {
  width: 18, fontSize: 12, opacity: 0.5, flexShrink: 0, textAlign: 'center' as const,
  color: colors.sidebarText,
}

const contentStyle: React.CSSProperties = {
  marginLeft: sidebarW, flex: 1, background: colors.body,
  minHeight: '100vh',
}

const footerStyle: React.CSSProperties = {
  padding: '12px 16px', borderTop: `1px solid ${colors.sidebarBorder}`,
  fontSize: 11, color: 'rgba(123,143,163,0.4)', flexShrink: 0,
  display: 'flex', flexDirection: 'column', gap: 4,
}

const userBadge: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0',
  fontSize: 12, color: 'rgba(123,143,163,0.7)', cursor: 'pointer',
}

type NavItem = { label: string; path: string; perm?: string }
type NavSubGroup = { label: string; items: NavItem[] }
type NavGroup = { section: string; items?: NavItem[]; subGroups?: NavSubGroup[] }

const subLabel: React.CSSProperties = {
  padding: '8px 20px 2px 30px', fontSize: 10, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: 0.4,
  color: 'rgba(123,143,163,0.35)',
}

export default function Layout() {
  const { user, loading, hasPermission, logout } = useAuth()
  const loc = useLocation()

  if (loading) return null
  if (!user) return <LoginOverlay />

  const navGroups: NavGroup[] = [
    { section: 'Tổng quan', items: [{ label: 'Dashboard', path: '/dashboard', perm: 'menu:/dashboard' }] },
    { section: 'Danh mục', items: [
      { label: 'Mã MISA', path: '/ma-misa', perm: 'menu:/ma-misa' },
      { label: 'Giá bán (MISA)', path: '/gia-ban-misa', perm: 'menu:/gia-ban-misa' },
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
        { label: 'Tính giá Acrylic', path: '/tinh-gia-acrylic', perm: 'menu:/bang-tinh-gia' },
      ]},
      { label: 'Tính Giá ONE LAMINATE', items: [
        { label: 'One Laminate Mã màu', path: '/bang-tinh-gia/one-laminate', perm: 'menu:/bang-tinh-gia' },
        { label: 'Ván nhựa phủ HPL', path: '/bang-tinh-gia/van-nhua-phu-hpl', perm: 'menu:/bang-tinh-gia' },
        { label: 'OSB/Gỗ ghép/Ván ép phủ HPL', path: '/bang-tinh-gia/osb-ghep-ep-phu-hpl', perm: 'menu:/bang-tinh-gia' },
        { label: 'Tính giá One Laminate', path: '/tinh-gia-one-laminate', perm: 'menu:/bang-tinh-gia' },
      ]},
      { label: 'Tính Giá MIRROR', items: [
        { label: 'Mirror', path: '/bang-tinh-gia/mirror', perm: 'menu:/bang-tinh-gia' },
        { label: 'Tính giá Mirror', path: '/tinh-gia-mirror', perm: 'menu:/bang-tinh-gia' },
      ]},
    ]},
    { label: 'Đối chiếu MISA', items: [
      { label: 'Giá gốc tổng hợp', path: '/gia-goc-tong-hop', perm: 'menu:/bang-tinh-gia' },
      { label: 'Kiểm tra Bảng Tính Giá', path: '/kiem-tra-bang-tinh-gia', perm: 'menu:/bang-tinh-gia' },
    ]},
    { section: 'Chiết khấu', items: [
      { label: 'Bảng giá CK', path: '/bang-gia-ck', perm: 'menu:/bang-gia-ck' },
      { label: 'Phân bổ KH', path: '/phan-bo-kh', perm: 'menu:/phan-bo-kh' },
    ]},
    { section: 'Dữ liệu', items: [
      { label: 'So sánh giá gốc', path: '/so-sanh-gia-goc', perm: 'menu:/so-sanh-gia-goc' },
      { label: 'Sổ chi tiết bán hàng', path: '/so-chi-tiet-ban-hang', perm: 'menu:/so-chi-tiet-ban-hang' },
      { label: 'Đơn hàng', path: '/don-hang-excel', perm: 'menu:/don-hang-excel' },
    ]},
    { section: 'Tính Tồn Kho', items: [
      { label: 'Tính tồn kho', path: '/tinh-ton-kho', perm: 'menu:/tinh-ton-kho' },
    ]},
    { section: 'Công cụ', items: [
      { label: 'Tính giá/CK', path: '/tinh-gia', perm: 'menu:/tinh-gia' },
      { label: 'Tính giá gốc', path: '/tinh-gia-goc', perm: 'menu:/tinh-gia-goc' },
      { label: 'Quản lý tháng', path: '/quan-ly-thang', perm: 'menu:/quan-ly-thang' },
      { label: 'Import/Export', path: '/import-export', perm: 'menu:/import-export' },
      { label: 'Phụ thu', path: '/phu-thu', perm: 'menu:/phu-thu' },
      { label: 'Audit CK', path: '/audit', perm: 'menu:/audit' },
      { label: 'Phân quyền', path: '/phan-quyen', perm: 'menu:/phan-quyen' },
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
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={sidebarStyle}>
        <div style={brandStyle}>
          <div style={brandIcon}>G</div>
          <div style={brandName}>Admin Dashboard</div>
        </div>
        <div style={navStyle}>
          {navGroups.map((group) => {
            const visibleSubGroups = group.subGroups?.filter(hasAnyInSubGroup)
            const visibleItems = group.items?.filter(i => hasPermission(i.perm!))
            if ((!group.subGroups && (!visibleItems || visibleItems.length === 0)) ||
                (group.subGroups && (!visibleSubGroups || visibleSubGroups.length === 0))) {
              return null
            }
            return (
              <div key={group.section}>
                <div style={sectionLabel}>
                  <span style={{ fontSize: 10, opacity: 0.5, fontFamily: 'monospace' }}>{sectionIcons[group.section]}</span>
                  {group.section}
                </div>
                {group.subGroups ? visibleSubGroups!.map((sg) => (
                  <div key={sg.label}>
                    <div style={subLabel}>{sg.label}</div>
                    {sg.items.filter(i => hasPermission(i.perm!)).map((item) => (
                      <NavLink key={item.path} to={item.path} end={item.path === '/'} style={({ isActive }) => isActive ? activeStyle : linkBase}>
                        <span style={iconStyle}>▹</span>
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )) : visibleItems!.map((item) => (
                  <NavLink key={item.path} to={item.path} end={item.path === '/'} style={({ isActive }) => isActive ? activeStyle : linkBase}>
                    <span style={iconStyle}>▹</span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )
          })}
        </div>
        <div style={footerStyle}>
          <div style={userBadge} onClick={logout} title="Click to logout">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.primary, display: 'inline-block' }} />
            {user.ten} {user.is_admin ? '(Admin)' : ''}
          </div>
          <div>v0.2.0</div>
        </div>
      </nav>
      <main className="main-content" style={contentStyle}>
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