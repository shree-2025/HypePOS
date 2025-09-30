import { useState } from 'react'

export type UserRole = 'cashier' | 'manager' | 'admin' | null

export function useAuth() {
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<UserRole>(null)

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 800))
      setToken('demo-token')
      setRole('manager')
      return true
    } finally {
      setLoading(false)
    }
  }

  const register = async (email: string, password: string) => {
    setLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 1000))
      return true
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setToken(null)
    setRole(null)
  }

  return { loading, token, role, login, register, logout }
}
