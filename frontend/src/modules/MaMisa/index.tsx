import { useState } from 'react'
import DataGrid, { Column } from '../../components/DataGrid'
import Modal from '../../components/Modal'
import { apiGet, apiPost } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { colors, shadow, radius, input, btn } from '../../theme'
import { formatNum } from '../../lib/format'

const columns: Column[] = [
  { key: 'ma_sp', label: 'Mã SP', required: true },
  { key: 'ten_sp', label: 'Tên sản phẩm' },
  { key: 'dvt', label: 'ĐVT' },
  { key: 'gia_goc', label: 'Giá gốc', type: 'number' },
  { key: 'match_status', label: 'Trạng thái' },
]

interface HistoryRow {
  id: number
  ma_sp: string
  thang: string
  gia_cu: number | null
  gia_goc: number
  nguon: string
  updated_by: string | null
  created_at: string
}

export default function MaMisaPage() {
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('feature:edit-data')
  const [histOpen, setHistOpen] = useState(false)
  const [histRow, setHistRow] = useState<any | null>(null)
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [current, setCurrent] = useState<number | null>(null)
  const [loadingHist, setLoadingHist] = useState(false)
  const [newPrice, setNewPrice] = useState<string>('')
  const [thang, setThang] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const openHistory = async (row: any) => {
    setHistRow(row)
    setNewPrice(String(row.gia_goc ?? ''))
    setMsg(null)
    setHistOpen(true)
    setLoadingHist(true)
    try {
      const res = await apiGet(`/ma-misa/lich-su/${encodeURIComponent(row.ma_sp)}`)
      setHistory(res.data || [])
      setCurrent(res.current ?? null)
    } catch (e: any) { setMsg({ ok: false, text: e.message }) }
    finally { setLoadingHist(false) }
  }

  const handleDoiGia = async () => {
    if (!histRow) return
    const gia = Number(newPrice)
    if (isNaN(gia) || gia <= 0) { setMsg({ ok: false, text: 'Giá không hợp lệ' }); return }
    setSaving(true); setMsg(null)
    try {
      const res = await apiPost('/ma-misa/doi-gia', {
        ma_sp: histRow.ma_sp, gia_goc: gia, thang, updated_by: (JSON.parse(localStorage.getItem('auth_user') || 'null') as any)?.ten || null,
      })
      if (res.changed) setMsg({ ok: true, text: `Đã đổi giá ${formatNum(res.gia_cu)} → ${formatNum(res.gia_goc)} (tháng ${res.thang})${res.synced > 0 ? ` • ${res.synced} dòng giá gốc đã đồng bộ` : ''}` })
      else setMsg({ ok: true, text: 'Giá không đổi' })
      const hres = await apiGet(`/ma-misa/lich-su/${encodeURIComponent(histRow.ma_sp)}`)
      setHistory(hres.data || [])
      setCurrent(hres.current ?? null)
    } catch (e: any) { setMsg({ ok: false, text: e.message }) }
    finally { setSaving(false) }
  }

  return (
    <>
      <DataGrid
        title="MÃ MISA"
        columns={columns}
        apiPath="/ma-misa"
        rowActionLabel="Lịch sử giá"
        onRowAction={openHistory}
        historyInForm={{
          get: async (row: any) => {
            const res = await apiGet(`/ma-misa/lich-su/${encodeURIComponent(row.ma_sp)}`)
            return res.data || []
          },
          format: (h: any) => `${h.thang}: ${formatNum(h.gia_cu ?? 0)} → ${formatNum(h.gia_goc)}` + (h.updated_by ? ` (${h.updated_by})` : ''),
        }}
      />

      <Modal open={histOpen} title={`Lịch sử giá - ${histRow?.ma_sp ?? ''}`} onClose={() => setHistOpen(false)} wide>
        {msg && (
          <div style={{ padding: 12, background: msg.ok ? colors.successLight : colors.dangerLight, color: msg.ok ? colors.successDark : colors.danger, borderRadius: radius.md, marginBottom: 14, border: `1px solid ${msg.ok ? colors.success : colors.danger}22`, fontSize: 13 }}>{msg.text}</div>
        )}

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginBottom: 16, padding: 14, background: colors.surfaceSecondary, borderRadius: radius.md, border: `1px solid ${colors.borderLight}`, flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 5, fontSize: 12, fontWeight: 500, color: colors.textSecondary }}>Giá hiện hành</label>
            <div style={{ fontSize: 20, fontWeight: 700, color: colors.primary }}>{current != null ? formatNum(current) : '—'}</div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 5, fontSize: 12, fontWeight: 500, color: colors.textSecondary }}>Giá mới</label>
            <input style={{ ...input, width: 140 }} type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 5, fontSize: 12, fontWeight: 500, color: colors.textSecondary }}>Tháng áp dụng</label>
            <input style={{ ...input, width: 120 }} type="month" value={thang} onChange={e => setThang(e.target.value)} />
          </div>
          {canEdit && <button style={{ ...btn(colors.primary, '#fff'), fontWeight: 600 }} onClick={handleDoiGia} disabled={saving}>{saving ? 'Đang lưu...' : 'Đổi giá'}</button>}
        </div>

        {loadingHist ? (
          <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>Đang tải...</div>
        ) : history.length > 0 ? (
          <div style={{ overflowX: 'auto', borderRadius: radius.lg, border: `1px solid ${colors.border}`, boxShadow: shadow.card }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: colors.surfaceSecondary }}>
                  {['Tháng', 'Giá cũ', 'Giá mới', 'Nguồn', 'Người đổi', 'Thời gian'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={h.id} style={{ background: i % 2 === 0 ? colors.card : colors.surfaceSecondary }}>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${colors.borderLight}` }}>{h.thang}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${colors.borderLight}`, textAlign: 'right' }}>{h.gia_cu != null ? formatNum(h.gia_cu) : '—'}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${colors.borderLight}`, textAlign: 'right', fontWeight: 600, color: colors.successDark }}>{formatNum(h.gia_goc)}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${colors.borderLight}` }}>{h.nguon}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${colors.borderLight}` }}>{h.updated_by || '—'}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${colors.borderLight}` }}>{h.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>Chưa có lịch sử đổi giá cho mã này.</div>
        )}
      </Modal>
    </>
  )
}
