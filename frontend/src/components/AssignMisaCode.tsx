import { useState, useEffect } from 'react'
import { colors, radius, btn } from '../theme'
import { apiGet, apiPost } from '../lib/api'
import Modal from './Modal'

interface AssignMisaCodeProps {
  module: string
  table: string
  rowId: number
  searchStr: string
  onAssigned: () => void
  currentMa?: string
  currentTen?: string
}

export default function AssignMisaCode({ module, table, rowId, searchStr, onAssigned, currentMa, currentTen }: AssignMisaCodeProps) {
  const [open, setOpen] = useState(false)
  const [candidates, setCandidates] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('')
  const [customMa, setCustomMa] = useState('')
  const [customTen, setCustomTen] = useState('')

  const openModal = () => {
    setCustomMa(currentMa || '')
    setCustomTen(currentTen || '')
    setFilter('')
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const q = filter || searchStr
    apiGet(`/gia-chuan/tim-ma-sp?module=${module}&q=${encodeURIComponent(q)}`)
      .then((r: any) => setCandidates(r.data || []))
      .catch(() => setCandidates([]))
      .finally(() => setLoading(false))
  }, [open, module, searchStr, filter])

  const handleAssign = async (ma_sp: string, ten_sp: string) => {
    setSaving(true)
    try {
      const res = await apiPost('/gia-chuan/gia-goc-tong-hop/update-ma-sp', {
        table,
        rows: [{ id: rowId, ma_sp, ten_sp }],
      })
      if (res.success) {
        setOpen(false)
        onAssigned()
      }
    } catch (e: any) {
      alert('Lỗi: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const filtered = candidates.filter(c => {
    if (!filter) return true
    const s = filter.toLowerCase()
    return c.ma_sp?.toLowerCase().includes(s) || c.ten_sp?.toLowerCase().includes(s)
  })

  return (
    <>
      <button
        style={{ ...btn(colors.primary, '#fff'), fontSize: 11, padding: '2px 10px', minHeight: 24 }}
        onClick={openModal}
      >{currentMa ? 'Sửa SP' : 'Gán SP'}</button>
      <Modal open={open} title={currentMa ? 'Sửa Mã Sản Phẩm' : 'Gán Mã Sản Phẩm'} onClose={() => setOpen(false)} wide>
        <div style={{ marginBottom: 12, padding: 12, border: `1px solid ${colors.border}`, borderRadius: radius.md, background: colors.surfaceSecondary }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 8 }}>Nhập tay mã SP (mã chưa có trong danh sách hoặc cần sửa)</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              style={{ width: '40%', padding: '8px 10px', border: `1px solid ${colors.border}`, borderRadius: radius.md, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
              placeholder="Mã SP (vd TOSB217E2)"
              value={customMa}
              onChange={e => setCustomMa(e.target.value)}
            />
            <input
              style={{ flex: 1, padding: '8px 10px', border: `1px solid ${colors.border}`, borderRadius: radius.md, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              placeholder="Mô tả sản phẩm"
              value={customTen}
              onChange={e => setCustomTen(e.target.value)}
            />
          </div>
          <button
            style={{ ...btn(colors.success, '#fff'), fontSize: 12, padding: '5px 14px' }}
            disabled={saving || !customMa.trim()}
            onClick={() => {
              const ma = customMa.trim()
              if (!ma) return
              handleAssign(ma, customTen.trim() || ma)
            }}
          >Lưu mã SP</button>
        </div>
        <div style={{ marginBottom: 12 }}>
          <input
            style={{ width: '100%', padding: '8px 10px', border: `1px solid ${colors.border}`, borderRadius: radius.md, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            placeholder="Tìm mã SP, tên SP..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            autoFocus
          />
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: colors.textMuted, fontSize: 13 }}>Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: colors.textMuted, fontSize: 13 }}>Không tìm thấy</div>
        ) : (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {filtered.map(c => (
              <div
                key={c.ma_sp}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 12px', borderBottom: `1px solid ${colors.borderLight}`,
                  cursor: 'pointer', borderRadius: radius.md,
                  transition: 'background 100ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = colors.surfaceSecondary)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => !saving && handleAssign(c.ma_sp, c.ten_sp)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: colors.text }}>{c.ma_sp}</div>
                  <div style={{ fontSize: 12, color: colors.textSecondary }}>{c.ten_sp}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: colors.primaryDark, whiteSpace: 'nowrap' }}>
                  {c.gia_goc ? c.gia_goc.toLocaleString() : ''}
                </div>
                {saving ? <span style={{ fontSize: 12, color: colors.textMuted }}>...</span> : (
                  <span style={{ fontSize: 16, color: colors.primary }}>+</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  )
}
