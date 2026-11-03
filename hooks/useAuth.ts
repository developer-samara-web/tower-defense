import { useState, useEffect, useCallback } from 'react'
import { login, register, me } from '@/lib/services/auth-service'

import { UserProfile } from '@/types'

export function useAuth() {
  const [token, setToken] = useState<string | null>(
    () => (typeof window !== 'undefined' ? localStorage.getItem('td_token') : null)
  )
  const [user, setUser] = useState<UserProfile | null>(null)
  // «Проверка сессии закончена», а не «токен есть». Стартует с false и на
  // сервере, и на клиенте: токен лежит в localStorage, которого нет при SSR,
  // поэтому первая клиентская отрисовка обязана совпасть с серверной.
  // Раньше флаг ставился по наличию токена, и владелец сессии успевал увидеть
  // заглушку «Нужен вход в аккаунт», пока /api/auth/me ещё в пути.
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const stored = token || (typeof window !== 'undefined' ? localStorage.getItem('td_token') : null)
    if (!stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChecked(true)
      return
    }
    // Токен мог появиться только что (вход или регистрация): профиль ещё
    // не подтверждён, поэтому страница снова ждёт ответ сервера.
    setChecked(false)
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
    const data = await register({ login: loginVal, email, password })
    // Сервер отдаёт тот же токен, что и вход: сохраняем его, а профиль
    // эффект подтянет сам.
    if (data?.token) {
      localStorage.setItem('td_token', data.token)
      setToken(data.token)
    }
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('td_token')
    setToken(null)
    setUser(null)
  }, [])

  return { token, user, checked, handleLogin, handleRegister, logout, setUser }
}
