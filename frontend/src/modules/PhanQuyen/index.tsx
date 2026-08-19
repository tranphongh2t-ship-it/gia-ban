import { useState, useEffect } from 'react'
import { apiGet, apiPut, apiPost, apiDelete } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { colors, radius, shadow, btn, input, pageContainer, pageTitle, section, sectionTitle } from '../../theme'

const S = {
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 20 } as React.CSSProperties,
  userCard: (active: boolean): React.CSSProperties => ({
    padding: '10px 14px', borderRadius: radius.md, cursor: 'pointer',
    border: `1px solid ${active ? colors.primary : colors.border}`,
    background: active ? colors.primaryLight : colors.card,
    color: active ? colors.primary : colors.textSecondary,
    fontSize: 13, fontWeight: active ? 600 : 400, transition: 'all 100ms',
  }),
  groupLabel: {
    fontSize: 11, fontWeight: 600, color: colors.textMuted,
    textTransform: 'uppercase' as const, letterSpacing: 0.4,
    padding: '8px 0 4px', marginTop: 4,
  },
  permRow: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
    fontSize: 13, color: colors.textSecondary, cursor: 'pointer',
  },
  field: { marginBottom: 10 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 3 },
  inp: { ...input, width: '100%', boxSizing: 'border-box' as const, height: 34, fontSize: 13 },
}

const ONLINE_COLOR = '#22c55e'
const OFFLINE_COLOR = '#9ca3af'

function statusDot(online: boolean): React.CSSProperties {
  return {
    display: 'inline-block', width: 9, height: 9, borderRadius: '50%', marginRight: 6,
    background: online ? ONLINE_COLOR : OFFLINE_COLOR,
    boxShadow: online ? `0 0 0 3px ${ONLINE_COLOR}22` : 'none',
    verticalAlign: 'middle',
  }
}

function timeAgo(lastSeen: string | null): string {
  if (!lastSeen) return 'chưa online'
  // last_seen_at lưu theo giờ Việt Nam (UTC+7)
  const seen = new Date(lastSeen.replace(' ', 'T') + '+07:00')
  if (isNaN(seen.getTime())) return lastSeen
  const s = Math.max(0, Math.floor((Date.now() - seen.getTime()) / 1000))
  if (s < 60) return 'vừa xong'
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`
  return `${Math.floor(s / 86400)} ngày trước`
}

interface MenuItem { key: string; label: string; group: string }

export default function PhanQuyenPage() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [features, setFeatures] = useState<MenuItem[]>([])
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Add user form
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPass, setNewPass] = useState('')
  const [newRole, setNewRole] = useState('user')

  // Edit user
  const [editUser, setEditUser] = useState<any>(null)

  const loadUsers = () => apiGet('/auth/users').then(setUsers).catch(() => {})

  useEffect(() => {
    loadUsers()
    apiGet('/auth/menu-items').then((r: any) => {
      setMenuItems(r.menu_items || [])
      setFeatures(r.features || [])
    }).catch(() => {})
    // Tự refresh danh sách để cập nhật trạng thái online/offline
    const t = setInterval(loadUsers, 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setBusy(true)
    apiGet(`/auth/permissions/${selectedId}`).then(r => {
      const isAdm = r.is_admin
      const allPerms = menuItems.map((m: MenuItem) => m.key).concat(features.map(f => f.key))
      setPermissions(isAdm ? allPerms : r.permissions)
    }).catch(() => {}).finally(() => setBusy(false))
  }, [selectedId, menuItems, features])

  const toggle = (key: string) => {
    setPermissions(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key])
  }

  const savePerms = async () => {
    if (!selectedId) return
    setSaving(true); setMessage('')
    try {
      await apiPut(`/auth/permissions/${selectedId}`, { permissions })
      setMessage('Đã lưu phân quyền!')
    } catch (e: any) { setMessage(`Lỗi: ${e.message}`) }
    setSaving(false)
  }

  const addUser = async () => {
    if (!newName || !newPass) { setMessage('Lỗi: Nhập tên và mật khẩu'); return }
    setSaving(true); setMessage('')
    try {
      await apiPost('/auth/users', { ten: newName, password: newPass, vai_tro: newRole })
      setMessage(`Đã thêm "${newName}"`)
      setNewName(''); setNewPass(''); setShowAdd(false)
      await loadUsers()
    } catch (e: any) { setMessage(`Lỗi: ${e.message}`) }
    setSaving(false)
  }

  const saveEdit = async () => {
    if (!editUser) return
    setSaving(true); setMessage('')
    try {
      await apiPut(`/auth/users/${editUser.id}`, {
        ten: editUser.ten,
        password: editUser.password || undefined,
        vai_tro: editUser.vai_tro,
      })
      setMessage('Đã cập nhật!')
      setEditUser(null)
      await loadUsers()
    } catch (e: any) { setMessage(`Lỗi: ${e.message}`) }
    setSaving(false)
  }

  const deleteUser = async (id: number, name: string) => {
    if (!confirm(`Xoá "${name}"?`)) return
    setMessage('')
    try {
      await apiDelete(`/auth/users/${id}`)
      setMessage(`Đã xoá "${name}"`)
      if (selectedId === id) setSelectedId(null)
      await loadUsers()
    } catch (e: any) { setMessage(`Lỗi: ${e.message}`) }
  }

  const deleteAll = async () => {
    const nonAdmin = users.filter((u: any) => u.ten !== 'Admin')
    if (nonAdmin.length === 0) { setMessage('Không có user nào để xoá'); return }
    if (!confirm(`Xoá tất cả ${nonAdmin.length} user (trừ Admin)?`)) return
    setMessage(''); setSaving(true)
    try {
      const ids = nonAdmin.map((u: any) => u.id)
      const res = await apiPost('/auth/xoa-hang-loat', { ids })
      setMessage(`Đã xoá ${res.deleted} user` + (res.errors ? ` (${res.errors.length} lỗi)` : ''))
      if (selectedId && ids.includes(selectedId)) setSelectedId(null)
      await loadUsers()
    } catch (e: any) { setMessage(`Lỗi: ${e.message}`) }
    setSaving(false)
  }

  if (!me?.is_admin) {
    return <div style={pageContainer}><p style={{ color: colors.textMuted, fontSize: 14 }}>Bạn không có quyền truy cập trang này.</p></div>
  }

  const allGroups = [...new Set(menuItems.map(m => m.group))]
  const selectedUser = users.find((u: any) => u.id === selectedId)

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Quản lý người dùng & phân quyền</h1>

      {message && (
        <div style={{ padding: 12, borderRadius: radius.md, marginBottom: 16, fontSize: 13, border: '1px solid',
          background: message.includes('Lỗi') ? colors.dangerLight : colors.successLight,
          color: message.includes('Lỗi') ? colors.danger : colors.success,
          borderColor: message.includes('Lỗi') ? `${colors.danger}33` : `${colors.success}33`,
        }}>
          {message}
        </div>
      )}

      <div style={S.grid}>
        {/* LEFT: Users */}
        <div style={section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ ...sectionTitle, margin: 0 }}>Người dùng</h2>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={btn(colors.danger, '#fff', 'sm')} onClick={deleteAll} disabled={saving}>Xoá tất cả</button>
              <button style={btn(colors.primary, '#fff', 'sm')} onClick={() => { setShowAdd(!showAdd); setEditUser(null) }}>
                {showAdd ? 'Đóng' : '+ Thêm'}
              </button>
            </div>
          </div>

          {/* Add form */}
          {showAdd && (
            <div style={{ padding: 12, background: colors.surfaceSecondary, borderRadius: radius.md, marginBottom: 12, border: `1px solid ${colors.border}` }}>
              <div style={S.field}>
                <label style={S.label}>Tên đăng nhập</label>
                <input style={S.inp} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nhập tên" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Mật khẩu</label>
                <input style={S.inp} type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Nhập mật khẩu" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Vai trò</label>
                <select style={{ ...S.inp, cursor: 'pointer' }} value={newRole} onChange={e => setNewRole(e.target.value)}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button style={btn(colors.success, '#fff', 'sm')} onClick={addUser} disabled={saving}>
                {saving ? '...' : 'Tạo'}
              </button>
            </div>
          )}

          {/* Edit form */}
          {editUser && (
            <div style={{ padding: 12, background: colors.surfaceSecondary, borderRadius: radius.md, marginBottom: 12, border: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 8 }}>Sửa: {editUser.ten_old || editUser.ten}</div>
              <div style={S.field}>
                <label style={S.label}>Tên mới</label>
                <input style={S.inp} value={editUser.ten} onChange={e => setEditUser({ ...editUser, ten: e.target.value })} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Mật khẩu mới (để trống nếu không đổi)</label>
                <input style={S.inp} type="password" value={editUser.password || ''} onChange={e => setEditUser({ ...editUser, password: e.target.value })} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Vai trò</label>
                <select style={{ ...S.inp, cursor: 'pointer' }} value={editUser.vai_tro} onChange={e => setEditUser({ ...editUser, vai_tro: e.target.value })}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={btn(colors.success, '#fff', 'sm')} onClick={saveEdit} disabled={saving}>Lưu</button>
                <button style={btn(colors.textMuted, '#fff', 'sm')} onClick={() => setEditUser(null)}>Huỷ</button>
              </div>
            </div>
          )}

          {/* User list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {users.filter((u: any) => u.trang_thai !== 'da_nghi_viec').map((u: any) => (
              <div key={u.id} style={S.userCard(selectedId === u.id)} onClick={() => setSelectedId(u.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 500 }}>
                      <span style={statusDot(!!u.online)} />
                      {u.ten}
                    </span>
                    <span style={{ fontSize: 11, color: colors.textMuted, marginLeft: 6 }}>
                      {u.vai_tro === 'admin' ? '(Admin)' : ''}
                    </span>
                    <span style={{ fontSize: 11, marginLeft: 6, color: u.online ? ONLINE_COLOR : colors.textMuted }}>
                      {u.online ? 'Đang online' : `Offline · ${timeAgo(u.last_seen_at)}`}
                    </span>
                  </div>
                  {u.ten !== 'Admin' && (
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      <button style={btn('transparent', colors.textMuted, 'sm')} onClick={() => setEditUser({ ...u, password: '', ten_old: u.ten })}>Sửa</button>
                      <button style={btn('transparent', colors.danger, 'sm')} onClick={() => deleteUser(u.id, u.ten)}>Xoá</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Permissions */}
        <div style={section}>
          <h2 style={sectionTitle}>Phân quyền</h2>
          {!selectedId && <p style={{ color: colors.textMuted, fontSize: 13 }}>Chọn người dùng bên trái</p>}
          {selectedId && selectedUser?.vai_tro === 'admin' && (
            <p style={{ fontSize: 13, color: colors.primary }}>Admin có toàn quyền, không cần phân quyền.</p>
          )}
          {busy && <p style={{ color: colors.textMuted, fontSize: 13 }}>Đang tải...</p>}

          {selectedId && !busy && selectedUser?.vai_tro !== 'admin' && (
            <>
              <div style={{ maxHeight: 480, overflowY: 'auto', marginBottom: 12 }}>
                {allGroups.map(group => {
                  const items = menuItems.filter(m => m.group === group)
                  return (
                    <div key={group}>
                      <div style={S.groupLabel}>{group}</div>
                      {items.map(item => (
                        <label key={item.key} style={S.permRow}>
                          <input type="checkbox" checked={permissions.includes(item.key)} onChange={() => toggle(item.key)} />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  )
                })}
                {features.length > 0 && (
                  <div>
                    <div style={S.groupLabel}>Tính năng</div>
                    {features.map(f => (
                      <label key={f.key} style={S.permRow}>
                        <input type="checkbox" checked={permissions.includes(f.key)} onChange={() => toggle(f.key)} />
                        {f.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button style={btn(colors.primary)} onClick={savePerms} disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu phân quyền'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}