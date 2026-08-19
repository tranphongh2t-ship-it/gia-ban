import { useState, useCallback, useEffect } from 'react'
import { apiGet, apiPost } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { colors, shadow, radius, input, pageContainer, pageTitle, btn, spinner } from '../../theme'
import { formatNum } from '../../lib/format'
import AssignMisaCode from '../../components/AssignMisaCode'
import PaginationBar, { DEFAULT_PAGE_SIZE } from '../../components/PaginationBar'
import GuideTabs from '../../components/GuideTabs'
import { vdoGuideTabs } from '../../guides/vdo'

const inputStyle: React.CSSProperties = { ...input, width: '100%', boxSizing: 'border-box' }

const PHU_THU_LABELS: Record<string, string> = {
  basic: 'Basic', eco: 'Economy', standard: 'Standard',
  premium_wood_art: 'Premium W/A', premium_mau: 'Premium Màu',
  superb: 'Superb', superb_dacbiet: 'Superb (Màu ĐB)',
}

interface BoardTypeConfig {
  title: string
  apiPath: string   // e.g., 'tinh-gia-vdo'
  gradeLabel: string
}

const BOARD_TYPES: Record<string, BoardTypeConfig> = {
  vdo: { title: 'VÁN DĂM OKAL', apiPath: 'tinh-gia-vdo', gradeLabel: 'Loại ván' },
  vmh: { title: 'VÁN MDF HDF', apiPath: 'tinh-gia-vmh', gradeLabel: 'Loại ván' },
}

interface Props {
  boardType?: string
}

export default function TinhGiaBoardPage({ boardType: bt }: Props) {
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('feature:edit-data')
  const boardType = bt || 'vdo'
  const cfg = BOARD_TYPES[boardType]
  const tableName = boardType === 'vmh' ? 'bang_gia_chuan_tinh_gia_vmh' : 'bang_gia_chuan_tinh_gia_vdo'

  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [computing, setComputing] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [search, setSearch] = useState('')
  const [filterNhom, setFilterNhom] = useState('')
  const [filterMat, setFilterMat] = useState<'' | '1' | '2'>('')
  const [filterAssigned, setFilterAssigned] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = DEFAULT_PAGE_SIZE

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet(`/gia-chuan/${cfg.apiPath}`)
      setData(res.data || [])
    } catch { setData([]) }
    finally { setLoading(false) }
  }, [cfg.apiPath])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCompute = async () => {
    setComputing(true)
    try {
      const res = await apiPost(`/gia-chuan/${cfg.apiPath}/tinh-toan`, {})
      alert(`Đã tính xong: ${res.total} dòng${res.synced ? ` • ${res.synced} mã đã đồng bộ MISA` : ''}`)
      fetchData()
    } catch (e: any) { alert('Lỗi: ' + e.message) }
    finally { setComputing(false) }
  }

  const handleAutoAssign = async () => {
    setAssigning(true)
    try {
      const res = await apiPost(`/gia-chuan/${cfg.apiPath}/auto-assign-ma-sp`, {})
      alert(`Đã gán ${res.assigned} mã SP (${res.skipped} dòng không có mã để trống)`)
      fetchData()
    } catch (e: any) { alert('Lỗi: ' + e.message) }
    finally { setAssigning(false) }
  }

  const filtered = data.filter(r => {
    if (search) {
      const s = search.toLowerCase()
      if (!String(r.board_quy_cach || '').toLowerCase().includes(s) &&
          !String(r.board_loai || '').toLowerCase().includes(s) &&
          !String(r.color_nhom || '').toLowerCase().includes(s) &&
          !String(r.ma_mau || '').toLowerCase().includes(s) &&
          !String(r.ma_sp || '').toLowerCase().includes(s)) return false
    }
    if (filterNhom && r.color_nhom !== filterNhom) return false
    if (filterMat && String(r.so_mat) !== filterMat) return false
    if (filterAssigned === 'yes' && !r.ma_sp) return false
    if (filterAssigned === 'no' && r.ma_sp) return false
    return true
  })

  const nhomList = [...new Set(data.map(r => r.color_nhom))] as string[]
  const totalDisplay = filtered.length
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  useEffect(() => { setPage(0) }, [search, filterNhom, filterMat, filterAssigned])

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Tính Giá Gốc {cfg.title}</h1>

      <div style={{ background: colors.card, borderRadius: radius.lg, padding: 20, border: `1px solid ${colors.border}`, boxShadow: shadow.card, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 200, flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Tìm kiếm</label>
            <input style={inputStyle} placeholder="Quy cách, loại ván, mã màu, mã SP..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ minWidth: 140 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Nhóm màu</label>
            <select style={inputStyle} value={filterNhom} onChange={e => setFilterNhom(e.target.value)}>
              <option value="">Tất cả</option>
              {nhomList.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 100 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Số mặt</label>
            <select style={inputStyle} value={filterMat} onChange={e => setFilterMat(e.target.value as any)}>
              <option value="">Tất cả</option>
              <option value="1">1 mặt</option>
              <option value="2">2 mặt</option>
            </select>
          </div>
          <div style={{ minWidth: 120 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Mã SP</label>
            <select style={inputStyle} value={filterAssigned} onChange={e => setFilterAssigned(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="yes">Đã gán</option>
              <option value="no">Chưa gán</option>
            </select>
          </div>
          {canEdit && <button style={{ ...btn(colors.success, '#fff'), fontWeight: 600 }} onClick={handleCompute} disabled={computing}>
            {computing ? 'Đang tính...' : 'Tính toán lại'}
          </button>}
          {canEdit && <button style={{ ...btn(colors.primary, '#fff'), fontWeight: 600 }} onClick={handleAutoAssign} disabled={assigning}>
            {assigning ? 'Đang gán...' : 'Gán Mã SP từ danh mục MISA'}
          </button>}
        </div>
      </div>

      {loading ? <div style={spinner}>Đang tải...</div> : (
        <div style={{ background: colors.card, borderRadius: radius.lg, overflow: 'hidden', border: `1px solid ${colors.border}`, boxShadow: shadow.card }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 1300 }}>
              <thead>
                <tr style={{ background: colors.surfaceSecondary }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Mã SP</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Mô tả SP</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Quy cách</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>{cfg.gradeLabel}</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Mã màu</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Giá phôi</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Nhóm màu</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Loại</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Mặt</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Phụ thu</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Giá phụ thu</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: colors.primaryDark, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>Tổng giá gốc</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => (
                  <tr key={r.id || i} style={{ background: i % 2 === 0 ? colors.card : colors.surfaceSecondary }}>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: r.ma_sp ? colors.primary : colors.textMuted, fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ whiteSpace: 'nowrap' }}>{r.ma_sp || '—'}</span>
                        <AssignMisaCode module={boardType} table={tableName} rowId={r.id} searchStr={`${r.board_quy_cach} ${r.board_loai} ${r.ma_mau} ${r.so_mat} mặt`} currentMa={r.ma_sp} currentTen={r.ten_sp} onAssigned={fetchData} />
                      </div>
                    </td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: r.ten_sp ? colors.text : colors.textMuted, fontSize: 12 }}>{r.ten_sp || '—'}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text, fontWeight: 600 }}>{r.board_quy_cach}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text }}>{r.board_loai}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text, fontWeight: 600 }}>{r.ma_mau}</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text, fontWeight: 600 }}>{formatNum(r.board_gia)}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text }}>{r.color_nhom}</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.textSecondary, fontSize: 12 }}>{r.color_loai}</td>
                    <td style={{ padding: '8px 14px', textAlign: 'center', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text }}>{r.so_mat}m</td>
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.textSecondary, fontSize: 12 }}>{PHU_THU_LABELS[r.phu_thu_loai] || r.phu_thu_loai}</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text, fontWeight: 600 }}>{formatNum(r.phu_thu_gia)}</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', borderBottom: `1px solid ${colors.borderLight}`, color: colors.primaryDark, fontWeight: 700, fontSize: 14 }}>{formatNum(r.tong_gia)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar page={page} pageCount={pageCount} total={totalDisplay} onPageChange={setPage} />
        </div>
      )}

      <GuideTabs title="Hướng dẫn" tabs={vdoGuideTabs(boardType as 'vdo' | 'vmh')} />
    </div>
  )
}
