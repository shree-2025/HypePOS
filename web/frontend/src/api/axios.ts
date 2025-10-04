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
  } catch {}
  return config
})

export default api
