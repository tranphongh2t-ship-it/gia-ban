import { useState, useCallback, useEffect } from 'react'
import { apiGet } from '../../lib/api'
import { colors, shadow, radius, input, pageContainer, pageTitle, btn } from '../../theme'
import { formatNum } from '../../lib/format'

const MODULES = [
  { key: 'melamine_tonghop', label: 'Melamine tổng hợp' },
  { key: 'vdo', label: 'Ván Dăm Okal' },
  { key: 'vmh', label: 'Ván MDF HDF' },
  { key: 'gg', label: 'Gỗ Ghép' },
  { key: 've', label: 'Ván Ép' },
  { key: 'osb', label: 'OSB' },
  { key: 'dr', label: 'Durabo' },
  { key: 'pvc_petg', label: 'PVC/PETG' },
  { key: 'acrylic', label: 'Acrylic' },
  { key: 'one_laminate', label: 'One Laminate' },
]

const inp: React.CSSProperties = { ...input, width: '100%', boxSizing: 'border-box' }

const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: '8px 18px', fontSize: 13, fontWeight: 600, border: `1px solid ${colors.border}`,
  background: active ? colors.primary : colors.card, color: active ? '#fff' : colors.text,
  cursor: 'pointer', borderRadius: active ? radius.md : radius.md,
})

export default function KiemTraBangTinhGiaPage() {
  const [tab, setTab] = useState<'misa' | 'orders'>('orders')
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [module, setModule] = useState('melamine_tonghop')
  const [filterDiff, setFilterDiff] = useState('')
  const [search, setSearch] = useState('')
  const limit = 500

  const apiPath = tab === 'misa' ? 'kiem-tra-bang-tinh-gia' : 'compare-orders'

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ module, limit: String(limit), page: String(page) })
      if (filterDiff) params.set('diff', filterDiff)
      const res = await apiGet(`/gia-chuan/${apiPath}?${params}`)
      setData(res.data || [])
      setTotal(res.total || 0)
    } catch { setData([]); setTotal(0) }
    finally { setLoading(false) }
  }, [tab, module, page, filterDiff, apiPath])

  useEffect(() => { fetchData() }, [fetchData])

  const totalPages = Math.ceil(total / limit)

  const filtered = data.filter(r => {
    if (!search) return true
    const s = search.toLowerCase()
    return r.ma_sp?.toLowerCase().includes(s) || r.ten_sp?.toLowerCase().includes(s) || r.mo_ta?.toLowerCase().includes(s)
  })

  const handleTabChange = (t: 'misa' | 'orders') => {
    setTab(t); setPage(1); setFilterDiff('')
  }

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Kiểm tra Bảng Tính Giá</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button style={tabBtn(tab === 'orders')} onClick={() => handleTabChange('orders')}>
          So sánh vs Đơn giá thực tế
        </button>
        <button style={tabBtn(tab === 'misa')} onClick={() => handleTabChange('misa')}>
          So sánh vs Giá gốc MISA
        </button>
      </div>

      <div style={{ background: colors.card, borderRadius: radius.lg, padding: 20, border: `1px solid ${colors.border}`, boxShadow: shadow.card, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 200 }}>
            <label style={{ fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>Module</label>
            <select style={inp} value={module} onChange={e => { setModule(e.target.value); setPage(1) }}>
              {MODULES.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 140 }}>
            <label style={{ fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>So sánh</label>
            <select style={inp} value={filterDiff} onChange={e => { setFilterDiff(e.target.value); setPage(1) }}>
              <option value="">Tất cả</option>
              <option value="bang">Bằng nhau (đúng)</option>
              <option value="cao">Tính giá &gt; Giá thực tế</option>
              <option value="thap">Tính giá &lt; Giá thực tế</option>
            </select>
          </div>
          <div style={{ minWidth: 180, flex: 1 }}>
            <label style={{ fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>Tìm kiếm</label>
            <input style={inp} placeholder="Mã SP, tên SP, mô tả..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>Đang tải...</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ background: colors.card, borderRadius: radius.lg, padding: '10px 16px', border: `1px solid ${colors.border}`, boxShadow: shadow.card, minWidth: 120 }}>
              <p style={{ fontSize: 11, color: colors.textMuted, margin: 0 }}>Tổng dòng</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: colors.text, margin: '2px 0 0' }}>{total.toLocaleString()}</p>
            </div>
            <div style={{ background: colors.card, borderRadius: radius.lg, padding: '10px 16px', border: `1px solid ${colors.border}`, boxShadow: shadow.card, minWidth: 120 }}>
              <p style={{ fontSize: 11, color: colors.textMuted, margin: 0 }}>Bằng nhau</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#16a34a', margin: '2px 0 0' }}>
                {(tab === 'misa' ? data.filter(r => r.diff === 0).length : data.filter(r => r.chenh_lech === 0).length).toLocaleString()}
              </p>
            </div>
            <div style={{ background: colors.card, borderRadius: radius.lg, padding: '10px 16px', border: `1px solid ${colors.border}`, boxShadow: shadow.card, minWidth: 120 }}>
              <p style={{ fontSize: 11, color: colors.textMuted, margin: 0 }}>Tính giá &gt; Thực tế</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#dc2626', margin: '2px 0 0' }}>
                {(tab === 'misa' ? data.filter(r => r.diff && r.diff > 0) : data.filter(r => r.chenh_lech && r.chenh_lech > 0)).length.toLocaleString()}
              </p>
            </div>
            <div style={{ background: colors.card, borderRadius: radius.lg, padding: '10px 16px', border: `1px solid ${colors.border}`, boxShadow: shadow.card, minWidth: 120 }}>
              <p style={{ fontSize: 11, color: colors.textMuted, margin: 0 }}>Tính giá &lt; Thực tế</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#ca8a04', margin: '2px 0 0' }}>
                {(tab === 'misa' ? data.filter(r => r.diff && r.diff < 0) : data.filter(r => r.chenh_lech && r.chenh_lech < 0)).length.toLocaleString()}
              </p>
            </div>
          </div>

          <div style={{ background: colors.card, borderRadius: radius.lg, overflow: 'hidden', border: `1px solid ${colors.border}`, boxShadow: shadow.card }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: tab === 'orders' ? 1000 : 800 }}>
                <thead>
                  <tr style={{ background: colors.surfaceSecondary }}>
                    <th style={{ padding: '8px 10px', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>Mã SP</th>
                    <th style={{ padding: '8px 10px', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>Tên SP</th>
                    <th style={{ padding: '8px 10px', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>Mô tả</th>
                    {tab === 'orders' && (
                      <>
                        <th style={{ padding: '8px 10px', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>SL</th>
                        <th style={{ padding: '8px 10px', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>Ngày</th>
                        <th style={{ padding: '8px 10px', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>KH</th>
                      </>
                    )}
                    <th style={{ padding: '8px 10px', textAlign: 'right', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>
                      {tab === 'misa' ? 'Tính giá' : 'Tính giá'}
                    </th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>
                      {tab === 'misa' ? 'Giá gốc MISA' : 'Đơn giá thực tế'}
                    </th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>Chênh lệch</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => {
                    const diff = tab === 'misa' ? r.diff : r.chenh_lech
                    const refVal = tab === 'misa' ? r.gia_goc_misa : r.don_gia
                    return (
                      <tr key={r.id + (r.ngay || '')} style={{
                        background: i % 2 === 0 ? colors.card : colors.surfaceSecondary,
                      }}>
                        <td style={{ padding: '6px 10px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text, fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>{r.ma_sp}</td>
                        <td style={{ padding: '6px 10px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text, fontSize: 12 }}>{r.ten_sp}</td>
                        <td style={{ padding: '6px 10px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.textSecondary, fontSize: 11 }}>{r.mo_ta}</td>
                        {tab === 'orders' && (
                          <>
                            <td style={{ padding: '6px 10px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text, fontSize: 12 }}>{r.sl_ban}</td>
                            <td style={{ padding: '6px 10px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.textSecondary, fontSize: 11 }}>{r.ngay}</td>
                            <td style={{ padding: '6px 10px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.textSecondary, fontSize: 11, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.ten_kh}</td>
                          </>
                        )}
                        <td style={{ padding: '6px 10px', borderBottom: `1px solid ${colors.borderLight}`, textAlign: 'right', color: colors.text, fontWeight: 600 }}>{r.tinh_gia || r.tong_gia ? formatNum(r.tinh_gia || r.tong_gia) : '—'}</td>
                        <td style={{ padding: '6px 10px', borderBottom: `1px solid ${colors.borderLight}`, textAlign: 'right', color: refVal != null ? colors.text : colors.textMuted }}>
                          {refVal != null ? formatNum(refVal) : '—'}
                        </td>
                        <td style={{
                          padding: '6px 10px', borderBottom: `1px solid ${colors.borderLight}`, textAlign: 'right', fontWeight: 700,
                          color: diff === 0 ? '#16a34a' : diff != null && diff > 0 ? '#dc2626' : diff != null && diff < 0 ? '#ca8a04' : colors.textMuted,
                        }}>
                          {diff != null ? (diff > 0 ? '+' : '') + formatNum(diff) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div style={{ padding: '8px 14px', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', borderTop: `1px solid ${colors.borderLight}` }}>
                <button style={btn(colors.textMuted, '#fff')} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</button>
                <span style={{ fontSize: 13, color: colors.textMuted }}>Trang {page} / {totalPages}</span>
                <button style={btn(colors.textMuted, '#fff')} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Sau</button>
              </div>
            )}
            <div style={{ padding: '6px 14px', fontSize: 12, color: colors.textMuted, borderTop: `1px solid ${colors.borderLight}` }}>
              {filtered.length} / {total} dòng
            </div>
          </div>
        </>
      )}
    </div>
  )
}
