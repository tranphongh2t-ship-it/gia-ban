import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '../../lib/api'
import {
  colors, shadow, radius, btn, input, select,
  tableStyle, pageContainer, pageTitle, pageSubtitle, spinner, pagination as pgn,
} from '../../theme'

export default function LogThayDoiPage() {
  const [data, setData] = useState<any[]>([])
  const [byUser, setByUser] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [limit] = useState(200)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState('')
  const [bang, setBang] = useState('')
  const [thang, setThang] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', String(limit))
      params.set('offset', String(offset))
      if (user) params.set('user', user)
      if (bang) params.set('bang', bang)
      if (thang) params.set('thang', thang)
      const res = await apiGet(`/chiet-khau/log?${params}`)
      setData(res.data || [])
      setByUser(res.by_user || [])
      setTotal(res.total || 0)
    } catch {}
    finally { setLoading(false) }
  }, [limit, offset, user, bang, thang])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Log lịch sử thay đổi theo user</h1>
      <p style={pageSubtitle}>Tổng hợp mọi thay đổi ghi tay trên Bảng Tính Giá, Mã MISA, Bán — kèm ai đã thay đổi.</p>

      <div style={{ background: colors.card, borderRadius: radius.lg, padding: 16, border: `1px solid ${colors.border}`, boxShadow: shadow.card, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Người thay đổi</label>
            <input style={input} value={user} onChange={e => { setUser(e.target.value); setOffset(0) }} placeholder="VD: Admin" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Bảng</label>
            <input style={input} value={bang} onChange={e => { setBang(e.target.value); setOffset(0) }} placeholder="VD: ma_misa, ban" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: colors.textMuted, marginBottom: 4 }}>Tháng</label>
            <input style={input} value={thang} onChange={e => { setThang(e.target.value); setOffset(0) }} placeholder="YYYY-MM" />
          </div>
          <button style={btn(colors.primary, '#fff')} onClick={fetchData}>Lọc</button>
        </div>
      </div>

      {byUser.length > 0 && (
        <div style={{ background: colors.card, borderRadius: radius.lg, padding: 16, border: `1px solid ${colors.border}`, boxShadow: shadow.card, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 10 }}>Thống kê theo user</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {byUser.map((u: any) => (
              <div key={u.updated_by} onClick={() => setUser(u.updated_by)} style={{ cursor: 'pointer', background: colors.primaryLight, color: colors.primary, borderRadius: radius.md, padding: '8px 14px', fontSize: 13, fontWeight: 600 }}>
                {u.updated_by} · {u.so_lan} lần · {u.so_bang} bảng
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto', background: colors.card, borderRadius: radius.lg, boxShadow: shadow.card, border: `1px solid ${colors.border}` }}>
        {loading ? <div style={spinner}>Đang tải...</div> : (
          <table style={{ borderCollapse: 'collapse', fontSize: 12.5, width: '100%' }}>
            <thead>
              <tr>
                {['Lúc', 'User', 'Bảng', 'ID', 'Cột', 'Giá trị cũ', 'Giá trị mới', 'Tháng'].map(h => (
                  <th key={h} style={{ ...tableStyle.th, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>Chưa có log</td></tr>
              ) : data.map(r => (
                <tr key={r.id}>
                  <td style={{ ...tableStyle.td, whiteSpace: 'nowrap' }}>{r.created_at}</td>
                  <td style={{ ...tableStyle.td, fontWeight: 600, color: colors.primary }}>{r.updated_by}</td>
                  <td style={{ ...tableStyle.td, fontFamily: 'monospace' }}>{r.bang}</td>
                  <td style={tableStyle.td}>{r.ref_id}</td>
                  <td style={{ ...tableStyle.td, fontFamily: 'monospace' }}>{r.cot}</td>
                  <td style={tableStyle.td}>{r.gia_tri_cu}</td>
                  <td style={{ ...tableStyle.td, fontWeight: 600 }}>{r.gia_tri_moi}</td>
                  <td style={tableStyle.td}>{r.thang}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, fontSize: 13, color: colors.textMuted }}>
        <span>Tổng: <strong>{total}</strong> log</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={pgn.btn} disabled={offset <= 0} onClick={() => setOffset(offset - limit)}>← Trước</button>
          <span>Trang {Math.floor(offset / limit) + 1} / {Math.ceil(total / limit) || 1}</span>
          <button style={pgn.btn} disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)}>Sau →</button>
        </div>
      </div>
    </div>
  )
}
