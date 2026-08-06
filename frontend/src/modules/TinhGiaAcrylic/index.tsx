import { useState, useCallback, useEffect } from 'react'
import { apiGet, apiPost } from '../../lib/api'
import { colors, shadow, radius, input, pageContainer, pageTitle, btn, spinner } from '../../theme'
import { formatNum } from '../../lib/format'
import AssignMisaCode from '../../components/AssignMisaCode'
import PaginationBar, { DEFAULT_PAGE_SIZE } from '../../components/PaginationBar'
import GuideTabs from '../../components/GuideTabs'
import { acrylicGuideTabs } from '../../guides/acrylic'

const inputStyle: React.CSSProperties = { ...input, width: '100%', boxSizing: 'border-box' }

export default function TinhGiaAcrylicPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [computing, setComputing] = useState(false)
  const [search, setSearch] = useState('')
  const [filterSeries, setFilterSeries] = useState('')
  const [filterLoaiMau, setFilterLoaiMau] = useState('')
  const [filterPhu, setFilterPhu] = useState('')
  const [filterBoard, setFilterBoard] = useState('')
  const [page, setPage] = useState(0)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet('/gia-chuan/tinh-gia-acrylic')
      setData(res.data || [])
    } catch { setData([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCompute = async () => {
    setComputing(true)
    try {
      const res = await apiPost('/gia-chuan/tinh-gia-acrylic/tinh-toan', {})
      alert(`Đã tính xong: ${res.total} dòng`)
      fetchData()
    } catch (e: any) { alert('Lỗi: ' + e.message) }
    finally { setComputing(false) }
  }

  const filtered = data.filter(r => {
    if (search) {
      const s = search.toLowerCase()
      if (!r.ma_mau?.toLowerCase().includes(s) && !r.phu?.toLowerCase().includes(s) && !r.board_type?.toLowerCase().includes(s) && !r.ma_sp?.toLowerCase().includes(s) && !r.ten_sp?.toLowerCase().includes(s)) return false
    }
    if (filterSeries && r.series !== filterSeries) return false
    if (filterLoaiMau && r.loai_mau !== filterLoaiMau) return false
    if (filterPhu && r.phu !== filterPhu) return false
    if (filterBoard && r.board_type !== filterBoard) return false
    return true
  })

  const seriesList = [...new Set(data.map(r => r.series))] as string[]
  const loaiMauList = [...new Set(data.map(r => r.loai_mau))] as string[]
  const phuList = [...new Set(data.map(r => r.phu))] as string[]
  const boardList = [...new Set(data.map(r => r.board_type))] as string[]
  const totalDisplay = filtered.length
  const pageCount = Math.ceil(filtered.length / DEFAULT_PAGE_SIZE)
  const pageRows = filtered.slice(page * DEFAULT_PAGE_SIZE, (page + 1) * DEFAULT_PAGE_SIZE)

  useEffect(() => { setPage(0) }, [search, filterSeries, filterLoaiMau, filterPhu, filterBoard])

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Tính Giá VÁN NHỰA-MDF MR PHỦ ACRYLIC</h1>

      <div style={{ background: colors.card, borderRadius: radius.lg, padding: 20, border: `1px solid ${colors.border}`, boxShadow: shadow.card, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 180, flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Tìm kiếm</label>
            <input style={inputStyle} placeholder="Mã màu, loại phủ, board..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ minWidth: 120 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Series</label>
            <select style={inputStyle} value={filterSeries} onChange={e => setFilterSeries(e.target.value)}>
              <option value="">Tất cả</option>
              {seriesList.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 120 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Loại màu</label>
            <select style={inputStyle} value={filterLoaiMau} onChange={e => setFilterLoaiMau(e.target.value)}>
              <option value="">Tất cả</option>
              {loaiMauList.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 150 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Loại phủ</label>
            <select style={inputStyle} value={filterPhu} onChange={e => setFilterPhu(e.target.value)}>
              <option value="">Tất cả</option>
              {phuList.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 160 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Loại ván</label>
            <select style={inputStyle} value={filterBoard} onChange={e => setFilterBoard(e.target.value)}>
              <option value="">Tất cả</option>
              {boardList.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button style={{ ...btn(colors.success, '#fff'), fontWeight: 600 }} onClick={handleCompute} disabled={computing}>
            {computing ? 'Đang tính...' : 'Tính toán lại'}
          </button>
        </div>
      </div>

      {loading ? <div style={spinner}>Đang tải...</div> : (
        <div style={{ background: colors.card, borderRadius: radius.lg, overflow: 'hidden', border: `1px solid ${colors.border}`, boxShadow: shadow.card }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 800 }}>
              <thead>
                <tr style={{ background: colors.surfaceSecondary }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Mã SP</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Mô tả SP</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Mã màu</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Series</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Loại màu</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Loại phủ</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Loại ván</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: colors.primaryDark, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Giá</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => (
                  <tr key={r.id || i} style={{ background: i % 2 === 0 ? colors.card : colors.surfaceSecondary }}>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: r.ma_sp ? colors.primary : colors.textMuted, fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ whiteSpace: 'nowrap' }}>{r.ma_sp || '—'}</span>
                        <AssignMisaCode module="acrylic" table="bang_gia_chuan_tinh_gia_acrylic" rowId={r.id} searchStr={`${r.ma_mau} ${r.phu} ${r.board_type}`} currentMa={r.ma_sp} currentTen={r.ten_sp} onAssigned={fetchData} />
                      </div>
                    </td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: r.ten_sp ? colors.text : colors.textMuted, fontSize: 12 }}>{r.ten_sp || '—'}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text, fontWeight: 600, fontFamily: 'monospace' }}>{r.ma_mau}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text, fontSize: 12 }}>{r.series}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.textSecondary, fontSize: 12 }}>{r.loai_mau}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text, fontSize: 12 }}>{r.phu}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text, fontSize: 12 }}>{r.board_type}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, textAlign: 'right', color: colors.primaryDark, fontWeight: 700, fontSize: 14 }}>{formatNum(r.gia)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar page={page} pageCount={pageCount} total={totalDisplay} onPageChange={setPage} />
        </div>
      )}

      <GuideTabs title="Hướng dẫn" tabs={acrylicGuideTabs} />
    </div>
  )
}
