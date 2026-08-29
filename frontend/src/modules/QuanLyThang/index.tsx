import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPost } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import BangCkThangPage from '../BangCkThang'
import {
  colors, shadow, radius, btn, input, select,
  pageContainer, pageTitle, pageSubtitle, spinner,
} from '../../theme'
import { formatNum } from '../../lib/format'

type Tab = 'tao' | 'bang' | 'tinh'

const currentMonth = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const nextMonth = (m: string): string => {
  const y = parseInt(m.slice(0, 4)), mo = parseInt(m.slice(5, 7))
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`
}

const STEPS: { key: Tab; num: string; title: string; desc: string }[] = [
  { key: 'tao', num: '1', title: 'Tạo tháng mới', desc: 'Copy từ tháng trước, không nhập lại' },
  { key: 'bang', num: '2', title: 'Bảng chiết khấu', desc: 'Xem & sửa bảng cố định / lũy tiến' },
  { key: 'tinh', num: '3', title: 'Tính toán & chốt', desc: 'Phân loại màu, chốt số, kiểm tra' },
]

export default function QuanLyThangPage() {
  const [tab, setTab] = useState<Tab>('tao')
  const [thang, setThang] = useState(currentMonth())
  const [thangs, setThangs] = useState<string[]>([])
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    apiGet('/chiet-khau/quan-ly-thang/thangs')
      .then(res => setThangs(res.thangs || []))
      .catch((e: any) => setMsg({ type: 'err', text: e.message }))
  }, [])

  return (
    <div style={pageContainer}>
      <h1 style={pageTitle}>Quản lý tháng</h1>
      <p style={pageSubtitle}>
        Mỗi tháng chỉ 3 việc: <b>tạo tháng mới</b> (copy từ tháng trước) → <b>sửa mức chung</b> nếu có thay đổi → <b>tính toán &amp; chốt</b>.
        Mức riêng từng khách chỉnh tại <Link to="/bang-khach-thang" style={{ color: colors.infoDark, fontWeight: 700 }}>Khách hàng theo tháng →</Link>
      </p>

      {/* ===== Stepper 3 bước ===== */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
        {STEPS.map(s => {
          const on = tab === s.key
          return (
            <button
              key={s.key}
              onClick={() => setTab(s.key)}
              style={{
                flex: '1 1 220px', minWidth: 200, textAlign: 'left', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                background: on ? colors.primaryLight : colors.card,
                border: `1px solid ${on ? colors.primary : colors.border}`,
                borderRadius: radius.lg, color: colors.text,
                boxShadow: on ? shadow.cardHover : 'none',
                transition: 'background 120ms, border-color 120ms',
              }}
            >
              <span style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 700,
                background: on ? colors.primary : colors.surfaceSecondary,
                color: on ? '#fff' : colors.textMuted,
              }}>{s.num}</span>
              <span>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: on ? colors.text : colors.textSecondary }}>{s.title}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: colors.textMuted, marginTop: 2 }}>{s.desc}</span>
              </span>
              <span style={{ marginLeft: 'auto', color: on ? colors.primary : colors.textDisabled, fontSize: 16 }}>›</span>
            </button>
          )
        })}
      </div>

      {/* ===== Chọn tháng ===== */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <label style={{ fontSize: 13, color: colors.textMuted }}>Đang làm việc với tháng:</label>
        <select style={{ ...select, minWidth: 130 }} value={thang} onChange={e => setThang(e.target.value)}>
          <option value={thang}>{thang}</option>
          {thangs.filter(t => t !== thang).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {msg && (
        <div style={{ padding: 12, background: msg.type === 'ok' ? colors.successLight : colors.dangerLight, color: msg.type === 'ok' ? colors.successDark : colors.danger, borderRadius: radius.md, marginBottom: 14, fontSize: 13, border: `1px solid ${msg.type === 'ok' ? colors.success : colors.danger}33` }}>
          {msg.text}
        </div>
      )}

      {tab === 'tao' && <TaoThangTab thangs={thangs} baseThang={thang} onMsg={setMsg} />}
      {tab === 'bang' && <BangCkThangPage />}
      {tab === 'tinh' && <TinhToanTab thang={thang} onMsg={setMsg} />}
    </div>
  )
}

// ============ BƯỚC 1: Tạo tháng mới (copy) ============
const COPY_ITEMS: { key: 'op1' | 'op2' | 'bac' | 'khach'; title: string; desc: string }[] = [
  { key: 'op1', title: 'Bảng cố định (ck_op1)', desc: 'Mức % theo nhóm sản phẩm × vùng' },
  { key: 'op2', title: 'Bảng lũy tiến (ck_op2)', desc: 'Mức % theo vùng × bậc doanh số' },
  { key: 'bac', title: 'Bậc riêng từng đại lý', desc: 'Mức % ghi theo từng mã khách' },
  { key: 'khach', title: 'Khách theo tháng', desc: 'Khách Premium & khách được chỉnh tay' },
]

function TaoThangTab({ thangs, baseThang, onMsg }: { thangs: string[]; baseThang: string; onMsg: (m: { type: 'ok' | 'err'; text: string } | null) => void }) {
  const { user } = useAuth()
  const [thangMoi, setThangMoi] = useState(nextMonth(baseThang))
  const [nguon, setNguon] = useState('')
  const [picks, setPicks] = useState<Record<string, boolean>>({ op1: true, op2: true, bac: true, khach: true })
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<any>(null)

  const valid = /^\d{4}-\d{2}$/.test(thangMoi)

  const run = async () => {
    onMsg(null); setResult(null)
    setBusy(true)
    try {
      const res = await apiPost('/chiet-khau/quan-ly-thang/tao-thang', {
        thang_moi: thangMoi, nguon: nguon || undefined,
        copy_op1: picks.op1, copy_op2: picks.op2, copy_bac_thang: picks.bac, copy_khach: picks.khach,
        updated_by: user?.ten || '',
      })
      setResult(res)
      onMsg({ type: 'ok', text: `Đã tạo tháng ${thangMoi} thành công — sang bước 2 để xem bảng chiết khấu` })
    } catch (e: any) { onMsg({ type: 'err', text: e.message }) }
    finally { setBusy(false) }
  }

  const lbl = (name: string) => {
    const r = result?.ket_qua?.[name]
    if (!r) return null
    if (r.so_dong) return { ok: true, text: `Sao chép ${r.so_dong} dòng từ ${r.over || 'tháng gần nhất'}` }
    return { ok: false, text: `Chưa có dữ liệu ở tháng ${r.over || 'gần nhất'} — bảng sẽ để trống` }
  }

  return (
    <div style={{ background: colors.card, borderRadius: radius.lg, boxShadow: shadow.card, border: `1px solid ${colors.border}`, padding: 20, maxWidth: 760 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Tạo tháng mới — sao chép từ tháng trước</div>
      <div style={{ fontSize: 12.5, color: colors.textMuted, marginBottom: 16 }}>
        Tháng mới tự kế thừa toàn bộ dữ liệu đã nhập, bạn chỉ sửa những chỗ khác biệt. Không bao giờ phải nhập lại từ đầu.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Tháng mới</label>
          <input style={{ ...input, width: '100%', fontSize: 15, fontWeight: 600 }} value={thangMoi} onChange={e => setThangMoi(e.target.value)} placeholder="YYYY-MM" />
          {!valid && <span style={{ fontSize: 11.5, color: colors.warningDark }}>Nhập dạng YYYY-MM, ví dụ 2026-09</span>}
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Sao chép từ</label>
          <select style={{ ...select, width: '100%' }} value={nguon} onChange={e => setNguon(e.target.value)}>
            <option value="">Tự tìm tháng gần nhất có dữ liệu</option>
            {thangs.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginBottom: 18 }}>
        {COPY_ITEMS.map(it => {
          const on = picks[it.key]
          return (
            <label
              key={it.key}
              style={{
                display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', padding: 12,
                background: on ? colors.primaryLight : colors.surfaceSecondary,
                border: `1px solid ${on ? colors.primary : colors.border}`,
                borderRadius: radius.md, transition: 'background 120ms, border-color 120ms',
              }}
            >
              <input type="checkbox" style={{ marginTop: 3, accentColor: colors.primary }} checked={on} onChange={() => setPicks(p => ({ ...p, [it.key]: !on }))} />
              <span>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.text }}>{it.title}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: colors.textMuted, marginTop: 2 }}>{it.desc}</span>
              </span>
            </label>
          )
        })}
      </div>

      <button style={{ ...btn(colors.primary, '#fff', 'lg'), fontWeight: 700 }} disabled={busy || !valid} onClick={run}>
        {busy ? 'Đang tạo...' : `Tạo tháng ${valid ? thangMoi : ''} & Sao chép`}
      </button>

      {result && (
        <div style={{ marginTop: 16, background: colors.surfaceSecondary, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Kết quả — tháng {result.thang_moi} (nguồn: {result.nguon || 'tự tìm'})</div>
          {([['ck_op1', 'Bảng cố định (ck_op1)'], ['ck_op2', 'Bảng lũy tiến (ck_op2)'], ['op2_bac_thang', 'Bậc riêng từng đại lý'], ['khach_theo_thang', 'Khách theo tháng']] as const).map(([k, label]) => {
            const r = lbl(k)
            if (!r) return null
            return (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 12.5, color: colors.textSecondary }}>
                <span style={{ color: r.ok ? colors.success : colors.warning, fontWeight: 700 }}>{r.ok ? '✓' : '△'}</span>
                <span style={{ minWidth: 230 }}>{label}</span>
                <span style={{ color: colors.textMuted }}>{r.text}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============ BƯỚC 3: Tính toán & chốt ============
type TK = { tong: number; dung: number; sai: number; sai_lech: number; pass_pct: number; nguon: string }

function TinhToanTab({ thang, onMsg }: { thang: string; onMsg: (m: { type: 'ok' | 'err'; text: string } | null) => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [thongKe, setThongKe] = useState<TK | null>(null)

  const run = async (label: string, fn: () => Promise<string>) => {
    setBusy(label); onMsg(null)
    try {
      const text = await fn()
      onMsg({ type: 'ok', text })
    } catch (e: any) { onMsg({ type: 'err', text: e.message }) }
    finally { setBusy(null) }
  }

  const fillMau = () => run('fillMau', async () => {
    const res = await apiPost('/chiet-khau/quan-ly-thang/fill-mau', {})
    return `Đã nhận diện ${res.filled} mã màu mới (98 phổ thông: ${res.p98_pho_thong}, màu khác: ${res.khac})`
  })

  const chotThang = () => run('chot', async () => {
    const res = await apiPost('/chiet-khau/chot-thang', { thang })
    return `Đã chốt doanh số Mel tháng ${thang} cho ${res.so_khach || res.so_dong || '?'} khách (${res.nguon === 'file' ? 'theo file Audit Chiết Khấu' : 'theo sổ bán hàng'})`
  })

  const tinhHet = () => run('tinhHet', async () => {
    const res = await apiPost('/chiet-khau/tinh-het', {})
    return `Đã tính lại chiết khấu cho toàn bộ ${res.so_dong} dòng bán hàng (${res.nguon === 'file' ? 'theo file Audit Chiết Khấu' : 'theo sổ bán hàng'})`
  })

  const xemThongKe = () => run('thongKe', async () => {
    const res = await apiGet('/chiet-khau/thong-ke')
    setThongKe(res)
    return `Đối chiếu: ${res.dung}/${res.tong} dòng đúng (${res.pass_pct}%) — ${res.nguon === 'file' ? 'theo file Audit Chiết Khấu' : 'theo sổ bán hàng'}`
  })

  const steps: { key: string; num: string; title: string; desc: string; label: string; fn: () => void }[] = [
    { key: 'fillMau', num: '1', title: 'Phân loại màu mới', desc: 'Nhận diện màu 98 phổ thông cho các mã ME* mới xuất hiện trong dữ liệu tháng này — làm trước khi tính.', label: 'Phân loại màu', fn: fillMau },
    { key: 'chot', num: '2', title: 'Chốt doanh số tháng', desc: 'Tổng hợp doanh số Mel theo từng khách cho tháng đang chọn (dùng cho thưởng tháng/năm).', label: 'Chốt doanh số tháng', fn: chotThang },
    { key: 'tinhHet', num: '3', title: 'Tính lại chiết khấu', desc: 'Chạy lại công thức 5 lớp cho mọi dòng bán hàng theo bảng CK mới nhất.', label: 'Tính lại chiết khấu', fn: tinhHet },
    { key: 'thongKe', num: '4', title: 'Xem kết quả đối chiếu', desc: 'So chiết khấu tính ra với chiết khấu ghi trong sổ — biết ngay dòng nào khớp, dòng nào lệch.', label: 'Xem đối chiếu', fn: xemThongKe },
  ]

  return (
    <div style={{ display: 'grid', gap: 10, maxWidth: 860 }}>
      {steps.map(s => (
        <div key={s.key} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 14, background: colors.card, borderRadius: radius.lg, boxShadow: shadow.card, border: `1px solid ${colors.border}` }}>
          <span style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 700, background: colors.surfaceSecondary, color: colors.textMuted,
          }}>{s.num}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: colors.text }}>{s.title}</div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 1.5 }}>{s.desc}</div>
          </div>
          <button style={btn(s.key === 'thongKe' ? colors.info : colors.primary)} disabled={busy !== null} onClick={s.fn}>
            {busy === s.key ? 'Đang xử lý...' : s.label}
          </button>
        </div>
      ))}

      {thongKe && (
        <div style={{ display: 'grid', gap: 10, marginTop: 4 }}>
          <div style={{ fontSize: 12, color: colors.textMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700 }}>Nguồn dữ liệu:</span>
            <span style={{ padding: '2px 8px', borderRadius: 999, background: thongKe.nguon === 'file' ? colors.infoLight || '#e3f2fd' : colors.surfaceSecondary, color: colors.textSecondary, fontSize: 11.5 }}>{thongKe.nguon === 'file' ? 'File Audit Chiết Khấu' : 'Sổ bán hàng thật'}</span>
            {thongKe.nguon === 'file' && <span>— dữ liệu từ file vừa tải lên (tự xóa sau 6h), thấp nhất = file; không có file sẽ fallback về sổ</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          {[
            { label: 'Dòng khớp', value: formatNum(thongKe.dung), color: colors.success, bg: colors.successLight },
            { label: 'Dòng lệch', value: formatNum(thongKe.sai), color: colors.danger, bg: colors.dangerLight },
            { label: 'Tỷ lệ đúng', value: `${thongKe.pass_pct}%`, color: thongKe.pass_pct >= 95 ? colors.success : colors.warning, bg: thongKe.pass_pct >= 95 ? colors.successLight : colors.warningLight },
            { label: 'Tổng số tiền lệch', value: formatNum(Math.round(thongKe.sai_lech)), color: colors.textSecondary, bg: colors.surfaceSecondary },
          ].map(c => (
            <div key={c.label} style={{ padding: 14, background: c.bg, border: `1px solid ${colors.border}`, borderRadius: radius.lg }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 4 }}>{c.label} (tổng {formatNum(thongKe.tong)} dòng)</div>
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  )
}
