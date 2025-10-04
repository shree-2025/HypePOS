import { useState } from 'react'
import api from '@/api/axios'

export type UserRole = 'master' | 'distributor' | 'admin' | 'salers' | null

export function useAuth() {
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('token')
    } catch {
      return null
    }
  })
  const [role, setRole] = useState<UserRole>(null)

  const login = async (email: string, password: string, role: 'master' | 'distributor' | 'admin' | 'salers') => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password, role })
      setToken(data.token)
      try { localStorage.setItem('token', data.token) } catch {}
      setRole(data.user?.role ?? role)
      return true
    } catch (e) {
      return false
    } finally {
      setLoading(false)
    }
  }

  const register = async (_email: string, _password: string) => {
    setLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 300))
      return true
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setToken(null)
    try { localStorage.removeItem('token') } catch {}
    setRole(null)
  }

  return { loading, token, role, login, register, logout }
}

