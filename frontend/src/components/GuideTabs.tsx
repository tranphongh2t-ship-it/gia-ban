import { useState } from 'react'
import { colors, radius, shadow } from '../theme'

export type GuideBlock =
  | { type: 'paragraphs'; text: string[] }
  | { type: 'codeTable'; codeTable: { code: string; parts: { token: string; meaning: string }[]; note?: string }[] }
  | { type: 'formulaTable'; formulas: { label: string; formula: string; example?: string }[] }
  | { type: 'steps'; steps: string[] }
  | { type: 'genericTable'; table: { columns: string[]; rows: (string | number)[][] } }
  | { type: 'notes'; notes: string[] }

export interface GuideSection {
  title: string
  content: GuideBlock[]
}

export interface GuideTabDef {
  key: string
  label: string
  sections: GuideSection[]
}

interface GuideTabsProps {
  title?: string
  tabs: GuideTabDef[]
  defaultKey?: string
}

const panelStyle: React.CSSProperties = {
  background: colors.card,
  borderRadius: radius.lg,
  border: `1px solid ${colors.border}`,
  boxShadow: shadow.card,
  overflow: 'hidden',
  marginTop: 16,
}

function CodeTable({ items }: { items: { code: string; parts: { token: string; meaning: string }[]; note?: string }[] }) {
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <code style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: colors.primary }}>{item.code}</code>
          {item.note && <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>{item.note}</div>}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 8 }}>
            <tbody>
              {item.parts.map((p, j) => (
                <tr key={j}>
                  <td style={{ padding: '6px 12px', borderBottom: `1px solid ${colors.borderLight}`, width: 90 }}>
                    <code style={{ fontFamily: 'monospace', fontWeight: 700, color: colors.warning, fontSize: 13 }}>{p.token}</code>
                  </td>
                  <td style={{ padding: '6px 12px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.textSecondary, fontSize: 13 }}>{p.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

function FormulaTable({ items }: { items: { label: string; formula: string; example?: string }[] }) {
  const hasExample = items.some(f => f.example)
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr>
          <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: colors.textMuted, borderBottom: `1px solid ${colors.border}`, background: colors.surfaceSecondary, whiteSpace: 'nowrap' }}>Loại giá</th>
          <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: colors.textMuted, borderBottom: `1px solid ${colors.border}`, background: colors.surfaceSecondary, whiteSpace: 'nowrap' }}>Công thức</th>
          {hasExample && (
            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: colors.textMuted, borderBottom: `1px solid ${colors.border}`, background: colors.surfaceSecondary, whiteSpace: 'nowrap' }}>Ví dụ</th>
          )}
        </tr>
      </thead>
      <tbody>
        {items.map((f, i) => (
          <tr key={i}>
            <td style={{ padding: '8px 12px', borderBottom: `1px solid ${colors.borderLight}`, fontWeight: 600, whiteSpace: 'nowrap' }}>{f.label}</td>
            <td style={{ padding: '8px 12px', borderBottom: `1px solid ${colors.borderLight}`, fontFamily: 'monospace', fontSize: 12.5, color: colors.textSecondary }}>{f.formula}</td>
            {hasExample && (
              <td style={{ padding: '8px 12px', borderBottom: `1px solid ${colors.borderLight}`, color: colors.textSecondary, fontSize: 12.5 }}>{f.example}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function GenericTable({ items }: { items: { columns: string[]; rows: (string | number)[][] } }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr>
          {items.columns.map((c, i) => (
            <th key={i} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: colors.textMuted, borderBottom: `1px solid ${colors.border}`, background: colors.surfaceSecondary, whiteSpace: 'nowrap' }}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} style={{ padding: '8px 12px', borderBottom: `1px solid ${colors.borderLight}`, color: j === 0 ? colors.text : colors.textSecondary, fontSize: 12.5, fontFamily: j === 0 ? 'monospace' : 'inherit', whiteSpace: j === 0 ? 'nowrap' : 'normal' }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SectionBody({ content }: { content: GuideBlock[] }) {
  return (
    <div>
      {content.map((block, i) => {
        switch (block.type) {
          case 'paragraphs':
            return (
              <div key={i} style={{ marginBottom: 12 }}>
                {block.text.map((t, j) => (
                  <p key={j} style={{ margin: '0 0 8px', fontSize: 13, color: colors.textSecondary, lineHeight: 1.6 }}>{t}</p>
                ))}
              </div>
            )
          case 'codeTable':
            return <CodeTable key={i} items={block.codeTable} />
          case 'formulaTable':
            return <FormulaTable key={i} items={block.formulas} />
          case 'steps':
            return (
              <ol key={i} style={{ margin: 0, paddingLeft: 20 }}>
                {block.steps.map((s, j) => (
                  <li key={j} style={{ marginBottom: 8, fontSize: 13, color: colors.textSecondary, lineHeight: 1.6 }}>{s}</li>
                ))}
              </ol>
            )
          case 'genericTable':
            return <GenericTable key={i} items={block.table} />
          case 'notes':
            return (
              <div key={i} style={{ background: colors.warningLight, border: `1px solid ${colors.warning}`, borderRadius: radius.md, padding: '10px 14px', fontSize: 12.5, color: colors.text }}>
                {block.notes.map((n, j) => (
                  <div key={j} style={{ marginBottom: j === block.notes.length - 1 ? 0 : 6 }}>⚠️ {n}</div>
                ))}
              </div>
            )
          default:
            return null
        }
      })}
    </div>
  )
}

export default function GuideTabs({ title, tabs, defaultKey }: GuideTabsProps) {
  const [active, setActive] = useState(defaultKey || tabs[0]?.key || '')
  const current = tabs.find(t => t.key === active) || tabs[0]

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${colors.border}`, background: colors.surfaceSecondary, padding: '0 8px', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: 600,
              color: active === t.key ? colors.primary : colors.textMuted,
              borderBottom: active === t.key ? `2px solid ${colors.primary}` : '2px solid transparent',
              whiteSpace: 'nowrap',
            }}
          >{t.label}</button>
        ))}
      </div>
      <div style={{ padding: 16 }}>
        {title && <h3 style={{ fontSize: 14, fontWeight: 700, color: colors.text, margin: '0 0 14px' }}>{title}</h3>}
        {current?.sections.map((section, i) => (
          <div key={i} style={i > 0 ? { marginTop: 16 } : undefined}>
            {section.title && <h4 style={{ fontSize: 12.5, fontWeight: 700, color: colors.text, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 0.4 }}>{section.title}</h4>}
            <SectionBody content={section.content} />
          </div>
        ))}
      </div>
    </div>
  )
}
