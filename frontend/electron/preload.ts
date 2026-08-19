import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,

  // DB queries
  dbQuery: (sql: string, params?: any[]) => ipcRenderer.invoke('db:query', sql, params),
  dbExec: (sql: string, params?: any[]) => ipcRenderer.invoke('db:exec', sql, params),
  dbRun: (sql: string, params?: any[]) => ipcRenderer.invoke('db:run', sql, params),

  // API proxy (online-first, fallback to local)
  apiGet: (url: string, headers?: Record<string, string>) => ipcRenderer.invoke('api:get', url, headers),
  apiPost: (url: string, body?: any, headers?: Record<string, string>) => ipcRenderer.invoke('api:post', url, body, headers),
  apiPatch: (url: string, body?: any, headers?: Record<string, string>) => ipcRenderer.invoke('api:patch', url, body, headers),
  apiDelete: (url: string, headers?: Record<string, string>) => ipcRenderer.invoke('api:delete', url, headers),

  // Sync control
  syncStatus: () => ipcRenderer.invoke('sync:status'),
  startSync: (userId: number, deviceId: string) => ipcRenderer.invoke('sync:start', userId, deviceId),
  stopSync: () => ipcRenderer.invoke('sync:stop'),

  // Online status
  onOnlineStatus: (cb: (online: boolean) => void) => {
    ipcRenderer.on('online-status', (_e, status) => cb(status))
  },

  // Cập nhật phần mềm
  checkUpdate: () => ipcRenderer.invoke('app:check-update'),
  getUpdate: () => ipcRenderer.invoke('app:get-update'),
  skipUpdate: () => ipcRenderer.invoke('app:skip-update'),
  installUpdate: () => ipcRenderer.invoke('app:install-update'),
  onUpdateAvailable: (cb: (info: { version: string; url: string; notes: string }) => void) => {
    ipcRenderer.on('app:update-available', (_e, info) => cb(info))
  },
  onUpdateProgress: (cb: (p: { state: string; percent: number }) => void) => {
    ipcRenderer.on('app:update-progress', (_e, p) => cb(p))
  },
})
