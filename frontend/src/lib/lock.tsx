import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { apiGet, apiPost } from './api'
import { useAuth } from './auth'

interface LockContextType {
  locked: boolean
  loading: boolean
  setLocked: (v: boolean) => Promise<boolean>
  refresh: () => Promise<void>
}

const LockContext = createContext<LockContextType>(null!)

export function LockProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [locked, setLockedState] = useState(false)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await apiGet('/bang-gia-lock')
      setLockedState(!!res.locked)
    } catch {
      // Không gọi được → mặc định mở khóa (không chặn nhầm công việc)
      setLockedState(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    refresh()
  }, [user, refresh])

  const setLocked = useCallback(async (v: boolean): Promise<boolean> => {
    if (!user?.is_admin) return false
    try {
      const res = await apiPost('/bang-gia-lock', { locked: v }, { 'x-user-id': String(user.id) })
      if (res.success) { setLockedState(!!res.locked); return true }
      return false
    } catch {
      return false
    }
  }, [user])

  return (
    <LockContext.Provider value={{ locked, loading, setLocked, refresh }}>
      {children}
    </LockContext.Provider>
  )
}

export function useLock() {
  return useContext(LockContext)
}
