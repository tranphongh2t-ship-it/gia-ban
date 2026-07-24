import { useState, useRef, useCallback, useEffect } from 'react'

const COL_STORAGE = (key: string) => `dg_${key.replace(/[^a-zA-Z0-9_]/g, '_')}_colw`

const DEFAULT_WIDTH = (label: string, unit?: string): number => {
  const base = label.length * 8 + 44
  if (unit) return Math.max(base, 90)
  return Math.max(base, 60)
}

export function useColumnResize(storageKey: string) {
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem(COL_STORAGE(storageKey)) || '{}') } catch { return {} }
  })

  useEffect(() => {
    localStorage.setItem(COL_STORAGE(storageKey), JSON.stringify(colWidths))
  }, [colWidths, storageKey])

  const dragRef = useRef<{ key: string; startX: number; startW: number } | null>(null)

  const getColWidth = useCallback((key: string, label: string, unit?: string): string => {
    if (colWidths[key]) return colWidths[key] + 'px'
    return DEFAULT_WIDTH(label, unit) + 'px'
  }, [colWidths])

  const startResize = useCallback((key: string, e: React.MouseEvent, label: string, unit?: string) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = colWidths[key] || DEFAULT_WIDTH(label, unit)
    dragRef.current = { key, startX, startW }

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const diff = ev.clientX - dragRef.current.startX
      setColWidths(prev => ({ ...prev, [dragRef.current!.key]: Math.max(50, dragRef.current!.startW + diff) }))
    }
    const onUp = () => {
      dragRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [colWidths])

  return { colWidths, getColWidth, startResize }
}
