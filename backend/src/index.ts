import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors())

app.get('/api/health', async (c) => {
  return c.json({
    status: 'ok',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  })
})

app.get('/api/db-check', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all()
    return c.json({ tables: result.results })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default app
