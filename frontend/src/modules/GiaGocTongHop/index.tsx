import { useState, useCallback, useEffect } from 'react'
import { apiGet, apiPost } from '../../lib/api'
import { colors, shadow, radius, input, pageContainer, pageTitle, btn, spinner } from '../../theme'
import { formatNum } from '../../lib/format'

const inputStyle: React.CSSProperties = { ...input, width: '100%', boxSizing: 'border-box' }

export default function GiaGocTongHopPage() {
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [populating, setPopulating] = useState(false)
  const [matching, setMatching] = useState(false)
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 500

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = `?limit=${pageSize}&offset=${page * pageSize}${statusFilter ? '&status=' + statusFilter : ''}`
      const res = await apiGet('/gia-chuan/gia-goc-tong-hop/match' + params)
      setData(res.data || [])
      setTotal(res.total || 0)
    } catch { setData([]); setTotal(0) }
    finally { setLoading(false) }
  }, [page, statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const handlePopulate = async () => {
    setPopulating(true)
    try {
      const res = await apiPost('/gia-chuan/gia-goc-tong-hop/populate', {})
      alert(`Populated: ${res.total} dòng`)
    } catch (e: any) { alert('Lỗi: ' + e.message) }
    finally { setPopulating(false) }
  }

  const handleMatch = async () => {
    setMatching(true)
    try {
      const res = await apiPost('/gia-chuan/gia-goc-tong-hop/match', {})
      alert(`Matched: ${res.matched} / ${res.total} (unmatched: ${res.unmatched})`)
      fetchData()
    } catch (e: any) { alert('Lỗi: ' + e.message) }
    finally { setMatching(false) }
  }

  const filtered = data.filter(r => {
    if (!filter) return true
    const s = filter.toLowerCase()
    return r.ma_sp?.toLowerCase().includes(s) || r.ten_sp?.toLowerCase().includes(s)
  })

  const totalPages = Math.ceil(total / pageSize)

  const statColors: Record<string, string> = {
    matched: '#16a34a',
    unmatched: '#dc2626',
    pending: '#ca8a04',
    overridden: '#2563eb',
  }

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Giá Gốc Tổng Hợp — Đối chiếu MISA</h1>

      <div style={{ background: colors.card, borderRadius: radius.lg, padding: 20, border: `1px solid ${colors.border}`, boxShadow: shadow.card, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <button style={{ ...btn('#6366f1', '#fff'), fontWeight: 600 }} onClick={handlePopulate} disabled={populating}>
            {populating ? 'Đang populate...' : 'Populate giá gốc'}
          </button>
          <button style={{ ...btn('#16a34a', '#fff'), fontWeight: 600 }} onClick={handleMatch} disabled={matching}>
            {matching ? 'Đang match...' : 'Match MISA → giá gốc'}
          </button>
          <div style={{ minWidth: 160 }}>
            <select style={inputStyle} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0) }}>
              <option value="">Tất cả trạng thái</option>
              <option value="matched">Matched</option>
              <option value="unmatched">Unmatched</option>
              <option value="pending">Pending</option>
              <option value="overridden">Overridden</option>
            </select>
          </div>
          <div style={{ minWidth: 180, flex: 1 }}>
            <input style={inputStyle} placeholder="Tìm mã SP, tên SP..." value={filter} onChange={e => setFilter(e.target.value)} />
          </div>
        </div>
      </div>

      {loading ? <div style={spinner}>Đang tải...</div> : (
        <div style={{ background: colors.card, borderRadius: radius.lg, overflow: 'hidden', border: `1px solid ${colors.border}`, boxShadow: shadow.card }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
              <thead>
                <tr style={{ background: colors.surfaceSecondary }}>
                  <th style={{ padding: '10px 14px', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>Mã SP</th>
                  <th style={{ padding: '10px 14px', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>Tên SP</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>Giá gốc</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>Score</th>
                  <th style={{ padding: '10px 14px', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>Module</th>
                  <th style={{ padding: '10px 14px', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>Mô tả matched</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? colors.card : colors.surfaceSecondary }}>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text, fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>{r.ma_sp}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text, fontSize: 12 }}>{r.ten_sp}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, textAlign: 'right', color: colors.primaryDark, fontWeight: 700, fontSize: 14 }}>
                      {r.gia_goc ? formatNum(r.gia_goc) : ''}
                    </td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                        background: (statColors[r.match_status] || colors.textMuted) + '20',
                        color: statColors[r.match_status] || colors.textMuted,
                      }}>{r.match_status}</span>
                    </td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, textAlign: 'right', color: colors.text, fontSize: 13 }}>{r.match_score ? (r.match_score * 100).toFixed(0) + '%' : ''}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.textSecondary, fontSize: 12 }}>{r.match_module}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.textSecondary, fontSize: 11 }}>{r.match_mo_ta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div style={{ padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', borderTop: `1px solid ${colors.borderLight}` }}>
              <button style={btn(colors.textMuted, '#fff')} disabled={page === 0} onClick={() => setPage(p => p - 1)}>Trước</button>
              <span style={{ fontSize: 13, color: colors.textMuted }}>Trang {page + 1} / {totalPages}</span>
              <button style={btn(colors.textMuted, '#fff')} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Sau</button>
            </div>
          )}
          <div style={{ padding: '10px 14px', fontSize: 12, color: colors.textMuted, borderTop: `1px solid ${colors.borderLight}` }}>
            {filtered.length} / {total} mã MISA
          </div>
        </div>
      )}
    </div>
  )
}
