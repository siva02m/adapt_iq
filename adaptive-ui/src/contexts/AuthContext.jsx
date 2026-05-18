import { createContext, useContext, useState, useCallback } from 'react'
import client from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('adaptiq_user')) } catch { return null }
  })

  const login = useCallback(async (email, password) => {
    const res = await client.post('/api/auth/login', { email, password })
    const { token, ...userData } = res.data
    localStorage.setItem('adaptiq_token', token)
    localStorage.setItem('adaptiq_user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('adaptiq_token')
    localStorage.removeItem('adaptiq_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === 'ADMIN', isAuthor: user?.role === 'AUTHOR', isLearner: user?.role === 'LEARNER' }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
