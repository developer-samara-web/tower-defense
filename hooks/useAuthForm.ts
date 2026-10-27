import { useState, useCallback } from 'react'
import { useAuth } from './useAuth'

export function useAuthForm() {
  const { handleLogin, handleRegister } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loginVal, setLoginVal] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()
      setError('')
      setNotice('')
      setLoading(true)
      try {
        if (mode === 'login') {
          const data = await handleLogin(loginVal, password)
          if (data.error) setError(data.error || 'Ошибка входа')
          return data
        } else {
          const data = await handleRegister(loginVal, email, password)
          if (data.error) setError(data.error || 'Ошибка регистрации')
          else {
            setNotice('Аккаунт создан — войдите')
            setMode('login')
          }
          return data
        }
      } catch {
        setError('Ошибка сети')
        return { error: 'Ошибка сети' }
      } finally {
        setLoading(false)
      }
    },
    [mode, loginVal, email, password, handleLogin, handleRegister]
  )

  return {
    mode,
    setMode,
    loginVal,
    setLoginVal,
    email,
    setEmail,
    password,
    setPassword,
    loading,
    error,
    notice,
    handleSubmit,
    clearError: () => setError(''),
    clearNotice: () => setNotice(''),
  }
}
