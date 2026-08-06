import { useState, useCallback, useEffect } from 'react'
import { apiGet, apiPost } from '../../lib/api'
import { colors, shadow, radius, input, pageContainer, pageTitle, btn, spinner } from '../../theme'
import { formatNum } from '../../lib/format'
import AssignMisaCode from '../../components/AssignMisaCode'

const inputStyle: React.CSSProperties = { ...input, width: '100%', boxSizing: 'border-box' }

const tableWrap: React.CSSProperties = {
  background: colors.card, borderRadius: radius.lg, overflow: 'hidden',
  border: `1px solid ${colors.border}`, boxShadow: shadow.card, marginBottom: 24,
}

const cell = (align = 'left'): React.CSSProperties => ({
  padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, textAlign: align as any,
})

const th = (align = 'left'): React.CSSProperties => ({
  padding: '10px 14px', textAlign: align as any, color: colors.textMuted,
  fontWeight: 600, fontSize: 11, textTransform: 'uppercase',
  borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap',
})

const priceCell: React.CSSProperties = {
  ...cell('right'), color: colors.primaryDark, fontWeight: 700, fontSize: 14,
}

export default function TinhGiaVeneerMatPhuKhacPage() {
  const [veneer, setVeneer] = useState<any[]>([])
  const [matPhuKhac, setMatPhuKhac] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [v, m] = await Promise.all([
        apiGet('/gia-chuan/veneer?limit=100'),
        apiGet('/gia-chuan/mat-phu-khac?limit=100'),
      ])
      setVeneer(v.data || [])
      setMatPhuKhac(m.data || [])
    } catch { setVeneer([]); setMatPhuKhac([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAutoAssignVeneer = async () => {
    setAssigning(true)
    try {
      const res = await apiPost('/gia-chuan/veneer/auto-assign-ma-sp', {})
      alert(`Đã gán ${res.assigned} mã SP (${res.skipped} dòng không có mã để trống)`)
      fetchData()
    } catch (e: any) { alert('Lỗi: ' + e.message) }
    finally { setAssigning(false) }
  }

  if (loading) return <div style={pageContainer}><div style={spinner}>Đang tải...</div></div>

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Giá gốc VENEER & MẶT PHỦ KHÁC</h1>

      {/* === VENEER === */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.text, margin: 0 }}>VENEER</h2>
        <button style={{ ...btn(colors.primary, '#fff'), fontWeight: 600 }} onClick={handleAutoAssignVeneer} disabled={assigning}>
          {assigning ? 'Đang gán...' : 'Gán Mã SP từ danh mục MISA'}
        </button>
      </div>
      <div style={tableWrap}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 800 }}>
            <thead>
              <tr style={{ background: colors.surfaceSecondary }}>
                <th style={th()}>Mã SP</th>
                <th style={th()}>Mô tả SP</th>
                <th style={th()}>Loại</th>
                <th style={th()}>Bề mặt</th>
                <th style={th('right')}>Giá 1 mặt A</th>
                <th style={th('right')}>Giá 1 mặt B</th>
                <th style={th('right')}>Giá 2 mặt AB/AA</th>
              </tr>
            </thead>
            <tbody>
              {veneer.map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 === 0 ? colors.card : colors.surfaceSecondary }}>
                  <td style={{ ...cell(), color: r.ma_sp ? colors.primary : colors.textMuted, fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ whiteSpace: 'nowrap' }}>{r.ma_sp || '—'}</span>
                      <AssignMisaCode module="veneer" table="bang_gia_chuan_veneer" rowId={r.id} searchStr={`${r.loai} ${r.be_mat}`} currentMa={r.ma_sp} currentTen={r.ten_sp} onAssigned={fetchData} />
                    </div>
                  </td>
                  <td style={{ ...cell(), color: r.ten_sp ? colors.text : colors.textMuted, fontSize: 12 }}>{r.ten_sp || '—'}</td>
                  <td style={{ ...cell(), color: colors.textSecondary, fontSize: 12 }}>{r.loai}</td>
                  <td style={{ ...cell(), color: colors.text, fontWeight: 600 }}>{r.be_mat}</td>
                  <td style={priceCell}>{r.gia_1m_a != null ? formatNum(r.gia_1m_a) : ''}</td>
                  <td style={priceCell}>{r.gia_1m_b != null ? formatNum(r.gia_1m_b) : ''}</td>
                  <td style={priceCell}>{r.gia_2m != null ? formatNum(r.gia_2m) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 14px', fontSize: 12, color: colors.textMuted, borderTop: `1px solid ${colors.borderLight}` }}>
          {veneer.length} dòng
        </div>
      </div>

      {/* === MẶT PHỦ KHÁC === */}
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: colors.text }}>MẶT PHỦ KHÁC</h2>
      <div style={tableWrap}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 800 }}>
            <thead>
              <tr style={{ background: colors.surfaceSecondary }}>
                <th style={th()}>Mã SP</th>
                <th style={th()}>Mô tả SP</th>
                <th style={th()}>Tên</th>
                <th style={th('right')}>Giá 1 mặt</th>
                <th style={th('right')}>Giá 2 mặt</th>
                <th style={th()}>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {matPhuKhac.map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 === 0 ? colors.card : colors.surfaceSecondary }}>
                  <td style={{ ...cell(), color: r.ma_sp ? colors.primary : colors.textMuted, fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ whiteSpace: 'nowrap' }}>{r.ma_sp || '—'}</span>
                      <AssignMisaCode module="mat_phu_khac" table="bang_gia_chuan_mat_phu_khac" rowId={r.id} searchStr={r.ten || ''} currentMa={r.ma_sp} currentTen={r.ten_sp} onAssigned={fetchData} />
                    </div>
                  </td>
                  <td style={{ ...cell(), color: r.ten_sp ? colors.text : colors.textMuted, fontSize: 12 }}>{r.ten_sp || '—'}</td>
                  <td style={{ ...cell(), color: colors.text, fontWeight: 600 }}>{r.ten}</td>
                  <td style={priceCell}>{r.gia_1m != null ? formatNum(r.gia_1m) : ''}</td>
                  <td style={priceCell}>{r.gia_2m != null ? formatNum(r.gia_2m) : ''}</td>
                  <td style={{ ...cell(), color: colors.textSecondary, fontSize: 12 }}>{r.ghi_chu}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 14px', fontSize: 12, color: colors.textMuted, borderTop: `1px solid ${colors.borderLight}` }}>
          {matPhuKhac.length} dòng
        </div>
      </div>
    </div>
  )
}
