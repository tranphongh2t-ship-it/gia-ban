import { useState, useRef, useEffect, useCallback } from 'react'
import * as XLSX from 'xlsx'
import DataGrid, { Column } from '../../components/DataGrid'
import Modal from '../../components/Modal'
import { apiDelete, apiPost, apiGet, apiPostOffline, isOnline, isTauriApp } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { colors, btn, select } from '../../theme'
import { formatNum } from '../../lib/format'
import { tinhHetLocal } from '../../lib/local-calculate'

const CHUNK = 300
const API_PATH = '/check-chiet-khau'
// Detect cột theo tên header (dấu tiếng Việt ở file có thể khác nhau, chỉ match keyword)
const FIELD_ALIASES: Record<string, string[]> = {
  ngay: ['ngày chứng từ', 'ngày hạch toán', 'ngày'],
  so_ct: ['số chứng từ', 'số c/t', 'số ct'],
  dien_giai: ['diễn giải'],
  ma_kh: ['mã khách hàng', 'mã kh'],
  ten_kh: ['tên khách hàng', 'tên kh'],
  ma_hang: ['mã hàng'],
  ten_hang: ['tên hàng'],
  sl_ban: ['số lượng bán', 'tổng số lượng bán'],
  don_gia: ['đơn giá'],
  doanh_so: ['doanh số bán', 'doanh số'],
  ck: ['chiết khấu'],
  sl_tra: ['số lượng trả', 'tổng số lượng trả lại'],
  gt_tra: ['giá trị trả'],
  gt_giam: ['giá trị giảm'],
  thue: ['thuế'],
}
const NUM_FIELDS = ['sl_ban', 'don_gia', 'doanh_so', 'ck', 'sl_tra', 'gt_tra', 'gt_giam', 'thue']

function normHeader(v: any): string {
  return String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
}

// Tìm vị trí cột theo tên header → map db field -> idx
function detectCols(headerRow: any[]): Record<string, number> {
  const headers = Array.from({ length: (headerRow || []).length }, (_, i) => normHeader(headerRow[i]))
  const map: Record<string, number> = {}
  for (const db of Object.keys(FIELD_ALIASES)) {
    for (const alias of FIELD_ALIASES[db]) {
      const idx = headers.findIndex(h => h === alias || (alias.length > 2 && h.includes(alias)))
      if (idx >= 0) { map[db] = idx; break }
    }
  }
  return map
}

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

function pct(v: any): string {
  const n = Number(v)
  if (v === null || v === undefined || v === '') return '—'
  return (n * 100).toFixed(2) + '%'
}

function dongBanLucChay(r: any): boolean {
  return typeof r === 'object' && r !== null
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
  { key: 'doanh_so', label: 'Doanh số', type: 'number' },
  { key: 'ck', label: 'CK thực tế', type: 'number' },
  {
    key: 'ck_pct_thuc_te', label: 'CK % (gốc)', type: 'number', computed: true,
    render: (v, row) => {
      const ds = Number(row.doanh_so) || 0
      const ck = Number(row.ck) || 0
      if (ds <= 0) return '—'
      return (ck / ds * 100).toFixed(2) + '%'
    },
  },
  {
    key: 'ck1_pct', label: 'CK1 (ván trơn/chỉ nẹp)', type: 'number',
    render: (v, r) => dongBanLucChay(r) ? pct(v) : v,
  },
  {
    key: 'ck2_pct', label: 'CK2 (vận chuyển)', type: 'number',
    render: (v, r) => dongBanLucChay(r) ? pct(v) : v,
  },
  {
    key: 'ck3_pct', label: 'CK3 (Melamine)', type: 'number',
    render: (v, r) => dongBanLucChay(r) ? pct(v) : v,
  },
  {
    key: 'tong_pct', label: 'Tổng % (engine)', type: 'number',
    render: (v, r) => dongBanLucChay(r) ? pct(v) : v,
  },
  { key: 'ck_tinh', label: 'CK tính (engine)', type: 'number' },
  {
    key: 'sai_so', label: 'Đúng/Sai', type: 'select', computed: true, filterable: true,
    options: [
      { value: 'dung', label: 'Đúng (lệch ≤ 1đ)' },
      { value: 'sai', label: 'Sai (lệch > 1đ)' },
    ],
    render: (v, row) => {
      const suaCkTinh = Number(row.sua_ck_tinh) || 0
      const suaHas = row.sua_tong_pct !== null && row.sua_tong_pct !== undefined && row.sua_tong_pct !== ''
      const ckTinh = suaHas ? suaCkTinh : (Number(row.ck_tinh) || 0)
      const ck = Number(row.ck) || 0
      const ok = Math.abs(ck - ckTinh) <= 1
      return <span style={{ fontWeight: 700, color: ok ? '#16a34a' : '#dc2626' }}>{ok ? 'Đúng' : 'Sai'}</span>
    },
  },
  { key: 'dieu_kien', label: 'Điều kiện CK' },
  {
    key: 'sua_ghichu', label: 'Ghi chú sửa', type: 'text',
    render: (v) => v ? <span style={{ color: '#b45309' }}>{v}</span> : '—',
  },
  { key: 'updated_by', label: 'Người sửa', type: 'text' },
]

export default function CheckChietKhauPage() {
  const { user, hasPermission } = useAuth()
  const canEdit = hasPermission('feature:edit-data')
  const canImport = hasPermission('feature:import-export') || canEdit
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [tinhHet, setTinhHet] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [gridKey, setGridKey] = useState(0)
  const [thongKe, setThongKe] = useState<any>(null)
  const [modal, setModal] = useState<any>(null)
  const [suas, setSuas] = useState<Record<string, number>>({})
  const [thang, setThang] = useState('')
  const [thangOpts, setThangOpts] = useState<string[]>([])
  const [histOpen, setHistOpen] = useState(false)
  const [histRow, setHistRow] = useState<any | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loadingHist, setLoadingHist] = useState(false)
  // Phạm vi file đang xem: '' = file của mình, '__all' = tất cả (admin), số = file người khác
  const [viewOwner, setViewOwner] = useState('')
  const [owners, setOwners] = useState<Array<{ user_id: number; ten: string; so_dong: number }>>([])
  const [legacyCount, setLegacyCount] = useState(0)

  const refresh = () => setGridKey(k => k + 1)

  // Khi đổi user khác trong dropdown → đổi key để DataGrid fetch lại
  const changeViewOwner = (val: string) => {
    setViewOwner(val)
    setGridKey(k => k + 1)
  }

  useEffect(() => {
    apiGet('/chiet-khau/quan-ly-thang/thangs').then(r => setThangOpts(r.thangs || [])).catch(() => {})
    apiGet(`${API_PATH}/owners`).then(r => {
      setOwners(r.data || [])
      setLegacyCount(r.khong_so_huu || 0)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    apiPost(`${API_PATH}/thong-ke`, { thang: thang || '' }).then(r => {
      if (!r.error) setThongKe(r)
    }).catch(() => {})
  }, [gridKey, thang])

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
      if (rows.length < 2) throw new Error('Không đọc được dữ liệu trong file')

      // Tìm dòng header (dòng chứa "mã hàng")
      let headerIdx = rows.findIndex(r => (r || []).some((c: any) => normHeader(c).includes('mã hàng')))
      if (headerIdx < 0) throw new Error('Không tìm thấy dòng tiêu đề (thiếu cột "Mã hàng")')
      const colMap = detectCols(rows[headerIdx])
      if (colMap.ma_hang === undefined) throw new Error('Thiếu cột "Mã hàng" trong file')

      const dataRows = rows.slice(headerIdx + 1).filter((r: any[]) => {
        if (!r || !r.some(c => c !== undefined && c !== null && c !== '')) return false
        if (normHeader(r[colMap.dien_giai]!).startsWith('số dòng') || normHeader(r[colMap.dien_giai]!).startsWith('tổng')) return false
        return r[colMap.ma_hang] !== undefined && r[colMap.ma_hang] !== null && String(r[colMap.ma_hang]).trim() !== ''
      })

      const records: any[] = []
      for (const row of dataRows) {
        const rec: Record<string, any> = {}
        for (const db of Object.keys(FIELD_ALIASES)) {
          const idx = colMap[db]
          if (idx === undefined) continue
          const val = row[idx]
          if (db === 'ngay') rec[db] = toDateStr(val)
          else if (NUM_FIELDS.includes(db)) rec[db] = typeof val === 'number' ? val : 0
          else rec[db] = val !== undefined && val !== null ? String(val).trim() : ''
        }
        if (!rec.ma_hang) continue
        records.push(rec)
      }
      if (records.length === 0) throw new Error('Không có dòng dữ liệu hợp lệ trong file')

      let imported = 0, skipped = 0, khachMoi = 0
      let usedOffline = false
      // Try online first; fallback to offline on network error
      let tryOffline = isTauriApp() && !isOnline()
      for (let i = 0; i < records.length; i += CHUNK) {
        const chunk = records.slice(i, i + CHUNK)
        let data: any
        if (tryOffline) {
          data = await apiPostOffline(`${API_PATH}/import-rows`, { rows: chunk }, {
            table: 'check-chiet-khau',
            keyFields: ['ngay', 'so_ct', 'ma_hang'],
          })
          usedOffline = true
        } else {
          try {
            data = await apiPost(`${API_PATH}/import-rows`, { rows: chunk })
          } catch (err: any) {
            // Network error → fallback to offline for remaining chunks
            if (isTauriApp() && (err.message?.includes('network') || err.message?.includes('fetch') || err.message?.includes('Connect') || err.message?.includes('timeout') || err.message?.includes('reqwest'))) {
              tryOffline = true
              usedOffline = true
              data = await apiPostOffline(`${API_PATH}/import-rows`, { rows: chunk }, {
                table: 'check-chiet-khau',
                keyFields: ['ngay', 'so_ct', 'ma_hang'],
              })
            } else {
              throw err
            }
          }
        }
        if (data?.error) throw new Error(data.error || `Lỗi chunk ${Math.floor(i / CHUNK) + 1}`)
        imported += data?.imported || data?.inserted || 0
        skipped += data?.skipped || 0
        khachMoi += data?.so_khach_moi || 0
      }

      // Tự tính lại CK theo chuẩn engine sau khi import
      if (usedOffline) {
        const tinh = await tinhHetLocal(records)
        setResult(
          `Import ${imported} dòng thành công (offline — lưu local). ` +
          `Đã tính CK cho ${tinh.length} dòng.`
        )
      } else {
        const tinh = await apiPost(`${API_PATH}/tinh-het`, {})
        if (tinh.error) throw new Error('Lỗi tính lại CK: ' + tinh.error)
        setResult(
          `Import ${imported} dòng thành công${skipped ? `, bỏ qua ${skipped} dòng (trùng hoặc thiếu mã hàng)` : ''}. ` +
          `Tự thêm ${khachMoi} khách mới vào bảng chiết khấu. ${tinh.message || ''}`
        )
      }
      refresh()
      if (fileRef.current) fileRef.current.value = ''
    } catch (e: any) {
      setError(e.message)
    } finally {
      setImporting(false)
    }
  }

  const tinhHetOffline = async () => {
    const { invoke } = await import('@tauri-apps/api/core')
    const localData: any = await invoke('local_query', { table: 'check-chiet-khau', limit: 100000 })
    const rows = localData?.rows || []
    if (rows.length === 0) {
      setResult('Không có dữ liệu để tính. Hãy import file trước.')
      return
    }
    const results = await tinhHetLocal(rows)
    for (const r of results) {
      if (r.id) {
        await invoke('db_exec', {
          sql: `UPDATE check_chiet_khau_test_local SET
            ck1_pct=?, ck2_pct=?, ck3_pct=?, tong_pct=?, ck_tinh=?,
            nhom_mau=?, dieu_kien=?, giai_thich=?
            WHERE id=?`,
          params: [
            r.ck1_pct ?? 0, r.ck2_pct ?? 0, r.ck3_pct ?? 0,
            r.tong_pct ?? 0, r.ck_tinh ?? 0,
            r.nhom_mau ?? '', r.dieu_kien ?? '', r.giai_thich ?? '',
            r.id,
          ],
        })
      }
    }
    setResult(`Đã tính lại CK offline cho ${results.length} dòng.`)
    refresh()
  }

  const handleTinhHet = async () => {
    setTinhHet(true); setError(null); setResult(null)
    try {
      try {
        const tinh = await apiPost(`${API_PATH}/tinh-het`, {})
        if (tinh.error) throw new Error(tinh.error)
        setResult(tinh.message || 'Đã tính lại CK.')
        refresh()
      } catch (err: any) {
        if (isTauriApp() && (err.message?.includes('network') || err.message?.includes('fetch') || err.message?.includes('Connect') || err.message?.includes('timeout') || err.message?.includes('reqwest'))) {
          await tinhHetOffline()
        } else {
          throw err
        }
      }
    } catch (e: any) { setError(e.message) }
    finally { setTinhHet(false) }
  }

  const openSuaCk = useCallback((row: any) => {
    const base = (v: any, fallback: any) => {
      if (v !== null && v !== undefined && v !== '' && !isNaN(Number(v))) return Number(v) * 100
      if (fallback !== null && fallback !== undefined && fallback !== '' && !isNaN(Number(fallback))) return Number(fallback) * 100
      return 0
    }
    setSuas({
      ck1: base(row.sua_ck1_pct, row.ck1_pct),
      ck2: base(row.sua_ck2_pct, row.ck2_pct),
      ck3: base(row.sua_ck3_pct, row.ck3_pct),
    })
    setModal(row)
  }, [])

  const openLichSu = useCallback(async (row: any) => {
    setHistRow(row)
    setHistOpen(true)
    setLoadingHist(true)
    try {
      const res = await apiGet(`${API_PATH}/lich-su/${row.id}`)
      setHistory(res.data || [])
    } catch (e: any) { setHistory([]) }
    finally { setLoadingHist(false) }
  }, [])

  const saveSuaCk = async () => {
    if (!modal) return
    try {
      const body: any = {
        id: modal.id,
        sua_ck1_pct: suas.ck1 !== undefined ? suas.ck1 / 100 : null,
        sua_ck2_pct: suas.ck2 !== undefined ? suas.ck2 / 100 : null,
        sua_ck3_pct: suas.ck3 !== undefined ? suas.ck3 / 100 : null,
        updated_by: String(user?.id ?? ''),
      }
      const res = await apiPost(`${API_PATH}/sua-ck`, body)
      if (res.error) throw new Error(res.error)
      setResult(`Đã lưu CK sửa cho dòng #${modal.id}. ${res.data ? `Tổng ${pct(res.data.sua_tong_pct)}.` : ''}`)
      setModal(null)
      refresh()
    } catch (e: any) { setError(e.message) }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', padding: '0 24px', marginBottom: 12 }}>
        {canImport && (
          <>
            <div style={{ fontSize: 13, color: colors.textMuted }}>Import file "Sổ chi tiết bán hàng.xlsx" (tự xóa sau 6h):</div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ fontSize: 13 }} />
            <button style={{ ...btn(colors.primary), fontSize: 12, height: 32 }} onClick={handleImport} disabled={importing}>
              {importing ? 'Đang import...' : 'Import + Tính CK'}
            </button>
            {result && <span style={{ color: colors.success, fontSize: 13, fontWeight: 500 }}>{result}</span>}
            {error && <span style={{ color: colors.danger, fontSize: 13 }}>{error}</span>}
          </>
        )}
        <button
          style={{ ...btn(colors.primary, '#fff'), fontSize: 12, height: 32 }}
          onClick={handleTinhHet} disabled={tinhHet}
          title="Tính lại CK cho mọi dòng theo chuẩn bang-ck-thang"
        >{tinhHet ? 'Đang tính...' : 'Tính lại CK (engine)'}</button>
        <label style={{ fontSize: 13, color: colors.textMuted, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          Thống kê theo tháng:
          <select style={{ ...select, height: 32, fontSize: 12.5 }} value={thang} onChange={e => setThang(e.target.value)}>
            <option value="">Tất cả tháng</option>
            {thangOpts.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        {thongKe && (
          <div style={{ fontSize: 13, color: colors.textMuted, display: 'inline-flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span>{thongKe.tong.toLocaleString('vi-VN')} dòng</span>
            <span style={{ color: '#16a34a', fontWeight: 700 }}>Đúng: {thongKe.dung_tong.toLocaleString('vi-VN')} ({thongKe.pass_tong_pct}%)</span>
            <span style={{ color: '#dc2626', fontWeight: 600 }}>Sai: {thongKe.sai_tong.toLocaleString('vi-VN')}</span>
            <span style={{ color: '#b45309' }}>Lệch: {formatNum(thongKe.sai_tong_so)}đ</span>
            {thongKe.sai_tong === 0 && <span style={{ color: colors.textMuted, fontSize: 12 }}>(gồm {thongKe.sai_engine.toLocaleString('vi-VN')} dòng đã gán tay theo sổ)</span>}
          </div>
        )}
        <span style={{ flex: 1 }} />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: colors.text, fontWeight: 500 }}>Lấy file người khác:</span>
          <select
            value={viewOwner}
            onChange={e => changeViewOwner(e.target.value)}
            style={{ fontSize: 12, height: 32, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '0 6px', background: '#fff', color: '#1a2332' }}
          >
            <option value="">File của tôi</option>
            {user?.is_admin && <option value="__all">Tất cả (Admin)</option>}
            {owners.map(o => (
              <option key={o.user_id} value={String(o.user_id)}>{o.ten} ({o.so_dong} dòng)</option>
            ))}
            {legacyCount > 0 && <option value="__null">Dữ liệu cũ (không ai sở hữu) ({legacyCount} dòng)</option>}
          </select>
        </div>
        {canImport && (
          <button
            style={{ ...btn(colors.danger, '#fff'), fontSize: 12, height: 32 }}
            onClick={async () => {
              const isAdmin = user?.is_admin
              const subj = isAdmin ? 'toàn bộ dữ liệu của mọi người' : 'dữ liệu của bạn'
              if (!confirm(`Xóa ${subj} khỏi Audit Chiết Khấu?`)) return
              try {
                const d = await apiDelete(`${API_PATH}/clear`)
                if (d.success) { setResult(d.message); setThongKe(null); refresh() }
                else alert('Lỗi: ' + d.error)
              } catch (e: any) { alert('Lỗi: ' + e.message) }
            }}
          >Xóa hết dữ liệu</button>
        )}
      </div>
      <DataGrid
        key={gridKey}
        title="Audit Chiết Khấu"
        columns={columns}
        apiPath={API_PATH}
        searchable
        defaultSort="id"
        exportable
        exportName="CheckChietKhau"
        defaultLimit={500}
        extraFilters={viewOwner !== '' ? { owner_user_id: viewOwner } : undefined}
        rowActions={[
          { label: 'Sửa CK', onClick: openSuaCk },
          { label: 'Lịch sử', onClick: openLichSu, tone: 'primary' },
        ]}
        logBang="check_chiet_khau_test"
      />

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setModal(null)}>
          <div style={{ background: colors.card, borderRadius: 12, padding: 20, width: 420, maxWidth: '92vw', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Sửa chiết khấu — dòng #{modal.id}</div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 14 }}>
              {modal.so_ct} · {modal.ten_kh || modal.ma_kh} · {modal.ma_hang} · Doanh số {formatNum(modal.doanh_so)}đ
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(['ck1', 'ck2', 'ck3'] as const).map(k => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <span style={{ width: 180 }}>{k === 'ck1' ? 'CK1 (ván trơn/chỉ nẹp)' : k === 'ck2' ? 'CK2 (vận chuyển)' : 'CK3 (Melamine)'}%</span>
                  <input
                    type="number" step="any"
                    value={suas[k] ?? 0}
                    onChange={e => setSuas(s => ({ ...s, [k]: Number(e.target.value) }))}
                    style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: `1px solid ${colors.tableBorder}`, fontSize: 13 }}
                  />
                </label>
              ))}
              <div style={{ fontSize: 12, color: colors.textMuted }}>
                Tổng sửa: <b>{((suas.ck1 || 0) + (suas.ck2 || 0) + (suas.ck3 || 0)).toFixed(2)}%</b>
                &nbsp;= CK tính {formatNum((Number(modal.doanh_so) || 0) * ((suas.ck1 || 0) + (suas.ck2 || 0) + (suas.ck3 || 0)) / 100)}đ
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button style={{ ...btn(colors.textSecondary, '#fff'), fontSize: 13 }} onClick={() => setModal(null)}>Hủy</button>
              <button style={{ ...btn(colors.primary, '#fff'), fontSize: 13 }} onClick={saveSuaCk}>Lưu CK sửa</button>
            </div>
          </div>
        </div>
      )}

      <Modal open={histOpen} title={`Lịch sử chỉnh sửa CK — dòng #${histRow?.id ?? ''}`} onClose={() => setHistOpen(false)} wide>
        {histRow && (
          <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 14 }}>
            {histRow.so_ct} · {histRow.ten_kh || histRow.ma_kh} · {histRow.ma_hang}
          </div>
        )}
        {loadingHist ? (
          <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>Đang tải...</div>
        ) : history.length > 0 ? (
          <div style={{ overflowX: 'auto', borderRadius: 12, border: `1px solid ${colors.border}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: colors.surfaceSecondary }}>
                  {['Cột sửa', 'Giá trị cũ', 'Giá trị mới', 'Người sửa', 'Thời gian'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={h.id} style={{ background: i % 2 === 0 ? colors.card : colors.surfaceSecondary }}>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${colors.borderLight}`, whiteSpace: 'nowrap' }}>
                      {h.cot === 'sua_ck1_pct' ? 'CK1 (ván trơn/chỉ nẹp)'
                        : h.cot === 'sua_ck2_pct' ? 'CK2 (vận chuyển)'
                        : h.cot === 'sua_ck3_pct' ? 'CK3 (Melamine)'
                        : h.cot === 'sua_tong_pct' ? 'Tổng %' : h.cot}
                    </td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.textMuted }}>{h.gia_tri_cu}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${colors.borderLight}`, fontWeight: 600 }}>{h.gia_tri_moi}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${colors.borderLight}` }}>{h.updated_by || '—'}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${colors.borderLight}`, whiteSpace: 'nowrap' }}>{h.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>
            Chưa có lịch sử sửa CK cho dòng này.
          </div>
        )}
      </Modal>
    </div>
  )
}