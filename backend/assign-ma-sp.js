const BASE = 'https://gia-ban-backend.maketing.workers.dev/api'

const MODULE_TABLE_MAP = {
  vdo: 'bang_gia_chuan_tinh_gia_vdo',
  vmh: 'bang_gia_chuan_tinh_gia_vmh',
  gg: 'bang_gia_chuan_tinh_gia_gg',
  ve: 'bang_gia_chuan_tinh_gia_ve',
  osb: 'bang_gia_chuan_tinh_gia_osb',
  dr: 'bang_gia_chuan_tinh_gia_dr',
  pvc_petg: 'bang_gia_chuan_tinh_gia_pvc_petg',
  melamine_tonghop: 'bang_gia_chuan_tinh_gia_melamine_tonghop',
  acrylic: 'bang_gia_chuan_tinh_gia_acrylic',
  one_laminate: 'bang_gia_chuan_tinh_gia_one_laminate',
  mirror: 'bang_gia_chuan_mirror',
  keo_hat: 'bang_gia_chuan_keo_hat',
}

async function main() {
  // 1. Load ALL ggth data
  console.log('Fetching ggth data...')
  const ggthRes = await fetch(`${BASE}/gia-chuan/gia-goc-tong-hop/ggth-all`)
  const ggthData = JSON.parse(await ggthRes.text())
  console.log(`  ${ggthData.length} rows`)

  // Group ggth by module
  const ggthByModule = {}
  for (const g of ggthData) {
    if (!ggthByModule[g.module]) ggthByModule[g.module] = []
    ggthByModule[g.module].push(g)
  }

  // 2. Load ALL ma_misa
  console.log('Fetching ma_misa...')
  let allMm = []
  for (let off = 0; off < 27000; off += 1000) {
    const r = await (await fetch(`${BASE}/bang-gia-new/ma-misa?limit=1000&offset=${off}`)).json()
    const d = r.data || []; if (d.length === 0) break; allMm.push(...d)
  }
  console.log(`  ${allMm.length} rows`)

  const matchedMisa = allMm.filter(m => m.match_module && m.gia_goc > 0)
  console.log(`  With match_module + gia_goc: ${matchedMisa.length}`)

  // 3. For each MISA product, find ggth row with same module + price, then link ref_id → tinh_gia row
  // Build index: module+gia_goc → best MISA product (highest match_score)
  const misaIndex = {}
  for (const m of matchedMisa) {
    const key = m.match_module + ':' + m.gia_goc
    if (!misaIndex[key] || (m.match_score || 0) > (misaIndex[key].match_score || 0)) {
      misaIndex[key] = m
    }
  }
  console.log(`Unique (module+price) combinations: ${Object.keys(misaIndex).length}`)

  // For each ggth row, look up the best MISA product
  const updates = {}
  let assigned = 0, skipped = 0

  for (const g of ggthData) {
    if (!g.ref_id) continue
    const table = MODULE_TABLE_MAP[g.module]
    if (!table) continue

    const key = g.module + ':' + g.gia_goc
    const best = misaIndex[key]
    if (!best) continue

    if (updates[table]?.[g.ref_id]) { skipped++; continue }
    if (!updates[table]) updates[table] = {}
    updates[table][g.ref_id] = { id: g.ref_id, ma_sp: best.ma_sp, ten_sp: best.ten_sp || best.ma_sp }
    assigned++
  }

  console.log(`\nAssignments: ${assigned} unique rows (${skipped} duplicates skipped)`)

  // 4. Upload
  let uploaded = 0
  for (const [table, rows] of Object.entries(updates)) {
    const list = Object.values(rows)
    console.log(`Uploading ${list.length} to ${table}...`)
    for (let i = 0; i < list.length; i += 100) {
      const chunk = list.slice(i, i + 100)
      const res = await fetch(`${BASE}/gia-chuan/gia-goc-tong-hop/update-ma-sp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, rows: chunk }),
      })
      const data = await res.json()
      if (data.success) uploaded += chunk.length
      else console.error(`  Error: ${data.error}`)
    }
  }

  console.log(`\n=== DONE ===`)
  console.log(`Assigned: ${assigned}`)
  console.log(`Uploaded: ${uploaded}`)
}

main().catch(e => { console.error(e); process.exit(1) })
