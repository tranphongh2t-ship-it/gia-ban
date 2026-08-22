import { useState, useEffect } from 'react'
import { apiGet, apiDelete } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { colors, radius, btn, input, pageContainer, pageTitle, section, sectionTitle } from '../../theme'

const actionColors: Record<string, string> = {
  startup: colors.info, login: colors.success, logout: colors.warning,
  sync_push: colors.primary, sync_pull: colors.primary, backup: colors.green,
  export: colors.purple, import_data: colors.orange, download: colors.blue,
  update: colors.cyan, error: colors.danger, offline: colors.textMuted, online: colors.green,
}

function formatTime(s: string | null): string {
  if (!s) return '-'
  const d = new Date(s.replace(' ', 'T') + '+07:00')
  if (isNaN(d.getTime())) return s
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false })
}

function timeAgo(s: string | null): string {
  if (!s) return '-'
  const d = new Date(s.replace(' ', 'T') + '+07:00')
  if (isNaN(d.getTime())) return s
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000))
  if (sec < 60) return 'vua xong'
  if (sec < 3600) return Math.floor(sec / 60) + ' phut truoc'
  if (sec < 86400) return Math.floor(sec / 3600) + ' gio truoc'
  return Math.floor(sec / 86400) + ' ngay truoc'
}

interface DeviceInfo {
  device_id: string
  user_name: string
  app_version: string
  log_count: number
  last_seen: string
}

interface LogEntry {
  id: number
  device_id: string
  user_name: string
  user_id: number
  action: string
  detail: string
  app_version: string
  created_at: string
}

interface ActionCount {
  action: string
  count: number
}

export default function NhatKyThietBi() {
  const { user: me } = useAuth()
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [actions, setActions] = useState<ActionCount[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [deviceFilter, setDeviceFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(0)
  const LIMIT = 100

  const loadDevices = async () => {
    try { setDevices(await apiGet('/device-logs/devices')) } catch { /* ignore */ }
  }
  const loadActions = async () => {
    try { setActions(await apiGet('/device-logs/actions')) } catch { /* ignore */ }
  }
  const loadLogs = async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (deviceFilter) p.set('device_id', deviceFilter)
      if (actionFilter) p.set('action', actionFilter)
      if (fromDate) p.set('from', fromDate)
      if (toDate) p.set('to', toDate + ' 23:59:59')
      p.set('limit', String(LIMIT))
      p.set('offset', String(page * LIMIT))
      const data = await apiGet('/device-logs?' + p.toString())
      setLogs(data.logs || [])
      setTotal(data.total || 0)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { loadDevices(); loadActions() }, [])
  useEffect(() => { loadLogs() }, [deviceFilter, actionFilter, fromDate, toDate, page])

  const cleanup = async (days: number) => {
    if (!confirm('Xoa log cu hon ' + days + ' ngay?')) return
    try {
      const r = await apiDelete('/device-logs/cleanup?days=' + days)
      setMsg('Da xoa ' + r.deleted + ' log')
      loadDevices(); loadActions(); loadLogs()
    } catch (e: any) { setMsg('Loi: ' + e.message) }
  }

  if (!me?.is_admin) {
    return <div style={pageContainer}><p style={{ color: colors.textMuted, fontSize: 14 }}>Chi Admin moi truy cap trang nay.</p></div>
  }

  const th: React.CSSProperties = {
    textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 600,
    textTransform: 'uppercase' as const, letterSpacing: 0.3, color: colors.textMuted,
    background: colors.surfaceSecondary, borderBottom: '1px solid ' + colors.tableBorder,
  }
  const td: React.CSSProperties = {
    padding: '8px 12px', borderBottom: '1px solid ' + colors.tableBorderLight,
    color: colors.textSecondary, fontSize: 13, verticalAlign: 'middle',
  }
  const inpSmall: React.CSSProperties = { ...input, height: 30, fontSize: 12 }

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Nhat ky thiet bi</h1>
      <p style={{ fontSize: 13, color: colors.textMuted, margin: '4px 0 16px' }}>
        Theo doi hoat dong tren moi may cai dat app
      </p>

      {msg && (
        <div style={{
          padding: 10, borderRadius: radius.md, marginBottom: 12, fontSize: 13, border: '1px solid',
          background: msg.includes('Loi') ? colors.dangerLight : colors.successLight,
          color: msg.includes('Loi') ? colors.danger : colors.success,
        }}>{msg}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ ...section, padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: colors.primary }}>{devices.length}</div>
          <div style={{ fontSize: 11, color: colors.textMuted }}>Thiet bi</div>
        </div>
        <div style={{ ...section, padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: colors.info }}>{total}</div>
          <div style={{ fontSize: 11, color: colors.textMuted }}>Tong log</div>
        </div>
        {actions.slice(0, 4).map(a => (
          <div key={a.action} style={{ ...section, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: actionColors[a.action] || colors.textMuted }}>{a.count}</div>
            <div style={{ fontSize: 11, color: colors.textMuted }}>{a.action}</div>
          </div>
        ))}
      </div>

      <div style={section}>
        <h3 style={sectionTitle}>Danh sach thiet bi</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
          {devices.map(d => (
            <div key={d.device_id} style={{
              padding: '10px 14px', borderRadius: radius.md, cursor: 'pointer',
              border: '1px solid ' + (deviceFilter === d.device_id ? colors.primary : colors.border),
              background: deviceFilter === d.device_id ? colors.primaryLight : colors.surfaceSecondary,
            }} onClick={() => { setDeviceFilter(deviceFilter === d.device_id ? '' : d.device_id); setPage(0) }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: colors.text }}>{d.device_id.slice(0, 16)}...</div>
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                User: {d.user_name || '-'} | v{d.app_version || '-'} | {d.log_count} logs
              </div>
              <div style={{ fontSize: 11, color: colors.textMuted }}>Last: {timeAgo(d.last_seen)}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...section, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={sectionTitle}>Log hoat dong</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select style={{ ...inpSmall, width: 130 }} value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(0) }}>
              <option value="">Tat ca action</option>
              {actions.map(a => <option key={a.action} value={a.action}>{a.action} ({a.count})</option>)}
            </select>
            <input type="date" style={{ ...inpSmall, width: 140 }} value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(0) }} />
            <input type="date" style={{ ...inpSmall, width: 140 }} value={toDate} onChange={e => { setToDate(e.target.value); setPage(0) }} />
            <button style={btn('transparent', colors.textMuted, 'sm')} onClick={() => { setDeviceFilter(''); setActionFilter(''); setFromDate(''); setToDate(''); setPage(0) }}>Xoa filter</button>
            <button style={btn(colors.danger, '#fff', 'sm')} onClick={() => cleanup(90)}>Xoa log 90 ngay</button>
          </div>
        </div>

        {loading ? (
          <p style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', padding: 20 }}>Dang tai...</p>
        ) : logs.length === 0 ? (
          <p style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', padding: 20 }}>Khong co log</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={th}>Thoi gian</th>
                  <th style={th}>Thiet bi</th>
                  <th style={th}>User</th>
                  <th style={th}>Action</th>
                  <th style={th}>Version</th>
                  <th style={th}>Chi tiet</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td style={td}>{formatTime(l.created_at)}</td>
                    <td style={{ ...td, fontSize: 11, fontFamily: 'monospace' }}>{l.device_id.slice(0, 12)}...</td>
                    <td style={td}>{l.user_name || '-'}</td>
                    <td style={td}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: radius.sm,
                        fontSize: 11, fontWeight: 500,
                        background: (actionColors[l.action] || colors.textMuted) + '22',
                        color: actionColors[l.action] || colors.textMuted,
                      }}>{l.action}</span>
                    </td>
                    <td style={td}>{l.app_version || '-'}</td>
                    <td style={{ ...td, fontSize: 11, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.detail || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 13, color: colors.textMuted }}>
          <span>Hien thi {logs.length} / {total} log</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={btn('transparent', colors.textSecondary, 'sm')} disabled={page === 0} onClick={() => setPage(p => p - 1)}>Truoc</button>
            <span style={{ padding: '4px 10px', fontSize: 12 }}>Trang {page + 1}</span>
            <button style={btn('transparent', colors.textSecondary, 'sm')} disabled={logs.length < LIMIT} onClick={() => setPage(p => p + 1)}>Sau</button>
          </div>
        </div>
      </div>
    </div>
  )
}
