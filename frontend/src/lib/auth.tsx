import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { apiPost, apiGet } from './api'

export interface AuthUser {
  id: number
  ten: string
  email: string
  vai_tro: string
  is_admin: boolean
  permissions: string[]
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  hasPermission: (perm: string) => boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    const stored = localStorage.getItem('auth_user')
    if (!stored) { setLoading(false); return }
    try {
      const parsed = JSON.parse(stored)
      const res = await apiGet('/auth/me')
      setUser({ ...res, is_admin: res.is_admin })
    } catch {
      localStorage.removeItem('auth_user')
      setUser(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchUser() }, [fetchUser])

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiPost('/auth/login', { username, password })
    const u: AuthUser = { ...res, is_admin: res.is_admin }
    localStorage.setItem('auth_user', JSON.stringify(u))
    setUser(u)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('auth_user')
    setUser(null)
  }, [])

  const hasPermission = useCallback((perm: string) => {
    if (!user) return false
    if (user.is_admin) return true
    return user.permissions.includes(perm)
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, hasPermission, login, logout, refresh: fetchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}