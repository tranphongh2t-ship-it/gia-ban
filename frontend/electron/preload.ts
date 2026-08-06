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
  apiPost: (url: string, body?: any) => ipcRenderer.invoke('api:post', url, body),
  apiPatch: (url: string, body?: any) => ipcRenderer.invoke('api:patch', url, body),
  apiDelete: (url: string) => ipcRenderer.invoke('api:delete', url),

  // Sync control
  syncStatus: () => ipcRenderer.invoke('sync:status'),
  startSync: (userId: number, deviceId: string) => ipcRenderer.invoke('sync:start', userId, deviceId),
  stopSync: () => ipcRenderer.invoke('sync:stop'),

  // Online status
  onOnlineStatus: (cb: (online: boolean) => void) => {
    ipcRenderer.on('online-status', (_e, status) => cb(status))
  },
})
