import { colors, radius } from '../theme'

export const DEFAULT_PAGE_SIZE = 100

interface PaginationBarProps {
  page: number
  pageCount: number
  total: number
  onPageChange: (p: number) => void
}

const btn: React.CSSProperties = {
  height: 26, padding: '0 10px', borderRadius: radius.sm,
  border: `1px solid ${colors.border}`, background: colors.card,
  color: colors.text, fontSize: 12, fontWeight: 500, cursor: 'pointer',
}
const btnDisabled: React.CSSProperties = { ...btn, opacity: 0.45, cursor: 'default' }

export default function PaginationBar({ page, pageCount, total, onPageChange }: PaginationBarProps) {
  const showButtons = pageCount > 1
  return (
    <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderTop: `1px solid ${colors.borderLight}` }}>
      <span style={{ fontSize: 12, color: colors.textMuted }}>
        Hiển thị <strong style={{ color: colors.text }}>{total}</strong> kết quả{showButtons && <span> · Trang <strong style={{ color: colors.text }}>{page + 1}</strong> / {pageCount}</span>}
      </span>
      {showButtons && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <button
            style={page <= 0 ? btnDisabled : btn}
            disabled={page <= 0}
            onClick={() => onPageChange(page - 1)}
          >← Trước</button>
          <button
            style={page >= pageCount - 1 ? btnDisabled : btn}
            disabled={page >= pageCount - 1}
            onClick={() => onPageChange(page + 1)}
          >Sau →</button>
        </div>
      )}
    </div>
  )
}
