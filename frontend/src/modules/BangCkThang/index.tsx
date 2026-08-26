import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPost } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import {
  colors, shadow, radius, btn, input, select,
  tableStyle, pageContainer, pageTitle, pageSubtitle, spinner, badge,
} from '../../theme'
import { formatNum } from '../../lib/format'

type Tab = 'op1' | 'op2'

const currentMonth = (): string => {
  const d = new Date()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}`
}

const OP1_FIELDS = [
  { key: 'dl_tinh', label: 'ĐL Tỉnh', pct: true },
  { key: 'dl_nt', label: 'Ngoại thành', pct: true },
  { key: 'dl_sg', label: 'Sài Gòn', pct: true },
  { key: 'xuong_thuong', label: 'Xưởng thường', pct: true },
  { key: 'xuong_premium', label: 'Xưởng premium', pct: true },
  { key: 'ghi_chu', label: 'Ghi chú', pct: false },
]

const OP2_FIELDS = [
  { key: 'pct_98mau', label: '98 màu', pct: true },
  { key: 'pct_khac', label: 'Khác', pct: true },
  { key: 'pct_vc_mel', label: 'VC Mel', pct: true },
  { key: 'pct_vc_khac', label: 'VC khác', pct: true },
]

export default function BangCkThangPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('op1')
  const [thang, setThang] = useState(currentMonth())
  const [thangs, setThangs] = useState<string[]>([])
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Edit modal
  const [editRow, setEditRow] = useState<any | null>(null)
  const [editDraft, setEditDraft] = useState<Record<string, any>>({})
  const [savingEdit, setSavingEdit] = useState(false)

  // Log modal
  const [showLog, setShowLog] = useState(false)
  const [logData, setLogData] = useState<any[]>([])
  const [loadingLog, setLoadingLog] = useState(false)

  const fetchBang = useCallback(async (b: 'ck_op1' | 'ck_op2', t: string) => {
    setLoading(true); setMsg(null)
    try {
      const res = await apiGet(`/chiet-khau/bang-thang?bang=${b}&thang=${t}`)
      setRows(res.data || [])
      setThangs(res.thangs || [])
    } catch (e: any) { setMsg({ type: 'err', text: e.message }) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchBang(tab === 'op1' ? 'ck_op1' : 'ck_op2', thang) }, [fetchBang, tab, thang])

  const OP1_COLS = useMemo(() => [
    { key: 'nhom_sp', label: 'Nhóm SP', ro: true },
    { key: 'dieu_kien', label: 'Điều kiện', ro: true },
    { key: 'dl_tinh', label: 'ĐL Tỉnh', pct: true },
    { key: 'dl_nt', label: 'Ngoại thành', pct: true },
    { key: 'dl_sg', label: 'Sài Gòn', pct: true },
    { key: 'xuong_thuong', label: 'Xưởng thường', pct: true },
    { key: 'xuong_premium', label: 'Xưởng premium', pct: true },
    { key: 'loai_don_vi', label: 'Loại ĐV', ro: true },
    { key: 'don_vi_tinh', label: 'Đơn vị', ro: true },
    { key: 'nguong', label: 'Ngưỡng', ro: true },
    { key: 'ghi_chu', label: 'Ghi chú' },
  ], [])

  const OP2_COLS = useMemo(() => [
    { key: 'vung', label: 'Vùng', ro: true },
    { key: 'bac_tu', label: 'Bậc từ', money: true, ro: true },
    { key: 'pct_98mau', label: '98 màu', pct: true },
    { key: 'pct_khac', label: 'Khác', pct: true },
    { key: 'pct_vc_mel', label: 'VC Mel', pct: true },
    { key: 'pct_vc_khac', label: 'VC khác', pct: true },
  ], [])

  const cols = tab === 'op1' ? OP1_COLS : OP2_COLS

  const fmtCell = (r: any, c: { key: string; pct?: boolean; money?: boolean }) => {
    const v = r[c.key]
    if (v === null || v === undefined || v === '') return ''
    if (c.pct) return formatNum(Number(v) * 100, '%')
    return formatNum(v)
  }

  const editFields = tab === 'op1' ? OP1_FIELDS : OP2_FIELDS

  const openEdit = (r: any) => {
    setEditRow(r)
    const draft: Record<string, any> = {}
    for (const f of editFields) {
      const v = r[f.key]
      if (f.pct) draft[f.key] = v != null ? String(Number(v) * 100) : ''
      else draft[f.key] = v ?? ''
    }
    setEditDraft(draft)
  }

  const saveEdit = async () => {
    if (!editRow) return
    setSavingEdit(true); setMsg(null)
    try {
      const body: any = {}
      const keyField = tab === 'op1' ? 'nhom_sp' : 'vung'
      body[keyField] = editRow[keyField]
      if (tab === 'op1') body.dieu_kien = editRow.dieu_kien
      else body.bac_tu = editRow.bac_tu

      for (const f of editFields) {
        const v = editDraft[f.key]
        if (v === '' || v === undefined) body[f.key] = null
        else if (f.pct) body[f.key] = Math.round(parseFloat(v) * 100) / 10000
        else body[f.key] = v
      }

      const res = await apiPost('/chiet-khau/ap-dung-thang', {
        bang: tab === 'op1' ? 'ck_op1' : 'ck_op2',
        thang,
        rows: [body],
        updated_by: user?.ten || '',
      })
      setMsg({ type: 'ok', text: `Đã lưu — ghi ${res.so_log || 0} thay đổi` })
      setEditRow(null)
      fetchBang(tab === 'op1' ? 'ck_op1' : 'ck_op2', thang)
    } catch (e: any) { setMsg({ type: 'err', text: e.message }) }
    finally { setSavingEdit(false) }
  }

  const loadLog = async () => {
    setLoadingLog(true)
    try {
      const res = await apiGet(`/chiet-khau/log?thang=${thang}&limit=200`)
      setLogData(res.data || [])
    } catch (e: any) { setMsg({ type: 'err', text: e.message }) }
    finally { setLoadingLog(false) }
  }

  const openLog = () => { setShowLog(true); loadLog() }

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Bảng CK theo tháng</h1>
      <p style={pageSubtitle}>
        Mức chung theo tháng: <b>OP1</b> = theo nhóm SP × vùng (minmap mục 2), <b>OP2</b> = bậc doanh số theo vùng.
        Nhấn ✏️ để sửa dòng. Mọi thay đổi được ghi vào lịch sử.
      </p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <select style={select} value={thang} onChange={e => setThang(e.target.value)}>
          {thangs.length === 0 && <option value={thang}>{thang}</option>}
          {thangs.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 4, background: colors.surfaceSecondary, borderRadius: radius.md, padding: 4 }}>
          {([['op1', 'Bảng OP1'], ['op2', 'Bảng OP2']] as [Tab, string][]).map(([k, label]) => {
            const on = tab === k
            return (
              <button key={k} onClick={() => setTab(k)} style={{
                padding: '7px 16px', borderRadius: radius.sm, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: on ? 700 : 500,
                background: on ? colors.primary : 'transparent', color: on ? '#fff' : colors.textMuted,
              }}>{label}</button>
            )
          })}
        </div>
        <span style={{ flex: 1 }} />
        <button style={btn(colors.surfaceSecondary, colors.textSecondary)} onClick={openLog}>📜 Lịch sử</button>
      </div>

      {msg && (
        <div style={{ padding: 12, background: msg.type === 'ok' ? colors.successLight : colors.dangerLight, color: msg.type === 'ok' ? colors.success : colors.danger, borderRadius: radius.md, marginBottom: 12, fontSize: 13 }}>
          {msg.text}
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto', background: colors.card, borderRadius: radius.lg, boxShadow: shadow.card, border: `1px solid ${colors.border}` }}>
        {loading ? <div style={spinner}>Đang tải...</div> : (
          <table style={{ borderCollapse: 'collapse', fontSize: 12.5, width: '100%' }}>
            <thead>
              <tr>
                <th style={{ ...tableStyle.th, width: 60, textAlign: 'center', cursor: 'default' }}>Thao tác</th>
                {cols.map((c, ci) => {
                  const isLast = ci === cols.length - 1
                  return (
                    <th key={c.key} style={{ ...tableStyle.th, ...(isLast ? { borderRight: 'none' } : {}) }}>
                      {c.label}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={cols.length + 1} style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>Chưa có bảng cho tháng này</td></tr>
              ) : rows.map((r: any) => (
                <tr key={r.id}>
                  <td style={{ ...tableStyle.td, textAlign: 'center' }}>
                    <button style={{ ...btn(colors.primary, '#fff', 'sm'), padding: '3px 8px', fontSize: 11 }} onClick={() => openEdit(r)} title="Chỉnh sửa">✏️</button>
                  </td>
                  {cols.map((c, ci) => {
                    const isLast = ci === cols.length - 1
                    return (
                      <td key={c.key} style={{ ...tableStyle.td, ...(isLast ? { borderRight: 'none' } : {}), fontWeight: c.ro ? 600 : 400 }}>
                        {fmtCell(r, c as any)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ========== EDIT MODAL ========== */}
      {editRow && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditRow(null)}>
          <div style={{ background: colors.card, borderRadius: 12, padding: 20, width: 520, maxWidth: '94vw', boxShadow: shadow.modal }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
              Chỉnh sửa — {tab === 'op1' ? `OP1: ${editRow.nhom_sp} / ${editRow.dieu_kien}` : `OP2: ${editRow.vung} — Bậc ${editRow.bac_tu}`}
            </div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>Tháng {thang}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {editFields.map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>{f.label} {f.pct ? '(%)' : ''}</label>
                  <input style={{ ...input, width: '100%', boxSizing: 'border-box' }}
                    type={f.pct ? 'number' : 'text'} step="0.01"
                    value={editDraft[f.key] ?? ''}
                    onChange={e => setEditDraft({ ...editDraft, [f.key]: e.target.value })} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button style={{ ...btn(colors.textSecondary, '#fff'), fontSize: 13 }} onClick={() => setEditRow(null)}>Hủy</button>
              <button style={btn(colors.success)} disabled={savingEdit} onClick={saveEdit}>{savingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ========== LOG MODAL ========== */}
      {showLog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowLog(false)}>
          <div style={{ background: colors.card, borderRadius: 12, padding: 20, width: 700, maxWidth: '94vw', maxHeight: '85vh', boxShadow: shadow.modal, display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>📜 Lịch sử thay đổi — Tháng {thang}</div>
                <div style={{ fontSize: 12, color: colors.textMuted }}>{logData.length} bản ghi</div>
              </div>
              <button style={{ ...btn(colors.textSecondary, '#fff', 'sm'), fontSize: 12 }} onClick={() => setShowLog(false)}>✕ Đóng</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {loadingLog ? (
                <div style={spinner}>Đang tải...</div>
              ) : logData.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: colors.textMuted }}>Chưa có lịch sử</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {['Thời gian', 'Bảng', 'User', 'Cột', 'Giá trị cũ', 'Giá trị mới'].map(h => (
                        <th key={h} style={{ ...tableStyle.th, padding: '6px 8px', textAlign: 'left', position: 'sticky', top: 0, background: colors.surfaceSecondary }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logData.map((l: any, i: number) => (
                      <tr key={l.id || i} style={{ background: i % 2 === 1 ? `${colors.surfaceSecondary}44` : undefined }}>
                        <td style={{ ...tableStyle.td, padding: '5px 8px', whiteSpace: 'nowrap' }}>{l.created_at}</td>
                        <td style={{ ...tableStyle.td, padding: '5px 8px', fontFamily: 'monospace' }}>{l.bang}</td>
                        <td style={{ ...tableStyle.td, padding: '5px 8px' }}>{l.updated_by}</td>
                        <td style={{ ...tableStyle.td, padding: '5px 8px', fontFamily: 'monospace' }}>{l.cot}</td>
                        <td style={{ ...tableStyle.td, padding: '5px 8px', color: colors.danger }}>{l.gia_tri_cu || '—'}</td>
                        <td style={{ ...tableStyle.td, padding: '5px 8px', color: colors.success, fontWeight: 600 }}>{l.gia_tri_moi || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
