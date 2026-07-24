// Gentelella v4 — Dark theme tokens
export const colors = {
  primary: '#1ABB9C',
  primaryDark: '#169f85',
  primaryLight: 'rgba(26,187,156,0.14)',

  success: '#2fb344',
  successDark: '#1a8a32',
  successLight: 'rgba(47,179,68,0.16)',

  warning: '#f59f00',
  warningDark: '#c97f00',
  warningLight: 'rgba(245,159,0,0.16)',

  danger: '#d63939',
  dangerDark: '#a82b2b',
  dangerLight: 'rgba(214,57,57,0.16)',

  info: '#4299e1',
  infoDark: '#3182ce',
  infoLight: 'rgba(66,153,225,0.16)',

  blue: '#066fd1',
  azure: '#4299e1',
  green: '#2fb344',
  lime: '#74b816',
  yellow: '#f59f00',
  orange: '#f76707',
  red: '#d63939',
  pink: '#d6336c',
  purple: '#ae3ec9',
  indigo: '#4263eb',
  cyan: '#17a2b8',

  sidebar: '#1a2332',
  sidebarHover: 'rgba(255,255,255,0.04)',
  sidebarActive: 'rgba(26,187,156,0.14)',
  sidebarText: '#7b8fa3',
  sidebarTextHover: '#c5d0dc',
  sidebarBorder: 'rgba(255,255,255,0.06)',

  body: '#0f1623',
  card: '#1a2332',
  surfaceSecondary: '#141d2b',

  text: '#e6ebf2',
  textSecondary: '#b3bccb',
  textMuted: '#8a93a3',
  textDisabled: '#5a6473',

  border: 'rgba(255,255,255,0.08)',
  borderLight: 'rgba(255,255,255,0.05)',
  borderTranslucent: 'rgba(255,255,255,0.08)',

  tableBg: '#1a2332',
  tableHover: '#141d2b',
  tableBorder: 'rgba(255,255,255,0.08)',
  tableBorderLight: 'rgba(255,255,255,0.05)',

  badgeRed: '#d63939',
  badgeGreen: '#2fb344',
  badgeBlue: '#066fd1',
  badgeOrange: '#f59f00',
}

export const shadow = {
  card: '0 0 0 1px rgba(255,255,255,0.08), rgba(0,0,0,0.3) 0 2px 4px 0',
  cardHover: '0 0 0 1px rgba(255,255,255,0.10), rgba(0,0,0,0.4) 0 4px 8px 0',
  dropdown: '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08)',
  modal: '0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
  sidebar: 'none',
}

export const radius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  full: 9999,
}

export const card = (borderColor: string = colors.primary) => ({
  background: colors.card,
  borderRadius: radius.lg,
  padding: 16,
  boxShadow: shadow.card,
  border: `1px solid ${colors.border}`,
})

export const cardTitle = {
  fontSize: 13,
  fontWeight: 600,
  color: colors.text,
  margin: 0,
}

export const cardValue = {
  fontSize: 24,
  fontWeight: 700,
  color: colors.text,
  margin: '6px 0 0',
}

export const btn = (bg: string, color: string = '#fff', size: 'sm' | 'md' | 'lg' = 'md') => {
  const sizes = {
    sm: { height: 28, padding: '0 10px', fontSize: 12 },
    md: { height: 32, padding: '0 12px', fontSize: 12.5 },
    lg: { height: 38, padding: '0 16px', fontSize: 13.5 },
  }
  return {
    ...sizes[size],
    background: bg,
    color,
    border: '1px solid transparent',
    borderRadius: radius.sm,
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'background 120ms, border-color 120ms, color 120ms, box-shadow 120ms',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    outline: 'none',
    lineHeight: 1,
    whiteSpace: 'nowrap' as const,
  }
}

export const input = {
  height: 34,
  padding: '0 10px',
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  fontSize: 13,
  background: colors.card,
  color: colors.text,
  outline: 'none',
  transition: 'border-color 120ms, box-shadow 120ms',
}

export const select = {
  ...input,
  cursor: 'pointer',
}

export const badge = (bg: string, color: string) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 8px',
  borderRadius: radius.sm,
  fontSize: 11.5,
  fontWeight: 500,
  background: bg,
  color,
})

export const tableStyle = {
  base: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 13,
    background: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    boxShadow: shadow.card,
  },
  th: {
    textAlign: 'left' as const,
    padding: '8px 16px',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
    color: colors.textMuted,
    background: colors.surfaceSecondary,
    borderBottom: `1px solid ${colors.tableBorder}`,
  },
  td: {
    padding: '8px 16px',
    borderBottom: `1px solid ${colors.tableBorderLight}`,
    color: colors.textSecondary,
    verticalAlign: 'middle' as const,
    wordBreak: 'break-word' as const,
    overflowWrap: 'break-word' as const,
  },
}

export const pageContainer = {
  padding: '20px 24px',
}

export const pageTitle = {
  fontSize: 18,
  fontWeight: 600,
  lineHeight: 1.3,
  color: colors.text,
  margin: 0,
}

export const pageSubtitle = {
  fontSize: 13,
  color: colors.textMuted,
  margin: '4px 0 0',
}

export const section = {
  background: colors.card,
  borderRadius: radius.lg,
  padding: 16,
  boxShadow: shadow.card,
  marginTop: 16,
  border: `1px solid ${colors.border}`,
}

export const sectionTitle = {
  fontSize: 13,
  fontWeight: 600,
  color: colors.text,
  margin: '0 0 16px',
}

export const filterBar = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  flexWrap: 'wrap' as const,
  marginTop: 16,
  padding: 16,
  background: colors.card,
  borderRadius: radius.lg,
  boxShadow: shadow.card,
  border: `1px solid ${colors.border}`,
}

export const pagination = {
  container: {
    display: 'flex' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    fontSize: 13,
    color: colors.textMuted,
  },
  btn: {
    minWidth: 30,
    height: 30,
    padding: '0 8px',
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    background: colors.card,
    color: colors.textSecondary,
    cursor: 'pointer',
    fontSize: 12.5,
    fontWeight: 500,
    transition: 'background 100ms, color 100ms, border-color 100ms',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}

export const spinner = {
  textAlign: 'center' as const,
  padding: 60,
  color: colors.textMuted,
  fontSize: 14,
}

export const status = {
  padding: '2px 8px',
  borderRadius: radius.sm,
  fontSize: 11.5,
  fontWeight: 500,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
}
