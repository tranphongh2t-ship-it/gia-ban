import { useState, useEffect } from 'react'

const API_BASE = '/api'

function App() {
  const [status, setStatus] = useState<string>('connecting...')
  const [tables, setTables] = useState<string[]>([])

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((r) => r.json())
      .then((d) => setStatus(d.status))
      .catch(() => setStatus('offline'))

    fetch(`${API_BASE}/db-check`)
      .then((r) => r.json())
      .then((d) => setTables((d.tables || []).map((t: any) => t.name)))
      .catch(() => {})
  }, [])

  return (
    <div style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Giá Bán Mới</h1>
      <p>
        Backend: <strong>{status}</strong>
      </p>
      {tables.length > 0 && (
        <div>
          <p>Tables ({tables.length}):</p>
          <ul>
            {tables.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default App
