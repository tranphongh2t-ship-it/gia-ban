const XLSX = require('xlsx')
const fs = require('fs')

const EXCEL_PATH = 'C:\\Users\\thanhthuyktt\\Desktop\\CODE\\Web\\FILE GIÁ CHUẨN.xlsx'
const OUTPUT_PATH = 'import-gia-chuan-data.json'

// ========== PARSE LOGIC ==========

function parseSheet(wb, name, config) {
  const sheetName = config.sheetName || name
  const ws = wb.Sheets[sheetName]
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const { headerRow, dataStartRow, dataEndRow, colMap, skipEmpty } = config

  const headers = raw[headerRow - 1]
  const result = []

  const end = dataEndRow ? dataEndRow : raw.length

  for (let r = dataStartRow - 1; r < end; r++) {
    const row = raw[r]
    const isEmpty = row.every(c => c === '' || c === null || c === undefined)
    if (isEmpty && skipEmpty) continue

    const item = {}
    for (const [field, colIdx] of Object.entries(colMap)) {
      let val = row[colIdx]
      if (val === '' || val === null || val === undefined) val = null
      item[field] = val
    }
    // Skip rows with non-numeric stt (e.g. "Note" rows)
    if (item.stt !== null && isNaN(Number(item.stt))) continue
    result.push(item)
  }

  return result
}

function parseColorSheet(wb, name, config) {
  const ws = wb.Sheets[name]
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const { dataStartRow, colorColMap, skipEmpty, nguon } = config

  const result = []

  for (let r = dataStartRow - 1; r < raw.length; r++) {
    const row = raw[r]
    const isEmpty = row.every(c => c === '' || c === null || c === undefined)
    if (isEmpty && skipEmpty) continue

    const stt = row[0]
    if (stt !== null && isNaN(Number(stt))) continue
    let seq = 0
    for (const [colIdx, nhom, loai] of colorColMap) {
      const val = row[colIdx]
      if (val === '' || val === null || val === undefined) continue
      seq++
      result.push({
        stt,
        nguon,
        nhom,
        loai,
        ma_mau: String(val).trim(),
        vi_tri: seq,
      })
    }
  }

  return result
}

function parseVanEpKhac(wb) {
  const ws = wb.Sheets['VÁN ÉP']
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const result = []
  let seq = 0

  // Section configs: [titleRowIdx, dataStartRowIdx, dataEndRowIdx, nhom, colMappings]
  // colMappings: [{colIdx, loai}]
  const sections = [
    { titleRow: 12, dataStart: 15, dataEnd: 21, nhom: 'Nhập khẩu', cols: [
      { col: 2, loai: 'BIRCH C/D' },
      { col: 3, loai: 'POPLAR AA' },
      { col: 4, loai: 'EV/EV' },
    ]},
    { titleRow: 23, dataStart: 25, dataEnd: 25, nhom: 'Phủ phim', cols: [
      { col: 2, loai: 'Standard' },
    ]},
    { titleRow: 27, dataStart: 29, dataEnd: 30, nhom: 'Phủ veneer', cols: [
      { col: 2, loai: 'Sồi KT' },
      { col: 3, loai: 'Walnut KT' },
    ]},
    { titleRow: 32, dataStart: 34, dataEnd: 35, nhom: 'Okume/EV', cols: [
      { col: 2, loai: 'Giá lẻ' },
    ]},
  ]

  for (const section of sections) {
    for (let r = section.dataStart; r <= section.dataEnd; r++) {
      const row = raw[r]
      const stt = row[0]
      if (stt === '' || stt === null || stt === undefined || isNaN(Number(stt))) continue
      const quy_cach = row[1]
      if (!quy_cach) continue
      const rowStt = parseInt(String(row[0])) || 0
      for (const col of section.cols) {
        const gia = row[col.col]
        if (gia !== '' && gia !== null && gia !== undefined && typeof gia === 'number') {
          seq++
          result.push({ stt: rowStt, quy_cach, loai: col.loai, gia, nhom: section.nhom })
        }
      }
    }
  }

  return result
}

function parseMauMelamine2(wb) {
  const ws = wb.Sheets['BẢNG NHÓM MÀU MELAMINE']
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const result = []

  // Row 1-2: header
  // Data rows 3-18 (0-indexed)
  // col 0: STT, cols 1-2: SÁNG VÂN GỖ, 3: SÁNG ĐÁ
  // cols 4-10: TRUNG VÂN GỖ, 11: ART, 12: ĐÁ, 13: VẢI
  // cols 14-15: TỐI VÂN GỖ, 16: ĐÁ, 17: VẢI
  // cols 18-19: ĐƠN SẮC
  const colMap = [
    [1, 'SÁNG', 'VÂN GỖ'], [2, 'SÁNG', 'VÂN GỖ'], [3, 'SÁNG', 'ĐÁ'],
    [4, 'TRUNG', 'VÂN GỖ'], [5, 'TRUNG', 'VÂN GỖ'], [6, 'TRUNG', 'VÂN GỖ'],
    [7, 'TRUNG', 'VÂN GỖ'], [8, 'TRUNG', 'VÂN GỖ'], [9, 'TRUNG', 'VÂN GỖ'],
    [10, 'TRUNG', 'VÂN GỖ'], [11, 'TRUNG', 'ART'], [12, 'TRUNG', 'ĐÁ'],
    [13, 'TRUNG', 'VẢI'],
    [14, 'TỐI', 'VÂN GỖ'], [15, 'TỐI', 'VÂN GỖ'], [16, 'TỐI', 'ĐÁ'],
    [17, 'TỐI', 'VẢI'],
    [18, 'ĐƠN SẮC', 'ĐƠN SẮC'], [19, 'ĐƠN SẮC', 'ĐƠN SẮC'],
  ]

  for (let r = 3; r <= 18; r++) {
    const row = raw[r]
    if (!row) continue
    const stt = row[0]
    if (stt === '' || stt === null || stt === undefined || isNaN(Number(stt))) continue
    for (const [colIdx, nhom, phanNhom] of colMap) {
      const ma = String(row[colIdx] || '').trim()
      if (!ma) continue
      result.push({ ma_mau: ma, nhom, phan_nhom: phanNhom })
    }
  }

  return result
}

function parseMelaminePlywood(wb) {
  const ws = wb.Sheets['MELAMINE PLYWOOD']
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const result = []
  let lastCoreTypes = []

  for (let r = 3; r <= 6; r++) {
    const row = raw[r]
    if (!row) continue
    const stt = row[0]
    if (stt === '' || stt === null || stt === undefined || isNaN(Number(stt))) continue
    const loai_cot_raw = row[1]
    const do_day = row[2]
    if (!do_day) continue

    let coreTypes
    if (loai_cot_raw && loai_cot_raw.trim() === 'EV/SW Plywood keo Cp2/E0') {
      coreTypes = ['EV', 'SW Plywood keo Cp2', 'E0']
      lastCoreTypes = coreTypes
    } else if (loai_cot_raw) {
      coreTypes = [loai_cot_raw.trim()]
      lastCoreTypes = coreTypes
    } else {
      coreTypes = lastCoreTypes
    }

    const base = {
      stt: parseInt(String(stt)),
      do_day,
      gia_sang_trung: typeof row[3] === 'number' ? row[3] : null,
      gia_toi: typeof row[4] === 'number' ? row[4] : null,
      gia_don_sac_101: typeof row[5] === 'number' ? row[5] : null,
      gia_don_sac_khac_da: typeof row[6] === 'number' ? row[6] : null,
      gia_don_sac_106: typeof row[7] === 'number' ? row[7] : null,
    }

    for (const core of coreTypes) {
      result.push({ ...base, loai_cot: core })
    }
  }

  return result
}

function parseMelamineNhuaOsbGhep(wb) {
  const ws = wb.Sheets['VÁN NHỰA-OSB-GGHÉP PHỦ MELAMINE']
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const result = []
  let currentLoai = ''

  // Data rows 2-18 (0-indexed), row 19 is "Phủ 1 mặt giảm trừ"
  for (let r = 2; r <= 18; r++) {
    const row = raw[r]
    if (!row) continue
    const stt = row[0]
    if (stt === '' || stt === null || stt === undefined || isNaN(Number(stt))) continue
    const loai_cot = row[1] || currentLoai
    if (row[1]) currentLoai = loai_cot
    const do_day = row[2]
    if (!do_day) continue
    result.push({
      stt: parseInt(String(stt)),
      loai_cot,
      do_day,
      gia_sang_trung: typeof row[3] === 'number' ? row[3] : null,
      gia_toi_don_sac: typeof row[4] === 'number' ? row[4] : null,
      gia_chum_104_106: typeof row[5] === 'number' ? row[5] : null,
    })
  }

  // Row 19: "Phủ 1 mặt giảm trừ" - extract discount values
  const discountRow = raw[19]
  if (discountRow) {
    const giamTruRow = {
      stt: 99,
      loai_cot: 'Phủ 1 mặt giảm trừ',
      do_day: '',
      gia_sang_trung: null,
      gia_toi_don_sac: null,
      gia_chum_104_106: null,
      giam_tru_sang_trung: typeof discountRow[3] === 'number' ? discountRow[3] : 0,
      giam_tru_toi_don_sac: typeof discountRow[4] === 'number' ? discountRow[4] : 0,
      giam_tru_chum_104_106: typeof discountRow[5] === 'number' ? discountRow[5] : 0,
    }
    result.push(giamTruRow)
  }

  return result
}

function parsePvcFilmDura(wb) {
  const ws = wb.Sheets['PVC FILM - DURA+']
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const result = []

  // Rows 2-5: STT, Loại, Nhóm màu, Mã số, Thông số film, 1 mặt(ignore), 2 mặt(ignore)
  // Row 2: PVC film, Ưu đãi
  // Row 3: (blank), Standard
  // Row 4: (blank), Premium
  // Row 5: PETG, (blank)
  const groups = [
    { row: 2, loai: 'PVC film', nhom: 'Ưu đãi' },
    { row: 3, loai: 'PVC film', nhom: 'Standard' },
    { row: 4, loai: 'PVC film', nhom: 'Premium' },
    { row: 5, loai: 'PETG', nhom: 'PETG' },
  ]

  for (const g of groups) {
    const row = raw[g.row]
    const maSo = String(row[3] || '')
    const thongSo = String(row[4] || '')
    // Split by semicolon first, then by comma, trim each
    const parts = maSo.split(';').flatMap(s => s.split(',')).map(s => s.trim()).filter(Boolean)
    for (const ma of parts) {
      result.push({ ma_mau: ma, nhom: g.nhom, loai: g.loai, thong_so: thongSo })
    }
  }

  return result
}

function parseVanPhuPvcPetg(wb) {
  const ws = wb.Sheets['VÁN PHỦ PVC FILM - PETG']
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const result = []
  let currentLoaiVan = ''

  // Data rows 3-16 (0-indexed)
  for (let r = 3; r <= 16; r++) {
    const row = raw[r]
    const stt = row[0]
    if (stt === '' || stt === null || stt === undefined || isNaN(Number(stt))) continue
    const loai_van = row[1] || currentLoaiVan
    if (row[1]) currentLoaiVan = loai_van
    const do_day = row[2]
    if (!do_day) continue
    result.push({
      stt: parseInt(String(stt)),
      loai_van,
      do_day,
      gia_uu_dai_1m: typeof row[3] === 'number' ? row[3] : null,
      gia_uu_dai_2m: typeof row[4] === 'number' ? row[4] : null,
      gia_standard_1m: typeof row[5] === 'number' ? row[5] : null,
      gia_standard_2m: typeof row[6] === 'number' ? row[6] : null,
      gia_premium_1m: typeof row[7] === 'number' ? row[7] : null,
      gia_premium_2m: typeof row[8] === 'number' ? row[8] : null,
      gia_petg_1m: typeof row[9] === 'number' ? row[9] : null,
      gia_petg_2m: typeof row[10] === 'number' ? row[10] : null,
    })
  }

  return result
}

function parseDurabo(wb) {
  const ws = wb.Sheets['VÁN NHỰA DURABO']
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const result = []
  let seq = 0

  // Section 1: DURABO ECO (rows 2-4, 0-indexed)
  for (let r = 2; r <= 4; r++) {
    const row = raw[r]
    const quy_cach = row[1]
    if (!quy_cach) continue
    seq++
    const gia = typeof row[2] === 'number' ? row[2] : null
    const dong_goi = row[3] !== '' ? String(row[3]) : null
    result.push({ stt: seq, quy_cach, loai: '0.32–0.37D ko BH', nhom: 'DURABO ECO', gia, dong_goi })
  }

  // Section 2: DURABO (rows 9-15, 0-indexed)
  const duraboCols = [
    { col: 2, loai: 'DURABO 0.6D' },
    { col: 3, loai: 'DURABO 0.55D' },
    { col: 4, loai: 'DURABO 0.5D ko BH' },
    { col: 5, loai: 'Siêu bóng 1 mặt' },
    { col: 6, loai: 'Siêu bóng 2 mặt' },
  ]
  for (let r = 9; r <= 15; r++) {
    const row = raw[r]
    const quy_cach = row[1]
    if (!quy_cach) continue
    for (const c of duraboCols) {
      const gia = typeof row[c.col] === 'number' ? row[c.col] : null
      if (gia !== null) {
        seq++
        result.push({ stt: seq, quy_cach, loai: c.loai, nhom: 'DURABO', gia, dong_goi: null })
      }
    }
  }

  // Section 3: VÁN NHỰA (rows 21-26, 0-indexed)
  const nhuaCols = [
    { col: 2, loai: 'Celuka Trắng 0.6D' },
    { col: 3, loai: 'Celuka Trắng 0.55D' },
    { col: 4, loai: 'Co-extrusion lõi đen' },
    { col: 5, loai: 'Co-extrusion lõi trắng' },
    { col: 6, loai: 'WPC Shield Board 0.6D' },
    { col: 7, loai: 'WPC Shield Board 0.6D (nhóm 2)' },
  ]
  for (let r = 21; r <= 26; r++) {
    const row = raw[r]
    const quy_cach = row[1]
    if (!quy_cach) continue
    for (const c of nhuaCols) {
      const gia = typeof row[c.col] === 'number' ? row[c.col] : null
      if (gia !== null) {
        seq++
        result.push({ stt: seq, quy_cach, loai: c.loai, nhom: 'Ván nhựa', gia, dong_goi: null })
      }
    }
  }

  return result
}

function parseOSB(wb) {
  const ws = wb.Sheets['OSB']
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  // Parse section 1 (đã CK) rows 2-6, section 2 (chưa CK) rows 11-15
  // Both sections share the same product structure in the same order
  function parseSection(startRow, endRow, priceColSuffix) {
    const rows = []
    let currentMo_ta = ''
    for (let r = startRow; r <= endRow; r++) {
      const row = raw[r]
      let stt = row[0]
      if (stt !== '' && stt !== null && stt !== undefined) stt = parseInt(String(stt)) || 0
      else stt = 0
      const mo_ta = row[1] || currentMo_ta
      if (row[1]) currentMo_ta = mo_ta
      const do_day = row[2]
      if (!do_day) continue
      const gia = typeof row[3] === 'number' ? row[3] : null
      const gia_ck_a = typeof row[4] === 'number' ? row[4] : null
      const gia_ck_b = typeof row[5] === 'number' ? row[5] : null
      const tam_kien = typeof row[6] === 'number' ? row[6] : null
      rows.push({ stt, mo_ta, do_day, gia, gia_ck_a, gia_ck_b, tam_kien })
    }
    return rows
  }

  const sec1 = parseSection(2, 6, '_da_ck')
  const sec2 = parseSection(11, 15, '_chua_ck')

  // Merge by index
  const result = []
  for (let i = 0; i < sec1.length; i++) {
    const a = sec1[i]
    const b = sec2[i]
    result.push({
      stt: a.stt || b.stt,
      mo_ta: a.mo_ta || b.mo_ta,
      do_day: a.do_day,
      gia: a.gia,
      gia_da_ck_10: a.gia_ck_a,
      gia_da_ck_15: a.gia_ck_b,
      gia_chua_ck_10: b.gia_ck_a,
      gia_chua_ck_15: b.gia_ck_b,
      tam_kien: a.tam_kien || b.tam_kien,
    })
  }

  return result
}

function parseVeneerMatPhuKhac(wb) {
  const ws = wb.Sheets['VENEER & MẶT PHỦ KHÁC']
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const result = []
  // Veneer tự nhiên (rows 3-4)
  for (let r = 3; r <= 4; r++) {
    const row = raw[r]
    if (!row || !row[1]) continue
    result.push({
      stt: parseInt(String(row[0])),
      loai: 'Tự nhiên', be_mat: row[1],
      gia_1m_a: typeof row[2] === 'number' ? row[2] : null,
      gia_1m_b: typeof row[3] === 'number' ? row[3] : null,
      gia_2m: typeof row[4] === 'number' ? row[4] : null,
    })
  }
  // Veneer kỹ thuật (rows 7-8)
  for (let r = 7; r <= 8; r++) {
    const row = raw[r]
    if (!row || !row[1]) continue
    result.push({
      stt: parseInt(String(row[0])),
      loai: 'Kỹ thuật', be_mat: row[1],
      gia_1m_a: typeof row[2] === 'number' ? row[2] : null,
      gia_1m_b: null,
      gia_2m: typeof row[4] === 'number' ? row[4] : null,
    })
  }
  return result
}

function parseMatPhuKhac(wb) {
  const ws = wb.Sheets['VENEER & MẶT PHỦ KHÁC']
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const result = []
  // Rows 13-16
  for (let r = 13; r <= 16; r++) {
    const row = raw[r]
    if (!row || !row[0] || isNaN(Number(row[0]))) continue
    result.push({
      stt: parseInt(String(row[0])),
      ten: row[1] || '',
      gia_1m: typeof row[2] === 'number' ? row[2] : null,
      gia_2m: typeof row[3] === 'number' ? row[3] : null,
      ghi_chu: row[4] || '',
    })
  }
  return result
}

function parseChiNep(wb) {
  const ws = wb.Sheets['CHỈ NẸP & KEO HẠT']
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const result = []

  // Chỉ PVC nhập khẩu (rows 2-4, 0-indexed)
  for (let r = 3; r <= 4; r++) {
    const row = raw[r]
    if (!row || !row[0] || isNaN(Number(row[0]))) continue
    result.push({
      stt: parseInt(String(row[0])), nhom: 'PVC', cuon: row[1],
      gia_a: typeof row[2] === 'number' ? row[2] : null,
      gia_b: typeof row[3] === 'number' ? row[3] : null,
      gia_c: typeof row[4] === 'number' ? row[4] : null,
      gia_d: null,
    })
  }

  // Chỉ Veneer (rows 8-11, 0-indexed)
  for (let r = 9; r <= 11; r++) {
    const row = raw[r]
    if (!row || !row[0] || isNaN(Number(row[0]))) continue
    result.push({
      stt: parseInt(String(row[0])), nhom: 'VENEER', cuon: row[1],
      gia_a: typeof row[2] === 'number' ? row[2] : null,
      gia_b: typeof row[3] === 'number' ? row[3] : null,
      gia_c: typeof row[4] === 'number' ? row[4] : null,
      gia_d: typeof row[5] === 'number' ? row[5] : null,
    })
  }

  // Chỉ Acrylic (rows 14-15, 0-indexed)
  for (let r = 15; r <= 15; r++) {
    const row = raw[r]
    if (!row || !row[0] || isNaN(Number(row[0]))) continue
    result.push({
      stt: parseInt(String(row[0])), nhom: 'ACRYLIC', cuon: row[1],
      gia_a: typeof row[2] === 'number' ? row[2] : null,
      gia_b: typeof row[3] === 'number' ? row[3] : null,
      gia_c: null, gia_d: null,
    })
  }

  // Chỉ ABS / PVC Bóng (rows 18-21, 0-indexed)
  for (let r = 19; r <= 21; r++) {
    const row = raw[r]
    if (!row || !row[0] || isNaN(Number(row[0]))) continue
    result.push({
      stt: parseInt(String(row[0])), nhom: 'ABS_PVC', cuon: row[1],
      gia_a: typeof row[2] === 'number' ? row[2] : null,
      gia_b: typeof row[3] === 'number' ? row[3] : null,
      gia_c: null, gia_d: null,
    })
  }

  return result
}

function parseKeoHat(wb) {
  const ws = wb.Sheets['CHỈ NẸP & KEO HẠT']
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const result = []

  // Keo hạt nóng chảy (rows 24-33, 0-indexed)
  for (let r = 25; r <= 33; r++) {
    const row = raw[r]
    if (!row || !row[0] || isNaN(Number(row[0]))) continue
    result.push({
      stt: parseInt(String(row[0])), ma: row[1] || '',
      nhiet_do: row[2] || '', mau: row[3] || '',
      gia_1kg: typeof row[4] === 'number' ? row[4] : null,
      gia_25kg: typeof row[5] === 'number' ? row[5] : null,
    })
  }

  return result
}

const wb = XLSX.readFile(EXCEL_PATH)

const sheets = [
  {
    name: 'VÁN DĂM OKAL',
    table: 'bang_gia_chuan_dam_okal',
    config: {
      headerRow: 2,
      dataStartRow: 3,
      skipEmpty: true,
      colMap: {
        stt: 0,
        quy_cach: 1,
        e2: 2,
        veco_e1: 3,
        veco_cp2: 4,
        veco_f4s: 5,
        hmr_e1: 6,
      },
    },
  },
  {
    name: 'VÁN MDF HDF',
    table: 'bang_gia_chuan_mdf_hdf',
    config: {
      headerRow: 2,
      dataStartRow: 5,
      skipEmpty: true,
      colMap: {
        stt: 0,
        quy_cach: 1,
        vn_ldf_e2: 2,
        vn_mdf_e2: 3,
        vn_mdf_cp2: 4,
        vn_hdf_hmr_e2: 5,
        vn_hdf_hmr_e1: 6,
        th_mdf_e2: 7,
        th_hdf_hmr_e2: 8,
        vn_lmr_e2: 9,
        vn_mmr_e2: 10,
        vn_hmr_e2: 11,
        vn_hmr_e1: 12,
        vn_hmr_cp2: 13,
        th_mmr_e2: 14,
        th_hmr_v313_e1: 15,
      },
    },
  },
  // ====== MẶT PHỦ MELAMINE — Bảng phụ thu (rows 4-6) ======
  {
    name: 'MẶT PHỦ MELAMINE',
    table: 'bang_gia_chuan_phu_thu_melamine',
    config: {
      headerRow: 3,
      dataStartRow: 4,
      dataEndRow: 6,
      skipEmpty: false,
      colMap: {
        stt: 0,
        mo_ta: 1,
        basic_1m: 2,
        basic_2m: 3,
        eco_1m: 4,
        eco_2m: 5,
        standard_1m: 6,
        standard_2m: 7,
        premium_wood_art_1m: 8,
        premium_wood_art_2m: 9,
        premium_color_1m: 10,
        premium_color_2m: 11,
        superb_1m: 12,
        superb_2m: 13,
      },
    },
  },
  // ====== MẶT PHỦ MELAMINE — Bảng nhóm màu 220 (rows 14-25) ======
  {
    name: 'MẶT PHỦ MELAMINE (220 màu)',
    table: 'bang_gia_chuan_mau_melamine',
    isColor220: true,
    config: {
      headerRow: 12,
      dataStartRow: 14,
      skipEmpty: true,
      nguon: '220',
      // [colIdx, nhom, loai]
      colorColMap: [
        [1, 'Basic', 'Color'],
        [2, 'Economy', 'Wood'],
        [3, 'Economy', 'Wood'],
        [4, 'Economy', 'Wood'],
        [5, 'Economy', 'Wood'],
        [6, 'Economy', 'Wood'],
        [7, 'Economy', 'Wood'],
        [8, 'Economy', 'Wood'],
        [9, 'Economy', 'Wood'],
        [10, 'Economy', 'Wood'],
        [11, 'Economy', 'Art'],
        [12, 'Economy', 'Color'],
        [13, 'Standard', 'Wood'],
        [14, 'Standard', 'Wood'],
        [15, 'Standard', 'Art'],
        [16, 'Standard', 'Color'],
        [17, 'Premium', 'Art'],
        [18, 'Premium', 'Color'],
        [19, 'Premium', 'Wood'],
        [20, 'Premium', 'Wood'],
        [21, 'Premium', 'Wood'],
        [22, 'Premium', 'Art'],
        [23, 'Premium', 'Color'],
        [24, 'Superb', 'Color'],
        [25, 'Superb', 'Color'],
        [26, 'Superb', 'Color'],
        [27, 'Superb', 'Color'],
      ],
    },
  },
  // ====== GỖ GHÉP — GỖ TRƠN (rows 4-8) ======
  {
    name: 'GỖ GHÉP (Gỗ Trơn)',
    table: 'bang_gia_chuan_go_ghep',
    config: {
      sheetName: 'GỖ GHÉP',
      headerRow: 2,
      dataStartRow: 4,
      dataEndRow: 8,
      skipEmpty: true,
      colMap: {
        stt: 0,
        quy_cach: 1,
        cao_su_aa_ab: 2,
        cao_su_ac: 3,
        cao_su_bc: 4,
        cao_su_cc: 5,
        thong_nzl_aa: 6,
      },
    },
  },
  // ====== GỖ GHÉP — GỖ GHÉP CAO SU PHỦ VENEER (rows 13-16) ======
  {
    name: 'GỖ GHÉP (Phủ Veneer)',
    table: 'bang_gia_chuan_phu_veneer',
    config: {
      sheetName: 'GỖ GHÉP',
      headerRow: 11,
      dataStartRow: 13,
      dataEndRow: 16,
      skipEmpty: true,
      colMap: {
        stt: 0,
        quy_cach: 1,
        xoan_1m: 2,
        xoan_2m: 3,
        soi_1m: 4,
        soi_2m: 5,
        soi_kt_1m: 6,
        soi_kt_2m: 7,
        oc_cho_kt_1m: 8,
        oc_cho_kt_2m: 9,
      },
    },
  },
  // ====== VÁN ÉP — Thanh Thùy (rows 4-12) ======
  {
    name: 'VÁN ÉP (Thanh Thùy)',
    table: 'bang_gia_chuan_van_ep',
    config: {
      sheetName: 'VÁN ÉP',
      headerRow: 2,
      dataStartRow: 4,
      dataEndRow: 12,
      skipEmpty: true,
      colMap: {
        stt: 0,
        quy_cach: 1,
        kt_1000x2000: 2,
        kt_1220x2440: 3,
      },
    },
  },
  // ====== VÁN ÉP — Các loại khác (Nhập khẩu, Phủ phim, Phủ veneer, Okume) ======
  {
    name: 'VÁN ÉP (Khác)',
    table: 'bang_gia_chuan_van_ep_khac',
    isVanEpKhac: true,
  },
  // ====== PVC FILM - DURA+ (mã màu) ======
  {
    name: 'PVC FILM - DURA+',
    table: 'bang_gia_chuan_pvc_film_dura',
    isPvcFilmDura: true,
  },
  // ====== VÁN PHỦ PVC FILM - PETG (giá) ======
  {
    name: 'VÁN PHỦ PVC FILM - PETG',
    table: 'bang_gia_chuan_van_phu_pvc_petg',
    isVanPhuPvcPetg: true,
  },
  // ====== VÁN NHỰA DURABO ======
  {
    name: 'VÁN NHỰA DURABO',
    table: 'bang_gia_chuan_durabo',
    isDurabo: true,
  },
  // ====== OSB ======
  {
    name: 'OSB',
    table: 'bang_gia_chuan_osb',
    isOSB: true,
  },
  // ====== BẢNG NHÓM MÀU MELAMINE (mới) ======
  {
    name: 'BẢNG NHÓM MÀU MELAMINE',
    table: 'bang_gia_chuan_mau_melamine_2',
    isMauMelamine2: true,
  },
  // ====== MELAMINE PLYWOOD ======
  {
    name: 'MELAMINE PLYWOOD',
    table: 'bang_gia_chuan_melamine_plywood',
    isMelaminePlywood: true,
  },
  // ====== VÁN NHỰA-OSB-GGHÉP PHỦ MELAMINE ======
  {
    name: 'VÁN NHỰA-OSB-GGHÉP PHỦ MELAMINE',
    table: 'bang_gia_chuan_melamine_nhua_osb_ghep',
    isMelamineNhuaOsbGhep: true,
  },
  // ====== VENEER ======
  {
    name: 'VENEER',
    table: 'bang_gia_chuan_veneer',
    isVeneer: true,
  },
  // ====== MẶT PHỦ KHÁC ======
  {
    name: 'MẶT PHỦ KHÁC',
    table: 'bang_gia_chuan_mat_phu_khac',
    isMatPhuKhac: true,
  },
  // ====== CHỈ NẸP ======
  {
    name: 'CHỈ NẸP',
    table: 'bang_gia_chuan_chi_nep',
    isChiNep: true,
  },
  // ====== KEO HẠT ======
  {
    name: 'KEO HẠT',
    table: 'bang_gia_chuan_keo_hat',
    isKeoHat: true,
  },
  // ====== NHÓM 98 MÀU MELAMINE PHỔ THÔNG ======
  {
    name: 'NHÓM 98 MÀU MELAMINE PHỔ THÔNG',
    table: 'bang_gia_chuan_98_mau',
    config: {
      headerRow: 2,
      dataStartRow: 3,
      skipEmpty: true,
      colMap: {
        stt: 0,
        wood_1: 1,
        wood_2: 2,
        wood_3: 3,
        wood_4: 4,
        wood_5: 5,
        wood_6: 6,
        wood_7: 7,
        art: 8,
        color_code: 9,
        color_name: 10,
      },
    },
  },
]

const output = []

for (const sheet of sheets) {
  let data
  if (sheet.isColor220) {
    data = parseColorSheet(wb, 'MẶT PHỦ MELAMINE', sheet.config)
  } else if (sheet.isVanEpKhac) {
    data = parseVanEpKhac(wb)
  } else if (sheet.isOSB) {
    data = parseOSB(wb)
  } else if (sheet.isDurabo) {
    data = parseDurabo(wb)
  } else if (sheet.isPvcFilmDura) {
    data = parsePvcFilmDura(wb)
  } else if (sheet.isVanPhuPvcPetg) {
    data = parseVanPhuPvcPetg(wb)
  } else if (sheet.isMauMelamine2) {
    data = parseMauMelamine2(wb)
  } else if (sheet.isMelaminePlywood) {
    data = parseMelaminePlywood(wb)
  } else if (sheet.isMelamineNhuaOsbGhep) {
    data = parseMelamineNhuaOsbGhep(wb)
  } else if (sheet.isVeneer) {
    data = parseVeneerMatPhuKhac(wb)
  } else if (sheet.isMatPhuKhac) {
    data = parseMatPhuKhac(wb)
  } else if (sheet.isChiNep) {
    data = parseChiNep(wb)
  } else if (sheet.isKeoHat) {
    data = parseKeoHat(wb)
  } else {
    data = parseSheet(wb, sheet.name, sheet.config)
  }
  output.push({
    table: sheet.table,
    name: sheet.name,
    count: data.length,
    data,
  })
  console.log(`${sheet.name}: ${data.length} rows parsed`)
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8')
console.log(`\nWritten to ${OUTPUT_PATH}`)

// Build 220 Economy Wood lookup: numeric_value → original ma_mau (preserving leading zeros)
const color220Item = output.find(o => o.table === 'bang_gia_chuan_mau_melamine')
const ecoWoodLookup = {}
if (color220Item) {
  for (const item of color220Item.data) {
    if (item.nhom === 'Economy' && item.loai === 'Wood') {
      const num = parseInt(item.ma_mau)
      if (!isNaN(num) && !ecoWoodLookup[num]) {
        ecoWoodLookup[num] = item.ma_mau
      }
    }
  }
}

// Also generate SQL
const allSqlLines = []

for (const item of output) {
  const { table, data } = item
  if (data.length === 0) continue

  const cols = [...new Set(data.flatMap(row => Object.keys(row)))]
  const sqlLines = []

  for (const row of data) {
    const values = cols.map(c => {
      let v = row[c]
      if (v === null || v === undefined) return 'NULL'
      // For 98 mau, cross-reference wood_x columns with 220 Economy Wood to preserve leading zeros
      if (table === 'bang_gia_chuan_98_mau' && typeof v === 'number' && c.startsWith('wood_') && ecoWoodLookup[v]) {
        v = ecoWoodLookup[v]
      }
      if (typeof v === 'number') return v
      return `'${String(v).replace(/'/g, "''")}'`
    })
    sqlLines.push(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${values.join(', ')});`)
  }

  console.log(`\n--- SQL for ${table} (${sqlLines.length} rows) ---`)
  console.log(sqlLines.join('\n'))
  allSqlLines.push(`-- ${table} (${sqlLines.length} rows)`, ...sqlLines)
}

// Write combined SQL file
if (allSqlLines.length > 0) {
  const sqlPath = 'import-gia-chuan-data.sql'
  fs.writeFileSync(sqlPath, allSqlLines.join('\n'), 'utf-8')
  console.log(`\nWritten to ${sqlPath}`)
}
