import { app, BrowserWindow, protocol, net, ipcMain } from 'electron'
import path from 'node:path'
import { writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { initDatabase, getDb, q, exec, run, saveDb } from './db'
import { startSync, stopSync, addToQueue } from './sync-engine'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
app.setName('THANH THUY PRICE')

process.env.DIST = path.join(__dirname, '../dist')

let win: BrowserWindow | null = null
const API_BASE = 'https://gia-ban-backend.maketing.workers.dev/api'
const APP_VERSION = app.getVersion()

// --- Cập nhật phần mềm (custom checker, Hướng A) ---
let updateInfo: { version: string; url: string; notes: string } | null = null

function compareVersions(a: string, b: string): number {
  const norm = (v: string) => v.replace(/^v/, '').split('.').map((n) => parseInt(n || '0', 10))
  const pa = norm(a)
  const pb = norm(b)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0)
    if (d !== 0) return d > 0 ? 1 : -1
  }
  return 0
}

async function checkForUpdate(): Promise<void> {
  try {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(`${API_BASE}/app/update`, { signal: controller.signal })
    clearTimeout(t)
    if (!res.ok) return
    const data = await res.json()
    if (!data || !data.version) return
    if (compareVersions(data.version, APP_VERSION) > 0) {
      updateInfo = { version: data.version, url: data.url || '', notes: data.notes || '' }
      if (win) win.webContents.send('app:update-available', updateInfo)
    }
  } catch {
    // offline — bỏ qua, lần khác check lại
  }
}

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'THANH THUY PRICE',
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
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

  ipcMain.handle('api:post', async (_e, url: string, body?: any, headers?: Record<string, string>) => {
    const result = await apiFetch('POST', url, body, headers)
    if (result.offline && win) {
      addToQueue(url, 'create', null, body || {})
      win.webContents.send('sync:queued', { url, body })
    }
    return result
  })

  ipcMain.handle('api:patch', async (_e, url: string, body?: any, headers?: Record<string, string>) => {
    const result = await apiFetch('PATCH', url, body, headers)
    if (result.offline && win) {
      addToQueue(url, 'update', null, body || {})
      win.webContents.send('sync:queued', { url, body })
    }
    return result
  })

  ipcMain.handle('api:delete', async (_e, url: string, headers?: Record<string, string>) => {
    return apiFetch('DELETE', url, undefined, headers)
  })

  // Cập nhật phần mềm
  ipcMain.handle('app:check-update', async () => {
    await checkForUpdate()
    return updateInfo
  })

  ipcMain.handle('app:get-update', () => updateInfo)

  ipcMain.handle('app:skip-update', () => {
    updateInfo = null
    return { skipped: true }
  })

  ipcMain.handle('app:install-update', async () => {
    if (!updateInfo || !updateInfo.url) return { ok: false, error: 'Không có link tải' }
    try {
      if (win) win.webContents.send('app:update-progress', { state: 'downloading', percent: 0 })

      // 1) Tải installer về thư mục temp
      const res = await fetch(updateInfo.url)
      if (!res.ok) throw new Error(`Tải thất bại (HTTP ${res.status})`)
      const total = Number(res.headers.get('content-length') || 0)
      const reader = res.body?.getReader()
      if (!reader) throw new Error('Không đọc được dữ liệu tải về')
      const chunks: Uint8Array[] = []
      let received = 0
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          chunks.push(value)
          received += value.length
          if (win && total) {
            win.webContents.send('app:update-progress', {
              state: 'downloading',
              percent: Math.round((received / total) * 100),
            })
          }
        }
      }
      const buf = Buffer.concat(chunks as unknown as Uint8Array[])
      const setupPath = path.join(app.getPath('temp'), 'THANH-THUY-PRICE-Setup-update.exe')
      await writeFile(setupPath, buf)
      if (win) win.webContents.send('app:update-progress', { state: 'installing', percent: 100 })

      // 2) Chạy installer silent (perMachine → cần nâng quyền admin, Windows hỏi UAC 1 lần)
      await new Promise<void>((resolve, reject) => {
        execFile('powershell.exe', ['-NoProfile', '-Command', `Start-Process -FilePath '${setupPath}' -ArgumentList '/S' -Wait -Verb RunAs`], { timeout: 60000 }, (err) => (err ? reject(err) : resolve()))
      })

      // 3) Cài xong → đóng app để dùng bản mới
      if (win) win.webContents.send('app:update-progress', { state: 'done', percent: 100 })
      setTimeout(() => { app.quit() }, 1000)
      return { ok: true, installed: true }
    } catch (e: any) {
      return { ok: false, error: e.message }
    }
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

  // Kiểm tra cập nhật định kỳ (mỗi 6h)
  setInterval(checkForUpdate, 6 * 60 * 60 * 1000)
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
  checkForUpdate()
})
