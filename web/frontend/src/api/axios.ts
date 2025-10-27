import axios, { AxiosRequestConfig } from 'axios'

console.log('API base:', import.meta.env.VITE_API_BASE_URL)

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // e.g. https://hypepos.onrender.com/api
  timeout: 15000,
});

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
