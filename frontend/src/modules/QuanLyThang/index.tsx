import { useState, useEffect } from 'react'
import { apiGet, apiPost } from '../../lib/api'
import {
  colors, shadow, radius, btn, input, select,
  pageContainer, pageTitle, pageSubtitle, section, sectionTitle, spinner
} from '../../theme'

const P = {
  row: { display: 'flex', gap: 14, alignItems: 'end', flexWrap: 'wrap' as const, marginBottom: 16 },
  field: { display: 'flex', flexDirection: 'column' as const, gap: 4 },
  label: { fontSize: 13, fontWeight: 500, color: colors.textMuted },
  checkboxGroup: { display: 'flex', gap: 20, marginBottom: 16 },
  checkbox: {
    display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: colors.text,
    cursor: 'pointer', padding: '6px 14px', borderRadius: radius.sm, background: colors.surfaceSecondary,
    border: `1px solid ${colors.border}`,
  },
  infoBox: { fontSize: 13, color: colors.textMuted, marginBottom: 12, padding: 10, borderRadius: radius.sm, background: colors.surfaceSecondary, border: `1px solid ${colors.borderLight}` },
  previewTable: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 14, background: colors.card, borderRadius: radius.md, overflow: 'hidden', boxShadow: shadow.card },
  previewTh: { borderBottom: `1px solid ${colors.tableBorder}`, padding: '10px 14px', textAlign: 'left' as const, color: colors.textMuted, fontWeight: 600, fontSize: 11, background: colors.surfaceSecondary, textTransform: 'uppercase' as const, letterSpacing: 0.3 },
  previewTd: { borderBottom: `1px solid ${colors.tableBorder}`, padding: '10px 14px' },
  success: { padding: 16, background: colors.successLight, color: colors.successDark, borderRadius: radius.md, marginTop: 16, border: `1px solid ${colors.success}44` },
  error: { padding: 16, background: colors.dangerLight, color: colors.danger, borderRadius: radius.md, marginTop: 16, border: `1px solid ${colors.danger}44` },
  actionRow: { display: 'flex', gap: 8, marginTop: 16 },
  monthTag: {
    display: 'inline-flex', padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
    background: colors.primaryLight, color: colors.primary, border: `1px solid ${colors.primary}33`,
  },
}

export default function QuanLyThangPage() {
  const [months, setMonths] = useState<string[]>([])
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [tables, setTables] = useState<string[]>(['bang_gia_ck_op1', 'bang_gia_ck_op2', 'phan_bo_kh'])
  const [preview, setPreview] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [existingMonths, setExistingMonths] = useState<{ bang_gia_ck: string[]; phan_bo_kh: string[] }>({ bang_gia_ck: [], phan_bo_kh: [] })

  useEffect(() => {
    apiGet('/pricing/months').then(d => {
      setMonths(d.all_months || [])
      setExistingMonths({ bang_gia_ck: d.bang_gia_ck || [], phan_bo_kh: d.phan_bo_kh || [] })
    }).catch(() => {})
  }, [])

  const toggleTable = (t: string) => setTables(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const handlePreview = async () => {
    if (!source || !target || tables.length === 0) return
    setLoading(true); setError(null); setResult(null)
    try { const res = await apiPost('/pricing/clone-preview', { source, target, tables }); setPreview(res) }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleExecute = async () => {
    if (!source || !target || tables.length === 0) return
    if (!confirm(`Xác nhận sao chép cấu hình từ ${source} → ${target}?`)) return
    setExecuting(true); setError(null)
    try {
      const res = await apiPost('/pricing/clone-execute', { source, target, tables })
      setResult(res); setPreview(null)
      const d = await apiGet('/pricing/months')
      setMonths(d.all_months || [])
      setExistingMonths({ bang_gia_ck: d.bang_gia_ck || [], phan_bo_kh: d.phan_bo_kh || [] })
    } catch (e: any) { setError(e.message) }
    finally { setExecuting(false) }
  }

  const monthLabel = (s: string) => {
    const [m, y] = s.split('/')
    if (!m || !y) return s
    const months = ['', 'Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12']
    return `${months[parseInt(m)]}/${y}`
  }

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Quản lý tháng</h1>
      <p style={pageSubtitle}>Thêm tháng mới: sao chép cấu hình từ tháng cũ — SPEC mục 4.9</p>

      <div style={section}>
        <h2 style={sectionTitle}>Các tháng hiện có</h2>
        <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 8 }}>
          <strong>BangGiaCK:</strong>{' '}
          {existingMonths.bang_gia_ck.length > 0
            ? existingMonths.bang_gia_ck.map(m => <span key={m} style={P.monthTag}>{m}</span>)
            : 'không có'}
        </div>
        <div style={{ fontSize: 13, color: colors.textMuted }}>
          <strong>PhanBoKH:</strong>{' '}
          {existingMonths.phan_bo_kh.length > 0
            ? existingMonths.phan_bo_kh.map(m => <span key={m} style={P.monthTag}>{m}</span>)
            : 'không có'}
        </div>
      </div>

      <div style={section}>
        <h2 style={sectionTitle}>Sao chép cấu hình</h2>

        <div style={P.row}>
          <div style={P.field}>
            <label style={P.label}>Nguồn (tháng cũ)</label>
            <select style={select} value={source} onChange={e => setSource(e.target.value)}>
              <option value="">-- Chọn --</option>
              {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </div>
          <div style={P.field}>
            <label style={P.label}>Đích (tháng mới)</label>
            <input style={input} placeholder="VD: 08/2026" value={target} onChange={e => setTarget(e.target.value)} />
          </div>
        </div>

        <div style={P.infoBox}>Nhập tháng mới theo định dạng <strong>MM/YYYY</strong></div>

        <h3 style={{ ...sectionTitle, fontSize: 13, marginBottom: 10 }}>Chọn bảng cần sao chép</h3>
        <div style={P.checkboxGroup}>
          {[
            { key: 'bang_gia_ck_op1', label: 'Bảng giá CK — OP1' },
            { key: 'bang_gia_ck_op2', label: 'Bảng giá CK — OP2' },
            { key: 'phan_bo_kh', label: 'Phân bổ KH' },
          ].map(c => (
            <label key={c.key} style={{
              ...P.checkbox,
              background: tables.includes(c.key) ? colors.primaryLight : '#f8fafc',
              borderColor: tables.includes(c.key) ? colors.primary : colors.border,
            }}>
              <input type="checkbox" checked={tables.includes(c.key)} onChange={() => toggleTable(c.key)} />
              {c.label}
            </label>
          ))}
        </div>

        <button style={btn(colors.primary)} onClick={handlePreview} disabled={loading || !source || !target || tables.length === 0}>
          {loading ? 'Đang xem trước...' : 'Xem trước'}
        </button>
      </div>

      {error && <div style={P.error}>{error}</div>}

      {preview && (
        <div style={section}>
          <h2 style={sectionTitle}>Kết quả xem trước</h2>
          <table style={P.previewTable}>
            <thead><tr>
              <th style={P.previewTh}>Bảng</th>
              <th style={P.previewTh}>Dòng nguồn ({source})</th>
              <th style={P.previewTh}>Đã có ở đích ({target})</th>
              <th style={P.previewTh}>Sẽ thêm</th>
            </tr></thead>
            <tbody>
              {[
                { key: 'bang_gia_ck_op1', label: 'Bảng giá CK — OP1' },
                { key: 'bang_gia_ck_op2', label: 'Bảng giá CK — OP2' },
                { key: 'phan_bo_kh', label: 'Phân bổ KH' },
              ].filter(c => preview[c.key]).map(c => {
                const p = preview[c.key]
                const willAdd = Math.max(0, p.source - p.target_existing)
                return (
                  <tr key={c.key}>
                    <td style={P.previewTd}>{c.label}</td>
                    <td style={P.previewTd}>{p.source}</td>
                    <td style={P.previewTd}>{p.target_existing}</td>
                    <td style={{ ...P.previewTd, fontWeight: 600, color: willAdd > 0 ? colors.primary : colors.textMuted }}>{willAdd}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={P.actionRow}>
            <button style={btn(colors.textMuted, '#fff')} onClick={() => setPreview(null)} disabled={executing}>Huỷ</button>
            <button style={btn(colors.success)} onClick={handleExecute} disabled={executing}>
              {executing ? 'Đang sao chép...' : 'Xác nhận sao chép'}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div style={P.success}>
          <strong>{result.message}</strong>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 10 }}>
            {result.results.bang_gia_ck_op1 > 0 && <div>OP1: <strong>+{result.results.bang_gia_ck_op1}</strong> dòng</div>}
            {result.results.bang_gia_ck_op2 > 0 && <div>OP2: <strong>+{result.results.bang_gia_ck_op2}</strong> dòng</div>}
            {result.results.phan_bo_kh > 0 && <div>Phân bổ KH: <strong>+{result.results.phan_bo_kh}</strong> dòng</div>}
          </div>
          <button style={{ ...btn(colors.textMuted, '#fff'), marginTop: 12 }} onClick={() => setResult(null)}>Đóng</button>
        </div>
      )}
    </div>
  )
}
