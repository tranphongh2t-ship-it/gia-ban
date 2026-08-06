import { useState, useCallback, useEffect } from 'react'
import { apiGet, apiPost } from '../../lib/api'
import { colors, shadow, radius, input, pageContainer, pageTitle, btn, spinner } from '../../theme'
import { formatNum } from '../../lib/format'
import AssignMisaCode from '../../components/AssignMisaCode'

const inputStyle: React.CSSProperties = { ...input, width: '100%', boxSizing: 'border-box' }

export default function TinhGiaGGPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [computing, setComputing] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [search, setSearch] = useState('')
  const [filterNhom, setFilterNhom] = useState('')
  const [filterLoai, setFilterLoai] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet('/gia-chuan/tinh-gia-gg')
      setData(res.data || [])
    } catch { setData([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCompute = async () => {
    setComputing(true)
    try {
      const res = await apiPost('/gia-chuan/tinh-gia-gg/tinh-toan', {})
      alert(`Đã tính xong: ${res.total} dòng`)
      fetchData()
    } catch (e: any) { alert('Lỗi: ' + e.message) }
    finally { setComputing(false) }
  }

  const handleAutoAssign = async () => {
    setAssigning(true)
    try {
      const res = await apiPost('/gia-chuan/tinh-gia-gg/auto-assign-ma-sp', {})
      alert(`Đã gán ${res.assigned} mã SP (${res.skipped} dòng không có mã để trống)`)
      fetchData()
    } catch (e: any) { alert('Lỗi: ' + e.message) }
    finally { setAssigning(false) }
  }

  const filtered = data.filter(r => {
    if (search) {
      const s = search.toLowerCase()
      if (!r.quy_cach?.toLowerCase().includes(s) && !r.loai?.toLowerCase().includes(s) && !r.ma_sp?.toLowerCase().includes(s)) return false
    }
    if (filterNhom && r.nhom !== filterNhom) return false
    if (filterLoai && r.loai !== filterLoai) return false
    return true
  })

  const nhomList = [...new Set(data.map(r => r.nhom))] as string[]
  const loaiList = [...new Set(data.filter(r => !filterNhom || r.nhom === filterNhom).map(r => r.loai))] as string[]
  const totalDisplay = filtered.length

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Tính Giá Gốc Gỗ Ghép</h1>

      <div style={{ background: colors.card, borderRadius: radius.lg, padding: 20, border: `1px solid ${colors.border}`, boxShadow: shadow.card, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 200, flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Tìm kiếm</label>
            <input style={inputStyle} placeholder="Quy cách, loại, mã SP..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ minWidth: 140 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Nhóm</label>
            <select style={inputStyle} value={filterNhom} onChange={e => { setFilterNhom(e.target.value); setFilterLoai('') }}>
              <option value="">Tất cả</option>
              {nhomList.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 160 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Loại</label>
            <select style={inputStyle} value={filterLoai} onChange={e => setFilterLoai(e.target.value)}>
              <option value="">Tất cả</option>
              {loaiList.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <button style={{ ...btn(colors.success, '#fff'), fontWeight: 600 }} onClick={handleCompute} disabled={computing}>
            {computing ? 'Đang tính...' : 'Tính toán lại'}
          </button>
          <button style={{ ...btn(colors.primary, '#fff'), fontWeight: 600 }} onClick={handleAutoAssign} disabled={assigning}>
            {assigning ? 'Đang gán...' : 'Gán Mã SP từ danh mục MISA'}
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
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Quy cách</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Loại</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Nhóm</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: colors.primaryDark, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Giá gốc</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id || i} style={{ background: i % 2 === 0 ? colors.card : colors.surfaceSecondary }}>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: r.ma_sp ? colors.primary : colors.textMuted, fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ whiteSpace: 'nowrap' }}>{r.ma_sp || '—'}</span>
                        <AssignMisaCode module="gg" table="bang_gia_chuan_tinh_gia_gg" rowId={r.id} searchStr={`${r.nhom} ${r.loai} ${r.quy_cach}`} currentMa={r.ma_sp} currentTen={r.ten_sp} onAssigned={fetchData} />
                      </div>
                    </td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: r.ten_sp ? colors.text : colors.textMuted, fontSize: 12 }}>{r.ten_sp || '—'}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text, fontWeight: 600 }}>{r.quy_cach}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text }}>{r.loai}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.textSecondary, fontSize: 12 }}>{r.nhom}</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', borderBottom: `1px solid ${colors.borderLight}`, color: colors.primaryDark, fontWeight: 700, fontSize: 14 }}>{formatNum(r.gia)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 14px', fontSize: 12, color: colors.textMuted, borderTop: `1px solid ${colors.borderLight}` }}>
            Tổng số: {totalDisplay} / {data.length} dòng
          </div>
        </div>
      )}
    </div>
  )
}
