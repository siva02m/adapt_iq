import axios from 'axios'

const client = axios.create({
  baseURL: 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' }
})

// Attach JWT token from localStorage to every request
client.interceptors.request.use(config => {
  const token = localStorage.getItem('adaptiq_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401, clear session and redirect to login
client.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('adaptiq_token')
      localStorage.removeItem('adaptiq_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default client
