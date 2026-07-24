import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '../../lib/api'
import { colors, shadow, radius, card as cardStyle, pageContainer, pageTitle, btn, input, section, sectionTitle } from '../../theme'
import { formatNum } from '../../lib/format'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const dateInput: React.CSSProperties = {
  ...input, width: 150, colorScheme: 'dark', fontSize: 12, height: 30,
}

const S = {
  title: { ...pageTitle, marginBottom: 20 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginTop: 16 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12, marginTop: 16 },
  card: (border: string) => ({
    ...cardStyle(border), padding: 14, cursor: 'default',
  }),
  cardVal: { fontSize: 22, fontWeight: 700, color: colors.text, margin: '6px 0 0' },
  cardLabel: { fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.3, margin: 0 },
  cardSub: { fontSize: 12, color: colors.textMuted, margin: '2px 0 0' },
  chartBox: { background: colors.card, borderRadius: radius.lg, padding: 16, boxShadow: shadow.card, border: `1px solid ${colors.border}`, marginTop: 16 },
  chartTitle: { ...sectionTitle, margin: '0 0 12px' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 12.5 },
  th: { padding: '6px 12px', textAlign: 'left' as const, fontSize: 10.5, fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.tableBorder}`, background: colors.surfaceSecondary, whiteSpace: 'nowrap' as const },
  td: { padding: '6px 12px', borderBottom: `1px solid ${colors.tableBorderLight}`, color: colors.textSecondary },
  badge: (bg: string) => ({
    display: 'inline-block', padding: '1px 6px', borderRadius: 3, fontSize: 10.5, fontWeight: 600, background: bg, color: '#fff',
  }),
  filterRow: {
    display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' as const, marginBottom: 0,
  },
  label: { fontSize: 12, color: colors.textMuted, whiteSpace: 'nowrap' as const },
}

const PIE_COLORS = [colors.success, colors.warning, colors.danger, 'rgba(123,143,163,0.4)']
const PIE_LABELS: Record<string, string> = { bang: 'Đúng', thap: 'Thấp hơn', cao: 'Cao hơn', khong: 'Không có giá gốc' }

export default function Dashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [ngayFrom, setNgayFrom] = useState('')
  const [ngayTo, setNgayTo] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (ngayFrom) params.set('ngay_from', ngayFrom.split('-').reverse().join('/'))
      if (ngayTo) params.set('ngay_to', ngayTo.split('-').reverse().join('/'))
      const qs = params.toString()
      const res = await apiGet(`/pricing/dashboard${qs ? '?' + qs : ''}`)
      setData(res)
    } catch { }
    setLoading(false)
  }, [ngayFrom, ngayTo])

  useEffect(() => { fetchData() }, [fetchData])

  const pieData = data ? [
    { name: 'Đúng', value: data.stats.bang.count, color: colors.success },
    { name: 'Thấp hơn', value: data.stats.thap.count, color: colors.warning },
    { name: 'Cao hơn', value: data.stats.cao.count, color: colors.danger },
    { name: 'Không có giá gốc', value: data.stats.khong.count, color: 'rgba(123,143,163,0.4)' },
  ].filter(d => d.value > 0) : []

  return (
    <div style={pageContainer}>
      <h1 style={S.title}>Dashboard</h1>

      {/* Filter bar */}
      <div style={{ ...section, padding: '12px 16px' }}>
        <div style={S.filterRow}>
          <span style={S.label}>Từ ngày:</span>
          <input type="date" style={dateInput} value={ngayFrom} onChange={e => setNgayFrom(e.target.value)} />
          <span style={S.label}>Đến ngày:</span>
          <input type="date" style={dateInput} value={ngayTo} onChange={e => setNgayTo(e.target.value)} />
          <button style={btn(colors.primary)} onClick={fetchData} disabled={loading}>Xem</button>
          {(ngayFrom || ngayTo) && (
            <button style={btn('transparent', colors.textMuted)} onClick={() => { setNgayFrom(''); setNgayTo('') }}>
              Bỏ lọc
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: colors.textMuted, fontSize: 14 }}>Đang tải...</div>
      ) : data ? (
        <>
          {/* Stat cards */}
          <div style={S.grid3}>
            <div style={S.card(colors.primary)}>
              <p style={S.cardLabel}>Tổng đơn hàng</p>
              <p style={S.cardVal}>{formatNum(data.tong_don_hang)}</p>
            </div>
            <div style={S.card(colors.info)}>
              <p style={S.cardLabel}>Tổng số dòng</p>
              <p style={S.cardVal}>{formatNum(data.tong_so_dong)}</p>
            </div>
            <div style={S.card(colors.green)}>
              <p style={S.cardLabel}>Tổng doanh số</p>
              <p style={S.cardVal}>{formatNum(data.tong_doanh_so)}</p>
            </div>
          </div>

          {/* Comparison stats */}
          <div style={S.grid4}>
            <div style={S.card(colors.success)}>
              <p style={S.cardLabel}>Đúng (giá gốc = đơn giá)</p>
              <p style={S.cardVal}>{formatNum(data.stats.bang.count)}</p>
              <p style={S.cardSub}>{data.stats.bang.pct}%</p>
            </div>
            <div style={S.card(colors.warning)}>
              <p style={S.cardLabel}>Thấp hơn (đơn giá &gt; giá gốc)</p>
              <p style={S.cardVal}>{formatNum(data.stats.thap.count)}</p>
              <p style={S.cardSub}>{data.stats.thap.pct}%</p>
            </div>
            <div style={S.card(colors.danger)}>
              <p style={S.cardLabel}>Cao hơn (đơn giá &lt; giá gốc)</p>
              <p style={S.cardVal}>{formatNum(data.stats.cao.count)}</p>
              <p style={S.cardSub}>{data.stats.cao.pct}%</p>
            </div>
            <div style={S.card(colors.textMuted)}>
              <p style={S.cardLabel}>Không có giá gốc</p>
              <p style={S.cardVal}>{formatNum(data.stats.khong.count)}</p>
              <p style={S.cardSub}>{data.stats.khong.pct}%</p>
            </div>
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginTop: 16 }}>            
            {/* Stacked bar chart */}
            <div style={S.chartBox}>
              <h3 style={S.chartTitle}>So sánh giá gốc theo ngày</h3>
              {data.daily.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={data.daily.map((d: any) => ({
                    ngay: d.ngay,
                    'Đúng': d.bang,
                    'Thấp hơn': d.thap,
                    'Cao hơn': d.cao,
                    'Không có giá gốc': d.khong,
                  }))} stackOffset="sign">
                    <XAxis dataKey="ngay" tick={{ fontSize: 10, fill: colors.textMuted }} angle={-30} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 10, fill: colors.textMuted }} />
                    <Tooltip
                      contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 12 }}
                      itemStyle={{ color: colors.textSecondary }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, color: colors.textSecondary }} />
                    <Bar dataKey="Đúng" stackId="a" fill={colors.success} />
                    <Bar dataKey="Thấp hơn" stackId="a" fill={colors.warning} />
                    <Bar dataKey="Cao hơn" stackId="a" fill={colors.danger} />
                    <Bar dataKey="Không có giá gốc" stackId="a" fill="rgba(123,143,163,0.4)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: 60, color: colors.textMuted, fontSize: 13 }}>Không có dữ liệu</div>
              )}
            </div>

            {/* Pie chart */}
            <div style={S.chartBox}>
              <h3 style={S.chartTitle}>Tổng quan</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                      label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 12 }}
                      formatter={(value: any, name: any) => [formatNum(value), name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: 60, color: colors.textMuted, fontSize: 13 }}>Không có dữ liệu</div>
              )}
            </div>
          </div>

          {/* Daily detail table */}
          {data.daily.length > 0 && (
            <div style={S.chartBox}>
              <h3 style={S.chartTitle}>Chi tiết theo ngày</h3>
              <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto' }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Ngày</th>
                      <th style={S.th}>Tổng dòng</th>
                      <th style={S.th}>Doanh số</th>
                      <th style={S.th}>Đúng</th>
                      <th style={S.th}>Thấp hơn</th>
                      <th style={S.th}>Cao hơn</th>
                      <th style={S.th}>Ko giá gốc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.map((d: any) => (
                      <tr key={d.ngay}>
                        <td style={S.td}>{d.ngay}</td>
                        <td style={{ ...S.td, fontWeight: 600 }}>{formatNum(d.tong)}</td>
                        <td style={S.td}>{formatNum(d.doanh_so)}</td>
                        <td style={S.td}><span style={S.badge(colors.success)}>{formatNum(d.bang)}</span></td>
                        <td style={S.td}><span style={S.badge(colors.warning)}>{formatNum(d.thap)}</span></td>
                        <td style={S.td}><span style={S.badge(colors.danger)}>{formatNum(d.cao)}</span></td>
                        <td style={S.td}><span style={S.badge('rgba(123,143,163,0.4)')}>{formatNum(d.khong)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: 60, color: colors.textMuted, fontSize: 14 }}>Không thể tải dữ liệu</div>
      )}
    </div>
  )
}