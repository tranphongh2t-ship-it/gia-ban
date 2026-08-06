const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.readFile('C:\\Users\\thanhthuyktt\\Desktop\\CODE\\Web\\FILE GIÁ CHUẨN.xlsx');

// Check phu thu data
const ws = wb.Sheets['MẶT PHỦ MELAMINE'];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

const r = raw[3];
console.log('mo_ta raw:', JSON.stringify(r[1]));
console.log('mo_ta code points:', [...String(r[1])].map(c => c.charCodeAt(0)));

// Generate SQL line
const val = r[1];
const sql = "'" + String(val).replace(/'/g, "''") + "'";
console.log('SQL value:', sql);

// Check what fs.writeFileSync produces
const test = { mo_ta: r[1], sql: sql };
const testJson = JSON.stringify(test, null, 2);
console.log('JSON:', testJson);

fs.writeFileSync('encoding-test.json', testJson, 'utf-8');
const readBack = fs.readFileSync('encoding-test.json', 'utf-8');
console.log('Read back:', readBack);
