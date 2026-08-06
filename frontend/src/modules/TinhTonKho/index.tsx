import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { colors, radius, shadow, btn, input, pageContainer, pageTitle } from '../../theme'
import { formatNum } from '../../lib/format'
import { apiGet } from '../../lib/api'

interface TonKhoRow {
  maHang: string
  tenHang: string
  dvt: string
  cloudTon: number
  amissGiaVon: number | null
  giaTriTon: number | null
  giaGocMisa: number | null
}

const PAGE_SIZE = 500
const COL_DEFS = [
  { key: 'maHang', label: 'Mã hàng', minW: 80 },
  { key: 'tenHang', label: 'Tên hàng', minW: 200 },
  { key: 'dvt', label: 'ĐVT', minW: 50 },
  { key: 'cloudTon', label: 'Tồn kho (CLOUD)', minW: 80 },
  { key: 'giaGocMisa', label: 'Giá gốc (MISA)', minW: 100 },
  { key: 'amissGiaVon', label: 'Giá vốn (AMISS)', minW: 100 },
  { key: 'giaTriTon', label: 'Giá trị tồn kho', minW: 100 },
]

export default function TinhTonKho() {
  const [rows, setRows] = useState<TonKhoRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterThieu, setFilterThieu] = useState(false)
  const [colWidths, setColWidths] = useState<Record<string, number>>({})
  const [misaLoaded, setMisaLoaded] = useState(false)
  const misaPricesRef = useRef<Map<string, number>>(new Map())
  const fileRef = useRef<HTMLInputElement>(null)
  const resizing = useRef<{ key: string; startX: number; startW: number } | null>(null)

  useEffect(() => {
    apiGet('/api/pricing/tat-ca-gia-goc').then(res => {
      if (res?.data) {
        const map = new Map<string, number>()
        res.data.forEach((r: any) => {
          if (r.ma_sp && r.gia_goc) map.set(r.ma_sp, r.gia_goc)
        })
        misaPricesRef.current = map
        setMisaLoaded(true)
      }
    }).catch(() => setMisaLoaded(true))
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing.current) return
      const w = Math.max(COL_DEFS.find(c => c.key === resizing.current.key)?.minW || 50, resizing.current.startW + e.clientX - resizing.current.startX)
      setColWidths(p => ({ ...p, [resizing.current!.key]: w }))
    }
    const handleMouseUp = () => { resizing.current = null; document.body.style.cursor = ''; document.body.style.userSelect = '' }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp) }
  }, [])

  const startResize = (key: string, e: React.MouseEvent) => {
    e.preventDefault()
    resizing.current = { key, startX: e.clientX, startW: colWidths[key] || 150 }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const filtered = useMemo(() => {
    let result = rows
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(r => r.maHang.toLowerCase().includes(q) || r.tenHang.toLowerCase().includes(q))
    }
    if (filterThieu) {
      result = result.filter(r => r.amissGiaVon === null || r.amissGiaVon === 0)
    }
    return result
  }, [rows, search, filterThieu])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), [filtered])
  const pageRows = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page])
  const totalGiaTri = useMemo(() => filtered.reduce((s, r) => s + (r.giaTriTon || 0), 0), [filtered])
  const totalSL = useMemo(() => filtered.reduce((s, r) => s + r.cloudTon, 0), [filtered])
  const countThieu = useMemo(() => rows.filter(r => !r.amissGiaVon).length, [rows])

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true); setError(null); setRows([]); setFileName(file.name); setPage(1); setSearch(''); setFilterThieu(false)

    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })

      const amissSheet = wb.Sheets['AMISS TỪ 15.02 ĐẾN 30.06']
      const cloudSheet = wb.Sheets['CLOUD TỪ 15.02 ĐẾN 30.06']
      if (!amissSheet || !cloudSheet) {
        throw new Error('Không tìm thấy sheet "AMISS TỪ 15.02 ĐẾN 30.06" hoặc "CLOUD TỪ 15.02 ĐẾN 30.06"')
      }

      const amissData: any[] = XLSX.utils.sheet_to_json(amissSheet, { header: 1, defval: '' })
      const amissMap = new Map<string, { giaVon: number; tenHang: string; dvt: string }>()
      for (let i = 2; i < amissData.length; i++) {
        const row = amissData[i]
        const maHang = String(row[0] || '').trim()
        const tenHang = String(row[1] || '').trim()
        const dvt = String(row[2] || '').trim()
        const giaVon = parseFloat(String(row[11] || '0').replace(/,/g, ''))
        if (maHang && tenHang) {
          amissMap.set(maHang, { giaVon: giaVon || 0, tenHang, dvt })
        }
      }

      const cloudData: any[] = XLSX.utils.sheet_to_json(cloudSheet, { header: 1, defval: '' })
      const results: TonKhoRow[] = []
      for (let i = 2; i < cloudData.length; i++) {
        const row = cloudData[i]
        const maHang = String(row[0] || '').trim()
        const tenHang = String(row[1] || '').trim()
        const dvt = String(row[2] || '').trim()
        const cloudTon = parseFloat(String(row[6] || '0').replace(/,/g, ''))
        if (!maHang) continue

        const amiss = amissMap.get(maHang)
        const giaVon = amiss ? amiss.giaVon : null
        const giaGocMisa = misaPricesRef.current.get(maHang) ?? null
        results.push({
          maHang,
          tenHang: amiss ? amiss.tenHang : tenHang,
          dvt: amiss ? amiss.dvt : dvt,
          cloudTon,
          amissGiaVon: giaVon,
          giaGocMisa,
          giaTriTon: giaVon !== null && giaVon > 0 ? cloudTon * giaVon : null,
        })
      }

      results.sort((a, b) => (b.giaTriTon || 0) - (a.giaTriTon || 0))
      setRows(results)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const exportExcel = useCallback(() => {
    if (filtered.length === 0) return
    const data = filtered.map(r => ({
      'Mã hàng': r.maHang,
      'Tên hàng': r.tenHang,
      'ĐVT': r.dvt,
      'Tồn kho (CLOUD)': r.cloudTon,
      'Giá gốc (MISA)': r.giaGocMisa ?? '',
      'Giá vốn (AMISS)': r.amissGiaVon ?? '',
      'Giá trị tồn kho': r.giaTriTon ?? '',
    }))
    data.push({
      'Mã hàng': '', 'Tên hàng': 'TỔNG CỘNG', 'ĐVT': '',
      'Tồn kho (CLOUD)': totalSL, 'Giá gốc (MISA)': '', 'Giá vốn (AMISS)': '', 'Giá trị tồn kho': totalGiaTri,
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tồn kho')
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([out], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `TonKho_${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click(); URL.revokeObjectURL(url)
  }, [filtered, totalGiaTri, totalSL])

  const handleSearch = useCallback((val: string) => {
    setSearch(val)
    setPage(1)
  }, [])

  const pagBtn = (disabled: boolean) => ({
    height: 28, padding: '0 10px', borderRadius: radius.sm, border: `1px solid ${colors.border}`,
    cursor: disabled ? 'default' as const : 'pointer' as const, fontSize: 12, fontWeight: 500,
    background: disabled ? colors.surfaceSecondary : colors.card,
    color: disabled ? colors.textMuted : colors.text,
  })

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Tính Tồn Kho</h1>

      <div style={{
        background: colors.card, borderRadius: radius.lg, padding: 24,
        border: `1px solid ${colors.border}`, boxShadow: shadow.card, marginBottom: 20,
      }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: colors.textMuted }}>
          Upload file Excel để xem toàn bộ dữ liệu tồn kho từ CLOUD, đối chiếu giá vốn từ AMISS.
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ ...btn(colors.primary, '#fff'), cursor: 'pointer', display: 'inline-flex' }}>
            {loading ? 'Đang xử lý...' : fileName || 'Chọn file Excel'}
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFile} disabled={loading} />
          </label>
          {rows.length > 0 && (
            <>
              <span style={{ fontSize: 12, color: colors.textMuted }}>|</span>
              <button style={{ ...btn(colors.success), fontSize: 12 }} onClick={exportExcel}>Xuất Excel</button>
              {countThieu > 0 && (
                <span style={{ fontSize: 12, color: colors.danger }}>
                  ({countThieu} mã thiếu giá vốn)
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: 16, background: `${colors.danger}15`, color: colors.danger, borderRadius: radius.md, marginBottom: 16, border: `1px solid ${colors.danger}22` }}>
          {error}
        </div>
      )}

      {rows.length > 0 && (
        <div style={{
          background: colors.card, borderRadius: radius.lg, overflow: 'hidden',
          border: `1px solid ${colors.border}`, boxShadow: shadow.card,
        }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <input style={{ ...input, minWidth: 260 }} placeholder="Tìm mã hàng, tên hàng..." value={search} onChange={e => handleSearch(e.target.value)} />
              {search && <button style={{ height: 28, padding: '0 8px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, color: colors.textMuted }} onClick={() => handleSearch('')}>Xoá lọc</button>}
              {countThieu > 0 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: colors.textMuted, cursor: 'pointer' }}>
                  <input type="checkbox" checked={filterThieu} onChange={e => { setFilterThieu(e.target.checked); setPage(1) }} />
                  Chỉ hiện mã thiếu giá vốn
                </label>
              )}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
              Tổng giá trị tồn kho: <span style={{ color: colors.primary }}>{formatNum(totalGiaTri)}</span>
              <span style={{ fontWeight: 400, color: colors.textMuted, marginLeft: 12, fontSize: 12 }}>
                ({formatNum(totalSL)} sản phẩm)
              </span>
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: colors.surfaceSecondary }}>
                  {COL_DEFS.map(col => (
                    <th key={col.key} style={{
                      padding: '10px 14px', textAlign: col.key === 'dvt' ? 'center' : (col.key === 'cloudTon' || col.key === 'giaGocMisa' || col.key === 'amissGiaVon' || col.key === 'giaTriTon' ? 'right' : 'left'),
                      color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase',
                      borderBottom: `1px solid ${colors.border}`, width: colWidths[col.key] || 150, minWidth: col.minW,
                      position: 'relative', userSelect: 'none',
                    }}>
                      {col.label}
                      <div onMouseDown={e => startResize(col.key, e)} style={{ position: 'absolute', top: 0, right: 0, width: 5, height: '100%', cursor: 'col-resize', zIndex: 2 }} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                  {pageRows.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: colors.textMuted, fontSize: 13 }}>Không tìm thấy kết quả</td></tr>
                  ) : (
                    pageRows.map((r, i) => {
                      const misaMatch = r.giaGocMisa !== null
                      return (
                      <tr key={`${r.maHang}-${(page - 1) * PAGE_SIZE + i}`} style={{
                        background: i % 2 === 0 ? colors.card : colors.surfaceSecondary,
                        opacity: !r.amissGiaVon ? 0.6 : 1,
                      }}>
                        <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text, fontWeight: 500 }}>{r.maHang}</td>
                        <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text }}>{r.tenHang}</td>
                        <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.textMuted, textAlign: 'center' }}>{r.dvt}</td>
                        <td style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, textAlign: 'right', color: colors.text, fontWeight: 600 }}>{formatNum(r.cloudTon)}</td>
                        <td style={{
                          padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, textAlign: 'right',
                          color: misaMatch ? colors.success : colors.danger, fontWeight: misaMatch ? 600 : 600,
                        }}>
                          {misaMatch ? formatNum(r.giaGocMisa) : <span style={{ fontSize: 11 }}>—</span>}
                        </td>
                        <td style={{
                          padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, textAlign: 'right',
                          color: r.amissGiaVon ? colors.text : colors.danger, fontWeight: r.amissGiaVon ? 400 : 600,
                        }}>
                          {r.amissGiaVon !== null ? formatNum(r.amissGiaVon) : <span style={{ fontSize: 11 }}>—</span>}
                        </td>
                        <td style={{
                          padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}`, textAlign: 'right',
                          color: r.giaTriTon ? colors.primaryDark : colors.textMuted, fontWeight: r.giaTriTon ? 700 : 400,
                        }}>
                          {r.giaTriTon !== null ? formatNum(r.giaTriTon) : <span style={{ fontSize: 11 }}>—</span>}
                        </td>
                      </tr>
                      )
                    })
                  )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '10px 14px', fontSize: 12, color: colors.textMuted, borderTop: `1px solid ${colors.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length} sản phẩm</span>
            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button disabled={page <= 1} style={{ ...pagBtn(page <= 1) }} onClick={() => setPage(1)}>‹‹</button>
                <button disabled={page <= 1} style={{ ...pagBtn(page <= 1) }} onClick={() => setPage(p => Math.max(1, p - 1))}>‹</button>
                <span style={{ padding: '0 8px' }}>Trang {page} / {totalPages}</span>
                <button disabled={page >= totalPages} style={{ ...pagBtn(page >= totalPages) }} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>›</button>
                <button disabled={page >= totalPages} style={{ ...pagBtn(page >= totalPages) }} onClick={() => setPage(totalPages)}>››</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
