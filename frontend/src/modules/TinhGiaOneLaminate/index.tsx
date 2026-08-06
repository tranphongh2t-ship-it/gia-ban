import { useState, useCallback, useEffect } from 'react'
import { apiGet, apiPost } from '../../lib/api'
import { colors, shadow, radius, input, pageContainer, pageTitle, btn, spinner } from '../../theme'
import { formatNum } from '../../lib/format'
import AssignMisaCode from '../../components/AssignMisaCode'

const inputStyle: React.CSSProperties = { ...input, width: '100%', boxSizing: 'border-box' }

export default function TinhGiaOneLaminatePage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [computing, setComputing] = useState(false)
  const [search, setSearch] = useState('')
  const [filterNguon, setFilterNguon] = useState('')
  const [filterNhom, setFilterNhom] = useState('')
  const [filterSoMat, setFilterSoMat] = useState('')
  const [filterLoaiVan, setFilterLoaiVan] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet('/gia-chuan/tinh-gia-one-laminate')
      setData(res.data || [])
    } catch { setData([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCompute = async () => {
    setComputing(true)
    try {
      const res = await apiPost('/gia-chuan/tinh-gia-one-laminate/tinh-toan', {})
      alert(`Đã tính xong: ${res.total} dòng`)
      fetchData()
    } catch (e: any) { alert('Lỗi: ' + e.message) }
    finally { setComputing(false) }
  }

  const filtered = data.filter(r => {
    if (search) {
      const s = search.toLowerCase()
      if (!r.ma_mau?.toLowerCase().includes(s) && !r.loai_van?.toLowerCase().includes(s) && !r.nguon?.toLowerCase().includes(s) && !r.ma_sp?.toLowerCase().includes(s) && !r.ten_sp?.toLowerCase().includes(s)) return false
    }
    if (filterNguon && r.nguon !== filterNguon) return false
    if (filterNhom && r.nhom !== filterNhom) return false
    if (filterSoMat && r.so_mat !== parseInt(filterSoMat)) return false
    if (filterLoaiVan && r.loai_van !== filterLoaiVan) return false
    return true
  })

  const nguonList = [...new Set(data.map(r => r.nguon))] as string[]
  const nhomList = [...new Set(data.map(r => r.nhom))] as string[]
  const loaiVanList = [...new Set(data.map(r => r.loai_van))] as string[]

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Tính Giá ONE LAMINATE (HPL)</h1>

      <div style={{ background: colors.card, borderRadius: radius.lg, padding: 20, border: `1px solid ${colors.border}`, boxShadow: shadow.card, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 180, flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Tìm kiếm</label>
            <input style={inputStyle} placeholder="Mã màu, loại ván..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ minWidth: 120 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Nguồn</label>
            <select style={inputStyle} value={filterNguon} onChange={e => setFilterNguon(e.target.value)}>
              <option value="">Tất cả</option>
              {nguonList.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 100 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Nhóm</label>
            <select style={inputStyle} value={filterNhom} onChange={e => setFilterNhom(e.target.value)}>
              <option value="">Tất cả</option>
              {nhomList.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 180 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Loại ván</label>
            <select style={inputStyle} value={filterLoaiVan} onChange={e => setFilterLoaiVan(e.target.value)}>
              <option value="">Tất cả</option>
              {loaiVanList.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 90 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Số mặt</label>
            <select style={inputStyle} value={filterSoMat} onChange={e => setFilterSoMat(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="1">1 mặt</option>
              <option value="2">2 mặt</option>
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
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Nhóm</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Giá foil</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Nguồn</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Loại ván</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Độ dày</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Số mặt</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: colors.primaryDark, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Giá</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id || i} style={{ background: i % 2 === 0 ? colors.card : colors.surfaceSecondary }}>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: r.ma_sp ? colors.primary : colors.textMuted, fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ whiteSpace: 'nowrap' }}>{r.ma_sp || '—'}</span>
                        <AssignMisaCode module="one_laminate" table="bang_gia_chuan_tinh_gia_one_laminate" rowId={r.id} searchStr={`${r.ma_mau} ${r.nhom} ${r.loai_van} ${r.do_day} ${r.so_mat}`} currentMa={r.ma_sp} currentTen={r.ten_sp} onAssigned={fetchData} />
                      </div>
                    </td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: r.ten_sp ? colors.text : colors.textMuted, fontSize: 12 }}>{r.ten_sp || '—'}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text, fontWeight: 600, fontFamily: 'monospace' }}>{r.ma_mau}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text, fontSize: 12 }}>{r.nhom}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, textAlign: 'right', color: colors.textSecondary, fontSize: 12 }}>{r.gia_foil ? formatNum(r.gia_foil) : ''}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text, fontSize: 12 }}>{r.nguon}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text, fontSize: 12 }}>{r.loai_van}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text, fontWeight: 600 }}>{r.do_day}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, textAlign: 'center', color: colors.textSecondary }}>{r.so_mat} mặt</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, textAlign: 'right', color: colors.primaryDark, fontWeight: 700, fontSize: 14 }}>{formatNum(r.gia)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 14px', fontSize: 12, color: colors.textMuted, borderTop: `1px solid ${colors.borderLight}` }}>
            Tổng số: {filtered.length} / {data.length} dòng
          </div>
        </div>
      )}
    </div>
  )
}
