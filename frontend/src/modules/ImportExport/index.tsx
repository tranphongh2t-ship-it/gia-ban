import { useState, useEffect, useRef } from 'react'
import { apiGet, apiPost } from '../../lib/api'
import { colors, shadow, radius, btn, input, select, pageContainer, pageTitle, pageSubtitle, section, sectionTitle, spinner, badge } from '../../theme'

const P = {
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 20 } as React.CSSProperties,
  field: { marginBottom: 14 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: colors.textMuted, marginBottom: 4 },
  previewTable: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 12, background: colors.card, borderRadius: radius.md, overflow: 'hidden', boxShadow: shadow.card, marginTop: 12 },
  cellOk: { color: colors.success, fontWeight: 600 },
  cellChanged: { color: colors.warning, fontWeight: 600 },
  cellNew: { color: colors.primary, fontWeight: 600 },
  cellError: { color: colors.danger, fontWeight: 600 },
  statusBadge: (s: string): [React.CSSProperties, string] => {
    const m: Record<string, { bg: string; color: string; label: string }> = {
      new: { bg: colors.primaryLight, color: colors.primary, label: 'MỚI' },
      unchanged: { bg: colors.successLight, color: colors.successDark, label: 'GIỮ NGUYÊN' },
      changed: { bg: colors.warningLight, color: colors.warningDark, label: 'ĐÃ SỬA' },
      error: { bg: colors.dangerLight, color: colors.dangerDark, label: 'LỖI' },
    }
    const b = m[s] || m.error
    return [{ ...badge(b.bg, b.color), padding: '2px 10px', fontSize: 10 }, b.label]
  },
  groupLabel: { fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5, padding: '4px 8px', marginTop: 4 },
  colCheckbox: { display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', fontSize: 12, color: colors.textSecondary, cursor: 'pointer' },
}

interface TableInfo {
  key: string; label: string; group: string
  columns: string[]; allColumns: string[]; keyFields: string[]
}

export default function ImportExportPage() {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet('/export/tables').then(setTables).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // === Import state ===
  const fileRef = useRef<HTMLInputElement>(null)
  const [importTable, setImportTable] = useState('')
  const [preview, setPreview] = useState<any>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmResult, setConfirmResult] = useState<any>(null)
  const [importCols, setImportCols] = useState<string[]>([])

  const validImportTables = tables.filter(t => t.keyFields.some(k => k !== 'id'))

  useEffect(() => {
    if (!importTable && validImportTables.length > 0) {
      setImportTable(validImportTables[0].key)
    }
  }, [validImportTables, importTable])

  useEffect(() => {
    const t = tables.find(t => t.key === importTable)
    setImportCols(t?.columns || [])
  }, [importTable, tables])

  const handlePreview = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) { setImportError('Vui lòng chọn file'); return }
    setImportLoading(true); setImportError(null); setPreview(null); setConfirmResult(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('table', importTable)
      const res = await fetch('/api/import/preview', { method: 'POST', body: form })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Preview failed') }
      setPreview(await res.json())
    } catch (e: any) { setImportError(e.message) }
    finally { setImportLoading(false) }
  }

  const handleConfirm = async () => {
    if (!preview) return
    setConfirmLoading(true); setImportError(null)
    try {
      const res = await apiPost('/import/confirm', {
        table: importTable, rows: preview.rows, nhan_vien: 'admin',
      })
      setConfirmResult(res)
      setPreview(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (e: any) { setImportError(e.message) }
    finally { setConfirmLoading(false) }
  }

  const downloadTemplate = async () => {
    try {
      const res = await fetch(`/api/export/template/${importTable}`)
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Download failed') }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = `mau_import_${importTable}.xlsx`
      a.click(); URL.revokeObjectURL(url)
    } catch (e: any) { setImportError(e.message) }
  }

  // === Export state ===
  const [exportTableKey, setExportTableKey] = useState('')
  const [selectedCols, setSelectedCols] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const exportTable = tables.find(t => t.key === exportTableKey)

  useEffect(() => {
    if (!exportTableKey && tables.length > 0) setExportTableKey(tables[0].key)
  }, [tables, exportTableKey])

  useEffect(() => {
    if (exportTable) {
      setSelectedCols([...exportTable.columns])
      setSelectAll(true)
    }
  }, [exportTableKey])

  const toggleCol = (col: string) => {
    setSelectedCols(prev => {
      const next = prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
      setSelectAll(next.length === (exportTable?.columns.length || 0))
      return next
    })
  }

  const handleExport = async (format: 'excel' | 'json') => {
    if (!exportTable || selectedCols.length === 0) { setExportError('Chọn ít nhất 1 cột'); return }
    setExportLoading(true); setExportError(null)
    try {
      const params = new URLSearchParams()
      if (!selectAll) params.set('columns', selectedCols.join(','))
      const qs = params.toString()
      const res = await fetch(`/api/export/${format}/${exportTableKey}${qs ? '?' + qs : ''}`)
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Export failed') }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${exportTable.label}_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'json'}`
      a.click(); URL.revokeObjectURL(url)
    } catch (e: any) { setExportError(e.message) }
    finally { setExportLoading(false) }
  }

  const groupedTables = tables.reduce((acc, t) => {
    const g = t.group || 'Khác'
    if (!acc[g]) acc[g] = []
    acc[g].push(t)
    return acc
  }, {} as Record<string, TableInfo[]>)

  const summary = preview?.summary
  const hasErrors = preview?.rows?.some((r: any) => r.status === 'error')
  const hasChanges = preview && (summary?.new > 0 || summary?.changed > 0)

  if (loading) return <div style={pageContainer}><div style={spinner}>Đang tải...</div></div>

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Import / Export</h1>
      <p style={pageSubtitle}>Nhập và xuất dữ liệu tất cả bảng — Excel (.xlsx) / JSON</p>

      <div style={P.grid}>
        {/* ===== IMPORT ===== */}
        <div style={section}>
          <h2 style={sectionTitle}>Import dữ liệu</h2>

          <div style={P.field}>
            <label style={P.label}>Bảng đích</label>
            <select style={select} value={importTable} onChange={e => { setImportTable(e.target.value); setPreview(null); setConfirmResult(null) }}>
              {Object.entries(groupedTables).map(([group, tbls]) => (
                <optgroup key={group} label={group}>
                  {tbls.filter(t => t.keyFields.some(k => k !== 'id')).map(t => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div style={P.field}>
            <label style={P.label}>File Excel (.xlsx)</label>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ fontSize: 14, marginBottom: 8 }} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btn(colors.info, '#fff')} onClick={downloadTemplate}>Tải mẫu Excel</button>
            <button style={btn(colors.primary)} onClick={handlePreview} disabled={importLoading}>
              {importLoading ? 'Đang phân tích...' : 'Xem trước'}
            </button>
          </div>

          {importError && (
            <div style={{ padding: 14, background: colors.dangerLight, color: colors.danger, borderRadius: radius.md, marginTop: 12, border: `1px solid ${colors.danger}22`, fontSize: 14 }}>
              {importError}
            </div>
          )}

          {preview && (
            <div style={{ marginTop: 16 }}>
              {preview.unmatchedColumns?.length > 0 && (
                <div style={{ padding: 12, background: colors.warningLight, borderRadius: radius.md, marginBottom: 12, border: `1px solid ${colors.warning}33` }}>
                  <strong style={{ color: colors.warningDark, fontSize: 13 }}>⚠ Thiếu cột bắt buộc:</strong>
                  <ul style={{ margin: '6px 0 0 16px', fontSize: 13, color: colors.warningDark }}>
                    {preview.unmatchedColumns.map((c: string) => <li key={c}>{c}</li>)}
                  </ul>
                </div>
              )}
              {preview.unknownHeaders?.length > 0 && (
                <div style={{ padding: 12, background: colors.primaryLight, borderRadius: radius.md, marginBottom: 12, border: `1px solid ${colors.primary}33` }}>
                  <strong style={{ color: colors.primaryDark, fontSize: 13 }}>ℹ Cột không xác định (sẽ bỏ qua):</strong>
                  <ul style={{ margin: '6px 0 0 16px', fontSize: 13, color: colors.primaryDark }}>
                    {preview.unknownHeaders.map((h: string) => <li key={h}>{h}</li>)}
                  </ul>
                </div>
              )}

              {summary && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: 'Dòng mới', value: summary.new, color: colors.primary },
                    { label: 'Giữ nguyên', value: summary.unchanged, color: colors.success },
                    { label: 'Đã sửa', value: summary.changed, color: colors.warning },
                    { label: 'Lỗi', value: summary.errors, color: colors.danger },
                  ].map(s => (
                    <div key={s.label} style={{ background: colors.card, borderRadius: radius.sm, padding: '8px 12', textAlign: 'center', border: `1px solid ${colors.border}` }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: colors.textMuted }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {preview.rows?.length > 0 && (
                <div style={{ maxHeight: 320, overflowY: 'auto', ...P.previewTable }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ position: 'sticky', top: 0, background: colors.surfaceSecondary }}>
                        <th style={{ borderBottom: `1px solid ${colors.tableBorder}`, padding: '6px 8px', textAlign: 'left', fontSize: 11, color: colors.textMuted }}>Dòng</th>
                        <th style={{ borderBottom: `1px solid ${colors.tableBorder}`, padding: '6px 8px', textAlign: 'left', fontSize: 11, color: colors.textMuted }}>Trạng thái</th>
                        <th style={{ borderBottom: `1px solid ${colors.tableBorder}`, padding: '6px 8px', textAlign: 'left', fontSize: 11, color: colors.textMuted }}>Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row: any) => {
                        const [sty, label] = P.statusBadge(row.status)
                        return (
                          <tr key={row.index} style={{ background: row.status === 'error' ? colors.dangerLight : row.status === 'changed' ? colors.warningLight : row.status === 'new' ? colors.primaryLight : 'transparent' }}>
                            <td style={{ borderBottom: `1px solid ${colors.tableBorder}`, padding: '6px 8px', fontWeight: 500 }}>#{row.index}</td>
                            <td style={{ borderBottom: `1px solid ${colors.tableBorder}`, padding: '6px 8px' }}><span style={sty as React.CSSProperties}>{label}</span></td>
                            <td style={{ borderBottom: `1px solid ${colors.tableBorder}`, padding: '6px 8px', fontSize: 11 }}>
                              {row.status === 'error' && <span style={{ color: colors.danger }}>{row.errors?.join('; ')}</span>}
                              {row.status === 'new' && <span style={{ color: colors.primary }}>Sẽ thêm mới</span>}
                              {row.status === 'unchanged' && <span style={{ color: colors.success }}>Giữ nguyên</span>}
                              {row.status === 'changed' && row.changes && (
                                <span style={{ color: colors.warningDark }}>
                                  Sửa: {Object.entries(row.changes).map(([col, v]: any) =>
                                    `${col}: ${v.old ?? '—'} → ${v.new ?? '—'}`
                                  ).join(', ')}
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {hasChanges && !hasErrors && (
                <button style={{ ...btn(colors.success), marginTop: 12 }} onClick={handleConfirm} disabled={confirmLoading}>
                  {confirmLoading ? 'Đang import...' : `Xác nhận import (${summary.new + summary.changed} dòng)`}
                </button>
              )}
              {hasErrors && (
                <div style={{ marginTop: 12, padding: 12, background: colors.dangerLight, borderRadius: radius.md, border: `1px solid ${colors.danger}33`, fontSize: 13, color: colors.danger }}>
                  Có dòng lỗi — vui lòng sửa file và import lại
                </div>
              )}
            </div>
          )}

          {confirmResult && (
            <div style={{ padding: 16, background: colors.successLight, borderRadius: radius.md, marginTop: 12, border: `1px solid ${colors.success}44` }}>
              <strong>Import hoàn tất!</strong>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13 }}>
                <span>Thêm: <strong>{confirmResult.results.inserted}</strong></span>
                <span>Cập nhật: <strong>{confirmResult.results.updated}</strong></span>
                <span>Bỏ qua: <strong>{confirmResult.results.skipped}</strong></span>
              </div>
              <button style={{ ...btn(colors.textMuted, '#fff'), marginTop: 8 }} onClick={() => setConfirmResult(null)}>Đóng</button>
            </div>
          )}
        </div>

        {/* ===== EXPORT ===== */}
        <div style={section}>
          <h2 style={sectionTitle}>Export dữ liệu</h2>

          <div style={P.field}>
            <label style={P.label}>Bảng</label>
            <select style={select} value={exportTableKey} onChange={e => { setExportTableKey(e.target.value); setExportError(null) }}>
              {Object.entries(groupedTables).map(([group, tbls]) => (
                <optgroup key={group} label={group}>
                  {tbls.map(t => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {exportTable && (
            <div style={P.field}>
              <label style={P.label}>Chọn cột xuất</label>
              <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="checkbox" checked={selectAll} onChange={() => {
                    setSelectAll(!selectAll)
                    if (selectAll) setSelectedCols([])
                    else setSelectedCols([...exportTable.columns])
                  }} /> Tất cả
                </label>
                <span style={{ fontSize: 11, color: colors.textDisabled }}>{selectedCols.length}/{exportTable.columns.length} cột</span>
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto', border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: '6px 10px', background: colors.surfaceSecondary }}>
                {exportTable.allColumns.filter(c => !['id', 'created_at', 'updated_at', 'updated_by'].includes(c)).map(col => (
                  <label key={col} style={P.colCheckbox}>
                    <input type="checkbox" checked={selectedCols.includes(col)} onChange={() => toggleCol(col)} />
                    {col}
                  </label>
                ))}
                {exportTable.allColumns.filter(c => ['id', 'created_at', 'updated_at', 'updated_by'].includes(c)).length > 0 && (
                  <details style={{ marginTop: 4 }}>
                    <summary style={{ fontSize: 11, color: colors.textDisabled, cursor: 'pointer' }}>Cột hệ thống</summary>
                    {exportTable.allColumns.filter(c => ['id', 'created_at', 'updated_at', 'updated_by'].includes(c)).map(col => (
                      <label key={col} style={P.colCheckbox}>
                        <input type="checkbox" checked={selectedCols.includes(col)} onChange={() => toggleCol(col)} />
                        {col}
                      </label>
                    ))}
                  </details>
                )}
              </div>
            </div>
          )}

          {exportError && (
            <div style={{ padding: 12, background: colors.dangerLight, color: colors.danger, borderRadius: radius.md, marginBottom: 12, border: `1px solid ${colors.danger}22`, fontSize: 13 }}>
              {exportError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button style={btn(colors.primary)} onClick={() => handleExport('excel')} disabled={exportLoading || selectedCols.length === 0}>
              {exportLoading ? '...' : 'Excel (.xlsx)'}
            </button>
            <button style={btn(colors.info)} onClick={() => handleExport('json')} disabled={exportLoading || selectedCols.length === 0}>
              {exportLoading ? '...' : 'JSON'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}