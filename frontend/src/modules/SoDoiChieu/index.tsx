import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import DataGrid, { Column } from '../../components/DataGrid'
import { apiDelete, apiPost, apiGet } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { colors, btn } from '../../theme'
import { formatNum } from '../../lib/format'

const CHUNK = 1500
const API_PATH = '/so-doi-chieu'

// 23 cột đúng file "Sổ chi tiết bán hàng file mới.xlsx" (chú ý: cột khác file Check giá gốc-CK!)
const FIELD_ALIASES: Record<string, string[]> = {
  ngay_hach_toan: ['ngày hạch toán'],
  ngay_chung_tu: ['ngày chứng từ', 'ngày c/t'],
  so_chung_tu: ['số chứng từ', 'số c/t', 'số ct'],
  ngay_hoa_don: ['ngày hóa đơn'],
  so_hoa_don: ['số hóa đơn'],
  dien_giai_chung: ['diễn giải chung'],
  dien_giai: ['diễn giải'],
  ma_kh: ['mã khách hàng', 'mã kh'],
  ten_kh: ['tên khách hàng', 'tên kh'],
  ma_nhom_kh: ['mã nhóm khách hàng', 'mã nhóm kh'],
  ten_nhom_kh: ['tên nhóm khách hàng', 'tên nhóm kh'],
  ma_hang: ['mã hàng'],
  ten_hang: ['tên hàng'],
  dvt: ['đvt', 'đơn vị tính'],
  sl_ban: ['số lượng bán', 'tổng số lượng bán'],
  don_gia: ['đơn giá'],
  doanh_so: ['doanh số bán', 'doanh số'],
  ck: ['chiết khấu'],
  sl_tra: ['số lượng trả', 'tổng số lượng trả lại'],
  gt_tra: ['giá trị trả', 'giá trị trả lại'],
  gt_giam: ['giá trị giảm'],
  thue: ['thuế'],
  nv_ban: ['nv bán hàng', 'bán hàng', 'người bán'],
}
const NUM_FIELDS = ['sl_ban', 'don_gia', 'doanh_so', 'ck', 'sl_tra', 'gt_tra', 'gt_giam', 'thue']
const DATE_FIELDS = ['ngay_hach_toan', 'ngay_chung_tu', 'ngay_hoa_don']

function normHeader(v: any): string {
  return String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function detectCols(headerRow: any[]): Record<string, number> {
  const headers = Array.from({ length: (headerRow || []).length }, (_, i) => normHeader(headerRow[i]))
  const map: Record<string, number> = {}
  for (const db of Object.keys(FIELD_ALIASES)) {
    for (const alias of FIELD_ALIASES[db]) {
      const idx = headers.findIndex(h => h === alias || (alias.length > 2 && h.includes(alias)))
      if (idx >= 0) { map[db] = idx; break }
    }
  }
  return map
}

function toDateStr(v: any): string {
  if (typeof v === 'number') {
    const d = new Date((v - 25569) * 86400 * 1000)
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  }
  const s = String(v ?? '').trim()
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(s)) {
    const [a, b, c] = s.split(/[\/-]/)
    return `${a.padStart(2, '0')}/${b.padStart(2, '0')}/${c.length === 2 ? '20' + c : c}`
  }
  return s
}

const columns: Column[] = [
  { key: 'ngay_hach_toan', label: 'Ngày hạch toán', width: '110' },
  { key: 'ngay_chung_tu', label: 'Ngày chứng từ', width: '110' },
  { key: 'so_chung_tu', label: 'Số chứng từ', width: '100' },
  { key: 'ngay_hoa_don', label: 'Ngày hóa đơn', width: '110' },
  { key: 'so_hoa_don', label: 'Số hóa đơn', width: '100' },
  { key: 'dien_giai_chung', label: 'Diễn giải chung', width: '180' },
  { key: 'dien_giai', label: 'Diễn giải', width: '240' },
  { key: 'ma_kh', label: 'Mã KH', width: '110' },
  { key: 'ten_kh', label: 'Tên khách hàng', width: '260' },
  { key: 'ma_nhom_kh', label: 'Mã nhóm KH', width: '200' },
  { key: 'ten_nhom_kh', label: 'Tên nhóm KH', width: '260' },
  { key: 'ma_hang', label: 'Mã hàng', width: '150' },
  { key: 'ten_hang', label: 'Tên hàng', width: '260' },
  { key: 'dvt', label: 'ĐVT', width: '70' },
  { key: 'sl_ban', label: 'Tổng SL bán', type: 'number', width: '110' },
  { key: 'don_gia', label: 'Đơn giá', type: 'number', width: '120', group: 'gia', tint: '#38bdf8' },

  // --- Nhóm check 1: Giá gốc MISA — sau cột Đơn giá ---
  { key: 'gia_goc', label: 'Giá gốc (MISA)', type: 'number', width: '120', computed: true, group: 'gia', tint: '#38bdf8' },
  {
    key: 'chech_lech', label: 'Chênh lệch', type: 'select', computed: true, width: '110', group: 'gia', tint: '#38bdf8',
    options: [
      { value: '__gt0', label: 'Chênh lệch dương' },
      { value: '__eq0', label: 'Không chênh lệch' },
      { value: '__lt0', label: 'Chênh lệch âm' },
    ],
    render: (v, row) => {
      const donGia = Number(row.don_gia) || 0
      const isSpecial = String(row.ma_hang || '').startsWith('Z') || donGia <= 0
      const giaGoc = row.gia_goc != null && row.gia_goc !== '' ? Number(row.gia_goc) : null
      if (isSpecial || giaGoc === null) return <span style={{ color: colors.textMuted }}>—</span>
      const ch = giaGoc - donGia
      const color = ch === 0 ? '#16a34a' : ch < 0 ? '#ca8a04' : '#dc2626'
      return <span style={{ fontWeight: 700, color }}>{ch > 0 ? '+' : ''}{formatNum(ch)}</span>
    },
  },

  { key: 'doanh_so', label: 'Doanh số bán', type: 'number', width: '130' },
  { key: 'ck', label: 'Chiết khấu', type: 'number', width: '120', group: 'ck', tint: '#fbbf24' },
  {
    key: 'ck_pct_thuc_te', label: 'CK % (gốc)', type: 'number', computed: true, width: '110', group: 'ck', tint: '#fbbf24',
    render: (v, row) => {
      const ds = Number(row.doanh_so) || 0
      const ck = Number(row.ck) || 0
      if (ds <= 0) return '—'
      return (ck / ds * 100).toFixed(2) + '%'
    },
  },

  // --- Nhóm check 2: Chiết khấu theo engine bang-ck-thang — ngay sau cột Chiết khấu ---
  {
    key: 'ck1_pct', label: 'CK1 (ván trơn/chỉ nẹp)', type: 'number', width: '120', computed: true, group: 'ck', tint: '#fbbf24',
    render: (v, row) => {
      const n = Number(v)
      if (v === null || v === undefined || isNaN(n)) return '—'
      return <span style={{ fontWeight: 600 }}>{(n * 100).toFixed(2)}%</span>
    },
  },
  {
    key: 'ck2_pct', label: 'CK2 (vận chuyển)', type: 'number', width: '120', computed: true, group: 'ck', tint: '#fbbf24',
    render: (v, row) => {
      const n = Number(v)
      if (v === null || v === undefined || isNaN(n)) return '—'
      return <span style={{ fontWeight: 600 }}>{(n * 100).toFixed(2)}%</span>
    },
  },
  {
    key: 'ck3_pct', label: 'CK3 (Melamine)', type: 'number', width: '120', computed: true, group: 'ck', tint: '#fbbf24',
    render: (v, row) => {
      const n = Number(v)
      if (v === null || v === undefined || isNaN(n)) return '—'
      return <span style={{ fontWeight: 600 }}>{(n * 100).toFixed(2)}%</span>
    },
  },
  {
    key: 'tong_pct', label: 'Tổng % (engine)', type: 'number', width: '130', computed: true, group: 'ck', tint: '#fbbf24',
    render: (v, row) => {
      const n = Number(v)
      if (v === null || v === undefined || isNaN(n)) return '—'
      return <span style={{ fontWeight: 700 }}>{(n * 100).toFixed(2)}%</span>
    },
  },
  { key: 'ck_tinh', label: 'CK tính (engine)', type: 'number', width: '130', computed: true, group: 'ck', tint: '#fbbf24' },
  {
    key: 'ck_kq', label: 'Đúng/Sai', type: 'select', computed: true, width: '90', group: 'ck', tint: '#fbbf24',
    options: [
      { value: 'dung', label: 'Đúng' },
      { value: 'sai', label: 'Sai' },
    ],
    render: (v, row) => {
      const isSpecial = String(row.ma_hang || '').startsWith('Z') || (Number(row.don_gia) || 0) <= 0
      const ck = Number(row.ck) || 0
      const ckTinh = Number(row.ck_tinh) || 0
      if (isSpecial) return <span style={{ color: colors.textMuted }}>—</span>
      const dung = Math.abs(ck - ckTinh) < 1
      const color = dung ? '#16a34a' : '#dc2626'
      return <span style={{ fontWeight: 700, color }}>{dung ? 'Đúng' : 'Sai'}</span>
    },
  },
  { key: 'nhom_mau', label: 'Nhóm màu', width: '100', computed: true, group: 'ck', tint: '#fbbf24', render: (v) => v ? v : '—' },
  { key: 'dieu_kien', label: 'Điều kiện CK', width: '160', computed: true, group: 'ck', tint: '#fbbf24', render: (v) => v ? v : '—' },
  { key: 'giai_thich', label: 'Giải thích', width: '220', computed: true, render: (v) => v ? v : '—' },
  {
    key: 'sua_ghichu', label: 'Ghi chú sửa', width: '180', computed: true,
    render: (v) => v ? <span style={{ color: '#b45309' }}>{v}</span> : '—',
  },
  { key: 'updated_by', label: 'Người sửa', type: 'text', width: '150' },

  { key: 'sl_tra', label: 'Tổng SL trả lại', type: 'number', width: '110' },
  { key: 'gt_tra', label: 'Giá trị trả lại', type: 'number', width: '120' },
  { key: 'gt_giam', label: 'Giá trị giảm giá', type: 'number', width: '120' },
  {
    key: 'thue', label: 'Thuế GTGT', type: 'number', width: '120', computed: true, group: 'gia', tint: '#38bdf8',
    render: (v, row) => {
      const ds = Number(row.doanh_so) || 0
      const ck = Number(row.ck) || 0
      const thue = (ds - ck) * 0.08
      if (thue <= 0) return <span style={{ color: colors.textMuted }}>—</span>
      return <span style={{ fontWeight: 600 }}>{formatNum(Math.round(thue * 100) / 100)}</span>
    },
  },
  {
    key: 'thue_pct', label: '% thuế', type: 'number', computed: true, filterable: true, width: '100', group: 'gia', tint: '#38bdf8',
    render: (v, row) => {
      const ds = Number(row.doanh_so) || 0
      const ck = Number(row.ck) || 0
      const thue = Number(row.thue) || 0
      const base = ds - ck
      if (base <= 0) return <span style={{ color: colors.textMuted }}>—</span>
      const pct = thue / base * 100
      const is8 = Math.abs(pct - 8) < 0.05
      return <span style={{ fontWeight: 600, color: is8 ? '#16a34a' : colors.text }}>{pct.toFixed(2)}%</span>
    },
  },
  {
    key: 'thue_dung', label: 'Thuế Sai/Đúng', type: 'select', computed: true, filterable: true, width: '120', group: 'gia', tint: '#38bdf8',
    options: [
      { value: 'dung', label: 'Đúng' },
      { value: 'sai', label: 'Sai' },
    ],
    render: (v, row) => {
      const ds = Number(row.doanh_so) || 0
      const ck = Number(row.ck) || 0
      const thue = Number(row.thue) || 0
      const base = ds - ck
      if (base <= 0) return <span style={{ color: colors.textMuted }}>—</span>
      const pct = thue / base * 100
      const dung = Math.abs(pct - 8) < 0.05
      const color = dung ? '#16a34a' : '#dc2626'
      return <span style={{ fontWeight: 700, color }}>{dung ? 'Đúng' : 'Sai'}</span>
    },
  },
  { key: 'nv_ban', label: 'NV bán hàng', width: '150' },
]

export default function SoDoiChieuPage() {
  const { user, hasPermission } = useAuth()
  const canEdit = hasPermission('feature:edit-data')
  const canImport = hasPermission('feature:import-export') || canEdit
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [gridKey, setGridKey] = useState(0)
  const [noPrice, setNoPrice] = useState(false)
  const jsonRef = useRef<HTMLInputElement>(null)
  const [importingJson, setImportingJson] = useState(false)
  const [syncLocked, setSyncLocked] = useState(false)
  const [syncLockBusy, setSyncLockBusy] = useState(false)
  const [syncingAll, setSyncingAll] = useState(false)

  useEffect(() => {
    apiGet(`${API_PATH}/sync-lock`).then(r => setSyncLocked(!!r.locked)).catch(() => {})
  }, [])

  const recompute = async () => {
    await apiPost(`${API_PATH}/recompute-gia-goc`, {})
    const tinh = await apiPost(`${API_PATH}/tinh-het`, {})
    return tinh
  }

  const handleSyncAll = async () => {
    if (!confirm('Đồng bộ giá gốc vào giá MISA cho TẤT CẢ sản phẩm trong file (theo đúng mã hàng)? Thao tác này đổi giá MISA toàn bộ.')) return
    setSyncingAll(true); setError(null); setResult(null)
    try {
      const res = await apiPost(`${API_PATH}/dong-bo-tat-ca`, {}, { 'x-user-id': String(user?.id) })
      if (res.error) throw new Error(res.error)
      setResult(res.message || 'Đã đồng bộ.')
      setGridKey(k => k + 1)
    } catch (e: any) { setError(e.message) }
    finally { setSyncingAll(false) }
  }

  const toggleSyncLock = async () => {
    if (syncLockBusy) return
    const msg = syncLocked
      ? 'MỞ đồng bộ giá gốc → giá MISA? Khi import file sẽ tự đổi giá MISA = giá gốc (theo đúng mã hàng, mã xuất hiện lần đầu). Áp dụng cho tất cả user.'
      : 'KHÓA đồng bộ giá gốc → giá MISA? Khi import file sẽ KHÔNG tự đổi giá MISA. Áp dụng cho tất cả user.'
    if (!confirm(msg)) return
    setSyncLockBusy(true)
    try {
      const res = await apiPost(`${API_PATH}/sync-lock`, { locked: !syncLocked }, { 'x-user-id': String(user?.id) })
      if (res.success) setSyncLocked(!!res.locked)
      else alert(res.error || 'Không cập nhật được')
    } catch (e: any) { alert(e.message) }
    finally { setSyncLockBusy(false) }
  }

  const handleImportJson = async (file: File) => {
    setImportingJson(true); setError(null); setResult(null)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const rows = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.data) ? parsed.data : null)
      if (!rows || rows.length === 0) throw new Error('File JSON không có dữ liệu')
      const res = await apiPost(`/import/json${API_PATH}`, { rows })
      if (res.error) throw new Error(res.error)
      const tinh = await recompute()
      setResult(`Nhập JSON: thêm ${res.results?.inserted || 0}, cập nhật ${res.results?.updated || 0}, bỏ qua ${res.results?.skipped || 0}. Đã tính lại CK cho ${tinh?.so_dong || 0} dòng.`)
      setGridKey(k => k + 1)
    } catch (e: any) { setError('Lỗi nhập JSON: ' + e.message) }
    finally { setImportingJson(false); if (jsonRef.current) jsonRef.current.value = '' }
  }

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) { setError('Vui lòng chọn file Excel'); return }
    setImporting(true); setError(null); setResult(null)
    try {
      // Parse xlsx ngay trên browser (tránh CPU limit trên Cloudflare Workers)
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(new Uint8Array(buf), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      if (!ws) throw new Error('Không đọc được sheet trong file')
      {
        const ref = XLSX.utils.decode_range(ws['!ref'] || 'A1')
        let maxCol = ref.e.c, maxRow = ref.e.r
        for (const key of Object.keys(ws)) {
          if (key.startsWith('!')) continue
          const c = XLSX.utils.decode_cell(key)
          if (c.r > maxRow) maxRow = c.r
          if (c.c > maxCol) maxCol = c.c
        }
        ws['!ref'] = XLSX.utils.encode_range({ s: ref.s, e: { r: maxRow, c: maxCol } })
      }
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]
      if (rows.length < 2) throw new Error('Không đọc được dữ liệu trong file')

      // Tìm dòng header (dòng chứa "mã hàng")
      let headerIdx = rows.findIndex(r => (r || []).some((c: any) => normHeader(c).includes('mã hàng')))
      if (headerIdx < 0) throw new Error('Không tìm thấy dòng tiêu đề (thiếu cột "Mã hàng")')
      const colMap = detectCols(rows[headerIdx])
      if (colMap.ma_hang === undefined) throw new Error('Thiếu cột "Mã hàng" trong file')

      const dienGiaiIdx = colMap.dien_giai_chung !== undefined ? colMap.dien_giai_chung : colMap.dien_giai
      const dataRows = rows.slice(headerIdx + 1).filter((r: any[]) => {
        if (!r || !r.some(c => c !== undefined && c !== null && c !== '')) return false
        const dg = normHeader(dienGiaiIdx !== undefined ? r[dienGiaiIdx] : '')
        if (dg.startsWith('số dòng') || dg.startsWith('tổng')) return false
        return r[colMap.ma_hang] !== undefined && r[colMap.ma_hang] !== null && String(r[colMap.ma_hang]).trim() !== ''
      })

      const records: any[] = []
      for (const row of dataRows) {
        const rec: Record<string, any> = {}
        for (const db of Object.keys(FIELD_ALIASES)) {
          const idx = colMap[db]
          if (idx === undefined) continue
          const val = row[idx]
          if (DATE_FIELDS.includes(db)) rec[db] = toDateStr(val)
          else if (NUM_FIELDS.includes(db)) rec[db] = typeof val === 'number' ? val : (val !== undefined && val !== null && val !== '' ? Number(String(val).replace(/[^\d.-]/g, '')) || 0 : 0)
          else rec[db] = val !== undefined && val !== null ? String(val).trim() : ''
        }
        // File chỉ có 1 cột "Diễn giải" → lấp cả dien_giai_chung + dien_giai
        if (rec.dien_giai !== undefined && !rec.dien_giai_chung) rec.dien_giai_chung = rec.dien_giai
        if (!rec.dien_giai && rec.dien_giai_chung) rec.dien_giai = rec.dien_giai_chung
        if (!rec.ma_hang) continue
        records.push(rec)
      }
      if (records.length === 0) throw new Error('Không có dòng dữ liệu hợp lệ trong file')

      let imported = 0, skipped = 0
      for (let i = 0; i < records.length; i += CHUNK) {
        const chunk = records.slice(i, i + CHUNK)
        const data = await apiPost(`${API_PATH}/import-rows`, { rows: chunk })
        if (data.error) throw new Error(data.error || `Lỗi chunk ${Math.floor(i / CHUNK) + 1}`)
        imported += data.imported || 0
        skipped += data.skipped || 0
      }

      // Tính lại giá gốc tham chiếu + engine chiết khấu cho toàn bộ dữ liệu
      const tinh = await recompute()

      setResult(
        `Import ${imported} dòng thành công${skipped ? `, bỏ qua ${skipped} dòng (trùng hoặc thiếu mã hàng)` : ''}. Đã tính lại CK cho ${tinh?.so_dong || 0} dòng.`
      )
      setGridKey(k => k + 1)
      if (fileRef.current) fileRef.current.value = ''
    } catch (e: any) {
      setError(e.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', padding: '0 24px', marginBottom: 12 }}>
        {canImport && (
          <>
            <div style={{ fontSize: 13, color: colors.textMuted }}>Import từ file "Sổ chi tiết bán hàng (file mới).xlsx" (dữ liệu tự xóa sau 12h):</div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ fontSize: 13 }} />
            <button style={{ ...btn(colors.primary), fontSize: 12, height: 32 }} onClick={handleImport} disabled={importing}>
              {importing ? 'Đang import...' : 'Import'}
            </button>
            <input ref={jsonRef} type="file" accept=".json" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImportJson(f) }} />
            <button style={{ ...btn(colors.textSecondary, '#fff'), fontSize: 12, height: 32 }} onClick={() => jsonRef.current?.click()} disabled={importingJson}>
              {importingJson ? 'Đang nhập...' : 'Nhập JSON'}
            </button>
            {result && <span style={{ color: colors.success, fontSize: 13, fontWeight: 500 }}>{result}</span>}
            {error && <span style={{ color: colors.danger, fontSize: 13 }}>{error}</span>}
          </>
        )}
        <button
          style={{ ...btn(noPrice ? colors.warning : colors.textMuted, '#fff'), fontSize: 12, height: 32 }}
          onClick={() => { setNoPrice(v => !v); setGridKey(k => k + 1) }}
        >{noPrice ? '✓ Đơn giá = 0' : 'Lọc Đơn giá = 0'}</button>
        {user?.is_admin && (
          <>
            <button
              style={{ ...btn(colors.primary, '#fff'), fontSize: 12, height: 32 }}
              onClick={handleSyncAll} disabled={syncingAll}
              title="Đồng bộ giá gốc vào giá MISA theo đúng mã hàng cho TẤT CẢ sản phẩm trong file (chỉ Admin)"
            >{syncingAll ? 'Đang đồng bộ...' : 'Đồng bộ giá gốc → Giá MISA'}</button>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }} title="Công tắc khóa/bật đồng bộ giá gốc vào giá MISA — áp dụng cho tất cả user (chỉ Admin)">
              <span style={{ fontSize: 12, fontWeight: 600, color: syncLocked ? colors.danger : colors.textMuted }}>
                {syncLocked ? '🔒 Khóa ĐB giá gốc → MISA' : 'ĐB giá gốc → MISA'}
              </span>
              <button
                onClick={toggleSyncLock}
                disabled={syncLockBusy}
                style={{
                  width: 44, height: 22, borderRadius: 11, border: 'none', cursor: syncLockBusy ? 'wait' : 'pointer',
                  background: syncLocked ? colors.danger : '#cbd5e0', position: 'relative', padding: 0, flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: 2, width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  left: syncLocked ? 24 : 2, transition: 'left 150ms', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                }} />
              </button>
            </div>
          </>
        )}
        <span style={{ flex: 1 }} />
        {canImport && (
          <button
            style={{ ...btn(colors.danger, '#fff'), fontSize: 12, height: 32 }}
            onClick={async () => {
              if (!confirm('Xóa toàn bộ dữ liệu Sổ đối chiếu?')) return
              try {
                const d = await apiDelete(`${API_PATH}/clear`)
                if (d.success) { setResult(d.message); setGridKey(k => k + 1) }
                else alert('Lỗi: ' + d.error)
              } catch (e: any) { alert('Lỗi: ' + e.message) }
            }}
          >Xóa hết dữ liệu</button>
        )}
      </div>
      <DataGrid
        key={gridKey}
        title="Sổ đối chiếu Giá Gốc - CK - VAT"
        columns={columns}
        apiPath={API_PATH}
        searchable
        defaultSort="so_chung_tu"
        exportable
        exportName="SoDoiChieu"
        defaultLimit={100}
        extraFilters={noPrice ? { don_gia: '__empty' } : undefined}
        logBang="so_doi_chieu"
      />
    </div>
  )
}