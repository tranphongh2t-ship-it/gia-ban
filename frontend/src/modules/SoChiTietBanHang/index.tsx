import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import DataGrid, { Column } from '../../components/DataGrid'
import { apiDelete, apiPost } from '../../lib/api'
import { colors, btn } from '../../theme'

const CHUNK = 1500
// Báº£ng Ã¡nh xáº¡ cá»™t Excel â†’ cá»™t DB (thá»© tá»± cá»™t trong file Sá»• chi tiáº¿t bÃ¡n hÃ ng)
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
  { key: 'ngay', label: 'NgÃ y' },
  { key: 'so_ct', label: 'Sá»‘ CT' },
  { key: 'dien_giai', label: 'Diá»…n giáº£i' },
  { key: 'ma_kh', label: 'MÃ£ KH' },
  { key: 'ten_kh', label: 'KhÃ¡ch hÃ ng' },
  { key: 'ma_hang', label: 'MÃ£ hÃ ng' },
  { key: 'ten_hang', label: 'TÃªn hÃ ng' },
  { key: 'sl_ban', label: 'SL bÃ¡n', type: 'number' },
  { key: 'don_gia', label: 'ÄÆ¡n giÃ¡', type: 'number' },
  { key: 'gia_goc', label: 'GiÃ¡ gá»‘c', type: 'number' },
  { key: 'gia_misa', label: 'GiÃ¡ MISA', type: 'number' },
  { key: 'doanh_so', label: 'Doanh sá»‘', type: 'number' },
  { key: 'ck', label: 'CK', type: 'number' },
  { key: 'sl_tra', label: 'SL tráº£', type: 'number' },
  { key: 'gt_tra', label: 'GT tráº£', type: 'number' },
  { key: 'gt_giam', label: 'GT giáº£m', type: 'number' },
  { key: 'thue', label: 'Thuáº¿', type: 'number' },
]

export default function SoChiTietBanHangPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [gridKey, setGridKey] = useState(0)
  const [noPrice, setNoPrice] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) { setError('Vui lÃ²ng chá»n file Excel'); return }
    setImporting(true); setError(null); setResult(null)
    try {
      // Parse xlsx ngay trÃªn browser (trÃ¡nh CPU limit trÃªn Cloudflare Workers)
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(new Uint8Array(buf), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      if (!ws) throw new Error('KhÃ´ng Ä‘á»c Ä‘Æ°á»£c sheet trong file')
      // Fix range náº¿u !ref khÃ´ng khá»›p vá»›i dá»¯ liá»‡u thá»±c táº¿ (lá»—i Excel range)
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
        if (r[0].startsWith('Sá»‘ dÃ²ng') || r[0].startsWith('Tá»•ng')) return false
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
      if (records.length === 0) throw new Error('KhÃ´ng cÃ³ dÃ²ng dá»¯ liá»‡u há»£p lá»‡ trong file')

      // Gá»­i theo chunk Ä‘á»ƒ khÃ´ng vÆ°á»£t giá»›i háº¡n payload/CPU
      let imported = 0, skipped = 0
      for (let i = 0; i < records.length; i += CHUNK) {
        const chunk = records.slice(i, i + CHUNK)
        const res = await fetch('/api/so-chi-tiet-ban-hang/import-rows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: chunk }),
        })
        const text = await res.text()
        let data: any
        try { data = JSON.parse(text) } catch { throw new Error('Server tráº£ lá»—i (khÃ´ng pháº£i JSON). Thá»­ giáº£m sá»‘ dÃ²ng trong file hoáº·c liÃªn há»‡ admin.') }
        if (!res.ok || data.error) throw new Error(data.error || `Lá»—i chunk ${Math.floor(i / CHUNK) + 1}`)
        imported += data.imported || 0
        skipped += data.skipped || 0
      }

      setResult(`Import ${imported} dÃ²ng thÃ nh cÃ´ng${skipped ? `, bá» qua ${skipped} dÃ²ng (trÃ¹ng hoáº·c thiáº¿u mÃ£ hÃ ng)` : ''}`)
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
        <div style={{ fontSize: 13, color: colors.textMuted }}>Import tá»« file "Sá»• chi tiáº¿t bÃ¡n hÃ ng.xlsx":</div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ fontSize: 13 }} />
        <button style={{ ...btn(colors.primary), fontSize: 12, height: 32 }} onClick={handleImport} disabled={importing}>
          {importing ? 'Äang import...' : 'Import'}
        </button>
        {result && <span style={{ color: colors.success, fontSize: 13, fontWeight: 500 }}>{result}</span>}
        {error && <span style={{ color: colors.danger, fontSize: 13 }}>{error}</span>}
        <button
          style={{ ...btn(noPrice ? colors.warning : colors.textMuted, '#fff'), fontSize: 12, height: 32 }}
          onClick={() => { setNoPrice(v => !v); setGridKey(k => k + 1) }}
        >{noPrice ? 'âœ“ ÄÆ¡n giÃ¡ = 0' : 'Lá»c ÄÆ¡n giÃ¡ = 0'}</button>
        <button
          style={{ ...btn(colors.warning, '#fff'), fontSize: 12, height: 32 }}
          disabled={syncing}
          onClick={async () => {
            if (!confirm('Cáº­p nháº­t giÃ¡ gá»‘c (MÃ£ MISA + GiÃ¡ bÃ¡n) theo Ä‘Æ¡n giÃ¡ má»›i nháº¥t tá»« Sá»• chi tiáº¿t?')) return
            setSyncing(true)
            try {
              const d = await apiPost('/pricing/cap-nhat-gia-goc', {})
              setResult(d.message || 'OK')
            } catch (e: any) { setResult('Lá»—i: ' + e.message) }
            finally { setSyncing(false) }
          }}
        >{syncing ? 'Äang Ä‘á»“ng bá»™...' : 'ÄB giÃ¡ gá»‘c â† ÄÆ¡n giÃ¡'}</button>
        <span style={{ flex: 1 }} />
        <button
          style={{ ...btn(colors.danger, '#fff'), fontSize: 12, height: 32 }}
          onClick={async () => {
            if (!confirm('XÃ³a toÃ n bá»™ dá»¯ liá»‡u Sá»• chi tiáº¿t bÃ¡n hÃ ng?')) return
            try {
              const d = await apiDelete('/so-chi-tiet-ban-hang/clear')
              if (d.success) { setResult(d.message); setGridKey(k => k + 1) }
              else alert('Lá»—i: ' + d.error)
            } catch (e: any) { alert('Lá»—i: ' + e.message) }
          }}
        >XÃ³a háº¿t dá»¯ liá»‡u</button>
      </div>
      <DataGrid
        key={gridKey}
        title="Sá»• chi tiáº¿t bÃ¡n hÃ ng"
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