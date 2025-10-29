import axios, { AxiosRequestConfig } from 'axios'

console.log('API base:', import.meta.env.VITE_API_BASE_URL)

export const api = axios.create({
  baseURL: (typeof window !== 'undefined' && (window as any)?.VITE_API_BASE_URL) || import.meta.env.VITE_API_BASE_URL || 'https://api.example.com',
  timeout: 15000,
})

// Attach Authorization header if token exists
api.interceptors.request.use((config: AxiosRequestConfig) => {
  try {
    const token = localStorage.getItem('token')
    if (token) {
      if (config.headers && typeof (config.headers as any).set === 'function') {
        ;(config.headers as any).set('Authorization', `Bearer ${token}`)
      } else {
        config.headers = { ...(config.headers as any), Authorization: `Bearer ${token}` }
      }
    }
  } catch (err) {
    console.error('Interceptor error:', err)
  }
  return config
})

export default api
