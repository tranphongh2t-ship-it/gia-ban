import { useState } from 'react'
import { useLock } from '../lib/lock'
import { useAuth } from '../lib/auth'
import { colors } from '../theme'

export default function BangGiaLockToggle() {
  const { locked, loading, setLocked } = useLock()
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)

  if (!user?.is_admin) return null

  const toggle = async () => {
    if (busy) return
    const msg = locked
      ? 'MỞ KHÓA Bảng Tính Giá? Mọi người sẽ chỉnh sửa tay lại được bình thường.'
      : 'KHÓA Bảng Tính Giá? Sẽ chặn MỌI chỉnh sửa tay (thêm/sửa/xóa dòng, gán mã). Luồng tự động (tính toán, đồng bộ MISA) vẫn chạy.'
    if (!window.confirm(msg)) return
    setBusy(true)
    try {
      const ok = await setLocked(!locked)
      if (!ok) alert('Không thể cập nhật trạng thái khóa. Vui lòng thử lại.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: locked ? colors.danger : colors.textMuted }}>
        {locked ? '🔒 ĐANG KHÓA' : 'Bảng Tính Giá'}
      </span>
      <button
        onClick={toggle}
        disabled={busy || loading}
        title="Công tắc an toàn — chỉ Admin"
        style={{
          width: 44, height: 22, borderRadius: 11, border: 'none', cursor: busy || loading ? 'wait' : 'pointer',
          background: locked ? colors.danger : '#cbd5e0', position: 'relative', transition: 'background 150ms', padding: 0, flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 2, width: 18, height: 18, borderRadius: '50%', background: '#fff',
          left: locked ? 24 : 2, transition: 'left 150ms', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        }} />
      </button>
    </div>
  )
}
