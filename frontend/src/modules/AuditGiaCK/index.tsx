import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import DataGrid, { Column } from '../../components/DataGrid'
import { apiDelete, apiPost, apiGet, apiPostOffline, isOnline, isTauriApp } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { colors, btn } from '../../theme'
import { formatNum } from '../../lib/format'

const CHUNK = 300
const API_PATH = '/check-gia-goc-ck'
// Detect cột theo tên header (dấu tiếng Việt ở file có thể khác nhau, chỉ match keyword)
const FIELD_ALIASES: Record<string, string[]> = {
  ngay: ['ngày chứng từ', 'ngày hạch toán', 'ngày'],
  so_ct: ['số chứng từ', 'số c/t', 'số ct'],
  dien_giai: ['diễn giải'],
  ma_kh: ['mã khách hàng', 'mã kh'],
  ten_kh: ['tên khách hàng', 'tên kh'],
  ma_hang: ['mã hàng'],
  ten_hang: ['tên hàng'],
  sl_ban: ['số lượng bán', 'tổng số lượng bán'],
  don_gia: ['đơn giá'],
  doanh_so: ['doanh số bán', 'doanh số'],
  ck: ['chiết khấu'],
  sl_tra: ['số lượng trả', 'tổng số lượng trả lại'],
  gt_tra: ['giá trị trả'],
  gt_giam: ['giá trị giảm'],
  thue: ['thuế'],
}
const NUM_FIELDS = ['sl_ban', 'don_gia', 'doanh_so', 'ck', 'sl_tra', 'gt_tra', 'gt_giam', 'thue']

function normHeader(v: any): string {
  return String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
}

// Tìm vị trí cột theo tên header → map db field -> idx
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
  { key: 'ngay', label: 'Ngày' },
  { key: 'so_ct', label: 'Số CT' },
  { key: 'dien_giai', label: 'Diễn giải' },
  { key: 'ma_kh', label: 'Mã KH' },
  { key: 'ten_kh', label: 'Khách hàng' },
  { key: 'ma_hang', label: 'Mã hàng' },
  { key: 'ten_hang', label: 'Tên hàng' },
  { key: 'sl_ban', label: 'SL bán', type: 'number' },
  { key: 'gia_goc', label: 'Giá gốc (MISA)', type: 'number' },
  { key: 'don_gia', label: 'Đơn giá', type: 'number' },
  {
    key: 'chech_lech', label: 'Chênh lệch', type: 'select', computed: true,
    options: [
      { value: '__gt0', label: 'Chênh lệch dương' },
      { value: '__eq0', label: 'Không chênh lệch' },
      { value: '__lt0', label: 'Chênh lệch âm' },
    ],
    render: (v, row) => {
      const donGia = Number(row.don_gia) || 0
      // Mã Z* (vận chuyển, phụ phí, swatch...) hoặc đơn giá ≤ 0 → không tính chênh lệch
      const isSpecial = String(row.ma_hang || '').startsWith('Z') || donGia <= 0
      // Tham chiếu = Giá gốc MISA (bỏ cột giá gốc thời điểm bán cho gọn)
      const giaGocMisa = row.gia_goc != null && row.gia_goc !== '' ? Number(row.gia_goc) : null
      if (isSpecial || giaGocMisa === null) return <span style={{ color: colors.textMuted }}>—</span>
      const ch = giaGocMisa - donGia
      const color = ch === 0 ? '#16a34a' : ch < 0 ? '#ca8a04' : '#dc2626'
      return <span style={{ fontWeight: 700, color }}>{ch > 0 ? '+' : ''}{formatNum(ch)}</span>
    },
  },
  { key: 'doanh_so', label: 'Doanh số', type: 'number' },
  { key: 'ck', label: 'CK', type: 'number' },
  { key: 'sl_tra', label: 'SL trả', type: 'number' },
  { key: 'gt_tra', label: 'GT trả', type: 'number' },
  { key: 'gt_giam', label: 'GT giảm', type: 'number' },
  { key: 'thue', label: 'Thuế', type: 'number' },
]

export default function AuditGiaCKPage() {
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
  // Phạm vi file đang xem: '' = file của mình, '__all' = tất cả (admin), số = file người khác
  const [viewOwner, setViewOwner] = useState('')
  const [owners, setOwners] = useState<Array<{ user_id: number; ten: string; so_dong: number }>>([])
  const [legacyCount, setLegacyCount] = useState(0)

  useEffect(() => {
    apiGet(`${API_PATH}/sync-lock`).then(r => setSyncLocked(!!r.locked)).catch(() => {})
    apiGet(`${API_PATH}/owners`).then(r => {
      setOwners(r.data || [])
      setLegacyCount(r.khong_so_huu || 0)
    }).catch(() => {})
  }, [])

  // Khi đổi user khác trong dropdown → đổi key để DataGrid fetch lại
  const changeViewOwner = (val: string) => {
    setViewOwner(val)
    setGridKey(k => k + 1)
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
      // Recompute "giá gốc tại thời điểm bán" sau khi upsert dữ liệu
      if (!res.error) await apiPost(`${API_PATH}/recompute-gia-goc-ngay`, {})
      if (res.error) throw new Error(res.error)
      // Tự chạy luồng "Phân tích & tự xử lý file audit"
      const auto = await apiPost(`${API_PATH}/auto-xu-ly`, {})
      if (auto.error) throw new Error('Lỗi tự xử lý: ' + auto.error)
      setResult(`Nhập JSON: thêm ${res.results?.inserted || 0}, cập nhật ${res.results?.updated || 0}, bỏ qua ${res.results?.skipped || 0}. ${auto.message || ''}`)
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

      const dataRows = rows.slice(headerIdx + 1).filter((r: any[]) => {
        if (!r || !r.some(c => c !== undefined && c !== null && c !== '')) return false
        if (normHeader(r[colMap.dien_giai]!).startsWith('số dòng') || normHeader(r[colMap.dien_giai]!).startsWith('tổng')) return false
        return r[colMap.ma_hang] !== undefined && r[colMap.ma_hang] !== null && String(r[colMap.ma_hang]).trim() !== ''
      })

      const records: any[] = []
      for (const row of dataRows) {
        const rec: Record<string, any> = {}
        for (const db of Object.keys(FIELD_ALIASES)) {
          const idx = colMap[db]
          if (idx === undefined) continue
          const val = row[idx]
          if (db === 'ngay') rec[db] = toDateStr(val)
          else if (NUM_FIELDS.includes(db)) rec[db] = typeof val === 'number' ? val : 0
          else rec[db] = val !== undefined && val !== null ? String(val).trim() : ''
        }
        if (!rec.ma_hang) continue
        records.push(rec)
      }
      if (records.length === 0) throw new Error('Không có dòng dữ liệu hợp lệ trong file')

      let imported = 0, skipped = 0, maMisaAdded = 0, giaGocAdded = 0
      let usedOffline = false
      let tryOffline = isTauriApp() && !isOnline()
      for (let i = 0; i < records.length; i += CHUNK) {
        const chunk = records.slice(i, i + CHUNK)
        let data: any
        if (tryOffline) {
          data = await apiPostOffline(`${API_PATH}/import-rows`, { rows: chunk }, {
            table: 'check-gia-goc-ck',
            keyFields: ['ngay', 'so_ct', 'ma_hang'],
          })
          usedOffline = true
        } else {
          try {
            data = await apiPost(`${API_PATH}/import-rows`, { rows: chunk })
          } catch (err: any) {
            if (isTauriApp() && (err.message?.includes('network') || err.message?.includes('fetch') || err.message?.includes('Connect') || err.message?.includes('timeout') || err.message?.includes('reqwest'))) {
              tryOffline = true
              usedOffline = true
              data = await apiPostOffline(`${API_PATH}/import-rows`, { rows: chunk }, {
                table: 'check-gia-goc-ck',
                keyFields: ['ngay', 'so_ct', 'ma_hang'],
              })
            } else {
              throw err
            }
          }
        }
        if (data?.error) throw new Error(data.error || `Lỗi chunk ${Math.floor(i / CHUNK) + 1}`)
        imported += data?.imported || data?.inserted || 0
        skipped += data?.skipped || 0
        maMisaAdded += data?.ma_misa_added || 0
        giaGocAdded += data?.gia_goc_added || 0
      }

      // Tự chạy luồng "Phân tích & tự xử lý file audit" sau khi import toàn bộ file
      if (!usedOffline) {
        const auto = await apiPost(`${API_PATH}/auto-xu-ly`, {})
        if (auto.error) throw new Error('Lỗi tự xử lý: ' + auto.error)
        setResult(
          user?.is_admin
            ? `Import ${imported} dòng thành công${skipped ? `, bỏ qua ${skipped} dòng (trùng hoặc thiếu mã hàng)` : ''}${maMisaAdded ? `, thêm mới ${maMisaAdded} mã MISA` : ''}${giaGocAdded ? `, thêm ${giaGocAdded} giá gốc` : ''}. ${auto.message || ''}`
            : `Import ${imported} dòng thành công`
        )
      } else {
        setResult(`Import ${imported} dòng thành công (offline — lưu local).`)
      }
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
            <div style={{ fontSize: 13, color: colors.textMuted }}>Import từ file "Sổ chi tiết bán hàng.xlsx" (dữ liệu tự xóa sau 6h):</div>
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
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: colors.text, fontWeight: 500 }}>Lấy file người khác:</span>
          <select
            value={viewOwner}
            onChange={e => changeViewOwner(e.target.value)}
            style={{ fontSize: 12, height: 32, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '0 6px', background: '#fff', color: '#1a2332' }}
          >
            <option value="">File của tôi</option>
            {user?.is_admin && <option value="__all">Tất cả (Admin)</option>}
            {owners.map(o => (
              <option key={o.user_id} value={String(o.user_id)}>{o.ten} ({o.so_dong} dòng)</option>
            ))}
            {legacyCount > 0 && <option value="__null">Dữ liệu cũ (không ai sở hữu) ({legacyCount} dòng)</option>}
          </select>
        </div>
        {canImport && (
          <button
            style={{ ...btn(colors.danger, '#fff'), fontSize: 12, height: 32 }}
            onClick={async () => {
              const isAdmin = user?.is_admin
              const subj = isAdmin ? 'toàn bộ dữ liệu của mọi người' : 'dữ liệu của bạn'
              if (!confirm(`Xóa ${subj} khỏi Audit Giá Gốc?`)) return
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
        title="Audit Giá Gốc"
        columns={columns}
        apiPath={API_PATH}
        searchable
        defaultSort="id"
        exportable
        exportName="CheckGiaGoc_CK"
        defaultLimit={500}
        extraFilters={viewOwner !== '' ? { ...(noPrice ? { don_gia: '__empty' } : {}), owner_user_id: viewOwner } : (noPrice ? { don_gia: '__empty' } : undefined)}
        logBang="check_gia_goc_ck"
      />
    </div>
  )
}
