import { useState, useEffect, useCallback, type CSSProperties } from 'react'
import { apiGet, apiPost, apiPatch } from '../../lib/api'
import { formatNum } from '../../lib/format'
import {
  colors, shadow, radius, card as cardStyle, btn, input, select,
  tableStyle, pageContainer, pageTitle, pageSubtitle, section, sectionTitle,
  spinner, badge, pagination as pgn,
} from '../../theme'
import { useColumnResize } from '../../lib/useColumnResize'

const P = {
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14, marginTop: 20 },
  card: (accent: string) => ({ background: colors.card, borderRadius: radius.lg, padding: 16, boxShadow: shadow.card, border: `1px solid ${colors.border}`, borderLeft: `4px solid ${accent}`, transition: 'box-shadow 150ms' }),
  topTable: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13, background: colors.card, borderRadius: radius.lg, overflow: 'hidden', boxShadow: shadow.card },
  topTh: { borderBottom: `1px solid ${colors.tableBorder}`, padding: '8px 16px', textAlign: 'left' as const, color: colors.textMuted, fontWeight: 600, fontSize: 11, background: colors.surfaceSecondary, textTransform: 'uppercase' as const, letterSpacing: 0.3 },
  topTd: { borderBottom: `1px solid ${colors.tableBorderLight}`, padding: '8px 16px', fontSize: 13, color: colors.textSecondary },
  recalcBox: { background: colors.primaryLight, borderRadius: radius.md, padding: 18, marginTop: 12, fontSize: 13, border: `1px solid ${colors.primary}22` },
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 10 },
  label: { color: colors.textMuted, fontSize: 12 },
  value: { fontWeight: 600, color: colors.text, fontSize: 14 },
  formulaBox: { background: colors.surfaceSecondary, borderRadius: radius.md, padding: '12px 16px', marginTop: 12, fontSize: 12, border: `1px solid ${colors.border}`, fontFamily: "'Courier New', monospace", lineHeight: 1.6 },
  formulaLabel: { color: colors.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4 },
  formulaCode: { color: '#495057', wordBreak: 'break-all' as const },
}

type FilterType = 'text' | 'date' | 'number' | 'select'

interface ColumnDef {
  key: string
  label: string
  type: FilterType
  options?: { label: string; value: string }[]
}

const columns: ColumnDef[] = [
  { key: 'ngay', label: 'Ngày', type: 'date' },
  { key: 'ma_kh', label: 'Mã KH', type: 'text' },
  { key: 'khach', label: 'KH', type: 'text' },
  { key: 'ma_hang', label: 'Mã hàng', type: 'text' },
  { key: 'ck_dung', label: 'CK đúng', type: 'number' },
  { key: 'ck_sai', label: 'CK sai', type: 'number' },
  { key: 'chenh_lech', label: 'Chênh lệch', type: 'number' },
  { key: 'ket_qua', label: 'Kết quả', type: 'select', options: [
    { label: 'Tất cả', value: '' },
    { label: 'ĐÚNG', value: 'dung' },
    { label: 'SAI', value: 'sai' },
  ]},
  { key: 'note', label: 'Ghi chú', type: 'text' },
]

interface FilterState {
  [key: string]: string
}

function FilterDropdown({ col, filter, onChange, onClose }: { col: ColumnDef; filter: string; onChange: (key: string, val: string) => void; onClose: () => void }) {
  const [val, setVal] = useState(filter || '')

  const handleApply = () => {
    onChange(col.key, val)
    onClose()
  }

  const handleClear = () => {
    setVal('')
    onChange(col.key, '')
    onClose()
  }

  const inputStyle = { ...input, width: '100%', padding: '6px 10px', fontSize: 13, marginBottom: 8 }

  return (
    <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, minWidth: 220, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.md, boxShadow: shadow.dropdown, padding: 12 }}>
      {col.type === 'date' && (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input type="date" style={inputStyle} placeholder="Từ" value={val.split('|')[0] || ''} onChange={e => setVal(e.target.value + '|' + (val.split('|')[1] || ''))} />
            <input type="date" style={inputStyle} placeholder="Đến" value={val.split('|')[1] || ''} onChange={e => setVal((val.split('|')[0] || '') + '|' + e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button style={{ ...btn(colors.textMuted, '#fff', 'sm'), fontSize: 12 }} onClick={handleClear}>Xoá</button>
            <button style={{ ...btn(colors.primary, '#fff', 'sm'), fontSize: 12 }} onClick={handleApply}>Lọc</button>
          </div>
        </div>
      )}
      {col.type === 'number' && (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input type="number" style={inputStyle} placeholder="Từ" value={val.split('|')[0] || ''} onChange={e => setVal(e.target.value + '|' + (val.split('|')[1] || ''))} />
            <input type="number" style={inputStyle} placeholder="Đến" value={val.split('|')[1] || ''} onChange={e => setVal((val.split('|')[0] || '') + '|' + e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button style={{ ...btn(colors.textMuted, '#fff', 'sm'), fontSize: 12 }} onClick={handleClear}>Xoá</button>
            <button style={{ ...btn(colors.primary, '#fff', 'sm'), fontSize: 12 }} onClick={handleApply}>Lọc</button>
          </div>
        </div>
      )}
      {col.type === 'select' && (
        <div>
          {col.options?.map(opt => (
            <div key={opt.value} style={{ padding: '6px 8px', cursor: 'pointer', borderRadius: radius.sm, background: val === opt.value ? colors.primaryLight : 'transparent', color: val === opt.value ? colors.primary : colors.text, marginBottom: 2, fontSize: 13, fontWeight: val === opt.value ? 600 : 400 }} onClick={() => { setVal(opt.value); onChange(col.key, opt.value); onClose() }}>
              {opt.label}
            </div>
          ))}
        </div>
      )}
      {col.type === 'text' && (
        <div>
          <input type="text" style={inputStyle} placeholder={`Lọc ${col.label}...`} value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleApply() }} autoFocus />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button style={{ ...btn(colors.textMuted, '#fff', 'sm'), fontSize: 12 }} onClick={handleClear}>Xoá</button>
            <button style={{ ...btn(colors.primary, '#fff', 'sm'), fontSize: 12 }} onClick={handleApply}>Lọc</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AuditPage() {
  const [stats, setStats] = useState<any>(null)
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [limit] = useState(50)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recalcId, setRecalcId] = useState<number | null>(null)
  const [recalcResult, setRecalcResult] = useState<any>(null)
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [filters, setFilters] = useState<FilterState>({})
  const [openFilter, setOpenFilter] = useState<string | null>(null)
  const { colWidths, getColWidth, startResize } = useColumnResize('audit')

  const fetchStats = useCallback(async () => { try { const s = await apiGet('/audit/stats'); setStats(s) } catch (_) {} }, [])

  const buildParams = useCallback(() => {
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    params.set('offset', String(offset))

    for (const [key, val] of Object.entries(filters)) {
      if (!val) continue
      if (key === 'ket_qua') continue // handled frontend-only
      if (key === 'ngay') {
        const parts = val.split('|')
        if (parts[0]) params.set('ngay_tu', parts[0])
        if (parts[1]) params.set('ngay_den', parts[1])
      } else if (key === 'chenh_lech') {
        const parts = val.split('|')
        if (parts[0]) params.set('filter_chenh_min', parts[0])
        if (parts[1]) params.set('filter_chenh_max', parts[1])
      } else {
        params.set(`filter_${key}`, val)
      }
    }
    return params
  }, [filters, limit, offset])

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = buildParams()
      const res = await apiGet(`/audit/compare?${params}`)
      let rows = res.data || []
      // Frontend filter for Kết quả
      const kq = filters['ket_qua']
      if (kq === 'dung') rows = rows.filter((r: any) => !r.sai_so)
      else if (kq === 'sai') rows = rows.filter((r: any) => r.sai_so)
      setData(rows)
      setTotal(res.total || 0)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [buildParams, filters])

  useEffect(() => { fetchStats() }, [])
  useEffect(() => { fetchData() }, [fetchData])

  const handleFilterChange = (key: string, val: string) => {
    setFilters(prev => ({ ...prev, [key]: val }))
    setOffset(0)
  }

  const handleRecalc = async (id: number) => {
    setRecalcId(id); setRecalcResult(null)
    try { const res = await apiPost('/audit/recalculate', { id }); setRecalcResult(res) }
    catch (e: any) { setError(e.message) }
    finally { setRecalcId(null) }
  }

  const handleStartEditNote = (row: any) => {
    setEditingNoteId(row.id)
    setNoteText(row.note || '')
  }

  const handleSaveNote = async (id: number) => {
    setSavingNote(true)
    try {
      await apiPatch(`/ban/${id}`, { note: noteText })
      setData(prev => prev.map(r => r.id === id ? { ...r, note: noteText } : r))
      setEditingNoteId(null)
    } catch (e: any) { setError(e.message) }
    finally { setSavingNote(false) }
  }

  const handleCancelEditNote = () => { setEditingNoteId(null); setNoteText('') }

  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(total / limit)

  const showCols = columns.filter(c => c.key !== 'ket_qua') // ket_qua is in same td as chenh_lech
  const colCount = showCols.length + 2 // + Ghi chú + Tác vụ

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Audit — So sánh CK</h1>
      <p style={pageSubtitle}>Đối chiếu CK đúng (cột AD) vs CK sai (cột AF) trong bảng Bán</p>

      {stats && (
        <div style={P.summaryGrid}>
          <div style={P.card(colors.primary)}>
            <p style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, margin: 0 }}>Tổng dòng Bán</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: colors.text, margin: '6px 0 0' }}>{stats.tong_so_dong}</p>
          </div>
          <div style={P.card(colors.success)}>
            <p style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, margin: 0 }}>Có CK</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: colors.text, margin: '6px 0 0' }}>{stats.co_ck}</p>
          </div>
          <div style={P.card(stats.sai_lech > 0 ? colors.danger : colors.success)}>
            <p style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', margin: 0 }}>Sai lệch</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: colors.text, margin: '6px 0 0' }}>{stats.sai_lech}</p>
          </div>
          <div style={P.card(stats.ty_le_sai > 5 ? colors.danger : colors.success)}>
            <p style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', margin: 0 }}>Tỷ lệ sai</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: colors.text, margin: '6px 0 0' }}>{stats.ty_le_sai}%</p>
          </div>
        </div>
      )}

      {stats && stats.top_khach_hang?.length > 0 && (
        <div style={section}>
          <h2 style={sectionTitle}>Top KH sai nhiều nhất</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={P.topTable}>
              <thead><tr>
                <th style={P.topTh}>Mã KH</th><th style={P.topTh}>Tên KH</th>
                <th style={P.topTh}>Số lần sai</th><th style={P.topTh}>TB chênh lệch</th>
              </tr></thead>
              <tbody>
                {stats.top_khach_hang.map((r: any) => (
                  <tr key={r.ma_kh} style={{ transition: 'background 80ms' }}>
                    <td style={P.topTd}>{r.ma_kh}</td><td style={P.topTd}>{r.khach}</td>
                    <td style={P.topTd}>{r.so_lan}</td><td style={P.topTd}>{r.tb_chenh_lech}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={section}>
        <h2 style={sectionTitle}>Chi tiết sai lệch</h2>

        <div style={P.formulaBox}>
          <div style={P.formulaLabel}>Cách tính CK đúng (ck_dung)</div>
          <div style={{ fontSize: 13, lineHeight: 1.8, marginTop: 4 }}>
            <div><b style={{color:colors.primary}}>Bước 1:</b> Nếu nhóm giá = "PREMIERDL…"</div>
            <div style={{paddingLeft:24}}>→ Mã hàng ME (không MEVE) + HK ∈ [DM, VIP, VVIP, DLVIP] → <b>12,04%</b></div>
            <div style={{paddingLeft:24}}>→ Mã hàng ME (không MEVE) + HK ∈ [PRI, DLND] → <b>9,26%</b></div>
            <div style={{paddingLeft:24}}>→ Còn lại (Z, không match) → <b>0%</b></div>
            <div style={{marginTop:6}}><b style={{color:colors.primary}}>Bước 2:</b> Nếu nhóm giá = "PREMIUM…"</div>
            <div style={{paddingLeft:24}}>→ Mã hàng ME/CHI + HK = PREMIUM → <b>9,26%</b></div>
            <div style={{paddingLeft:24}}>→ Mã hàng ME/CHI + HK ≠ PREMIUM → <b>7,4%</b></div>
            <div style={{paddingLeft:24}}>→ Còn lại (Z, không match) → <b>0%</b></div>
            <div style={{marginTop:6}}><b style={{color:colors.primary}}>Bước 3:</b> Nhóm giá khác → lookup OP1/OP2 từ bảng giá CK</div>
            <div style={{marginTop:6}}><span style={{color:colors.textMuted}}>Sau đó cộng thêm</span> CK vận chuyển (ck_vc) <span style={{color:colors.textMuted}}>vào kết quả</span></div>
          </div>
          <div style={{ ...P.formulaLabel, marginTop: 14 }}>Cách tính CK sai (ck_sai)</div>
          <div style={{ fontSize: 13, lineHeight: 1.8, marginTop: 4 }}>
            <div><b style={{color:colors.success}}>=</b> NẾU dso &gt; 0 THÌ <b>ROUND(tien_ck / dso × 100, 2)</b> KHÔNG THÌ <b>0</b></div>
            <div style={{color:colors.textMuted, marginTop:2}}>(Tỷ lệ chiết khấu thực tế từ dữ liệu bán hàng)</div>
          </div>
        </div>

        {error && <div style={{ ...cardStyle(colors.danger), marginTop: 12, padding: 12, color: colors.danger }}>{error}</div>}

        {loading ? <div style={spinner}>Đang tải...</div> : (
          <>
            <style>{`.audit-tbl tbody tr:hover{background:${colors.surfaceSecondary}} .audit-tbl tbody tr:last-child td{border-bottom:none}`}</style>
            <div style={{ overflowX: 'auto', marginTop: 12, background: colors.card, borderRadius: radius.lg, boxShadow: shadow.card, border: `1px solid ${colors.border}` }}>
              <table className="audit-tbl" style={{ borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    {columns.map((col, idx) => {
                      const w = getColWidth(col.key, col.label)
                      const isL = idx === columns.length - 1
                      return (
                      <th key={col.key} style={{ ...tableStyle.th, width: isL && !colWidths[col.key] ? undefined : w, position: 'relative', whiteSpace: 'nowrap', userSelect: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => setOpenFilter(openFilter === col.key ? null : col.key)}>
                          <span>{col.label}</span>
                          <span style={{ fontSize: 9, color: filters[col.key] ? colors.primary : colors.textMuted, opacity: 0.6 }}>▼</span>
                          {filters[col.key] && <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.primary, display: 'inline-block' }} />}
                        </div>
                        {openFilter === col.key && (
                          <FilterDropdown col={col} filter={filters[col.key] || ''} onChange={handleFilterChange} onClose={() => setOpenFilter(null)} />
                        )}
                        <div className="dg-rz" onMouseDown={(e) => startResize(col.key, e, col.label)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 10, zIndex: 10, cursor: 'col-resize' }} />
                      </th>
                    )})}
                    <th style={{ ...tableStyle.th, width: 100, textAlign: 'center', position: 'relative' }}>Tác vụ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr><td colSpan={colCount} style={{ textAlign: 'center', padding: 48, color: colors.textMuted }}>Không có dữ liệu</td></tr>
                  ) : data.map((row: any) => (
                    <tr key={row.id} style={{ background: row.sai_so ? colors.dangerLight : colors.successLight, transition: 'background 80ms' }}>
                      <td style={tableStyle.td}>{row.ngay}</td>
                      <td style={tableStyle.td}>{row.ma_kh}</td>
                      <td style={tableStyle.td}>{row.khach}</td>
                      <td style={tableStyle.td}>{row.ma_hang}</td>
                      <td style={{ ...tableStyle.td, textAlign: 'right' }}>{formatNum(row.ck_dung)}</td>
                      <td style={{ ...tableStyle.td, textAlign: 'right' }}>{formatNum(row.ck_sai)}</td>
                      <td style={{ ...tableStyle.td, fontWeight: 600, color: row.sai_so ? colors.danger : colors.success, textAlign: 'right' }}>
                        {row.chenh_lech != null ? `${row.chenh_lech > 0 ? '+' : ''}${formatNum(row.chenh_lech)}` : ''}
                      </td>
                      <td style={tableStyle.td}>
                        <span style={badge(row.sai_so ? colors.dangerLight : colors.successLight, row.sai_so ? colors.danger : colors.success)}>
                          {row.sai_so ? 'SAI' : 'ĐÚNG'}
                        </span>
                      </td>
                      <td style={tableStyle.td}>
                        {editingNoteId === row.id ? (
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <input
                              style={{ ...input, width: 150, padding: '4px 8px', fontSize: 12 }}
                              value={noteText}
                              onChange={e => setNoteText(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveNote(row.id); if (e.key === 'Escape') handleCancelEditNote() }}
                              autoFocus
                            />
                            <button style={{ ...btn(colors.success, '#fff', 'sm'), padding: '2px 8px' }} onClick={() => handleSaveNote(row.id)} disabled={savingNote}>Lưu</button>
                          </div>
                        ) : (
                          <div
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, minWidth: 100, color: row.note ? colors.text : colors.textMuted }}
                            onClick={() => handleStartEditNote(row)}
                            title="Nhấn để thêm ghi chú"
                          >
                            <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.note || '—'}</span>
                            <span style={{ fontSize: 11, opacity: 0.4, flexShrink: 0 }}>✎</span>
                          </div>
                        )}
                      </td>
                      <td style={{ ...tableStyle.td, textAlign: 'center' }}>
                        <button
                          style={{ ...btn(colors.info, '#fff', 'sm') }}
                          onClick={() => handleRecalc(row.id)}
                          disabled={recalcId === row.id}
                        >{recalcId === row.id ? '...' : 'Tính lại'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {recalcResult && (
              <div style={P.recalcBox}>
                <strong style={{ color: colors.primary }}>Kết quả tính lại dòng #{recalcResult.id}</strong>
                <div style={P.detailGrid}>
                  <div><div style={P.label}>CK cũ</div><div style={P.value}>{recalcResult.old_ck_dung}</div></div>
                  <div><div style={P.label}>CK mới</div><div style={P.value}>{recalcResult.new_ck_dung}</div></div>
                  <div><div style={P.label}>CK sai (nhập)</div><div style={P.value}>{recalcResult.ck_sai}</div></div>
                  <div><div style={P.label}>Nhóm SP</div><div style={P.value}>{recalcResult.nhomSP}</div></div>
                  <div><div style={P.label}>Loại KH</div><div style={P.value}>{recalcResult.loaiKH}</div></div>
                  <div><div style={P.label}>Loại OP</div><div style={P.value}>{recalcResult.loaiOP}</div></div>
                  <div><div style={P.label}>Tổng CK</div><div style={{ ...P.value, color: colors.primary }}>{recalcResult.ckTong}</div></div>
                </div>
                <button style={{ ...btn(colors.textMuted, '#fff', 'sm'), marginTop: 12 }} onClick={() => setRecalcResult(null)}>Đóng</button>
              </div>
            )}

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginTop: 16, fontSize: 13, color: colors.textMuted,
              background: colors.card, padding: '12px 16px', borderRadius: radius.lg, boxShadow: shadow.card,
              border: `1px solid ${colors.border}`,
            } as React.CSSProperties}>
              <span>Tổng: <strong>{total}</strong> bản ghi</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button style={pgn.btn} disabled={currentPage <= 1} onClick={() => setOffset(offset - limit)}>← Trước</button>
                <span>Trang <strong>{currentPage}</strong> / {totalPages || 1}</span>
                <button style={pgn.btn} disabled={currentPage >= totalPages} onClick={() => setOffset(offset + limit)}>Sau →</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}