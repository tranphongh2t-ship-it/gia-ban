import { useAuth } from '../../lib/auth'
import { colors, pageContainer } from '../../theme'

export default function Welcome() {
  const { user } = useAuth()

  return (
    <div style={pageContainer}>
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.15 }}>◈</div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: colors.text, margin: '0 0 8px' }}>
          Xin chào, {user?.ten}!
        </h1>
        <p style={{ fontSize: 14, color: colors.textMuted, margin: 0, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
          Chào mừng bạn đến với hệ thống quản lý giá bán. 
          Sử dụng menu bên trái để truy cập các chức năng.
        </p>
      </div>
    </div>
  )
}