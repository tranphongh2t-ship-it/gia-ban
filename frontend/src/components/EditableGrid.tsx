import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { colors, shadow, radius, btn, input, tableStyle } from '../theme'

export interface EditableCol {
  key: string
  label: string
  width?: number
  minWidth?: number
  readOnly?: boolean
  type?: 'text' | 'number' | 'select'
  options?: { value: string; label: string }[]
  render?: (value: any, row: any) => any
  group?: string
  tint?: string
}

export interface GroupTab {
  key: string
  label: string
  color?: string
}

interface EditableGridProps {
  columns: EditableCol[]
  rows: any[]
  rowKey: string | ((row: any) => string | number)
  draft?: Record<string, Record<string, any>>
  onDraftChange?: (rowKey: string, colKey: string, value: any) => void
  deletedKeys?: string[]
  storageKey: string
  emptyMsg?: string
  groupBy?: (row: any) => string
  groupTabs?: GroupTab[]
  suffix?: (row: any) => any
  actions?: (row: any) => any
}

const STORAGE_PIN = (k: string) => `eg_${k}_pin`
const STORAGE_HIDDEN = (k: string) => `eg_${k}_hidden`
const STORAGE_WIDTHS = (k: string) => `eg_${k}_widths`

function naturalCompare(a: any, b: any): number {
  const sa = a === null || a === undefined ? '' : String(a)
  const sb = b === null || b === undefined ? '' : String(b)
  const re = /(\d+|\D+)/g
  const aa = sa.match(re) || [], bb = sb.match(re) || []
  const n = Math.min(aa.length, bb.length)
  for (let i = 0; i < n; i++) {
    const x = aa[i], y = bb[i]
    const xn = /^\d+$/.test(x), yn = /^\d+$/.test(y)
    if (xn && yn) { const dx = parseInt(x), dy = parseInt(y); if (dx !== dy) return dx - dy }
    else if (x !== y) return x < y ? -1 : 1
  }
  return aa.length - bb.length
}

export default function EditableGrid({
  columns, rows, rowKey, draft = {}, onDraftChange, deletedKeys = [],
  storageKey, emptyMsg = 'Không có dữ liệu', groupBy, groupTabs, suffix, actions,
}: EditableGridProps) {
  const [pinCols, setPinCols] = useState<string[]>(() => {
    try { const a = JSON.parse(localStorage.getItem(STORAGE_PIN(storageKey)) || '[]'); return Array.isArray(a) ? a : [] } catch { return [] }
  })
  const [hiddenCols, setHiddenCols] = useState<string[]>(() => {
    try { const a = JSON.parse(localStorage.getItem(STORAGE_HIDDEN(storageKey)) || '[]'); return Array.isArray(a) ? a : [] } catch { return [] }
  })
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_WIDTHS(storageKey)) || '{}') } catch { return {} }
  })
  const [pinPopup, setPinPopup] = useState(false)
  const [hidePopup, setHidePopup] = useState(false)
  const [colFilters, setColFilters] = useState<Record<string, string>>({})
  const [openFilter, setOpenFilter] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [activeTab, setActiveTab] = useState<string>(groupTabs?.[0]?.key || '')
  const pinRef = useRef<HTMLDivElement>(null)
  const hideRef = useRef<HTMLDivElement>(null)
  const resizing = useRef<{ key: string; startX: number; startW: number } | null>(null)

  useEffect(() => { localStorage.setItem(STORAGE_PIN(storageKey), JSON.stringify(pinCols)) }, [pinCols, storageKey])
  useEffect(() => { localStorage.setItem(STORAGE_HIDDEN(storageKey), JSON.stringify(hiddenCols)) }, [hiddenCols, storageKey])
  useEffect(() => { localStorage.setItem(STORAGE_WIDTHS(storageKey), JSON.stringify(colWidths)) }, [colWidths, storageKey])

  useEffect(() => {
    if (!pinPopup) return
    const h = (e: MouseEvent) => { if (pinRef.current && !pinRef.current.contains(e.target as Node)) setPinPopup(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [pinPopup])
  useEffect(() => {
    if (!hidePopup) return
    const h = (e: MouseEvent) => { if (hideRef.current && !hideRef.current.contains(e.target as Node)) setHidePopup(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [hidePopup])

  const getKey = useCallback((r: any) => typeof rowKey === 'function' ? rowKey(r) : r[rowKey], [rowKey])
  const visibleCols = useMemo(() => columns.filter(c => !hiddenCols.includes(c.key)), [columns, hiddenCols])

  const onResizeStart = useCallback((key: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const curW = colWidths[key] || 120
    resizing.current = { key, startX: e.clientX, startW: curW }
    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return
      const delta = ev.clientX - resizing.current.startX
      const newW = Math.max(50, resizing.current.startW + delta)
      setColWidths(prev => ({ ...prev, [resizing.current!.key]: newW }))
    }
    const onUp = () => {
      resizing.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [colWidths])

  const getWidth = (c: EditableCol) => colWidths[c.key] || parseInt(c.width || '120')

  const displayRows = useMemo(() => {
    let result = rows
    for (const [k, v] of Object.entries(colFilters)) {
      if (!v) continue
      result = result.filter(r => String(r[k] ?? '').toLowerCase().includes(v.toLowerCase()))
    }
    if (groupTabs && groupBy && activeTab) {
      result = result.filter(r => groupBy(r) === activeTab)
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const cmp = naturalCompare(a[sortKey], b[sortKey])
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return result
  }, [rows, colFilters, sortKey, sortDir, groupTabs, groupBy, activeTab])

  const groupCounts = useMemo(() => {
    if (!groupBy || !groupTabs) return {}
    const counts: Record<string, number> = {}
    for (const r of rows) { const g = groupBy(r); counts[g] = (counts[g] || 0) + 1 }
    return counts
  }, [rows, groupBy, groupTabs])

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc')
      else { setSortKey(null); setSortDir('asc') }
    } else { setSortKey(key); setSortDir('asc') }
  }

  const cellBorder = `1px solid ${colors.tableBorder || colors.border}`
  const thStyle: React.CSSProperties = {
    ...tableStyle.th, borderRight: cellBorder,
    background: colors.surfaceSecondary, whiteSpace: 'nowrap', padding: '8px 6px 8px 12px',
    fontSize: 12.5, fontWeight: 600, textAlign: 'left', cursor: 'pointer', userSelect: 'none',
    position: 'relative',
  }
  const tdStyle: React.CSSProperties = {
    ...tableStyle.td, borderRight: cellBorder, whiteSpace: 'nowrap', padding: '6px 10px', fontSize: 12.5,
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {groupTabs && groupTabs.map(t => {
          const on = activeTab === t.key
          const count = groupCounts[t.key] || 0
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: '6px 14px', borderRadius: radius.sm, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: on ? 700 : 500,
              background: on ? (t.color || colors.primary) : colors.surfaceSecondary,
              color: on ? '#fff' : colors.textMuted, transition: 'all 120ms',
            }}>
              {t.label} <span style={{ fontSize: 10, opacity: 0.8 }}>({count})</span>
            </button>
          )
        })}
        <span style={{ width: 1, height: 20, background: colors.border, margin: '0 4px' }} />
        <div ref={pinRef} style={{ position: 'relative' }}>
          <button style={{ ...btn(pinCols.length > 0 ? colors.primary : colors.surfaceSecondary, pinCols.length > 0 ? '#fff' : colors.textMuted, 'sm'), fontSize: 12 }} onClick={() => { setPinPopup(!pinPopup); setHidePopup(false) }}>
            Ghim cột {pinCols.length > 0 ? `(${pinCols.length})` : ''}
          </button>
          {pinPopup && (
            <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, minWidth: 200, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.md, boxShadow: shadow.dropdown, padding: 8, maxHeight: 300, overflowY: 'auto' }}>
              {columns.map(c => (
                <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', cursor: 'pointer', fontSize: 12, borderRadius: radius.sm, background: pinCols.includes(c.key) ? colors.primaryLight : 'transparent' }}>
                  <input type="checkbox" checked={pinCols.includes(c.key)} onChange={() => setPinCols(prev => prev.includes(c.key) ? prev.filter(k => k !== c.key) : [...prev, c.key])} style={{ accentColor: colors.primary }} />
                  <span style={{ color: pinCols.includes(c.key) ? colors.primary : colors.text }}>{c.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div ref={hideRef} style={{ position: 'relative' }}>
          <button style={{ ...btn(hiddenCols.length > 0 ? colors.warning : colors.surfaceSecondary, hiddenCols.length > 0 ? '#fff' : colors.textMuted, 'sm'), fontSize: 12 }} onClick={() => { setHidePopup(!hidePopup); setPinPopup(false) }}>
            Ẩn cột {hiddenCols.length > 0 ? `(${hiddenCols.length})` : ''}
          </button>
          {hidePopup && (
            <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, minWidth: 200, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.md, boxShadow: shadow.dropdown, padding: 8, maxHeight: 300, overflowY: 'auto' }}>
              {columns.map(c => (
                <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', cursor: 'pointer', fontSize: 12, borderRadius: radius.sm, background: hiddenCols.includes(c.key) ? colors.warningLight : 'transparent' }}>
                  <input type="checkbox" checked={hiddenCols.includes(c.key)} onChange={() => setHiddenCols(prev => prev.includes(c.key) ? prev.filter(k => k !== c.key) : [...prev, c.key])} style={{ accentColor: colors.warning }} />
                  <span style={{ color: hiddenCols.includes(c.key) ? colors.danger : colors.text }}>{c.label}</span>
                </label>
              ))}
              {hiddenCols.length > 0 && (
                <button style={{ width: '100%', marginTop: 6, padding: '4px 8px', ...btn(colors.dangerLight, colors.danger, 'sm'), fontSize: 11 }} onClick={() => setHiddenCols([])}>Hiện tất cả</button>
              )}
            </div>
          )}
        </div>
        <span style={{ fontSize: 11, color: colors.textMuted }}>{displayRows.length} dòng</span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '75vh', background: colors.card, borderRadius: radius.lg, border: `1px solid ${colors.border}` }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12.5, width: '100%', minWidth: 'max-content' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 4 }}>
            <tr>
              {actions && <th style={{ ...thStyle, width: actions ? 90 : 0, minWidth: actions ? 90 : 0, textAlign: 'center', cursor: 'default' }}>Thao tác</th>}
              {visibleCols.map((c, ci) => {
                const pinned = pinCols.includes(c.key)
                const filterActive = !!colFilters[c.key]
                const w = getWidth(c)
                return (
                  <th key={c.key} onClick={() => toggleSort(c.key)} style={{
                    ...thStyle,
                    width: w, minWidth: c.minWidth || 60,
                    ...(pinned ? { position: 'sticky', left: actions ? 90 : 0, zIndex: 5, background: colors.surfaceSecondary } : {}),
                    ...(c.tint ? { background: `${c.tint}22` } : {}),
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingRight: 24 }}>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</span>
                      {sortKey === c.key && <span style={{ fontSize: 10 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>}
                      {filterActive && <span style={{ fontSize: 9, color: colors.primary }}>●</span>}
                    </div>
                    {/* Filter button - top right */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenFilter(openFilter === c.key ? null : c.key) }}
                      style={{ position: 'absolute', right: 10, top: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 9, color: filterActive ? colors.primary : colors.textDisabled, padding: '2px 4px', borderRadius: 3, lineHeight: 1 }}
                      title={`Lọc ${c.label}`}
                    >▼</button>
                    {/* Resize handle - far right edge */}
                    <div
                      onMouseDown={(e) => onResizeStart(c.key, e)}
                      style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 5, cursor: 'col-resize', zIndex: 6, background: 'transparent', borderRight: `2px solid ${colors.border}` }}
                      onMouseEnter={(e) => { (e.target as HTMLElement).style.borderRightColor = colors.primary }}
                      onMouseLeave={(e) => { (e.target as HTMLElement).style.borderRightColor = colors.border }}
                      title="Kéo giãn cột"
                    />
                    {openFilter === c.key && (
                      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, minWidth: 200, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.md, boxShadow: shadow.dropdown, padding: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: colors.textMuted }}>Lọc {c.label}</div>
                        <input style={{ ...input, width: '100%', padding: '6px 8px', fontSize: 12, boxSizing: 'border-box' }}
                          placeholder={`Nhập ${c.label}...`} value={colFilters[c.key] || ''}
                          onChange={e => setColFilters(prev => ({ ...prev, [c.key]: e.target.value }))} autoFocus />
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          <button style={{ flex: 1, ...btn(colors.dangerLight, colors.danger, 'sm'), fontSize: 11 }}
                            onClick={() => { setColFilters(prev => ({ ...prev, [c.key]: '' })); setOpenFilter(null) }}>✕ Xóa lọc</button>
                          <button style={{ flex: 1, ...btn(colors.primary, '#fff', 'sm'), fontSize: 11 }}
                            onClick={() => setOpenFilter(null)}>✓ Áp dụng</button>
                        </div>
                      </div>
                    )}
                  </th>
                )
              })}
              {suffix && <th style={{ ...thStyle, width: 60, minWidth: 60, cursor: 'default' }}></th>}
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 ? (
              <tr><td colSpan={visibleCols.length + (suffix ? 1 : 0) + (actions ? 1 : 0)} style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>{emptyMsg}</td></tr>
            ) : displayRows.map((r: any, ri: number) => {
              const k = getKey(r)
              const isDel = deletedKeys.includes(String(k))
              const rowDraft = draft[String(k)] || {}
              const cellBg = isDel ? colors.dangerLight : rowDraft && Object.keys(rowDraft).length > 0 ? colors.warningLight : ri % 2 === 1 ? `${colors.surfaceSecondary}44` : undefined
              return (
                <tr key={k} style={{ background: cellBg, opacity: isDel ? 0.5 : 1 }}>
                  {actions && (
                    <td style={{ ...tdStyle, width: 90, textAlign: 'center', cursor: 'default' }}>{actions(r)}</td>
                  )}
                  {visibleCols.map((c, ci) => {
                    const pinned = pinCols.includes(c.key)
                    const val = rowDraft[c.key] !== undefined ? rowDraft[c.key] : (r[c.key] ?? '')
                    const isDirty = rowDraft[c.key] !== undefined
                    const w = getWidth(c)
                    const cellBg2 = isDel ? colors.dangerLight : rowDraft && Object.keys(rowDraft).length > 0 ? colors.warningLight : colors.card
                    if (c.readOnly || c.render) {
                      return (
                        <td key={c.key} style={{ ...tdStyle, width: w, ...(pinned ? { position: 'sticky', left: actions ? 90 : 0, zIndex: 2, background: cellBg2 } : {}), fontWeight: 600 }}>
                          {c.render ? c.render(val, r) : String(val ?? '')}
                        </td>
                      )
                    }
                    return (
                      <td key={c.key} style={{ ...tdStyle, padding: '2px 4px', width: w, ...(pinned ? { position: 'sticky', left: actions ? 90 : 0, zIndex: 2, background: cellBg2 } : {}) }}>
                        {c.type === 'select' && c.options ? (
                          <select style={{ ...input, padding: '5px 6px', fontSize: 12.5, minWidth: 60, width: '100%', boxSizing: 'border-box', borderColor: isDirty ? colors.warning : colors.border }}
                            value={val} onChange={e => onDraftChange?.(String(k), c.key, e.target.value)} disabled={isDel}>
                            {c.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        ) : (
                          <input style={{ ...input, padding: '5px 6px', fontSize: 12.5, width: '100%', boxSizing: 'border-box', textAlign: c.type === 'number' ? 'right' : 'left', borderColor: isDirty ? colors.warning : colors.border }}
                            value={val} onChange={e => onDraftChange?.(String(k), c.key, e.target.value)} disabled={isDel} />
                        )}
                      </td>
                    )
                  })}
                  {suffix && <td style={{ ...tdStyle, width: 60 }}>{suffix(r)}</td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
