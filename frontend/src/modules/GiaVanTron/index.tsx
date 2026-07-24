import { useState, useEffect, useMemo } from 'react'
import DataGrid, { Column } from '../../components/DataGrid'
import { apiGet, apiPost } from '../../lib/api'
import { colors, pageContainer, pageTitle, input, section, sectionTitle, btn, radius, shadow } from '../../theme'
import { formatNum } from '../../lib/format'

const TABS = [
  { key: 'cot-go', label: 'Cốt gỗ' },
  { key: 'be-mat', label: 'Bề mặt' },
  { key: 'ma-mau', label: 'Mã màu' },
]

const cotGoCols: Column[] = [
  { key: 'loai', label: 'Loại cốt gỗ', filterable: true },
  { key: 'tier', label: 'Tier', type: 'select', options: [
    { value: 'PREMIUM', label: 'PREMIUM' },
    { value: 'BBG PREMIER', label: 'BBG PREMIER' },
  ]},
  { key: 'do_day', label: 'Độ dày', filterable: true },
  { key: 'cap', label: 'Cấp', filterable: true },
  { key: 'gia', label: 'Giá', type: 'number' },
  { key: 'gia_phu', label: 'Giá phụ' },
]

const maMauCols: Column[] = [
  { key: 'bang', label: 'Bảng', filterable: true },
  { key: 'tier', label: 'Tier', type: 'select', options: [
    { value: 'PREMIUM', label: 'PREMIUM' },
    { value: 'BBG PREMIER', label: 'BBG PREMIER' },
  ]},
  { key: 'nhom', label: 'Nhóm', filterable: true },
  { key: 'ma_mau', label: 'Mã màu', filterable: true },
  { key: 'ten_mau', label: 'Tên màu' },
]

export default function GiaVanTronPage() {
  const [tab, setTab] = useState('cot-go')
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState('')
  const [calc, setCalc] = useState({
    loai: '', do_day: '', cap: '', tier: '',
    bang: '220 MÀU MELAMINE', nhom: '', so_mat: '2',
  })
  const [calcResult, setCalcResult] = useState<{ core: number | null; surface: number | null; total: number } | null>(null)
  const [distinct, setDistinct] = useState<Record<string, string[]>>({})
  const [calcLoading, setCalcLoading] = useState(false)

  // Core price for Bề mặt tab calculated columns
  const [beMatCore, setBeMatCore] = useState<{ loai: string; do_day: string; cap: string; tier: string }>({ loai: '', do_day: '', cap: '', tier: '' })
  const [beMatCorePrice, setBeMatCorePrice] = useState<number | null>(null)

  const beMatCols: Column[] = useMemo(() => {
    const cols: Column[] = [
      { key: 'bang', label: 'Bảng', filterable: true },
      { key: 'tier', label: 'Tier', type: 'select', options: [
        { value: 'PREMIUM', label: 'PREMIUM' },
        { value: 'BBG PREMIER', label: 'BBG PREMIER' },
      ]},
      { key: 'nhom', label: 'Nhóm', filterable: true },
      { key: 'loai_mau', label: 'Loại màu' },
      { key: 'gia_1_mat', label: 'Giá 1 mặt', type: 'number' },
      { key: 'gia_2_mat', label: 'Giá 2 mặt', type: 'number' },
    ]
    if (beMatCorePrice !== null) {
      cols.push({
        key: '_tong_1m', label: `Ván 1 mặt (${formatNum(beMatCore)}+)`, type: 'number',
        render: (v: any, row: any) => formatNum((beMatCorePrice || 0) + (row.gia_1_mat || 0)),
      })
      cols.push({
        key: '_tong_2m', label: `Ván 2 mặt (${formatNum(beMatCore)}+)`, type: 'number',
        render: (v: any, row: any) => formatNum((beMatCorePrice || 0) + (row.gia_2_mat || 0)),
      })
    }
    return cols
  }, [beMatCorePrice])

  useEffect(() => {
    Promise.all([
      fetchDistinct('bang_gia_cot_go', 'loai'),
      fetchDistinct('bang_gia_cot_go', 'tier'),
      fetchDistinct('bang_gia_cot_go', 'do_day'),
      fetchDistinct('bang_gia_cot_go', 'cap'),
      fetchDistinct('bang_gia_nhom_mau', 'bang'),
      fetchDistinct('bang_gia_nhom_mau', 'nhom'),
    ])
  }, [])

  const fetchDistinct = async (table: string, field: string) => {
    try {
      const res = await apiGet(`/gia-van-tron/distinct?table=${table}&field=${field}`)
      setDistinct(prev => ({ ...prev, [`${table}_${field}`]: res.data }))
    } catch {}
  }

  const fetchBeMatCorePrice = async (loai: string, do_day: string, cap: string, tier: string) => {
    if (!loai || !do_day || !cap || !tier) { setBeMatCorePrice(null); return }
    try {
      const res = await apiGet(`/gia-van-tron/calc?loai=${encodeURIComponent(loai)}&do_day=${encodeURIComponent(do_day)}&cap=${encodeURIComponent(cap)}&tier=${encodeURIComponent(tier)}&bang=dummy&nhom=dummy&so_mat=1`)
      setBeMatCorePrice(res.core)
    } catch { setBeMatCorePrice(null) }
  }

  const handleCalc = async () => {
    const { loai, do_day, cap, tier, bang, nhom, so_mat } = calc
    if (!loai || !do_day || !cap || !tier || !nhom) return
    setCalcLoading(true)
    try {
      const res = await apiGet(`/gia-van-tron/calc?loai=${encodeURIComponent(loai)}&do_day=${encodeURIComponent(do_day)}&cap=${encodeURIComponent(cap)}&tier=${encodeURIComponent(tier)}&bang=${encodeURIComponent(bang)}&nhom=${encodeURIComponent(nhom)}&so_mat=${so_mat}`)
      setCalcResult(res)
    } catch {}
    setCalcLoading(false)
  }

  const inputS = { ...input, width: 160, fontSize: 12 }

  const handleSeed = async () => {
    if (!confirm('Bổ sung dữ liệu thiếu (PREMIUM 220 MÀU MELAMINE + MÀU TỐI)?')) return
    setSeeding(true); setSeedResult('')
    try {
      const r = await apiPost('/pricing/seed-van-phu-missing', {})
      setSeedResult(r.message || `OK: ${r.inserted} bản ghi`)
    } catch (e: any) { setSeedResult('Lỗi: ' + e.message) }
    finally { setSeeding(false) }
  }

  return (
    <div style={pageContainer}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={pageTitle}>Giá Ván Trơn</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {seedResult && <span style={{ fontSize: 12, color: seedResult.startsWith('Lỗi') ? colors.danger : colors.success }}>{seedResult}</span>}
          <button style={{ ...btn(colors.warning, '#fff'), fontSize: 12, height: 32 }} onClick={handleSeed} disabled={seeding}>
            {seeding ? 'Đang bổ sung...' : 'Bổ sung dữ liệu thiếu'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 0, borderBottom: `1px solid ${colors.border}` }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
            background: tab === t.key ? 'transparent' : 'transparent',
            color: tab === t.key ? colors.primary : colors.textMuted,
            borderBottom: tab === t.key ? `2px solid ${colors.primary}` : '2px solid transparent',
            transition: 'color 120ms, border-color 120ms',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ marginTop: 16 }}>
        {tab === 'cot-go' && <DataGrid title="" columns={cotGoCols} apiPath="/bang-gia-cot-go" searchable={true} />}
        {tab === 'be-mat' && (
          <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12, padding: 12, background: colors.surfaceSecondary, borderRadius: radius.md }}>
              <span style={{ fontSize: 12, color: colors.textMuted, fontWeight: 500 }}>Chọn cốt để tính ván phủ:</span>
              <select style={{ ...inputS, width: 140 }} value={beMatCore.loai} onChange={e => { const v = e.target.value; const n = { ...beMatCore, loai: v }; setBeMatCore(n); fetchBeMatCorePrice(n.loai, n.do_day, n.cap, n.tier) }}>
                <option value="">Loại cốt</option>
                {(distinct['bang_gia_cot_go_loai'] || []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <select style={{ ...inputS, width: 100 }} value={beMatCore.do_day} onChange={e => { const v = e.target.value; const n = { ...beMatCore, do_day: v }; setBeMatCore(n); fetchBeMatCorePrice(n.loai, n.do_day, n.cap, n.tier) }}>
                <option value="">Dày</option>
                {(distinct['bang_gia_cot_go_do_day'] || []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <select style={{ ...inputS, width: 140 }} value={beMatCore.cap} onChange={e => { const v = e.target.value; const n = { ...beMatCore, cap: v }; setBeMatCore(n); fetchBeMatCorePrice(n.loai, n.do_day, n.cap, n.tier) }}>
                <option value="">Cấp</option>
                {(distinct['bang_gia_cot_go_cap'] || []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <select style={{ ...inputS, width: 130 }} value={beMatCore.tier} onChange={e => { const v = e.target.value; const n = { ...beMatCore, tier: v }; setBeMatCore(n); fetchBeMatCorePrice(n.loai, n.do_day, n.cap, n.tier) }}>
                <option value="">Tier</option>
                {(distinct['bang_gia_cot_go_tier'] || []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {beMatCorePrice !== null && <span style={{ fontSize: 12, color: colors.primary, fontWeight: 600 }}>Cốt = {formatNum(beMatCorePrice)}</span>}
            </div>
            <DataGrid title="" columns={beMatCols} apiPath="/bang-gia-nhom-mau" searchable={true} />
          </>
        )}
        {tab === 'ma-mau' && <DataGrid title="" columns={maMauCols} apiPath="/bang-gia-ma-mau" searchable={true} />}
      </div>

      {/* Calculator */}
      <div style={{ ...section, marginTop: 24 }}>
        <div style={sectionTitle}>Tính thử — ghép mã và xem tổng giá</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select style={inputS} value={calc.loai} onChange={e => setCalc(p => ({ ...p, loai: e.target.value }))}>
            <option value="">Loại cốt</option>
            {(distinct['bang_gia_cot_go_loai'] || []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select style={inputS} value={calc.do_day} onChange={e => setCalc(p => ({ ...p, do_day: e.target.value }))}>
            <option value="">Độ dày</option>
            {(distinct['bang_gia_cot_go_do_day'] || []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select style={inputS} value={calc.cap} onChange={e => setCalc(p => ({ ...p, cap: e.target.value }))}>
            <option value="">Cấp</option>
            {(distinct['bang_gia_cot_go_cap'] || []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select style={inputS} value={calc.tier} onChange={e => setCalc(p => ({ ...p, tier: e.target.value }))}>
            <option value="">Tier</option>
            {(distinct['bang_gia_cot_go_tier'] || []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select style={inputS} value={calc.bang} onChange={e => setCalc(p => ({ ...p, bang: e.target.value }))}>
            {(distinct['bang_gia_nhom_mau_bang'] || []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select style={inputS} value={calc.nhom} onChange={e => setCalc(p => ({ ...p, nhom: e.target.value }))}>
            <option value="">Nhóm bề mặt</option>
            {(distinct['bang_gia_nhom_mau_nhom'] || []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select style={inputS} value={calc.so_mat} onChange={e => setCalc(p => ({ ...p, so_mat: e.target.value }))}>
            <option value="1">1 mặt</option>
            <option value="2">2 mặt</option>
          </select>
          <button style={{ ...btn(colors.primary), fontSize: 12 }} onClick={handleCalc} disabled={calcLoading}>
            {calcLoading ? 'Đang tính...' : 'Tính'}
          </button>
        </div>

        {calcResult && (
          <div style={{ display: 'flex', gap: 24, marginTop: 16, padding: 14, background: colors.surfaceSecondary, borderRadius: radius.md }}>
            <div><span style={{ color: colors.textMuted }}>Cốt gỗ:</span> <strong style={{ color: colors.text }}>{formatNum(calcResult.core)}</strong></div>
            <div><span style={{ color: colors.textMuted }}>Bề mặt:</span> <strong style={{ color: colors.text }}>{formatNum(calcResult.surface)}</strong></div>
            <div><span style={{ color: colors.textMuted }}>Tổng:</span> <strong style={{ color: colors.primary, fontSize: 16 }}>{formatNum(calcResult.total)}</strong></div>
          </div>
        )}
      </div>
    </div>
  )
}
