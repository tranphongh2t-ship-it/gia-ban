import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { colors, radius, shadow, btn } from '../theme'

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 9999,
  background: colors.body, display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const box: React.CSSProperties = {
  background: colors.card, borderRadius: radius.xl, padding: '40px 48px',
  boxShadow: shadow.modal, border: `1px solid ${colors.border}`,
  textAlign: 'center', maxWidth: 360, width: '100%',
}

const field: React.CSSProperties = {
  width: '100%', height: 40, padding: '0 12px', borderRadius: radius.md,
  border: `1px solid ${colors.border}`, background: colors.surfaceSecondary,
  color: colors.text, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 120ms',
}

export default function LoginOverlay() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!username || !password) { setError('Nhập tên đăng nhập và mật khẩu'); return }
    setBusy(true); setError('')
    try {
      await login(username, password)
    } catch (e: any) {
      setError(e.message || 'Đăng nhập thất bại')
    }
    setBusy(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div style={overlay}>
      <div style={box}>
        <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.3 }}>◈</div>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: colors.text, margin: '0 0 4px' }}>Đăng nhập</h2>
        <p style={{ fontSize: 13, color: colors.textMuted, margin: '0 0 24px' }}>Hệ thống quản lý giá bán</p>

        {error && (
          <div style={{ fontSize: 13, color: colors.danger, background: colors.dangerLight, padding: '8px 12px', borderRadius: radius.md, marginBottom: 16, textAlign: 'left' }}>
            {error}
          </div>
        )}

        <input
          style={{ ...field, marginBottom: 12 }}
          placeholder="Tên đăng nhập"
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={handleKey}
          autoFocus
        />
        <input
          style={{ ...field, marginBottom: 20 }}
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={handleKey}
        />

        <button
          style={{ ...btn(colors.primary, '#fff', 'lg'), width: '100%', justifyContent: 'center' }}
          onClick={handleLogin}
          disabled={busy}
        >
          {busy ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </div>
    </div>
  )
}