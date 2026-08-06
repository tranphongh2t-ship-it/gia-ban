import { app, BrowserWindow, protocol, net, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initDatabase, getDb, q, exec, run, saveDb } from './db'
import { startSync, stopSync, addToQueue } from './sync-engine'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

process.env.DIST = path.join(__dirname, '../dist')

let win: BrowserWindow | null = null
const API_BASE = 'https://gia-ban-backend.maketing.workers.dev/api'

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadURL('app://./index.html')
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
])

// IPC Handlers
function setupIpc() {
  // DB queries
  ipcMain.handle('db:query', async (_e, sql: string, params?: any[]) => {
    try { return { data: q(sql, params) } }
    catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:exec', async (_e, sql: string, params?: any[]) => {
    try { return exec(sql, params) }
    catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:run', async (_e, sql: string, params?: any[]) => {
    try { run(sql, params); saveDb(); return { success: true } }
    catch (e: any) { return { error: e.message } }
  })

  // API proxy (online-first, fallback to local)
  async function apiFetch(method: string, url: string, body?: any, headers?: Record<string, string>) {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`
    const opts: any = { method, headers: { 'Content-Type': 'application/json', ...headers } }
    if (body) opts.body = JSON.stringify(body)

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      opts.signal = controller.signal
      const res = await fetch(fullUrl, opts)
      clearTimeout(timeout)
      return { ok: res.ok, status: res.status, data: await res.json() }
    } catch (e: any) {
      return { ok: false, status: 0, error: e.message, offline: true }
    }
  }

  ipcMain.handle('api:get', async (_e, url: string, headers?: Record<string, string>) => {
    return apiFetch('GET', url, undefined, headers)
  })

  ipcMain.handle('api:post', async (_e, url: string, body?: any) => {
    const result = await apiFetch('POST', url, body)
    if (result.offline && win) {
      addToQueue(url, 'post', null, body || {})
      win.webContents.send('sync:queued', { url, body })
    }
    return result
  })

  ipcMain.handle('api:patch', async (_e, url: string, body?: any) => {
    const result = await apiFetch('PATCH', url, body)
    if (result.offline && win) {
      addToQueue(url, 'patch', null, body || {})
      win.webContents.send('sync:queued', { url, body })
    }
    return result
  })

  ipcMain.handle('api:delete', async (_e, url: string) => {
    return apiFetch('DELETE', url)
  })

  // Sync control
  ipcMain.handle('sync:status', async () => {
    const db = getDb()
    if (!db) return { initialized: false }
    const queueCount = q('SELECT COUNT(*) as cnt FROM sync_queue')[0]?.cnt || 0
    return { initialized: true, queueCount, lastSync: 'running' }
  })

  ipcMain.handle('sync:start', async (_e, userId: number, deviceId: string) => {
    startSync(userId, deviceId)
    return { started: true }
  })

  ipcMain.handle('sync:stop', async () => {
    stopSync()
    return { stopped: true }
  })

  // Online status detection
  setInterval(async () => {
    try {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 3000)
      await fetch('https://gia-ban-backend.maketing.workers.dev/api/health', { signal: controller.signal })
      if (win) win.webContents.send('online-status', true)
    } catch {
      if (win) win.webContents.send('online-status', false)
    }
  }, 10000)
}

app.whenReady().then(async () => {
  protocol.handle('app', (request) => {
    let url = request.url.slice(6)
    if (url === '' || url === './') url = 'index.html'
    if (url.startsWith('./')) url = url.slice(2)
    const filePath = path.join(process.env.DIST!, url)
    return net.fetch('file://' + filePath.replace(/\\/g, '/'))
  })

  await initDatabase()
  setupIpc()
  createWindow()
})
