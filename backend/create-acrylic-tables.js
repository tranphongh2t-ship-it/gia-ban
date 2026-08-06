const XLSX = require('xlsx')
const fs = require('fs')

const wb = XLSX.readFile('C:/Users/thanhthuyktt/Desktop/CODE/Web/FILE GIÁ CHUẨN.xlsx')

// ====== 1. ACRYLIC color codes ======
const ws1 = wb.Sheets['ACRYLIC']
const raw1 = XLSX.utils.sheet_to_json(ws1, { header: 1, defval: '' })

const acrylicColors = []

// ULTRA series (rows 3-8)
// Col 1 = Đơn sắc (US codes) 620k, Col 2 = Ánh kim (UM) 720k
for (let r = 3; r <= 8; r++) {
  const row = raw1[r]
  if (!row) continue
  if (row[1]) {
    acrylicColors.push({ series: 'ULTRA', ma_mau: String(row[1]).trim(), loai_mau: 'Đơn sắc', gia: 620000 })
  }
  if (row[2]) {
    acrylicColors.push({ series: 'ULTRA', ma_mau: String(row[2]).trim(), loai_mau: 'Ánh kim', gia: 720000 })
  }
}

// GLASS series (rows 13-18)
// Col 1,2 = Đơn sắc (AS codes) 680k, Col 3 = Ánh kim (AM) 780k, Col 4 = Vân gỗ (AW) 880k
for (let r = 13; r <= 18; r++) {
  const row = raw1[r]
  if (!row) continue
  const vals = [1, 2, 3, 4]
  const loais = ['Đơn sắc', 'Đơn sắc', 'Ánh kim', 'Vân gỗ']
  const gias = [680000, 680000, 780000, 880000]
  for (let i = 0; i < 4; i++) {
    if (row[vals[i]]) {
      acrylicColors.push({ series: 'GLASS', ma_mau: String(row[vals[i]]).trim(), loai_mau: loais[i], gia: gias[i] })
    }
  }
}

// ====== 2. Board prices ======
const ws2 = wb.Sheets['VÁN NHỰA-MDF MR PHỦ ACRYLIC']
const raw2 = XLSX.utils.sheet_to_json(ws2, { header: 1, defval: '' })

const boardPrices = []
// Data rows 3-8 (0-indexed)
for (let r = 3; r <= 8; r++) {
  const row = raw2[r]
  if (!row || !row[2]) continue
  const series = (row[1] || '').toString().trim() || (boardPrices.length > 0 ? boardPrices[boardPrices.length - 1].series : '')
  // col 0: STT, col 1: SERIES, col 2: PHỦ
  // col 3: Metro Đơn sắc, col 4: Metro Ánh kim, col 5: Metro Vân gỗ
  // col 6: Durabo Đơn sắc, col 7: Durabo Ánh kim, col 8: Durabo Vân gỗ
  // col 9: Nhựa Đơn sắc, col 10: Nhựa Ánh kim, col 11: Nhựa Vân gỗ
  const phu = String(row[2]).trim()
  const boards = [
    { board_type: 'MMR 17mm Metro', col_ds: 3, col_ak: 4, col_vg: 5 },
    { board_type: 'Durabo 17mm 0.55D', col_ds: 6, col_ak: 7, col_vg: 8 },
    { board_type: 'Nhựa 17mm 3 lớp lõi đen 0.65D', col_ds: 9, col_ak: 10, col_vg: 11 },
  ]
  for (const b of boards) {
    const gia_ds = typeof row[b.col_ds] === 'number' ? row[b.col_ds] : null
    const gia_ak = typeof row[b.col_ak] === 'number' ? row[b.col_ak] : null
    const gia_vg = typeof row[b.col_vg] === 'number' ? row[b.col_vg] : null
    if (gia_ds === null && gia_ak === null && gia_vg === null) continue
    boardPrices.push({ stt: boardPrices.length + 1, series, phu, board_type: b.board_type, gia_ds, gia_ak, gia_vg })
  }
}

// ====== Generate SQL ======
let sql = `-- Migration: Acrylic pricing tables
DROP TABLE IF EXISTS bang_gia_chuan_tinh_gia_acrylic;
DROP TABLE IF EXISTS bang_gia_chuan_van_phu_acrylic;
DROP TABLE IF EXISTS bang_gia_chuan_acrylic;

CREATE TABLE bang_gia_chuan_acrylic (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER NOT NULL DEFAULT 0,
  series TEXT NOT NULL DEFAULT '',
  ma_mau TEXT NOT NULL DEFAULT '',
  loai_mau TEXT NOT NULL DEFAULT '',
  gia INTEGER DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now','+7 hours')),
  updated_at TEXT DEFAULT NULL,
  updated_by TEXT DEFAULT NULL
);

INSERT INTO bang_gia_chuan_acrylic (stt, series, ma_mau, loai_mau, gia) VALUES
`
sql += acrylicColors.map((c, i) => `(${i + 1},'${c.series}','${c.ma_mau.replace(/'/g, "''")}','${c.loai_mau}',${c.gia})`).join(',\n') + ';\n\n'

sql += `CREATE TABLE bang_gia_chuan_van_phu_acrylic (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER NOT NULL DEFAULT 0,
  series TEXT NOT NULL DEFAULT '',
  phu TEXT NOT NULL DEFAULT '',
  board_type TEXT NOT NULL DEFAULT '',
  gia_ds INTEGER DEFAULT NULL,
  gia_ak INTEGER DEFAULT NULL,
  gia_vg INTEGER DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now','+7 hours')),
  updated_at TEXT DEFAULT NULL,
  updated_by TEXT DEFAULT NULL
);

INSERT INTO bang_gia_chuan_van_phu_acrylic (stt, series, phu, board_type, gia_ds, gia_ak, gia_vg) VALUES
`
sql += boardPrices.map((b, i) => `(${i + 1},'${b.series}','${b.phu.replace(/'/g, "''")}','${b.board_type}',${b.gia_ds ?? 'NULL'},${b.gia_ak ?? 'NULL'},${b.gia_vg ?? 'NULL'})`).join(',\n') + ';\n\n'

sql += `CREATE TABLE bang_gia_chuan_tinh_gia_acrylic (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_mau TEXT NOT NULL DEFAULT '',
  series TEXT NOT NULL DEFAULT '',
  loai_mau TEXT NOT NULL DEFAULT '',
  phu TEXT NOT NULL DEFAULT '',
  board_type TEXT NOT NULL DEFAULT '',
  gia INTEGER DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now','+7 hours')),
  updated_at TEXT DEFAULT NULL,
  updated_by TEXT DEFAULT NULL
);
`

fs.writeFileSync('C:/Users/thanhthuyktt/Desktop/CODE/Web/gia-ban-app/backend/migrations/0024_acrylic_tables.sql', sql, 'utf8')
console.log('Colors:', acrylicColors.length, 'Board prices:', boardPrices.length)
