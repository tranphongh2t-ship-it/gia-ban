import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import { apiGet, apiPost, apiPatch, apiDelete, apiPut, API_BASE } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import Modal from '../Modal'
import ConfirmDialog from '../ConfirmDialog'
import { colors, shadow, radius, btn, input, tableStyle, pageContainer, pageTitle, spinner } from '../../theme'
import { formatNum } from '../../lib/format'

export interface Column {
  key: string
  label: string
  type?: 'text' | 'number' | 'select'
  options?: { value: string; label: string }[]
  required?: boolean
  hidden?: boolean
  width?: string
  unit?: string
  render?: (value: any, row: any) => any
  renderForm?: (value: any, onChange: (v: any) => void) => any
  filterable?: boolean
  computed?: boolean
  // Nhóm cột: cấu hình = { nhóm: 'đơn giá' | 'ck', tint: màu nền } → tô màu nền nhóm cho header + ô dữ liệu,
  // và là nhóm con mặc định được đề xuất khi bấm "ghim cột" (tick sẵn các cột trong nhóm).
  group?: string
  tint?: string
}

interface DataGridProps {
  title: string
  columns: Column[]
  apiPath: string
  searchable?: boolean
  defaultSort?: string
  exportable?: boolean
  defaultLimit?: number
  extraFilters?: Record<string, string>
  exportName?: string
  columnsPerRow?: number
  rowActionLabel?: string
  onRowAction?: (row: any) => void
  rowActions?: Array<{ label: string; onClick: (row: any) => void; tone?: 'info' | 'primary' | 'danger' }>
  // Tên bảng thật trong thay_doi_log (vd "bang_gia_cot_go"). Khi có, DataGrid tự hiển thị
  // lịch sử sửa theo account trong modal Sửa (ngược lại với historyInForm dành cho bảng đặc biệt).
  logBang?: string
  historyInForm?: {
    get: (row: any) => Promise<any[]>
    format: (h: any) => string
  }
  // Dữ liệu mẫu hiển thị trực tiếp, không gọi API backend (dùng khi chưa có backend).
  demoRows?: any[]
}

const AUTO_FIELDS = ['id', 'created_at', 'updated_at', 'updated_by', 'created_at', 'ngay_bat_dau', 'ngay_nghi_viec']

const cellBorder = `1px solid ${colors.tableBorder}`
const tHead: React.CSSProperties = {
  ...tableStyle.th,
  borderRight: cellBorder,
  position: 'relative',
  background: colors.surfaceSecondary,
}
const tHeadLast: React.CSSProperties = { ...tHead, borderRight: 'none' }
const tCell: React.CSSProperties = { ...tableStyle.td, borderRight: cellBorder }
const tCellLast: React.CSSProperties = { ...tableStyle.td, borderRight: 'none' }

const ROW_PAD: Record<string, { td: string; th: string }> = {
  sm: { td: '5px 8px', th: '7px 10px' },
  md: { td: '8px 16px', th: '8px 16px' },
  lg: { td: '12px 20px', th: '12px 20px' },
}

// Đổi màu hex (#rrggbb) → chuỗi rgba với độ trong suốt alpha (0..1)
function tintBg(hex: string | undefined, alpha: number): string | undefined {
  if (!hex) return undefined
  const m = String(hex).replace('#', '')
  const r = parseInt(m.slice(0, 2), 16), g = parseInt(m.slice(2, 4), 16), b = parseInt(m.slice(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return undefined
  return `rgba(${r},${g},${b},${alpha})`
}

// Trộn màu phủ lên nền → màu đục (không trong suốt) để dùng cho cột ghim (che cột cuộn phía sau).
function solidMix(base: string, over: string | undefined, alpha: number): string {
  if (!over) return base
  const hex = (s: string) => { const m = s.replace('#', ''); return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)] }
  const [br, bg, bb] = hex(base)
  const [or, og, ob] = hex(over)
  const mix = (a: number, b: number) => Math.round(a * alpha + b * (1 - alpha))
  return `#${[mix(or, br), mix(og, bg), mix(ob, bb)].map(v => v.toString(16).padStart(2, '0')).join('')}`
}


const STORAGE_COL = (p: string) => `dg_${p.replace(/\//g, '_')}_colw`
const STORAGE_ROW = (p: string) => `dg_${p.replace(/\//g, '_')}_rowh`
const STORAGE_PIN = (p: string) => `dg_${p.replace(/\//g, '_')}_pins`
const STORAGE_HIDDEN = (p: string) => `dg_${p.replace(/\//g, '_')}_hidden`

function buildPageList(current: number, total: number): number[] {
  const pages: number[] = []
  pages.push(1)
  if (current > 3) pages.push(-1)
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
  if (current < total - 2) pages.push(-1)
  if (total > 1) pages.push(total)
  return pages
}

// So sánh "tự nhiên" giống Excel: tách phần số trong chuỗi (BH09089 → số 9089) để sắp theo số, không sắp theo chữ.
function naturalCompare(a: any, b: any): number {
  const sa = (a === null || a === undefined) ? '' : String(a)
  const sb = (b === null || b === undefined) ? '' : String(b)
  const re = /(\d+|\D+)/g
  const aa = sa.match(re) || []
  const bb = sb.match(re) || []
  const n = Math.min(aa.length, bb.length)
  for (let i = 0; i < n; i++) {
    const x = aa[i]; const y = bb[i]
    const xn = /^\d+$/.test(x); const yn = /^\d+$/.test(y)
    if (xn && yn) {
      const dx = parseInt(x, 10); const dy = parseInt(y, 10)
      if (dx !== dy) return dx - dy
    } else if (x !== y) {
      return x < y ? -1 : 1
    }
  }
  return aa.length - bb.length
}

function FilterDropdown({ col, value, onChange, onClose, values }: { col: Column; value: string; onChange: (v: string) => void; onClose: () => void; values?: string[] }) {
  const [val, setVal] = useState(value || '')
  const isExact = val.startsWith('=')
  const displayText = isExact ? val.slice(1) : val
  const inputStyle = { ...input, width: '100%', padding: '6px 10px', fontSize: 13, boxSizing: 'border-box' as const }
  const handleApply = () => { onChange(val); onClose() }
  const handleClear = () => { setVal(''); onChange(''); onClose() }
  const setExact = (v: string) => { setVal('=' + v); onChange('=' + v); onClose() }
  const listValues = values ? values.filter(v => v.toLowerCase().includes(displayText.toLowerCase())) : []

  if (col.type === 'select' && col.options) {
    return (
      <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, minWidth: 190, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.md, boxShadow: shadow.dropdown, padding: 8 }}>
        {col.options.map(opt => (
          <div key={opt.value} style={{ padding: '5px 8px', cursor: 'pointer', borderRadius: radius.sm, background: val === opt.value ? colors.primaryLight : 'transparent', color: val === opt.value ? colors.primary : colors.text, marginBottom: 2, fontSize: 12, fontWeight: val === opt.value ? 600 : 400, textTransform: 'none' }} onClick={() => { setVal(opt.value); onChange(opt.value); onClose() }}>
            {opt.label}
          </div>
        ))}
        <button style={{ width: '100%', marginTop: 6, padding: '5px 8px', background: val ? colors.dangerLight : colors.surfaceSecondary, color: val ? colors.danger : colors.textMuted, border: 'none', borderRadius: radius.sm, cursor: 'pointer', fontSize: 12, fontWeight: 500, textTransform: 'none' }} onClick={handleClear}>
          Xóa bộ lọc
        </button>
      </div>
    )
  }

  if (col.type === 'number') {
    const chip = (token: string, label: string) => (
      <div style={{ padding: '3px 8px', borderRadius: radius.sm, cursor: 'pointer', fontSize: 11, fontWeight: 500, background: val === token ? colors.primary : colors.surfaceSecondary, color: val === token ? '#fff' : colors.textMuted, textTransform: 'none' }} onClick={() => { setVal(token); onChange(token); onClose() }}>
        {label}
      </div>
    )
    return (
      <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, minWidth: 240, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.md, boxShadow: shadow.dropdown, padding: 12 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <input type="number" style={inputStyle} placeholder="Từ" value={val.includes('|') ? val.split('|')[0] : ''} onChange={e => setVal(e.target.value + '|' + (val.split('|')[1] || ''))} />
          <input type="number" style={inputStyle} placeholder="Đến" value={val.includes('|') ? val.split('|')[1] : ''} onChange={e => setVal((val.split('|')[0] || '') + '|' + e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 5, marginBottom: 8, flexWrap: 'wrap' }}>
          {chip('__gt0', '> 0')}{chip('__gte0', '≥ 0')}{chip('__eq0', '= 0')}{chip('__lt0', '< 0')}{chip('__notnull', 'Có giá trị')}
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button style={{ ...btn(colors.textMuted, '#fff', 'sm'), fontSize: 12 }} onClick={handleClear}>Xoá</button>
          <button style={{ ...btn(colors.primary, '#fff', 'sm'), fontSize: 12 }} onClick={handleApply}>Lọc</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, minWidth: 240, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.md, boxShadow: shadow.dropdown, padding: 12 }}>
      <input style={inputStyle} placeholder={`Lọc ${col.label}...`} value={displayText} onChange={e => { setVal(e.target.value); onChange(e.target.value) }} onKeyDown={e => { if (e.key === 'Enter') handleApply() }} autoFocus />
      {values && values.length > 0 && (
        <div style={{ marginTop: 6, border: `1px solid ${colors.borderLight}`, borderRadius: radius.sm, maxHeight: 200, overflowY: 'auto' }}>
          {listValues.slice(0, 300).map(v => {
            const active = isExact && val.slice(1) === v
            return (
              <div key={v} onClick={() => setExact(v)} style={{ padding: '5px 8px', cursor: 'pointer', fontSize: 12, borderRadius: radius.sm, margin: 2, background: active ? colors.primaryLight : 'transparent', color: active ? colors.primary : colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={v}>
                {active && <span style={{ marginRight: 4 }}>✓</span>}{v}
              </div>
            )
          })}
          {listValues.length === 0 && <div style={{ padding: '6px 8px', fontSize: 12, color: colors.textMuted }}>Không có giá trị phù hợp</div>}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 8 }}>
        <button style={{ ...btn(colors.textMuted, '#fff', 'sm'), fontSize: 12 }} onClick={handleClear}>Xoá</button>
        <button style={{ ...btn(colors.primary, '#fff', 'sm'), fontSize: 12 }} onClick={handleApply}>Lọc</button>
      </div>
    </div>
  )
}

export default function DataGrid({ title, columns, apiPath, searchable = true, defaultSort, defaultLimit = 50, extraFilters, exportName, columnsPerRow = 1, rowActionLabel, onRowAction, rowActions, logBang, historyInForm, demoRows }: DataGridProps) {
  const { hasPermission, user } = useAuth()
  const canEdit = hasPermission('feature:edit-data')
  // Bản sao dữ liệu mẫu để sửa/xóa trực tiếp ở chế độ demo (đợi backend)
  const [localRows, setLocalRows] = useState<any[] | null>(demoRows || null)
  const demoMode = !!demoRows
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [limit] = useState(defaultLimit)
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<any | null>(null)
  const [formData, setFormData] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formHistory, setFormHistory] = useState<any[] | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [openFilter, setOpenFilter] = useState<string | null>(null)

  // Sắp xếp cột (giống Excel: click header để đổi hướng, hỗ trợ sắp theo số tự nhiên)
  const [sortKey, setSortKey] = useState<string | null>(defaultSort || null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const toggleSort = (key: string) => {
    setOpenFilter(null)
    if (sortKey === key) {
      if (sortDir === 'desc') setSortDir('asc')
      else { setSortKey(null); setSortDir('desc') }
    } else { setSortKey(key); setSortDir('desc') }
    setOffset(0)
  }

  // Danh sách giá trị có trong cột để hiển thị "lọc nhanh" (giống list model trong Excel)
  const colValues = (col: Column): string[] => {
    const source = demoMode ? (localRows || []) : data
    const keys = col.key.split(';')
    const set = new Set<string>()
    for (const r of source) {
      for (const k of keys) {
        const v = (r as any)[k]
        if (v === null || v === undefined || v === '') continue
        set.add(String(v))
      }
    }
    return Array.from(set).sort((a, b) => naturalCompare(a, b))
  }

  // Inline editing state
  const [inlineEdit, setInlineEdit] = useState<{ rowId: number; colKey: string; value: any } | null>(null)
  const [editMode, setEditMode] = useState(false)
  const inlineRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

  // Column widths + row height (saved to localStorage, sync lên D1 theo user_id)
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_COL(apiPath)) || '{}') } catch { return {} }
  })
  const [rowHeight, setRowHeight] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_ROW(apiPath)) || 'md' } catch { return 'md' }
  })

  // Cột ghim (sticky left khi cuộn ngang). Tick tùy ý từng cột. Lưu localStorage theo apiPath.
  const [pinCols, setPinCols] = useState<string[]>(() => {
    try {
      const arr = JSON.parse(localStorage.getItem(STORAGE_PIN(apiPath)) || '[]')
      return Array.isArray(arr) ? arr : []
    } catch { return [] }
  })
  const [pinPopup, setPinPopup] = useState(false)
  const pinRef = useRef<HTMLDivElement>(null)
  const defaultPinDone = useRef(false)

  // Cột ẩn theo user (xem ẩn cột). Ưu tiên data (user) → default (admin/global) → auto.
  const [hiddenCols, setHiddenCols] = useState<string[]>(() => {
    try {
      const arr = JSON.parse(localStorage.getItem(STORAGE_HIDDEN(apiPath)) || 'null')
      return Array.isArray(arr) ? arr : []
    } catch { return [] }
  })
  const [hidePopup, setHidePopup] = useState(false)
  const hideRef = useRef<HTMLDivElement>(null)

  useEffect(() => { localStorage.setItem(STORAGE_HIDDEN(apiPath), JSON.stringify(hiddenCols)) }, [hiddenCols, apiPath])

  // Đóng popup ẩn cột khi click bên ngoài
  useEffect(() => {
    if (!hidePopup) return
    const onDoc = (e: MouseEvent) => {
      if (hideRef.current && !hideRef.current.contains(e.target as Node)) setHidePopup(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [hidePopup])

  // Đóng popup ghim khi click bên ngoài
  useEffect(() => {
    if (!pinPopup) return
    const onDoc = (e: MouseEvent) => {
      if (pinRef.current && !pinRef.current.contains(e.target as Node)) setPinPopup(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [pinPopup])

  // Ghim cột tùy ý (tick cột nào → ghim cột đó, không bắt buộc liền từ trái). Mặc định ghim cột title (đầu tiên).
  const pinIdxOf = (key: string) => visibleCols.findIndex(c => c.key === key)
  const togglePin = (key: string) => {
    if (pinIdxOf(key) < 0) return
    setPinCols(prev => {
      const next = prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
      return next.sort((a, b) => pinIdxOf(a) - pinIdxOf(b))
    })
  }
  const togglePinsAll = (on: boolean) => {
    setPinCols(on ? visibleCols.map(c => c.key) : [])
  }

  const userId: number | null = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('auth_user') || 'null')
      return u?.id ? Number(u.id) : null
    } catch { return null }
  })()

  const saveRef = useRef<Record<string, any>>({})

  useEffect(() => { localStorage.setItem(STORAGE_COL(apiPath), JSON.stringify(colWidths)) }, [colWidths, apiPath])
  useEffect(() => { localStorage.setItem(STORAGE_ROW(apiPath), rowHeight) }, [rowHeight, apiPath])

  // Nạp co dãn cột + ẩn cột + ghim cột: default (admin/global) + riêng user từ D1 (nếu đăng nhập)
  useEffect(() => {
    if (!userId) return
    let active = true
    ;(async () => {
      try {
        const res = await apiGet(`/user-prefs/cols?user_id=${userId}&page=${encodeURIComponent(apiPath)}`)
        if (!active) return
        const merged: Record<string, number> = { ...(res.default || {}), ...(res.data || {}) }
        setColWidths(merged)
        if (Array.isArray(res.hidden)) setHiddenCols(res.hidden)
        if (Array.isArray(res.pins)) setPinCols(res.pins)
      } catch { /* fallback localStorage */ }
    })()
    return () => { active = false }
  }, [userId, apiPath])

  // Upsert co dãn + ẩn cột + ghim cột lên D1 (debounce ~800ms, chỉ riêng account đang đăng nhập)
  useEffect(() => {
    if (!userId) return
    const timer = setTimeout(() => {
      const dirty: Record<string, any> = { ...colWidths }
      if (hiddenCols.length) dirty.__hidden = hiddenCols
      if (pinCols.length) dirty.__pins = pinCols
      if (JSON.stringify(saveRef.current) === JSON.stringify(dirty)) return
      saveRef.current = dirty
      apiPut(`/user-prefs/cols`, { user_id: userId, page: apiPath, data: dirty }).catch(() => {})
    }, 800)
    return () => clearTimeout(timer)
  }, [colWidths, hiddenCols, pinCols, userId, apiPath])

  const isAdmin: boolean = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('auth_user') || 'null')
      return !!u?.is_admin
    } catch { return false }
  })()

  const saveAsDefault = async () => {
    try {
      const data: Record<string, any> = { ...colWidths }
      await apiPut(`/user-prefs/cols`, { user_id: userId, page: apiPath, data, is_default: true })
      alert('Đã lưu co dãn cột làm mặc định toàn cục.')
    } catch (e: any) { alert(`Lỗi: ${e.message}`) }
  }

  const visibleCols = columns.filter(c => !c.hidden && !hiddenCols.includes(c.key))
  // Cột hiển thị theo thứ tự: cột ghim đưa lên đầu (theo thứ tự trong bảng), rồi đến cột còn lại.
  // Giúp cột ghim luôn nằm bên trái cùng và "chết" khi cuộn ngang, giống Excel freeze panes.
  const displayCols = [...visibleCols.filter(c => pinCols.includes(c.key)), ...visibleCols.filter(c => !pinCols.includes(c.key))]
  const perRow = Math.max(1, columnsPerRow || 1)
  const fetchLimit = limit * perRow
  const curRowPad = ROW_PAD[rowHeight] || ROW_PAD.md

  // Mặc định ghim cột title (cột hiển thị đầu tiên) khi chưa có cấu hình ghim nào (localStorage/D1) từng lưu.
  useEffect(() => {
    if (defaultPinDone.current) return
    if (!visibleCols.length) return
    defaultPinDone.current = true
    const hasSaved = (() => {
      try { return localStorage.getItem(STORAGE_PIN(apiPath)) !== null } catch { return false }
    })()
    if (!hasSaved && pinCols.length === 0) {
      setPinCols([visibleCols[0].key])
    }
  }, [visibleCols, apiPath])

  // Default column width based on title text length
  const getDefaultColWidth = (c: Column): number => {
    if (c.width) return parseInt(c.width) || 80
    const base = c.label.length * 8 + 44
    if (c.unit) return Math.max(base, 90)
    return Math.max(base, 60)
  }

  const getColWidth = (c: Column): string => {
    if (colWidths[c.key]) return colWidths[c.key] + 'px'
    return getDefaultColWidth(c) + 'px'
  }

  // Cột ghim: cột ghim đưa lên đầu (displayCols) → offset sticky = tổng độ rộng các cột ghim đứng trước (liên tục từ 0).
  // Dùng cho cả header + body.
  const pinnedOffsets: Record<string, number> = {}
  let pinAcc = 0
  for (const c of displayCols) {
    if (pinCols.includes(c.key)) {
      pinnedOffsets[c.key] = pinAcc
      pinAcc += (colWidths[c.key] || getDefaultColWidth(c))
    } else {
      pinnedOffsets[c.key] = -1
    }
  }
  const isPinned = (c: Column) => (pinnedOffsets[c.key] ?? -1) >= 0
  // style bổ sung cho header + ô dữ liệu cột ghim: sticky, nền đục (che cột cuộn phía sau), vạch phải.
  const pinThStyle = (c: Column): React.CSSProperties => ({
    position: 'sticky',
    top: 0,
    zIndex: isPinned(c) ? 30 : 20,
    ...(isPinned(c) ? { left: pinnedOffsets[c.key], boxShadow: 'inset -1px 0 0 rgba(0,0,0,0.08)' } : {}),
  })
  const pinTdStyle = (c: Column): React.CSSProperties => isPinned(c)
    ? { position: 'sticky', left: pinnedOffsets[c.key], zIndex: 10, boxShadow: 'inset -1px 0 0 rgba(0,0,0,0.08)' }
    : {}

  // Màu nền nhóm cột (tint cấu hình trên Column): header đậm hơn, ô dữ liệu nhạt hơn.
  // Cột ghim cần nền ĐỤC (trộn tint với nền nền, không có tint thì dùng màu nền gốc) để che cột cuộn phía sau.
  // Header luôn dùng nền đục để che hàng cuộn phía sau khi giữ đầu bảng.
  const groupThBg = (c: Column) => solidMix(colors.surfaceSecondary, c.tint, 0.18)
  const groupTdBg = (c: Column) => isPinned(c)
    ? solidMix(colors.card, c.tint, 0.08)
    : tintBg(c.tint, 0.06)

  // Column resize ref
  const colResize = useRef<{ key: string; startX: number; startW: number } | null>(null)

  const startColResize = (key: string, e: React.MouseEvent) => {
    e.preventDefault()
    const col = columns.find(c => c.key === key)
    const startX = e.clientX
    const startW = colWidths[key] || (col ? getDefaultColWidth(col) : 80)
    colResize.current = { key, startX, startW }

    const onMove = (ev: MouseEvent) => {
      if (!colResize.current) return
      const diff = ev.clientX - colResize.current.startX
      setColWidths(prev => ({ ...prev, [colResize.current!.key]: Math.max(50, colResize.current!.startW + diff) }))
    }
    const onUp = () => {
      colResize.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const fetchData = useCallback(async () => {
    if (demoMode) {
      // Chế độ demo: lọc + phân trang ngay trên dữ liệu mẫu, không gọi backend
      setLoading(false); setError(null)
      let rows = (localRows || []).slice()
      if (search) {
        const q = search.toLowerCase()
        rows = rows.filter(r => Object.values(r).some(v => v !== null && v !== undefined && String(v).toLowerCase().includes(q)))
      }
      for (const [key, val] of Object.entries(filters)) {
        if (!val.trim()) continue
        rows = rows.filter(r => {
          const rv = r[key]
          if (val.includes('|')) {
            const [from, to] = val.split('|')
            const n = Number(rv)
            if (from !== '' && (isNaN(n) || n < Number(from))) return false
            if (to !== '' && (isNaN(n) || n > Number(to))) return false
            return true
          }
          if (val === '__gt0') return Number(rv) > 0
          if (val === '__gte0') return Number(rv) >= 0
          if (val === '__eq0') return Number(rv) === 0
          if (val === '__lt0') return Number(rv) < 0
          if (val === '__lte0') return Number(rv) <= 0
          if (val === '__notnull') return rv !== null && rv !== undefined && rv !== ''
          if (val === '__null') return rv === null || rv === undefined
          if (val === '__empty') return rv === null || rv === undefined || rv === '' || rv === 0
          if (val.startsWith('=')) return String(rv ?? '') === val.slice(1)
          return String(rv ?? '').toLowerCase().includes(val.trim().toLowerCase())
        })
      }
      if (sortKey) {
        const dir = sortDir === 'desc' ? -1 : 1
        rows.sort((a, b) => naturalCompare(a[sortKey], b[sortKey]) * dir)
      }
      setTotal(rows.length)
      setData(rows.slice(offset, offset + fetchLimit))
      return
    }
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('limit', String(fetchLimit)); params.set('offset', String(offset))

      for (const [key, val] of Object.entries(filters)) {
        if (val.trim()) params.set(`filter_${key}`, val.trim())
      }
      if (sortKey) { params.set('sort_col', sortKey); params.set('sort_dir', sortDir) }
      if (extraFilters) {
        for (const [key, val] of Object.entries(extraFilters)) {
          if (val) params.set(`filter_${key}`, val)
        }
      }

      const res = await apiGet(`${apiPath}?${params}`)
      setData(res.data || []); setTotal(res.total || 0)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [apiPath, search, limit, offset, filters, extraFilters, demoMode, localRows, sortKey, sortDir])

  useEffect(() => { fetchData() }, [fetchData])

  // Nhảy về đầu bảng (trên + trái) khi đổi trang / lọc / tìm / sắp xếp — giống Excel, không giữ vị trí scroll cũ.
  const wrapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    wrapRef.current?.scrollTo({ top: 0, left: 0 })
  }, [offset, search, sortKey, sortDir, filters])

  const handleSearch = (value: string) => { setSearch(value); setOffset(0) }

  const handleExport = async (format: 'excel' | 'json') => {
    setExporting(true)
    try {
      const exportFormat = format === 'excel' ? 'excel' : 'json'
      if (demoMode) {
        // Chế độ demo: xuất file từ dữ liệu hiện có, không gọi backend
        const rows: any[] = data
        if (rows.length === 0) throw new Error('Không có dữ liệu để xuất')
        const headers = Object.keys(rows[0])
        const escape = (v: any) => {
          const s = v === null || v === undefined ? '' : String(v)
          return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
        }
        const body = exportFormat === 'json'
          ? JSON.stringify(rows, null, 2)
          : [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n')
        const blob = new Blob([exportFormat === 'json' ? body : '\ufeff' + body], { type: exportFormat === 'json' ? 'application/json' : 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const prefix = exportName || apiPath.replace(/\//g, '_')
        a.download = `${prefix}_${new Date().toISOString().split('T')[0]}.${exportFormat === 'json' ? 'json' : 'csv'}`
        a.click()
        URL.revokeObjectURL(url)
        return
      }
      const res = await fetch(`${API_BASE}/export/${exportFormat}${apiPath}`)
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Export failed') }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = format === 'excel' ? 'xlsx' : 'json'
      const prefix = exportName || apiPath.replace(/\//g, '_')
      a.download = `${prefix}_${new Date().toISOString().split('T')[0]}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) { setError(e.message) }
    finally { setExporting(false) }
  }

  const handleExportCsv = async () => {
    setExportingCsv(true)
    try {
      let rows: any[]
      if (demoMode) {
        rows = data
      } else {
        const res = await fetch(`${API_BASE}/export/json${apiPath}`)
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Export failed') }
        const payload = await res.json()
        rows = payload.data || []
      }
      if (rows.length === 0) throw new Error('Không có dữ liệu để xuất CSV')
      const headers = Object.keys(rows[0])
      const escape = (v: any) => {
        const s = v === null || v === undefined ? '' : String(v)
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
      }
      const csv = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n')
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const prefix = exportName || apiPath.replace(/\//g, '_')
      a.download = `${prefix}_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) { setError(e.message) }
    finally { setExportingCsv(false) }
  }

  const totalPages = Math.ceil(total / fetchLimit)
  const currentPage = Math.floor(offset / fetchLimit) + 1

  const editableCols = columns.filter(c => !c.computed)

  const openCreate = () => {
    const initial: any = {}
    editableCols.forEach(c => { if (!AUTO_FIELDS.includes(c.key)) initial[c.key] = '' })
    setEditItem(null); setFormData(initial); setFormError(null); setModalOpen(true)
  }

  const openEdit = (item: any) => {
    const form: any = {}
    editableCols.forEach(c => { if (!AUTO_FIELDS.includes(c.key)) form[c.key] = item[c.key] ?? '' })
    setEditItem(item); setFormData(form); setFormError(null); setFormHistory(null); setModalOpen(true)
    const loadHist = historyInForm
      ? historyInForm.get(item)
      : logBang
        ? apiGet(`/chiet-khau/log?bang=${encodeURIComponent(logBang)}&ref_id=${item.id}&limit=100`).then((r: any) => r.data || []).catch(() => [])
        : Promise.resolve(null)
    loadHist.then(hs => setFormHistory(hs as any[])).catch(() => setFormHistory([]))
  }

  const handleSave = async () => {
    const payload: any = {}
    for (const c of editableCols) {
      if (AUTO_FIELDS.includes(c.key)) continue
      if (c.required && !formData[c.key]) { setFormError(`"${c.label}" là bắt buộc`); return }
      if (formData[c.key] !== '') payload[c.key] = c.type === 'number' ? Number(formData[c.key]) : formData[c.key]
    }
    payload.updated_by = user?.ten || null
    setSaving(true); setFormError(null)
    try {
      if (demoMode) {
        if (editItem) {
          setLocalRows(prev => (prev || []).map(r => (r.id === editItem.id ? { ...r, ...payload } : r)))
        } else {
          const cur = localRows || []
          const newId = cur.length ? Math.max(...cur.map(r => Number(r.id) || 0)) + 1 : 1
          setLocalRows([...cur, { ...payload, id: newId }])
        }
      } else if (editItem) { await apiPatch(`${apiPath}/${editItem.id}`, payload) }
      else { await apiPost(apiPath, payload) }
      setModalOpen(false); fetchData()
    } catch (e: any) { setFormError(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      if (demoMode) {
        setLocalRows(prev => (prev || []).filter(r => r.id !== confirmDelete.id))
      } else {
        await apiDelete(`${apiPath}/${confirmDelete.id}`)
      }
      setConfirmDelete(null)
      if (data.length === 1 && offset > 0) setOffset(offset - fetchLimit)
      else fetchData()
    } catch (e: any) { setError(e.message) }
    finally { setDeleting(false) }
  }

  const updateFormField = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }))
  }

  const startInlineEdit = (row: any, col: Column) => {
    if (AUTO_FIELDS.includes(col.key) || col.computed) return
    setInlineEdit({ rowId: row.id, colKey: col.key, value: row[col.key] ?? '' })
    setTimeout(() => inlineRef.current?.focus(), 50)
  }

  const saveInline = async () => {
    if (!inlineEdit) return
    const payload: any = {}
    payload[inlineEdit.colKey] = inlineEdit.value
    payload.updated_by = user?.ten || null
    try {
      if (demoMode) {
        setLocalRows(prev => (prev || []).map(r => (r.id === inlineEdit.rowId ? { ...r, ...payload } : r)))
      } else {
        await apiPatch(`${apiPath}/${inlineEdit.rowId}`, payload)
      }
      setInlineEdit(null)
      fetchData()
    } catch (e: any) {
      setError(e.message)
      setInlineEdit(null)
    }
  }

  const cancelInline = () => setInlineEdit(null)

  const zoomLevels = [
    { key: 'sm', label: 'Nhỏ', icon: '−' },
    { key: 'md', label: 'Vừa', icon: '±' },
    { key: 'lg', label: 'Lớn', icon: '+' },
  ]

  const thPad = { padding: curRowPad.th }
  const tdPad = { padding: curRowPad.td }

  const hasAction = canEdit || (onRowAction && rowActionLabel) || (rowActions && rowActions.length > 0)

  const renderDataCell = (row: any, c: Column, ci: number, blockIdx: number) => {
    const isLast = blockIdx === perRow - 1 && ci === displayCols.length - 1
    if (!row) return <td key={`e-${blockIdx}-${c.key}`} style={{ ...(isLast ? tCellLast : tCell), ...tdPad }} />
    const isEditing = inlineEdit && inlineEdit.rowId === row.id && inlineEdit.colKey === c.key
    const gBg = groupTdBg(c)
    const pinS = pinTdStyle(c)
    return (
      <td key={`${blockIdx}-${c.key}`} style={{
        ...(isLast ? tCellLast : tCell), ...tdPad,
        ...(c.type === 'number' ? { textAlign: 'right' as const } : {}),
        cursor: AUTO_FIELDS.includes(c.key) ? 'default' : (editMode ? 'text' : 'pointer'),
        ...pinS, ...(gBg ? { background: gBg } : {}),
      }}
        {...(canEdit ? (editMode ? { onClick: () => startInlineEdit(row, c) } : { onDoubleClick: () => startInlineEdit(row, c) }) : {})}
      >
        {isEditing ? (
          c.type === 'select' && c.options ? (
            <select ref={inlineRef as any} style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${colors.primary}`, borderRadius: 4, padding: '2px 4px', fontSize: 13, outline: 'none' }}
              value={inlineEdit?.value ?? ''}
              onChange={e => {
                const val = e.target.value
                setInlineEdit(prev => prev ? { ...prev, value: val } : null)
                apiPatch(`${apiPath}/${inlineEdit!.rowId}`, { [inlineEdit!.colKey]: val, updated_by: user?.ten || null })
                  .then(() => { setInlineEdit(null); fetchData() })
                  .catch(e => { setError(e.message); setInlineEdit(null) })
              }}
              onBlur={() => setInlineEdit(null)}
              autoFocus
            >
              {c.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input ref={inlineRef as any} type={c.type === 'number' ? 'number' : 'text'}
              style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${colors.primary}`, borderRadius: 4, padding: '2px 4px', fontSize: 13, outline: 'none', textAlign: c.type === 'number' ? 'right' : 'left' }}
              value={inlineEdit?.value ?? ''}
              onChange={e => setInlineEdit(prev => prev ? { ...prev, value: c.type === 'number' ? Number(e.target.value) : e.target.value } : null)}
              onBlur={saveInline}
              onKeyDown={e => { if (e.key === 'Enter') saveInline(); if (e.key === 'Escape') cancelInline() }}
              autoFocus
            />
          )
        ) : (
          c.render ? c.render(row[c.key], row) : (c.type === 'number' ? formatNum(row[c.key], c.unit) : row[c.key] ?? <span style={{ color: colors.textMuted }}>—</span>)
        )}
      </td>
    )
  }

  const actionBtnStyle = (tone: 'info' | 'primary' | 'danger' = 'info'): React.CSSProperties => {
    const m = {
      info: { bg: colors.infoLight, fg: colors.infoDark },
      primary: { bg: colors.primaryLight, fg: colors.primaryDark },
      danger: { bg: colors.dangerLight, fg: colors.dangerDark },
    }[tone]
    return { height: 28, padding: '0 10px', borderRadius: radius.sm, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: m.bg, color: m.fg, transition: 'background 120ms, color 120ms' }
  }

  const renderActions = (row: any, isLast: boolean) => (
    <td style={{ ...(isLast ? tCellLast : tCell), ...tdPad, whiteSpace: 'nowrap' }}>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
        {onRowAction && rowActionLabel && (
          <button style={actionBtnStyle('info')} onClick={() => onRowAction(row)}>{rowActionLabel}</button>
        )}
        {(rowActions || []).map(a => (
          <button key={a.label} style={actionBtnStyle(a.tone || 'info')} onClick={() => a.onClick(row)}>{a.label}</button>
        ))}
        {canEdit && (
          <>
            <button style={actionBtnStyle('primary')} onClick={() => openEdit(row)}>Sửa</button>
            <button style={actionBtnStyle('danger')} onClick={() => setConfirmDelete(row)}>Xoá</button>
          </>
        )}
      </div>
    </td>
  )

  return (
    <div style={pageContainer}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 } as React.CSSProperties}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div>
            <h1 style={pageTitle}>{title}</h1>
            <span style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>{total.toLocaleString()} bản ghi</span>
          </div>
          <div style={{ display: 'flex', gap: 3, alignItems: 'center', background: colors.surfaceSecondary, borderRadius: radius.md, padding: 3, border: `1px solid ${colors.borderLight}` }}>
            {zoomLevels.map(z => (
              <button key={z.key} style={{
                padding: '4px 10px', border: 'none', borderRadius: radius.sm, cursor: 'pointer', fontSize: 12, fontWeight: rowHeight === z.key ? 700 : 400,
                background: rowHeight === z.key ? colors.card : 'transparent', color: rowHeight === z.key ? colors.text : colors.textMuted,
                boxShadow: rowHeight === z.key ? shadow.card : 'none', transition: 'all 0.12s ease',
              }} onClick={() => setRowHeight(z.key)} title={z.label}>{z.icon}</button>
            ))}
          </div>
          {canEdit && <> <div style={{ position: 'relative' }} ref={pinRef}>
            <button style={{
              padding: '4px 12px', border: `1px solid ${pinCols.length ? colors.primary : colors.border}`, borderRadius: radius.sm, cursor: 'pointer', fontSize: 12,
              fontWeight: pinCols.length ? 600 : 400,
              background: pinCols.length ? colors.primaryLight : 'transparent', color: pinCols.length ? colors.primary : colors.textMuted,
              transition: 'all 0.12s ease', whiteSpace: 'nowrap',
            }} onClick={() => setPinPopup(v => !v)} title="Ghim cột nào đó cố định bên trái khi cuộn ngang (tick tùy chọn từng cột). Chỉ áp dụng cho account của bạn (lưu theo user đăng nhập).">
              {pinCols.length ? `📌 Ghim: ${pinCols.length} cột` : '📌 Ghim cột'}
            </button>
            {pinPopup && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200, minWidth: 240, maxHeight: 320, overflowY: 'auto',
                background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.md, boxShadow: shadow.dropdown, padding: 8,
              }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <button style={{ ...btn(colors.primary), fontSize: 11, padding: '4px 8px', height: 26 }} onClick={() => togglePinsAll(true)}>Ghim tất cả</button>
                  <button style={{ ...btn(colors.textSecondary, '#fff'), fontSize: 11, padding: '4px 8px', height: 26 }} onClick={() => togglePinsAll(false)}>Bỏ ghim</button>
                </div>
                <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 6 }}>Tick cột muốn ghim → cột cố định bên trái khi cuộn ngang:</div>
                {visibleCols.map((c) => {
                  const checkedIdx = pinCols.includes(c.key)
                  return (
                    <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 4px', borderRadius: radius.sm, fontSize: 12, cursor: 'pointer', background: checkedIdx ? colors.primaryLight : 'transparent', color: checkedIdx ? colors.primary : colors.text }}
                      onClick={() => togglePin(c.key)}>
                      <span style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${checkedIdx ? colors.primary : colors.border}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: checkedIdx ? colors.primary : 'transparent', flexShrink: 0, color: '#fff', fontSize: 10, fontWeight: 700 }}>{checkedIdx ? '✓' : ''}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{c.label}</span>
                      {c.tint && <span style={{ width: 10, height: 10, borderRadius: '50%', background: tintBg(c.tint, 1), flexShrink: 0 }} />}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div style={{ position: 'relative' }} ref={hideRef}>
            <button style={{
              padding: '4px 12px', border: `1px solid ${hiddenCols.length ? colors.warning : colors.border}`, borderRadius: radius.sm, cursor: 'pointer', fontSize: 12,
              fontWeight: hiddenCols.length ? 600 : 400,
              background: hiddenCols.length ? colors.warningLight : 'transparent', color: hiddenCols.length ? colors.warning : colors.textMuted,
              transition: 'all 0.12s ease', whiteSpace: 'nowrap',
            }} onClick={() => setHidePopup(v => !v)} title="Ẩn/hiện các cột không cần thiết. Chỉ áp dụng cho account của bạn (lưu theo user đăng nhập)">
              {hiddenCols.length ? `🙈 Ẩn: ${hiddenCols.length} cột` : '🙈 Ẩn cột'}
            </button>
            {hidePopup && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200, minWidth: 240, maxHeight: 320, overflowY: 'auto',
                background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.md, boxShadow: shadow.dropdown, padding: 8,
              }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                  <button style={{ ...btn(colors.primary), fontSize: 11, padding: '4px 8px', height: 26 }} onClick={() => setHiddenCols([])}>Hiện tất cả</button>
                </div>
                <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 6 }}>Bỏ tick cột muốn ẩn (chỉ riêng bạn):</div>
                {columns.filter(c => !c.hidden).map(c => {
                  const isHidden = hiddenCols.includes(c.key)
                  return (
                    <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 4px', borderRadius: radius.sm, fontSize: 12, cursor: 'pointer', background: isHidden ? colors.warningLight : 'transparent', color: isHidden ? colors.warning : colors.text }}
                      onClick={() => {
                        setHiddenCols(prev => isHidden ? prev.filter(k => k !== c.key) : [...prev, c.key])
                      }}>
                      <span style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${isHidden ? colors.warning : colors.border}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: isHidden ? colors.warning : 'transparent', flexShrink: 0, color: '#fff', fontSize: 10, fontWeight: 700 }}>{!isHidden ? '✓' : ''}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{c.label}</span>
                      {c.tint && <span style={{ width: 10, height: 10, borderRadius: '50%', background: tintBg(c.tint, 1), flexShrink: 0 }} />}
                    </div>
                  )
                })}
              </div>
            )}
          </div> </>}
          {canEdit && (
          <button style={{
            padding: '4px 12px', border: `1px solid ${editMode ? colors.primary : colors.border}`, borderRadius: radius.sm, cursor: 'pointer', fontSize: 12, fontWeight: editMode ? 600 : 400,
            background: editMode ? colors.primaryLight : 'transparent', color: editMode ? colors.primary : colors.textMuted,
            transition: 'all 0.12s ease', whiteSpace: 'nowrap',
          }} onClick={() => setEditMode(v => !v)} title="Bật/tắt chế độ sửa nhanh">
            {editMode ? '✎ Đang sửa' : '✎ Sửa'}
          </button>
          )}
          {isAdmin && (
            <button style={{
              padding: '4px 12px', border: `1px solid ${colors.border}`, borderRadius: radius.sm, cursor: 'pointer', fontSize: 12, fontWeight: 500,
              background: 'transparent', color: colors.textMuted, transition: 'all 0.12s ease', whiteSpace: 'nowrap',
            }} onClick={saveAsDefault} title="Lưu co dãn cột hiện tại làm mặc định cho mọi người dùng">
              🎯 Lưu mặc định
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' } as React.CSSProperties}>
          {searchable && (
            <input style={{ ...input, minWidth: 200 }} placeholder="Tìm kiếm..." value={search} onChange={(e) => handleSearch(e.target.value)} />
          )}
          {canEdit && <button style={{ ...btn(colors.primary), fontWeight: 600 }} onClick={openCreate}>+ Thêm</button>}
          <button style={{ ...btn(colors.success), fontWeight: 500 }} onClick={() => handleExport('excel')} disabled={exporting}>Excel</button>
          <button style={{ ...btn(colors.info), fontWeight: 500 }} onClick={handleExportCsv} disabled={exportingCsv}>CSV</button>
          <button style={{ ...btn(colors.info), fontWeight: 500 }} onClick={() => handleExport('json')} disabled={exporting}>JSON</button>
        </div>
      </div>

      {error && <div style={{ padding: 14, background: colors.dangerLight, color: colors.danger, borderRadius: radius.md, marginBottom: 16, border: `1px solid ${colors.danger}22` }}>{error}</div>}

      {loading ? (
        <div style={spinner}>Đang tải...</div>
      ) : (
        <>
          <style>{`.dg-tbl tbody tr:hover{background:${colors.surfaceSecondary}} .dg-tbl tbody tr:last-child td{border-bottom:none}`}</style>
          <div ref={wrapRef} className="dg-wrap" style={{ overflowX: 'auto', overflowY: 'auto', maxWidth: '100%', maxHeight: 'calc(100vh - 230px)', background: colors.card, borderRadius: radius.lg, boxShadow: shadow.card, border: `1px solid ${colors.border}` }}>
            <table className="dg-tbl" style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 13, tableLayout: 'fixed', minWidth: '100%', width: 'max-content' }}>
              <thead>
                <tr>
                  {perRow > 1 ? Array.from({ length: perRow }).map((_, b) => (
                    <Fragment key={`hdr-${b}`}>
                      {b > 0 && <th style={{ ...tHead, width: 14, ...thPad, background: colors.surfaceSecondary, fontSize: 9, textAlign: 'center', color: colors.textMuted, position: 'sticky', top: 0, zIndex: 20 }} />}
                      {displayCols.map((c, idx) => {
                        const isLastCol = b === perRow - 1 && idx === displayCols.length - 1 && !hasAction
                        const w = getColWidth(c)
                        const canFilter = b === 0 && (!c.computed || c.filterable || (c.computed && c.type === 'select'))
                        const activeSort = sortKey === c.key
                        const sortMark = activeSort ? (sortDir === 'desc' ? '▼' : '▲') : '⇅'
                        const vals = canFilter ? colValues(c) : []
                        const gBg = groupThBg(c)
                        const pinS = pinThStyle(c)
                        return (
                           <th key={`${b}-${c.key}`} style={{ ...(isLastCol ? { ...tHeadLast, width: w } : { ...tHead, width: w }), ...thPad, position: 'relative', userSelect: 'none', ...pinS, ...(gBg ? { background: gBg } : {}) }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                               <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => toggleSort(c.key)} title="Bấm để sắp xếp">
                                 {isPinned(c) && <span style={{ fontSize: 9, marginRight: 2 }}>📌</span>}
                                 {c.label}
                                 {c.unit && <span style={{ fontWeight: 400, fontSize: 10, color: colors.textMuted, display: 'block', marginTop: 1 }}>{c.unit}</span>}
                               </div>
                               <span style={{ fontSize: 9, color: activeSort ? colors.primary : colors.textMuted, flexShrink: 0, fontWeight: activeSort ? 700 : 400, cursor: 'pointer' }} onClick={() => toggleSort(c.key)}>{sortMark}</span>
                               {canFilter && <span style={{ fontSize: 9, color: filters[c.key] ? colors.primary : colors.textMuted, opacity: 0.5, flexShrink: 0, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setOpenFilter(openFilter === c.key ? null : c.key) }}>▼</span>}
                               {canFilter && filters[c.key] && <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.primary, display: 'inline-block', flexShrink: 0 }} />}
                             </div>
                             {canFilter && openFilter === c.key && (
                               <FilterDropdown col={c} value={filters[c.key] || ''} values={vals} onChange={(v) => { setFilters(prev => ({ ...prev, [c.key]: v })); setOffset(0) }} onClose={() => setOpenFilter(null)} />
                             )}
                             {b === 0 && <div className="dg-rz" onMouseDown={(e) => startColResize(c.key, e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 10, zIndex: 10, cursor: 'col-resize' }} />}
                           </th>
                        )
                      })}
                      {hasAction && (
                      <th style={{ ...tHead, width: 90, ...thPad, whiteSpace: 'nowrap' }}>Tác vụ</th>
                      )}
                    </Fragment>
                  )) : (
                  <>
                  {displayCols.map((c, idx) => {
                    const w = getColWidth(c)
                    const canFilter = !c.computed || c.filterable || (c.computed && c.type === 'select')
                    const activeSort = sortKey === c.key
                    const sortMark = activeSort ? (sortDir === 'desc' ? '▼' : '▲') : '⇅'
                    const vals = canFilter ? colValues(c) : []
                    const gBg = groupThBg(c)
                    const pinS = pinThStyle(c)
                    return (
                       <th key={c.key} style={{
                         ...(idx === displayCols.length - 1 ? { ...tHeadLast, width: w } : { ...tHead, width: w }),
                         ...thPad, position: 'relative', userSelect: 'none', ...pinS,
                         ...(gBg ? { background: gBg } : {}),
                       }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                           <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => toggleSort(c.key)} title="Bấm để sắp xếp">
                             {isPinned(c) && <span style={{ fontSize: 9, marginRight: 2 }}>📌</span>}
                             {c.label}
                             {c.unit && <span style={{ fontWeight: 400, fontSize: 10, color: colors.textMuted, display: 'block', marginTop: 1 }}>{c.unit}</span>}
                           </div>
                           <span style={{ fontSize: 9, color: activeSort ? colors.primary : colors.textMuted, flexShrink: 0, fontWeight: activeSort ? 700 : 400, cursor: 'pointer' }} onClick={() => toggleSort(c.key)}>{sortMark}</span>
                           {canFilter && <span style={{ fontSize: 9, color: filters[c.key] ? colors.primary : colors.textMuted, opacity: 0.5, flexShrink: 0, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setOpenFilter(openFilter === c.key ? null : c.key) }}>▼</span>}
                           {canFilter && filters[c.key] && <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.primary, display: 'inline-block', flexShrink: 0 }} />}
                         </div>
                         {canFilter && openFilter === c.key && (
                           <FilterDropdown col={c} value={filters[c.key] || ''} values={vals} onChange={(v) => { setFilters(prev => ({ ...prev, [c.key]: v })); setOffset(0) }} onClose={() => setOpenFilter(null)} />
                         )}
                         <div className="dg-rz" onMouseDown={(e) => startColResize(c.key, e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 10, zIndex: 40, cursor: 'col-resize' }} />
                       </th>
                    )
                  })}
                    {hasAction && (
                    <th style={{ ...tHeadLast, width: 90, ...thPad, whiteSpace: 'nowrap' }}>Tác vụ</th>
                    )}
                  </>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={perRow * (displayCols.length + (hasAction ? 1 : 0)) + (perRow - 1)} style={{ ...tableStyle.td, ...tdPad, textAlign: 'center', padding: 48, color: colors.textMuted }}>Không có dữ liệu</td></tr>
                ) : perRow > 1 ? (
                  Array.from({ length: Math.ceil(data.length / perRow) }).map((_, gi) => (
                    <tr key={`rg-${gi}`} style={{ transition: 'background 80ms' }}>
                      {Array.from({ length: perRow }).map((_, b) => {
                        const row = data[gi * perRow + b]
                        return (
                          <Fragment key={`blk-${gi}-${b}`}>
                            {b > 0 && <td style={{ ...tCell, width: 14, ...tdPad, background: colors.surfaceSecondary }} />}
                            {displayCols.map((c, ci) => renderDataCell(row, c, ci, b))}
                            {hasAction && renderActions(row, b === perRow - 1)}
                          </Fragment>
                        )
                      })}
                    </tr>
                  ))
                ) : data.map((row: any) => (
                  <tr key={row.id} style={{ transition: 'background 80ms' }}>
                    {displayCols.map((c, ci) => {
                      const isEditing = inlineEdit && inlineEdit.rowId === row.id && inlineEdit.colKey === c.key
                      const gBg = groupTdBg(c)
                      const pinS = pinTdStyle(c)
                      return (
                      <td key={c.key} style={{ ...(ci === displayCols.length - 1 ? tCellLast : tCell), ...tdPad, ...(c.type === 'number' ? { textAlign: 'right' as const } : {}), cursor: AUTO_FIELDS.includes(c.key) ? 'default' : (editMode ? 'text' : 'pointer'), ...pinS, ...(gBg ? { background: gBg } : {}) }}
                        {...(canEdit ? (editMode ? { onClick: () => startInlineEdit(row, c) } : { onDoubleClick: () => startInlineEdit(row, c) }) : {})}
                      >
                        {isEditing ? (
                          c.type === 'select' && c.options ? (
                            <select ref={inlineRef as any} style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${colors.primary}`, borderRadius: 4, padding: '2px 4px', fontSize: 13, outline: 'none' }}
                              value={inlineEdit?.value ?? ''}
                              onChange={e => {
                                const val = e.target.value
                                setInlineEdit(prev => prev ? { ...prev, value: val } : null)
                                // Save immediately on change (blur fires before onChange for selects)
                                apiPatch(`${apiPath}/${inlineEdit!.rowId}`, { [inlineEdit!.colKey]: val, updated_by: user?.ten || null })
                                  .then(() => { setInlineEdit(null); fetchData() })
                                  .catch(e => { setError(e.message); setInlineEdit(null) })
                              }}
                              onBlur={() => setInlineEdit(null)}
                              autoFocus
                            >
                              {c.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          ) : (
                            <input ref={inlineRef as any} type={c.type === 'number' ? 'number' : 'text'}
                              style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${colors.primary}`, borderRadius: 4, padding: '2px 4px', fontSize: 13, outline: 'none', textAlign: c.type === 'number' ? 'right' : 'left' }}
                              value={inlineEdit?.value ?? ''}
                              onChange={e => setInlineEdit(prev => prev ? { ...prev, value: c.type === 'number' ? Number(e.target.value) : e.target.value } : null)}
                              onBlur={saveInline}
                              onKeyDown={e => { if (e.key === 'Enter') saveInline(); if (e.key === 'Escape') cancelInline() }}
                              autoFocus
                            />
                          )
                        ) : (
                          c.render ? c.render(row[c.key], row) : (c.type === 'number' ? formatNum(row[c.key], c.unit) : row[c.key] ?? <span style={{ color: colors.textMuted }}>—</span>)
                        )}
                      </td>
                    )})}
                    {hasAction && (
                    <td style={{ ...tCellLast, ...tdPad, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        {onRowAction && rowActionLabel && (
                          <button style={actionBtnStyle('info')} onClick={() => onRowAction(row)}>{rowActionLabel}</button>
                        )}
                        {(rowActions || []).map(a => (
                          <button key={a.label} style={actionBtnStyle(a.tone || 'info')} onClick={() => a.onClick(row)}>{a.label}</button>
                        ))}
                        {canEdit && (
                          <>
                            <button style={actionBtnStyle('primary')} onClick={() => openEdit(row)}>Sửa</button>
                            <button style={actionBtnStyle('danger')} onClick={() => setConfirmDelete(row)}>Xoá</button>
                          </>
                        )}
                      </div>
                    </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 16, fontSize: 13, color: colors.textMuted,
            background: colors.card, padding: '12px 16px', borderRadius: radius.lg, boxShadow: shadow.card,
            border: `1px solid ${colors.border}`,
          } as React.CSSProperties}>
            <span>Tổng: <strong>{total.toLocaleString()}</strong> bản ghi · {perRow > 1 ? `${limit} dòng/trang × ${perRow} cột` : `${limit} dòng/trang`}</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button style={{
                minWidth: 30, height: 30, padding: '0 8px', border: `1px solid ${colors.border}`, borderRadius: radius.sm,
                background: colors.card, color: currentPage <= 1 ? colors.textDisabled : colors.textSecondary, cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', fontSize: 12.5, fontWeight: 500,
                transition: 'background 100ms, color 100ms',
              }} disabled={currentPage <= 1} onClick={() => setOffset(offset - fetchLimit)}>← Trước</button>
              {(totalPages > 10 ? buildPageList(currentPage, totalPages) : Array.from({ length: totalPages }, (_, i) => i + 1)).map((p, i) =>
                p === -1
                  ? <span key={`ellipsis-${i}`} style={{ color: colors.textMuted, fontSize: 13 }}>…</span>
                  : <button key={p} style={{
                      minWidth: 30, height: 30, padding: '0 8px', border: `1px solid ${p === currentPage ? colors.primary : colors.border}`, borderRadius: radius.sm,
                      background: p === currentPage ? colors.primary : colors.card, color: p === currentPage ? '#fff' : colors.textSecondary, cursor: 'pointer', fontSize: 12.5, fontWeight: p === currentPage ? 600 : 500,
                      transition: 'background 100ms, color 100ms',
                    }} onClick={() => setOffset((p - 1) * fetchLimit)}>{p}</button>
              )}
              <span>Trang <strong>{currentPage}</strong> / {totalPages || 1}</span>
              <button style={{
                minWidth: 30, height: 30, padding: '0 8px', border: `1px solid ${colors.border}`, borderRadius: radius.sm,
                background: colors.card, color: currentPage >= totalPages ? colors.textDisabled : colors.textSecondary, cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', fontSize: 12.5, fontWeight: 500,
                transition: 'background 100ms, color 100ms',
              }} disabled={currentPage >= totalPages} onClick={() => setOffset(offset + fetchLimit)}>Sau →</button>
            </div>
          </div>
        </>
      )}

      <Modal open={modalOpen} title={editItem ? `Sửa ${title}` : `Thêm ${title}`} onClose={() => setModalOpen(false)} wide>
        {formError && <div style={{ padding: 14, background: colors.dangerLight, color: colors.danger, borderRadius: radius.md, marginBottom: 16, border: `1px solid ${colors.danger}22` }}>{formError}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px 16px' }}>
          {columns.filter(c => !AUTO_FIELDS.includes(c.key)).map(c => (
            <div key={c.key}>
              <label style={{ display: 'block', marginBottom: 5, fontSize: 12, fontWeight: 500, color: colors.textSecondary }}>
                {c.label}{c.required ? <span style={{ color: colors.danger }}> *</span> : null}{c.computed ? <span style={{ color: colors.textDisabled, fontWeight: 400 }}> (tự tính)</span> : null}
              </label>
              {c.computed ? (
                <div style={{ ...input, width: '100%', boxSizing: 'border-box', background: colors.surfaceSecondary, color: colors.textSecondary, display: 'flex', alignItems: 'center', minHeight: 34 }}>
                  {(() => {
                    const base = editItem ? { ...editItem, ...formData } : formData
                    const v = c.render ? c.render(base[c.key], base) : (base[c.key] ?? '—')
                    return <span>{v ?? '—'}</span>
                  })()}
                </div>
              ) : c.renderForm ? (
                c.renderForm(formData[c.key], (v) => updateFormField(c.key, v))
              ) : c.type === 'select' && c.options ? (
                <select style={{ ...input, width: '100%', boxSizing: 'border-box', background: '#fff' }} value={formData[c.key] ?? ''} onChange={(e) => updateFormField(c.key, e.target.value)}>
                  <option value="">-- Chọn --</option>
                  {c.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input style={{ ...input, width: '100%', boxSizing: 'border-box' }} type={c.type === 'number' ? 'number' : 'text'} value={formData[c.key] ?? ''} onChange={(e) => updateFormField(c.key, c.type === 'number' ? Number(e.target.value) : e.target.value)} />
              )}
            </div>
          ))}
        </div>
        {(historyInForm || logBang) && editItem && (
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${colors.borderLight}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Lịch sử thay đổi</span>
              {formHistory && (
                <span style={{ fontSize: 12, color: colors.textMuted }}>{formHistory.length} lần thay đổi</span>
              )}
            </div>
            {formHistory === null ? (
              <div style={{ fontSize: 13, color: colors.textMuted, padding: '6px 0' }}>Đang tải...</div>
            ) : formHistory.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.textMuted, padding: '6px 0' }}>Chưa có lịch sử thay đổi.</div>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', maxHeight: 160, overflowY: 'auto' }}>
                {formHistory.map((h, i) => (
                  <li key={i} style={{ padding: '5px 0', borderBottom: i < formHistory.length - 1 ? `1px solid ${colors.borderLight}` : 'none', fontSize: 12.5, color: colors.text }}>
                    {historyInForm ? historyInForm.format(h) : `${h.created_at} · ${h.cot}: ${h.gia_tri_cu || '—'} → ${h.gia_tri_moi || '—'}` + (h.updated_by ? ` (${h.updated_by})` : '')}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 14, borderTop: `1px solid ${colors.borderLight}` }}>
          <button style={{ height: 32, padding: '0 12px', background: colors.card, color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: radius.sm, cursor: 'pointer', fontSize: 12.5, fontWeight: 500, transition: 'background 100ms, color 100ms' }} onClick={() => setModalOpen(false)} disabled={saving}>Huỷ</button>
          <button style={{ height: 32, padding: '0 12px', background: colors.primary, color: '#fff', border: 'none', borderRadius: radius.sm, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, transition: 'background 120ms' }} onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete !== null}
        message={`Xác nhận xoá bản ghi này?`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={deleting}
      />
    </div>
  )
}