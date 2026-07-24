import { useState } from 'react'
import DataGrid, { Column } from '../../components/DataGrid'
import { apiPost } from '../../lib/api'
import { colors, radius, btn } from '../../theme'

const columns: Column[] = [
  { key: 'ma_sp', label: 'Mã SP', required: true, filterable: true },
  { key: 'ten_sp', label: 'Tên SP', filterable: true },
  { key: 'do_day', label: 'Độ dày' },
  { key: 'ma_giay', label: 'Mã giấy' },
  { key: 'nhom', label: 'Nhóm', type: 'select', options: [
    { value: 'N1', label: 'N1' },
    { value: 'N2', label: 'N2' },
    { value: 'N3', label: 'N3' },
    { value: 'N4', label: 'N4' },
    { value: 'N5', label: 'N5' },
    { value: 'N6', label: 'N6' },
    { value: 'N7', label: 'N7' },
  ]},
  { key: 'dg_giay', label: 'ĐG giấy', type: 'number' },
  { key: 'dg_vt', label: 'ĐG VT', type: 'number' },
  { key: 'gia_goc', label: 'Giá gốc', type: 'number' },
]

export default function GiaBanMisaPage() {
  const [key, setKey] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [result, setResult] = useState('')
  const [noPrice, setNoPrice] = useState(false)

  const handleDedup = async () => {
    if (!confirm('Xoá các dòng trùng (cùng mã SP + cùng giá gốc)?')) return
    setDeleting(true); setResult('')
    try {
      const r = await apiPost('/pricing/xoa-trung-gia-ban', {})
      setResult(r.message || `Đã xoá ${r.deleted} dòng`)
      setKey(k => k + 1)
    } catch (e: any) { setResult('Lỗi: ' + e.message) }
    finally { setDeleting(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '0 24px', marginBottom: 12 }}>
        <button
          style={{ ...btn(colors.danger), fontSize: 12, height: 32 }}
          onClick={handleDedup}
          disabled={deleting}
        >{deleting ? 'Đang xoá...' : 'Xoá dòng trùng'}</button>
        <button
          style={{ ...btn(noPrice ? colors.warning : colors.textMuted, '#fff'), fontSize: 12, height: 32 }}
          onClick={() => { setNoPrice(v => !v); setKey(k => k + 1) }}
        >{noPrice ? '✓ Không giá' : 'Lọc không giá'}</button>
        {result && <span style={{ fontSize: 13, color: result.startsWith('Lỗi') ? colors.danger : colors.success }}>{result}</span>}
      </div>
      <DataGrid key={key} title="Giá bán (MISA)" columns={columns} apiPath="/bang-gia-new/gia-ban" extraFilters={noPrice ? { gia_goc: '__empty' } : undefined} />
    </div>
  )
}