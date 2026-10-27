import { useState, useEffect, useCallback } from 'react'
import { login, register, me } from '@/lib/services/auth-service'

import { UserProfile } from '@/types'

export function useAuth() {
  const [token, setToken] = useState<string | null>(
    () => (typeof window !== 'undefined' ? localStorage.getItem('td_token') : null)
  )
  const [user, setUser] = useState<UserProfile | null>(null)
  const [checked, setChecked] = useState(!!token)

  useEffect(() => {
    const stored = token || (typeof window !== 'undefined' ? localStorage.getItem('td_token') : null)
    if (!stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChecked(true)
      return
    }
    setToken(stored)
    me(stored)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((d: any) => {
        if (d.user) {
          setUser(d.user)
        } else {
          localStorage.removeItem('td_token')
          setToken(null)
        }
      })
      .catch(() => {
        setToken(stored)
      })
      .finally(() => {
        setChecked(true)
      })
  }, [token])

  const handleLogin = useCallback(async (loginVal: string, password: string) => {
    const data = await login({ login: loginVal, password })
    if (data.token) {
      localStorage.setItem('td_token', data.token)
      setToken(data.token)
      try {
        const d = await me(data.token)
        if (d.user) setUser(d.user)
      } catch { }
    }
    return data
  }, [])

  const handleRegister = useCallback(async (loginVal: string, email: string, password: string) => {
    return await register({ login: loginVal, email, password })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('td_token')
    setToken(null)
    setUser(null)
  }, [])

  return { token, user, checked, handleLogin, handleRegister, logout, setUser }
}
