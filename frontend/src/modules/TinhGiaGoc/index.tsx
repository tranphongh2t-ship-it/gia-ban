import { useState, useEffect } from 'react'
import { apiPost, apiGet } from '../../lib/api'
import { colors as theme, shadow, radius, btn, input as inp, pageContainer } from '../../theme'
import { formatNum } from '../../lib/format'

// ===== Nhóm Bảng Tính Giá (đồng bộ menu Layout.tsx) =====
interface NhomCfg {
  label: string
  color: string
  loai: string[]          // Loại cốt gỗ phù hợp (rỗng = tất cả)
  bang: string[]          // Bảng bề mặt phù hợp (rỗng = tất cả)
}

const NHOMS: NhomCfg[] = [
  { label: 'Tính Giá OSB', color: '#1ABB9C', loai: ['Ván OSB'], bang: [] },
  { label: 'Tính Giá Ván Phủ PVC FILM - PETG', color: '#4299e1', loai: [], bang: [] },
  { label: 'Tính Giá Ván Nhựa DURABO', color: '#f76707', loai: [], bang: [] },
  { label: 'Tính Giá VÁN NHỰA- PLYWOOD-OSB- GỖ GHÉP', color: '#ae3ec9', loai: ['Ván OSB', 'Gỗ Ghép', 'Ván Ép'], bang: ['NHÓM MÀU VÁN NHỰA - PLYWOOD - OSB - GỖ GHÉP'] },
  { label: 'Tính Giá Ván Ép', color: '#2fb344', loai: ['Ván Ép'], bang: [] },
  { label: 'Tính Giá Gỗ Ghép', color: '#f59f00', loai: ['Gỗ Ghép'], bang: [] },
  { label: 'Tính Giá Ván Trơn', color: '#17a2b8', loai: ['Ván Dăm - Okal', 'Ván MDF-HDF'], bang: ['220 MÀU MELAMINE', '98 MÀU MELAMINE'] },
  { label: 'Tính Giá VENEER & MẶT PHỦ KHÁC', color: '#d6336c', loai: [], bang: [] },
  { label: 'Tính Giá CHỈ NẸP & KEO HẠT', color: '#74b816', loai: [], bang: [] },
  { label: 'Tính Giá VÁN NHỰA-MDF MR PHỦ ACRYLIC', color: '#4263eb', loai: [], bang: [] },
  { label: 'Tính Giá ONE LAMINATE', color: '#e8590c', loai: [], bang: [] },
  { label: 'Tính Giá MIRROR', color: '#1098ad', loai: [], bang: [] },
]

// ===== Quy ước mã hàng & mô tả SP (sinh tương ứng chủng loại cốt gỗ) =====
interface CodeCfg { prefix: string; suffix: string; word: string; size: string }
const CODE_CFG: Record<string, CodeCfg> = {
  'Ván Dăm - Okal': { prefix: 'MEOK', suffix: 'VCC', word: 'Okal', size: 'x1220x2440 E2' },
  'Ván MDF-HDF': { prefix: 'ME', suffix: 'DW', word: 'DW', size: 'x1220x2440' },
  'Ván Ép': { prefix: 'MEIP', suffix: 'IP', word: 'Ván Ép', size: 'x1220x2440' },
  'Ván OSB': { prefix: 'MEOS', suffix: 'OS', word: 'OSB', size: 'x1220x2440' },
  'Gỗ Ghép': { prefix: 'MEGG', suffix: 'GG', word: 'Gỗ Ghép', size: 'x1220x2440' },
}
// chuẩn hoá độ dày về dạng 2–3 ký tự: "2.5"→"025", "9"→"09", "17-18"→"17"
function dayCode(d: string): string {
  const m = String(d).match(/[\d.]+/)
  if (!m) return '000'
  const v = parseFloat(m[0])
  return String(v < 10 ? Math.floor(v) : v).padStart(3, '0')
}
function trim(s: string): string { return s.replace(/ {2,}/g, ' ').trim() }

export default function TinhGiaGocPage() {
  const [nhom, setNhom] = useState('')
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

  const activeNhom = NHOMS.find(n => n.label === nhom)

  useEffect(() => {
    apiGet('/pricing/cot-go-tree').then(d => setCotGoList((d || []).map((r: any) => r.loai))).catch(() => {})
    apiGet('/pricing/bang-be-mat').then(d => setBangBeMatList((d || []).map((r: any) => r.bang))).catch(() => {})
  }, [])

  // Lọc loại cốt gỗ + bảng bề mặt theo nhóm
  const filteredLoai = (activeNhom && activeNhom.loai.length ? activeNhom.loai : cotGoList)
  const filteredBang = (activeNhom && activeNhom.bang.length ? activeNhom.bang : bangBeMatList)

  const handleNhomChange = (v: string) => {
    setNhom(v)
    setLoaiCotGo('')
    setCap('')
    setDoDay('')
    setBangBeMat('')
    setMaMau('')
    setResult(null)
  }

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

  // Sinh Mã SP + Mô tả SP từ thuộc tính đã chọn (gần đúng quy ước hàng)
  const built = (() => {
    if (!loaiCotGo) return null
    const cfg = CODE_CFG[loaiCotGo] || { prefix: 'SP', suffix: '', word: loaiCotGo, size: 'x1220x2440' }
    const day = dayCode(doDay)
    const mau = (maMau || '').replace(/\D+/g, '').padStart(3, '0') || '000'
    const ma_sp = `${cfg.prefix}${day}${mau}T${soMat}${cfg.suffix}`
    const ten_sp = trim(`${cfg.word} ${String(doDay || '').replace(/[^.0-9]/g, '')}mm ${cfg.size} MEL ${maMau || '—'} T ${soMat} mặt`)
    return { ma_sp, ten_sp }
  })()

  return (
    <div style={pageContainer}>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: theme.text }}>
        Tính giá gốc
      </h1>
      <p style={{ color: theme.textMuted, fontSize: 13, margin: '4px 0 0' }}>
        Máy tính giá gốc sản phẩm: giá cốt gỗ + giá bề mặt phủ x số mặt
      </p>

      {/* Nhóm bảng tính */}
      <div style={{
        background: theme.card, border: `1px solid ${theme.border}`, borderRadius: radius.lg,
        boxShadow: shadow.card, padding: 16, marginTop: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: theme.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase' }}>
            Nhóm bảng tính
          </label>
          <select
            value={nhom}
            onChange={e => handleNhomChange(e.target.value)}
            style={{ ...inp, flex: 1, minWidth: 220, cursor: 'pointer' }}
          >
            <option value="">Tất cả nhóm</option>
            {NHOMS.map(n => <option key={n.label} value={n.label}>{n.label}</option>)}
          </select>
          {activeNhom && (
            <span style={{
              padding: '4px 10px', fontSize: 12, fontWeight: 700, color: '#fff', borderRadius: radius.md,
              background: `linear-gradient(135deg, ${activeNhom.color}, ${activeNhom.color}aa)`,
            }}>
              {activeNhom.label}
            </span>
          )}
        </div>
      </div>

      {/* Grid 2 cột */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16, marginTop: 16, alignItems: 'start' }}>

        {/* ==== Input ==== */}
        <div style={{ background: theme.card, borderRadius: radius.lg, padding: 18, boxShadow: shadow.card, border: `1px solid ${theme.border}` }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 0.4 }}>
            Thông tin đầu vào
          </h2>

          {/* Tier pills */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: theme.textSecondary, marginBottom: 6 }}>Tier</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['PREMIUM', 'BBG PREMIER'].map(t => (
                <button
                  key={t}
                  onClick={() => setTier(t)}
                  style={{
                    flex: 1, padding: '9px 12px', border: `1px solid ${theme.border}`,
                    borderRadius: radius.md, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    background: tier === t ? theme.primary : theme.card,
                    color: tier === t ? '#fff' : theme.textSecondary,
                    transition: 'all 120ms',
                  }}
                >
                  {t === 'BBG PREMIER' ? 'BBG Premier' : 'Premium'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={label}>Loại cốt gỗ</label>
            <select style={select} value={loaiCotGo} onChange={e => { setLoaiCotGo(e.target.value); setCap(''); setDoDay('') }}>
              <option value="">-- Chọn --</option>
              {filteredLoai.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={label}>Cấp</label>
            <select style={select} value={cap} onChange={e => setCap(e.target.value)}>
              <option value="">-- Chọn --</option>
              {caps.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={label}>Độ dày</label>
            <select style={select} value={doDay} onChange={e => setDoDay(e.target.value)}>
              <option value="">-- Chọn --</option>
              {doDays.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ borderTop: `1px solid ${theme.border}`, margin: '16px 0', paddingTop: 14 }}>
            <h2 style={{ fontSize: 12.5, fontWeight: 700, color: theme.textSecondary, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Bề mặt phủ
            </h2>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>Bảng bề mặt</label>
              <select style={select} value={bangBeMat} onChange={e => { setBangBeMat(e.target.value); setMaMau('') }}>
                <option value="">-- Không --</option>
                {filteredBang.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>Mã màu</label>
              <select style={select} value={maMau} onChange={e => setMaMau(e.target.value)}>
                <option value="">-- Chọn --</option>
                {colorList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 4 }}>
              <label style={label}>Số mặt</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2].map(m => (
                  <button
                    key={m}
                    onClick={() => setSoMat(m)}
                    style={{
                      flex: 1, padding: '8px 0', border: `1px solid ${theme.border}`, borderRadius: radius.md,
                      cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      background: soMat === m ? theme.primary : theme.card,
                      color: soMat === m ? '#fff' : theme.textSecondary,
                    }}
                  >
                    {m} mặt
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button style={{ ...btn(theme.primary), width: '100%', marginTop: 14, fontWeight: 700, fontSize: 14 }} onClick={handleCalc} disabled={loading}>
            {loading ? 'Đang tính...' : 'Tính giá gốc'}
          </button>
          {error && <div style={errorStyle}>{error}</div>}
        </div>

        {/* ==== Kết quả ==== */}
        <div style={{ background: theme.card, borderRadius: radius.lg, padding: 18, boxShadow: shadow.card, border: `1px solid ${theme.border}` }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 0.4 }}>
            Kết quả
          </h2>

          {!result ? (
            <div style={{ color: theme.textMuted, fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
              Chọn thông tin và bấm <strong>Máy tính giá</strong> để xem kết quả.
            </div>
          ) : (
            <>
              {built && (
                <div style={{ background: theme.primaryLight, border: `1px solid ${theme.primary}55`, borderRadius: radius.md, padding: '10px 14px', marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: theme.textMuted, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>Mã SP / Mô tả</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: theme.text, margin: 0, fontFamily: 'monospace' }}>{built.ma_sp}</p>
                  <p style={{ fontSize: 12.5, color: theme.textSecondary, margin: '3px 0 0' }}>{built.ten_sp}</p>
                </div>
              )}
              <div style={{ background: theme.surfaceSecondary, borderRadius: radius.md, padding: '18px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: theme.textMuted, margin: 0, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>
                  Tổng giá gốc
                </p>
                <p style={{ fontSize: 30, fontWeight: 800, color: theme.primary, margin: '6px 0 0' }}>
                  {result.tong_gia !== null && result.tong_gia !== undefined ? formatNum(result.tong_gia) + ' đ' : '—'}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                <div style={detailItem}>
                  <p style={detailLabel}>Giá cốt gỗ</p>
                  <p style={detailValue}>{result.gia_cot_go !== null && result.gia_cot_go !== undefined ? formatNum(result.gia_cot_go) + ' đ' : '—'}</p>
                  {result.cot_go_match && (
                    <p style={sub}>
                      {result.cot_go_match.loai} / {result.cot_go_match.do_day} / {result.cot_go_match.cap}
                    </p>
                  )}
                </div>
                <div style={detailItem}>
                  <p style={detailLabel}>Giá bề mặt ({soMat} mặt)</p>
                  <p style={detailValue}>{result.gia_be_mat !== null && result.gia_be_mat !== undefined ? formatNum(result.gia_be_mat) + ' đ' : '—'}</p>
                  {result.be_mat_match && (
                    <p style={sub}>
                      {result.be_mat_match.bang} / {result.be_mat_match.nhom}
                    </p>
                  )}
                </div>
              </div>

              {result.loi && <div style={errorStyle}>{result.loi}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ===== styles =====
const label: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 500, color: theme.textSecondary, marginBottom: 3 }
const select: React.CSSProperties = { ...inp, cursor: 'pointer', width: '100%', boxSizing: 'border-box' }
const errorStyle: React.CSSProperties = {
  padding: '8px 12px', background: theme.dangerLight, color: theme.danger, borderRadius: radius.md,
  marginTop: 12, fontSize: 13, border: `1px solid ${theme.danger}44`, whiteSpace: 'pre-wrap',
}
const detailItem: React.CSSProperties = { background: theme.surfaceSecondary, borderRadius: radius.md, padding: '10px 14px' }
const detailLabel: React.CSSProperties = { fontSize: 11, color: theme.textMuted, margin: 0 }
const detailValue: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: theme.text, margin: '4px 0 0' }
const sub: React.CSSProperties = { fontSize: 11, color: theme.textMuted, margin: '2px 0 0' }