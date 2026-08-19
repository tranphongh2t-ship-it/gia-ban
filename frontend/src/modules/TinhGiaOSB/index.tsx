import { useState, useCallback, useEffect } from 'react'
import { apiGet, apiPost } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatNum } from '../../lib/format'
import { colors, shadow, radius, input, pageContainer, pageTitle, btn, spinner } from '../../theme'
import AssignMisaCode from '../../components/AssignMisaCode'
import GuideTabs from '../../components/GuideTabs'
import { osbGuideTabs } from '../../guides/osb'
import PaginationBar, { DEFAULT_PAGE_SIZE } from '../../components/PaginationBar'

const inputStyle: React.CSSProperties = { ...input, width: '100%', boxSizing: 'border-box' }

export default function TinhGiaOSBPage() {
  const [data, setData] = useState<any[]>([])
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('feature:edit-data')
  const [loading, setLoading] = useState(false)
  const [computing, setComputing] = useState(false)
  const [search, setSearch] = useState('')
  const [filterNhom, setFilterNhom] = useState('')
  const [page, setPage] = useState(0)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet('/gia-chuan/tinh-gia-osb')
      setData(res.data || [])
    } catch { setData([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCompute = async () => {
    setComputing(true)
    try {
      const res = await apiPost('/gia-chuan/tinh-gia-osb/tinh-toan', {})
      alert(`Đã tính xong: ${res.total} dòng${res.synced ? ` • ${res.synced} mã đã đồng bộ MISA` : ''}`)
      fetchData()
    } catch (e: any) { alert('Lỗi: ' + e.message) }
    finally { setComputing(false) }
  }

  const filtered = data.filter(r => {
    if (search) {
      const s = search.toLowerCase()
      if (!String(r.do_day || '').toLowerCase().includes(s) && !String(r.loai || '').toLowerCase().includes(s) && !String(r.ma_sp || '').toLowerCase().includes(s) && !String(r.ten_sp || '').toLowerCase().includes(s)) return false
    }
    if (filterNhom && r.nhom !== filterNhom) return false
    return true
  })

  const nhomList = [...new Set(data.map(r => r.nhom))] as string[]
  const totalDisplay = filtered.length
  const pageCount = Math.ceil(filtered.length / DEFAULT_PAGE_SIZE)
  const pageRows = filtered.slice(page * DEFAULT_PAGE_SIZE, (page + 1) * DEFAULT_PAGE_SIZE)

  useEffect(() => { setPage(0) }, [search, filterNhom])

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Tính Giá Gốc OSB</h1>

      <div style={{ background: colors.card, borderRadius: radius.lg, padding: 20, border: `1px solid ${colors.border}`, boxShadow: shadow.card, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 200, flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Tìm kiếm</label>
            <input style={inputStyle} placeholder="Độ dày, mô tả..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ minWidth: 140 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Loại giá</label>
            <select style={inputStyle} value={filterNhom} onChange={e => setFilterNhom(e.target.value)}>
              <option value="">Tất cả</option>
              {nhomList.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          {canEdit && <button style={{ ...btn(colors.success, '#fff'), fontWeight: 600 }} onClick={handleCompute} disabled={computing}>
            {computing ? 'Đang tính...' : 'Tính toán lại'}
          </button>}
        </div>
      </div>

      {loading ? <div style={spinner}>Đang tải...</div> : (
        <div style={{ background: colors.card, borderRadius: radius.lg, overflow: 'hidden', border: `1px solid ${colors.border}`, boxShadow: shadow.card }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
              <thead>
                <tr style={{ background: colors.surfaceSecondary }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Mã SP</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Tên SP</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Độ dày</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Loại</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Loại giá</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: colors.primaryDark, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Giá</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => (
                  <tr key={r.id || i} style={{ background: i % 2 === 0 ? colors.card : colors.surfaceSecondary }}>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: r.ma_sp ? colors.primary : colors.textMuted, fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ whiteSpace: 'nowrap' }}>{r.ma_sp || '—'}</span>
                        <AssignMisaCode module="osb" table="bang_gia_chuan_tinh_gia_osb" rowId={r.id} searchStr={`${r.loai} ${r.do_day} ${r.nhom}`} currentMa={r.ma_sp} currentTen={r.ten_sp} onAssigned={fetchData} />
                      </div>
                    </td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: r.ten_sp ? colors.text : colors.textMuted, fontSize: 12 }}>{r.ten_sp || '—'}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text, fontWeight: 600 }}>{r.do_day}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text, fontSize: 12 }}>{r.loai}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.textSecondary, fontSize: 12 }}>{r.nhom}</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', borderBottom: `1px solid ${colors.borderLight}`, color: colors.primaryDark, fontWeight: 700, fontSize: 14 }}>{formatNum(r.gia)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar page={page} pageCount={pageCount} total={totalDisplay} onPageChange={setPage} />
        </div>
      )}

      <GuideTabs title="Hướng dẫn" tabs={osbGuideTabs} />
    </div>
  )
}
