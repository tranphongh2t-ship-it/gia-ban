import { useState, useRef } from 'react'
import DataGrid, { Column } from '../../components/DataGrid'
import { colors, radius, btn, pageContainer } from '../../theme'

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
  { key: 'doanh_so', label: 'Doanh số', type: 'number' },
  { key: 'ck', label: 'CK', type: 'number' },
  { key: 'sl_tra', label: 'SL trả', type: 'number' },
  { key: 'gt_tra', label: 'GT trả', type: 'number' },
  { key: 'gt_giam', label: 'GT giảm', type: 'number' },
  { key: 'thue', label: 'Thuế', type: 'number' },
]

export default function SoChiTietBanHangPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [gridKey, setGridKey] = useState(0)
  const [noPrice, setNoPrice] = useState(false)

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) { setError('Vui lòng chọn file Excel'); return }
    setImporting(true); setError(null); setResult(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/so-chi-tiet-ban-hang/import-excel', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import thất bại')
      setResult(data.message || `Import ${data.imported} dòng thành công`)
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
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '0 24px', marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: colors.textMuted }}>Import từ file "Sổ chi tiết bán hàng.xlsx":</div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ fontSize: 13 }} />
        <button style={{ ...btn(colors.primary), fontSize: 12, height: 32 }} onClick={handleImport} disabled={importing}>
          {importing ? 'Đang import...' : 'Import'}
        </button>
        {result && <span style={{ color: colors.success, fontSize: 13, fontWeight: 500 }}>{result}</span>}
        {error && <span style={{ color: colors.danger, fontSize: 13 }}>{error}</span>}
        <button
          style={{ ...btn(noPrice ? colors.warning : colors.textMuted, '#fff'), fontSize: 12, height: 32 }}
          onClick={() => { setNoPrice(v => !v); setGridKey(k => k + 1) }}
        >{noPrice ? '✓ Đơn giá = 0' : 'Lọc Đơn giá = 0'}</button>
      </div>
      <DataGrid
        key={gridKey}
        title="Sổ chi tiết bán hàng"
        columns={columns}
        apiPath="/so-chi-tiet-ban-hang"
        searchable
        defaultSort="id"
        exportable
        defaultLimit={500}
        extraFilters={noPrice ? { don_gia: '__empty' } : undefined}
      />
    </div>
  )
}