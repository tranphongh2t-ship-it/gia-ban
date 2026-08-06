const XLSX = require('xlsx')
const fs = require('fs')
const wb = XLSX.readFile('C:/Users/thanhthuyktt/Desktop/CODE/Web/FILE GIÁ CHUẨN.xlsx')

function esc(s) { return s.replace(/'/g, "''") }

const rows = []

// ====== Tab 1: MDF-VÁN NHỰA MIRROR ======
const ws1 = wb.Sheets['MDF-VÁN NHỰA MIRROR']
const raw1 = XLSX.utils.sheet_to_json(ws1, { header: 1, defval: '' })

// MDF kháng ẩm (rows 2-3)
for (let r = 2; r <= 3; r++) {
  const row = raw1[r]
  if (!row || !row[1]) continue
  rows.push({
    nguon: 'MDF-VÁN NHỰA MIRROR', loai: 'MDF kháng ẩm',
    quy_cach: String(row[1]).trim(),
    gia_1m: typeof row[2] === 'number' ? row[2] : null,
    gia_2m: null,
  })
}

// Ván nhựa (rows 7-9)
for (let r = 7; r <= 9; r++) {
  const row = raw1[r]
  if (!row || !row[1]) continue
  rows.push({
    nguon: 'MDF-VÁN NHỰA MIRROR', loai: 'Ván nhựa',
    quy_cach: String(row[1]).trim(),
    gia_1m: typeof row[2] === 'number' ? row[2] : null,
    gia_2m: typeof row[3] === 'number' ? row[3] : null,
  })
}

// ====== Tab 2: SIÊU BÓNG GƯƠNG MIRROR ======
const ws2 = wb.Sheets['SIÊU BÓNG GƯƠNG MIRROR ']
const raw2 = XLSX.utils.sheet_to_json(ws2, { header: 1, defval: '' })

for (let r = 2; r <= 3; r++) {
  const row = raw2[r]
  if (!row || !row[1]) continue
  rows.push({
    nguon: 'SIÊU BÓNG GƯƠNG', loai: 'Tấm siêu bóng gương',
    quy_cach: String(row[1]).trim(),
    gia_1m: typeof row[2] === 'number' ? row[2] : null,
    gia_2m: null,
  })
}

let sql = `DROP TABLE IF EXISTS bang_gia_chuan_mirror;
CREATE TABLE bang_gia_chuan_mirror (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER NOT NULL DEFAULT 0,
  nguon TEXT NOT NULL DEFAULT '',
  loai TEXT NOT NULL DEFAULT '',
  quy_cach TEXT NOT NULL DEFAULT '',
  gia_1m INTEGER DEFAULT NULL,
  gia_2m INTEGER DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now','+7 hours')),
  updated_at TEXT DEFAULT NULL,
  updated_by TEXT DEFAULT NULL
);

INSERT INTO bang_gia_chuan_mirror (stt, nguon, loai, quy_cach, gia_1m, gia_2m) VALUES
`
sql += rows.map((r, i) => `(${i+1},'${esc(r.nguon)}','${esc(r.loai)}','${esc(r.quy_cach)}',${r.gia_1m ?? 'NULL'},${r.gia_2m ?? 'NULL'})`).join(',\n') + ';'

fs.writeFileSync('C:/Users/thanhthuyktt/Desktop/CODE/Web/gia-ban-app/backend/migrations/0027_mirror_tables.sql', sql, 'utf8')
console.log('Total rows:', rows.length)
rows.forEach(r => console.log(' ', r.nguon, r.loai, r.quy_cach, r.gia_1m, r.gia_2m))
