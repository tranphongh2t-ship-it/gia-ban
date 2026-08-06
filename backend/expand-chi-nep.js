const XLSX = require('xlsx')
const fs = require('fs')

const wb = XLSX.readFile('C:/Users/thanhthuyktt/Desktop/CODE/Web/FILE GIÁ CHUẨN.xlsx')
const ws = wb.Sheets['CHỈ NẸP & KEO HẠT']
const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
const rows = []

// Helper to parse PVC-style codes like "101, 100, 104 (T/SH)"
function expandPvc(cell) {
  // "101, 100, 104 (T/SH)"
  const m = cell.match(/^(.+?)\s*\(T\/SH\)$/)
  if (!m) return [cell.trim()]
  const baseCodes = m[1].split(',').map(s => s.trim()).filter(Boolean)
  const result = []
  for (const code of baseCodes) {
    result.push(code + ' T')
    result.push(code + ' SH')
  }
  return result
}

// Helper for "SS18-28-38-903" → ["SS18","SS28","SS38","SS903"]
function expandDash(text, prefix = '') {
  return text.split('-').map(s => prefix + s.trim()).filter(Boolean)
}

// Helper for "001-009" → ["001","002",...,"009"]
function expandRange(text, prefix = '') {
  const m = text.match(/^(\d+)-(\d+)$/)
  if (!m) return [prefix + text.trim()]
  const start = parseInt(m[1]), end = parseInt(m[2])
  const pad = m[1].length
  const result = []
  for (let i = start; i <= end; i++) {
    result.push(prefix + String(i).padStart(pad, '0'))
  }
  return result
}

// Helper for "101-102-103-104-105-106" → ["101","102",...,"106"]
function expandCodeList(text, prefix = '') {
  // Check if it's a range of individual numbers separated by -
  if (/^\d+(-\d+)+$/.test(text)) {
    return text.split('-').map(s => prefix + s.trim())
  }
  return [prefix + text.trim()]
}

let stt = 0

// === PVC ===
// Row 3: "101, 100, 104 (T/SH)"
{
  const products = expandPvc('101, 100, 104 (T/SH)')
  const sizes = [
    { kt: '21x0.8', gia: 140000 },
    { kt: '43x0.8', gia: 340000 },
    { kt: '21x0.45 (200m)', gia: 200000 },
  ]
  for (const sp of products) {
    for (const s of sizes) {
      stt++
      rows.push({ stt, nhom: 'PVC', ma_sp: 'PVC ' + sp, kich_thuoc: s.kt, gia: s.gia })
    }
  }
}

// Row 4: "Chỉ PVC vân gỗ, Đơn sắc còn lại"
{
  const sizes = [
    { kt: '21x0.8', gia: 170000 },
    { kt: '43x0.8', gia: 370000 },
    { kt: '21x0.45 (200m)', gia: 260000 },
  ]
  for (const s of sizes) {
    stt++
    rows.push({ stt, nhom: 'PVC', ma_sp: 'PVC Vân gỗ & Đơn sắc', kich_thuoc: s.kt, gia: s.gia })
  }
}

// === VENEER ===
const veneerData = [
  { ten: 'Xoan', gia_a: 145000, gia_b: 290000, gia_c: 85000, gia_d: 170000 },
  { ten: 'Sồi', gia_a: 155000, gia_b: 310000, gia_c: 90000, gia_d: 180000 },
  { ten: 'Walnut kỹ thuật', gia_a: 250000, gia_b: 500000, gia_c: 180000, gia_d: 360000 },
]
const veneerSizes = [
  { kt: 'Có keo 20mm', col: 'gia_a' },
  { kt: 'Có keo 40mm', col: 'gia_b' },
  { kt: 'Không keo 20mm', col: 'gia_c' },
  { kt: 'Không keo 40mm', col: 'gia_d' },
]
for (const p of veneerData) {
  for (const s of veneerSizes) {
    stt++
    rows.push({ stt, nhom: 'VENEER', ma_sp: p.ten, kich_thuoc: s.kt, gia: p[s.col] })
  }
}

// === ACRYLIC ===
{
  const sizes = [
    { kt: '22x1 cuộn 55m', gia: 450000 },
    { kt: '22x1 cuộn 50m', gia: 414000 },
  ]
  for (const s of sizes) {
    stt++
    rows.push({ stt, nhom: 'ACRYLIC', ma_sp: 'AS & AM', kich_thuoc: s.kt, gia: s.gia })
  }
}

// === ABS_PVC ===
// Row 19: "SS18-28-38-903"
{
  const products = expandDash('18-28-38-903', 'SS')
  for (const sp of products) {
    stt++
    rows.push({ stt, nhom: 'ABS_PVC', ma_sp: sp, kich_thuoc: '21x0.8 cuộn 100m', gia: 360000 })
  }
}

// Row 20: "US 101-102-103-104-105-106, UM 107"
{
  const usCodes = expandCodeList('101-102-103-104-105-106', 'US')
  const umCodes = ['UM107']
  const all = [...usCodes, ...umCodes]
  for (const sp of all) {
    stt++
    rows.push({ stt, nhom: 'ABS_PVC', ma_sp: sp, kich_thuoc: '21x0.8 cuộn 50m', gia: 500000 })
  }
}

// Row 21: "SB 001-009"
{
  const products = expandRange('001-009', 'SB')
  for (const sp of products) {
    stt++
    rows.push({ stt, nhom: 'ABS_PVC', ma_sp: sp, kich_thuoc: '21x0.8 cuộn 50m', gia: 100000 })
  }
}

// Output SQL
let sql = `DROP TABLE IF EXISTS bang_gia_chuan_chi_nep;
CREATE TABLE bang_gia_chuan_chi_nep (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER NOT NULL DEFAULT 0,
  nhom TEXT NOT NULL DEFAULT '',
  ma_sp TEXT NOT NULL DEFAULT '',
  kich_thuoc TEXT NOT NULL DEFAULT '',
  gia INTEGER DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now','+7 hours')),
  updated_at TEXT DEFAULT NULL,
  updated_by TEXT DEFAULT NULL
);
INSERT INTO bang_gia_chuan_chi_nep (stt, nhom, ma_sp, kich_thuoc, gia) VALUES
`
sql += rows.map(r => `(${r.stt},'${r.nhom}','${r.ma_sp.replace(/'/g, "''")}','${r.kich_thuoc.replace(/'/g, "''")}',${r.gia})`).join(',\n') + ';'

fs.writeFileSync('C:/Users/thanhthuyktt/Desktop/CODE/Web/gia-ban-app/backend/migrations/0023_rebuild_chi_nep.sql', sql, 'utf8')
console.log('Generated', rows.length, 'rows')
