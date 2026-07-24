import { colors, shadow, radius } from '../theme'

interface ConfirmProps {
  open: boolean
  message: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
  title?: string
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
  backdropFilter: 'blur(3px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1300, padding: 24,
}

const box: React.CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.lg,
  boxShadow: shadow.modal,
  width: '100%',
  maxWidth: 400,
}

const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 18px', borderBottom: `1px solid ${colors.borderLight}`,
}

const titleStyle: React.CSSProperties = {
  fontSize: 15, fontWeight: 600, color: colors.text, margin: 0,
}

const bodyStyle: React.CSSProperties = {
  padding: '16px 18px',
}

const messageStyle: React.CSSProperties = {
  fontSize: 13, color: colors.textSecondary, margin: 0, lineHeight: 1.5,
}

const footerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: 8,
  padding: '12px 18px', borderTop: `1px solid ${colors.borderLight}`,
}

export default function ConfirmDialog({ open, message, onConfirm, onCancel, loading, title }: ConfirmProps) {
  if (!open) return null
  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div style={box}>
        <div style={headerStyle}>
          <h3 style={titleStyle}>{title || 'Xác nhận'}</h3>
        </div>
        <div style={bodyStyle}>
          <p style={messageStyle}>{message}</p>
        </div>
        <div style={footerStyle}>
          <button style={{
            height: 32, padding: '0 12px', background: colors.card, color: colors.textSecondary,
            border: `1px solid ${colors.border}`, borderRadius: radius.sm, cursor: 'pointer',
            fontSize: 12.5, fontWeight: 500, transition: 'background 100ms, color 100ms',
          }} onClick={onCancel} disabled={loading}>Huỷ</button>
          <button style={{
            height: 32, padding: '0 12px', background: colors.danger, color: '#fff',
            border: 'none', borderRadius: radius.sm, cursor: 'pointer',
            fontSize: 12.5, fontWeight: 500, transition: 'background 100ms',
          }} onClick={onConfirm} disabled={loading}>
            {loading ? 'Đang xoá...' : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  )
}