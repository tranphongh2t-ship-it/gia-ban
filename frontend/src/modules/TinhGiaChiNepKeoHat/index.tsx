import { useState, useCallback, useEffect } from 'react'
import { apiGet, apiPost } from '../../lib/api'
import { colors, shadow, radius, pageContainer, pageTitle, spinner, btn } from '../../theme'
import { formatNum } from '../../lib/format'
import AssignMisaCode from '../../components/AssignMisaCode'
import GuideTabs from '../../components/GuideTabs'
import { chiNepKeoHatGuideTabs } from '../../guides/chiNepKeoHat'

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
const sectionTitle: React.CSSProperties = {
  fontSize: 16, fontWeight: 700, marginBottom: 10, marginTop: 8, color: colors.text,
}

const nhomLabels: Record<string, { title: string }> = {
  PVC: { title: 'CHỈ PVC NHẬP KHẨU CAO CẤP' },
  VENEER: { title: 'CHỈ VENEER' },
  ACRYLIC: { title: 'CHỈ ACRYLIC NHẬP KHẨU' },
  ABS_PVC: { title: 'CHỈ ABS / PVC BÓNG' },
}

const nhomOrder = ['PVC', 'VENEER', 'ACRYLIC', 'ABS_PVC']

export default function TinhGiaChiNepKeoHatPage() {
  const [chiNep, setChiNep] = useState<any[]>([])
  const [keoHat, setKeoHat] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [c, k] = await Promise.all([
        apiGet('/gia-chuan/chi-nep?limit=200'),
        apiGet('/gia-chuan/keo-hat?limit=100'),
      ])
      setChiNep(c.data || [])
      setKeoHat(k.data || [])
    } catch { setChiNep([]); setKeoHat([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAutoAssignChiNep = async () => {
    setAssigning(true)
    try {
      const res = await apiPost('/gia-chuan/chi-nep/auto-assign-ma-sp', {})
      alert(`Đã gán ${res.assigned} mã SP (${res.skipped} dòng không có mã để trống)`)
      fetchData()
    } catch (e: any) { alert('Lỗi: ' + e.message) }
    finally { setAssigning(false) }
  }

  if (loading) return <div style={pageContainer}><div style={spinner}>Đang tải...</div></div>

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Giá gốc CHỈ NẸP & KEO HẠT</h1>

      {nhomOrder.map(nhom => {
        const rows = chiNep.filter(r => r.nhom === nhom)
        if (rows.length === 0) return null
        const grp = nhomLabels[nhom]
        return (
          <div key={nhom}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <h2 style={{ ...sectionTitle, margin: 0 }}>{grp.title}</h2>
              {nhom === 'PVC' && (
                <button style={{ ...btn(colors.primary, '#fff'), fontWeight: 600 }} onClick={handleAutoAssignChiNep} disabled={assigning}>
                  {assigning ? 'Đang gán...' : 'Gán Mã SP từ danh mục MISA'}
                </button>
              )}
            </div>
            <div style={tableWrap}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 500 }}>
                  <thead>
                    <tr style={{ background: colors.surfaceSecondary }}>
                      <th style={th()}>Mã SP</th>
                      <th style={th()}>Mô tả SP</th>
                      <th style={th()}>Kích thước</th>
                      <th style={th('right')}>Giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.id} style={{ background: i % 2 === 0 ? colors.card : colors.surfaceSecondary }}>
                        <td style={{ ...cell(), color: r.ma_sp ? colors.primary : colors.textMuted, fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ whiteSpace: 'nowrap' }}>{r.ma_sp || '—'}</span>
                            <AssignMisaCode module="chi_nep" table="bang_gia_chuan_chi_nep" rowId={r.id} searchStr={`${r.ma_sp} ${r.kich_thuoc}`} currentMa={r.ma_sp} currentTen={r.ten_sp} onAssigned={fetchData} />
                          </div>
                        </td>
                        <td style={{ ...cell(), color: r.ten_sp ? colors.text : colors.textMuted, fontSize: 12 }}>{r.ten_sp || '—'}</td>
                        <td style={{ ...cell(), color: colors.textSecondary, fontSize: 12 }}>{r.kich_thuoc}</td>
                        <td style={{ ...cell('right'), color: colors.primaryDark, fontWeight: 700, fontSize: 14 }}>
                          {r.gia != null ? formatNum(r.gia) : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '10px 14px', fontSize: 12, color: colors.textMuted, borderTop: `1px solid ${colors.borderLight}` }}>
                {rows.length} dòng
              </div>
            </div>
          </div>
        )
      })}

      {/* === KEO HẠT === */}
      <h2 style={sectionTitle}>KEO HẠT NÓNG CHẢY</h2>
      <div style={tableWrap}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 500 }}>
            <thead>
              <tr style={{ background: colors.surfaceSecondary }}>
                <th style={th()}>Mã</th>
                <th style={th()}>Nhiệt độ</th>
                <th style={th()}>Màu</th>
                <th style={th('right')}>Giá 1 ký</th>
                <th style={th('right')}>Giá bao 25 ký</th>
              </tr>
            </thead>
            <tbody>
              {keoHat.map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 === 0 ? colors.card : colors.surfaceSecondary }}>
                  <td style={{ ...cell(), color: colors.text, fontWeight: 600 }}>{r.ma}</td>
                  <td style={{ ...cell(), color: colors.textSecondary, fontSize: 12 }}>{r.nhiet_do}</td>
                  <td style={{ ...cell(), color: colors.textSecondary, fontSize: 12 }}>{r.mau}</td>
                  <td style={{ ...cell('right'), color: colors.primaryDark, fontWeight: 700, fontSize: 14 }}>
                    {r.gia_1kg != null ? formatNum(r.gia_1kg) : ''}
                  </td>
                  <td style={{ ...cell('right'), color: colors.primaryDark, fontWeight: 700, fontSize: 14 }}>
                    {r.gia_25kg != null ? formatNum(r.gia_25kg) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 14px', fontSize: 12, color: colors.textMuted, borderTop: `1px solid ${colors.borderLight}` }}>
          {keoHat.length} dòng
        </div>
      </div>

      <GuideTabs title="Hướng dẫn" tabs={chiNepKeoHatGuideTabs} />
    </div>
  )
}
