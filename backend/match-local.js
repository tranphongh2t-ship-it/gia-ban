const fs = require('fs')
const BASE = 'https://gia-ban-backend.maketing.workers.dev/api/gia-chuan/gia-goc-tong-hop'

const ggthData = JSON.parse(fs.readFileSync('C:/Users/thanhthuyktt/Desktop/CODE/Web/ggth.json', 'utf8'))
console.log('ggth items:', ggthData.length)

const misaData = JSON.parse(fs.readFileSync('C:/Users/thanhthuyktt/Desktop/CODE/Web/misa.json', 'utf8'))
console.log('MISA items:', misaData.length)

// Pre-tokenize ggth
const ggthTokens = ggthData.map(g => ({
  id: g.id, module: g.module, mo_ta: g.mo_ta, gia_goc: g.gia_goc,
  tokens: tokenize(g.mo_ta_search),
}))

// Build token index
const tokenIndex = new Map()
for (let i = 0; i < ggthTokens.length; i++) {
  for (const t of ggthTokens[i].tokens) {
    let arr = tokenIndex.get(t)
    if (!arr) { arr = []; tokenIndex.set(t, arr) }
    if (arr[arr.length - 1] !== i) arr.push(i)
  }
}

// Match in batches of 1000 and POST results
const BATCH = 1000
let totalMatched = 0
let totalUnmatched = 0

;(async () => {
  for (let offset = 0; offset < misaData.length; offset += BATCH) {
    const chunk = misaData.slice(offset, offset + BATCH)
    const results = chunk.map(m => {
      const misaTokens = tokenize(m.ten_sp)
      if (misaTokens.size === 0) return { id: m.id, score: 0, module: '', mo_ta: '', gia_goc: 0, matched: false }

      const candidateSet = new Set()
      for (const t of misaTokens) {
        const indices = tokenIndex.get(t)
        if (indices) for (const idx of indices) candidateSet.add(idx)
      }

      let bestScore = 0, best = null
      for (const idx of candidateSet) {
        const g = ggthTokens[idx]
        const score = scoreTokens(misaTokens, g.tokens)
        if (score > bestScore) { bestScore = score; best = g }
      }

      if (best && bestScore >= 0.15) {
        return { id: m.id, score: Math.round(bestScore * 100) / 100, module: best.module, mo_ta: best.mo_ta, gia_goc: best.gia_goc, matched: true }
      }
      return { id: m.id, score: 0, module: '', mo_ta: '', gia_goc: 0, matched: false }
    })

    const matched = results.filter(r => r.matched).length
    totalMatched += matched
    totalUnmatched += results.length - matched
    console.log(`Batch ${offset / BATCH + 1}/${Math.ceil(misaData.length / BATCH)}: ${results.length} items, matched: ${matched}`)

    const uploadRes = await fetch(`${BASE}/match-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results }),
    })
    const uploadData = await uploadRes.json()
    if (!uploadData.success) { console.error('Upload error:', uploadData); process.exit(1) }
  }

  console.log(`\nDONE! Total matched: ${totalMatched}, unmatched: ${totalUnmatched} (out of ${misaData.length})`)
})().catch(e => { console.error(e); process.exit(1) })

function removeAccents(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function tokenize(text) {
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

function scoreTokens(a, b) {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const t of a) if (b.has(t)) inter++
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}
