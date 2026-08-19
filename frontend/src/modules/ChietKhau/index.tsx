import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '../../lib/api'
import {
  colors, shadow, radius, btn, input, select,
  tableStyle, pageContainer, pageTitle, pageSubtitle, section, sectionTitle,
  spinner, badge, pagination as pgn,
} from '../../theme'
import { formatNum } from '../../lib/format'

export default function ChietKhauPage() {
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [limit] = useState(200)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [ngayTu, setNgayTu] = useState('')
  const [ngayDen, setNgayDen] = useState('')
  const [saiSo, setSaiSo] = useState<'0' | '1' | ''>('')
  const [thongKe, setThongKe] = useState<any>(null)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams()
      params.set('limit', String(limit))
      params.set('offset', String(offset))
      if (search) params.set('search', search)
      if (ngayTu) params.set('ngay_tu', ngayTu)
      if (ngayDen) params.set('ngay_den', ngayDen)
      if (saiSo !== '') params.set('sai_so', saiSo)
      const res = await apiGet(`/chiet-khau/doi-chieu?${params}`)
      setData(res.data || [])
      setTotal(res.total || 0)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [limit, offset, search, ngayTu, ngayDen, saiSo])

  useEffect(() => { fetchData() }, [fetchData])

  // Thống kê TOÀN BỘ từ endpoint chuyên dụng (dùng ck_tinh đã ghi bởi /tinh-het)
  const [tongThongKe, setTongThongKe] = useState<any>(null)
  const fetchThongKe = useCallback(async () => {
    try {
      const res = await apiGet(`/chiet-khau/thong-ke`)
      setTongThongKe(res)
    } catch (e: any) { console.error('thong-ke:', e.message) }
  }, [])
  useEffect(() => { fetchThongKe() }, [fetchThongKe])

  const stats = useCallback(() => {
    const dung = data.filter(d => !d.sai_so).length
    const sai = data.filter(d => d.sai_so).length
    setThongKe({ tong: data.length, dung, sai, sai_lech: data.reduce((s, d) => s + Math.abs(d.chenh_lech || 0), 0) })
  }, [data])

  useEffect(() => { stats() }, [stats])

  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(total / limit)

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Chiết khấu — Đối chiếu</h1>
      <p style={pageSubtitle}>CK thực tế (cột ck trong sổ bán hàng) vs CK tính theo công thức 5 lớp. Hiện % sau cột chiết khấu để biết đúng/sai.</p>

      {tongThongKe && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14, marginTop: 16 }}>
          <StatCard label="Tổng dòng đối chiếu" value={formatNum(tongThongKe.tong)} color={colors.primary} />
          <StatCard label="Đúng (PASS)" value={formatNum(tongThongKe.dung)} color={colors.success} />
          <StatCard label="Sai" value={formatNum(tongThongKe.sai)} color={tongThongKe.sai > 0 ? colors.danger : colors.success} />
          <StatCard label="Tỷ lệ pass" value={`${tongThongKe.pass_pct}%`} color={tongThongKe.pass_pct >= 90 ? colors.success : colors.danger} />
          <StatCard label="Tổng chênh lệch (toàn bộ)" value={formatNum(tongThongKe.sai_lech)} color={tongThongKe.sai_lech > 0 ? colors.danger : colors.success} />
        </div>
      )}

      {thongKe && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14, marginTop: 16 }}>
          <StatCard label="Trang này — dòng" value={formatNum(thongKe.tong)} color={colors.primary} />
          <StatCard label="Trang này — đúng" value={formatNum(thongKe.dung)} color={colors.success} />
          <StatCard label="Trang này — sai" value={formatNum(thongKe.sai)} color={thongKe.sai > 0 ? colors.danger : colors.success} />
          <StatCard label="Trang này — chênh lệch" value={formatNum(thongKe.sai_lech)} color={thongKe.sai_lech > 0 ? colors.danger : colors.success} />
        </div>
      )}

      <div style={{ background: colors.card, borderRadius: radius.lg, padding: 16, border: `1px solid ${colors.border}`, boxShadow: shadow.card, marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Tìm (mã KH / tên / mã hàng)</label>
            <input style={input} value={search} onChange={e => { setSearch(e.target.value); setOffset(0) }} placeholder="VD: HSLQ9, ME17..." />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Từ ngày</label>
            <input style={input} type="date" value={ngayTu} onChange={e => { setNgayTu(e.target.value); setOffset(0) }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Đến ngày</label>
            <input style={input} type="date" value={ngayDen} onChange={e => { setNgayDen(e.target.value); setOffset(0) }} />
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px', background: colors.surfaceSecondary, borderRadius: radius.md }}>
            {(['', '0', '1'] as const).map((v) => {
              const on = saiSo === v
              const label = v === '' ? 'Tất cả' : v === '0' ? 'Đúng' : 'Sai'
              const color = on ? (v === '1' ? colors.danger : v === '0' ? colors.success : colors.primary) : colors.textSecondary
              return (
                <button
                  key={v}
                  onClick={() => { setSaiSo(v); setOffset(0) }}
                  style={{
                    padding: '7px 14px', borderRadius: radius.sm, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: on ? 700 : 500,
                    background: on ? color : 'transparent', color: on ? '#fff' : colors.textMuted,
                  }}
                >{label}</button>
              )
            })}
          </div>
          <button style={btn(colors.primary, '#fff')} onClick={fetchData}>Tra cứu</button>
        </div>
      </div>

      {error && <div style={{ padding: 12, background: colors.dangerLight, color: colors.danger, borderRadius: radius.md, marginTop: 12 }}>{error}</div>}

      <div style={{ overflowX: 'auto', marginTop: 16, background: colors.card, borderRadius: radius.lg, boxShadow: shadow.card, border: `1px solid ${colors.border}` }}>
        {loading ? <div style={spinner}>Đang tải...</div> : (
          <table style={{ borderCollapse: 'collapse', fontSize: 12.5, width: '100%' }}>
            <thead>
              <tr>
                {['Ngày', 'Số CT', 'Mã KH', 'Tên KH', 'Mã hàng', 'SL', 'Đơn giá', 'Doanh số', 'CK thực tế', '% thực tế', 'CK tính', '% tính', 'Chênh lệch', 'Kết quả'].map(h => (
                  <th key={h} style={{ ...tableStyle.th, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={14} style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>Không có dữ liệu</td></tr>
              ) : data.map((r, i) => (
                <tr key={r.id ?? i} style={{ background: r.sai_so ? colors.dangerLight : colors.successLight }}>
                  <td style={tableStyle.td}>{r.ngay}</td>
                  <td style={tableStyle.td}>{r.so_ct}</td>
                  <td style={tableStyle.td}>{r.ma_kh}</td>
                  <td style={tableStyle.td}>{r.ten_kh}</td>
                  <td style={{ ...tableStyle.td, fontFamily: 'monospace' }}>{r.ma_hang}</td>
                  <td style={{ ...tableStyle.td, textAlign: 'right' }}>{formatNum(r.sl_ban)}</td>
                  <td style={{ ...tableStyle.td, textAlign: 'right' }}>{formatNum(r.don_gia)}</td>
                  <td style={{ ...tableStyle.td, textAlign: 'right', fontWeight: 600 }}>{formatNum(r.doanh_so)}</td>
                  <td style={{ ...tableStyle.td, textAlign: 'right' }}>{formatNum(r.ck)}</td>
                  <td style={{ ...tableStyle.td, textAlign: 'right' }}>{r.pct_thuc_te != null ? `${r.pct_thuc_te.toFixed(2)}%` : ''}</td>
                  <td style={{ ...tableStyle.td, textAlign: 'right', fontWeight: 600, color: colors.primary }}>{formatNum(r.ck_tinh)}</td>
                  <td style={{ ...tableStyle.td, textAlign: 'right', fontWeight: 600 }}>{r.pct_tinh != null ? `${r.pct_tinh.toFixed(2)}%` : ''}</td>
                  <td style={{ ...tableStyle.td, textAlign: 'right', fontWeight: 700, color: r.sai_so ? colors.danger : colors.success }}>
                    {r.chenh_lech != null ? `${r.chenh_lech > 0 ? '+' : ''}${formatNum(r.chenh_lech)}` : ''}
                  </td>
                  <td style={tableStyle.td}>
                    <span style={badge(r.sai_so ? colors.dangerLight : colors.successLight, r.sai_so ? colors.danger : colors.success)}>
                      {r.sai_so ? 'SAI' : 'ĐÚNG'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: 13, color: colors.textMuted }}>
        <span>Tổng: <strong>{formatNum(total)}</strong> dòng</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={pgn.btn} disabled={currentPage <= 1} onClick={() => setOffset(offset - limit)}>← Trước</button>
          <span>Trang <strong>{currentPage}</strong> / {totalPages || 1}</span>
          <button style={pgn.btn} disabled={currentPage >= totalPages} onClick={() => setOffset(offset + limit)}>Sau →</button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: colors.card, borderRadius: radius.lg, padding: 14, boxShadow: shadow.card, border: `1px solid ${colors.border}`, borderLeft: `4px solid ${color}` }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', margin: 0 }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 700, color: colors.text, margin: '4px 0 0' }}>{value}</p>
    </div>
  )
}
