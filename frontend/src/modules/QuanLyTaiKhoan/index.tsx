import { useState, useEffect } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { colors, radius, btn, input, pageContainer, pageTitle, section, sectionTitle } from '../../theme'

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
  const seen = new Date(lastSeen.replace(' ', 'T') + '+07:00')
  if (isNaN(seen.getTime())) return lastSeen
  const s = Math.max(0, Math.floor((Date.now() - seen.getTime()) / 1000))
  if (s < 60) return 'vừa xong'
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`
  return `${Math.floor(s / 86400)} ngày trước`
}

const roleBadge = (role: string) => {
  const bg = role === 'admin' ? colors.dangerLight : role === 'sales' ? colors.infoLight : colors.surfaceSecondary
  const fg = role === 'admin' ? colors.danger : role === 'sales' ? colors.info : colors.textSecondary
  return { display: 'inline-block', padding: '2px 8px', borderRadius: radius.sm, fontSize: 11, fontWeight: 500, background: bg, color: fg }
}

interface User {
  id: number; ten: string; email: string; vai_tro: string; trang_thai: string
  last_seen_at: string | null; has_password: number; online: number
}

export default function QuanLyTaiKhoan() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  // Add form
  const [showAdd, setShowAdd] = useState(false)
  const [newTen, setNewTen] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPass, setNewPass] = useState('')
  const [newRole, setNewRole] = useState('user')

  // Edit
  const [editId, setEditId] = useState<number | null>(null)
  const [editTen, setEditTen] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState('user')

  // Reset password
  const [resetId, setResetId] = useState<number | null>(null)
  const [resetPass, setResetPass] = useState('')

  // Search
  const [search, setSearch] = useState('')

  const loadUsers = async () => {
    try {
      const data = await apiGet('/auth/users')
      setUsers(data)
    } catch { /* ignore */ }
  }

  useEffect(() => { loadUsers() }, [])

  const filtered = users.filter(u =>
    u.ten.toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  )

  const addUser = async () => {
    if (!newTen.trim()) { setMsg('Lỗi: Nhập tên'); return }
    if (!newPass) { setMsg('Lỗi: Nhập mật khẩu'); return }
    setSaving(true); setMsg('')
    try {
      await apiPost('/auth/users', { ten: newTen.trim(), password: newPass, vai_tro: newRole })
      setMsg(`Đã thêm "${newTen.trim()}"`)
      setNewTen(''); setNewEmail(''); setNewPass(''); setShowAdd(false)
      await loadUsers()
    } catch (e: any) { setMsg(`Lỗi: ${e.message}`) }
    setSaving(false)
  }

  const saveEdit = async () => {
    if (!editId) return
    setSaving(true); setMsg('')
    try {
      await apiPut(`/auth/users/${editId}`, { ten: editTen, email: editEmail, vai_tro: editRole })
      setMsg('Đã cập nhật!')
      setEditId(null); await loadUsers()
    } catch (e: any) { setMsg(`Lỗi: ${e.message}`) }
    setSaving(false)
  }

  const resetPassword = async () => {
    if (!resetId || !resetPass) { setMsg('Lỗi: Nhập mật khẩu mới'); return }
    if (resetPass.length < 4) { setMsg('Lỗi: Mật khẩu >= 4 ký tự'); return }
    setSaving(true); setMsg('')
    try {
      await apiPost('/auth/admin/reset-password', { user_id: resetId, new_password: resetPass })
      setMsg('Đã reset mật khẩu!')
      setResetId(null); setResetPass('')
    } catch (e: any) { setMsg(`Lỗi: ${e.message}`) }
    setSaving(false)
  }

  const deleteUser = async (id: number, name: string) => {
    if (!confirm(`Xoá "${name}"?`)) return
    setMsg('')
    try {
      await apiDelete(`/auth/users/${id}`)
      setMsg(`Đã xoá "${name}"`)
      await loadUsers()
    } catch (e: any) { setMsg(`Lỗi: ${e.message}`) }
  }

  if (!me?.is_admin) {
    return <div style={pageContainer}><p style={{ color: colors.textMuted, fontSize: 14 }}>Chỉ Admin mới truy cập trang này.</p></div>
  }

  const th: React.CSSProperties = {
    textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 600,
    textTransform: 'uppercase' as const, letterSpacing: 0.3,
    color: colors.textMuted, background: colors.surfaceSecondary,
    borderBottom: `1px solid ${colors.tableBorder}`,
  }
  const td: React.CSSProperties = {
    padding: '8px 12px', borderBottom: `1px solid ${colors.tableBorderLight}`,
    color: colors.textSecondary, fontSize: 13, verticalAlign: 'middle',
  }
  const inpSmall: React.CSSProperties = { ...input, height: 30, fontSize: 12 }

  return (
    <div style={pageContainer}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={pageTitle}>Quản lý tài khoản</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            style={{ ...inpSmall, width: 220 }}
            placeholder="Tìm tên hoặc email..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
          <button style={btn(colors.primary, '#fff', 'sm')} onClick={() => { setShowAdd(!showAdd); setEditId(null); setResetId(null) }}>
            {showAdd ? 'Đóng' : '+ Thêm tài khoản'}
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ padding: 10, borderRadius: radius.md, marginBottom: 12, fontSize: 13, border: '1px solid',
          background: msg.includes('Lỗi') ? colors.dangerLight : colors.successLight,
          color: msg.includes('Lỗi') ? colors.danger : colors.success,
          borderColor: msg.includes('Lỗi') ? `${colors.danger}33` : `${colors.success}33`,
        }}>{msg}</div>
      )}

      {/* Add form */}
      {showAdd && (
        <div style={{ ...section, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: colors.textMuted, marginBottom: 3 }}>Tên đăng nhập *</label>
            <input style={{ ...inpSmall, width: 160 }} value={newTen} onChange={e => setNewTen(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: colors.textMuted, marginBottom: 3 }}>Email</label>
            <input style={{ ...inpSmall, width: 200 }} value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: colors.textMuted, marginBottom: 3 }}>Mật khẩu *</label>
            <input style={{ ...inpSmall, width: 160 }} type="password" value={newPass} onChange={e => setNewPass(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: colors.textMuted, marginBottom: 3 }}>Vai trò</label>
            <select style={{ ...inpSmall, width: 110, cursor: 'pointer' }} value={newRole} onChange={e => setNewRole(e.target.value)}>
              <option value="user">User</option>
              <option value="sales">Sales</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button style={btn(colors.success, '#fff', 'sm')} onClick={addUser} disabled={saving}>
            {saving ? '...' : 'Tạo'}
          </button>
        </div>
      )}

      {/* Users table */}
      <div style={section}>
        <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 12 }}>
          Tổng: {filtered.length} tài khoản
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={th}>ID</th>
                <th style={th}>Tên đăng nhập</th>
                <th style={th}>Email</th>
                <th style={th}>Mật khẩu</th>
                <th style={th}>Vai trò</th>
                <th style={th}>Trạng thái</th>
                <th style={th}>Online</th>
                <th style={th}>Lần cuối</th>
                <th style={th}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} style={{ background: editId === u.id ? colors.primaryLight : 'transparent' }}>
                  <td style={td}>{u.id}</td>
                  <td style={{ ...td, fontWeight: 600, color: colors.text }}>
                    <span style={statusDot(!!u.online)} />
                    {u.ten}
                  </td>
                  <td style={td}>{u.email || <span style={{ color: colors.textDisabled }}>—</span>}</td>
                  <td style={td}>
                    {u.has_password
                      ? <span style={{ color: colors.success }}>✓ Đã 设置</span>
                      : <span style={{ color: colors.warning }}>✗ Chưa 设置</span>
                    }
                  </td>
                  <td style={td}><span style={roleBadge(u.vai_tro)}>{u.vai_tro}</span></td>
                  <td style={td}>
                    <span style={{ color: u.trang_thai === 'dang_lam_viec' ? colors.success : colors.danger }}>
                      {u.trang_thai === 'dang_lam_viec' ? 'Đang làm' : 'Ngừng'}
                    </span>
                  </td>
                  <td style={{ ...td, color: u.online ? ONLINE_COLOR : colors.textMuted }}>
                    {u.online ? 'Online' : 'Offline'}
                  </td>
                  <td style={{ ...td, fontSize: 11 }}>{timeAgo(u.last_seen_at)}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {u.ten !== 'Admin' && (
                        <>
                          <button style={btn('transparent', colors.info, 'sm')} onClick={() => {
                            setEditId(u.id); setEditTen(u.ten); setEditEmail(u.email || ''); setEditRole(u.vai_tro); setResetId(null)
                          }}>Sửa</button>
                          <button style={btn('transparent', colors.warning, 'sm')} onClick={() => {
                            setResetId(u.id); setResetPass(''); setEditId(null)
                          }}>Reset MK</button>
                          <button style={btn('transparent', colors.danger, 'sm')} onClick={() => deleteUser(u.id, u.ten)}>Xoá</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit inline */}
      {editId && (
        <div style={{ ...section, borderLeft: `3px solid ${colors.info}` }}>
          <h3 style={{ ...sectionTitle, color: colors.info }}>Sửa tài khoản #{editId}</h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: colors.textMuted, marginBottom: 3 }}>Tên</label>
              <input style={{ ...inpSmall, width: 160 }} value={editTen} onChange={e => setEditTen(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: colors.textMuted, marginBottom: 3 }}>Email</label>
              <input style={{ ...inpSmall, width: 200 }} value={editEmail} onChange={e => setEditEmail(e.target.value)} type="email" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: colors.textMuted, marginBottom: 3 }}>Vai trò</label>
              <select style={{ ...inpSmall, width: 110, cursor: 'pointer' }} value={editRole} onChange={e => setEditRole(e.target.value)}>
                <option value="user">User</option>
                <option value="sales">Sales</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button style={btn(colors.info, '#fff', 'sm')} onClick={saveEdit} disabled={saving}>Lưu</button>
            <button style={btn('transparent', colors.textMuted, 'sm')} onClick={() => setEditId(null)}>Huỷ</button>
          </div>
        </div>
      )}

      {/* Reset password inline */}
      {resetId && (
        <div style={{ ...section, borderLeft: `3px solid ${colors.warning}` }}>
          <h3 style={{ ...sectionTitle, color: colors.warning }}>Reset mật khẩu #{resetId}</h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: colors.textMuted, marginBottom: 3 }}>Mật khẩu mới</label>
              <input style={{ ...inpSmall, width: 200 }} type="password" value={resetPass} onChange={e => setResetPass(e.target.value)} />
            </div>
            <button style={btn(colors.warning, '#fff', 'sm')} onClick={resetPassword} disabled={saving}>Reset</button>
            <button style={btn('transparent', colors.textMuted, 'sm')} onClick={() => setResetId(null)}>Huỷ</button>
          </div>
        </div>
      )}
    </div>
  )
}
