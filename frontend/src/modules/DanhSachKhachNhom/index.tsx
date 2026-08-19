import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPatch, apiPost } from '../../lib/api'
import {
  colors, shadow, radius, btn, input, select,
  tableStyle, pageContainer, pageTitle, pageSubtitle, spinner, pagination as pgn,
} from '../../theme'
import Modal from '../../components/Modal'

const NHOM_META: Record<string, { color: string }> = {
  DL_TINH: { color: colors.primary },
  DL_NGOAI_THANH: { color: colors.success },
  DL_SAI_GON: { color: colors.warning || colors.primary },
  XUONG_THUONG: { color: colors.textSecondary },
  XUONG_PREMIUM: { color: colors.danger },
}

export default function DanhSachKhachNhomPage() {
  const [nhoms, setNhoms] = useState<any[]>([])
  const [activeNhom, setActiveNhom] = useState('all')
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [limit] = useState(200)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editRow, setEditRow] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [reTinh, setReTinh] = useState(false)
  const [chuaPhan, setChuaPhan] = useState(0)

  const fetchNhoms = useCallback(async () => {
    try {
      const res = await apiGet('/chiet-khau/nhom')
      setNhoms(res.data || [])
      const cp = await apiGet('/chiet-khau/khach?nhom=chua-phan-nhom&limit=1')
      setChuaPhan(cp.total || 0)
    } catch {}
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('nhom', activeNhom)
      params.set('limit', String(limit))
      params.set('offset', String(offset))
      if (search) params.set('search', search)
      const res = await apiGet(`/chiet-khau/khach?${params}`)
      setData(res.data || [])
      setTotal(res.total || 0)
    } catch {}
    finally { setLoading(false) }
  }, [activeNhom, search, limit, offset])

  useEffect(() => { fetchNhoms() }, [])
  useEffect(() => { fetchData() }, [fetchData])

  const handleReTinh = async () => {
    if (!confirm('Tính lại CK cho TOÀN BỘ dòng bán hàng (dùng mức CK nhóm hiện tại)? Có thể mất 1-2 phút.')) return
    setReTinh(true)
    try {
      const res = await apiPost('/chiet-khau/tinh-het', {})
      alert(`Đã tính lại ${res.so_dong || res.count || 0} dòng`)
    } catch (e: any) { alert('Lỗi: ' + e.message) }
    finally { setReTinh(false) }
  }

  const handleSave = async () => {
    if (!editRow) return
    setSaving(true)
    try {
      await apiPatch(`/chiet-khau/khach/${editRow.id}`, {
        nhom: editRow.nhom || undefined,
        vung: editRow.vung || undefined,
        doi_tuong: editRow.doi_tuong || undefined,
        hang: editRow.hang || undefined,
        loai_op: editRow.loai_op || undefined,
        ck_vc_pct: editRow.ck_vc_pct,
        ck_ds_98mau_pct: editRow.ck_ds_98mau_pct,
        ck_ds_khac_pct: editRow.ck_ds_khac_pct,
        tu_lay: editRow.tu_lay,
        ghi_chu: editRow.ghi_chu,
      })
      setEditRow(null)
      fetchNhoms()
      fetchData()
    } catch (e: any) { alert('Lỗi: ' + e.message) }
    finally { setSaving(false) }
  }

  const handlePhanLoat = async (nhom: string) => {
    const ids = data.map(d => d.id)
    if (ids.length === 0) return
    if (!confirm(`Gán ${ids.length} khách (đang lọc) vào nhóm ${nhom}?`)) return
    try {
      const res = await apiPost('/chiet-khau/khach/phan-loat', { ids, nhom })
      alert(`Đã gán ${res.count} khách`)
      fetchNhoms(); fetchData()
    } catch (e: any) { alert('Lỗi: ' + e.message) }
  }

  const pct = (v: any) => v != null ? `${(v * 100).toFixed(2)}%` : '—'

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Danh sách KH — 5 nhóm chiết khấu</h1>
      <p style={pageSubtitle}>Phân khách vào nhóm theo chính sách 2026. Thiếu phân hạng → bổ sung tay.</p>

      <div style={{ padding: '10px 14px', background: colors.infoLight, border: `1px solid ${colors.info}33`, borderRadius: radius.md, marginBottom: 14, fontSize: 12.5, color: colors.text, lineHeight: 1.6 }}>
        <b>Trang này sửa NỀN khách gốc — áp dụng cho MỌI tháng</b> (không có khái niệm tháng).
        Còn chỉnh khác biệt theo từng tháng (ví dụ tháng 8: nâng Premium, hạ khách xuống Thường, đổi % riêng)
        thì dùng trang <Link to="/bang-khach-thang" style={{ color: colors.infoDark, fontWeight: 700 }}>Bảng khách hàng theo tháng →</Link>.
        Engine ưu tiên mức riêng của tháng (nếu có), còn lại mới dùng nền 5 nhóm ở đây.
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <TabBtn active={activeNhom === 'all'} color={colors.primary} onClick={() => { setActiveNhom('all'); setOffset(0) }}>Tất cả</TabBtn>
        {nhoms.map((n: any) => (
          <TabBtn key={n.key} active={activeNhom === n.key} color={(NHOM_META[n.key]?.color) || colors.primary} onClick={() => { setActiveNhom(n.key); setOffset(0) }}>
            {n.label} ({n.so_khach})
          </TabBtn>
        ))}
        <TabBtn active={activeNhom === 'chua-phan-nhom'} color={colors.danger} onClick={() => { setActiveNhom('chua-phan-nhom'); setOffset(0) }}>
          Chưa phân ({chuaPhan})
        </TabBtn>
      </div>

      <div style={{ background: colors.card, borderRadius: radius.lg, padding: 16, border: `1px solid ${colors.border}`, boxShadow: shadow.card, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Tìm kiếm</label>
            <input style={input} value={search} onChange={e => { setSearch(e.target.value); setOffset(0) }} placeholder="Mã KH hoặc tên..." />
          </div>
          <button style={btn(colors.primary, '#fff')} onClick={fetchData}>Tra cứu</button>
          <button style={{ ...btn(colors.info, '#fff') }} onClick={handleReTinh} disabled={reTinh}>{reTinh ? 'Đang tính lại...' : 'Tính lại CK'}</button>
          {activeNhom !== 'all' && activeNhom !== 'chua-phan-nhom' && data.length > 0 && (
            <button style={btn(colors.success, '#fff')} onClick={() => handlePhanLoat(activeNhom)}>Gán {data.length} khách này vào nhóm</button>
          )}
        </div>
      </div>

      <div style={{ overflowX: 'auto', background: colors.card, borderRadius: radius.lg, boxShadow: shadow.card, border: `1px solid ${colors.border}` }}>
        {loading ? <div style={spinner}>Đang tải...</div> : (
          <table style={{ borderCollapse: 'collapse', fontSize: 12.5, width: '100%' }}>
            <thead>
              <tr>
                {['Mã KH', 'Tên KH', 'Nhóm', 'Vùng', 'Đối tượng', 'Hạng', 'CK VC (động)', 'CK 98 màu', 'CK màu khác', 'Tự lấy', 'Ghi chú', ''].map(h => (
                  <th key={h} style={{ ...tableStyle.th, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={12} style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>Không có khách nào</td></tr>
              ) : data.map(r => (
                <tr key={r.id}>
                  <td style={{ ...tableStyle.td, fontFamily: 'monospace' }}>{r.ma_kh}</td>
                  <td style={tableStyle.td}>{r.ten_kh}</td>
                  <td style={tableStyle.td}>{r.nhom ? <span style={{ fontWeight: 600 }}>{r.nhom}</span> : <span style={{ color: colors.textMuted }}>—</span>}</td>
                  <td style={tableStyle.td}>{r.vung || '—'}</td>
                  <td style={tableStyle.td}>{r.doi_tuong || '—'}</td>
                  <td style={tableStyle.td}>{r.hang || r.loai_op || '—'}</td>
                  <td style={{ ...tableStyle.td, textAlign: 'right' }}>
                  {r.ck_vc_pct != null ? `${pct(r.ck_vc_pct)} (tay)` : (
                    `Mel ${pct(r.ck_vc_mel_dong)} · Khác ${pct(r.ck_vc_khac_dong)}`
                  )}
                </td>
                  <td style={{ ...tableStyle.td, textAlign: 'right' }}>{pct(r.ck_ds_98mau_pct)}</td>
                  <td style={{ ...tableStyle.td, textAlign: 'right' }}>{pct(r.ck_ds_khac_pct)}</td>
                  <td style={{ ...tableStyle.td, textAlign: 'center' }}>{r.tu_lay ? '✓' : '—'}</td>
                  <td style={tableStyle.td}>{r.ghi_chu || ''}</td>
                  <td style={tableStyle.td}>
                    <button style={{ ...btn(colors.info, '#fff', 'sm') }} onClick={() => setEditRow({ ...r })}>Sửa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, fontSize: 13, color: colors.textMuted }}>
        <span>Tổng: <strong>{total}</strong> khách</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={pgn.btn} disabled={offset <= 0} onClick={() => setOffset(offset - limit)}>← Trước</button>
          <span>Trang {Math.floor(offset / limit) + 1} / {Math.ceil(total / limit) || 1}</span>
          <button style={pgn.btn} disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)}>Sau →</button>
        </div>
      </div>

      <Modal open={editRow !== null} title={`Sửa khách ${editRow?.ma_kh ?? ''}`} onClose={() => setEditRow(null)} wide>
        {editRow && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 14px' }}>
            <Field label="Nhóm">
              <select style={select} value={editRow.nhom || ''} onChange={e => setEditRow({ ...editRow, nhom: e.target.value })}>
                <option value="">— Không nhóm —</option>
                {nhoms.map((n: any) => <option key={n.key} value={n.key}>{n.label}</option>)}
              </select>
            </Field>
            <Field label="Vùng">
              <select style={select} value={editRow.vung || ''} onChange={e => setEditRow({ ...editRow, vung: e.target.value })}>
                <option value="">—</option>
                <option value="SaiGon">Sài Gòn</option>
                <option value="Tinh">Tỉnh</option>
                <option value="NgoaiThanh">Ngoại thành</option>
              </select>
            </Field>
            <Field label="Đối tượng">
              <select style={select} value={editRow.doi_tuong || ''} onChange={e => setEditRow({ ...editRow, doi_tuong: e.target.value })}>
                <option value="">—</option>
                <option value="PREMIER">PREMIER (Đại lý)</option>
                <option value="PREMIUM">PREMIUM (KH)</option>
              </select>
            </Field>
            <Field label="Hạng">
              <select style={select} value={editRow.hang || ''} onChange={e => setEditRow({ ...editRow, hang: e.target.value })}>
                <option value="">—</option>
                <option value="OP1">OP1 (cố định)</option>
                <option value="OP2">OP2 (lũy tiến)</option>
                <option value="Thuong">Thường</option>
                <option value="Premium">Premium</option>
              </select>
            </Field>
            <Field label="Loại OP">
              <select style={select} value={editRow.loai_op || ''} onChange={e => setEditRow({ ...editRow, loai_op: e.target.value })}>
                <option value="">—</option>
                <option value="OP1">OP1</option>
                <option value="OP2">OP2</option>
              </select>
            </Field>
            <Field label="CK vận chuyển (%)">
              <input style={input} type="number" step="0.01" value={editRow.ck_vc_pct ?? ''} onChange={e => setEditRow({ ...editRow, ck_vc_pct: e.target.value })} />
            </Field>
            <Field label="CK doanh số 98 màu (%)">
              <input style={input} type="number" step="0.01" value={editRow.ck_ds_98mau_pct ?? ''} onChange={e => setEditRow({ ...editRow, ck_ds_98mau_pct: e.target.value })} />
            </Field>
            <Field label="CK doanh số màu khác (%)">
              <input style={input} type="number" step="0.01" value={editRow.ck_ds_khac_pct ?? ''} onChange={e => setEditRow({ ...editRow, ck_ds_khac_pct: e.target.value })} />
            </Field>
            <Field label="Ghi chú">
              <input style={input} value={editRow.ghi_chu || ''} onChange={e => setEditRow({ ...editRow, ghi_chu: e.target.value })} />
            </Field>
            <Field label="Tự lấy (CK vận chuyển)"> 
              <select style={select} value={editRow.tu_lay ? '1' : '0'} onChange={e => setEditRow({ ...editRow, tu_lay: e.target.value === '1' ? 1 : 0 })}>
                <option value="1">Có — tự lấy (được CK VC)</option>
                <option value="0">Giao hàng (không CK VC)</option>
              </select>
            </Field>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 16, borderTop: `1px solid ${colors.borderLight}`, marginTop: 14 }}>
          <button style={{ ...btn(colors.textMuted, '#fff') }} onClick={() => setEditRow(null)}>Huỷ</button>
          <button style={{ ...btn(colors.success, '#fff') }} onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
        </div>
      </Modal>
    </div>
  )
}

function TabBtn({ active, color, onClick, children }: { active: boolean; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px', borderRadius: radius.md, border: 'none', cursor: 'pointer',
        fontSize: 13, fontWeight: active ? 700 : 500,
        background: active ? color : colors.surfaceSecondary,
        color: active ? '#fff' : colors.textSecondary,
        boxShadow: active ? shadow.card : 'none',
      }}
    >{children}</button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500, color: colors.textMuted }}>{label}</label>
      {children}
    </div>
  )
}
