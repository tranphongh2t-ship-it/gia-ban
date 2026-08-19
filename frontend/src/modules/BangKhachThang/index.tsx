import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPost } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import {
  colors, shadow, radius, btn, input, select,
  tableStyle, pageContainer, pageTitle, pageSubtitle, spinner, badge,
} from '../../theme'
import { formatNum } from '../../lib/format'

type KhachRow = {
  ma_kh: string; ten_kh: string; nguon: string; thang_override: string | null
  thay_doi: string[]; prev: any
  loai_op: string; vung: string; doi_tuong: string; hang: string; nhom: string
  tu_lay: number | null; ck_vc_pct: number | null; ck_ds_98mau_pct: number | null; ck_ds_khac_pct: number | null; ck_ct_pct: string | null
  hd_98: number | null; hd_khac: number | null; hd_vc: number | null; co_bac: boolean
}

const currentMonth = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const nextMonth = (m: string): string => {
  const y = parseInt(m.slice(0, 4)), mo = parseInt(m.slice(5, 7))
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`
}

const HANG_LABEL: Record<string, string> = {
  OP1: 'OP1', OP2: 'OP2', Premium: 'Premium', Thuong: 'Thường',
}

const VUNG_LABEL: Record<string, string> = {
  SaiGon: 'Sài Gòn', Tinh: 'Tỉnh', NgoaiThanh: 'Ngoại thành',
}

// Nhóm hiển thị theo minmap: PREMIUM = hang='Premium'; OP2 = loai_op='OP2' hoặc có bậc tháng (co_bac)
const nhomHienThi = (r: KhachRow): string => {
  if (String(r.hang || '').toLowerCase() === 'premium') return 'PREMIUM'
  if (String(r.loai_op || '') === 'OP2' || r.co_bac) return 'Đại lý OP2'
  if (String(r.loai_op || '') === 'OP1') return 'Đại lý OP1'
  return 'Khách thường'
}
const NHOM_ORDER = ['PREMIUM', 'Đại lý OP1', 'Đại lý OP2', 'Khách thường']

// Cột % CK hiển thị theo minmap mục 3: CK MDF/OK phủ Mel (98 màu), CK còn lại, VC Mel, VC khác
// Key = cột lưu override; hdKey = mức hiệu dụng hiển thị (OP1 lấy từ ck_op1 theo vùng)
const PCT_COLS = [
  { key: 'ck_ds_98mau_pct', hdKey: 'hd_98', label: 'CK 98 màu %' },
  { key: 'ck_ds_khac_pct', hdKey: 'hd_khac', label: 'CK khác %' },
  { key: 'ck_vc_pct', hdKey: 'hd_vc', label: 'CK vận chuyển %' },
]

export default function BangKhachThangPage() {
  const { user } = useAuth()
  const [thang, setThang] = useState(currentMonth())
  const [thangs, setThangs] = useState<string[]>([])
  const [rows, setRows] = useState<KhachRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [mode, setMode] = useState<'rieng' | 'gd' | 'all'>('rieng')
  const [onlyDiff, setOnlyDiff] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({})
  const [deletes, setDeletes] = useState<string[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [candidates, setCandidates] = useState<any[]>([])
  const [showTao, setShowTao] = useState(false)
  const [taoThangMoi, setTaoThangMoi] = useState('')
  const [taoNguon, setTaoNguon] = useState('')
  const [taoBusy, setTaoBusy] = useState(false)
  const [taoResult, setTaoResult] = useState<any>(null)

  useEffect(() => {
    apiGet('/chiet-khau/quan-ly-thang/thangs')
      .then(res => { const t = (res.thangs || []) as string[]; setThangs(t) })
      .catch((e: any) => setMsg({ type: 'err', text: e.message }))
  }, [])

  const load = useCallback(async (t: string) => {
    setLoading(true); setMsg(null)
    try {
      const res = await apiGet(`/chiet-khau/quan-ly-thang/khach-thang?thang=${t}&mode=${mode}`)
      setRows(res.data || [])
      setDraft({}); setDeletes([])
    } catch (e: any) { setMsg({ type: 'err', text: e.message }) }
    finally { setLoading(false) }
  }, [mode])

  useEffect(() => { void load(thang) }, [load, thang])

  const taoThang = async () => {
    if (!/^\d{4}-\d{2}$/.test(taoThangMoi)) { setMsg({ type: 'err', text: 'Tháng mới phải dạng YYYY-MM' }); return }
    setTaoBusy(true); setMsg(null); setTaoResult(null)
    try {
      const res = await apiPost('/chiet-khau/quan-ly-thang/tao-thang', {
        thang_moi: taoThangMoi,
        nguon: taoNguon || undefined,
        copy_op1: true, copy_op2: true, copy_bac_thang: true, copy_khach: true,
        updated_by: user?.ten || '',
      })
      setTaoResult(res)
      setMsg({ type: 'ok', text: `Đã tạo tháng ${taoThangMoi} từ tháng ${res.nguon || 'gần nhất'}` })
      setThangs(prev => [...new Set([taoThangMoi, ...prev])].sort().reverse())
      setThang(taoThangMoi)
    } catch (e: any) { setMsg({ type: 'err', text: e.message }) }
    finally { setTaoBusy(false) }
  }

  const fmtPct = (v: any): string => {
    if (v === null || v === undefined || v === '') return ''
    return formatNum(Number(v) * 100)
  }
  const parsePct = (s: string): number | null => {
    const n = parseFloat(s.replace('%', ''))
    return isNaN(n) ? null : Math.round(n * 10000) / 1000000
  }
  const setVal = (maKh: string, key: string, val: string) => {
    setDraft(prev => {
      const rowDraft = { ...(prev[maKh] || {}) }
      if (val === '') delete rowDraft[key]
      else rowDraft[key] = val
      const next = { ...prev }
      if (Object.keys(rowDraft).length === 0) delete next[maKh]
      else next[maKh] = rowDraft
      return next
    })
  }

  const diffCol = (r: KhachRow, key: string): boolean =>
    String((r as any)[key] ?? '') !== String(r.prev?.[key] ?? '')

  const dirtyCount = Object.keys(draft).length + deletes.length

  const save = async () => {
    const rowsPayload: any[] = deletes.map(maKh => ({ ma_kh: maKh, delete: true }))
    for (const [maKh, d] of Object.entries(draft)) {
      const body: any = { ma_kh: maKh }
      for (const c of PCT_COLS) {
        const dv = d[c.key]
        if (dv === undefined) continue
        const pv = parsePct(dv)
        if (pv !== null) body[c.key] = pv
      }
      if (d['loai_op'] !== undefined) body['loai_op'] = d['loai_op'] || null
      if (d['vung'] !== undefined) body['vung'] = d['vung'] || null
      if (d['doi_tuong'] !== undefined) body['doi_tuong'] = d['doi_tuong'] || null
      if (d['hang'] !== undefined) body['hang'] = d['hang'] || null
      if (Object.keys(body).length > 1) rowsPayload.push(body)
    }
    if (rowsPayload.length === 0) { setMsg({ type: 'err', text: 'Không có thay đổi nào để lưu' }); return }

    setSaving(true); setMsg(null)
    try {
      const res = await apiPost('/chiet-khau/quan-ly-thang/khach-thang', { thang, rows: rowsPayload, updated_by: user?.ten || '' })
      setMsg({ type: 'ok', text: `Đã lưu ${res.so_upsert || 0} khách, bỏ ${res.so_delete || 0} khách khỏi tháng, ghi ${res.so_log || 0} thay đổi` })
      await load(thang)
    } catch (e: any) { setMsg({ type: 'err', text: e.message }) }
    finally { setSaving(false) }
  }

  // Tìm khách để thêm vào bảng tháng
  const searchKhach = async (q: string) => {
    setSearch(q)
    if (q.length < 2) return
    try {
      const res = await apiGet(`/chiet-khau/khach?nhom=all&search=${encodeURIComponent(q)}&limit=50`)
      setCandidates(res.data || [])
    } catch (e: any) { setMsg({ type: 'err', text: e.message }) }
  }

  // Thêm khách: tạo override cho tháng này với đúng loại op/vùng/đối tượng/hạng
  const addKhach = async (kh: any) => {
    setSaving(true); setMsg(null)
    try {
      const body: any = {
        ma_kh: kh.ma_kh,
        loai_op: kh.loai_op || 'OP1',
        vung: kh.vung || 'SaiGon',
        doi_tuong: kh.doi_tuong || 'PREMIER',
        hang: kh.hang || 'OP1',
      }
      if (kh.ck_ds_98mau_pct != null) body.ck_ds_98mau_pct = kh.ck_ds_98mau_pct
      if (kh.ck_ds_khac_pct != null) body.ck_ds_khac_pct = kh.ck_ds_khac_pct
      if (kh.ck_vc_pct != null) body.ck_vc_pct = kh.ck_vc_pct
      const res = await apiPost('/chiet-khau/quan-ly-thang/khach-thang', { thang, rows: [body], updated_by: user?.ten || '' })
      setMsg({ type: 'ok', text: `Đã thêm ${kh.ma_kh} vào bảng tháng ${thang} (${res.so_upsert || 0} dòng, ghi ${res.so_log || 0} thay đổi)` })
      setShowAdd(false); setSearch(''); setCandidates([])
      await load(thang)
    } catch (e: any) { setMsg({ type: 'err', text: e.message }) }
    finally { setSaving(false) }
  }

  const removeKhach = async (maKh: string) => {
    if (!confirm(`Bỏ khách ${maKh} ra khỏi bảng tháng ${thang}? (chỉ bỏ override tháng này, không xóa khách)`)) return
    setSaving(true); setMsg(null)
    try {
      const res = await apiPost('/chiet-khau/quan-ly-thang/khach-thang', { thang, rows: [{ ma_kh: maKh, delete: true }], updated_by: user?.ten || '' })
      setMsg({ type: 'ok', text: `Đã bỏ ${maKh} khỏi bảng tháng ${thang} (${res.so_delete || 0} dòng, ghi ${res.so_log || 0} thay đổi)` })
      await load(thang)
    } catch (e: any) { setMsg({ type: 'err', text: e.message }) }
    finally { setSaving(false) }
  }

  const xoaThang = async () => {
    if (!confirm(`Xóa TOÀN BỘ dữ liệu tháng ${thang}?\n\nGồm: bảng CK mức chung (OP1/OP2), mức riêng từng đại lý, khách theo tháng và doanh số đã chốt.\n\nSổ chi tiết bán hàng và danh sách khách KHÔNG bị xóa. Không thể hoàn tác.`)) return
    if (!confirm(`Chắc chắn xóa tháng ${thang}? Gõ tháng "${thang}" vào ô sau để xác nhận:`) || prompt(`Gõ "${thang}" để xác nhận xóa:`) !== thang) return
    setSaving(true); setMsg(null)
    try {
      const res = await apiPost('/chiet-khau/quan-ly-thang/xoa-thang', { thang })
      setMsg({ type: 'ok', text: `Đã xóa dữ liệu tháng ${thang} (CK chung: ${res.xoa?.ck_op1 || 0} dòng, bậc đại lý: ${res.xoa?.op2_bac_thang || 0}, khách theo tháng: ${res.xoa?.khach_theo_thang || 0}, doanh số chốt: ${res.xoa?.monthly_summary || 0})` })
      setThangs(prev => prev.filter(t => t !== thang))
      await load(thang)
    } catch (e: any) { setMsg({ type: 'err', text: e.message }) }
    finally { setSaving(false) }
  }

  const groups = useMemo(() => {
    const filtered = rows
      .filter(r => !onlyDiff || r.thay_doi.length > 0)
      .filter(r => !filterText || r.ma_kh.toLowerCase().includes(filterText.toLowerCase()) || (r.ten_kh || '').toLowerCase().includes(filterText.toLowerCase()))
    const byGroup: Record<string, KhachRow[]> = {}
    for (const r of filtered) {
      const g = nhomHienThi(r)
      if (!byGroup[g]) byGroup[g] = []
      byGroup[g].push(r)
    }
    return NHOM_ORDER.filter(g => byGroup[g]).map(g => ({ name: g, items: byGroup[g] }))
  }, [rows, onlyDiff, filterText])

  const nhomBadge = (g: string) => {
    if (g === 'PREMIUM') return badge('#fde8ef', '#d6336c')
    if (g === 'Đại lý OP2') return badge('#e0f2fe', '#066fd1')
    if (g === 'Đại lý OP1') return badge('#e6f7e6', '#2f9e44')
    return badge(colors.surfaceSecondary, colors.textMuted)
  }

  const khachContent = loading ? (
    <div style={spinner}>Đang tải...</div>
  ) : groups.length === 0 ? (
    <div style={{ padding: 50, textAlign: 'center', color: colors.textMuted }}>Chưa có khách nào (thay đổi bộ lọc hoặc thêm khách)</div>
  ) : (
    <div>
      {groups.map(g => (
        <div key={g.name} style={{ marginBottom: 18, background: colors.card, borderRadius: radius.lg, boxShadow: shadow.card, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${colors.border}`, background: colors.surfaceSecondary, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={nhomBadge(g.name)}>{g.name}</span>
            <span style={{ fontSize: 12, color: colors.textMuted }}>{g.items.length} khách</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 12.5, width: '100%' }}>
              <thead>
                <tr>
                  {['Mã KH', 'Tên khách', 'Vùng', 'Loại OP', 'Hạng', 'CK 98 màu %', 'CK khác %', 'CK vận chuyển %', 'Nguồn', ''].map(h => (
                    <th key={h} style={{ ...tableStyle.th, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.items.map(r => {
                  const isDel = deletes.includes(r.ma_kh)
                  const isDirty = !!draft[r.ma_kh]
                  return (
                    <tr key={r.ma_kh} style={{ background: isDel ? colors.dangerLight : isDirty ? colors.warningLight : undefined, opacity: isDel ? 0.5 : 1 }}>
                      <td style={{ ...tableStyle.td, fontWeight: 700, whiteSpace: 'nowrap' }}>{r.ma_kh}</td>
                      <td style={tableStyle.td}>{r.ten_kh || ''}</td>
                      <td style={{ ...tableStyle.td, whiteSpace: 'nowrap' }}>
                        <select
                          style={{ ...select, padding: '5px 6px', fontSize: 12.5, minWidth: 118, borderColor: diffCol(r, 'vung') || draft[r.ma_kh]?.['vung'] !== undefined ? colors.warning : colors.border }}
                          value={draft[r.ma_kh]?.['vung'] !== undefined ? draft[r.ma_kh]['vung'] : (r.vung || '')}
                          onChange={e => setVal(r.ma_kh, 'vung', e.target.value)}
                          disabled={isDel}
                        >
                          <option value="">— chưa đặt —</option>
                          {Object.entries(VUNG_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </td>
                      <td style={{ ...tableStyle.td, padding: '2px 4px' }}>
                        <select
                          style={{ ...select, padding: '5px 6px', fontSize: 12.5, minWidth: 74, borderColor: diffCol(r, 'loai_op') || draft[r.ma_kh]?.['loai_op'] !== undefined ? colors.warning : colors.border }}
                          value={draft[r.ma_kh]?.['loai_op'] !== undefined ? draft[r.ma_kh]['loai_op'] : (r.loai_op || 'OP1')}
                          onChange={e => setVal(r.ma_kh, 'loai_op', e.target.value)}
                          disabled={isDel}
                        >
                          {['OP1', 'OP2'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      <td style={{ ...tableStyle.td, padding: '2px 4px' }}>
                        <select
                          style={{ ...select, padding: '5px 6px', fontSize: 12.5, minWidth: 100, borderColor: diffCol(r, 'hang') || draft[r.ma_kh]?.['hang'] !== undefined ? colors.warning : colors.border }}
                          value={draft[r.ma_kh]?.['hang'] !== undefined ? draft[r.ma_kh]['hang'] : (r.hang || '')}
                          onChange={e => setVal(r.ma_kh, 'hang', e.target.value)}
                          disabled={isDel}
                        >
                          <option value="">—</option>
                          {Object.entries(HANG_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </td>
                      {PCT_COLS.map(c => {
                        const dv = draft[r.ma_kh]?.[c.key]
                        const displayBase = (r as any)[c.hdKey] ?? (r as any)[c.key]
                        const val = dv !== undefined ? dv : fmtPct(displayBase)
                        const isDiff = diffCol(r, c.key) || dv !== undefined
                        return (
                          <td key={c.key} style={{ ...tableStyle.td, padding: '2px 4px' }}>
                            <input
                              style={{ ...input, padding: '5px 6px', fontSize: 12.5, minWidth: 70, textAlign: 'right', borderColor: isDiff ? colors.warning : colors.border }}
                              value={val}
                              onChange={e => setVal(r.ma_kh, c.key, e.target.value)}
                              placeholder={fmtPct(displayBase)}
                              disabled={isDel}
                            />
                          </td>
                        )
                      })}
                      <td style={{ ...tableStyle.td, whiteSpace: 'nowrap' }}>
                        {r.nguon === 'khach_theo_thang'
                          ? <span style={badge(colors.success, colors.successLight)}>tháng {r.thang_override}</span>
                          : <span style={badge(colors.surfaceSecondary, colors.textMuted)}>mặc định</span>}
                      </td>
                      <td style={{ ...tableStyle.td, whiteSpace: 'nowrap' }}>
                        <button
                          style={{ ...btn(r.nguon === 'khach_theo_thang' ? colors.dangerLight : colors.surfaceSecondary, r.nguon === 'khach_theo_thang' ? colors.danger : colors.textMuted, 'sm'), padding: '4px 8px' }}
                          onClick={() => removeKhach(r.ma_kh)}
                          disabled={saving}
                          title={r.nguon === 'khach_theo_thang' ? `Bỏ khỏi tháng ${thang} (bỏ override, quay về mặc định)` : 'Không có override tháng này'}
                        >
                          {r.nguon === 'khach_theo_thang' ? 'Bỏ khỏi tháng' : '—'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Bảng khách hàng theo tháng</h1>
      <p style={pageSubtitle}>
        Đúng minmap <b>mục 3</b>: mức riêng theo từng mã khách (OP2/Premium, thường ~20-30 khách) — chỉ những
        khách này cần quản lý mỗi tháng, còn hàng nghìn khách còn lại tự áp mức chung theo vùng.<br />
        Sửa % từng khách, thêm khách mới, bỏ khách ra khỏi tháng. Cột % = mức hiệu dụng (sửa % = tạo mức riêng cho tháng đó).<br />
        Mức chung theo nhóm SP (minmap mục 2) xem &amp; sửa tại <Link to="/quan-ly-thang" style={{ color: colors.infoDark, fontWeight: 700 }}>Quản lý tháng →</Link> ·
        Nền khách gốc (áp mọi tháng): <Link to="/danh-sach-khach-nhom" style={{ color: colors.infoDark, fontWeight: 700 }}>Nền 5 nhóm khách →</Link>
      </p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <select style={select} value={thang} onChange={e => setThang(e.target.value)}>
          <option value={thang}>{thang}</option>
          {thangs.filter(t => t !== thang).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          style={{ ...input, width: 240 }} placeholder="Lọc mã / tên khách"
          value={filterText} onChange={e => setFilterText(e.target.value)}
        />
        <select style={select} value={mode} onChange={e => setMode(e.target.value as any)}>
          <option value="rieng">Chỉ khách có mức riêng (minmap)</option>
          <option value="gd">Khách có giao dịch trong tháng</option>
          <option value="all">Tất cả khách</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={onlyDiff} onChange={() => setOnlyDiff(!onlyDiff)} />
          Chỉ khác so với tháng trước
        </label>
        <span style={{ flex: 1 }} />
        <button style={btn(colors.primary)} onClick={() => { setTaoThangMoi(nextMonth(thang)); setTaoNguon(''); setTaoResult(null); setShowTao(true) }}>
          Tạo tháng mới (copy)
        </button>
        <button style={btn(colors.primary)} onClick={() => setShowAdd(true)}>+ Thêm khách</button>
        <button style={btn(colors.success)} disabled={dirtyCount === 0 || saving} onClick={save}>
          {saving ? 'Đang lưu...' : `Lưu thay đổi${dirtyCount ? ` (${dirtyCount})` : ''}`}
        </button>
        {dirtyCount > 0 && (
          <button style={btn(colors.surfaceSecondary, colors.textSecondary)} disabled={saving} onClick={() => { setDraft({}); setDeletes([]) }}>
            Hủy sửa
          </button>
        )}
        <button style={btn(colors.dangerLight, colors.danger)} disabled={saving} onClick={xoaThang} title="Xóa toàn bộ dữ liệu chiết khấu của tháng đang chọn (không xóa sổ bán hàng)">
          Xóa tháng
        </button>
      </div>

      {msg && (
        <div style={{ padding: 12, background: msg.type === 'ok' ? colors.successLight : colors.dangerLight, color: msg.type === 'ok' ? colors.success : colors.danger, borderRadius: radius.md, marginBottom: 12, fontSize: 13 }}>
          {msg.text}
        </div>
      )}

      {khachContent}

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowAdd(false)}>
          <div style={{ background: colors.card, borderRadius: 12, padding: 20, width: 560, maxWidth: '94vw', boxShadow: shadow.modal }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Thêm khách vào bảng tháng {thang}</div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
              Gõ mã / tên khách (≥2 ký tự). Khách xuất hiện sẽ được thêm với đúng loại OP, vùng, đối tượng, hạng hiện có.
            </div>
            <input
              style={{ ...input, width: '100%', marginBottom: 10 }}
              placeholder="Tìm khách theo mã hoặc tên..."
              value={search}
              onChange={e => searchKhach(e.target.value)}
              autoFocus
            />
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {candidates.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: colors.textMuted, fontSize: 13 }}>{search.length < 2 ? 'Nhập ít nhất 2 ký tự để tìm' : 'Không tìm thấy khách nào'}</div>
              ) : candidates.map(kh => (
                <div key={kh.ma_kh} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderBottom: `1px solid ${colors.borderLight}`, cursor: 'pointer' }} onClick={() => addKhach(kh)}>
                  <span style={{ fontWeight: 700, minWidth: 110 }}>{kh.ma_kh}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{kh.ten_kh || ''}</span>
                  <span style={{ fontSize: 12, color: colors.textMuted, whiteSpace: 'nowrap' }}>
                    {kh.doi_tuong === 'PREMIUM' ? 'Premium' : kh.loai_op} · {kh.vung || ''} · CK {fmtPct(kh.ck_ds_98mau_pct)}/{fmtPct(kh.ck_ds_khac_pct)}/{fmtPct(kh.ck_vc_pct)}
                  </span>
                  <span style={{ ...btn(colors.primary, '#fff', 'sm'), padding: '4px 10px' }}>Thêm</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button style={{ ...btn(colors.textSecondary, '#fff'), fontSize: 13 }} onClick={() => setShowAdd(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {showTao && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowTao(false)}>
          <div style={{ background: colors.card, borderRadius: 12, padding: 20, width: 520, maxWidth: '94vw', boxShadow: shadow.modal }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Tạo tháng mới (sao chép từ tháng trước)</div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
              Không cần nhập lại từ đầu: bảng OP1, OP2, bậc đại lý và khách theo tháng sẽ được copy từ tháng nguồn, sau đó chỉ sửa khác biệt.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Tháng mới *</label>
                <input style={input} value={taoThangMoi} onChange={e => setTaoThangMoi(e.target.value)} placeholder="YYYY-MM" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Nguồn (trống = tự tìm tháng gần nhất)</label>
                <select style={select} value={taoNguon} onChange={e => setTaoNguon(e.target.value)}>
                  <option value="">Tự tìm tháng gần nhất</option>
                  {thangs.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {taoResult && (
              <div style={{ marginBottom: 12, background: colors.surfaceSecondary, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: 12, fontSize: 12.5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div><b>Nguồn:</b> {taoResult.nguon || 'tự tìm'}</div>
                {(['ck_op1', 'ck_op2', 'op2_bac_thang', 'khach_theo_thang'] as const).map(k => {
                  const r = taoResult.ket_qua?.[k]
                  return <div key={k}>{k}: {r ? (r.so_dong ? `${r.so_dong} dòng (từ ${r.over || 'tháng trước'})` : `chưa có (≤ ${r.over || '—'})`) : '—'}</div>
                })}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={{ ...btn(colors.textSecondary, '#fff'), fontSize: 13 }} onClick={() => setShowTao(false)}>Đóng</button>
              <button style={btn(colors.primary)} disabled={taoBusy || !/^\d{4}-\d{2}$/.test(taoThangMoi)} onClick={taoThang}>
                {taoBusy ? 'Đang tạo...' : 'Tạo & Sao chép'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
