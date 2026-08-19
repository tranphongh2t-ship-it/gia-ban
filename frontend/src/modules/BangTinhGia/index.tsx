import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { apiGet, apiPost, apiPatch, apiDelete, apiPut } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useLock } from '../../lib/lock'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import { colors, shadow, radius, input, card as cardStyle, pageContainer, pageTitle, btn, spinner } from '../../theme'
import { formatNum } from '../../lib/format'
import { sheetConfigs } from './configs'

const inputStyle: React.CSSProperties = { ...input, width: '100%', boxSizing: 'border-box' }
const thCell: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }
const tdCell: React.CSSProperties = { padding: '8px 12px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text, whiteSpace: 'nowrap' }

const COL_STORAGE = (key: string) => `btg_${key.replace(/[^a-zA-Z0-9_]/g, '_')}_colw`
const DEFAULT_WIDTH = (label: string): number => Math.max(label.length * 8 + 44, 70)

export default function BangTinhGiaPage() {
  const { slug } = useParams()
  const config = sheetConfigs.find(c => c.slug === slug)
  const { hasPermission } = useAuth()
  const { locked } = useLock()
  const canEdit = hasPermission('feature:edit-data')
  const canManualEdit = canEdit && !locked
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 50

  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<any | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formHist, setFormHist] = useState<any[] | null>(null)

  const [confirmDelete, setConfirmDelete] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [computing, setComputing] = useState(false)
  const [computeResult, setComputeResult] = useState<{ ok: boolean; text: string } | null>(null)

  const [histOpen, setHistOpen] = useState(false)
  const [histLoading, setHistLoading] = useState(false)
  const [histError, setHistError] = useState<string | null>(null)
  const [histRow, setHistRow] = useState<any | null>(null)
  const [histData, setHistData] = useState<any[]>([])

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem(COL_STORAGE(config?.apiPath || '')) || '{}') } catch { return {} }
  })
  const dragRef = useRef<{ key: string; startX: number; startW: number } | null>(null)
  const saveRef = useRef<Record<string, number>>({})
  const userId: number | null = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('auth_user') || 'null')
      return u?.id ? Number(u.id) : null
    } catch { return null }
  })()

  const isAdmin: boolean = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('auth_user') || 'null')
      return !!u?.is_admin
    } catch { return false }
  })()

  const saveAsDefault = async () => {
    try {
      await apiPut(`/user-prefs/cols`, { user_id: userId, page: '/gia-chuan/' + config?.apiPath, data: colWidths, is_default: true })
      alert('Đã lưu co dãn cột làm mặc định toàn cục.')
    } catch (e: any) { alert(`Lỗi: ${e.message}`) }
  }

  const getColWidth = (key: string, label: string): string => {
    if (colWidths[key]) return colWidths[key] + 'px'
    return DEFAULT_WIDTH(label) + 'px'
  }

  const startColResize = (key: string, label: string, e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = colWidths[key] || DEFAULT_WIDTH(label)
    dragRef.current = { key, startX, startW }
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const diff = ev.clientX - dragRef.current.startX
      setColWidths(prev => ({ ...prev, [dragRef.current!.key]: Math.max(50, dragRef.current!.startW + diff) }))
    }
    const onUp = () => {
      dragRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  useEffect(() => {
    if (!config) return
    localStorage.setItem(COL_STORAGE(config.apiPath), JSON.stringify(colWidths))
  }, [colWidths, config])

  useEffect(() => {
    if (!config || !userId) return
    let active = true
    ;(async () => {
      try {
        const res = await apiGet(`/user-prefs/cols?user_id=${userId}&page=${encodeURIComponent('/gia-chuan/' + config.apiPath)}`)
        if (active) setColWidths({ ...(res.default || {}), ...(res.data || {}) })
      } catch {}
    })()
    return () => { active = false }
  }, [config, userId])

  useEffect(() => {
    if (!config || !userId) return
    const timer = setTimeout(() => {
      if (JSON.stringify(saveRef.current) === JSON.stringify(colWidths)) return
      saveRef.current = colWidths
      apiPut(`/user-prefs/cols`, { user_id: userId, page: '/gia-chuan/' + config.apiPath, data: colWidths }).catch(() => {})
    }, 800)
    return () => clearTimeout(timer)
  }, [colWidths, userId, config])

  const handleCompute = async () => {
    if (!config?.compute) return
    setComputing(true); setComputeResult(null)
    const lines: string[] = []
    try {
      if (config.compute.tinhToan) {
        const r = await apiPost(`/gia-chuan/${config.compute.tinhToan}`, {})
        lines.push(`Tính toán: ${r.total != null ? `${r.total} dòng` : 'OK'}` + (r.synced ? ` • ${r.synced} mã đồng bộ MISA` : ''))
      }
      if (config.compute.autoAssign) {
        const r = await apiPost(`/gia-chuan/${config.compute.autoAssign}`, {})
        const n = r.assigned ?? r.generated ?? 0
        lines.push(`Gán mã MISA: ${n} mã` + (r.skipped ? `, ${r.skipped} bỏ qua` : ''))
      }
      if (config.compute.autoGenerate) {
        const r = await apiPost(`/gia-chuan/${config.compute.autoGenerate}`, {})
        const n = r.assigned ?? r.generated ?? 0
        lines.push(`Sinh mã mới: ${n} dòng` + (r.conflict ? `, ${r.conflict} trùng` : ''))
      }
      setComputeResult({ ok: true, text: lines.join(' · ') })
      fetchData()
    } catch (e: any) {
      setComputeResult({ ok: false, text: `Lỗi: ${e.message}` })
    } finally {
      setComputing(false)
    }
  }

  const fetchData = useCallback(async () => {
    if (!config) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', String(limit))
      params.set('offset', String((page - 1) * limit))
      if (search) params.set('search', search)
      const res = await apiGet(`/gia-chuan/${config.apiPath}?${params}`)
      setData(res.data || [])
      setTotal(res.total || 0)
    } catch { setData([]); setTotal(0) }
    finally { setLoading(false) }
  }, [config, search, page])

  useEffect(() => { fetchData() }, [fetchData])

  if (!config) {
    return <div style={pageContainer}><p>Không tìm thấy bảng giá</p></div>
  }

  const openCreate = () => {
    const initial: any = { stt: data.length + 1 }
    config.columns.filter(c => c.key !== 'stt' && c.key !== 'id' && !c.readOnly).forEach(c => { initial[c.key] = '' })
    setEditItem(null); setFormData(initial); setFormError(null); setModalOpen(true)
  }

  const openEdit = (item: any) => {
    const form: any = {}
    config.columns.filter(c => !c.readOnly).forEach(c => { form[c.key] = item[c.key] ?? '' })
    setEditItem(item); setFormData(form); setFormError(null); setFormHist(null); setModalOpen(true)
    apiGet(`/gia-chuan/lich-su?path=${encodeURIComponent(config.apiPath)}&ref_id=${item.id}`)
      .then(res => setFormHist(res.data || []))
      .catch(() => setFormHist([]))
  }

  const handleSave = async () => {
    const payload: any = {}
    for (const c of config.columns) {
      if (c.readOnly) continue
      if (formData[c.key] !== '') payload[c.key] = c.type === 'number' ? Number(formData[c.key]) : formData[c.key]
    }
    payload.updated_by = (() => {
      try { const u = JSON.parse(localStorage.getItem('auth_user') || 'null'); return u?.ten || null } catch { return null }
    })()
    if (Object.keys(payload).filter(k => k !== 'updated_by').length === 0) return
    setSaving(true); setFormError(null)
    try {
      if (editItem) { await apiPatch(`/gia-chuan/${config.apiPath}/${editItem.id}`, payload) }
      else { await apiPost(`/gia-chuan/${config.apiPath}`, payload) }
      setModalOpen(false); fetchData()
    } catch (e: any) { setFormError(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await apiDelete(`/gia-chuan/${config.apiPath}/${confirmDelete.id}`)
      setConfirmDelete(null); fetchData()
    } catch {}
    finally { setDeleting(false) }
  }

  const colLabel = (key: string) => config.columns.find(c => c.key === key)?.label || key

  const openHistory = async (row: any) => {
    setHistRow(row); setHistOpen(true); setHistLoading(true); setHistError(null); setHistData([])
    try {
      const res = await apiGet(`/gia-chuan/lich-su?path=${encodeURIComponent(config.apiPath)}&ref_id=${row.id}`)
      setHistData(res.data || [])
    } catch (e: any) { setHistError(e.message) }
    finally { setHistLoading(false) }
  }

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Bảng Tính Giá - {config.label}</h1>

      {locked && (
        <div style={{ padding: '10px 14px', background: colors.dangerLight, color: colors.danger, borderRadius: radius.md, marginBottom: 16, border: `1px solid ${colors.danger}22`, fontSize: 13, fontWeight: 600 }}>
          🔒 Bảng Tính Giá đang bị KHÓA — chỉnh sửa tay (Thêm/Sửa/Xoá, gán mã) đã bị chặn. Nút "Tính toán mã gốc" và luồng tự động vẫn hoạt động.
        </div>
      )}

      <div style={{ background: colors.card, borderRadius: radius.lg, padding: 20, border: `1px solid ${colors.border}`, boxShadow: shadow.card, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ minWidth: 250, flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Tìm kiếm (quy cách)</label>
            <input style={inputStyle} placeholder="VD: 9mm, 12mm..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <button style={{ ...btn(colors.primary, '#fff'), fontWeight: 600 }} onClick={fetchData}>Tra cứu</button>
          {canEdit && config.compute && (
            <button style={{ ...btn(colors.success, '#fff'), fontWeight: 600 }} onClick={handleCompute} disabled={computing}>{computing ? 'Đang tính...' : '⚡ Tính toán mã gốc'}</button>
          )}
          {canManualEdit && <button style={{ ...btn(colors.primary, '#fff'), fontWeight: 600 }} onClick={openCreate}>+ Thêm</button>}
          {isAdmin && (
            <button style={{ ...btn(colors.surfaceSecondary, colors.textSecondary), fontWeight: 500 }} onClick={saveAsDefault}>🎯 Lưu mặc định</button>
          )}
        </div>
      </div>

      {computeResult && (
        <div style={{ padding: '10px 14px', background: computeResult.ok ? colors.successLight : colors.dangerLight, color: computeResult.ok ? colors.successDark : colors.danger, borderRadius: radius.md, marginBottom: 16, border: `1px solid ${computeResult.ok ? colors.success : colors.danger}22`, fontSize: 13 }}>
          {computeResult.text}
        </div>
      )}

      {loading ? <div style={spinner}>Đang tải...</div> : (
        data.length > 0 ? (
          <div style={{ background: colors.card, borderRadius: radius.lg, overflow: 'hidden', border: `1px solid ${colors.border}`, boxShadow: shadow.card }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
                <thead>
                  <tr style={{ background: colors.surfaceSecondary }}>
                    {config.columns.map(c => (
                      <th key={c.key} style={{ padding: '10px 14px', textAlign: c.type === 'number' ? 'right' : 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap', width: getColWidth(c.key, c.label), position: 'relative', userSelect: 'none' }}>
                        {c.label}
                        <div onMouseDown={e => startColResize(c.key, c.label, e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 10, zIndex: 10, cursor: 'col-resize' }} />
                      </th>
                    ))}
                    <th style={{ padding: '10px 14px', textAlign: 'center', borderBottom: `1px solid ${colors.border}`, width: canManualEdit ? 90 : 60 }}>Tác vụ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr key={row.id || i} style={{ background: i % 2 === 0 ? colors.card : colors.surfaceSecondary }}>
                      {config.columns.map(c => (
                        <td key={c.key} style={{ padding: '8px 14px', textAlign: c.type === 'number' ? 'right' : 'left', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text, fontWeight: c.type === 'number' ? 600 : 400 }}>
                          {c.type === 'number' ? (row[c.key] != null ? formatNum(row[c.key]) : '') : (row[c.key] ?? '')}
                        </td>
                      ))}
                      <td style={{ padding: '8px 14px', textAlign: 'center', borderBottom: `1px solid ${colors.borderLight}` }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button style={{ height: 26, padding: '0 8px', borderRadius: radius.sm, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: colors.infoLight, color: colors.infoDark }} onClick={() => openHistory(row)}>Lịch sử</button>
                          {canManualEdit && (
                            <>
                              <button style={{ height: 26, padding: '0 8px', borderRadius: radius.sm, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: colors.primaryLight, color: colors.primaryDark }} onClick={() => openEdit(row)}>Sửa</button>
                              <button style={{ height: 26, padding: '0 8px', borderRadius: radius.sm, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: colors.dangerLight, color: colors.dangerDark }} onClick={() => setConfirmDelete(row)}>Xoá</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '10px 14px', fontSize: 12, color: colors.textMuted, borderTop: `1px solid ${colors.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{total} kết quả</span>
              {total > limit && (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <button disabled={page <= 1} style={{ height: 26, padding: '0 8px', borderRadius: radius.sm, border: `1px solid ${colors.border}`, cursor: page <= 1 ? 'default' : 'pointer', fontSize: 11, fontWeight: 500, background: page <= 1 ? colors.surfaceSecondary : colors.card, color: page <= 1 ? colors.textMuted : colors.text }} onClick={() => setPage(p => Math.max(1, p - 1))}>Trước</button>
                  <span style={{ padding: '0 8px' }}>Trang {page} / {Math.ceil(total / limit)}</span>
                  <button disabled={page >= Math.ceil(total / limit)} style={{ height: 26, padding: '0 8px', borderRadius: radius.sm, border: `1px solid ${colors.border}`, cursor: page >= Math.ceil(total / limit) ? 'default' : 'pointer', fontSize: 11, fontWeight: 500, background: page >= Math.ceil(total / limit) ? colors.surfaceSecondary : colors.card, color: page >= Math.ceil(total / limit) ? colors.textMuted : colors.text }} onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}>Sau</button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted, background: colors.card, borderRadius: radius.lg, border: `1px solid ${colors.border}`, boxShadow: shadow.card }}>
            Chưa có dữ liệu. Nhấn "Thêm" để nhập hoặc import dữ liệu từ Excel.
          </div>
        )
      )}

      <Modal open={modalOpen} title={editItem ? `Sửa - ${config.label}` : `Thêm - ${config.label}`} onClose={() => setModalOpen(false)} wide>
        {formError && <div style={{ padding: 14, background: colors.dangerLight, color: colors.danger, borderRadius: radius.md, marginBottom: 16, border: `1px solid ${colors.danger}22` }}>{formError}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px 16px' }}>
          {config.columns.filter(c => c.key !== 'id' && !c.readOnly).map(c => (
            <div key={c.key}>
              <label style={{ display: 'block', marginBottom: 5, fontSize: 12, fontWeight: 500, color: colors.textSecondary }}>{c.label}</label>
              {c.type === 'number' ? (
                <input style={{ ...input, width: '100%', boxSizing: 'border-box' }} type="number" value={formData[c.key] ?? ''} onChange={e => setFormData(p => ({ ...p, [c.key]: Number(e.target.value) }))} />
              ) : (
                <input style={{ ...input, width: '100%', boxSizing: 'border-box' }} value={formData[c.key] ?? ''} onChange={e => setFormData(p => ({ ...p, [c.key]: e.target.value }))} />
              )}
            </div>
          ))}
        </div>
        {editItem && (
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${colors.borderLight}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' }}>Lịch sử giá</span>
              {formHist && <span style={{ fontSize: 12, color: colors.textMuted }}>{formHist.length} lần thay đổi</span>}
            </div>
            {formHist === null ? (
              <div style={{ fontSize: 13, color: colors.textMuted, padding: '6px 0' }}>Đang tải...</div>
            ) : formHist.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.textMuted, padding: '6px 0' }}>Chưa có lịch sử thay đổi giá.</div>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', maxHeight: 160, overflowY: 'auto' }}>
                {formHist.map((h, i) => (
                  <li key={h.id ?? i} style={{ padding: '5px 0', borderBottom: i < formHist.length - 1 ? `1px solid ${colors.borderLight}` : 'none', fontSize: 12.5, color: colors.text }}>
                    <strong>{colLabel(h.cot)}</strong> · {h.thang}: {formatNum(h.gia_cu ?? 0)} → {formatNum(h.gia_moi ?? 0)}{h.updated_by ? ` (${h.updated_by})` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 14, borderTop: `1px solid ${colors.borderLight}` }}>
          <button style={{ height: 32, padding: '0 12px', background: colors.card, color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: radius.sm, cursor: 'pointer', fontSize: 12.5, fontWeight: 500 }} onClick={() => setModalOpen(false)} disabled={saving}>Huỷ</button>
          <button style={{ height: 32, padding: '0 12px', background: colors.primary, color: '#fff', border: 'none', borderRadius: radius.sm, cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }} onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
        </div>
      </Modal>

      <Modal open={histOpen} title={`Lịch sử giá - ${config.label} (dòng #${histRow?.id ?? ''})`} onClose={() => setHistOpen(false)} wide>
        {histError && <div style={{ padding: 14, background: colors.dangerLight, color: colors.danger, borderRadius: radius.md, marginBottom: 16, border: `1px solid ${colors.danger}22` }}>{histError}</div>}
        {histLoading ? <div style={{ padding: 24, textAlign: 'center', color: colors.textMuted }}>Đang tải...</div> : (
          histData.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: colors.surfaceSecondary }}>
                    <th style={thCell}>Cột</th>
                    <th style={{ ...thCell, textAlign: 'right' }}>Giá cũ</th>
                    <th style={{ ...thCell, textAlign: 'right' }}>Giá mới</th>
                    <th style={thCell}>Tháng</th>
                    <th style={thCell}>Người sửa</th>
                    <th style={thCell}>Lúc</th>
                  </tr>
                </thead>
                <tbody>
                  {histData.map(h => (
                    <tr key={h.id} style={{ background: colors.card }}>
                      <td style={tdCell}>{colLabel(h.cot)}</td>
                      <td style={{ ...tdCell, textAlign: 'right', fontWeight: 500 }}>{h.gia_cu != null ? formatNum(h.gia_cu) : '—'}</td>
                      <td style={{ ...tdCell, textAlign: 'right', fontWeight: 600 }}>{h.gia_moi != null ? formatNum(h.gia_moi) : '—'}</td>
                      <td style={tdCell}>{h.thang}</td>
                      <td style={tdCell}>{h.updated_by || '—'}</td>
                      <td style={tdCell}>{h.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: 24, textAlign: 'center', color: colors.textMuted }}>Chưa có lịch sử thay đổi giá cho dòng này.</div>
          )
        )}
      </Modal>

      <ConfirmDialog open={confirmDelete !== null} message="Xác nhận xoá?" onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} loading={deleting} />
    </div>
  )
}
