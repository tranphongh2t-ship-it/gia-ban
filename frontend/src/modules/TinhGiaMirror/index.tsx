import { useState, useCallback, useEffect } from 'react'
import { apiGet } from '../../lib/api'
import { colors, shadow, radius, input, pageContainer, pageTitle, spinner } from '../../theme'
import { formatNum } from '../../lib/format'
import PaginationBar, { DEFAULT_PAGE_SIZE } from '../../components/PaginationBar'
import GuideTabs from '../../components/GuideTabs'
import { mirrorGuideTabs } from '../../guides/mirror'

const inputStyle: React.CSSProperties = { ...input, width: '100%', boxSizing: 'border-box' }
const cell = (align = 'left'): React.CSSProperties => ({
  padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, textAlign: align as any,
})
const th = (align = 'left'): React.CSSProperties => ({
  padding: '10px 14px', textAlign: align as any, color: colors.textMuted,
  fontWeight: 600, fontSize: 11, textTransform: 'uppercase',
  borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap',
})
const sectionTitle: React.CSSProperties = {
  fontSize: 16, fontWeight: 700, marginBottom: 10, marginTop: 8, color: colors.text,
}
const tableWrap: React.CSSProperties = {
  background: colors.card, borderRadius: radius.lg, overflow: 'hidden',
  border: `1px solid ${colors.border}`, boxShadow: shadow.card, marginBottom: 24,
}

export default function TinhGiaMirrorPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [pageByNguon, setPageByNguon] = useState<Record<string, number>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet('/gia-chuan/mirror?limit=20000')
      setData(res.data || [])
    } catch { setData([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = data.filter(r => {
    if (!search) return true
    const s = search.toLowerCase()
    return r.quy_cach?.toLowerCase().includes(s) || r.loai?.toLowerCase().includes(s) || r.nguon?.toLowerCase().includes(s) || String(r.ma_sp || '').toLowerCase().includes(s) || String(r.ten_sp || '').toLowerCase().includes(s)
  })

  const nguons = [...new Set(data.map(r => r.nguon))] as string[]

  if (loading) return <div style={pageContainer}><div style={spinner}>Đang tải...</div></div>

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Tính Giá MDF-VÁN NHỰA MIRROR</h1>

      <div style={{ background: colors.card, borderRadius: radius.lg, padding: 20, border: `1px solid ${colors.border}`, boxShadow: shadow.card, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ minWidth: 250, flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Tìm kiếm</label>
            <input style={inputStyle} placeholder="Quy cách, loại..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {nguons.map(nguon => {
        const rows = filtered.filter(r => r.nguon === nguon)
        if (rows.length === 0) return null
        const loais = [...new Set(rows.map(r => r.loai))] as string[]
        const page = pageByNguon[nguon] || 0
        const pageCount = Math.ceil(rows.length / DEFAULT_PAGE_SIZE)
        const pageRows = (pageCount > 1)
          ? rows.slice(page * DEFAULT_PAGE_SIZE, (page + 1) * DEFAULT_PAGE_SIZE)
          : rows
        const setPage = (p: number) => setPageByNguon(s => ({ ...s, [nguon]: p }))
        return (
          <div key={nguon}>
            <h2 style={sectionTitle}>{nguon}</h2>
            <div style={tableWrap}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 }}>
                  <thead>
                    <tr style={{ background: colors.surfaceSecondary }}>
                      <th style={th()}>Loại</th>
                      <th style={th()}>Quy cách</th>
                      <th style={th()}>Mã SP</th>
                      <th style={th()}>Mô Tả SP</th>
                      {rows.some(r => r.gia_1m != null) && <th style={th('right')}>Giá 1 mặt</th>}
                      {rows.some(r => r.gia_2m != null) && <th style={th('right')}>Giá 2 mặt</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r, i) => (
                      <tr key={r.id} style={{ background: i % 2 === 0 ? colors.card : colors.surfaceSecondary }}>
                        <td style={{ ...cell(), color: colors.textSecondary, fontSize: 12 }}>{r.loai}</td>
                        <td style={{ ...cell(), color: colors.text, fontWeight: 600 }}>{r.quy_cach}</td>
                        <td style={{ ...cell(), color: colors.primaryDark, fontWeight: 600 }}>{r.ma_sp || ''}</td>
                        <td style={{ ...cell(), color: colors.textSecondary, fontSize: 12 }}>{r.ten_sp || ''}</td>
                        {rows.some(x => x.gia_1m != null) && (
                          <td style={{ ...cell('right'), color: colors.primaryDark, fontWeight: 700, fontSize: 14 }}>
                            {r.gia_1m != null ? formatNum(r.gia_1m) : ''}
                          </td>
                        )}
                        {rows.some(x => x.gia_2m != null) && (
                          <td style={{ ...cell('right'), color: colors.primaryDark, fontWeight: 700, fontSize: 14 }}>
                            {r.gia_2m != null ? formatNum(r.gia_2m) : ''}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar page={page} pageCount={pageCount} total={rows.length} onPageChange={setPage} />
            </div>
          </div>
        )
      })}

      <GuideTabs title="Hướng dẫn" tabs={mirrorGuideTabs} />
    </div>
  )
}
