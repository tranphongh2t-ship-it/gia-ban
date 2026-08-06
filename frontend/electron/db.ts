import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

import { fileURLToPath } from 'node:url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let db: SqlJsDatabase | null = null
let dbPath: string = ''

export function getDbPath() {
  if (!dbPath) {
    dbPath = path.join(app.getPath('userData'), 'giaban-local.db')
  }
  return dbPath
}

export async function initDatabase() {
  const SQL = await initSqlJs({
    locateFile: (file: string) => {
      const p = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file)
      if (fs.existsSync(p)) return p
      return path.join(__dirname, '..', 'dist-electron', file)
    },
  })
  const p = getDbPath()

  if (fs.existsSync(p)) {
    const buf = fs.readFileSync(p)
    db = new SQL.Database(buf)
  } else {
    db = new SQL.Database()
    createTables()
  }

  db!.run('PRAGMA journal_mode=WAL')
  db!.run('PRAGMA foreign_keys=OFF')
  saveDb()
  return db
}

function createTables() {
  if (!db) return

  db.run(`
    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('create','update','delete')),
      row_id INTEGER,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      retries INTEGER DEFAULT 0
    )
  `)
}

export function saveDb() {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(getDbPath(), buffer)
}

export function getDb(): SqlJsDatabase | null {
  return db
}

export function q(sql: string, params?: any[]): any[] {
  if (!db) throw new Error('DB not initialized')
  const stmt = db.prepare(sql)
  if (params) stmt.bind(params)
  const results: any[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

export function exec(sql: string, params?: any[]): { changes: number; lastInsertId?: number } {
  if (!db) throw new Error('DB not initialized')
  const stmt = db.prepare(sql)
  if (params) stmt.bind(params)
  stmt.step()
  stmt.free()
  const changes = db.getRowsModified()
  return { changes }
}

export function run(sql: string, params?: any[]) {
  if (!db) throw new Error('DB not initialized')
  if (params) {
    db.run(sql, params)
  } else {
    db.run(sql)
  }
}
