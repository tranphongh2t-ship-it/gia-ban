import { ReactNode, useEffect } from 'react'
import { colors, shadow, radius } from '../theme'

interface ModalProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
  backdropFilter: 'blur(3px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1200, padding: 24,
}

const box = (wide?: boolean): React.CSSProperties => ({
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.lg,
  boxShadow: shadow.modal,
  width: '100%',
  maxWidth: wide ? 720 : 480,
  maxHeight: 'calc(100vh - 48px)',
  display: 'flex', flexDirection: 'column',
})

const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 18px', borderBottom: `1px solid ${colors.borderLight}`,
  flexShrink: 0,
}

const titleStyle: React.CSSProperties = {
  fontSize: 15, fontWeight: 600, color: colors.text, letterSpacing: -0.1, margin: 0,
}

const closeBtn: React.CSSProperties = {
  width: 28, height: 28, border: 'none', background: 'transparent',
  borderRadius: radius.sm, display: 'flex', alignItems: 'center',
  justifyContent: 'center', cursor: 'pointer', color: colors.textMuted,
  transition: 'background 100ms, color 100ms', fontSize: 18, lineHeight: 1,
}

const bodyStyle: React.CSSProperties = {
  padding: '16px 18px', overflowY: 'auto', flex: '1 1 auto',
}

export default function Modal({ open, title, children, onClose, wide }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={box(wide)}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>{title}</h2>
          <button style={closeBtn} onClick={onClose}>&times;</button>
        </div>
        <div style={bodyStyle}>
          {children}
        </div>
      </div>
    </div>
  )
}