import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth'
import { apiPut, apiPost } from '../../lib/api'
import { colors, pageContainer } from '../../theme'

function PassInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false)
  const wrap: React.CSSProperties = { position: 'relative', width: '100%' }
  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 36px 8px 12px', border: `1px solid ${colors.border}`,
    borderRadius: 6, fontSize: 14, boxSizing: 'border-box', outline: 'none',
    background: colors.card, color: colors.text,
  }
  const btn: React.CSSProperties = {
    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', padding: 4, fontSize: 16, lineHeight: 1,
    color: colors.textMuted,
  }
  return (
    <div style={wrap}>
      <input
        value={value} onChange={e => onChange(e.target.value)}
        type={show ? 'text' : 'password'} placeholder={placeholder} style={inp}
      />
      <button type="button" style={btn} onClick={() => setShow(s => !s)} tabIndex={-1}
        title={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
        {show ? '🙈' : '👁'}
      </button>
    </div>
  )
}

export default function Profile() {
  const { user, refresh } = useAuth()

  const [ten, setTen] = useState(user?.ten || '')
  const [email, setEmail] = useState(user?.email || '')
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [changingPass, setChangingPass] = useState(false)

  useEffect(() => {
    if (user) { setTen(user.ten || ''); setEmail(user.email || '') }
  }, [user])

  const handleSaveProfile = async () => {
    setMsg(''); setErr('')
    if (!ten.trim()) { setErr('Tên không được để trống'); return }
    setSaving(true)
    try {
      await apiPut('/auth/profile', { ten: ten.trim(), email: email.trim() })
      await refresh()
      setMsg('Cập nhật thông tin thành công!')
    } catch (e: any) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const handleChangePass = async () => {
    setMsg(''); setErr('')
    if (!currentPass) { setErr('Nhập mật khẩu hiện tại'); return }
    if (!newPass) { setErr('Nhập mật khẩu mới'); return }
    if (newPass.length < 4) { setErr('Mật khẩu mới phải >= 4 ký tự'); return }
    if (newPass !== confirmPass) { setErr('Mật khẩu xác nhận không khớp'); return }
    setChangingPass(true)
    try {
      await apiPost('/auth/change-password', { current_password: currentPass, new_password: newPass })
      setMsg('Đổi mật khẩu thành công!')
      setCurrentPass(''); setNewPass(''); setConfirmPass('')
    } catch (e: any) { setErr(e.message) }
    finally { setChangingPass(false) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: `1px solid ${colors.border}`, borderRadius: 6,
    fontSize: 14, boxSizing: 'border-box', outline: 'none',
    background: colors.card, color: colors.text,
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 600, color: colors.textSecondary, marginBottom: 4,
  }
  const sectionStyle: React.CSSProperties = {
    background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 24, marginBottom: 20,
  }

  return (
    <div style={{ ...pageContainer, maxWidth: 600 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.text, margin: '0 0 20px' }}>
        Tài khoản của tôi
      </h2>

      {msg && <div style={{ padding: '10px 16px', background: 'rgba(47,179,68,0.15)', color: colors.success, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{msg}</div>}
      {err && <div style={{ padding: '10px 16px', background: 'rgba(214,57,57,0.15)', color: colors.danger, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{err}</div>}

      <div style={sectionStyle}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', color: colors.text }}>Thông tin cá nhân</h3>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Tên đăng nhập</label>
          <input value={ten} onChange={e => setTen(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} type="email" />
        </div>
        <button
          onClick={handleSaveProfile}
          disabled={saving}
          style={{
            padding: '8px 24px', background: colors.primary, color: '#fff', border: 'none',
            borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
          }}
        >
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', color: colors.text }}>Đổi mật khẩu</h3>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Mật khẩu hiện tại</label>
          <PassInput value={currentPass} onChange={setCurrentPass} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Mật khẩu mới</label>
          <PassInput value={newPass} onChange={setNewPass} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Xác nhận mật khẩu mới</label>
          <PassInput value={confirmPass} onChange={setConfirmPass} />
        </div>
        <button
          onClick={handleChangePass}
          disabled={changingPass}
          style={{
            padding: '8px 24px', background: colors.danger, color: '#fff', border: 'none',
            borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: changingPass ? 'wait' : 'pointer',
          }}
        >
          {changingPass ? 'Đang đổi...' : 'Đổi mật khẩu'}
        </button>
      </div>
    </div>
  )
}
