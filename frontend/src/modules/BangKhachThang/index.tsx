import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPost } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import EditableGrid, { EditableCol, GroupTab } from '../../components/EditableGrid'
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
  OP1: 'Đại lý - Giao hàng (CK flat %)',
  OP2: 'Đại lý - Tự lấy hàng (CK lũy tiến)',
  Premium: 'Premium — Ưu đãi cao nhất',
  Thuong: 'Xưởng thường — Không CK riêng',
}

const VUNG_LABEL: Record<string, string> = {
  SaiGon: 'Sài Gòn', Tinh: 'Tỉnh', NgoaiThanh: 'Ngoại thành',
}

const DOI_TUONG_LABEL: Record<string, string> = {
  PREMIER: 'PREMIER',
  PREMIUM: 'PREMIUM',
  'PHỔ THÔNG': 'Phổ thông (CK tiêu chuẩn)',
}

const LOAI_OP_LABEL: Record<string, string> = {
  OP1: 'Giao hàng (Thanh Thùy giao)',
  OP2: 'Tự lấy hàng (Khách tự lấy)',
}

const nhomHienThi = (r: KhachRow): string => {
  const hang = String(r.hang || '').toLowerCase()
  const loaiOp = String(r.loai_op || '').toUpperCase()
  if (hang === 'premium') return 'PREMIUM'
  if (hang === 'op1') return 'Đại lý - Giao hàng (OP1)'
  if (hang === 'op2') return 'Đại lý - Tự lấy hàng (OP2)'
  // hang='Thuong' hoặc hang=null → phân theo loai_op
  if (loaiOp === 'OP2') return 'Xưởng thường - Tự lấy hàng (OP2)'
  return 'Xưởng thường - Giao hàng (OP1)'
}
const NHOM_ORDER = ['PREMIUM', 'Đại lý - Giao hàng (OP1)', 'Đại lý - Tự lấy hàng (OP2)', 'Xưởng thường - Giao hàng (OP1)', 'Xưởng thường - Tự lấy hàng (OP2)']

const PCT_COLS = [
  { key: 'ck_ds_98mau_pct', hdKey: 'hd_98', label: 'CK 98 màu %' },
  { key: 'ck_ds_khac_pct', hdKey: 'hd_khac', label: 'CK khác %' },
  { key: 'ck_vc_pct', hdKey: 'hd_vc', label: 'CK vận chuyển %' },
]

const fmtPct = (v: any): string => {
  if (v === null || v === undefined || v === '') return ''
  return formatNum(Number(v) * 100)
}

// Display-only columns (no inline editing)
const GRID_COLS: EditableCol[] = [
  { key: 'ma_kh', label: 'Mã KH', readOnly: true, width: 110 },
  { key: 'ten_kh', label: 'Tên khách', readOnly: true, width: 200 },
  { key: 'vung', label: 'Vùng', readOnly: true, width: 90 },
  { key: 'loai_op', label: 'Loại OP', readOnly: true, width: 70 },
  { key: 'hang', label: 'Hạng', readOnly: true, width: 80 },
  { key: 'hd_98', label: 'CK 98m %', readOnly: true, width: 80 },
  { key: 'hd_khac', label: 'CK khác %', readOnly: true, width: 80 },
  { key: 'hd_vc', label: 'CK VC %', readOnly: true, width: 80 },
  { key: 'nguon', label: 'Nguồn', readOnly: true, width: 90 },
]

export default function BangKhachThangPage() {
  const { user } = useAuth()
  const [thang, setThang] = useState(currentMonth())
  const [thangs, setThangs] = useState<string[]>([])
  const [rows, setRows] = useState<KhachRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [mode, setMode] = useState<'rieng' | 'all'>('all')
  const [onlyDiff, setOnlyDiff] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [showAddSearch, setShowAddSearch] = useState(false)
  const [search, setSearch] = useState('')
  const [candidates, setCandidates] = useState<any[]>([])
  const [showTao, setShowTao] = useState(false)
  const [taoThangMoi, setTaoThangMoi] = useState('')
  const [taoNguon, setTaoNguon] = useState('')
  const [taoBusy, setTaoBusy] = useState(false)
  const [taoResult, setTaoResult] = useState<any>(null)

  // Edit modal
  const [editRow, setEditRow] = useState<KhachRow | null>(null)
  const [editDraft, setEditDraft] = useState<Record<string, any>>({})
  const [savingEdit, setSavingEdit] = useState(false)

  // Create new customer modal
  const [showCreate, setShowCreate] = useState(false)
  const [createDraft, setCreateDraft] = useState({ ma_kh: '', ten_kh: '', loai_op: 'OP1', vung: 'SaiGon', doi_tuong: 'PREMIER', hang: 'OP1', ck_ds_98mau_pct: '', ck_ds_khac_pct: '', ck_vc_pct: '' })
  const [savingCreate, setSavingCreate] = useState(false)

  // Delete confirm modal
  const [deleteTarget, setDeleteTarget] = useState<KhachRow | null>(null)
  const [savingDelete, setSavingDelete] = useState(false)

  // Log modal
  const [showLog, setShowLog] = useState(false)
  const [logData, setLogData] = useState<any[]>([])
  const [loadingLog, setLoadingLog] = useState(false)
  const [logFilterMaKh, setLogFilterMaKh] = useState('')

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
    } catch (e: any) { setMsg({ type: 'err', text: e.message }) }
    finally { setLoading(false) }
  }, [mode])

  useEffect(() => { void load(thang) }, [load, thang])

  // --- Edit customer ---
  const openEdit = (r: KhachRow) => {
    setEditRow(r)
    setEditDraft({
      loai_op: r.loai_op || 'OP1',
      vung: r.vung || 'SaiGon',
      doi_tuong: r.doi_tuong || 'PREMIER',
      hang: r.hang || 'OP1',
      ck_ds_98mau_pct: r.ck_ds_98mau_pct != null ? String(Number(r.ck_ds_98mau_pct) * 100) : '',
      ck_ds_khac_pct: r.ck_ds_khac_pct != null ? String(Number(r.ck_ds_khac_pct) * 100) : '',
      ck_vc_pct: r.ck_vc_pct != null ? String(Number(r.ck_vc_pct) * 100) : '',
    })
  }

  const saveEdit = async () => {
    if (!editRow) return
    setSavingEdit(true); setMsg(null)
    try {
      // Update khach_theo_thang
      const body: any = { ma_kh: editRow.ma_kh }
      if (editDraft.loai_op !== undefined) body.loai_op = editDraft.loai_op
      if (editDraft.vung !== undefined) body.vung = editDraft.vung
      if (editDraft.doi_tuong !== undefined) body.doi_tuong = editDraft.doi_tuong
      if (editDraft.hang !== undefined) body.hang = editDraft.hang
      const pctCols = ['ck_ds_98mau_pct', 'ck_ds_khac_pct', 'ck_vc_pct']
      for (const col of pctCols) {
        const v = editDraft[col]
        if (v !== undefined && v !== '') body[col] = Math.round(parseFloat(v) * 100) / 10000
        else if (v === '') body[col] = null
      }
      const res = await apiPost('/chiet-khau/quan-ly-thang/khach-thang', { thang, rows: [body], updated_by: user?.ten || '' })
      setMsg({ type: 'ok', text: `Đã lưu ${editRow.ma_kh} — ghi ${res.so_log || 0} thay đổi` })
      setEditRow(null)
      await load(thang)
    } catch (e: any) { setMsg({ type: 'err', text: e.message }) }
    finally { setSavingEdit(false) }
  }

  // --- Create new customer ---
  const saveCreate = async () => {
    if (!createDraft.ma_kh || !createDraft.ten_kh) { setMsg({ type: 'err', text: 'Mã và tên khách bắt buộc' }); return }
    setSavingCreate(true); setMsg(null)
    try {
      // Create in danh_sach_khach
      const createBody: any = { ma_kh: createDraft.ma_kh, ten_kh: createDraft.ten_kh, loai_op: createDraft.loai_op, vung: createDraft.vung, doi_tuong: createDraft.doi_tuong, hang: createDraft.hang, updated_by: user?.ten || '' }
      if (createDraft.ck_ds_98mau_pct) createBody.ck_ds_98mau_pct = Math.round(parseFloat(createDraft.ck_ds_98mau_pct) * 100) / 10000
      if (createDraft.ck_ds_khac_pct) createBody.ck_ds_khac_pct = Math.round(parseFloat(createDraft.ck_ds_khac_pct) * 100) / 10000
      if (createDraft.ck_vc_pct) createBody.ck_vc_pct = Math.round(parseFloat(createDraft.ck_vc_pct) * 100) / 10000
      await apiPost('/chiet-khau/khach', createBody)
      // Auto add to current month with CK
      const monthBody: any = { ma_kh: createDraft.ma_kh, loai_op: createDraft.loai_op, vung: createDraft.vung, doi_tuong: createDraft.doi_tuong, hang: createDraft.hang }
      if (createDraft.ck_ds_98mau_pct) monthBody.ck_ds_98mau_pct = Math.round(parseFloat(createDraft.ck_ds_98mau_pct) * 100) / 10000
      if (createDraft.ck_ds_khac_pct) monthBody.ck_ds_khac_pct = Math.round(parseFloat(createDraft.ck_ds_khac_pct) * 100) / 10000
      if (createDraft.ck_vc_pct) monthBody.ck_vc_pct = Math.round(parseFloat(createDraft.ck_vc_pct) * 100) / 10000
      await apiPost('/chiet-khau/quan-ly-thang/khach-thang', { thang, rows: [monthBody], updated_by: user?.ten || '' })
      setMsg({ type: 'ok', text: `Đã tạo khách ${createDraft.ma_kh} và thêm vào tháng ${thang}` })
      setShowCreate(false)
      setCreateDraft({ ma_kh: '', ten_kh: '', loai_op: 'OP1', vung: 'SaiGon', doi_tuong: 'PREMIER', hang: 'OP1', ck_ds_98mau_pct: '', ck_ds_khac_pct: '', ck_vc_pct: '' })
      await load(thang)
    } catch (e: any) { setMsg({ type: 'err', text: e.message }) }
    finally { setSavingCreate(false) }
  }

  // --- Delete customer from month ---
  const confirmDelete = async () => {
    if (!deleteTarget) return
    setSavingDelete(true); setMsg(null)
    try {
      await apiPost('/chiet-khau/quan-ly-thang/khach-thang', { thang, rows: [{ ma_kh: deleteTarget.ma_kh, delete: true }], updated_by: user?.ten || '' })
      setMsg({ type: 'ok', text: `Đã bỏ ${deleteTarget.ma_kh} khỏi tháng ${thang}` })
      setDeleteTarget(null)
      await load(thang)
    } catch (e: any) { setMsg({ type: 'err', text: e.message }) }
    finally { setSavingDelete(false) }
  }

  // --- Log history ---
  const loadLog = async (maKh?: string) => {
    setLoadingLog(true); setMsg(null)
    try {
      const url = `/chiet-khau/quan-ly-thang/khach-thang/log?thang=${thang}${maKh ? `&ma_kh=${maKh}` : ''}`
      const res = await apiGet(url)
      setLogData(res.data || [])
    } catch (e: any) { setMsg({ type: 'err', text: e.message }) }
    finally { setLoadingLog(false) }
  }

  const openLog = () => {
    setShowLog(true)
    setLogFilterMaKh('')
    loadLog()
  }

  // --- Tao thang ---
  const taoThang = async () => {
    if (!/^\d{4}-\d{2}$/.test(taoThangMoi)) { setMsg({ type: 'err', text: 'Tháng mới phải dạng YYYY-MM' }); return }
    setTaoBusy(true); setMsg(null); setTaoResult(null)
    try {
      const res = await apiPost('/chiet-khau/quan-ly-thang/tao-thang', {
        thang_moi: taoThangMoi, nguon: taoNguon || undefined,
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

  // --- Search & add existing customer ---
  const searchKhach = async (q: string) => {
    setSearch(q)
    if (q.length < 2) return
    try {
      const res = await apiGet(`/chiet-khau/khach?nhom=all&search=${encodeURIComponent(q)}&limit=50`)
      setCandidates(res.data || [])
    } catch (e: any) { setMsg({ type: 'err', text: e.message }) }
  }

  const addKhach = async (kh: any) => {
    setSaving(true); setMsg(null)
    try {
      const body: any = { ma_kh: kh.ma_kh, loai_op: kh.loai_op || 'OP1', vung: kh.vung || 'SaiGon', doi_tuong: kh.doi_tuong || 'PREMIER', hang: kh.hang || 'OP1' }
      if (kh.ck_ds_98mau_pct != null) body.ck_ds_98mau_pct = kh.ck_ds_98mau_pct
      if (kh.ck_ds_khac_pct != null) body.ck_ds_khac_pct = kh.ck_ds_khac_pct
      if (kh.ck_vc_pct != null) body.ck_vc_pct = kh.ck_vc_pct
      const res = await apiPost('/chiet-khau/quan-ly-thang/khach-thang', { thang, rows: [body], updated_by: user?.ten || '' })
      setMsg({ type: 'ok', text: `Đã thêm ${kh.ma_kh} vào tháng ${thang} (${res.so_upsert || 0} dòng)` })
      setShowAddSearch(false); setSearch(''); setCandidates([])
      await load(thang)
    } catch (e: any) { setMsg({ type: 'err', text: e.message }) }
    finally { setSaving(false) }
  }

  const displayRows = useMemo(() => {
    return rows
      .filter(r => !onlyDiff || r.thay_doi.length > 0)
      .filter(r => !filterText || r.ma_kh.toLowerCase().includes(filterText.toLowerCase()) || (r.ten_kh || '').toLowerCase().includes(filterText.toLowerCase()))
  }, [rows, onlyDiff, filterText])

  const groupByNhom = useCallback((r: KhachRow) => nhomHienThi(r), [])

  const riengTabs: GroupTab[] = [
    { key: 'PREMIUM', label: 'PREMIUM', color: '#d6336c' },
    { key: 'Đại lý - Giao hàng (OP1)', label: 'Đại lý - Giao hàng (OP1)', color: '#2f9e44' },
    { key: 'Đại lý - Tự lấy hàng (OP2)', label: 'Đại lý - Tự lấy hàng (OP2)', color: '#066fd1' },
    { key: 'Xưởng thường - Giao hàng (OP1)', label: 'Xưởng thường - Giao hàng (OP1)', color: '#868e96' },
    { key: 'Xưởng thường - Tự lấy hàng (OP2)', label: 'Xưởng thường - Tự lấy hàng (OP2)', color: '#fab005' },
  ]

  const gridColsWithNguon: EditableCol[] = useMemo(() => {
    return GRID_COLS.map(c => {
      if (c.key === 'nguon') return { ...c, render: (v: any, row: any) => (
        row.nguon === 'khach_theo_thang'
          ? <span style={badge(colors.success, colors.successLight)}>tháng {row.thang_override}</span>
          : <span style={badge(colors.surfaceSecondary, colors.textMuted)}>mặc định</span>
      )}
      if (c.key === 'hd_98') return { ...c, render: (v: any) => v != null ? formatNum(Number(v) * 100) : '' }
      if (c.key === 'hd_khac') return { ...c, render: (v: any) => v != null ? formatNum(Number(v) * 100) : '' }
      if (c.key === 'hd_vc') return { ...c, render: (v: any) => v != null ? formatNum(Number(v) * 100) : '' }
      return c
    })
  }, [])

  const actionsCol = useMemo(() => (r: KhachRow) => (
    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
      <button style={{ ...btn(colors.primary, '#fff', 'sm'), padding: '3px 8px', fontSize: 11 }} onClick={() => openEdit(r)} title="Chỉnh sửa">✏️</button>
      <button style={{ ...btn(colors.dangerLight, colors.danger, 'sm'), padding: '3px 8px', fontSize: 11 }} onClick={() => setDeleteTarget(r)} title="Xóa khỏi tháng">🗑️</button>
    </div>
  ), [])

  const mainContent = loading ? (
    <div style={spinner}>Đang tải...</div>
  ) : displayRows.length === 0 ? (
    <div style={{ padding: 50, textAlign: 'center', color: colors.textMuted }}>Chưa có khách nào</div>
  ) : (
    <EditableGrid
      columns={gridColsWithNguon}
      rows={displayRows}
      rowKey="ma_kh"
      storageKey={`bkt-${thang}-${mode}`}
      groupBy={mode === 'rieng' ? groupByNhom : undefined}
      groupTabs={mode === 'rieng' ? riengTabs : undefined}
      actions={actionsCol}
    />
  )

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Bảng khách hàng theo tháng</h1>
      <p style={pageSubtitle}>
        Đúng minmap <b>mục 3</b>: mức riêng theo từng mã khách — chỉ những
        khách này cần quản lý mỗi tháng.<br />
        Nhấn ✏️ để sửa thông tin khách. Nhấn 🗑️ để bỏ khách khỏi tháng.<br />
        Mức chung theo nhóm SP xem tại <Link to="/quan-ly-thang" style={{ color: colors.infoDark, fontWeight: 700 }}>Quản lý tháng →</Link>
      </p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <select style={select} value={thang} onChange={e => setThang(e.target.value)}>
          <option value={thang}>{thang}</option>
          {thangs.filter(t => t !== thang).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input style={{ ...input, width: 240 }} placeholder="Lọc mã / tên khách" value={filterText} onChange={e => setFilterText(e.target.value)} />
        {/* Mode buttons */}
        <div style={{ display: 'flex', gap: 4, background: colors.surfaceSecondary, borderRadius: radius.md, padding: 4 }}>
          {[
            { key: 'rieng' as const, label: '🎯 Mức riêng', icon: '' },
            { key: 'all' as const, label: '📋 Tất cả', icon: '' },
          ].map(m => (
            <button key={m.key} onClick={() => setMode(m.key)} style={{
              padding: '7px 14px', borderRadius: radius.sm, border: 'none', cursor: 'pointer',
              fontSize: 12.5, fontWeight: mode === m.key ? 700 : 500,
              background: mode === m.key ? colors.primary : 'transparent',
              color: mode === m.key ? '#fff' : colors.textMuted,
            }}>
              {m.label}
            </button>
          ))}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={onlyDiff} onChange={() => setOnlyDiff(!onlyDiff)} />
          Chỉ khác tháng trước
        </label>
        <span style={{ flex: 1 }} />
        <button style={btn(colors.success)} onClick={() => setShowCreate(true)}>➕ Tạo khách mới</button>
        <button style={btn(colors.surfaceSecondary, colors.textSecondary)} onClick={() => setShowAddSearch(true)}>+ Thêm theo mã</button>
        <button style={btn(colors.surfaceSecondary, colors.textSecondary)} onClick={openLog}>📜 Lịch sử</button>
        <button style={btn(colors.primary)} onClick={() => { setTaoThangMoi(nextMonth(thang)); setTaoNguon(''); setTaoResult(null); setShowTao(true) }}>
          Tạo tháng mới (copy)
        </button>
      </div>

      {msg && (
        <div style={{ padding: 12, background: msg.type === 'ok' ? colors.successLight : colors.dangerLight, color: msg.type === 'ok' ? colors.success : colors.danger, borderRadius: radius.md, marginBottom: 12, fontSize: 13 }}>
          {msg.text}
        </div>
      )}

      {mainContent}

      {/* ========== EDIT MODAL ========== */}
      {editRow && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditRow(null)}>
          <div style={{ background: colors.card, borderRadius: 12, padding: 20, width: 480, maxWidth: '94vw', boxShadow: shadow.modal }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Chỉnh sửa khách {editRow.ma_kh}</div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>{editRow.ten_kh}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Loại OP</label>
                <select style={select} value={editDraft.loai_op} onChange={e => setEditDraft({ ...editDraft, loai_op: e.target.value })}>
                  {Object.entries(LOAI_OP_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Vùng</label>
                <select style={select} value={editDraft.vung} onChange={e => setEditDraft({ ...editDraft, vung: e.target.value })}>
                  {Object.entries(VUNG_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Đối tượng</label>
                <select style={select} value={editDraft.doi_tuong} onChange={e => setEditDraft({ ...editDraft, doi_tuong: e.target.value })}>
                  {Object.entries(DOI_TUONG_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Hạng (tính CK)</label>
                <select style={select} value={editDraft.hang} onChange={e => setEditDraft({ ...editDraft, hang: e.target.value })}>
                  {Object.entries(HANG_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>CK 98 màu %</label>
                <input style={input} type="number" step="0.01" value={editDraft.ck_ds_98mau_pct} onChange={e => setEditDraft({ ...editDraft, ck_ds_98mau_pct: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>CK khác %</label>
                <input style={input} type="number" step="0.01" value={editDraft.ck_ds_khac_pct} onChange={e => setEditDraft({ ...editDraft, ck_ds_khac_pct: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>CK vận chuyển %</label>
                <input style={input} type="number" step="0.01" value={editDraft.ck_vc_pct} onChange={e => setEditDraft({ ...editDraft, ck_vc_pct: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button style={{ ...btn(colors.textSecondary, '#fff'), fontSize: 13 }} onClick={() => setEditRow(null)}>Hủy</button>
              <button style={btn(colors.success)} disabled={savingEdit} onClick={saveEdit}>{savingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ========== CREATE NEW CUSTOMER MODAL ========== */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowCreate(false)}>
          <div style={{ background: colors.card, borderRadius: 12, padding: 20, width: 520, maxWidth: '94vw', boxShadow: shadow.modal }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Tạo khách hàng mới</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Mã khách *</label>
                <input style={input} value={createDraft.ma_kh} onChange={e => setCreateDraft({ ...createDraft, ma_kh: e.target.value })} placeholder="VD: KH001" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Tên khách *</label>
                <input style={input} value={createDraft.ten_kh} onChange={e => setCreateDraft({ ...createDraft, ten_kh: e.target.value })} placeholder="Tên khách hàng" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Loại OP</label>
                <select style={select} value={createDraft.loai_op} onChange={e => setCreateDraft({ ...createDraft, loai_op: e.target.value })}>
                  {Object.entries(LOAI_OP_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Vùng</label>
                <select style={select} value={createDraft.vung} onChange={e => setCreateDraft({ ...createDraft, vung: e.target.value })}>
                  {Object.entries(VUNG_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Đối tượng</label>
                <select style={select} value={createDraft.doi_tuong} onChange={e => setCreateDraft({ ...createDraft, doi_tuong: e.target.value })}>
                  {Object.entries(DOI_TUONG_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Hạng (tính CK)</label>
                <select style={select} value={createDraft.hang} onChange={e => setCreateDraft({ ...createDraft, hang: e.target.value })}>
                  {Object.entries(HANG_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>CK 98 màu %</label>
                <input style={input} type="number" step="0.01" value={createDraft.ck_ds_98mau_pct} onChange={e => setCreateDraft({ ...createDraft, ck_ds_98mau_pct: e.target.value })} placeholder="VD: 5" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>CK khác %</label>
                <input style={input} type="number" step="0.01" value={createDraft.ck_ds_khac_pct} onChange={e => setCreateDraft({ ...createDraft, ck_ds_khac_pct: e.target.value })} placeholder="VD: 3" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>CK vận chuyển %</label>
                <input style={input} type="number" step="0.01" value={createDraft.ck_vc_pct} onChange={e => setCreateDraft({ ...createDraft, ck_vc_pct: e.target.value })} placeholder="VD: 2" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button style={{ ...btn(colors.textSecondary, '#fff'), fontSize: 13 }} onClick={() => setShowCreate(false)}>Hủy</button>
              <button style={btn(colors.success)} disabled={savingCreate} onClick={saveCreate}>{savingCreate ? 'Đang tạo...' : 'Tạo & Thêm vào tháng'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ========== DELETE CONFIRM MODAL ========== */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setDeleteTarget(null)}>
          <div style={{ background: colors.card, borderRadius: 12, padding: 20, width: 400, maxWidth: '94vw', boxShadow: shadow.modal }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: colors.danger }}>Xóa khách khỏi tháng?</div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>
              <b>{deleteTarget.ma_kh}</b> — {deleteTarget.ten_kh}
            </div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 16 }}>
              Khách sẽ bị xóa khỏi tháng <b>{thang}</b> nhưng vẫn giữ trong danh sách chung.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={{ ...btn(colors.textSecondary, '#fff'), fontSize: 13 }} onClick={() => setDeleteTarget(null)}>Hủy</button>
              <button style={btn(colors.danger)} disabled={savingDelete} onClick={confirmDelete}>{savingDelete ? 'Đang xóa...' : 'Xóa'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ========== LOG HISTORY MODAL ========== */}
      {showLog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowLog(false)}>
          <div style={{ background: colors.card, borderRadius: 12, padding: 20, width: 700, maxWidth: '94vw', maxHeight: '85vh', boxShadow: shadow.modal, display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>📜 Lịch sử thay đổi — Tháng {thang}</div>
                <div style={{ fontSize: 12, color: colors.textMuted }}>{logData.length} bản ghi</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input style={{ ...input, width: 160, fontSize: 12 }} placeholder="Lọc mã khách..." value={logFilterMaKh} onChange={e => { setLogFilterMaKh(e.target.value); loadLog(e.target.value) }} />
                <button style={{ ...btn(colors.textSecondary, '#fff', 'sm'), fontSize: 12 }} onClick={() => setShowLog(false)}>✕ Đóng</button>
              </div>
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
                      <th style={{ ...tableStyle.th, padding: '6px 8px', textAlign: 'left', position: 'sticky', top: 0, background: colors.surfaceSecondary }}>Thời gian</th>
                      <th style={{ ...tableStyle.th, padding: '6px 8px', textAlign: 'left', position: 'sticky', top: 0, background: colors.surfaceSecondary }}>Mã KH</th>
                      <th style={{ ...tableStyle.th, padding: '6px 8px', textAlign: 'left', position: 'sticky', top: 0, background: colors.surfaceSecondary }}>Cột</th>
                      <th style={{ ...tableStyle.th, padding: '6px 8px', textAlign: 'left', position: 'sticky', top: 0, background: colors.surfaceSecondary }}>Giá trị cũ</th>
                      <th style={{ ...tableStyle.th, padding: '6px 8px', textAlign: 'left', position: 'sticky', top: 0, background: colors.surfaceSecondary }}>Giá trị mới</th>
                      <th style={{ ...tableStyle.th, padding: '6px 8px', textAlign: 'left', position: 'sticky', top: 0, background: colors.surfaceSecondary }}>Người sửa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logData.map((l: any, i: number) => (
                      <tr key={l.id || i} style={{ background: i % 2 === 1 ? `${colors.surfaceSecondary}44` : undefined }}>
                        <td style={{ ...tableStyle.td, padding: '5px 8px', whiteSpace: 'nowrap' }}>{l.created_at}</td>
                        <td style={{ ...tableStyle.td, padding: '5px 8px', fontWeight: 600 }}>{l.ref_id}</td>
                        <td style={{ ...tableStyle.td, padding: '5px 8px' }}>{l.cot}</td>
                        <td style={{ ...tableStyle.td, padding: '5px 8px', color: colors.danger }}>{l.gia_tri_cu || '—'}</td>
                        <td style={{ ...tableStyle.td, padding: '5px 8px', color: colors.success }}>{l.gia_tri_moi || '—'}</td>
                        <td style={{ ...tableStyle.td, padding: '5px 8px' }}>{l.updated_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== ADD EXISTING CUSTOMER MODAL ========== */}
      {showAddSearch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowAddSearch(false)}>
          <div style={{ background: colors.card, borderRadius: 12, padding: 20, width: 560, maxWidth: '94vw', boxShadow: shadow.modal }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Thêm khách có sẵn vào tháng {thang}</div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>Gõ mã / tên khách (≥2 ký tự).</div>
            <input style={{ ...input, width: '100%', marginBottom: 10 }} placeholder="Tìm khách..." value={search} onChange={e => searchKhach(e.target.value)} autoFocus />
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {candidates.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: colors.textMuted, fontSize: 13 }}>{search.length < 2 ? 'Nhập ít nhất 2 ký tự' : 'Không tìm thấy'}</div>
              ) : candidates.map(kh => (
                <div key={kh.ma_kh} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderBottom: `1px solid ${colors.borderLight}`, cursor: 'pointer' }} onClick={() => addKhach(kh)}>
                  <span style={{ fontWeight: 700, minWidth: 110 }}>{kh.ma_kh}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{kh.ten_kh || ''}</span>
                  <span style={{ fontSize: 12, color: colors.textMuted, whiteSpace: 'nowrap' }}>{kh.loai_op} · {kh.vung}</span>
                  <span style={{ ...btn(colors.primary, '#fff', 'sm'), padding: '4px 10px' }}>Thêm</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button style={{ ...btn(colors.textSecondary, '#fff'), fontSize: 13 }} onClick={() => setShowAddSearch(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* ========== TAO THANG MODAL ========== */}
      {showTao && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowTao(false)}>
          <div style={{ background: colors.card, borderRadius: 12, padding: 20, width: 520, maxWidth: '94vw', boxShadow: shadow.modal }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Tạo tháng mới (sao chép từ tháng trước)</div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>Bảng OP1, OP2, bậc đại lý và khách theo tháng sẽ được copy từ tháng nguồn.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Tháng mới *</label>
                <input style={input} value={taoThangMoi} onChange={e => setTaoThangMoi(e.target.value)} placeholder="YYYY-MM" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Nguồn</label>
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
                  return <div key={k}>{k}: {r ? (r.so_dong ? `${r.so_dong} dòng` : 'chưa có') : '—'}</div>
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
