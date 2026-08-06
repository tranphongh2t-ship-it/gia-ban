import { Hono } from 'hono'
import { removeAccents } from '../helpers/removeAccents'

const app = new Hono<{ Bindings: { DB: D1Database } }>()

// Map Vietnamese module name patterns
const MODULE_TABLES: Record<string, { table: string, genMoTa: (r: any) => string }> = {
  vdo: {
    table: 'bang_gia_chuan_tinh_gia_vdo',
    genMoTa: r => `${r.board_loai} ${r.board_quy_cach} Melamine ${r.color_nhom} ${r.so_mat} mặt Phụ thu ${r.phu_thu_loai}`,
  },
  vmh: {
    table: 'bang_gia_chuan_tinh_gia_vmh',
    genMoTa: r => `${r.board_loai} ${r.board_quy_cach} Melamine ${r.color_nhom} ${r.so_mat} mặt Phụ thu ${r.phu_thu_loai}`,
  },
  gg: {
    table: 'bang_gia_chuan_tinh_gia_gg',
    genMoTa: r => `${r.loai} ${r.quy_cach} ${r.nhom}`,
  },
  ve: {
    table: 'bang_gia_chuan_tinh_gia_ve',
    genMoTa: r => `${r.loai} ${r.quy_cach} ${r.nhom}`,
  },
  osb: {
    table: 'bang_gia_chuan_tinh_gia_osb',
    genMoTa: r => `${r.loai} ${r.do_day} ${r.nhom}`,
  },
  dr: {
    table: 'bang_gia_chuan_tinh_gia_dr',
    genMoTa: r => `${r.loai} ${r.quy_cach} ${r.nhom}`,
  },
  pvc_petg: {
    table: 'bang_gia_chuan_tinh_gia_pvc_petg',
    genMoTa: r => `${r.loai_van} ${r.do_day} ${r.nhom} ${r.ma_mau} ${r.so_mat} mặt`,
  },
  melamine_tonghop: {
    table: 'bang_gia_chuan_tinh_gia_melamine_tonghop',
    genMoTa: r => `${r.bang} ${r.loai_cot} ${r.do_day} Melamine ${r.ma_mau} ${r.so_mat} mặt`,
  },
  acrylic: {
    table: 'bang_gia_chuan_tinh_gia_acrylic',
    genMoTa: r => `${r.board_type} Acrylic ${r.ma_mau} ${r.loai_mau}`,
  },
  one_laminate: {
    table: 'bang_gia_chuan_tinh_gia_one_laminate',
    genMoTa: r => `${r.loai_van} ${r.do_day} OneLaminate ${r.ma_mau} ${r.so_mat} mặt`,
  },
}

// Populate gia_goc_tong_hop from all modules
app.post('/populate', async (c) => {
  try {
    const db = c.env.DB
    await db.prepare('DELETE FROM gia_goc_tong_hop').run()

    let total = 0
    for (const [module, cfg] of Object.entries(MODULE_TABLES)) {
      const { results } = await db.prepare(`SELECT * FROM ${cfg.table}`).all()
      const rows = results as any[]
      const batch: any[] = []
      for (const r of rows) {
        const gia = r.tong_gia ?? r.gia ?? 0
        if (!gia) continue
        const mo_ta = cfg.genMoTa(r)
        const mo_ta_search = removeAccents(mo_ta).toLowerCase()
        batch.push({ module, ref_id: r.id, mo_ta, mo_ta_search, gia_goc: gia })
      }
      // Insert in batches
      for (let i = 0; i < batch.length; i += 100) {
        const chunk = batch.slice(i, i + 100)
        const stmts = chunk.map(row =>
          db.prepare(
            'INSERT INTO gia_goc_tong_hop (module, ref_id, mo_ta, mo_ta_search, gia_goc) VALUES (?, ?, ?, ?, ?)'
          ).bind(row.module, row.ref_id, row.mo_ta, row.mo_ta_search, row.gia_goc)
        )
        await db.batch(stmts)
      }
      total += batch.length
    }
    return c.json({ success: true, total })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})

// Helper: extract searchable tokens from text
function tokenize(text: string): Set<string> {
  const t = removeAccents(text.toLowerCase())
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const stopwords = new Set([
    'van', 'phu', 'mat', 'mm', 'ly', 'kg', 'dh', 'foil', 'cot', 'loai',
    'nhom', 'bang', 'tam', 'tờ', 'cao', 'ki', 'soi', 'ghep', 'ep',
  ])
  return new Set(t.split(' ').filter(w => w.length > 1 && !stopwords.has(w)))
}

function scoreTokens(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const t of a) if (b.has(t)) inter++
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

// Match MISA codes against gia_goc_tong_hop
app.post('/match', async (c) => {
  try {
    const db = c.env.DB

    // Load all search texts
    const [ggthRows, misaRows] = await Promise.all([
      db.prepare('SELECT id, module, mo_ta, mo_ta_search, gia_goc FROM gia_goc_tong_hop').all(),
      db.prepare("SELECT id, ma_sp, ten_sp FROM ma_misa WHERE ten_sp IS NOT NULL AND ten_sp != ''").all(),
    ])
    const ggthList = ggthRows.results as any[]
    const misaList = misaRows.results as any[]

    // Pre-tokenize all ggth entries
    const ggthTokens: { id: number, module: string, mo_ta: string, tokens: Set<string>, gia_goc: number }[] = []
    for (const g of ggthList) {
      ggthTokens.push({ id: g.id, module: g.module, mo_ta: g.mo_ta, tokens: tokenize(g.mo_ta_search), gia_goc: g.gia_goc })
    }

    // For each MISA code, find best match
    const updates: { id: number, score: number, module: string, mo_ta: string, gia_goc: number }[] = []
    let matched = 0
    let unmatched = 0

    for (const m of misaList) {
      const misaTokens = tokenize(m.ten_sp)
      let bestScore = 0
      let best: typeof ggthTokens[0] | null = null

      for (const g of ggthTokens) {
        const score = scoreTokens(misaTokens, g.tokens)
        if (score > bestScore) {
          bestScore = score
          best = g
        }
      }

      if (best && bestScore >= 0.15) {
        updates.push({ id: m.id, score: Math.round(bestScore * 100) / 100, module: best.module, mo_ta: best.mo_ta, gia_goc: best.gia_goc })
        matched++
      } else {
        updates.push({ id: m.id, score: 0, module: '', mo_ta: '', gia_goc: 0 })
        unmatched++
      }
    }

    // Batch update ma_misa
    for (let i = 0; i < updates.length; i += 100) {
      const chunk = updates.slice(i, i + 100)
      const stmts = chunk.map(u =>
        db.prepare(
          "UPDATE ma_misa SET match_status = ?, match_score = ?, match_module = ?, match_mo_ta = ?, gia_goc = ?, match_updated_at = datetime('now','+7 hours') WHERE id = ?"
        ).bind(
          u.score >= 0.15 ? 'matched' : 'unmatched',
          u.score, u.module, u.mo_ta,
          u.score >= 0.15 ? u.gia_goc : null,
          u.id
        )
      )
      await db.batch(stmts)
    }

    return c.json({ success: true, total: misaList.length, matched, unmatched })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500)
  }
})

// Get match stats summary
app.get('/match', async (c) => {
  const db = c.env.DB
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 500)
  const offset = parseInt(c.req.query('offset') || '0')
  const status = c.req.query('status') || ''

  let where = ''
  const params: any[] = []
  if (status === 'matched') { where = 'WHERE match_status = ?'; params.push('matched') }
  else if (status === 'unmatched') { where = "WHERE match_status = 'unmatched'"; params.push('unmatched') }

  const { results } = await db.prepare(
    `SELECT id, ma_sp, ten_sp, gia_goc, match_status, match_score, match_module, match_mo_ta, match_updated_at
     FROM ma_misa ${where} ORDER BY match_score DESC, ma_sp LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all()

  const { results: countResult } = await db.prepare(
    `SELECT COUNT(*) as cnt FROM ma_misa ${where}`
  ).bind(...params).all()

  return c.json({ data: results, total: (countResult as any[])[0]?.cnt || 0 })
})

// Manual override match
app.post('/match/:id/override', async (c) => {
  try {
    const db = c.env.DB
    const id = parseInt(c.req.param('id'))
    const body = await c.req.json()
    if (!body.gia_goc) return c.json({ error: 'Missing gia_goc' }, 400)

    await db.prepare(
      "UPDATE ma_misa SET gia_goc = ?, match_status = 'overridden', match_score = 1, match_module = ?, match_mo_ta = ?, match_updated_at = datetime('now','+7 hours') WHERE id = ?"
    ).bind(body.gia_goc, body.module || 'manual', body.mo_ta || '', id).run()

    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default app
