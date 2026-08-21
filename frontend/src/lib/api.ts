export const API_BASE = import.meta.env.DEV ? '/api' : 'https://gia-ban-backend.maketing.workers.dev/api'

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

const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron

// Tự gắn x-user-id (nếu đã đăng nhập) vào mọi request — để backend biết ai đang truy cập.
export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  try {
    const u = JSON.parse(localStorage.getItem('auth_user') || 'null')
    if (u?.id) return { 'x-user-id': String(u.id), ...(extra || {}) }
  } catch { /* ignore */ }
  return { ...(extra || {}) }
}

export async function apiGet(path: string, headers?: Record<string, string>) {
  if (isElectron) {
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
  if (isElectron) {
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
  if (isElectron) {
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
  if (isElectron) {
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
  if (isElectron) {
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
