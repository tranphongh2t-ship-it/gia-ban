import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../../lib/api'
import { colors, radius, shadow, input, pageContainer, pageTitle, sectionTitle } from '../../theme'
import { formatNum } from '../../lib/format'

// ===== Cấu trúc cây "Bảng Tính Giá" (đồng bộ menu Layout.tsx) =====
interface TreeNode { label: string; path?: string; color?: string; children?: TreeNode[] }

const TREE: TreeNode[] = [
  { label: 'Tính Giá OSB', color: '#1ABB9C', children: [
    { label: 'OSB', path: '/bang-tinh-gia/osb' },
    { label: 'Giá gốc OSB', path: '/tinh-gia-osb' },
  ]},
  { label: 'Tính Giá Ván Phủ PVC FILM - PETG', color: '#4299e1', children: [
    { label: 'PVC FILM - DURA+', path: '/bang-tinh-gia/pvc-film-dura' },
    { label: 'VÁN PHỦ PVC FILM - PETG', path: '/bang-tinh-gia/van-phu-pvc-petg' },
    { label: 'Giá gốc PVC FILM - PETG', path: '/tinh-gia-pvc-petg' },
  ]},
  { label: 'Tính Giá Ván Nhựa DURABO', color: '#f76707', children: [
    { label: 'Ván nhựa DURABO', path: '/bang-tinh-gia/durabo' },
    { label: 'Giá gốc Ván nhựa DURABO', path: '/tinh-gia-dr' },
  ]},
  { label: 'Tính Giá VÁN NHỰA- PLYWOOD-OSB- GỖ GHÉP', color: '#ae3ec9', children: [
    { label: 'Bảng màu Melamine (mới)', path: '/bang-tinh-gia/mau-melamine-2' },
    { label: 'Melamine Plywood', path: '/bang-tinh-gia/melamine-plywood' },
    { label: 'Ván nhựa/OSB/Gỗ ghép phủ Melamine', path: '/bang-tinh-gia/melamine-nhua-osb-ghep' },
    { label: 'Giá gốc Melamine tổng hợp', path: '/tinh-gia-melamine-tonghop' },
  ]},
  { label: 'Tính Giá Ván Ép', color: '#2fb344', children: [
    { label: 'Ván Ép Thanh Thùy', path: '/bang-tinh-gia/van-ep' },
    { label: 'Ván Ép Khác', path: '/bang-tinh-gia/van-ep-khac' },
    { label: 'Giá gốc Ván Ép', path: '/tinh-gia-ve' },
  ]},
  { label: 'Tính Giá Gỗ Ghép', color: '#f59f00', children: [
    { label: 'Gỗ Trơn', path: '/bang-tinh-gia/go-ghep' },
    { label: 'Phủ Veneer', path: '/bang-tinh-gia/phu-veneer' },
    { label: 'Giá gốc Gỗ Ghép', path: '/tinh-gia-gg' },
  ]},
  { label: 'Tính Giá Ván Trơn', color: '#17a2b8', children: [
    { label: 'VÁN DĂM OKAL', path: '/bang-tinh-gia/van-dam-okal' },
    { label: 'VÁN MDF HDF', path: '/bang-tinh-gia/van-mdf-hdf' },
    { label: 'Phụ thu Melamine', path: '/bang-tinh-gia/phu-thu-melamine' },
    { label: 'Nhóm màu Melamine 220', path: '/bang-tinh-gia/mau-melamine' },
    { label: '98 Màu Melamine', path: '/bang-tinh-gia/98-mau-melamine' },
    { label: 'Giá gốc VÁN DĂM OKAL', path: '/tinh-gia-vdo' },
    { label: 'Giá gốc VÁN MDF HDF', path: '/tinh-gia-vmh' },
  ]},
  { label: 'Tính Giá VENEER & MẶT PHỦ KHÁC', color: '#d6336c', children: [
    { label: 'VENEER', path: '/bang-tinh-gia/veneer' },
    { label: 'Mặt phủ khác', path: '/bang-tinh-gia/mat-phu-khac' },
    { label: 'Giá gốc VENEER & Mặt phủ khác', path: '/tinh-gia-veneer-mat-phu-khac' },
  ]},
  { label: 'Tính Giá CHỈ NẸP & KEO HẠT', color: '#74b816', children: [
    { label: 'Chỉ Nẹp', path: '/bang-tinh-gia/chi-nep' },
    { label: 'Keo Hạt', path: '/bang-tinh-gia/keo-hat' },
    { label: 'Giá gốc CHỈ NẸP & KEO HẠT', path: '/tinh-gia-chi-nep-keo-hat' },
  ]},
  { label: 'Tính Giá VÁN NHỰA-MDF MR PHỦ ACRYLIC', color: '#4263eb', children: [
    { label: 'Acrylic Mã màu', path: '/bang-tinh-gia/acrylic' },
    { label: 'Ván phủ Acrylic', path: '/bang-tinh-gia/van-phu-acrylic' },
    { label: 'Tính giá gốc Acrylic', path: '/tinh-gia-acrylic' },
  ]},
  { label: 'Tính Giá ONE LAMINATE', color: '#e8590c', children: [
    { label: 'One Laminate Mã màu', path: '/bang-tinh-gia/one-laminate' },
    { label: 'Ván nhựa phủ HPL', path: '/bang-tinh-gia/van-nhua-phu-hpl' },
    { label: 'OSB/Gỗ ghép/Ván ép phủ HPL', path: '/bang-tinh-gia/osb-ghep-ep-phu-hpl' },
    { label: 'Tính giá gốc One Laminate', path: '/tinh-gia-one-laminate' },
  ]},
  { label: 'Tính Giá MIRROR', color: '#1098ad', children: [
    { label: 'Mirror', path: '/bang-tinh-gia/mirror' },
    { label: 'Tính giá gốc Mirror', path: '/tinh-gia-mirror' },
  ]},
]

// Map nhóm → các module trong MODULE_COMPARE (dùng cho bộ lọc tra cứu)
const GROUP_MODULES: Record<string, string[]> = {
  'Tính Giá OSB': ['osb'],
  'Tính Giá Ván Phủ PVC FILM - PETG': ['pvc_petg'],
  'Tính Giá Ván Nhựa DURABO': ['dr'],
  'Tính Giá VÁN NHỰA- PLYWOOD-OSB- GỖ GHÉP': ['melamine_tonghop'],
  'Tính Giá Ván Ép': ['ve'],
  'Tính Giá Gỗ Ghép': ['gg'],
  'Tính Giá Ván Trơn': ['vdo', 'vmh'],
  'Tính Giá VENEER & MẶT PHỦ KHÁC': ['veneer', 'mat_phu_khac'],
  'Tính Giá CHỈ NẸP & KEO HẠT': ['chi_nep', 'keo_hat'],
  'Tính Giá VÁN NHỰA-MDF MR PHỦ ACRYLIC': ['acrylic'],
  'Tính Giá ONE LAMINATE': ['one_laminate'],
  'Tính Giá MIRROR': ['mirror'],
}

const MODULE_PATH: Record<string, string> = {
  vdo: '/tinh-gia-vdo',
  vmh: '/tinh-gia-vmh',
  gg: '/tinh-gia-gg',
  ve: '/tinh-gia-ve',
  osb: '/tinh-gia-osb',
  dr: '/tinh-gia-dr',
  pvc_petg: '/tinh-gia-pvc-petg',
  melamine_tonghop: '/tinh-gia-melamine-tonghop',
  acrylic: '/tinh-gia-acrylic',
  one_laminate: '/tinh-gia-one-laminate',
  veneer: '/tinh-gia-veneer-mat-phu-khac',
  mat_phu_khac: '/tinh-gia-veneer-mat-phu-khac',
  chi_nep: '/tinh-gia-chi-nep-keo-hat',
  keo_hat: '/tinh-gia-chi-nep-keo-hat',
  mirror: '/tinh-gia-mirror',
}

const section = { background: colors.card, borderRadius: radius.lg, padding: 16, boxShadow: shadow.card, border: `1px solid ${colors.border}` }

export default function CheckGiaGocPage() {
  const navigate = useNavigate()

  const [q, setQ] = useState('')
  const [group, setGroup] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const filtered = group
    ? results.filter(r => (GROUP_MODULES[group] || []).includes(r.module))
    : results

  const search = useCallback(async () => {
    const query = q.trim()
    if (!query) return
    setLoading(true)
    try {
      const res = await apiGet('/gia-chuan/check-gia-goc?q=' + encodeURIComponent(query))
      setResults(res.data || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }, [q])

  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') search() }

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Check Giá Gốc</h1>
      <p style={{ color: colors.textMuted, fontSize: 13, margin: '4px 0 0' }}>
        Tra cứu giá gốc nhanh theo mã hàng + lối tắt tới các bảng tính giá (dành cho Sale)
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16, alignItems: 'start' }}>
        {/* ==== Cột trái: Tra cứu ==== */}
        <div style={section}>
          <h2 style={sectionTitle}>Tra cứu giá gốc</h2>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={{ ...input, flex: 1, boxSizing: 'border-box' }}
              placeholder="Nhập mã hàng / tên hàng..."
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={onKey}
            />
            <button
              onClick={search}
              disabled={loading || !q.trim()}
              style={{
                height: 34, padding: '0 16px', background: colors.primary, color: '#fff', border: 'none',
                borderRadius: radius.md, cursor: loading || !q.trim() ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13,
                opacity: !q.trim() ? 0.6 : 1, whiteSpace: 'nowrap',
              }}
            >
              {loading ? 'Đang tra...' : 'Tra cứu'}
            </button>
          </div>
          <p style={{ fontSize: 11.5, color: colors.textMuted, margin: '8px 0 0' }}>
            VD: <span style={{ fontFamily: 'monospace' }}>ME025388SN1DW</span>, <span style={{ fontFamily: 'monospace' }}>TOSBPINE12E0</span>
          </p>

          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted }}>Nhóm bảng tính:</label>
            <select
              value={group}
              onChange={e => setGroup(e.target.value)}
              style={{ ...input, flex: 1, minWidth: 200, cursor: 'pointer' }}
            >
              <option value="">Tất cả nhóm</option>
              {TREE.map(g => <option key={g.label} value={g.label}>{g.label}</option>)}
            </select>
          </div>

          {searched && !loading && results.length === 0 && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: colors.dangerLight, color: colors.danger, borderRadius: radius.md, fontSize: 13 }}>
              Không tìm thấy mã hàng phù hợp với "<strong>{q}</strong>".
            </div>
          )}
          {group && results.length > 0 && filtered.length === 0 && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: colors.warningLight, color: colors.warningDark, borderRadius: radius.md, fontSize: 13 }}>
              Không có kết quả thuộc nhóm "<strong>{group}</strong>".
            </div>
          )}

          {filtered.length > 0 && (
            <div style={{ marginTop: 12, maxHeight: 520, overflowY: 'auto', borderRadius: radius.md, border: `1px solid ${colors.border}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    {['Mã SP', 'Tên hàng', 'Giá gốc', 'Nhóm', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', background: colors.surfaceSecondary, borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.ma_sp} style={{ background: i % 2 ? colors.surfaceSecondary : 'transparent', borderBottom: `1px solid ${colors.borderLight}` }}>
                      <td style={{ padding: '8px 12px', color: colors.text, fontWeight: 600, whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{r.ma_sp}</td>
                      <td style={{ padding: '8px 12px', color: colors.textSecondary }}>{r.ten_sp || '—'}</td>
                      <td style={{ padding: '8px 12px', color: colors.primary, fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>{formatNum(r.gia_goc) + ' đ'}</td>
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        {r.module ? (
                          <span style={{ padding: '2px 8px', borderRadius: radius.sm, fontSize: 11, fontWeight: 600, background: colors.primaryLight, color: colors.primaryDark }}>{r.module}</span>
                        ) : <span style={{ color: colors.textMuted, fontSize: 12 }}>Chưa xác định</span>}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {MODULE_PATH[r.module] && (
                          <button onClick={() => navigate(MODULE_PATH[r.module])} style={{
                            height: 26, padding: '0 10px', background: colors.card, color: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: radius.sm, cursor: 'pointer', fontSize: 11.5, fontWeight: 600,
                          }}>Mở bảng giá</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ==== Cột phải: Lối tắt bảng tính giá ==== */}
        <div style={section}>
          <h2 style={sectionTitle}>Bảng Tính Giá</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {TREE.map((g, gi) => (
              <div key={gi} style={{
                background: colors.surfaceSecondary, borderRadius: radius.md, overflow: 'hidden', border: `1px solid ${colors.borderLight}`,
              }}>
                <div style={{
                  padding: '8px 10px', fontSize: 12, fontWeight: 700, color: '#fff',
                  background: `linear-gradient(135deg, ${g.color}cc, ${g.color}99)`,
                }}>
                  {g.label}
                </div>
                <div>
                  {g.children!.map((child, ci) => (
                    <button
                      key={ci}
                      onClick={() => child.path && navigate(child.path!)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                        width: '100%', padding: '7px 10px', background: 'transparent', border: 'none', borderTop: `1px solid ${colors.borderLight}`,
                        color: colors.textSecondary, fontSize: 12, cursor: 'pointer', textAlign: 'left', transition: 'background 100ms, color 100ms',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = colors.card; e.currentTarget.style.color = colors.text }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.textSecondary }}
                    >
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{child.label}</span>
                      <span style={{ color: g.color, fontSize: 13, fontWeight: 700 }}>›</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 30, color: colors.textMuted, fontSize: 14 }}>Đang tải...</div>}
    </div>
  )
}
