var BASE = 'https://gia-ban-backend.maketing.workers.dev/api'

var CONFIG = {
  osb: {
    table: 'bang_gia_chuan_tinh_gia_osb',
    searchCols: ['loai', 'do_day'],
    prefixFilter: function(x) { return x.startsWith('TOSB') || x.startsWith('OSB') },
    onlyGiagoc: true,
  },
  vdo: {
    table: 'bang_gia_chuan_tinh_gia_vdo',
    searchCols: ['board_loai', 'board_quy_cach', 'color_nhom', 'so_mat'],
    prefixFilter: function(x) { return x.startsWith('ME') },
    onlyGiagoc: false,
  },
  vmh: {
    table: 'bang_gia_chuan_tinh_gia_vmh',
    searchCols: ['board_loai', 'board_quy_cach', 'color_nhom', 'so_mat'],
    prefixFilter: function(x) { return x.startsWith('ME') },
    onlyGiagoc: false,
  },
  gg: {
    table: 'bang_gia_chuan_tinh_gia_gg',
    searchCols: ['loai', 'quy_cach', 'nhom'],
    prefixFilter: function(x) { return x.startsWith('GG') || x.startsWith('TGG') },
    onlyGiagoc: false,
  },
  ve: {
    table: 'bang_gia_chuan_tinh_gia_ve',
    searchCols: ['loai', 'quy_cach', 'nhom'],
    prefixFilter: function(x) { return x.startsWith('VE') || x.startsWith('TVE') },
    onlyGiagoc: false,
  },
  dr: {
    table: 'bang_gia_chuan_tinh_gia_dr',
    searchCols: ['loai', 'quy_cach', 'nhom'],
    prefixFilter: function(x) { return x.startsWith('DR') || x.startsWith('TDR') },
    onlyGiagoc: false,
  },
  pvc_petg: {
    table: 'bang_gia_chuan_tinh_gia_pvc_petg',
    searchCols: ['loai_van', 'do_day', 'ma_mau', 'nhom', 'so_mat'],
    prefixFilter: function(x) { return x.startsWith('NP') || x.startsWith('PVC') || x.startsWith('PETG') },
    onlyGiagoc: false,
  },
  melamine_tonghop: {
    table: 'bang_gia_chuan_tinh_gia_melamine_tonghop',
    searchCols: ['bang', 'loai_cot', 'do_day', 'ma_mau', 'so_mat'],
    prefixFilter: function(x) { return x.startsWith('ME') },
    onlyGiagoc: false,
  },
  acrylic: {
    table: 'bang_gia_chuan_tinh_gia_acrylic',
    searchCols: ['board_type', 'ma_mau', 'loai_mau'],
    prefixFilter: function(x) { return x.startsWith('AC') || x.startsWith('NA') },
    onlyGiagoc: false,
  },
  one_laminate: {
    table: 'bang_gia_chuan_tinh_gia_one_laminate',
    searchCols: ['loai_van', 'do_day', 'ma_mau', 'nhom', 'so_mat'],
    prefixFilter: function(x) { return x.startsWith('NL') || x.startsWith('LE') || x.startsWith('LP') },
    onlyGiagoc: false,
  },
}

function tokenize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9àáâãèéêìíòóôõùúăđĩũơưạảấầẩậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/g, ' ')
    .split(/\s+/)
    .filter(function(t) { return t.length > 1 && !['mm', 'x', 't'].includes(t) })
}

function tokenOverlap(a, b) {
  var ta = tokenize(a), tb = tokenize(b)
  if (ta.length === 0 || tb.length === 0) return 0
  var setB = new Set(tb)
  var matches = ta.filter(function(t) { return setB.has(t) }).length
  return matches / Math.min(ta.length, tb.length)
}

async function main() {
  console.log('Fetching MISA products...')
  var allMm = []
  for (var off = 0; off < 27000; off += 1000) {
    var r = await (await fetch(BASE + '/bang-gia-new/ma-misa?limit=1000&offset=' + off)).json()
    var d = r.data || []; if (d.length === 0) break; Array.prototype.push.apply(allMm, d)
  }
  console.log('  ' + allMm.length + ' MISA products')

  var misaWithDesc = allMm.filter(function(m) { return m.ten_sp && m.ten_sp !== 'Ten' && m.ten_sp.length > 5 })
  console.log('  ' + misaWithDesc.length + ' with valid descriptions')

  var modKeys = Object.keys(CONFIG)
  for (var mi = 0; mi < modKeys.length; mi++) {
    var mod = modKeys[mi]
    var cfg = CONFIG[mod]

    var sql = encodeURIComponent("SELECT * FROM " + cfg.table + " WHERE (ma_sp IS NULL OR ma_sp = '')")
    var res = await fetch(BASE + '/gia-chuan/query?sql=' + sql)
    var json = await res.json()
    var rows = json.results
    if (!rows || rows.length === 0) { console.log('  ' + mod + ': All rows have ma_sp'); continue }

    if (cfg.onlyGiagoc) {
      var filtered = rows.filter(function(r) { return r.nhom === 'Giá gốc' || (r.nhom && r.nhom.indexOf('Giá gốc') >= 0) })
      rows = filtered
      if (rows.length === 0) { console.log('  ' + mod + ': No Giá gốc rows to match'); continue }
    }

    var misaPool = misaWithDesc.filter(function(m) { return cfg.prefixFilter(m.ma_sp) })
    if (misaPool.length === 0) { console.log('  ' + mod + ': No MISA products'); continue }

    console.log('  ' + mod + ': ' + rows.length + ' rows to match vs ' + misaPool.length + ' MISA products')

    var assignments = []

    for (var ri = 0; ri < rows.length; ri++) {
      var row = rows[ri]
      var searchStr = cfg.searchCols.map(function(c) { return row[c] || '' }).join(' ').trim()
      if (!searchStr) continue

      var best = null
      var bestScore = 0

      for (var mj = 0; mj < misaPool.length; mj++) {
        var m = misaPool[mj]
        var desc = m.ma_sp + ' ' + m.ten_sp + ' ' + (m.match_mo_ta || '')
        var score = tokenOverlap(searchStr, desc)
        if (score > bestScore) { bestScore = score; best = m }
      }

      if (best && bestScore >= 0.30) {
        assignments.push({ id: row.id, ma_sp: best.ma_sp, ten_sp: best.ten_sp || best.ma_sp, score: bestScore, searchStr: searchStr })
      }
    }

    console.log('  ' + mod + ': Matched ' + assignments.length + '/' + rows.length + ' (>=0.30)')

    if (assignments.length > 0) {
      var steps = [0.20, 0.30, 0.40, 0.50, 0.60, 0.70]
      for (var si = 0; si < steps.length; si++) {
        var cnt = 0
        for (var ai = 0; ai < assignments.length; ai++) { if (assignments[ai].score >= steps[si]) cnt++ }
        console.log('    >=' + steps[si].toFixed(2) + ': ' + cnt)
      }

      var payload = []
      for (var ai = 0; ai < assignments.length; ai++) {
        payload.push({ id: assignments[ai].id, ma_sp: assignments[ai].ma_sp, ten_sp: assignments[ai].ten_sp })
      }
      for (var pi = 0; pi < payload.length; pi += 100) {
        var chunk = payload.slice(pi, pi + 100)
        var upRes = await fetch(BASE + '/gia-chuan/gia-goc-tong-hop/update-ma-sp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: cfg.table, rows: chunk }),
        })
        var upData = await upRes.json()
        if (!upData.success) console.error('    Upload error: ' + upData.error)
      }
      console.log('    Uploaded: ' + payload.length)
    }
  }

  console.log('\n=== DONE ===')
}

main().catch(function(e) { console.error(e); process.exit(1) })
