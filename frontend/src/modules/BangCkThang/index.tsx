import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPost } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import {
  colors, shadow, radius, btn, input, select,
  tableStyle, pageContainer, pageTitle, pageSubtitle, section, sectionTitle,
  spinner, badge,
} from '../../theme'
import { formatNum } from '../../lib/format'

type Tab = 'op1' | 'op2' | 'log'

const currentMonth = (): string => {
  const d = new Date()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}`
}

export default function BangCkThangPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('op1')
  const [thang, setThang] = useState(currentMonth())
  const [thangs, setThangs] = useState<string[]>([])
  const [rows, setRows] = useState<any[]>([])
  const [draft, setDraft] = useState<Record<number, Record<string, string>>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [dirtyCount, setDirtyCount] = useState(0)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchBang = useCallback(async (b: 'ck_op1' | 'ck_op2', t: string) => {
    setLoading(true); setMsg(null)
    try {
      const res = await apiGet(`/chiet-khau/bang-thang?bang=${b}&thang=${t}`)
      setRows(res.data || [])
      setThangs(res.thangs || [])
      setDraft({})
      setDirtyCount(0)
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

  const setVal = (id: number, key: string, val: string) => {
    setDraft(prev => {
      const rowDraft = { ...(prev[id] || {}) }
      if (!val) delete rowDraft[key]
      else rowDraft[key] = val
      const next = { ...prev, [id]: rowDraft }
      setDirtyCount(Object.keys(next).length)
      return next
    })
  }

  const parseCell = (v: string, c: { key: string; pct?: boolean }) => {
    if (c.pct) {
      const n = parseFloat(v.replace('%', ''))
      return isNaN(n) ? null : n / 100
    }
    return v.trim() === '' ? null : v
  }

  const save = async () => {
    const changed = Object.keys(draft).map(idStr => {
      const id = Number(idStr)
      const r = rows.find(x => x.id === id)
      if (!r) return null
      const body: any = {}
      for (const c of cols) {
        if (c.ro) continue
        const dv = draft[id][c.key]
        if (dv === undefined) continue
        const pv = parseCell(dv, c as any)
        if (pv !== null) body[c.key] = pv
      }
      if (Object.keys(body).length === 0) return null
      for (const c of cols) {
        if (c.ro) { body[c.key] = r[c.key]; continue }
      }
      return body
    }).filter(Boolean)

    if (changed.length === 0) { setMsg({ type: 'err', text: 'Không có thay đổi nào để lưu' }); return }
    const keyField = tab === 'op1' ? 'nhom_sp' : 'vung'
    const rowsPayload = changed.map(b => {
      if (tab === 'op1') return { nhom_sp: b.nhom_sp, dieu_kien: b.dieu_kien, ...stripKeys(b) }
      return { vung: b.vung, bac_tu: b.bac_tu, ...stripKeys(b) }
    })

    setSaving(true); setMsg(null)
    try {
      const res = await apiPost('/chiet-khau/ap-dung-thang', {
        bang: tab === 'op1' ? 'ck_op1' : 'ck_op2',
        thang,
        rows: rowsPayload,
        updated_by: user?.ten || '',
      })
      setMsg({ type: 'ok', text: `Đã lưu ${res.so_dong} dòng, ghi ${res.so_log} thay đổi vào lịch sử` })
      fetchBang(tab === 'op1' ? 'ck_op1' : 'ck_op2', thang)
    } catch (e: any) { setMsg({ type: 'err', text: e.message }) }
    finally { setSaving(false) }
  }

  const importExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const fd = new FormData()
    fd.append('file', f)
    fd.append('thang', thang)
    fd.append('updated_by', user?.ten || '')
    setImporting(true); setMsg(null)
    try {
      const res = await fetch(`/api/chiet-khau/import-bang-thang`, { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setMsg({ type: 'ok', text: `Đã import OP1 ${data.op1.upsert} dòng${data.op1.skip ? ` (skip ${data.op1.skip})` : ''} + OP2 ${data.op2.upsert} đại lý` })
      fetchBang(tab === 'op1' ? 'ck_op1' : 'ck_op2', thang)
    } catch (err: any) { setMsg({ type: 'err', text: err.message }) }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const stripKeys = (b: any) => {
    const o: Record<string, any> = {}
    for (const [k, v] of Object.entries(b)) {
      if (k === 'nhom_sp' || k === 'dieu_kien' || k === 'vung' || k === 'bac_tu') continue
      o[k] = v
    }
    return o
  }

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Bảng CK theo tháng</h1>
      <p style={pageSubtitle}>
        Mức chung theo tháng: <b>OP1</b> = theo nhóm SP × vùng (minmap mục 2), <b>OP2</b> = bậc doanh số theo vùng.
        Mọi thay đổi được ghi vào lịch sử (thay_doi_log).
        Mức riêng theo từng khách (minmap mục 3) chỉnh tại <Link to="/bang-khach-thang" style={{ color: colors.infoDark, fontWeight: 700 }}>Khách hàng theo tháng →</Link>
      </p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <select style={select} value={thang} onChange={e => setThang(e.target.value)}>
          {thangs.length === 0 && <option value={thang}>{thang}</option>}
          {thangs.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 4, background: colors.surfaceSecondary, borderRadius: radius.md, padding: 4 }}>
          {([['op1', 'Bảng OP1'], ['op2', 'Bảng OP2'], ['log', 'Lịch sử']] as [Tab, string][]).map(([k, label]) => {
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
        {tab !== 'log' && (
          <>
            <button style={btn(colors.primary, '#fff')} disabled={dirtyCount === 0 || saving} onClick={save}>
              {saving ? 'Đang lưu...' : `Lưu thay đổi${dirtyCount ? ` (${dirtyCount})` : ''}`}
            </button>
            <button style={btn(colors.surfaceSecondary, colors.textSecondary)} disabled={dirtyCount === 0} onClick={() => { setDraft({}); setDirtyCount(0) }}>
              Hủy sửa
            </button>
          </>
        )}
        <label style={{ ...btn(colors.primaryDark, '#fff'), cursor: 'pointer', display: 'inline-flex' }}>
          {importing ? 'Đang import...' : 'Import file Excel tháng này'}
          <input ref={fileRef} type="file" accept=".xlsx" hidden onChange={importExcel} disabled={importing} />
        </label>
      </div>

      {msg && (
        <div style={{ padding: 12, background: msg.type === 'ok' ? colors.successLight : colors.dangerLight, color: msg.type === 'ok' ? colors.success : colors.danger, borderRadius: radius.md, marginBottom: 12 }}>
          {msg.text}
        </div>
      )}

      {tab === 'log' ? (
        <LogTab thang={thang} />
      ) : (
        <div style={{ overflowX: 'auto', background: colors.card, borderRadius: radius.lg, boxShadow: shadow.card, border: `1px solid ${colors.border}` }}>
          {loading ? <div style={spinner}>Đang tải...</div> : (
            <table style={{ borderCollapse: 'collapse', fontSize: 12.5, width: '100%' }}>
              <thead>
                <tr>
                  {cols.map(c => (
                    <th key={c.key} style={{ ...tableStyle.th, whiteSpace: 'nowrap' }}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={cols.length} style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>Chưa có bảng cho tháng này</td></tr>
                ) : rows.map(r => (
                  <tr key={r.id} style={{ background: draft[r.id] ? colors.warningLight : undefined }}>
                    {cols.map(c => {
                      const isDirty = draft[r.id]?.[c.key] !== undefined
                      const val = isDirty ? draft[r.id][c.key] : fmtCell(r, c as any)
                      if (c.ro) {
                        return <td key={c.key} style={{ ...tableStyle.td, whiteSpace: 'nowrap', fontWeight: 600 }}>{val}</td>
                      }
                      return (
                        <td key={c.key} style={{ ...tableStyle.td, padding: '2px 6px' }}>
                          <input
                            style={{ ...input, padding: '6px 8px', fontSize: 12.5, borderColor: isDirty ? colors.warning : colors.border }}
                            value={val as string}
                            onChange={e => setVal(r.id, c.key, e.target.value)}
                            placeholder={fmtCell(r, c as any)}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function LogTab({ thang }: { thang: string }) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setErr(null)
    apiGet(`/chiet-khau/log?thang=${thang}&limit=200`)
      .then(res => setRows(res.data || []))
      .catch((e: any) => setErr(e.message))
      .finally(() => setLoading(false))
  }, [thang])

  return (
    <div style={{ background: colors.card, borderRadius: radius.lg, boxShadow: shadow.card, border: `1px solid ${colors.border}` }}>
      {loading ? <div style={spinner}>Đang tải...</div> : err ? (
        <div style={{ padding: 12, color: colors.danger }}>{err}</div>
      ) : (
        <table style={{ borderCollapse: 'collapse', fontSize: 12.5, width: '100%' }}>
          <thead>
            <tr>
              {['Thời gian', 'Bảng', 'User', 'Cột', 'Giá trị cũ', 'Giá trị mới'].map(h => (
                <th key={h} style={{ ...tableStyle.th, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>Chưa có thay đổi nào cho tháng này</td></tr>
            ) : rows.map(r => (
              <tr key={r.id}>
                <td style={tableStyle.td}>{r.created_at}</td>
                <td style={{ ...tableStyle.td, fontFamily: 'monospace' }}>{r.bang}</td>
                <td style={tableStyle.td}>{r.updated_by}</td>
                <td style={{ ...tableStyle.td, fontFamily: 'monospace' }}>{r.cot}</td>
                <td style={tableStyle.td}>{r.gia_tri_cu}</td>
                <td style={{ ...tableStyle.td, color: colors.success, fontWeight: 600 }}>{r.gia_tri_moi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
