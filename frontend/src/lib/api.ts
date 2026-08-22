export const API_BASE = 'https://gia-ban-backend.maketing.workers.dev/api'

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean
      apiGet: (url: string, headers?: Record<string, string>) => Promise<any>
      apiPost: (url: string, body?: any, headers?: Record<string, string>) => Promise<any>
      apiPatch: (url: string, body?: any, headers?: Record<string, string>) => Promise<any>
      apiDelete: (url: string, headers?: Record<string, string>) => Promise<any>
      dbQuery: (sql: string, params?: any[]) => Promise<any>
      dbExec: (sql: string, params?: any[]) => Promise<any>
      dbRun: (sql: string, params?: any[]) => Promise<any>
      syncStatus: () => Promise<any>
      startSync: (userId: number, deviceId: string) => Promise<any>
      stopSync: () => Promise<any>
    }
  }
}

// ─── Tauri detection ─────────────────────────────────────────────
let tauriInvoke: ((cmd: string, args?: Record<string, any>) => Promise<any>) | null = null
let _isTauri = false

if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
  _isTauri = true
}

export function isTauriApp(): boolean {
  return _isTauri
}

async function getTauriInvoke() {
  if (tauriInvoke) return tauriInvoke
  if (!_isTauri) return null
  try {
    const core = await import('@tauri-apps/api/core')
    tauriInvoke = core.invoke
    return tauriInvoke
  } catch {
    return null
  }
}

function isElectronApp(): boolean {
  return !!(window as any).electronAPI?.isElectron
}

export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  try {
    const u = JSON.parse(localStorage.getItem('auth_user') || 'null')
    if (u?.id) return { 'x-user-id': String(u.id), ...(extra || {}) }
  } catch { /* ignore */ }
  return { ...(extra || {}) }
}

// ─── Offline state ───────────────────────────────────────────────
let _isOnline = true
let _localReady = false

export function isOnline(): boolean { return _isOnline }
export function setOnline(v: boolean) { _isOnline = v }
export function isLocalReady(): boolean { return _localReady }
export function setLocalReady(v: boolean) { _localReady = v }

// Tables available offline (must match SYNC_TABLES in offline.rs)
const OFFLINE_TABLES = new Set([
  // Core master data
  'khach-hang', 'ma-misa', 'phu-thu', 'phan-bo-kh',
  // Price tables
  'bang-gia-ck', 'bang-gia-cot-go', 'bang-gia-nhom-mau', 'bang-gia-ma-mau',
  'gia-ban', 'bang-gia-veneers', 'bang-gia-chi', 'bang-gia-keo-nong',
  'bang-gia-acrylic-foil', 'bang-gia-van-phu-acrylic', 'bang-gia-laminate-one',
  'bang-gia-pvc-film', 'bang-gia-van-phu-pvc', 'bang-gia-nhua-pvc',
  'bang-gia-nhua-phu-mau', 'bang-gia-nhua-laminate', 'bang-gia-osb-laminate',
  // Sales data
  'so-chi-tiet-ban-hang', 'don-hang-excel',
  // Audit tables
  'so-doi-chieu', 'check-chiet-khau', 'check-gia-goc-ck',
  // CK calculation tables
  'khach-theo-thang', 'ck-op1', 'ck-op2', 'op2-bac-thang',
  'policy-rules', 'ck-van-chuyen', 'ma-hang-nhom-mau',
  'policy-revenue-tiers', 'monthly-summary',
  // Customer list
  'danh-sach-khach',
])

function canServeOffline(path: string): boolean {
  const table = path.trim().split('?')[0].replace(/^\//, '')
  // Direct table read or list — can serve offline
  if (OFFLINE_TABLES.has(table)) return true
  // Sub-paths like /khach-hang/123 are also table reads
  const root = table.split('/')[0]
  if (OFFLINE_TABLES.has(root)) return true
  return false
}

// ─── Listen for Tauri events (call once on app start) ────────────
export function initOfflineListener() {
  if (!_isTauri) return
  try {
    // @ts-ignore
    window.__TAURI__?.event?.listen?.('online-status', (e: any) => {
      const wasOffline = !_isOnline
      _isOnline = !!e.payload
      // When coming back online, trigger sync of pending imports
      if (wasOffline && _isOnline) {
        triggerSyncPendingImports()
      }
    })
    // @ts-ignore
    window.__TAURI__?.event?.listen?.('sync:local-ready', () => {
      _localReady = true
    })
  } catch { /* ignore */ }
}

// ─── Trigger sync of pending imports when coming back online ─────
async function triggerSyncPendingImports() {
  if (!_isTauri) return
  try {
    const invoke = await getTauriInvoke()
    if (!invoke) return
    // Check if sync is running, if not start it
    const status = await invoke('sync_status')
    if (!status?.running) {
      const user = JSON.parse(localStorage.getItem('auth_user') || 'null')
      if (user?.id) {
        const deviceId = localStorage.getItem('tt_device_id') || 'web-' + Math.random().toString(36).slice(2, 10)
        await invoke('start_sync', { userId: user.id, deviceId })
      }
    }
  } catch { /* best effort */ }
}

// ─── Save File (Tauri) ──────────────────────────────────────────
export async function tauriSaveFile(filename: string, data: Uint8Array): Promise<string | null> {
  const invoke = await getTauriInvoke()
  if (!invoke) return null
  return invoke('save_file', { filename, data: Array.from(data) })
}

export async function tauriTestDialog(): Promise<string> {
  const invoke = await getTauriInvoke()
  if (!invoke) throw new Error('Not in Tauri')
  return invoke('test_dialog')
}

// ─── Log Device Activity ────────────────────────────────────────
function getDeviceId(): string {
  try {
    let id = localStorage.getItem('tt_device_id')
    if (!id) {
      id = 'web-' + Math.random().toString(36).slice(2, 10)
      localStorage.setItem('tt_device_id', id)
    }
    return id
  } catch { return 'unknown' }
}

export async function logDeviceActivity(action: string, detail?: string) {
  const user = JSON.parse(localStorage.getItem('auth_user') || 'null')
  const deviceId = getDeviceId()
  const body = {
    device_id: deviceId,
    user_name: user?.ten || null,
    user_id: user?.id || null,
    action,
    detail: detail || null,
    app_version: 'web',
  }
  try {
    if (_isTauri) {
      const invoke = await getTauriInvoke()
      if (invoke) {
        await invoke('log_activity', {
          device_id: deviceId,
          user_name: user?.ten || null,
          user_id: user?.id || null,
          action,
          detail: detail || null,
        })
        return
      }
    }
    await fetch(`${API_BASE}/device-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch { /* best effort */ }
}

// ─── API GET — with offline fallback ─────────────────────────────
export async function apiGet(path: string, headers?: Record<string, string>) {
  const invoke = await getTauriInvoke()
  if (invoke) {
    // If offline AND local data ready AND table is syncable → read local
    if (!_isOnline && _localReady && canServeOffline(path)) {
      const table = path.trim().split('?')[0].replace(/^\//, '')
      // Parse query params for search/limit/offset
      const params = new URLSearchParams(path.includes('?') ? path.split('?')[1] : '')
      const search = params.get('search') || undefined
      const limit = params.has('limit') ? Number(params.get('limit')) : undefined
      const offset = params.has('offset') ? Number(params.get('offset')) : undefined
      const r = await invoke('local_query', { table, search, limit, offset })
      return r
    }
    // Online: try API, fallback to local on network error
    try {
      const r = await invoke('api_get', { url: path, headers: authHeaders(headers) })
      if (r?.error) throw new Error(r.error)
      return r
    } catch (err) {
      // If network error AND table is syncable → fallback to local
      if (canServeOffline(path)) {
        const table = path.trim().split('?')[0].replace(/^\//, '')
        const params = new URLSearchParams(path.includes('?') ? path.split('?')[1] : '')
        const search = params.get('search') || undefined
        const limit = params.has('limit') ? Number(params.get('limit')) : undefined
        const offset = params.has('offset') ? Number(params.get('offset')) : undefined
        return await invoke('local_query', { table, search, limit, offset })
      }
      throw err
    }
  }
  if (isElectronApp()) {
    const r = await window.electronAPI!.apiGet(path, authHeaders(headers))
    if (!r.ok) throw new Error(r.data?.error || `HTTP ${r.status}`)
    return r.data
  }
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders(headers) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── API POST ────────────────────────────────────────────────────
export async function apiPost(path: string, body: unknown, headers?: Record<string, string>) {
  const invoke = await getTauriInvoke()
  if (invoke) {
    const r = await invoke('api_post', { url: path, body, headers: authHeaders(headers) })
    if (r?.error) throw new Error(r.error)
    return r
  }
  if (isElectronApp()) {
    const r = await window.electronAPI!.apiPost(path, body, authHeaders(headers))
    if (!r.ok) throw new Error(r.data?.error || `HTTP ${r.status}`)
    return r.data
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(headers) },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── API POST — offline-aware: save to local SQLite first, then try sync ──
export async function apiPostOffline(path: string, body: unknown, options?: {
  table?: string
  keyFields?: string[]
  headers?: Record<string, string>
}) {
  const invoke = await getTauriInvoke()
  if (invoke) {
    if (options?.table && options?.keyFields) {
      // ALWAYS save to local SQLite (works both online & offline)
      const records = Array.isArray(body) ? body : (body as any)?.records || [body]
      const r = await invoke('local_import_rows', {
        table: options.table,
        records,
        keyFields: options.keyFields,
        user_name: JSON.parse(localStorage.getItem('auth_user') || 'null')?.ten || null,
      })
      // Also try push to backend (best-effort, don't block on failure)
      if (_isOnline) {
        try {
          const r2 = await invoke('api_post', { url: path, body, headers: authHeaders(options?.headers) })
          // Backend accepted — good
        } catch { /* offline or error — data already saved locally */ }
      }
      return r
    }
    // No table info → normal API call
    const r = await invoke('api_post', { url: path, body, headers: authHeaders(options?.headers) })
    if (r?.error) throw new Error(r.error)
    return r
  }
  // Browser fallback
  return apiPost(path, body, options?.headers)
}

// ─── API PUT ─────────────────────────────────────────────────────
export async function apiPut(path: string, body: unknown, headers?: Record<string, string>) {
  const invoke = await getTauriInvoke()
  if (invoke) {
    const r = await invoke('api_patch', { url: path, body, headers: authHeaders(headers) })
    if (r?.error) throw new Error(r.error)
    return r
  }
  if (isElectronApp()) {
    const r = await window.electronAPI!.apiPatch(path, body, authHeaders(headers))
    if (!r.ok) throw new Error(r.data?.error || `HTTP ${r.status}`)
    return r.data
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(headers) },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── API PATCH ───────────────────────────────────────────────────
export async function apiPatch(path: string, body: unknown, headers?: Record<string, string>) {
  const invoke = await getTauriInvoke()
  if (invoke) {
    const r = await invoke('api_patch', { url: path, body, headers: authHeaders(headers) })
    if (r?.error) throw new Error(r.error)
    return r
  }
  if (isElectronApp()) {
    const r = await window.electronAPI!.apiPatch(path, body, authHeaders(headers))
    if (!r.ok) throw new Error(r.data?.error || `HTTP ${r.status}`)
    return r.data
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(headers) },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── API DELETE ──────────────────────────────────────────────────
export async function apiDelete(path: string, headers?: Record<string, string>) {
  const invoke = await getTauriInvoke()
  if (invoke) {
    const r = await invoke('api_delete', { url: path, headers: authHeaders(headers) })
    if (r?.error) throw new Error(r.error)
    return r
  }
  if (isElectronApp()) {
    const r = await window.electronAPI!.apiDelete(path, authHeaders(headers))
    if (!r.ok) throw new Error(r.data?.error || `HTTP ${r.status}`)
    return r.data
  }
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers: authHeaders(headers) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}
