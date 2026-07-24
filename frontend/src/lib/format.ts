export function formatNum(value: any, unit?: string): string {
  if (value === null || value === undefined || value === '') return ''
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '.')) : value
  if (isNaN(num)) return String(value)
  let s = num.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  if (unit === '%') s += '%'
  return s
}
