import { getDb, q, run, saveDb } from './db'

const API_BASE = 'https://gia-ban-backend.maketing.workers.dev/api'
// 5 phút/lần (trước 30s) — tránh làm quá tải D1 khi nhiều máy cùng chạy
const SYNC_INTERVAL = 300000
const PULL_LIMIT = 2000

let intervalTimer: ReturnType<typeof setInterval> | null = null
let isSyncing = false
let userId = 0
let deviceId = ''
let lastPullTime = ''

export function startSync(uid: number, did: string) {
  userId = uid
  deviceId = did
  loadMeta()
  if (intervalTimer) clearInterval(intervalTimer)
  intervalTimer = setInterval(doSync, SYNC_INTERVAL)
  doSync()
}

export function stopSync() {
  if (intervalTimer) {
    clearInterval(intervalTimer)
    intervalTimer = null
  }
}

function loadMeta() {
  const rows = q("SELECT key, value FROM sync_meta")
  for (const r of rows) {
    if (r.key === 'last_pull_time') lastPullTime = r.value
  }
}

async function doSync() {
  if (isSyncing) return
  isSyncing = true
  try {
    await pushChanges()
    await pullChanges()
  } catch (e) {
    console.error('Sync error:', e)
  } finally {
    isSyncing = false
  }
}

async function pushChanges() {
  const changes = q(
    "SELECT * FROM sync_queue ORDER BY id LIMIT 100"
  )
  if (changes.length === 0) return

  const payload = {
    changes: changes.map((c: any) => ({
      table: c.table_name,
      action: c.action,
      row_id: c.row_id,
      payload: JSON.parse(c.payload),
      updated_at: c.created_at,
      updated_by: String(userId),
    })),
    user_id: userId,
    device_id: deviceId,
  }

  try {
    const res = await fetch(`${API_BASE}/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`Push failed: ${res.status}`)
    const result = await res.json()

    const ids = changes.map((c: any) => c.id)
    if (ids.length > 0) {
      run(`DELETE FROM sync_queue WHERE id IN (${ids.map(() => '?').join(',')})`, ids)
      saveDb()
    }
  } catch (e) {
    console.error('Push error:', e)
    // Retry next cycle
  }
}

async function pullChanges() {
  const url = `${API_BASE}/sync/pull?since=${encodeURIComponent(lastPullTime || '1970-01-01')}&user_id=${userId}&limit=${PULL_LIMIT}`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Pull failed: ${res.status}`)
    const result = await res.json()

    if (result.changes?.length > 0) {
      const db = getDb()
      if (!db) return

      db.run('BEGIN TRANSACTION')
      try {
        for (const ch of result.changes) {
          const row = ch.row
          const table = ch.table
          const localTable = `${table}_local`
          const cols = Object.keys(row).filter(k => k !== 'sync_action')

          // Create local table dynamically if not exists
          if (cols.length > 0) {
            const colDefs = cols.map(k => {
              const v = row[k]
              let type = 'TEXT'
              if (typeof v === 'number') type = Number.isInteger(v) ? 'INTEGER' : 'REAL'
              return `"${k}" ${type}`
            }).join(', ')
            db.run(`CREATE TABLE IF NOT EXISTS ${localTable} (${colDefs})`)
          }

          if (row.sync_action === 'delete') {
            db.run(`DELETE FROM ${localTable} WHERE id = ?`, [row.id])
          } else {
            const existing = q(`SELECT id FROM ${localTable} WHERE id = ?`, [row.id])
            const placeholders = cols.map(() => '?').join(', ')
            const colNames = cols.join(', ')

            if (existing.length > 0) {
              const setClause = cols.map(k => `${k} = ?`).join(', ')
              const vals = cols.map(k => row[k])
              vals.push(row.id)
              db.run(`UPDATE ${localTable} SET ${setClause} WHERE id = ?`, vals)
            } else {
              const vals = cols.map(k => row[k])
              db.run(`INSERT INTO ${localTable} (${colNames}) VALUES (${placeholders})`, vals)
            }
          }
        }
        db.run('COMMIT')
      } catch (e) {
        db.run('ROLLBACK')
        throw e
      }

      const lastChange = result.changes[result.changes.length - 1]
      lastPullTime = lastChange.row.updated_at || result.server_time
      run("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_pull_time', ?)", [lastPullTime])
      saveDb()
    }
  } catch (e) {
    console.error('Pull error:', e)
  }
}

export function addToQueue(table: string, action: string, rowId: number | null, payload: Record<string, any>) {
  run(
    "INSERT INTO sync_queue (table_name, action, row_id, payload) VALUES (?, ?, ?, ?)",
    [table, action, rowId, JSON.stringify(payload)]
  )
  saveDb()
}
