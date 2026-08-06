const XLSX = require('xlsx')
const fs = require('fs')

const wb = XLSX.readFile('C:/Users/thanhthuyktt/Desktop/CODE/Web/FILE GIÁ CHUẨN.xlsx')

// ====== 1. ONE LAMINATE color codes ======
const ws1 = wb.Sheets['ONE LAMINATE']
const raw1 = XLSX.utils.sheet_to_json(ws1, { header: 1, defval: '' })

const colors = []  // { nhom, gia_foil, ma_mau }
let currentNhom = ''
let currentPrice = 0

for (let r = 2; r <= 11; r++) {
  const row = raw1[r]
  if (!row) continue
  // Row with STT AND a nhom name starts a new nhóm
  if (typeof row[0] === 'number' && row[0] > 0 && row[1]) {
    currentNhom = String(row[1]).trim()
    currentPrice = typeof row[2] === 'number' ? row[2] : 0
  }
  // Read color codes (both new group and continuation rows)
  if (currentNhom) {
    for (let c = 3; c <= 15; c++) {
      if (row[c]) {
        const ma = String(row[c]).trim()
        if (ma) colors.push({ nhom: currentNhom, ma_mau: ma, gia_foil: currentPrice })
      }
    }
  }
}

// ====== 2. VÁN NHỰA PHỦ HPL ======
const ws2 = wb.Sheets['VÁN NHỰA PHỦ HPL']
const raw2 = XLSX.utils.sheet_to_json(ws2, { header: 1, defval: '' })

const vanNhuaRows = []
for (let r = 3; r <= 17; r++) {
  const row = raw2[r]
  if (!row || !row[1]) continue
  vanNhuaRows.push({
    stt: vanNhuaRows.length + 1,
    loai_van: String(row[1]).trim(),
    do_day: String(row[2]).trim(),
    do_day_tp: String(row[3]).trim(),
    gia_1m_le1: typeof row[4] === 'number' ? row[4] : null,
    gia_1m_le2: typeof row[5] === 'number' ? row[5] : null,
    gia_1m_lp1: typeof row[6] === 'number' ? row[6] : null,
    gia_1m_lp2: typeof row[7] === 'number' ? row[7] : null,
    gia_1m_lp3: typeof row[8] === 'number' ? row[8] : null,
    gia_2m_le1: typeof row[9] === 'number' ? row[9] : null,
    gia_2m_le2: typeof row[10] === 'number' ? row[10] : null,
    gia_2m_lp1: typeof row[11] === 'number' ? row[11] : null,
    gia_2m_lp2: typeof row[12] === 'number' ? row[12] : null,
    gia_2m_lp3: typeof row[13] === 'number' ? row[13] : null,
  })
}

// ====== 3. OSB-GỖ GHÉP-VÁN ÉP PHỦ HPL ======
const ws3 = wb.Sheets['OSB-GỖ GHÉP-VÁN ÉP PHỦ HPL']
const raw3 = XLSX.utils.sheet_to_json(ws3, { header: 1, defval: '' })

const osbRows = []
for (let r = 3; r <= 11; r++) {
  const row = raw3[r]
  if (!row || !row[1]) continue
  osbRows.push({
    stt: osbRows.length + 1,
    loai_van: String(row[1]).trim(),
    do_day: String(row[2]).trim(),
    do_day_tp: String(row[3]).trim(),
    gia_1m_le1: typeof row[4] === 'number' ? row[4] : null,
    gia_1m_le2: typeof row[5] === 'number' ? row[5] : null,
    gia_1m_lp1: typeof row[6] === 'number' ? row[6] : null,
    gia_1m_lp2: typeof row[7] === 'number' ? row[7] : null,
    gia_1m_lp3: typeof row[8] === 'number' ? row[8] : null,
    gia_2m_le1: typeof row[9] === 'number' ? row[9] : null,
    gia_2m_le2: typeof row[10] === 'number' ? row[10] : null,
    gia_2m_lp1: typeof row[11] === 'number' ? row[11] : null,
    gia_2m_lp2: typeof row[12] === 'number' ? row[12] : null,
    gia_2m_lp3: typeof row[13] === 'number' ? row[13] : null,
  })
}

// ====== Generate SQL ======
function esc(s) { return s.replace(/'/g, "''") }

let sql = `-- Migration: ONE LAMINATE pricing tables (fixed)
DROP TABLE IF EXISTS bang_gia_chuan_tinh_gia_one_laminate;
DROP TABLE IF EXISTS bang_gia_chuan_osb_ghep_ep_phu_hpl;
DROP TABLE IF EXISTS bang_gia_chuan_van_nhua_phu_hpl;
DROP TABLE IF EXISTS bang_gia_chuan_one_laminate;

CREATE TABLE bang_gia_chuan_one_laminate (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER NOT NULL DEFAULT 0,
  nhom TEXT NOT NULL DEFAULT '',
  ma_mau TEXT NOT NULL DEFAULT '',
  gia_foil INTEGER DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now','+7 hours')),
  updated_at TEXT DEFAULT NULL,
  updated_by TEXT DEFAULT NULL
);

INSERT INTO bang_gia_chuan_one_laminate (stt, nhom, ma_mau, gia_foil) VALUES
`
sql += colors.map((c, i) => `(${i + 1},'${esc(c.nhom)}','${esc(c.ma_mau)}',${c.gia_foil})`).join(',\n') + ';\n\n'

sql += `CREATE TABLE bang_gia_chuan_van_nhua_phu_hpl (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER NOT NULL DEFAULT 0,
  loai_van TEXT NOT NULL DEFAULT '',
  do_day TEXT NOT NULL DEFAULT '',
  do_day_tp TEXT NOT NULL DEFAULT '',
  gia_1m_le1 INTEGER DEFAULT NULL, gia_1m_le2 INTEGER DEFAULT NULL,
  gia_1m_lp1 INTEGER DEFAULT NULL, gia_1m_lp2 INTEGER DEFAULT NULL, gia_1m_lp3 INTEGER DEFAULT NULL,
  gia_2m_le1 INTEGER DEFAULT NULL, gia_2m_le2 INTEGER DEFAULT NULL,
  gia_2m_lp1 INTEGER DEFAULT NULL, gia_2m_lp2 INTEGER DEFAULT NULL, gia_2m_lp3 INTEGER DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now','+7 hours')),
  updated_at TEXT DEFAULT NULL,
  updated_by TEXT DEFAULT NULL
);

INSERT INTO bang_gia_chuan_van_nhua_phu_hpl (stt, loai_van, do_day, do_day_tp, gia_1m_le1, gia_1m_le2, gia_1m_lp1, gia_1m_lp2, gia_1m_lp3, gia_2m_le1, gia_2m_le2, gia_2m_lp1, gia_2m_lp2, gia_2m_lp3) VALUES
`
sql += vanNhuaRows.map(b =>
  `(${b.stt},'${esc(b.loai_van)}','${esc(b.do_day)}','${esc(b.do_day_tp)}',${b.gia_1m_le1 ?? 'NULL'},${b.gia_1m_le2 ?? 'NULL'},${b.gia_1m_lp1 ?? 'NULL'},${b.gia_1m_lp2 ?? 'NULL'},${b.gia_1m_lp3 ?? 'NULL'},${b.gia_2m_le1 ?? 'NULL'},${b.gia_2m_le2 ?? 'NULL'},${b.gia_2m_lp1 ?? 'NULL'},${b.gia_2m_lp2 ?? 'NULL'},${b.gia_2m_lp3 ?? 'NULL'})`
).join(',\n') + ';\n\n'

sql += `CREATE TABLE bang_gia_chuan_osb_ghep_ep_phu_hpl (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER NOT NULL DEFAULT 0,
  loai_van TEXT NOT NULL DEFAULT '',
  do_day TEXT NOT NULL DEFAULT '',
  do_day_tp TEXT NOT NULL DEFAULT '',
  gia_1m_le1 INTEGER DEFAULT NULL, gia_1m_le2 INTEGER DEFAULT NULL,
  gia_1m_lp1 INTEGER DEFAULT NULL, gia_1m_lp2 INTEGER DEFAULT NULL, gia_1m_lp3 INTEGER DEFAULT NULL,
  gia_2m_le1 INTEGER DEFAULT NULL, gia_2m_le2 INTEGER DEFAULT NULL,
  gia_2m_lp1 INTEGER DEFAULT NULL, gia_2m_lp2 INTEGER DEFAULT NULL, gia_2m_lp3 INTEGER DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now','+7 hours')),
  updated_at TEXT DEFAULT NULL,
  updated_by TEXT DEFAULT NULL
);

INSERT INTO bang_gia_chuan_osb_ghep_ep_phu_hpl (stt, loai_van, do_day, do_day_tp, gia_1m_le1, gia_1m_le2, gia_1m_lp1, gia_1m_lp2, gia_1m_lp3, gia_2m_le1, gia_2m_le2, gia_2m_lp1, gia_2m_lp2, gia_2m_lp3) VALUES
`
sql += osbRows.map(b =>
  `(${b.stt},'${esc(b.loai_van)}','${esc(b.do_day)}','${esc(b.do_day_tp)}',${b.gia_1m_le1 ?? 'NULL'},${b.gia_1m_le2 ?? 'NULL'},${b.gia_1m_lp1 ?? 'NULL'},${b.gia_1m_lp2 ?? 'NULL'},${b.gia_1m_lp3 ?? 'NULL'},${b.gia_2m_le1 ?? 'NULL'},${b.gia_2m_le2 ?? 'NULL'},${b.gia_2m_lp1 ?? 'NULL'},${b.gia_2m_lp2 ?? 'NULL'},${b.gia_2m_lp3 ?? 'NULL'})`
).join(',\n') + ';\n\n'

sql += `CREATE TABLE bang_gia_chuan_tinh_gia_one_laminate (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_mau TEXT NOT NULL DEFAULT '',
  nhom TEXT NOT NULL DEFAULT '',
  gia_foil INTEGER DEFAULT NULL,
  nguon TEXT NOT NULL DEFAULT '',
  loai_van TEXT NOT NULL DEFAULT '',
  do_day TEXT NOT NULL DEFAULT '',
  do_day_tp TEXT NOT NULL DEFAULT '',
  so_mat INTEGER NOT NULL DEFAULT 2,
  gia INTEGER DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now','+7 hours')),
  updated_at TEXT DEFAULT NULL,
  updated_by TEXT DEFAULT NULL
);
`

fs.writeFileSync('C:/Users/thanhthuyktt/Desktop/CODE/Web/gia-ban-app/backend/migrations/0026_fix_one_laminate.sql', sql, 'utf8')
console.log('Colors:', colors.length)
colors.forEach(c => console.log('  ', c.nhom, c.ma_mau, c.gia_foil))
