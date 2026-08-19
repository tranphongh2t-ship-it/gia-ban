import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import DataGrid, { Column } from '../../components/DataGrid'
import { apiDelete, apiPost } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { colors, btn } from '../../theme'

const CHUNK = 1500
// Bảng ánh xạ cột Excel → cột DB (thứ tự cột trong file Sổ chi tiết bán hàng)
const COL_MAP: { db: string; idx: number; num?: boolean; date?: boolean }[] = [
  { db: 'ngay', idx: 0, date: true },
  { db: 'so_ct', idx: 1 },
  { db: 'dien_giai', idx: 2 },
  { db: 'ma_kh', idx: 3 },
  { db: 'ten_kh', idx: 4 },
  { db: 'ma_hang', idx: 5 },
  { db: 'ten_hang', idx: 6 },
  { db: 'sl_ban', idx: 7, num: true },
  { db: 'don_gia', idx: 8, num: true },
  { db: 'doanh_so', idx: 9, num: true },
  { db: 'ck', idx: 10, num: true },
  { db: 'sl_tra', idx: 11, num: true },
  { db: 'gt_tra', idx: 12, num: true },
  { db: 'gt_giam', idx: 13, num: true },
  { db: 'thue', idx: 14, num: true },
]

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
  { key: 'don_gia', label: 'Đơn giá', type: 'number' },
  { key: 'gia_goc', label: 'Giá gốc', type: 'number' },
  { key: 'gia_misa', label: 'Giá MISA', type: 'number' },
  { key: 'doanh_so', label: 'Doanh số', type: 'number' },
  { key: 'ck', label: 'CK', type: 'number' },
  { key: 'sl_tra', label: 'SL trả', type: 'number' },
  { key: 'gt_tra', label: 'GT trả', type: 'number' },
  { key: 'gt_giam', label: 'GT giảm', type: 'number' },
  { key: 'thue', label: 'Thuế', type: 'number' },
]

const doiChieuColumns: Column[] = [
  { key: 'ck_tinh', label: 'CK tính', type: 'number', computed: true, width: '90' },
  { key: 'pct_tinh', label: '% tính', computed: true, width: '72', render: (v: any) => v != null ? `${Number(v).toFixed(2)}%` : '' },
  { key: 'chenh_lech', label: 'Chênh lệch', type: 'number', computed: true, width: '90' },
  { key: 'sai_so', label: 'KQ', computed: true, width: '72', render: (v: any) => v == null ? '' : (v ? <span style={{ color: colors.danger, fontWeight: 700 }}>SAI</span> : <span style={{ color: colors.success, fontWeight: 700 }}>ĐÚNG</span>) },
  { key: 'giai_thich', label: 'Ghi chú', computed: true },
]

export default function SoChiTietBanHangPage() {
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('feature:edit-data')
  const canImport = hasPermission('feature:import-export') || canEdit
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [gridKey, setGridKey] = useState(0)
  const [noPrice, setNoPrice] = useState(false)
  const [doiChieu, setDoiChieu] = useState(false)
  const [syncing, setSyncing] = useState(false)

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
      // Fix range nếu !ref không khớp với dữ liệu thực tế (lỗi Excel range)
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

      const dataRows = rows.slice(2).filter((r: any[]) => {
        if (!r[0] || typeof r[0] !== 'string') return false
        if (r[0].startsWith('Số dòng') || r[0].startsWith('Tổng')) return false
        return r[5] || r[6]
      })

      const records: any[] = []
      for (const row of dataRows) {
        const rec: Record<string, any> = {}
        for (const m of COL_MAP) {
          const val = row[m.idx]
          if (m.date) rec[m.db] = toDateStr(val)
          else if (m.num) rec[m.db] = typeof val === 'number' ? val : 0
          else rec[m.db] = val !== undefined && val !== null ? String(val).trim() : ''
        }
        if (!rec.ma_hang) continue
        records.push(rec)
      }
      if (records.length === 0) throw new Error('Không có dòng dữ liệu hợp lệ trong file')

      // Gửi theo chunk để không vượt giới hạn payload/CPU
      let imported = 0, skipped = 0
      for (let i = 0; i < records.length; i += CHUNK) {
        const chunk = records.slice(i, i + CHUNK)
        const data = await apiPost('/so-chi-tiet-ban-hang/import-rows', { rows: chunk })
        if (data.error) throw new Error(data.error || `Lỗi chunk ${Math.floor(i / CHUNK) + 1}`)
        imported += data.imported || 0
        skipped += data.skipped || 0
      }

      setResult(`Import ${imported} dòng thành công${skipped ? `, bỏ qua ${skipped} dòng (trùng hoặc thiếu mã hàng)` : ''}`)
      setGridKey(k => k + 1) // refresh DataGrid
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
            <div style={{ fontSize: 13, color: colors.textMuted }}>Import từ file "Sổ chi tiết bán hàng.xlsx":</div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ fontSize: 13 }} />
            <button style={{ ...btn(colors.primary), fontSize: 12, height: 32 }} onClick={handleImport} disabled={importing}>
              {importing ? 'Đang import...' : 'Import'}
            </button>
            {result && <span style={{ color: colors.success, fontSize: 13, fontWeight: 500 }}>{result}</span>}
            {error && <span style={{ color: colors.danger, fontSize: 13 }}>{error}</span>}
          </>
        )}
        <button
          style={{ ...btn(noPrice ? colors.warning : colors.textMuted, '#fff'), fontSize: 12, height: 32 }}
          onClick={() => { setNoPrice(v => !v); setGridKey(k => k + 1) }}
        >{noPrice ? '✓ Đơn giá = 0' : 'Lọc Đơn giá = 0'}</button>
        <button
          style={{ ...btn(doiChieu ? colors.primary : colors.textMuted, '#fff'), fontSize: 12, height: 32 }}
          onClick={() => { setDoiChieu(v => !v); setGridKey(k => k + 1) }}
        >{doiChieu ? '✓ Đối chiếu CK' : 'Đối chiếu CK'}</button>
        {canEdit && (
          <button
            style={{ ...btn(colors.warning, '#fff'), fontSize: 12, height: 32 }}
            disabled={syncing}
            onClick={async () => {
              if (!confirm('Cập nhật giá gốc (Mã MISA + Giá bán) theo đơn giá mới nhất từ Sổ chi tiết?')) return
              setSyncing(true)
              try {
                const d = await apiPost('/pricing/cap-nhat-gia-goc', {})
                setResult(d.message || 'OK')
              } catch (e: any) { setResult('Lỗi: ' + e.message) }
              finally { setSyncing(false) }
            }}
          >{syncing ? 'Đang đồng bộ...' : 'ĐB giá gốc ← Đơn giá'}</button>
        )}
        <span style={{ flex: 1 }} />
        {canImport && (
          <button
            style={{ ...btn(colors.danger, '#fff'), fontSize: 12, height: 32 }}
            onClick={async () => {
              if (!confirm('Xóa toàn bộ dữ liệu Sổ chi tiết bán hàng?')) return
              try {
                const d = await apiDelete('/so-chi-tiet-ban-hang/clear')
                if (d.success) { setResult(d.message); setGridKey(k => k + 1) }
                else alert('Lỗi: ' + d.error)
              } catch (e: any) { alert('Lỗi: ' + e.message) }
            }}
          >Xóa hết dữ liệu</button>
        )}
      </div>
      <DataGrid
        key={gridKey}
        title={doiChieu ? 'Sổ chi tiết bán hàng — Đối chiếu CK' : 'Sổ chi tiết bán hàng'}
        columns={doiChieu ? [...columns, ...doiChieuColumns] : columns}
        apiPath={doiChieu ? '/so-chi-tiet-ban-hang/doi-chieu' : '/so-chi-tiet-ban-hang'}
        searchable
        defaultSort="id"
        exportable
        defaultLimit={500}
        extraFilters={noPrice ? { don_gia: '__empty' } : undefined}
      />
    </div>
  )
}