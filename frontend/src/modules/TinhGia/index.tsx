import { useState } from 'react'
import { apiPost } from '../../lib/api'
import { colors, shadow, radius, btn, input as inp, pageContainer } from '../../theme'

const styles = {
  container: pageContainer,
  title: { fontSize: 18, fontWeight: 600, color: colors.text, margin: 0 },
  subtitle: { color: colors.textMuted, fontSize: 14, margin: '4px 0 0' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 } as React.CSSProperties,
  section: { background: colors.card, borderRadius: radius.lg, padding: 16, boxShadow: shadow.card, border: `1px solid ${colors.border}` },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: colors.textSecondary, margin: '0 0 12px', textTransform: 'uppercase' as const, letterSpacing: 0.3 },
  field: { marginBottom: 10 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: colors.textSecondary, marginBottom: 3 },
  input: { ...inp },
  select: { ...inp, cursor: 'pointer' as const },
  btn: { ...btn(colors.primary), marginTop: 8 },
  resultGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 },
  resultItem: { background: colors.surfaceSecondary, borderRadius: radius.md, padding: '10px 14px' },
  resultLabel: { fontSize: 12, color: colors.textMuted, margin: 0 },
  resultValue: { fontSize: 18, fontWeight: 700, color: colors.text, margin: '4px 0 0' },
  error: { padding: '8px 12px', background: colors.dangerLight, color: colors.danger, borderRadius: radius.md, marginTop: 12, fontSize: 14, border: `1px solid ${colors.danger}44` },
  subTitle: { fontSize: 13, fontWeight: 600, color: colors.text, margin: '16px 0 8px' },
  miniGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
}

const PHAN_LOAI_OPTIONS = [
  { value: 'DL', label: 'DL' },
  { value: 'DLVIP', label: 'DLVIP' },
  { value: 'DLND', label: 'DLND' },
  { value: 'DM', label: 'DM' },
  { value: 'VIP', label: 'VIP' },
  { value: 'PREMIUM', label: 'PREMIUM' },
  { value: 'PRI', label: 'PRI' },
  { value: 'R', label: 'R' },
]

export default function TinhGiaPage() {
  const [maKH, setMaKH] = useState('')
  const [maSP, setMaSP] = useState('')
  const [ngay, setNgay] = useState(new Date().toISOString().split('T')[0])
  const [phanLoai, setPhanLoai] = useState('')
  const [ckVanChuyen, setCkVanChuyen] = useState(0)
  const [X, setX] = useState(0)
  const [Y, setY] = useState(0)
  const [AE, setAE] = useState(0)
  const [AH, setAH] = useState(0)
  const [P, setP] = useState(0)
  const [U, setU] = useState(0)
  const [V, setV] = useState(0)
  const [AC, setAC] = useState(0)

  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCalculate = async () => {
    if (!maKH || !maSP || !ngay) {
      setError('Vui lòng nhập Mã KH, Mã SP và Ngày')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await apiPost('/pricing/calculate-ban', {
        maKH, maSP, ngay, phanLoaiKH: phanLoai,
        ckVanChuyen,
        X, Y, AE: AE || undefined, AH: AH || undefined,
        P: P || undefined, U: U || undefined,
        V: V || undefined, AC: AC || undefined,
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
      <h1 style={styles.title}>Tính giá / Chiết khấu</h1>
      <p style={styles.subtitle}>Engine pricing — SPEC mục 4 (AD + Z1-Z5)</p>

      <div style={styles.grid}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Thông tin đầu vào</h2>

          <div style={styles.field}>
            <label style={styles.label}>Mã KH *</label>
            <input style={styles.input} value={maKH} onChange={e => setMaKH(e.target.value)} placeholder="VD: KH001" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Mã SP *</label>
            <input style={styles.input} value={maSP} onChange={e => setMaSP(e.target.value)} placeholder="VD: MEVE123" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Ngày *</label>
            <input style={styles.input} type="date" value={ngay} onChange={e => setNgay(e.target.value)} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Phân loại KH</label>
            <select style={styles.select} value={phanLoai} onChange={e => setPhanLoai(e.target.value)}>
              <option value="">-- Chọn --</option>
              {PHAN_LOAI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>CK vận chuyển</label>
            <input style={styles.input} type="number" value={ckVanChuyen} onChange={e => setCkVanChuyen(Number(e.target.value))} />
          </div>

          <h3 style={styles.subTitle}>Doanh thu (cột Z)</h3>
          <div style={styles.miniGrid}>
            {[
              { label: 'X (Doanh số)', val: X, set: setX },
              { label: 'Y (Giảm trừ)', val: Y, set: setY },
              { label: 'AE (Giá trị thuế)', val: AE, set: setAE },
              { label: 'AH (Thuế suất %)', val: AH, set: setAH },
              { label: 'P (Đơn giá gốc)', val: P, set: setP },
              { label: 'U (Phụ phí)', val: U, set: setU },
              { label: 'V (Tỷ lệ CK %)', val: V, set: setV },
              { label: 'AC (Điều chỉnh)', val: AC, set: setAC },
            ].map(f => (
              <div key={f.label} style={styles.field}>
                <label style={styles.label}>{f.label}</label>
                <input style={styles.input} type="number" value={f.val} onChange={e => f.set(Number(e.target.value))} />
              </div>
            ))}
          </div>

          <button style={styles.btn} onClick={handleCalculate} disabled={loading}>
            {loading ? 'Đang tính...' : 'Tính toán'}
          </button>
          {error && <div style={styles.error}>{error}</div>}
        </div>

        {result && (
          <>
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Chiết khấu (cột AD)</h2>
              <div style={styles.resultGrid}>
                <ResultItem label="Nhóm SP (BE)" value={result.discount.nhomSP} />
                <ResultItem label="Loại KH (BF)" value={result.discount.loaiKH || '—'} />
                <ResultItem label="Cột CK OP2 (BG)" value={String(result.discount.cotCKOP2)} />
                <ResultItem label="Loại OP" value={result.discount.loaiOP} />
                <ResultItem label="CK đúng (AD)" value={`${result.discount.ckDung}${result.discount.ckDungDonVi === 'percent' ? '%' : 'đ'}`} />
                <ResultItem label="CK vận chuyển" value={String(result.discount.ckVanChuyen)} />
                <ResultItem label="Tổng CK" value={`${result.discount.ckTong}${result.discount.ckDungDonVi === 'percent' ? '%' : 'đ'}`} />
              </div>
            </div>
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Doanh thu (cột Z)</h2>
              <div style={styles.resultGrid}>
                {[
                  { label: 'Z1 = Doanh số sạch', value: result.revenue.Z1 },
                  { label: 'Z2 = Giá trị thuế', value: result.revenue.Z2 },
                  { label: 'Z3 = Đơn giá tính CK', value: result.revenue.Z3 },
                  { label: 'Z4 = CK theo đơn giá', value: result.revenue.Z4 },
                  { label: 'Z5 = Tổng cộng', value: result.revenue.Z5 },
                ].map(r => (
                  <ResultItem key={r.label} label={r.label} value={String(r.value)} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ResultItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.resultItem}>
      <p style={styles.resultLabel}>{label}</p>
      <p style={styles.resultValue}>{value}</p>
    </div>
  )
}
