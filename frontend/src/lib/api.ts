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

// Detect Tauri via @tauri-apps/api
let tauriInvoke: ((cmd: string, args?: Record<string, any>) => Promise<any>) | null = null
let _isTauri = false

// Use __TAURI_INTERNALS__ for fast detection (injected by Tauri at page load)
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

export async function apiGet(path: string, headers?: Record<string, string>) {
  const invoke = await getTauriInvoke()
  if (invoke) {
    const r = await invoke('api_get', { url: path, headers: authHeaders(headers) })
    if (r?.error) throw new Error(r.error)
    return r
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
