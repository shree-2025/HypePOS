import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://api.example.com',
  timeout: 15000,
})

// Attach Authorization header if token exists
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('token')
    if (token) {
      const headers: any = config.headers
      if (headers && typeof headers.set === 'function') {
        headers.set('Authorization', `Bearer ${token}`)
      } else {
        config.headers = { ...(config.headers as any), Authorization: `Bearer ${token}` } as any
      }
    }
    // Optional creator hints for backend fallback
    const userId = localStorage.getItem('userId')
    const userEmail = localStorage.getItem('userEmail')
    const userName = localStorage.getItem('userName')
    const h: any = config.headers
    const assign = (k: string, v?: string | null) => {
      if (!v) return
      if (h && typeof h.set === 'function') h.set(k, v as string)
      else (config.headers as any) = { ...(config.headers as any), [k]: v }
    }
    assign('x-user-id', userId)
    assign('x-user-email', userEmail)
    assign('x-user-name', userName)
  } catch {}
  return config
})

export default api
