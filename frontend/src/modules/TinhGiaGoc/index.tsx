import { useState, useEffect } from 'react'
import { apiPost, apiGet } from '../../lib/api'
import { colors as theme, shadow, radius, btn, input as inp, pageContainer } from '../../theme'
import { formatNum } from '../../lib/format'

const styles = {
  container: pageContainer,
  title: { fontSize: 18, fontWeight: 600, color: theme.text, margin: 0 },
  subtitle: { color: theme.textMuted, fontSize: 14, margin: '4px 0 0' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 } as React.CSSProperties,
  section: { background: theme.card, borderRadius: radius.lg, padding: 16, boxShadow: shadow.card, border: `1px solid ${theme.border}` },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: theme.textSecondary, margin: '0 0 12px', textTransform: 'uppercase' as const, letterSpacing: 0.3 },
  field: { marginBottom: 10 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: theme.textSecondary, marginBottom: 3 },
  input: { ...inp },
  select: { ...inp, cursor: 'pointer' as const },
  btn: { ...btn(theme.primary), marginTop: 8 },
  bigNum: { fontSize: 28, fontWeight: 700, color: theme.primary, margin: '8px 0 0' },
  bigLabel: { fontSize: 13, color: theme.textMuted, margin: 0 },
  resultCard: { background: theme.surfaceSecondary, borderRadius: radius.md, padding: '14px 18px', textAlign: 'center' as const },
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 },
  detailItem: { background: theme.surfaceSecondary, borderRadius: radius.md, padding: '10px 14px' },
  detailLabel: { fontSize: 12, color: theme.textMuted, margin: 0 },
  detailValue: { fontSize: 16, fontWeight: 600, color: theme.text, margin: '4px 0 0' },
  error: { padding: '8px 12px', background: theme.dangerLight, color: theme.danger, borderRadius: radius.md, marginTop: 12, fontSize: 14, border: `1px solid ${theme.danger}44` },
}

export default function TinhGiaGocPage() {
  const [loaiCotGo, setLoaiCotGo] = useState('')
  const [doDay, setDoDay] = useState('')
  const [cap, setCap] = useState('')
  const [tier, setTier] = useState('PREMIUM')
  const [bangBeMat, setBangBeMat] = useState('')
  const [maMau, setMaMau] = useState('')
  const [soMat, setSoMat] = useState(1)

  const [cotGoList, setCotGoList] = useState<string[]>([])
  const [caps, setCaps] = useState<string[]>([])
  const [doDays, setDoDays] = useState<string[]>([])
  const [bangBeMatList, setBangBeMatList] = useState<string[]>([])
  const [colorList, setColorList] = useState<string[]>([])

  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    apiGet('/pricing/cot-go-tree').then(d => setCotGoList((d || []).map((r: any) => r.loai))).catch(() => {})
    apiGet('/pricing/bang-be-mat').then(d => setBangBeMatList((d || []).map((r: any) => r.bang))).catch(() => {})
  }, [])

  useEffect(() => {
    if (!loaiCotGo) { setCaps([]); setDoDays([]); return }
    apiGet(`/pricing/cot-go-caps?loai=${encodeURIComponent(loaiCotGo)}&tier=${encodeURIComponent(tier)}`)
      .then((d: any) => { setCaps(d.caps || []); setDoDays(d.do_days || []) })
      .catch(() => {})
  }, [loaiCotGo, tier])

  useEffect(() => {
    if (!bangBeMat || !tier) { setColorList([]); return }
    apiGet(`/pricing/ma-mau-by-bang?bang=${encodeURIComponent(bangBeMat)}&tier=${encodeURIComponent(tier)}`)
      .then((d: any) => setColorList((d || []).map((r: any) => r.ma_mau)))
      .catch(() => {})
  }, [bangBeMat, tier])

  const handleCalc = async () => {
    if (!doDay) { setError('Chọn độ dày'); return }
    setLoading(true); setError(null)
    try {
      const res = await apiPost('/pricing/calculate-base-price', {
        loai_cot_go: loaiCotGo || undefined,
        do_day: doDay,
        cap: cap || undefined,
        tier,
        bang_be_mat: bangBeMat || undefined,
        ma_mau: maMau || undefined,
        so_mat: soMat,
      })
      setResult(res)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Tính giá gốc</h1>
      <p style={styles.subtitle}>Công thức: Giá cốt gỗ + Giá bề mặt phủ × số mặt</p>

      <div style={styles.grid}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Thông tin đầu vào</h2>

          <div style={styles.field}>
            <label style={styles.label}>Loại cốt gỗ</label>
            <select style={styles.select} value={loaiCotGo} onChange={e => setLoaiCotGo(e.target.value)}>
              <option value="">-- Chọn --</option>
              {cotGoList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Cấp *</label>
            <select style={styles.select} value={cap} onChange={e => setCap(e.target.value)}>
              <option value="">-- Chọn --</option>
              {caps.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Độ dày *</label>
            <select style={styles.select} value={doDay} onChange={e => setDoDay(e.target.value)}>
              <option value="">-- Chọn --</option>
              {doDays.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Tier</label>
            <select style={styles.select} value={tier} onChange={e => setTier(e.target.value)}>
              <option value="PREMIUM">PREMIUM</option>
              <option value="BBG PREMIER">BBG PREMIER</option>
            </select>
          </div>

          <div style={{ borderTop: `1px solid ${theme.border}`, margin: '12px 0', paddingTop: 12 }}>
            <h2 style={styles.sectionTitle}>Bề mặt phủ</h2>

            <div style={styles.field}>
              <label style={styles.label}>Bảng bề mặt</label>
              <select style={styles.select} value={bangBeMat} onChange={e => setBangBeMat(e.target.value)}>
                <option value="">-- Không --</option>
                {bangBeMatList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Mã màu</label>
              <select style={styles.select} value={maMau} onChange={e => setMaMau(e.target.value)}>
                <option value="">-- Chọn --</option>
                {colorList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Số mặt</label>
              <select style={styles.select} value={soMat} onChange={e => setSoMat(Number(e.target.value))}>
                <option value={1}>1 mặt</option>
                <option value={2}>2 mặt</option>
              </select>
            </div>
          </div>

          <button style={styles.btn} onClick={handleCalc} disabled={loading}>
            {loading ? 'Đang tính...' : 'Tính giá gốc'}
          </button>
          {error && <div style={styles.error}>{error}</div>}
        </div>

        {result && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Kết quả</h2>

            <div style={styles.resultCard}>
              <p style={styles.bigLabel}>TỔNG GIÁ GỐC</p>
              <p style={styles.bigNum}>{result.tong_gia !== null ? formatNum(result.tong_gia) + ' đ' : '—'}</p>
            </div>

            <div style={styles.detailGrid}>
              <div style={styles.detailItem}>
                <p style={styles.detailLabel}>Giá cốt gỗ</p>
                <p style={styles.detailValue}>{result.gia_cot_go !== null ? formatNum(result.gia_cot_go) + ' đ' : '—'}</p>
                {result.cot_go_match && (
                  <p style={{ fontSize: 11, color: theme.textMuted, margin: '2px 0 0' }}>
                    {result.cot_go_match.loai} / {result.cot_go_match.do_day} / {result.cot_go_match.cap}
                  </p>
                )}
              </div>
              <div style={styles.detailItem}>
                <p style={styles.detailLabel}>Giá bề mặt ({soMat} mặt)</p>
                <p style={styles.detailValue}>{result.gia_be_mat !== null ? formatNum(result.gia_be_mat) + ' đ' : '—'}</p>
                {result.be_mat_match && (
                  <p style={{ fontSize: 11, color: theme.textMuted, margin: '2px 0 0' }}>
                    {result.be_mat_match.bang} / {result.be_mat_match.nhom}
                  </p>
                )}
              </div>
            </div>

            {result.loi && (
              <div style={styles.error}>{result.loi}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
