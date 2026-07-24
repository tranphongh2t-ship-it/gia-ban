import { useState, useEffect, useRef } from 'react'
import { apiGet, apiPost } from '../../lib/api'
import { colors, radius, shadow, input as inp, pageContainer } from '../../theme'
import { formatNum } from '../../lib/format'
import { useAuth } from '../../lib/auth'

const toDateInput = (v: string) => v ? v.split('/').reverse().join('-') : ''
const fromDateInput = (v: string) => v ? v.split('-').reverse().join('/') : ''

const borderColor = '#d0d5dd'
const st = {
  container: { ...pageContainer, maxWidth: '95vw' as const, overflowX: 'auto' as const },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 600, color: colors.text, margin: 0 },
  subtitle: { color: colors.textMuted, fontSize: 13, margin: '2px 0 0' },
  filters: { display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' as const, alignItems: 'center' as const },
  select: { ...inp, width: 160, cursor: 'pointer' as const },
  searchInput: { ...inp, width: 220 } as React.CSSProperties,
  summary: { display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' as const },
  statCard: { background: colors.card, borderRadius: radius.lg, padding: '12px 20px', boxShadow: shadow.card, border: `1px solid ${colors.border}`, minWidth: 160 },
  statLabel: { fontSize: 12, color: colors.textMuted, margin: 0 },
  statValue: { fontSize: 22, fontWeight: 700, color: colors.text, margin: '2px 0 0' },
  tableWrap: { overflowX: 'auto' as const },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13, background: colors.card, borderRadius: radius.lg, overflow: 'hidden', boxShadow: shadow.card } as React.CSSProperties,
  th: (w: number | undefined) => ({ padding: '8px 10px', textAlign: 'left' as const, background: colors.surfaceSecondary, borderBottom: `2px solid ${borderColor}`, borderRight: `1px solid ${borderColor}`, fontWeight: 600, color: colors.textSecondary, fontSize: 12, whiteSpace: 'nowrap' as const, position: 'relative' as const, width: w, userSelect: 'none' as const }),
  td: { padding: '7px 10px', borderBottom: `1px solid ${borderColor}`, borderRight: `1px solid ${borderColor}`, color: colors.text },
  rowBad: { background: colors.dangerLight + '22' } as React.CSSProperties,
  resizer: { position: 'absolute' as const, right: 0, top: 0, bottom: 0, width: 5, cursor: 'col-resize' as const, zIndex: 1 },
  loading: { textAlign: 'center' as const, padding: 40, color: colors.textMuted },
  pagination: { display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 16 } as React.CSSProperties,
  pageBtn: (active: boolean) => ({ padding: '6px 14px', borderRadius: radius.md, border: `1px solid ${borderColor}`, background: active ? colors.primary : colors.card, color: active ? '#fff' : colors.text, fontSize: 13, cursor: 'pointer', fontWeight: active ? 600 : 400 }),
}

const COLUMNS = [
  { key: 'ngay', label: 'Ngày', minW: 90 },
  { key: 'so_ct', label: 'Số CT', minW: 90 },
  { key: 'ma_hang', label: 'Mã hàng', minW: 100 },
  { key: 'ten_hang', label: 'Tên hàng', minW: 200 },
  { key: 'sl_ban', label: 'SL', minW: 60 },
  { key: 'don_gia_thuc_te', label: 'Đơn giá (I)', minW: 100 },
  { key: 'gia_goc_tinh', label: 'Giá gốc tính', minW: 100 },
  { key: 'chech_lech', label: 'Chênh lệch', minW: 100 },
  { key: 'cot_go_match', label: 'Cốt gỗ', minW: 100 },
  { key: 'be_mat_match', label: 'Bề mặt', minW: 100 },
  { key: 'parse_info', label: 'Parse', minW: 140 },
]

function useColumnResize() {
  const [widths, setWidths] = useState<Record<string, number>>({})
  const drag = useRef<{ key: string; startX: number; startW: number } | null>(null)

  const onMouseDown = (key: string, e: React.MouseEvent) => {
    e.preventDefault()
    const el = document.getElementById('th-' + key)
    if (!el) return
    drag.current = { key, startX: e.clientX, startW: el.offsetWidth }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const onMouseMove = (e: MouseEvent) => {
    if (!drag.current) return
    const diff = e.clientX - drag.current.startX
    setWidths(p => ({ ...p, [drag.current!.key]: Math.max(drag.current!.startW + diff, 50) }))
  }

  const onMouseUp = () => {
    drag.current = null
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  useEffect(() => () => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }, [])

  return { widths, onMouseDown }
}

export default function SoSanhGiaGocPage() {
  const { hasPermission } = useAuth()
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalStats, setTotalStats] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [loai, setLoai] = useState('')
  const [search, setSearch] = useState('')
  const [filterDiff, setFilterDiff] = useState('all')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const filterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const limit = 500
  const { widths, onMouseDown } = useColumnResize()

  const handleSync = async () => {
    if (!confirm('Cập nhật giá gốc (Giá bán MISA) theo đơn giá thực tế từ Sổ chi tiết bán hàng?')) return
    setSyncing(true); setSyncResult(null)
    try {
      const r = await apiPost('/pricing/cap-nhat-gia-goc', {})
      setSyncResult(r.message || `OK: ${r.updated} cập nhật`)
      setRefreshKey(k => k + 1)
    } catch (e: any) { setSyncResult('Lỗi: ' + e.message) }
    finally { setSyncing(false) }
  }

  const setFilter = (key: string, val: string) => {
    setFilters(p => ({ ...p, [key]: val }))
    if (filterTimer.current) clearTimeout(filterTimer.current)
    filterTimer.current = setTimeout(() => setPage(1), 300)
  }

  useEffect(() => {
    setLoading(true)
    const params = `page=${page}&limit=${limit}&loai=${encodeURIComponent(loai)}&q=${encodeURIComponent(search)}&diff=${encodeURIComponent(filterDiff)}&filters=${encodeURIComponent(JSON.stringify(filters))}`
    apiGet(`/pricing/so-sanh?${params}`)
      .then((r: any) => {
        setData(r.data || [])
        setTotal(r.total || 0)
        setTotalPages(r.total_pages || 0)
        setTotalStats(r.total_stats || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, loai, search, limit, refreshKey, filters, filterDiff])

  const handleLoaiChange = (v: string) => { setLoai(v); setPage(1) }
  const handleSearchChange = (v: string) => { setSearch(v); setPage(1) }
  const handleDiffChange = (v: string) => { setFilterDiff(v); setPage(1) }

  // Stats từ backend (đã áp dụng tất cả bộ lọc)
  const s = totalStats || {}
  const totalDong = s.total || 0
  const statsMatched = s.co_gia_goc || 0
  const statsBang = s.bang || 0
  const statsThap = s.thap || 0
  const statsCao = s.cao || 0

  const pages: number[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push(-1)
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push(-1)
    pages.push(totalPages)
  }

  return (
    <div style={st.container}>
      <div style={st.header}>
        <div>
          <h1 style={st.title}>So sánh giá gốc</h1>
          <p style={st.subtitle}>Giá gốc vs Đơn giá thực tế (SỔ CHI TIẾT BÁN HÀNG)</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {syncResult && <span style={{ fontSize: 13, color: syncResult.startsWith('Lỗi') ? colors.danger : colors.success }}>{syncResult}</span>}
          {hasPermission('feature:dong-bo-gia-goc') && (
            <button
              style={{ height: 34, padding: '0 16px', fontSize: 12, fontWeight: 600, background: colors.warning, color: '#fff', border: 'none', borderRadius: radius.md, cursor: 'pointer', opacity: syncing ? 0.6 : 1 }}
              onClick={handleSync}
              disabled={syncing}
            >{syncing ? 'Đang đồng bộ...' : 'Đồng bộ giá gốc ← Đơn giá'}</button>
          )}
        </div>
      </div>

      <div style={st.filters}>
        <select style={st.select} value={loai} onChange={e => handleLoaiChange(e.target.value)}>
          <option value="">Tất cả</option>
          <option value="ME">Melamine</option>
          <option value="CH">Chỉ nẹp</option>
          <option value="LP">Laminate LP</option>
          <option value="LE">Laminate LE</option>
          <option value="NL">Nhựa Laminate</option>
          <option value="NT">Nhựa thường / PVC</option>
        </select>
        <input style={st.searchInput} placeholder="Tìm mã hàng, tên hàng..." value={search} onChange={e => handleSearchChange(e.target.value)} />
        <select style={{ ...st.select, width: 140 }} value={filterDiff} onChange={e => handleDiffChange(e.target.value)}>
          <option value="all">Tất cả</option>
          <option value="bang">Bằng giá</option>
          <option value="thap">Giá gốc &lt; Đơn giá</option>
          <option value="cao">Giá gốc &gt; Đơn giá</option>
          <option value="khong">Không có giá gốc</option>
        </select>
        <button style={{ height: 32, padding: '0 12px', fontSize: 12, background: colors.card, color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: radius.md, cursor: 'pointer' }} onClick={() => { setLoai(''); setSearch(''); setFilterDiff('all'); setFilters({}); setPage(1) }}>
          Xoá hết lọc
        </button>
        <span style={{ color: colors.textMuted, fontSize: 13 }}>
          {total.toLocaleString()} dòng · Trang {page}/{totalPages}
        </span>
      </div>

      <div style={st.summary}>
        <div style={st.statCard}>
          <p style={st.statLabel}>Đã tính được giá gốc</p>
          <p style={{ ...st.statValue, color: colors.primary }}>{statsMatched.toLocaleString()} / {totalDong.toLocaleString()}</p>
        </div>
        <div style={st.statCard}>
          <p style={st.statLabel}>Bằng giá thực tế</p>
          <p style={{ ...st.statValue, color: '#16a34a' }}>{statsBang.toLocaleString()}</p>
        </div>
        <div style={st.statCard}>
          <p style={st.statLabel}>Giá gốc &lt; Đơn giá</p>
          <p style={{ ...st.statValue, color: '#ca8a04' }}>{statsThap.toLocaleString()}</p>
        </div>
        <div style={st.statCard}>
          <p style={st.statLabel}>Giá gốc &gt; Đơn giá</p>
          <p style={{ ...st.statValue, color: '#dc2626' }}>{statsCao.toLocaleString()}</p>
        </div>
      </div>

      {loading ? (
        <div style={st.loading}>Đang tải...</div>
      ) : (
        <div style={st.tableWrap}>
          <table style={st.table}>
            <thead>
              <tr>
                {COLUMNS.map(col => (
                  <th key={col.key} id={'th-' + col.key} style={st.th(widths[col.key])}>
                    {col.label}
                    <div style={st.resizer} onMouseDown={e => onMouseDown(col.key, e)} />
                  </th>
                ))}
              </tr>
              <tr>
                {COLUMNS.map(col => (
                  <th key={'f-' + col.key} style={{ padding: '3px 4px', borderBottom: `1px solid ${borderColor}`, background: colors.surfaceSecondary }}>
                    {col.key === 'ngay' ? (
                      <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <input type="date"
                          style={{ width: '50%', padding: '3px 4px', fontSize: 11, border: `1px solid ${borderColor}`, borderRadius: 3, boxSizing: 'border-box', outline: 'none' }}
                          value={toDateInput(filters['ngay_from'] || '')}
                          onChange={e => setFilter('ngay_from', fromDateInput(e.target.value))}
                          title="Từ ngày"
                        />
                        <span style={{ fontSize: 10, color: colors.textMuted }}>→</span>
                        <input type="date"
                          style={{ width: '50%', padding: '3px 4px', fontSize: 11, border: `1px solid ${borderColor}`, borderRadius: 3, boxSizing: 'border-box', outline: 'none' }}
                          value={toDateInput(filters['ngay_to'] || '')}
                          onChange={e => setFilter('ngay_to', fromDateInput(e.target.value))}
                          title="Đến ngày"
                        />
                      </div>
                    ) : (
                      <input
                        style={{ width: '100%', padding: '3px 4px', fontSize: 11, border: `1px solid ${borderColor}`, borderRadius: 3, boxSizing: 'border-box', outline: 'none' }}
                        placeholder="Lọc"
                        value={filters[col.key] || ''}
                        onChange={e => setFilter(col.key, e.target.value)}
                      />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={d.id + '-' + i} style={d.chech_lech && d.chech_lech > 0 ? st.rowBad : undefined}>
                  <td style={st.td}>{d.ngay || '—'}</td>
                  <td style={st.td}>{d.so_ct || '—'}</td>
                  <td style={st.td}>{d.ma_hang}</td>
                  <td style={{ ...st.td, maxWidth: widths['ten_hang'] || 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.ten_hang}</td>
                  <td style={st.td}>{d.sl_ban}</td>
                  <td style={{ ...st.td, fontWeight: 600 }}>{d.don_gia_thuc_te !== null ? formatNum(d.don_gia_thuc_te) : '—'}</td>
                  <td style={{ ...st.td, fontWeight: 600, color: d.gia_goc_tinh !== null ? colors.text : colors.textMuted }}>
                    {d.gia_goc_tinh !== null ? formatNum(d.gia_goc_tinh) : d.loi_tinh || '—'}
                  </td>
                  <td style={{
                    ...st.td, fontWeight: 700,
                    color: d.chech_lech === 0 ? '#16a34a' : d.chech_lech !== null && d.chech_lech < 0 ? '#ca8a04' : d.chech_lech !== null && d.chech_lech > 0 ? '#dc2626' : colors.textMuted
                  }}>
                    {d.chech_lech !== null ? (d.chech_lech > 0 ? '+' : '') + formatNum(d.chech_lech) : '—'}
                  </td>
                  <td style={st.td}>{d.cot_go_match || '—'}</td>
                  <td style={st.td}>{d.be_mat_match || '—'}</td>
                  <td style={{ ...st.td, fontSize: 11, color: colors.textMuted }}>
                    {d.parse_info ? `${d.parse_info.do_day || ''} / ${d.parse_info.colorCode || ''} / ${d.parse_info.tier || ''}` : d.loai_sp || ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={st.pagination}>
          <button
            style={st.pageBtn(false)}
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >« Trước</button>
          {pages.map((p, i) =>
            p === -1
              ? <span key={`ellipsis-${i}`} style={{ color: colors.textMuted, fontSize: 13 }}>...</span>
              : <button key={p} style={st.pageBtn(p === page)} onClick={() => setPage(p)}>{p}</button>
          )}
          <button
            style={st.pageBtn(false)}
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >Sau »</button>
        </div>
      )}
    </div>
  )
}