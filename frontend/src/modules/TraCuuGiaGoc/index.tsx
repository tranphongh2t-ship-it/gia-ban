import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { apiGet, apiPost, apiPatch, apiDelete } from '../../lib/api'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import { colors, shadow, radius, input, card as cardStyle, pageContainer, pageTitle, btn, spinner } from '../../theme'
import { formatNum } from '../../lib/format'

interface ColumnDef {
  key: string; label: string; type?: 'number'; readOnly?: boolean
}
interface CategoryConfig {
  slug: string
  label: string
  fields: { key: string; label: string; type?: 'select'; options?: { value: string; label: string }[] }[]
  columns: ColumnDef[]
}

const commonFields = [
  { key: 'filter_ma_sp', label: 'Mã SP' },
  { key: 'filter_ten_sp', label: 'Tên SP' },
]

const categories: CategoryConfig[] = [
  {
    slug: 'veneer', label: 'Veneer',
    fields: [
      ...commonFields,
      { key: 'filter_loai', label: 'Loại', type: 'select', options: [
        { value: 'Mặt phủ khác', label: 'Mặt phủ khác' },
        { value: 'Veneer tự nhiên', label: 'Veneer tự nhiên' },
        { value: 'Veneer kỹ thuật', label: 'Veneer kỹ thuật' },
      ]},
      { key: 'filter_tier', label: 'Tier', type: 'select', options: [
        { value: 'PREMIUM', label: 'PREMIUM' },
        { value: 'BBG PREMIER', label: 'BBG PREMIER' },
      ]},
      { key: 'search', label: 'Tên' },
    ],
    columns: [
      { key: 'ma_sp', label: 'Mã SP' },
      { key: 'ma_ten_sp', label: 'Tên SP (MISA)' },
      { key: 'gia_goc', label: 'Giá gốc', type: 'number', readOnly: true },
      { key: 'loai', label: 'Loại' },
      { key: 'tier', label: 'Tier' },
      { key: 'ten', label: 'Tên' },
      { key: 'gia_1_mat', label: 'Giá 1 mặt', type: 'number' },
      { key: 'gia_2_mat', label: 'Giá 2 mặt', type: 'number' },
    ],
  },
  {
    slug: 'chi', label: 'Chỉ (Edge Banding)',
    fields: [
      ...commonFields,
      { key: 'search', label: 'Tên chỉ' },
      { key: 'filter_loai', label: 'Loại', type: 'select', options: [
        { value: 'Chỉ PVC', label: 'Chỉ PVC' },
        { value: 'Chỉ ABS/PVC', label: 'Chỉ ABS/PVC' },
        { value: 'Chỉ Acrylic NK', label: 'Chỉ Acrylic NK' },
        { value: 'Chỉ veneer', label: 'Chỉ veneer' },
      ]},
      { key: 'filter_quy_cach', label: 'Quy cách' },
    ],
    columns: [
      { key: 'ma_sp', label: 'Mã SP' },
      { key: 'ma_ten_sp', label: 'Tên SP (MISA)' },
      { key: 'gia_goc', label: 'Giá gốc', type: 'number', readOnly: true },
      { key: 'loai', label: 'Loại' },
      { key: 'ten', label: 'Tên' },
      { key: 'quy_cach', label: 'Quy cách' },
      { key: 'gia', label: 'Giá', type: 'number' },
      { key: 'don_vi', label: 'Đơn vị' },
    ],
  },
  {
    slug: 'keo-nong', label: 'Keo nóng',
    fields: [
      ...commonFields,
      { key: 'search', label: 'Mã keo' },
    ],
    columns: [
      { key: 'ma_sp', label: 'Mã SP' },
      { key: 'ma_ten_sp', label: 'Tên SP (MISA)' },
      { key: 'gia_goc', label: 'Giá gốc', type: 'number', readOnly: true },
      { key: 'ma', label: 'Mã' },
      { key: 'nhiet_do', label: 'Nhiệt độ' },
      { key: 'mau_sac', label: 'Màu sắc' },
      { key: 'don_gia_kg', label: 'Giá/kg', type: 'number' },
      { key: 'don_gia_bao25', label: 'Giá/bao 25kg', type: 'number' },
    ],
  },
  {
    slug: 'van-phu-acrylic', label: 'Ván phủ Acrylic',
    fields: [
      ...commonFields,
      { key: 'filter_series', label: 'Series', type: 'select', options: [
        { value: 'ULTRA', label: 'ULTRA' },
        { value: 'GLASS', label: 'GLASS' },
      ]},
      { key: 'filter_loai_cot', label: 'Loại cốt' },
    ],
    columns: [
      { key: 'ma_sp', label: 'Mã SP' },
      { key: 'ma_ten_sp', label: 'Tên SP (MISA)' },
      { key: 'gia_goc', label: 'Giá gốc', type: 'number', readOnly: true },
      { key: 'series', label: 'Series' },
      { key: 'phu', label: 'Phủ' },
      { key: 'loai_cot', label: 'Loại cốt' },
      { key: 'gia_don_sac', label: 'Đơn sắc', type: 'number' },
      { key: 'gia_anh_kim', label: 'Ánh kim', type: 'number' },
      { key: 'gia_van_go', label: 'Vân gỗ', type: 'number' },
    ],
  },
  {
    slug: 'van-phu-pvc', label: 'Ván phủ PVC',
    fields: [
      ...commonFields,
      { key: 'filter_loai_cot', label: 'Loại cốt' },
      { key: 'filter_do_day', label: 'Độ dày' },
    ],
    columns: [
      { key: 'ma_sp', label: 'Mã SP' },
      { key: 'ma_ten_sp', label: 'Tên SP (MISA)' },
      { key: 'gia_goc', label: 'Giá gốc', type: 'number', readOnly: true },
      { key: 'loai_cot', label: 'Loại cốt' },
      { key: 'do_day', label: 'Độ dày' },
      { key: 'pvc_uu_dai_1m', label: 'PVC ƯĐ 1m', type: 'number' },
      { key: 'pvc_uu_dai_2m', label: 'PVC ƯĐ 2m', type: 'number' },
      { key: 'pvc_standard_1m', label: 'PVC Std 1m', type: 'number' },
      { key: 'pvc_standard_2m', label: 'PVC Std 2m', type: 'number' },
      { key: 'pvc_premium_1m', label: 'PVC Prem 1m', type: 'number' },
      { key: 'pvc_premium_2m', label: 'PVC Prem 2m', type: 'number' },
      { key: 'petg_1m', label: 'PETG 1m', type: 'number' },
      { key: 'petg_2m', label: 'PETG 2m', type: 'number' },
    ],
  },
  {
    slug: 'nhua-phu-mau', label: 'Nhựa phủ màu',
    fields: [
      ...commonFields,
      { key: 'filter_loai_cot', label: 'Loại cốt' },
      { key: 'filter_do_day', label: 'Độ dày' },
    ],
    columns: [
      { key: 'ma_sp', label: 'Mã SP' },
      { key: 'ma_ten_sp', label: 'Tên SP (MISA)' },
      { key: 'gia_goc', label: 'Giá gốc', type: 'number', readOnly: true },
      { key: 'loai_cot', label: 'Loại cốt' },
      { key: 'do_day', label: 'Độ dày' },
      { key: 'nhom_sang_trung', label: 'Sáng + Trung', type: 'number' },
      { key: 'nhom_toi_don_sac', label: 'Tối + Đơn sắc', type: 'number' },
      { key: 'mau_106', label: 'Màu 106', type: 'number' },
    ],
  },
  {
    slug: 'nhua-laminate', label: 'Nhựa Laminate',
    fields: [
      ...commonFields,
      { key: 'filter_loai_cot', label: 'Loại cốt' },
      { key: 'filter_do_day', label: 'Độ dày' },
    ],
    columns: [
      { key: 'ma_sp', label: 'Mã SP' },
      { key: 'ma_ten_sp', label: 'Tên SP (MISA)' },
      { key: 'gia_goc', label: 'Giá gốc', type: 'number', readOnly: true },
      { key: 'loai_cot', label: 'Loại cốt' },
      { key: 'do_day', label: 'Độ dày' },
      { key: 'le1_backer', label: 'LE1+Backer', type: 'number' },
      { key: 'le2_backer', label: 'LE2+Backer', type: 'number' },
      { key: 'lp1_backer', label: 'LP1+Backer', type: 'number' },
      { key: 'le1_2mat', label: 'LE1 2 mặt', type: 'number' },
      { key: 'le2_2mat', label: 'LE2 2 mặt', type: 'number' },
      { key: 'lp1_2mat', label: 'LP1 2 mặt', type: 'number' },
    ],
  },
 
  {
    slug: 'mirror', label: 'Mirror/Siêu bóng gương',
    fields: [
      ...commonFields,
      { key: 'search', label: 'Tên' },
    ],
    columns: [
      { key: 'ma_sp', label: 'Mã SP' },
      { key: 'ma_ten_sp', label: 'Tên SP (MISA)' },
      { key: 'gia_goc', label: 'Giá gốc', type: 'number', readOnly: true },
      { key: 'loai', label: 'Loại' },
      { key: 'ten', label: 'Tên' },
      { key: 'gia', label: 'Giá', type: 'number' },
    ],
  },
]

const inputStyle: React.CSSProperties = { ...input, width: '100%', boxSizing: 'border-box' }

export default function TraCuuGiaGocPage() {
  const { slug } = useParams()
  const catIdx = Math.max(0, categories.findIndex(c => c.slug === slug))
  const cat = categories[catIdx]

  const [filterVals, setFilterVals] = useState<Record<string, string>>({})
  const [results, setResults] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  // Editing state
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<any | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [page, setPage] = useState(1)
  const limit = 50

  const [syncResult, setSyncResult] = useState<any | null>(null)

  const syncMissingCodes = async () => {
    setSyncResult({ loading: true })
    try {
      const res = await apiGet('/pricing/them-ma-thieu-8-nhom')
      setSyncResult({ ...res, loading: false })
    } catch (e: any) {
      setSyncResult({ status: 'error', error: e.message, loading: false })
    }
  }

  const doSyncInsert = async () => {
    setSyncResult((prev: any) => ({ ...prev, loading: true }))
    try {
      const res = await apiPost('/pricing/them-ma-thieu-8-nhom', { mode: 'insert' })
      setSyncResult({ status: 'done', ...res, loading: false })
    } catch (e: any) {
      setSyncResult({ status: 'error', error: e.message, loading: false })
    }
  }

  // Inline editing
  const [inlineEdit, setInlineEdit] = useState<{ rowId: number; colKey: string; value: any } | null>(null)
  const inlineRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

  const buildParams = useCallback(() => {
    const p = new URLSearchParams()
    p.set('limit', String(limit))
    p.set('offset', String((page - 1) * limit))
    for (const [k, v] of Object.entries(filterVals)) {
      if (v.trim()) p.set(k, v.trim())
    }
    return p
  }, [filterVals, page])

  const handleSearch = useCallback(async () => {
    setLoading(true)
    try {
      const p = buildParams()
      const res = await apiGet(`/bang-gia-new/${cat.slug}?${p}`)
      setResults(res.data || [])
      setTotal(res.total || 0)
    } catch (e: any) {
      setResults([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [cat.slug, buildParams])

  useEffect(() => { handleSearch() }, [cat.slug, filterVals])

  const updateFilter = (key: string, val: string) => {
    setFilterVals(prev => ({ ...prev, [key]: val }))
    setPage(1)
  }

  // Editing handlers
  const openCreate = () => {
    const initial: any = {}
    cat.columns.filter(c => !c.readOnly).forEach(c => { initial[c.key] = '' })
    setEditItem(null); setFormData(initial); setFormError(null); setModalOpen(true)
  }

  const openEdit = (item: any) => {
    const form: any = {}
    cat.columns.filter(c => !c.readOnly).forEach(c => { form[c.key] = item[c.key] ?? '' })
    setEditItem(item); setFormData(form); setFormError(null); setModalOpen(true)
  }

  const handleSave = async () => {
    const payload: any = {}
    for (const c of cat.columns.filter(c => !c.readOnly)) {
      if (formData[c.key] !== '') payload[c.key] = c.type === 'number' ? Number(formData[c.key]) : formData[c.key]
    }
    if (Object.keys(payload).length === 0) return
    setSaving(true); setFormError(null)
    try {
      if (editItem) { await apiPatch(`/bang-gia-new/${cat.slug}/${editItem.id}`, payload) }
      else { await apiPost(`/bang-gia-new/${cat.slug}`, payload) }
      setModalOpen(false); handleSearch()
    } catch (e: any) { setFormError(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await apiDelete(`/bang-gia-new/${cat.slug}/${confirmDelete.id}`)
      setConfirmDelete(null); handleSearch()
    } catch (e: any) {}
    finally { setDeleting(false) }
  }

  const startInlineEdit = (row: any, colKey: string) => {
    setInlineEdit({ rowId: row.id, colKey, value: row[colKey] ?? '' })
    setTimeout(() => inlineRef.current?.focus(), 50)
  }

  const saveInline = async () => {
    if (!inlineEdit) return
    try {
      await apiPatch(`/bang-gia-new/${cat.slug}/${inlineEdit.rowId}`, { [inlineEdit.colKey]: inlineEdit.value })
      setInlineEdit(null); handleSearch()
    } catch (e: any) { setInlineEdit(null) }
  }

  const cancelInline = () => setInlineEdit(null)

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Tính giá 8 nhóm nhỏ — {cat.label}</h1>

      <div style={{
        background: colors.card, borderRadius: radius.lg, padding: 20,
        border: `1px solid ${colors.border}`, boxShadow: shadow.card, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <button style={{ ...btn(colors.primary, '#fff'), fontWeight: 600, alignSelf: 'flex-end', marginLeft: 'auto' }} onClick={syncMissingCodes}>Đồng bộ mã thiếu</button>
        </div>
        {syncResult && (
          <div style={{ marginTop: 12, padding: 12, background: colors.surfaceSecondary, borderRadius: radius.md, fontSize: 12, lineHeight: '1.6' }}>
            {syncResult.status === 'done' ? (
              <span style={{ color: colors.primaryDark }}>Đã thêm {syncResult.added} mã vào các bảng nhóm. {syncResult.total_found > syncResult.added ? `${syncResult.total_found - syncResult.added} mã đã tồn tại.` : ''}</span>
            ) : syncResult.status === 'error' ? (
              <span style={{ color: colors.danger }}>Lỗi: {syncResult.error}</span>
            ) : (
              <>
                <div style={{ marginBottom: 8 }}>
                  Tìm thấy <strong>{syncResult.matched_count}</strong> mã khớp pattern, <strong>{syncResult.unmatched_count}</strong> mã không xác định.
                  (Tổng sales: {syncResult.total_sales}, đã có: {syncResult.total_in_groups})
                </div>
                {syncResult.patterns?.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    Pattern phát hiện: {syncResult.patterns.map((p: any) => `${p.name}→${p.prefix}`).join(', ')}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button style={{ height: 26, padding: '0 10px', background: colors.primary, color: '#fff', border: 'none', borderRadius: radius.sm, cursor: 'pointer', fontSize: 11, fontWeight: 600 }} onClick={doSyncInsert}>Thêm tự động ({syncResult.matched_count} mã)</button>
                  <button style={{ height: 26, padding: '0 10px', background: colors.card, color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: radius.sm, cursor: 'pointer', fontSize: 11 }} onClick={() => setSyncResult(null)}>Huỷ</button>
                </div>
              </>
            )}
            {syncResult.loading && <span>Đang xử lý...</span>}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 12 }}>
          {cat.fields.filter(f => f.type !== 'select').map(f => (
            <div key={f.key} style={{ minWidth: 180, flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>{f.label}</label>
              <input style={inputStyle} placeholder={f.label} value={filterVals[f.key] || ''} onChange={e => updateFilter(f.key, e.target.value)} />
            </div>
          ))}
          {cat.fields.filter(f => f.type === 'select').map(f => (
            <div key={f.key} style={{ minWidth: 160, flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>{f.label}</label>
              <select style={inputStyle} value={filterVals[f.key] || ''} onChange={e => updateFilter(f.key, e.target.value)}>
                <option value="">Tất cả</option>
                {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
          <button style={{ ...btn(colors.primary, '#fff'), fontWeight: 600 }} onClick={handleSearch}>Tra cứu</button>
          <button style={{ ...btn(colors.textMuted, '#fff'), fontWeight: 500 }} onClick={() => { setFilterVals({}); setResults([]) }}>Xoá</button>
        </div>
      </div>

      {loading ? <div style={spinner}>Đang tra cứu...</div> : (
        results.length > 0 ? (
          <div style={{
            background: colors.card, borderRadius: radius.lg, overflow: 'hidden',
            border: `1px solid ${colors.border}`, boxShadow: shadow.card,
          }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 14px', borderBottom: `1px solid ${colors.borderLight}` }}>
              <button style={{ ...btn(colors.primary), fontWeight: 600, fontSize: 12 }} onClick={openCreate}>+ Thêm</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: colors.surfaceSecondary }}>
                  {cat.columns.map(c => (
                    <th key={c.key} style={{ padding: '10px 14px', textAlign: c.type === 'number' ? 'right' : 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>
                      {c.label}
                    </th>
                  ))}
                  <th style={{ padding: '10px 14px', textAlign: 'center', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, width: 90 }}>Tác vụ</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row, i) => (
                  <tr key={row.id || i} style={{ background: i % 2 === 0 ? colors.card : colors.surfaceSecondary, transition: 'background 80ms' }}>
                    {cat.columns.map(c => {
                      const isEditing = inlineEdit && inlineEdit.rowId === row.id && inlineEdit.colKey === c.key
                      return (
                      <td key={c.key} style={{ padding: '10px 14px', textAlign: c.type === 'number' ? 'right' : 'left', borderBottom: `1px solid ${colors.borderLight}`, color: colors.text, fontWeight: c.type === 'number' ? 600 : 400, cursor: 'pointer' }}
                        onDoubleClick={() => !c.readOnly && startInlineEdit(row, c.key)}
                      >
                        {isEditing ? (
                          c.type === 'number' ? (
                            <input ref={inlineRef as any} type="number" style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${colors.primary}`, borderRadius: 4, padding: '2px 4px', fontSize: 13, outline: 'none', textAlign: 'right' }}
                              value={inlineEdit?.value ?? ''}
                              onChange={e => setInlineEdit(prev => prev ? { ...prev, value: Number(e.target.value) } : null)}
                              onBlur={saveInline}
                              onKeyDown={e => { if (e.key === 'Enter') saveInline(); if (e.key === 'Escape') cancelInline() }}
                              autoFocus
                            />
                          ) : (
                            <input ref={inlineRef as any} type="text" style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${colors.primary}`, borderRadius: 4, padding: '2px 4px', fontSize: 13, outline: 'none' }}
                              value={inlineEdit?.value ?? ''}
                              onChange={e => setInlineEdit(prev => prev ? { ...prev, value: e.target.value } : null)}
                              onBlur={saveInline}
                              onKeyDown={e => { if (e.key === 'Enter') saveInline(); if (e.key === 'Escape') cancelInline() }}
                              autoFocus
                            />
                          )
                        ) : (
                          c.type === 'number' ? formatNum(row[c.key]) : (row[c.key] ?? '—')
                        )}
                      </td>
                    )})}
                    <td style={{ padding: '10px 14px', textAlign: 'center', borderBottom: `1px solid ${colors.borderLight}` }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button style={{ height: 26, padding: '0 8px', borderRadius: radius.sm, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: colors.primaryLight, color: colors.primaryDark }} onClick={() => openEdit(row)}>Sửa</button>
                        <button style={{ height: 26, padding: '0 8px', borderRadius: radius.sm, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: colors.dangerLight, color: colors.dangerDark }} onClick={() => setConfirmDelete(row)}>Xoá</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '10px 14px', fontSize: 12, color: colors.textMuted, borderTop: `1px solid ${colors.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{total} kết quả</span>
              {total > limit && (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <button disabled={page <= 1} style={{ height: 26, padding: '0 8px', borderRadius: radius.sm, border: `1px solid ${colors.border}`, cursor: page <= 1 ? 'default' : 'pointer', fontSize: 11, fontWeight: 500, background: page <= 1 ? colors.surfaceSecondary : colors.card, color: page <= 1 ? colors.textMuted : colors.text }} onClick={() => setPage(p => Math.max(1, p - 1))}>‹ Trước</button>
                  <span style={{ padding: '0 8px' }}>Trang {page} / {Math.ceil(total / limit)}</span>
                  <button disabled={page >= Math.ceil(total / limit)} style={{ height: 26, padding: '0 8px', borderRadius: radius.sm, border: `1px solid ${colors.border}`, cursor: page >= Math.ceil(total / limit) ? 'default' : 'pointer', fontSize: 11, fontWeight: 500, background: page >= Math.ceil(total / limit) ? colors.surfaceSecondary : colors.card, color: page >= Math.ceil(total / limit) ? colors.textMuted : colors.text }} onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}>Sau ›</button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted, background: colors.card, borderRadius: radius.lg, border: `1px solid ${colors.border}`, boxShadow: shadow.card }}>
            <div style={{ marginBottom: 8 }}>Chọn danh mục và nhập điều kiện tìm kiếm để tra cứu giá</div>
            <button style={{ ...btn(colors.primary), fontWeight: 600, fontSize: 12 }} onClick={openCreate}>+ Thêm bản ghi</button>
          </div>
        )
      )}

      {/* Edit modal */}
      <Modal open={modalOpen} title={editItem ? 'Sửa bản ghi' : 'Thêm bản ghi'} onClose={() => setModalOpen(false)}>
        {formError && <div style={{ padding: 14, background: colors.dangerLight, color: colors.danger, borderRadius: radius.md, marginBottom: 16, border: `1px solid ${colors.danger}22` }}>{formError}</div>}
        {cat.columns.filter(c => c.key !== 'id' && !c.readOnly).map(c => (
          <div key={c.key} style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', marginBottom: 5, fontSize: 12, fontWeight: 500, color: colors.textSecondary }}>{c.label}</label>
            {c.type === 'number' ? (
              <input style={input} type="number" value={formData[c.key] ?? ''} onChange={e => setFormData(p => ({ ...p, [c.key]: Number(e.target.value) }))} />
            ) : (
              <input style={input} type="text" value={formData[c.key] ?? ''} onChange={e => setFormData(p => ({ ...p, [c.key]: e.target.value }))} />
            )}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 14, borderTop: `1px solid ${colors.borderLight}` }}>
          <button style={{ height: 32, padding: '0 12px', background: colors.card, color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: radius.sm, cursor: 'pointer', fontSize: 12.5, fontWeight: 500 }} onClick={() => setModalOpen(false)} disabled={saving}>Huỷ</button>
          <button style={{ height: 32, padding: '0 12px', background: colors.primary, color: '#fff', border: 'none', borderRadius: radius.sm, cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }} onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={confirmDelete !== null} message="Xác nhận xoá bản ghi này?" onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} loading={deleting} />
    </div>
  )
}
