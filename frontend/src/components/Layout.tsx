import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { colors } from '../theme'
import { useAuth } from '../lib/auth'
import LoginOverlay from './LoginOverlay'

const sidebarW = 252
const sectionIcons: Record<string, string> = { 'Tổng quan': '◈', 'Danh mục': '◈', 'Chiết khấu': '◈', 'Bảng Tính Giá Chi Tiết': '◈', 'Dữ liệu': '◈', 'Công cụ': '◈' }

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
        { label: 'Keo nóng', path: '/tinh-gia-8-nhom-nho/keo-nong', perm: 'menu:/keo-nong' },
        { label: 'Ván phủ Acrylic', path: '/tinh-gia-8-nhom-nho/van-phu-acrylic', perm: 'menu:/van-phu-acrylic' },
        { label: 'Ván phủ PVC', path: '/tinh-gia-8-nhom-nho/van-phu-pvc', perm: 'menu:/van-phu-pvc' },
        { label: 'Nhựa phủ màu', path: '/tinh-gia-8-nhom-nho/nhua-phu-mau', perm: 'menu:/nhua-phu-mau' },
        { label: 'Nhựa Laminate', path: '/tinh-gia-8-nhom-nho/nhua-laminate', perm: 'menu:/nhua-laminate' },
        { label: 'Mirror/Siêu bóng gương', path: '/tinh-gia-8-nhom-nho/mirror', perm: 'menu:/mirror' },
      ]},
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